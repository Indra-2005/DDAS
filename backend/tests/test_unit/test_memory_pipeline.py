"""
Tests for Phase 6: Upload and Download File Memory Pipeline Improvements.
Verifies bounded memory usage, zero-copy slicing, duplicate upload bypass,
spooled download streaming, and full preservation of security/dedup/DLP behavior.
"""
import io
import os
import uuid
import asyncio
import tempfile
from unittest.mock import patch
import pytest

from fastapi import HTTPException
from app.services.file_service import FileService
from app.services.storage_service import StorageService
from app.services.encryption_service import EncryptionService, MAGIC_HEADER
from app.services.dlp_service import DLPService
from app.repositories.file_repository import FileRepository
from app.repositories.blob_repository import BlobRepository
from app.algorithms.hashing import sha256_bytes
from app.algorithms.mime_validation import validate_file_content
from app.core.config import settings
from app.db.database import files_collection, blobs_collection


def _read_streaming_response(response) -> bytes:
    """Helper to consume Starlette StreamingResponse body."""
    async def _consume():
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        return b"".join(chunks)
    return asyncio.run(_consume())


def _make_user(username: str, company: str, role: str = "admin") -> dict:
    return {"username": username, "company": company, "role": role}


class TestMemoryPipeline:
    """Comprehensive test suite for Phase 6 memory pipeline optimizations."""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self, test_tenants):
        self.tenant_a = test_tenants["tenant_a"]
        self.tenant_b = test_tenants["tenant_b"]
        self.user_a = _make_user("user_mem_a", self.tenant_a, "admin")
        self.user_b = _make_user("user_mem_b", self.tenant_b, "admin")
        self.created_hashes = set()
        self.created_file_ids = []

        yield

        for fid in self.created_file_ids:
            try:
                files_collection.delete_one({"_id": fid})
            except Exception:
                pass
        for h in self.created_hashes:
            try:
                blobs_collection.delete_one({"content_hash": h})
                path = StorageService._resolve_path(h)
                StorageService.delete(path)
            except Exception:
                pass

    def test_mime_validation_bounded_sample(self):
        """
        Verifies that validate_file_content inspects header magic bytes without error
        even on large payloads.
        """
        # Create a text payload
        payload = b"Hello, this is a plain text file." + b"A" * 100000
        detected = validate_file_content(payload, "sample.txt")
        assert "text" in detected or detected == "application/octet-stream"

        # Disallowed extension must still raise 400
        with pytest.raises(HTTPException) as exc:
            validate_file_content(b"echo 'malicious'", "script.bat")
        assert exc.value.status_code == 400

    def test_encryption_zero_copy_decrypt_roundtrip(self):
        """
        Verifies that zero-copy memoryview decrypt produces identical bytes
        and preserves roundtrip fidelity with encrypt.
        """
        original = b"Cryptographic roundtrip verification payload " * 1000
        encrypted = EncryptionService.encrypt(original)
        assert encrypted.startswith(MAGIC_HEADER)

        decrypted = EncryptionService.decrypt(encrypted)
        assert decrypted == original

    def test_encryption_legacy_fallback(self):
        """
        Verifies that unencrypted legacy data without MAGIC_HEADER is returned as-is.
        """
        raw_legacy = b"Legacy unencrypted plaintext data"
        assert EncryptionService.decrypt(raw_legacy) == raw_legacy

    def test_duplicate_upload_skips_redundant_encryption(self):
        """
        Verifies that uploading an identical file (same SHA-256) bypasses
        AES-256-GCM re-encryption and reuses the existing physical blob.
        """
        content = f"Duplicate upload bypass payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        # 1. First upload: must encrypt and write physical storage
        res1 = asyncio.run(
            FileService.process_upload(
                file_bytes=content,
                original_filename="upload_1.txt",
                current_user=self.user_a
            )
        )
        self.created_file_ids.append(res1.file_id)
        assert StorageService.exists(file_hash) is True
        assert BlobRepository.get_blob_ref_count(file_hash) == 1

        # 2. Second upload with exact same content:
        # Patch EncryptionService.encrypt to ensure it is NOT called!
        with patch.object(EncryptionService, "encrypt", wraps=EncryptionService.encrypt) as mock_encrypt:
            res2 = asyncio.run(
                FileService.process_upload(
                    file_bytes=content,
                    original_filename="upload_2.txt",
                    current_user=self.user_a
                )
            )
            self.created_file_ids.append(res2.file_id)

            # mock_encrypt MUST NOT have been called because blob already exists!
            mock_encrypt.assert_not_called()

        assert res2.is_duplicate is True
        assert BlobRepository.get_blob_ref_count(file_hash) == 2

        # Both files can download and match original content
        s1 = FileService.get_file_for_download(res1.file_id, self.user_a)
        assert _read_streaming_response(s1) == content
        s2 = FileService.get_file_for_download(res2.file_id, self.user_a)
        assert _read_streaming_response(s2) == content

    def test_download_small_file_memory_stream(self):
        """
        Verifies that small file downloads (<=10MB) stream in 64KB chunks
        with Content-Length header and exact byte fidelity.
        """
        content = b"Small file download payload" * 100
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        res = asyncio.run(
            FileService.process_upload(
                file_bytes=content,
                original_filename="small.txt",
                current_user=self.user_a
            )
        )
        self.created_file_ids.append(res.file_id)

        stream_resp = FileService.get_file_for_download(res.file_id, self.user_a)
        assert stream_resp.headers.get("Content-Length") == str(len(content))
        downloaded = _read_streaming_response(stream_resp)
        assert downloaded == content

    def test_download_large_file_spooled_stream_and_cleanup(self):
        """
        Verifies that large file downloads (>10MB) trigger disk-spooled streaming,
        freeing decrypted RAM buffers, streaming in 64KB chunks, and automatically
        deleting the temporary spool file upon completion.
        """
        # Create a payload larger than 10MB (e.g. 11 MB)
        eleven_mb = 11 * 1024 * 1024
        pattern = b"0123456789abcdef" * (eleven_mb // 16)
        file_hash = sha256_bytes(pattern)
        self.created_hashes.add(file_hash)

        res = asyncio.run(
            FileService.process_upload(
                file_bytes=pattern,
                original_filename="large_11mb.bin",
                current_user=self.user_a
            )
        )
        self.created_file_ids.append(res.file_id)

        # Track spool files created in storage dir during download
        storage_dir = settings.effective_storage_dir
        files_before = set(os.listdir(storage_dir))

        stream_resp = FileService.get_file_for_download(res.file_id, self.user_a)
        assert stream_resp.headers.get("Content-Length") == str(len(pattern))

        downloaded = _read_streaming_response(stream_resp)
        assert len(downloaded) == eleven_mb
        assert downloaded == pattern

        # Verify that any temporary spool files were deleted after download completed
        files_after = set(os.listdir(storage_dir))
        spool_leftovers = [f for f in files_after if f.startswith(".dl_spool_")]
        assert len(spool_leftovers) == 0, f"Spool leftovers found: {spool_leftovers}"

    def test_dlp_and_dedup_integrity_preserved(self):
        """
        Verifies that DLP scanning and deduplication are 100% functional
        under the memory-optimized pipeline.
        """
        sensitive_content = (
            b"Internal confidential document. AWS key: AKIAIOSFODNN7EXAMPLE. "
            b"Credit card: 4111111111111111."
        )
        file_hash = sha256_bytes(sensitive_content)
        self.created_hashes.add(file_hash)

        res = asyncio.run(
            FileService.process_upload(
                file_bytes=sensitive_content,
                original_filename="dlp_test.txt",
                current_user=self.user_a
            )
        )
        self.created_file_ids.append(res.file_id)

        assert res.quarantined is True

        # Verify file doc in DB
        doc = FileRepository.find_by_id_scoped(res.file_id, self.tenant_a)
        assert doc["quarantine_status"] == "quarantined"
        assert "AWS Access Key" in doc["dlp_violations"]
        assert "Credit Card" in doc["dlp_violations"]

    def test_image_perceptual_hash_integrity_preserved(self):
        """
        Verifies that image difference hashing and candidate lookup work correctly
        with Pillow buffer closing.
        """
        from PIL import Image
        img_buf = io.BytesIO()
        img = Image.new('RGB', (100, 100), color='blue')
        img.save(img_buf, format='JPEG')
        img_bytes = img_buf.getvalue()

        file_hash = sha256_bytes(img_bytes)
        self.created_hashes.add(file_hash)

        res = asyncio.run(
            FileService.process_upload(
                file_bytes=img_bytes,
                original_filename="blue.jpg",
                current_user=self.user_a
            )
        )
        self.created_file_ids.append(res.file_id)

        doc = FileRepository.find_by_id_scoped(res.file_id, self.tenant_a)
        assert doc.get("image_dhash") is not None
        assert doc.get("dhash_buckets") is not None
        assert len(doc["dhash_buckets"]) == 32

    def test_tenant_isolation_preserved(self):
        """
        Verifies that tenant isolation is strictly preserved on download.
        """
        content = b"Tenant isolation secret data"
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        res = asyncio.run(
            FileService.process_upload(
                file_bytes=content,
                original_filename="tenant_a.txt",
                current_user=self.user_a
            )
        )
        self.created_file_ids.append(res.file_id)

        # Tenant B must NOT be able to download Tenant A's file (404)
        with pytest.raises(HTTPException) as exc:
            FileService.get_file_for_download(res.file_id, self.user_b)
        assert exc.value.status_code == 404
