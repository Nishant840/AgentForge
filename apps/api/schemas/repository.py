import uuid
from datetime import datetime
from pydantic import BaseModel, HttpUrl, field_validator
from apps.api.models.repository import RepositoryStatus

class RepositoryCreate(BaseModel):
    """
    Data Transfer Object (DTO) defining the input validation rules 
    for registering a external repository into the system.
    """
    # HttpUrl guarantees basic RFC 3986 syntax validation before reaching custom validators
    github_url: HttpUrl
    default_branch: str = "main"

    @field_validator("github_url")
    @classmethod
    def must_be_github(cls, v):
        # Business logic restriction: The application architecture is specifically 
        # coupled with the GitHub API ecosystem, making other providers invalid.
        if "github.com" not in str(v):
            raise ValueError("URL must be a GitHub repository URL")
        return v

class RepositoryResponse(BaseModel):
    """
    Output serialization schema detailing the standardized format 
    returned by the API to client applications.
    """
    id: uuid.UUID
    github_url: str
    owner: str                                      # Extracted parsing result of the user profile segment in the URL
    name: str                                       # Extracted parsing result of the targeted codebase identifier in the URL
    description: str | None
    default_branch: str
    status: RepositoryStatus                        # State machine indicator used to manage the tracking lifecycle
    local_path: str | None                          # Nullable field populated only after asynchronous cloning completes on the host filesystem
    created_at: datetime
    updated_at: datetime

    # Configures the Pydantic parser to read arbitrary object attributes (e.g., SQLAlchemy instances)
    # instead of strictly requiring a Python dictionary mapping during instantiation.
    model_config = {"from_attributes": True}
