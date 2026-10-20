from sentence_transformers import SentenceTransformer
from qdrant_client.models import Filter, FieldCondition, MatchValue
from apps.api.core.qdrant import qdrant_client, COLLECTION_NAME
from apps.api.schemas.retrieval import ChunkResult, RetrievalResponse

# Reuse the already-loaded SentenceTransformer model instance from the indexer module to save RAM
from apps.api.services.indexer import model

async def search_codebase(query: str, repo_id: str, top_k: int = 10) -> RetrievalResponse:
    """Perform a vector similarity search on the codebase within a specific repository."""
    
    # Convert the search query string into a 384-dimensional embedding vector
    query_embedding = model.encode(query).tolist()

    # Build a Qdrant metadata filter to restrict search results to the given repository ID
    repo_filter = Filter(
        must=[
            FieldCondition(
                key="repo_id",
                match=MatchValue(value=repo_id)
            )
        ]
    )

    # Search Qdrant for the most relevant code chunks matching the query vector and repository filter
    search_results = await qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_embedding,
        query_filter=repo_filter,
        limit=top_k,
        with_payload=True
    )

    # Convert raw Qdrant search hits into structured ChunkResult objects
    chunks = []
    for hit in search_results:
        chunks.append(ChunkResult(
            file_path=hit.payload["file_path"],
            content=hit.payload["content"],
            start_line=hit.payload["start_line"],
            end_line=hit.payload["end_line"],
            score=round(hit.score, 4),  # Round vector similarity score to 4 decimal places
            chunk_type=hit.payload.get("chunk_type", "block")
        ))

    # Build a pre-formatted context window string containing all retrieved code chunks wrapped in Markdown
    context_parts = []
    for chunk in chunks:
        context_parts.append(
            f"### File: {chunk.file_path} (lines {chunk.start_line}-{chunk.end_line})\n"
            f"```\n{chunk.content}\n```\n"
        )
    context_window = "\n---\n".join(context_parts)

    return RetrievalResponse(
        query=query,
        repo_id=repo_id,
        results=chunks,
        total_found=len(chunks),
        context_window=context_window
    )