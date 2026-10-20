import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.models.task import Task, TaskStatus

async def create_task(db: AsyncSession, repository_id: uuid.UUID, description: str) -> Task:
    """Create and persist a new task record in the database with a PENDING status."""
    task = Task(
        repository_id=repository_id,
        description=description,
        status=TaskStatus.PENDING  # Tasks always start in a pending state
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)  # Reload from DB to capture auto-generated IDs and timestamps
    return task

async def get_task(db: AsyncSession, task_id: uuid.UUID) -> Task | None:
    """Fetch a single task record by its unique UUID."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one_or_none()

async def get_tasks_by_repo(db: AsyncSession, repository_id: uuid.UUID) -> list[Task]:
    """Retrieve all tasks associated with a specific repository, ordered by creation date (newest first)."""
    result = await db.execute(
        select(Task)
        .where(Task.repository_id == repository_id)
        .order_by(Task.created_at.desc())
    )
    return list(result.scalars().all())

async def update_task_status(
    db: AsyncSession,
    task_id: uuid.UUID,
    status: TaskStatus,
    result: str | None = None,
    error_message: str | None = None
) -> Task | None:
    """Update a task's execution status, along with optional results or error messages."""
    task = await get_task(db, task_id)
    if not task:
        return None
    task.status = status
    if result:
        task.result = result  # Save final success output from the agent
    if error_message:
        task.error_message = error_message  # Save error details if execution failed
    await db.commit()
    await db.refresh(task)
    return task