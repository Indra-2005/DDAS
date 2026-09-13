"""
File service orchestrating uploads, deduplication, DLP scanning,
AES-256-GCM encryption, safe downloads, and atomic physical deletion.
"""
import io
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse
from app.core.config import settings
from app.algorithms.hashing import sha256_bytes, sanitize_filename, safe_object_id
from app.algorithms.mime_validation import validate_file_content
from app.core.security import UserRole
from app.algorithms.text_extraction import extract_text
from app.services.encryption_service import EncryptionService
from app.services.dlp_service import DLPService
from app.services.dedup_service import DedupService
from app.services.webhook_service import WebhookService
from app.services.storage_service import StorageService
from app.repositories.file_repository import FileRepository
from app.repositories.blob_repository import BlobRepository, BlobLockManager
from app.repositories.audit_repository import AuditRepository
from app.schemas.files import UploadResponse, TextResponse, SummaryResponse
from app.db.database import files_collection, blobs_collection
from app.core.logging import logger

class FileService:
    @staticmethod
    async def read_upload_safely(
        file: UploadFile,
        max_bytes: int,
        chunk_size: int = 1024 * 1024,
    ) -> bytes:
        """
        Reads an UploadFile incrementally in bounded chunks to prevent arbitrary memory consumption.
        Stops reading immediately once max_bytes is exceeded and raises HTTP 413.
        Rejects empty uploads with HTTP 400.
        
        NOTE: This bounded streaming reader early-aborts oversized uploads so that
        arbitrarily large bodies (e.g. multi-gigabyte files) cannot consume application memory.
        Valid uploads up to the configured limit are assembled into a complete bytes object
        as required by downstream processing (MIME magic bytes, SHA-256, text extraction,
        DLP, perceptual hashing, and encryption), requiring up to max_bytes of memory per active upload.
        """
        chunks: List[bytes] = []
        total_read = 0

        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_read += len(chunk)
            if total_read > max_bytes:
                # Stop reading immediately and free already accumulated chunks
                del chunks
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB"
                )
            chunks.append(chunk)

        if total_read == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file upload is prohibited"
            )

        return b"".join(chunks)

    @staticmethod
    async def process_upload(
        file_bytes: bytes,
        original_filename: str,
        current_user: Dict[str, Any]
    ) -> UploadResponse:
        """
        Orchestrates complete upload workflow:
        1. Size limit validation
        2. Filename sanitization
        3. MIME and magic byte security validation
        4. Text extraction & DLP scanning
        5. Exact & near-duplicate detection
        6. AES-256-GCM encryption & atomic blob storage
        7. Tenant-scoped database insertion
        8. Webhooks & audit logging
        """
        company = current_user.get("company", "").strip()
        username = current_user.get("username", "")

        if not company:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no tenant organization association"
            )

        # 1. Size limit check
        if len(file_bytes) > settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB"
            )
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file upload is prohibited"
            )

        # 2. Filename sanitization
        safe_filename = sanitize_filename(original_filename)

        # 3. MIME and executable validation
        validate_file_content(file_bytes, safe_filename)

        # 4. Content hash for deduplication
        file_hash = sha256_bytes(file_bytes)

        # 5. Text extraction and DLP scanning
        text = extract_text(file_bytes, safe_filename)
        dlp_res = DLPService.scan_text(text)

        quarantine_status = "quarantined" if dlp_res.quarantine_required else "safe"
        has_sensitive_content = dlp_res.has_violations

        # 6. Exact and near-duplicate analysis (Tenant-scoped, includes image dHash)
        dedup_res = DedupService.analyze_deduplication(
            file_hash, text, company, filename=safe_filename, file_bytes=file_bytes
        )

        # 7. Physical blob encryption & atomic reference counting under concurrency lock
        encrypted_payload = EncryptionService.encrypt(file_bytes)

        with BlobLockManager.acquire(file_hash):
            final_path = StorageService.save(file_hash, encrypted_payload)

            # Atomically increment reference count in physical blobs collection
            BlobRepository.register_blob_reference(file_hash, final_path)

            try:
                # 8. Insert logical file record scoped to tenant
                doc = {
                    "filename": safe_filename,
                    "owner": username,
                    "company": company,
                    "hash": file_hash,
                    "minhash_values": dedup_res.minhash_values,
                    "image_dhash": dedup_res.image_dhash,
                    "dhash_buckets": dedup_res.dhash_buckets,
                    "size": len(file_bytes),
                    "upload_date": datetime.now(timezone.utc),
                    "is_duplicate": dedup_res.is_duplicate,
                    "is_near_duplicate": dedup_res.is_near_duplicate,
                    "similarity_score": dedup_res.similarity_score,
                    "compare_file_id": dedup_res.compare_file_id,
                    "file_path": final_path,
                    "quarantine_status": quarantine_status,
                    "has_sensitive_content": has_sensitive_content,
                    "dlp_violations": dlp_res.violations,
                    "dlp_findings": [f.model_dump() for f in dlp_res.findings]
                }
                file_id = FileRepository.insert_file(doc)
            except Exception as e:
                logger.error(f"Upload rollback: file insert failed for {safe_filename} ({file_hash}): {e}")
                remaining_refs, path_to_clean = BlobRepository.release_blob_reference(file_hash)
                if remaining_refs == 0 and path_to_clean:
                    active_files = files_collection.count_documents({"hash": file_hash})
                    active_blobs = blobs_collection.find_one({"content_hash": file_hash, "ref_count": {"$gt": 0}})
                    if active_files == 0 and not active_blobs:
                        StorageService.delete(path_to_clean)
                raise

        # 9. Trigger notifications
        if dlp_res.violations:
            WebhookService.trigger_webhook(
                company,
                "dlp_violation",
                {"filename": safe_filename, "owner": username, "violations": dlp_res.violations}
            )
        elif dedup_res.is_duplicate:
            WebhookService.trigger_webhook(
                company,
                "duplicate_alert",
                {"filename": safe_filename, "owner": username}
            )
        else:
            WebhookService.trigger_webhook(
                company,
                "upload_original",
                {"filename": safe_filename, "owner": username}
            )

        # 10. Audit logging
        AuditRepository.log(
            username=username,
            company=company,
            action="FILE_UPLOAD",
            details=f"Uploaded {safe_filename} (Dup: {dedup_res.is_duplicate}, DLP: {has_sensitive_content})",
            resource_id=file_id
        )

        return UploadResponse(
            status="Uploaded",
            is_duplicate=dedup_res.is_duplicate,
            is_near_duplicate=dedup_res.is_near_duplicate,
            similarity_score=dedup_res.similarity_score,
            quarantined=has_sensitive_content,
            file_id=file_id
        )

    @staticmethod
    def get_file_for_download(file_id: str, current_user: Dict[str, Any]) -> StreamingResponse:
        """Tenant-scoped download. Decrypts AES-256-GCM payload in memory."""
        company = current_user.get("company", "").strip()
        username = current_user.get("username", "")
        role = current_user.get("role", "employee")

        file_doc = FileRepository.find_by_id_scoped(file_id, company)
        if not file_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        if file_doc.get("quarantine_status") == "quarantined" and role not in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="File is quarantined for policy violations. Admin approval required."
            )

        path = file_doc.get("file_path")
        if not path or not StorageService.exists_path(path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical file missing from storage")

        encrypted_bytes = StorageService.read_path(path)

        decrypted_bytes = EncryptionService.decrypt(encrypted_bytes)
        safe_name = sanitize_filename(file_doc['filename'])

        AuditRepository.log(
            username=username,
            company=company,
            action="FILE_DOWNLOAD",
            details=f"Downloaded {safe_name}",
            resource_id=file_id
        )

        # RFC 6266 compliant Content-Disposition with URL-encoded filename
        encoded_name = urllib.parse.quote(safe_name, safe='')
        return StreamingResponse(
            io.BytesIO(decrypted_bytes),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}",
                "X-Content-Type-Options": "nosniff"
            }
        )

    @staticmethod
    def get_extracted_text(file_id: str, current_user: Dict[str, Any]) -> TextResponse:
        """Returns extracted plain-text for diffing. Strictly tenant-scoped to prevent IDOR."""
        company = current_user.get("company", "").strip()
        file_doc = FileRepository.find_by_id_scoped(file_id, company)
        if not file_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        path = file_doc.get("file_path")
        if not path or not StorageService.exists_path(path):
            return TextResponse(text="")

        decrypted_bytes = EncryptionService.decrypt(StorageService.read_path(path))

        text = extract_text(decrypted_bytes, file_doc["filename"])
        return TextResponse(text=text)

    @staticmethod
    def get_file_summary(file_id: str, current_user: Dict[str, Any]) -> SummaryResponse:
        """
        Deterministic file summary. Strictly tenant-scoped.
        Does NOT use ML/AI/LLM; computes structured cryptographic & compliance summary.
        """
        company = current_user.get("company", "").strip()
        file_doc = FileRepository.find_by_id_scoped(file_id, company)
        if not file_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        size_kb = round(file_doc.get("size", 0) / 1024, 2)
        violations = file_doc.get("dlp_violations", [])
        status_str = file_doc.get("quarantine_status", "safe")
        dup_str = "Duplicate file" if file_doc.get("is_duplicate") else "Original file"
        if file_doc.get("is_near_duplicate"):
            dup_str = f"Near-duplicate ({file_doc.get('similarity_score', 0)}% similarity)"

        summary_text = (
            f"Deterministic Security Summary: '{file_doc['filename']}' ({size_kb} KB). "
            f"Classification: {dup_str}. SHA-256 Digest: {file_doc['hash'][:16]}... "
            f"Compliance status: {status_str.upper()}. Violations detected: {len(violations)} ({', '.join(violations) if violations else 'None'})."
        )
        return SummaryResponse(summary=summary_text)

    @staticmethod
    async def delete_file(file_id: str, current_user: Dict[str, Any]) -> Dict[str, str]:
        """
        Safely deletes file document and atomically decrements physical blob reference.
        Deletes physical file from disk ONLY when remaining global references reach 0.
        """
        company = current_user.get("company", "").strip()
        username = current_user.get("username", "")
        role = current_user.get("role", "employee")

        file_doc = FileRepository.find_by_id_scoped(file_id, company)
        if not file_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        if role != "admin" and file_doc["owner"] != username:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to delete this file")

        file_hash = file_doc.get("hash")

        with BlobLockManager.acquire(file_hash):
            deleted = FileRepository.delete_file_scoped(file_id, company)
            if not deleted:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or already deleted")

            # Concurrency-safe atomic reference decrement
            if file_hash:
                remaining_refs, path_to_clean = BlobRepository.release_blob_reference(file_hash)
                if remaining_refs == 0 and path_to_clean:
                    active_files = files_collection.count_documents({"hash": file_hash})
                    active_blobs = blobs_collection.find_one({"content_hash": file_hash, "ref_count": {"$gt": 0}})
                    if active_files == 0 and not active_blobs:
                        if StorageService.delete(path_to_clean):
                            AuditRepository.log(
                                username=username,
                                company=company,
                                action="DELETE_PHYSICAL",
                                details=f"Physical file purged for hash {file_hash[:12]}..."
                            )

        AuditRepository.log(
            username=username,
            company=company,
            action="DELETE_FILE",
            details=f"Deleted file record {file_doc['filename']}",
            resource_id=file_id
        )

        return {"msg": f"File '{file_doc['filename']}' deleted successfully"}
