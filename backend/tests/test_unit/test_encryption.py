"""
Unit tests for AES-256-GCM encryption at rest.
"""
from app.services.encryption_service import EncryptionService, MAGIC_HEADER
from app.core.config import settings

def test_encryption_roundtrip():
    payload = b"Top secret corporate financial statement for Q3 2026."
    encrypted = EncryptionService.encrypt(payload)
    assert encrypted.startswith(MAGIC_HEADER)
    assert encrypted != payload

    decrypted = EncryptionService.decrypt(encrypted)
    assert decrypted == payload

def test_encryption_unique_nonces():
    payload = b"Identical payload encrypted twice."
    enc1 = EncryptionService.encrypt(payload)
    enc2 = EncryptionService.encrypt(payload)
    # Nonces must differ, yielding different ciphertexts
    assert enc1 != enc2

    # Both must decrypt to original
    assert EncryptionService.decrypt(enc1) == payload
    assert EncryptionService.decrypt(enc2) == payload

def test_legacy_unencrypted_fallback():
    raw_payload = b"Old unencrypted legacy data without magic header."
    decrypted = EncryptionService.decrypt(raw_payload)
    assert decrypted == raw_payload

def test_key_independence():
    assert len(settings.ENCRYPTION_MASTER_KEY) == 64
    assert len(settings.encryption_key_bytes) == 32
    assert settings.ENCRYPTION_MASTER_KEY != settings.JWT_SECRET
