import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.database import get_db
from apps.api.schemas.repository import RepositoryCreate, RepositoryResponse
from apps.api.crud.repository import create_repository, get_repository, get_all_repositories, get_repository_by_url
from apps.api.services.repository import clone_repository

router = APIRouter(prefix="/repositories", tags=["Repositories"])

@router.post("/", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
async def submit_repository(payload: RepositoryCreate, db: AsyncSession = Depends(get_db)):
    """Submit a new GitHub repository URL to be cloned and tracked."""
    url_str = str(payload.github_url)

    existing = await get_repository_by_url(db, url_str)
    if existing:
        raise HTTPException(status_code=400, detail="Repository already exists")  # Reject duplicates

    # Extract owner and repository name from the GitHub URL (e.g., ["torvalds", "linux"])
    parts = url_str.rstrip("/").split("/")
    owner, name = parts[-2], parts[-1].replace(".git", "")

    repo = await create_repository(db, owner, name, url_str, payload.default_branch)

    # Fire and forget — start cloning in the background so the API responds immediately
    asyncio.ensure_future(
        clone_repository(repo.id, url_str, owner, name, payload.default_branch)
    )

    return repo

@router.get("/", response_model=list[RepositoryResponse])
async def list_repositories(db: AsyncSession = Depends(get_db)):
    """Retrieve a list of all tracked repositories."""
    return await get_all_repositories(db)

@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository_by_id(repo_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve a specific repository by its unique UUID string."""
    import uuid
    try:
        uid = uuid.UUID(repo_id)  # Convert string parameter to a UUID object
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repository ID format")
    
    repo = await get_repository(db, uid)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo