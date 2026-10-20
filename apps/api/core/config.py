from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgentForge"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/agentforge"  
    
    # This is the URL to our Qdrant instance running in Docker
    QDRANT_URL: str = "http://localhost:6333"

    GROQ_API_KEY: str = ""                         # Groq API key from console.groq.com
    LLM_MODEL: str = "groq/llama-3.1-70b-versatile"  # LiteLLM format: provider/model-name


    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore"
    )

settings = Settings()
