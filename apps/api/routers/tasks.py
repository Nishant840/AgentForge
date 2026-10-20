import asyncio
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db
from apps.api.schemas.task import TaskCreate, TaskResponse
from apps.api.crud.task import create_task, get_task, get_tasks_by_repo
from apps.api.services.task_runner import (
    run_agent_with_streaming,
    create_event_queue,
    get_event_queue,
    remove_event_queue
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("/", response_model=TaskResponse, status_code=201)
async def create_new_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    """Create a new task, initialize its real-time event queue, and spawn the autonomous agent runner in the background."""
    task = await create_task(db, payload.repository_id, payload.description)

    # Initialize the event queue BEFORE launching the background task to ensure no early events are missed
    create_event_queue(str(task.id))

    # Fire-and-forget background task execution using asyncio.ensure_future
    asyncio.ensure_future(
        run_agent_with_streaming(db, task.id, payload.repository_id, payload.description)
    )

    return task

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_status(task_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve the current status and results of a specific task (polling alternative to WebSockets)."""
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID")

    task = await get_task(db, uid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.get("/repo/{repo_id}", response_model=list[TaskResponse])
async def get_repo_tasks(repo_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve all historical and active tasks associated with a specific repository."""
    try:
        uid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repository ID")
    return await get_tasks_by_repo(db, uid)

@router.websocket("/{task_id}/stream")
async def stream_task_events(websocket: WebSocket, task_id: str):
    """WebSocket endpoint allowing clients to establish a real-time event stream for a running task."""
    await websocket.accept()

    queue = get_event_queue(task_id)
    if not queue:
        await websocket.send_text(json.dumps({"error": "Task not found or not running"}))
        await websocket.close()
        return

    try:
        while True:
            # Block and wait asynchronously for the next agent event from the queue
            event = await queue.get()

            # A None value serves as a sentinel indicating the agent has completed and the stream should close
            if event is None:
                await websocket.close()
                break

            await websocket.send_text(json.dumps(event))

    except WebSocketDisconnect:
        print(f"[WebSocket] Client disconnected from task {task_id}")
    finally:
        # Clean up memory by removing the event queue upon disconnection or completion
        remove_event_queue(task_id)