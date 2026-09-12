"""
DDAS - Data Download Duplication Alert System
Production-hardened, deterministic security, deduplication, and compliance platform.
"""
__version__ = "2.0.0"

from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    generate_invite_code,
    UserRole
)
from app.db.database import (
    client,
    db,
    users_collection,
    files_collection,
    blobs_collection,
    logs_collection,
    companies_collection,
    settings_collection
)
from app.services.encryption_service import EncryptionService, MAGIC_HEADER
from app.algorithms.hashing import sha256_bytes, sanitize_filename, safe_object_id
from app.algorithms.text_extraction import extract_text
from app.algorithms.minhash import build_minhash
from app.algorithms.similarity import jaccard_from_stored
from app.algorithms.mime_validation import validate_file_content
from app.services.dlp_service import DLPService
from app.main import app

# Backward-compatibility aliases for existing test suites and tools
SECRET_KEY = settings.JWT_SECRET
master_key_bytes = settings.encryption_key_bytes
STORAGE_DIR = settings.effective_storage_dir
MAX_UPLOAD_SIZE_BYTES = settings.max_upload_size_bytes

def encrypt_file_data(data: bytes) -> bytes:
    """AES-256-GCM encryption helper for backward compatibility."""
    return EncryptionService.encrypt(data)

def decrypt_file_data(data: bytes) -> bytes:
    """AES-256-GCM decryption helper for backward compatibility."""
    return EncryptionService.decrypt(data)

def scan_text_for_dlp(text: str):
    """DLP violation list helper for backward compatibility."""
    res = DLPService.scan_text(text)
    return res.violations

__all__ = [
    "app",
    "settings",
    "SECRET_KEY",
    "master_key_bytes",
    "STORAGE_DIR",
    "MAX_UPLOAD_SIZE_BYTES",
    "encrypt_file_data",
    "decrypt_file_data",
    "scan_text_for_dlp",
    "client",
    "db",
    "users_collection",
    "files_collection",
    "blobs_collection",
    "logs_collection",
    "companies_collection",
    "settings_collection"
]
