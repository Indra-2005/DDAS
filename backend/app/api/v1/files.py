"""
File management routes: upload, listing, download, diffing, summary, and deletion.
Strictly tenant-scoped to ensure absolute isolation.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Body, Request, status
from fastapi.responses import StreamingResponse
from app.core.limiter import limiter
from app.core.dependencies import get_current_user
from app.services.file_service import FileService
from app.repositories.file_repository import FileRepository
from app.schemas.files import (
    UploadResponse,
    TextResponse,
    SummaryResponse,
    BulkDeleteRequest,
    BulkDeleteResponse
)

router = APIRouter(tags=["Files"])

@router.post("/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Uploads document: validates size & MIME, scans DLP, runs exact & near-duplicate
    deduplication, encrypts with AES-256-GCM, and persists metadata.
    """
    file_bytes = await file.read()
    return await FileService.process_upload(
        file_bytes=file_bytes,
        original_filename=file.filename,
        current_user=current_user
    )

@router.get("")
@router.get("/")
async def list_files(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Lists tenant files. Returns paginated JSON if page/page_size provided,
    otherwise returns flat list for full backward compatibility with frontend.
    """
    company = current_user.get("company", "").strip()
    if not company:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tenant association")

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        items, total = FileRepository.list_by_tenant(company, skip=skip, limit=page_size)
        total_pages = (total + page_size - 1) // page_size if page_size else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    else:
        return FileRepository.list_all_by_tenant_raw(company)

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Streams decrypted file content. Scoped to tenant."""
    return FileService.get_file_for_download(file_id, current_user)

@router.get("/text/{file_id}", response_model=TextResponse)
async def get_file_text(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Fetches extracted plain-text for diff analysis. Scoped to tenant."""
    return FileService.get_extracted_text(file_id, current_user)

@router.get("/summary/{file_id}", response_model=SummaryResponse)
async def get_file_summary(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Computes deterministic security & compliance summary for the file. Scoped to tenant."""
    return FileService.get_file_summary(file_id, current_user)

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Deletes file record and atomically reclaims storage if unreferenced."""
    return await FileService.delete_file(file_id, current_user)

@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_files(
    payload: BulkDeleteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Deletes multiple files in batch safely."""
    deleted_count = 0
    failed_count = 0

    for fid in payload.file_ids:
        try:
            await FileService.delete_file(fid, current_user)
            deleted_count += 1
        except Exception:
            failed_count += 1

    return BulkDeleteResponse(
        msg="Bulk delete complete",
        deleted_count=deleted_count,
        failed_count=failed_count
    )
