from fastapi import APIRouter
from apps.api.schemas.retrieval import RetrievalRequest, RetrievalResponse
from apps.api.services.retrieval import search_codebase

router = APIRouter(prefix="/retrieval", tags=["Retrieval"])

@router.post("/search", response_model=RetrievalResponse)
async def search_code(payload: RetrievalRequest):
    """Search the codebase for code chunks relevant to the query using vector similarity."""
    return await search_codebase(
        query=payload.query,
        repo_id=payload.repo_id,
        top_k=payload.top_k
    )