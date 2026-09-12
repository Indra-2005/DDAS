"""
Quarantine remediation service for administrators.
Provides approve, purge, and atomic redaction actions scoped to company tenant.
"""
import os
from typing import Dict, Any
from fastapi import HTTPException, status
from app.repositories.file_repository import FileRepository
from app.repositories.blob_repository import BlobRepository
from app.repositories.audit_repository import AuditRepository
from app.services.encryption_service import EncryptionService
from app.services.dlp_service import DLPService
from app.services.storage_service import StorageService
from app.algorithms.hashing import sha256_bytes, safe_object_id

class QuarantineService:
    @staticmethod
    def approve(file_id: str, company: str, username: str) -> Dict[str, str]:
        """Approves a quarantined file, clearing violation state."""
        file_doc = FileRepository.find_by_id_scoped(file_id, company)
        if not file_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        FileRepository.update_file_scoped(
            file_id,
            company,
            {"quarantine_status": "safe", "dlp_violations": []}
        )
        AuditRepository.log(
            username=username,
            company=company,
            action="QUARANTINE_APPROVE",
            details=f"Approved file {file_doc.get('filename')}",
            resource_id=file_id
        )
        return {"msg": "File approved successfully."}

    @staticmethod
    def redact(file_id: str, company: str, username: str) -> Dict[str, str]:
        """
        Redacts sensitive data from plain-text file, creating new encrypted blob
        and atomically transferring references without affecting other tenants.
        """
        file_doc = FileRepository.find_by_id_scoped(file_id, company)
        if not file_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        ext = os.path.splitext(file_doc["filename"])[1].lower()
        if ext not in {'.txt', '.csv', '.json', '.xml', '.html', '.md', '.log', '.yaml', '.yml'}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Automated redaction is only supported for plain-text and structured text formats."
            )

        old_path = file_doc.get("file_path")
        if not old_path or not StorageService.exists_path(old_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source physical file missing")

        encrypted_bytes = StorageService.read_path(old_path)
        decrypted_bytes = EncryptionService.decrypt(encrypted_bytes)
        content_str = decrypted_bytes.decode('utf-8', errors='replace')

        # Redact using DLP service
        redacted_content = DLPService.redact_text(content_str)
        new_bytes = redacted_content.encode('utf-8')
        new_hash = sha256_bytes(new_bytes)

        # Write encrypted redacted file via StorageService
        encrypted_redacted = EncryptionService.encrypt(new_bytes)
        new_path = StorageService.save(new_hash, encrypted_redacted)

        # Register new blob reference
        BlobRepository.register_blob_reference(new_hash, new_path)

        old_hash = file_doc.get("hash")

        # Update file document
        FileRepository.update_file_scoped(
            file_id,
            company,
            {
                "quarantine_status": "remediated",
                "has_sensitive_content": False,
                "dlp_violations": [],
                "dlp_findings": [],
                "hash": new_hash,
                "size": len(new_bytes),
                "file_path": new_path
            }
        )

        # Atomically release reference to old blob
        if old_hash:
            remaining_refs, path_to_clean = BlobRepository.release_blob_reference(old_hash)
            if remaining_refs == 0 and path_to_clean:
                StorageService.delete(path_to_clean)

        AuditRepository.log(
            username=username,
            company=company,
            action="QUARANTINE_REDACT",
            details=f"Redacted sensitive content from {file_doc.get('filename')}",
            resource_id=file_id
        )

        return {"msg": "File successfully redacted and restored."}
