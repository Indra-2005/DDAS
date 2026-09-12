"""
Cryptographic hashing and path/identifier sanitization utilities.
"""
import hashlib
import os
import re
import unicodedata
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

def sha256_bytes(data: bytes) -> str:
    """Computes hexadecimal SHA-256 digest of bytes."""
    return hashlib.sha256(data).hexdigest()

def sanitize_filename(filename: str) -> str:
    """
    Sanitize user-supplied filename to prevent path traversal,
    null byte injection, control character abuse, and homograph attacks.
    """
    if not filename:
        return "unnamed_file"
    # Extract basename only - strip any path components
    filename = os.path.basename(filename)
    # Remove null bytes
    filename = filename.replace("\x00", "")
    # Normalize unicode to NFKD to prevent homograph bypasses
    filename = unicodedata.normalize("NFKD", filename)
    # Remove control characters
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)
    # Neutralize path traversal
    filename = filename.replace("..", "_").replace("/", "_").replace("\\", "_")
    # Enforce maximum filename length (255 bytes)
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255 - len(ext)] + ext
    # Fallback if empty after sanitization
    if not filename or filename.strip() == "":
        return "unnamed_file"
    return filename.strip()

def safe_object_id(resource_id: str) -> ObjectId:
    """Safely converts a string to BSON ObjectId, raising 404 if invalid."""
    try:
        return ObjectId(resource_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested resource was not found"
        )
