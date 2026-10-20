import os
import uuid
from sentence_transformers import SentenceTransformer
from qdrant_client.models import PointStruct
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.qdrant import qdrant_client, COLLECTION_NAME
from apps.api.models.code_chunk import CodeChunk
from apps.api.crud.repository import update_repository_status
from apps.api.models.repository import RepositoryStatus

# ── Constants ──────────────────────────────────────────────────────
SUPPORTED_EXTENSIONS = {".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs"}
# Only index code files; skip binary, config, lock, and asset files

CHUNK_SIZE = 40
CHUNK_OVERLAP = 10  # Maintain context continuity across chunk boundaries

# ── Load the embedding model ONCE at module level ──────────────────
print("[Indexer] Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("[Indexer] Embedding model loaded.")

# ── Helper: Split file into chunks ─────────────────────────────────
def chunk_file(content: str, file_path: str) -> list[dict]:
    """Split file contents into overlapping sliding-window text chunks."""
    lines = content.split("\n")
    chunks = []
    i = 0
    chunk_index = 0

    while i < len(lines):
        chunk_lines = lines[i: i + CHUNK_SIZE]
        chunk_text = "\n".join(chunk_lines).strip()

        if chunk_text:
            chunks.append({
                "content": chunk_text,
                "file_path": file_path,
                "start_line": i + 1,
                "end_line": min(i + CHUNK_SIZE, len(lines)),
                "chunk_index": chunk_index,
                "chunk_type": "block"
            })
            chunk_index += 1

        i += CHUNK_SIZE - CHUNK_OVERLAP
    
    return chunks

# ── Main Indexer Function ──────────────────────────────────────────
async def index_repository(db: AsyncSession, repo_id: uuid.UUID, local_path: str):
    """Walk through the cloned repository, parse and embed code chunks, and store them in Qdrant and PostgreSQL."""
    print(f"[Indexer] Starting indexing for repo: {repo_id}")

    await update_repository_status(db, repo_id, RepositoryStatus.INDEXING)

    all_chunks = []

    for root, dirs, files in os.walk(local_path):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "__pycache__", ".venv"}]

        for file_name in files:
            ext = os.path.splitext(file_name)[1]
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            file_path = os.path.join(root, file_name)
            relative_path = os.path.relpath(file_path, local_path)

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except Exception:
                continue

            chunks = chunk_file(content, relative_path)
            all_chunks.extend(chunks)

    if not all_chunks:
        print(f"[Indexer] No code chunks found for repo: {repo_id}")
        await update_repository_status(db, repo_id, RepositoryStatus.READY)
        return

    # ── Generate embeddings in batch (much faster than one by one) ──
    print(f"[Indexer] Generating embeddings for {len(all_chunks)} chunks...")
    texts = [c["content"] for c in all_chunks]
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=32)

    # ── Store in Qdrant ─────────────────────────────────────────────
    points = []
    for i, (chunk, embedding) in enumerate(zip(all_chunks, embeddings)):
        qdrant_point_id = str(uuid.uuid4())
        points.append(
            PointStruct(
                id=qdrant_point_id,
                vector=embedding.tolist(),
                payload={
                    "repo_id": str(repo_id),
                    "file_path": chunk["file_path"],
                    "content": chunk["content"],
                    "start_line": chunk["start_line"],
                    "end_line": chunk["end_line"],
                    "chunk_type": chunk["chunk_type"]
                }
            )
        )
        chunk["qdrant_id"] = qdrant_point_id

    await qdrant_client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
    print(f"[Indexer] Stored {len(points)} vectors in Qdrant")

    # ── Store metadata in PostgreSQL ────────────────────────────────
    for chunk in all_chunks:
        db_chunk = CodeChunk(
            repository_id=repo_id,
            file_path=chunk["file_path"],
            chunk_index=chunk["chunk_index"],
            start_line=chunk["start_line"],
            end_line=chunk["end_line"],
            content=chunk["content"],
            chunk_type=chunk["chunk_type"],
            qdrant_id=chunk["qdrant_id"]
        )
        db.add(db_chunk)

    await db.commit()

    await update_repository_status(db, repo_id, RepositoryStatus.READY)
    print(f"[Indexer] Indexing complete for repo: {repo_id}")