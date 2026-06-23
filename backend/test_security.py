import os
import sys
import hashlib
from app import encrypt_file_data, decrypt_file_data, master_key_bytes

def test_aes_gcm_encryption():
    print("Testing AES-256-GCM Encryption helper...")
    test_payload = b"Top secret data for DDAS multi-tenant file alert system"
    
    # 1. Encrypt data
    encrypted = encrypt_file_data(test_payload)
    assert encrypted.startswith(b"DDAS_ENC\x01"), "Encrypted data must start with correct Magic Header"
    
    # 2. Decrypt data
    decrypted = decrypt_file_data(encrypted)
    assert decrypted == test_payload, "Decrypted data must match original payload"
    print("[OK] AES-256-GCM Encryption/Decryption verified successfully!")

def test_cryptographic_master_key_derivation():
    print("Testing Cryptographic Master Key derivation...")
    secret_key = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "super_secret_fixed_key_for_ddas"))
    derived_expected = hashlib.sha256(secret_key.encode('utf-8')).digest()
    
    # If no ENCRYPTION_MASTER_KEY is in .env, master_key_bytes should match derived_expected
    if not os.getenv("ENCRYPTION_MASTER_KEY"):
        assert master_key_bytes == derived_expected, "Fallback key must match SHA-256 of the JWT secret key"
        print("[OK] Fallback Master Key derivation validated successfully!")
    else:
        print("[OK] ENCRYPTION_MASTER_KEY defined in env. Custom master key active.")

if __name__ == "__main__":
    print("Running DDAS Cybersecurity Hardening Validation Suite...")
    print("=========================================================")
    try:
        test_aes_gcm_encryption()
        test_cryptographic_master_key_derivation()
        print("=========================================================")
        print("SUCCESS: All cryptographic security checks passed!")
    except AssertionError as e:
        print(f"SECURITY VERIFICATION FAILURE: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"UNEXPECTED TEST EXCEPTION: {e}")
        sys.exit(1)
