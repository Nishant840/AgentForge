from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams
from apps.api.core.config import settings

COLLECTION_NAME = "code_chunks"
EMBEDDING_DIMENSION = 384  # Dimension size for all-MiniLM-L6-v2 vectors

qdrant_client = AsyncQdrantClient(
    url=settings.QDRANT_URL
)

async def init_qdrant():
    """Ensure the vector collection exists in Qdrant upon application startup."""
    collections = await qdrant_client.get_collections()
    existing_names = [c.name for c in collections.collections]

    if COLLECTION_NAME not in existing_names:
        await qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=Distance.COSINE  # Cosine similarity is optimal for text and code embeddings
            )
        )
        print(f"[Qdrant] Created collection: {COLLECTION_NAME}")
    else:
        print(f"[Qdrant] Collection already exists: {COLLECTION_NAME}")