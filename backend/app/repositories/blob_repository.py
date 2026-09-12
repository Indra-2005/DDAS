"""
Physical blob repository with concurrency-safe atomic reference counting.
"""
from datetime import datetime, timezone
from typing import Tuple, Optional, Dict, Any
from pymongo import ReturnDocument
from app.db.database import blobs_collection, files_collection
from app.core.logging import logger

class BlobRepository:
    @staticmethod
    def register_blob_reference(content_hash: str, file_path: str) -> Dict[str, Any]:
        """
        Atomically increments physical blob reference count.
        Creates blob document if this is the first physical occurrence.
        """
        now = datetime.now(timezone.utc)
        result = blobs_collection.find_one_and_update(
            {"content_hash": content_hash},
            {
                "$inc": {"ref_count": 1},
                "$setOnInsert": {
                    "content_hash": content_hash,
                    "file_path": file_path,
                    "created_at": now
                },
                "$set": {"updated_at": now}
            },
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        return result

    @staticmethod
    def release_blob_reference(content_hash: str) -> Tuple[int, Optional[str]]:
        """
        Atomically decrements physical blob reference count.
        Returns:
            (remaining_refs: int, file_path: Optional[str])
        If remaining_refs <= 0, the blob record is removed and physical deletion should proceed.
        """
        now = datetime.now(timezone.utc)
        result = blobs_collection.find_one_and_update(
            {"content_hash": content_hash},
            {
                "$inc": {"ref_count": -1},
                "$set": {"updated_at": now}
            },
            return_document=ReturnDocument.AFTER
        )

        if not result:
            # Fallback for documents that existed before blobs collection was populated
            remaining = files_collection.count_documents({"hash": content_hash})
            return remaining, None

        ref_count = result.get("ref_count", 0)
        file_path = result.get("file_path")

        if ref_count <= 0:
            blobs_collection.delete_one({"content_hash": content_hash})
            # Also verify no logical files are pointing to it
            logical_refs = files_collection.count_documents({"hash": content_hash})
            if logical_refs == 0:
                return 0, file_path
            else:
                # Synchronize if discrepancies exist
                blobs_collection.update_one(
                    {"content_hash": content_hash},
                    {"$set": {"ref_count": logical_refs, "file_path": file_path}},
                    upsert=True
                )
                return logical_refs, file_path

        return ref_count, file_path
