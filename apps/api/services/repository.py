import os
import git
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.models.repository import RepositoryStatus
from apps.api.crud.repository import update_repository_status
import uuid

REPOS_BASE_PATH = "./data/repos"

async def clone_repository(db: AsyncSession, repo_id: uuid.UUID, github_url: str, owner: str, name: str, branch: str):
    """Background task to clone a GitHub repository and update its status in the database."""
    local_path = os.path.join(REPOS_BASE_PATH, owner, name)
    
    try:
        await update_repository_status(db, repo_id, RepositoryStatus.CLONING)

        os.makedirs(local_path, exist_ok=True)

        git.Repo.clone_from(
            github_url,
            local_path,
            branch=branch,
            depth=1  # Perform a shallow clone (latest commit only) for faster downloads
        )

        await update_repository_status(
            db, repo_id, RepositoryStatus.READY, local_path=local_path
        )
        # Trigger indexing immediately after successful clone
        from apps.api.services.indexer import index_repository
        await index_repository(db, repo_id, local_path)


    except Exception as e:
        print(f"[ERROR] Failed to clone {github_url}: {e}")
        await update_repository_status(db, repo_id, RepositoryStatus.ERROR)