"""
Unified API v1 router combining all resource routers.
"""
from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.files import router as files_router
from app.api.v1.admin import router as admin_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.health import router as health_router

api_v1_router = APIRouter(prefix="/api/v1")

# Mount sub-routers
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router, prefix="/users")
api_v1_router.include_router(files_router, prefix="/files")
api_v1_router.include_router(admin_router, prefix="/admin")
api_v1_router.include_router(dashboard_router, prefix="/dashboard")
