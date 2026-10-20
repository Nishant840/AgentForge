import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from apps.api.core.database import Base

class CodeChunk(Base):
    """Database model representing a parsed chunk of source code for vector embeddings."""
    __tablename__ = "code_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repositories.id", ondelete="CASCADE"),  # Cascade delete chunks if parent repo is removed
        nullable=False
    )

    file_path: Mapped[str] = mapped_column(
        String(1000), nullable=False  # Relative path to the source file
    )

    chunk_index: Mapped[int] = mapped_column(
        Integer, nullable=False  # Sequence index of the chunk within the file
    )

    start_line: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    end_line: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    content: Mapped[str] = mapped_column(
        Text, nullable=False  # Actual source code content of the chunk
    )

    chunk_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="block"  # Type of code structure (e.g., function, class, block)
    )

    qdrant_id: Mapped[str] = mapped_column(
        String(100), nullable=False  # Corresponding vector ID stored in Qdrant
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<CodeChunk {self.file_path}:{self.start_line}-{self.end_line}>"