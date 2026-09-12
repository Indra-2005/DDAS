"""
Health check endpoints: liveness (/health) and readiness (/ready).
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.db.database import client

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """Liveness probe. Returns 200 if the application process is running."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/ready")
async def readiness_check():
    """Readiness probe. Pings MongoDB to confirm database connectivity."""
    try:
        client.admin.command("ping")
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "not ready", "database": "disconnected", "error": str(e)}
        )
