from fastapi import FastAPI

app = FastAPI(
    title="AgentForge API",
    description="Backend API for the AgentForge Autonomous Software Engineering Platform",
    version="0.1.0"
)

@app.get("/")
async def root():
    return {
        "status": "ok", 
        "message": "AgentForge API is running"
    }