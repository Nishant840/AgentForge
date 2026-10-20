import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.models.repository import Repository, RepositoryStatus

async def create_repository(db: AsyncSession, owner: str, name: str, github_url: str, default_branch: str) -> Repository:
    """Create and persist a new repository record with a PENDING status."""
    repo = Repository(
        owner=owner,
        name=name,
        github_url=github_url,
        default_branch=default_branch,
        status=RepositoryStatus.PENDING  # Repositories always start in a pending state
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)  # Reload from DB to get auto-generated fields (id, timestamps)
    return repo

async def get_repository(db: AsyncSession, repo_id: uuid.UUID) -> Repository | None:
    """Fetch a single repository by its unique UUID."""
    result = await db.execute(select(Repository).where(Repository.id == repo_id))
    return result.scalar_one_or_none()  # Returns None if not found instead of raising an error

async def get_repository_by_url(db: AsyncSession, github_url: str) -> Repository | None:
    """Check if a repository with the given GitHub URL already exists."""
    result = await db.execute(select(Repository).where(Repository.github_url == github_url))
    return result.scalar_one_or_none()

async def get_all_repositories(db: AsyncSession) -> list[Repository]:
    """Fetch all repositories ordered by creation date (newest first for dashboard listing)."""
    result = await db.execute(select(Repository).order_by(Repository.created_at.desc()))
    return list(result.scalars().all())  # Return as a plain Python list

async def update_repository_status(db: AsyncSession, repo_id: uuid.UUID, status: RepositoryStatus, local_path: str | None = None) -> Repository | None:
    """Update a repository's processing status and optional local disk path."""
    repo = await get_repository(db, repo_id)
    if not repo:
        return None
    repo.status = status
    if local_path:
        repo.local_path = local_path  # Save the local disk path once successfully cloned
    await db.commit()
    await db.refresh(repo)
    return repo