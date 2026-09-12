"""
MIME type and magic bytes verification.
Prevents uploading malicious executables, binaries, and disguised payloads.
"""
import os
import magic
from fastapi import HTTPException, status
from app.core.logging import logger

DISALLOWED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".msi", ".dll",
    ".com", ".scr", ".pif", ".application", ".gadget", ".hta", ".cpl", ".msc"
}

DISALLOWED_MIME_TYPES = {
    "application/x-dosexec",
    "application/x-executable",
    "application/x-sharedlib",
    "application/x-msdos-program",
    "application/x-msdownload",
}

def validate_file_content(file_bytes: bytes, filename: str) -> str:
    """
    Validates file content using both file extension checks and libmagic MIME detection.
    Raises HTTPException(400) if content or extension is deemed dangerous.
    Returns detected MIME string.
    """
    ext = os.path.splitext(filename.lower())[1]
    if ext in DISALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is prohibited for security reasons."
        )

    try:
        detected_mime = magic.from_buffer(file_bytes, mime=True)
    except Exception as e:
        logger.warning(f"MIME detection fallback: {e}")
        detected_mime = "application/octet-stream"

    if detected_mime in DISALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content type '{detected_mime}' is not permitted."
        )

    return detected_mime
