"""
Dashboard analytics endpoint.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.repositories.file_repository import FileRepository

router = APIRouter(tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Tenant-scoped dashboard statistics and analytics."""
    company = current_user.get("company", "").strip()
    if not company:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tenant association")
    return FileRepository.get_dashboard_metrics(company)
