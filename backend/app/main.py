"""
DDAS Production FastAPI Application.
Handles versioned API endpoints (/api/v1/*) along with backward-compatible root routes.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import logger
from app.core.limiter import limiter
from app.db.indexes import ensure_indexes
from app.services.storage_service import StorageService
from app.api.v1.router import api_v1_router

# Sub-routers for root backward-compatibility
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.files import router as files_router
from app.api.v1.admin import router as admin_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.health import router as health_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: ensures indexes and cleans stale temp files on startup."""
    logger.info("Initializing DDAS backend services...")
    ensure_indexes()
    StorageService.cleanup_stale_temp_files()
    yield
    logger.info("Shutting down DDAS backend services...")


app = FastAPI(
    title="DDAS API",
    version="2.0.0",
    description="Data Download Duplication Alert System — Deterministic security, deduplication, and compliance platform.",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler. Logs internal details but returns safe messages."""
    if isinstance(exc, (HTTPException, RateLimitExceeded)):
        raise exc
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please contact system support."}
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 1. Mount modern versioned v1 API
app.include_router(api_v1_router)

# 2. Mount root backward-compatible aliases for existing client integrations
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router, prefix="/users")
app.include_router(files_router, prefix="/files")
app.include_router(admin_router, prefix="/admin")
app.include_router(dashboard_router, prefix="/dashboard")
# Direct root /upload alias
app.add_api_route("/upload", files_router.routes[0].endpoint, methods=["POST"], tags=["Files"])
