"""
File metadata, upload response, diff, and summary schemas.
"""
from typing import List, Optional, Any
from pydantic import BaseModel, Field
from app.schemas.dlp import DLPFinding

class FileOut(BaseModel):
    id: str = Field(..., alias="_id")
    filename: str
    owner: str
    company: str
    hash: str
    size: int
    upload_date: Any
    is_duplicate: bool = False
    is_near_duplicate: bool = False
    similarity_score: float = 0.0
    compare_file_id: Optional[str] = None
    quarantine_status: str = "safe"
    has_sensitive_content: bool = False
    dlp_violations: List[str] = []
    dlp_findings: Optional[List[DLPFinding]] = []

    model_config = {
        "populate_by_name": True
    }

class UploadResponse(BaseModel):
    status: str
    is_duplicate: bool
    is_near_duplicate: bool
    similarity_score: float
    quarantined: bool
    file_id: Optional[str] = None

class TextResponse(BaseModel):
    text: str

class SummaryResponse(BaseModel):
    summary: str

class BulkDeleteRequest(BaseModel):
    file_ids: List[str]

class BulkDeleteResponse(BaseModel):
    msg: str
    deleted_count: int
    failed_count: int
