"""
Storage abstraction service.
Isolates all physical file I/O behind a clean interface, enabling future
swaps to S3, GCS, or other object stores without modifying business logic.
"""
import os
import tempfile
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
        Atomically writes bytes to storage if the file does not already exist.
        Uses a unique temporary file in the same directory, flushed and fsynced,
        then atomically replaced via os.replace() to guarantee no partially written
        blob is ever visible. Preserves existing valid files without rewriting.
        Returns the resolved absolute path.
        """
        path = cls._resolve_path(filename)
        storage_dir = os.path.dirname(path)
        os.makedirs(storage_dir, exist_ok=True)

        # 1. Fast path: if target already exists, do not rewrite
        if os.path.exists(path):
            return path

        # 2. Write to a unique temporary file in the SAME directory
        # Same directory ensures os.replace is an atomic rename on the same filesystem
        safe_prefix = f".tmp_{os.path.basename(filename)[:32]}_"
        temp_fd, temp_path = tempfile.mkstemp(
            prefix=safe_prefix,
            dir=storage_dir
        )

        try:
            try:
                with os.fdopen(temp_fd, "wb") as f:
                    f.write(data)
                    f.flush()
                    os.fsync(f.fileno())
            except Exception:
                try:
                    os.close(temp_fd)
                except OSError:
                    pass
                raise

            # 3. Check again if a concurrent process published the target
            if os.path.exists(path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
                return path

            # 4. Atomically publish the temporary file to target path
            try:
                os.replace(temp_path, path)
                logger.debug(f"StorageService: Wrote {len(data)} bytes to {filename}")
            except (FileExistsError, PermissionError, OSError):
                # Under concurrent race or Windows handle contention, check if target now exists
                if os.path.exists(path):
                    try:
                        os.remove(temp_path)
                    except OSError:
                        pass
                else:
                    raise

            return path

        except BaseException:
            # Guarantee cleanup of temporary file on any error
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
            raise

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
