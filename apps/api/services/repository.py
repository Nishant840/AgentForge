import os
import shutil
import git
from apps.api.core.database import AsyncSessionLocal
from apps.api.models.repository import RepositoryStatus
from apps.api.crud.repository import update_repository_status
import uuid

REPOS_BASE_PATH = "./data/repos"

async def clone_repository(repo_id: uuid.UUID, github_url: str, owner: str, name: str, branch: str = "main"):
    """Background task to clone a GitHub repository and update its status in the database."""
    local_path = os.path.join(REPOS_BASE_PATH, owner, name)
    
    async with AsyncSessionLocal() as db:
        try:
            await update_repository_status(db, repo_id, RepositoryStatus.CLONING)

            # Clean up prior failed or partial clone directory if it exists
            if os.path.exists(local_path):
                shutil.rmtree(local_path, ignore_errors=True)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            cloned_repo = None
            try:
                cloned_repo = git.Repo.clone_from(
                    github_url,
                    local_path,
                    branch=branch,
                    depth=1  # Perform a shallow clone (latest commit only) for faster downloads
                )
            except git.GitCommandError as ge:
                # If specified branch (e.g. "main") is not found upstream, clone the repository's default branch (e.g. "master")
                err_str = str(ge)
                if "Remote branch" in err_str or "not found" in err_str:
                    print(f"[Clone] Branch '{branch}' not found for {github_url}. Falling back to default remote branch...")
                    if os.path.exists(local_path):
                        shutil.rmtree(local_path, ignore_errors=True)
                    cloned_repo = git.Repo.clone_from(
                        github_url,
                        local_path,
                        depth=1
                    )
                else:
                    raise ge

            await update_repository_status(
                db, repo_id, RepositoryStatus.READY, local_path=local_path
            )
            # Trigger indexing immediately after successful clone
            from apps.api.services.indexer import index_repository
            await index_repository(db, repo_id, local_path)

        except Exception as e:
            print(f"[ERROR] Failed to clone {github_url}: {e}")
            await update_repository_status(db, repo_id, RepositoryStatus.ERROR)