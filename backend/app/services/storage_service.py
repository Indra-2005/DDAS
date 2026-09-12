"""
Storage abstraction service.
Isolates all physical file I/O behind a clean interface, enabling future
swaps to S3, GCS, or other object stores without modifying business logic.
"""
import os
from typing import Optional
from app.core.config import settings
from app.core.logging import logger


class StorageService:
    """Provides save/read/delete/exists operations against the configured storage backend."""

    @staticmethod
    def _resolve_path(filename: str) -> str:
        """Builds a full filesystem path inside the configured storage directory."""
        return os.path.join(settings.effective_storage_dir, filename)

    @classmethod
    def save(cls, filename: str, data: bytes) -> str:
        """
        Writes bytes to storage if the file does not already exist.
        Returns the resolved absolute path.
        """
        path = cls._resolve_path(filename)
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(data)
            logger.debug(f"StorageService: Wrote {len(data)} bytes to {filename}")
        return path

    @classmethod
    def read(cls, filename: str) -> bytes:
        """Reads and returns the raw bytes from storage."""
        path = cls._resolve_path(filename)
        with open(path, "rb") as f:
            return f.read()

    @classmethod
    def read_path(cls, path: str) -> bytes:
        """Reads raw bytes from an absolute path (for legacy file_path references)."""
        with open(path, "rb") as f:
            return f.read()

    @classmethod
    def delete(cls, path: str) -> bool:
        """
        Deletes a file at the given absolute path.
        Returns True if deleted, False if file didn't exist.
        """
        if path and os.path.exists(path):
            try:
                os.remove(path)
                logger.debug(f"StorageService: Deleted {path}")
                return True
            except OSError as e:
                logger.warning(f"StorageService: Failed to delete {path}: {e}")
                return False
        return False

    @classmethod
    def exists(cls, filename: str) -> bool:
        """Checks whether a file exists in storage."""
        return os.path.exists(cls._resolve_path(filename))

    @classmethod
    def exists_path(cls, path: str) -> bool:
        """Checks whether a file exists at an absolute path."""
        return bool(path) and os.path.exists(path)
