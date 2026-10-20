import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

# ── In-Memory Event Store ─────────────────────────────────────────
# Maps task_id strings to asyncio.Queue instances for real-time pub/sub event streaming
task_event_queues: dict[str, asyncio.Queue] = {}

def create_event_queue(task_id: str) -> asyncio.Queue:
    """Create and register a new event queue for a specific task ID."""
    q = asyncio.Queue()
    task_event_queues[task_id] = q
    return q

def get_event_queue(task_id: str) -> asyncio.Queue | None:
    """Retrieve the event queue for a given task ID (used by WebSocket consumers)."""
    return task_event_queues.get(task_id)

def remove_event_queue(task_id: str):
    """Clean up and remove a task's event queue when its WebSocket connection disconnects."""
    task_event_queues.pop(task_id, None)

async def publish_event(task_id: str, event_type: str, step: int, content: str, data: dict | None = None):
    """Publish a structured event into the task's event queue if an active listener is connected."""
    queue = task_event_queues.get(task_id)
    if queue:
        await queue.put({
            "event_type": event_type,
            "step": step,
            "content": content,
            "data": data or {}
        })

# ── Streaming Agent Runner ────────────────────────────────────────
async def run_agent_with_streaming(
    task_id: uuid.UUID,
    repo_id: uuid.UUID,
    description: str
):
    """Execute the autonomous agent loop while publishing real-time execution events to the event queue."""
    import json
    from apps.api.core.database import AsyncSessionLocal
    from apps.api.core.llm import call_llm
    from apps.api.services.agent_tools import TOOL_SCHEMAS, execute_tool
    from apps.api.crud.repository import get_repository
    from apps.api.crud.task import update_task_status
    from apps.api.models.task import TaskStatus
    from apps.api.services.agent import SYSTEM_PROMPT, MAX_STEPS

    task_id_str = str(task_id)

    async with AsyncSessionLocal() as db:
        # Mark the task as running in the database and notify listeners
        await update_task_status(db, task_id, TaskStatus.RUNNING)
        await publish_event(task_id_str, "start", 0, "Agent started working on your task")

        repo = await get_repository(db, repo_id)
        if not repo:
            await publish_event(task_id_str, "error", 0, "Repository not found")
            await update_task_status(db, task_id, TaskStatus.FAILED, error_message="Repository not found")
            return

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"""Repository: {repo.owner}/{repo.name}
Local Path: {repo.local_path}
Repository ID: {str(repo_id)}
Task: {description}

Start by searching the codebase."""}
        ]

        queue = get_event_queue(task_id_str)

        for step in range(1, MAX_STEPS + 1):
            await publish_event(task_id_str, "thinking", step, f"Agent is thinking... (step {step})")

            response_message = await call_llm(messages, tools=TOOL_SCHEMAS)

            if response_message.tool_calls:
                for tool_call in response_message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)

                    # Publish tool invocation event
                    await publish_event(
                        task_id_str, "tool_call", step,
                        f"Calling tool: {tool_name}",
                        data={"tool": tool_name, "args": tool_args}
                    )

                    tool_result = await execute_tool(tool_name, tool_args)

                    # Publish tool execution result event (truncated for clean transport)
                    await publish_event(
                        task_id_str, "tool_result", step,
                        f"Tool {tool_name} returned result",
                        data={"tool": tool_name, "result": tool_result[:300]}
                    )

                    messages.append({"role": "assistant", "content": None, "tool_calls": [tool_call]})
                    messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": tool_result})

            else:
                agent_text = response_message.content or ""
                messages.append({"role": "assistant", "content": agent_text})

                await publish_event(task_id_str, "response", step, agent_text)

                if "TASK_COMPLETE" in agent_text:
                    await publish_event(task_id_str, "complete", step, "Task completed successfully!")
                    await update_task_status(db, task_id, TaskStatus.COMPLETED, result=agent_text)
                    if queue:
                        await queue.put(None)  # Sentinel value signaling the WebSocket consumer to close connection
                    return

        # Handle case where agent exhausts all available steps without completion
        msg = f"Agent reached maximum steps ({MAX_STEPS})"
        await publish_event(task_id_str, "error", MAX_STEPS, msg)
        await update_task_status(db, task_id, TaskStatus.FAILED, error_message=msg)
        if queue:
            await queue.put(None)  # Close WebSocket stream