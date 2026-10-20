from pydantic import BaseModel, Field

class RetrievalRequest(BaseModel):
    """Pydantic model representing incoming code search and retrieval requests."""
    query: str = Field(..., min_length=3)  # Search query string (minimum 3 characters required)
    repo_id: str  # Unique identifier of the repository to search within
    top_k: int = Field(default=10, ge=1, le=50)  # Number of top relevant code chunks to return (1 to 50)

class ChunkResult(BaseModel):
    """Represents an individual matching code chunk returned from vector search."""
    file_path: str  # Relative path to the source file (e.g., "src/auth/login.py")
    content: str  # Actual source code snippet
    start_line: int
    end_line: int
    score: float  # Vector similarity score (higher values indicate greater relevance)
    chunk_type: str  # Structural category of the code chunk (e.g., "function", "class", or "block")

class RetrievalResponse(BaseModel):
    """Structured response containing ranked code chunks and a pre-formatted LLM context window."""
    query: str  # Echoes back the original search query
    repo_id: str  # The repository ID that was searched
    results: list[ChunkResult]  # Ranked list of relevant code chunks
    total_found: int  # Total number of matching chunks retrieved
    context_window: str  # Pre-formatted string ready for injection into an LLM prompt