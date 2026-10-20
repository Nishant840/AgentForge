from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.api.core.config import settings
from apps.api.routers.repository import router as repository_router

from contextlib import asynccontextmanager
from apps.api.core.qdrant import init_qdrant

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle events."""
    # --- STARTUP ---
    print("[AgentForge] Starting up...")
    await init_qdrant()  # Ensure vector collections are initialized in Qdrant
    yield
    # --- SHUTDOWN ---
    print("[AgentForge] Shutting down...")  # Perform cleanup operations here on app termination

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the AgentForge Autonomous Software Engineering Platform",
    version="0.1.0",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repository_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": f"{settings.API_V1_STR}/docs"
    }