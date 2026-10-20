import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from apps.api.models.task import TaskStatus

class TaskCreate(BaseModel):
    """Pydantic model representing the incoming payload required to create a new agent task."""
    repository_id: uuid.UUID  # Unique ID of the repository the task will target
    description: str = Field(..., min_length=10)  # Natural language instruction (minimum 10 characters required)

class TaskResponse(BaseModel):
    """Pydantic model representing the serialized task details returned by the API."""
    id: uuid.UUID  # Unique task identifier used for tracking and WebSocket streaming
    repository_id: uuid.UUID
    description: str
    status: TaskStatus  # Current execution state of the task
    result: str | None  # Final summary output (null until execution completes)
    error_message: str | None  # Detailed error trace if the task fails
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}  # Enable ORM mode to seamlessly convert SQLAlchemy models to Pydantic

class StreamEvent(BaseModel):
    """Pydantic model defining the schema for real-time WebSocket events streamed to clients."""
    event_type: str  # Type of agent event (e.g., "step", "tool_call", "tool_result", "complete", "error")
    step: int  # Current step sequence number in the agent loop
    content: str  # Human-readable message explaining the current action or progress
    data: dict | None = None  # Optional contextual metadata (such as tool names, arguments, or results)