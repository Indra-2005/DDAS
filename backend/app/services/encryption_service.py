"""
AES-256-GCM encryption service at rest.
Uses independent master key and generates cryptographically random 96-bit nonces per write.
"""
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

MAGIC_HEADER = b"DDAS_ENC\x01"

class EncryptionService:
    @staticmethod
    def encrypt(data: bytes) -> bytes:
        """
        Encrypts plain bytes using AES-256-GCM with a fresh 12-byte random nonce.
        Prepends MAGIC_HEADER + nonce + ciphertext.
        """
        key = settings.encryption_key_bytes
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, data, None)
        return MAGIC_HEADER + nonce + ciphertext

    @staticmethod
    def decrypt(data: bytes) -> bytes:
        """
        Decrypts bytes with AES-256-GCM.
        Gracefully returns raw payload if magic header is absent (for legacy unencrypted data).
        """
        if not data.startswith(MAGIC_HEADER):
            return data

        nonce_start = len(MAGIC_HEADER)
        # Zero-copy memoryview slice avoids allocating duplicate ciphertext buffer in RAM
        mv = memoryview(data)
        nonce = bytes(mv[nonce_start : nonce_start + 12])
        ciphertext = mv[nonce_start + 12 :]

        key = settings.encryption_key_bytes
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None)
