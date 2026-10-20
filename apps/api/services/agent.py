import json
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.llm import call_llm
from apps.api.services.agent_tools import TOOL_SCHEMAS, execute_tool
from apps.api.crud.repository import get_repository
import uuid

MAX_STEPS = 15  # Maximum safety limit to prevent infinite agent execution loops

SYSTEM_PROMPT = """You are AgentForge, an expert autonomous software engineering agent.
You have access to tools to read, search, and modify code in a repository.

Your workflow:
1. Search the codebase to understand the relevant code
2. Read specific files to get full context  
3. Write your fixes or implementations
4. Always verify your changes make logical sense

Be precise, write clean code, and explain your reasoning before each action.
When the task is complete, say TASK_COMPLETE followed by a summary of what you did."""

async def run_agent(
    db: AsyncSession,
    task_id: uuid.UUID,
    repo_id: uuid.UUID,
    task_description: str
) -> str:
    """Main execution entry point for the autonomous engineering agent loop."""
    repo = await get_repository(db, repo_id)
    if not repo:
        return "ERROR: Repository not found"

    # Construct the initial user prompt providing repository context and the target task description
    initial_user_message = f"""Repository: {repo.owner}/{repo.name}
Local Path: {repo.local_path}
Repository ID: {str(repo_id)}

Task: {task_description}

Start by searching the codebase to understand the relevant code, then proceed with the task."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": initial_user_message}
    ]

    steps_log = []  # Maintain an audit trail of every agent action and observation

    for step in range(MAX_STEPS):
        print(f"[Agent] Step {step + 1}/{MAX_STEPS}")

        response_message = await call_llm(messages, tools=TOOL_SCHEMAS)

        # Check if the LLM returned tool calls to execute
        if response_message.tool_calls:
            for tool_call in response_message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)

                print(f"[Agent] Calling tool: {tool_name}({tool_args})")

                steps_log.append({
                    "step": step + 1,
                    "action": "tool_call",
                    "tool": tool_name,
                    "args": tool_args
                })

                tool_result = await execute_tool(tool_name, tool_args)

                steps_log.append({
                    "step": step + 1,
                    "action": "tool_result",
                    "tool": tool_name,
                    "result": tool_result[:500]  # Truncate large outputs for audit logs while full data goes to LLM
                })

                # Append assistant tool call and tool response back to the conversation history
                messages.append({"role": "assistant", "content": None, "tool_calls": [tool_call]})
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result
                })

        else:
            # Handle standard textual responses from the agent
            agent_text = response_message.content or ""

            steps_log.append({
                "step": step + 1,
                "action": "response",
                "content": agent_text
            })

            messages.append({"role": "assistant", "content": agent_text})

            if "TASK_COMPLETE" in agent_text:
                print(f"[Agent] Task completed in {step + 1} steps")
                return agent_text  # Return the final completion summary

    # Terminate if the agent exhausts all allowed steps without completing the task
    return f"Agent reached maximum steps ({MAX_STEPS}) without completing the task."