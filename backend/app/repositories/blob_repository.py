"""
Physical blob repository with concurrency-safe atomic reference counting.
"""
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Tuple, Optional, Dict, Any
from pymongo import ReturnDocument
from app.db.database import blobs_collection, files_collection
from app.core.logging import logger


class BlobLockManager:
    """
    Keyed lock coordinator providing mutual exclusion per content_hash.
    Guarantees thread-level synchronization for blob reference mutations
    and physical storage operations within the process.
    """
    _locks: Dict[str, threading.Lock] = {}
    _lock_counts: Dict[str, int] = {}
    _global_lock = threading.Lock()

    @classmethod
    @contextmanager
    def acquire(cls, content_hash: Optional[str]):
        if not content_hash:
            yield
            return

        with cls._global_lock:
            if content_hash not in cls._locks:
                cls._locks[content_hash] = threading.Lock()
                cls._lock_counts[content_hash] = 0
            cls._lock_counts[content_hash] += 1
            lock = cls._locks[content_hash]

        lock.acquire()
        try:
            yield
        finally:
            lock.release()
            with cls._global_lock:
                cls._lock_counts[content_hash] -= 1
                if cls._lock_counts[content_hash] <= 0:
                    cls._locks.pop(content_hash, None)
                    cls._lock_counts.pop(content_hash, None)


class BlobRepository:
    @staticmethod
    def register_blob_reference(content_hash: str, file_path: str) -> Dict[str, Any]:
        """
        Atomically increments physical blob reference count.
        Creates blob document if this is the first physical occurrence.
        Guarantees ref_count >= 1.
        """
        now = datetime.now(timezone.utc)
        result = blobs_collection.find_one_and_update(
            {"content_hash": content_hash},
            {
                "$inc": {"ref_count": 1},
                "$setOnInsert": {
                    "content_hash": content_hash,
                    "created_at": now
                },
                "$set": {
                    "file_path": file_path,
                    "updated_at": now
                }
            },
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        if result and result.get("ref_count", 0) < 1:
            result = blobs_collection.find_one_and_update(
                {"content_hash": content_hash},
                {"$set": {"ref_count": 1, "updated_at": now}},
                return_document=ReturnDocument.AFTER
            )
        return result

    @staticmethod
    def release_blob_reference(content_hash: str) -> Tuple[int, Optional[str]]:
        """
        Atomically decrements physical blob reference count with concurrency guards.
        Returns:
            (remaining_refs: int, file_path: Optional[str])
        If remaining_refs <= 0 and no logical files exist, the blob record is removed
        and physical deletion should proceed.
        """
        now = datetime.now(timezone.utc)
        # Atomically decrement ref_count ONLY if ref_count > 0 to prevent negative values
        result = blobs_collection.find_one_and_update(
            {"content_hash": content_hash, "ref_count": {"$gt": 0}},
            {
                "$inc": {"ref_count": -1},
                "$set": {"updated_at": now}
            },
            return_document=ReturnDocument.AFTER
        )

        if not result:
            # Document either had ref_count <= 0 or did not exist in blobs collection
            blob_doc = blobs_collection.find_one({"content_hash": content_hash})
            file_path = blob_doc.get("file_path") if blob_doc else None
            logical_refs = files_collection.count_documents({"hash": content_hash})
            if logical_refs == 0:
                if blob_doc:
                    blobs_collection.delete_one({"content_hash": content_hash, "ref_count": {"$lte": 0}})
                return 0, file_path
            else:
                # Synchronize if discrepancies exist
                blobs_collection.update_one(
                    {"content_hash": content_hash},
                    {"$set": {"ref_count": logical_refs, "file_path": file_path, "updated_at": now}},
                    upsert=True
                )
                return logical_refs, file_path

        ref_count = result.get("ref_count", 0)
        file_path = result.get("file_path")

        if ref_count <= 0:
            # Verify no logical files are pointing to it before allowing physical cleanup
            logical_refs = files_collection.count_documents({"hash": content_hash})
            if logical_refs == 0:
                # Conditionally delete blob record ONLY if ref_count is still <= 0
                del_res = blobs_collection.delete_one({"content_hash": content_hash, "ref_count": {"$lte": 0}})
                if del_res.deleted_count > 0:
                    return 0, file_path
                else:
                    # A concurrent registration incremented ref_count before deletion!
                    fresh = blobs_collection.find_one({"content_hash": content_hash})
                    fresh_ref = fresh.get("ref_count", 1) if fresh else 0
                    return fresh_ref, file_path
            else:
                # Synchronize discrepancy if logical files still exist
                blobs_collection.update_one(
                    {"content_hash": content_hash},
                    {"$set": {"ref_count": logical_refs, "file_path": file_path, "updated_at": now}},
                    upsert=True
                )
                return logical_refs, file_path

        return ref_count, file_path

    @staticmethod
    def get_blob_ref_count(content_hash: str) -> int:
        """Helper to get current blob ref_count in MongoDB (for testing and verification)."""
        blob = blobs_collection.find_one({"content_hash": content_hash})
        return blob.get("ref_count", 0) if blob else 0

