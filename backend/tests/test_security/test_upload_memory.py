"""
Tests for upload size limit enforcement and memory handling.
Verifies early Content-Length validation and incremental bounded chunked reading.
"""
import io
import asyncio
import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services.file_service import FileService


# ---------------------------------------------------------------------------
# Unit tests for FileService.read_upload_safely
# ---------------------------------------------------------------------------

def test_read_upload_safely_within_limit():
    """Upload within max_bytes completes normally and returns all bytes."""
    data = b"Hello, DDAS security testing!"
    mock_file = AsyncMock(spec=UploadFile)
    mock_file.read = AsyncMock(side_effect=[data[:10], data[10:], b""])

    result = asyncio.run(FileService.read_upload_safely(mock_file, max_bytes=100, chunk_size=10))
    assert result == data


def test_read_upload_safely_stops_immediately_on_overflow():
    """Verify reading stops immediately when max_bytes is crossed without reading remaining body."""
    chunks = [b"A" * 50, b"B" * 50, b"C" * 50, b"D" * 50, b"E" * 50]  # 250 bytes total
    call_count = 0

    async def mock_read(chunk_size):
        nonlocal call_count
        if call_count < len(chunks):
            chunk = chunks[call_count]
            call_count += 1
            return chunk
        return b""

    mock_file = AsyncMock(spec=UploadFile)
    mock_file.read = mock_read

    # Max bytes is 120 bytes: chunk 1 (50) + chunk 2 (100) are fine, chunk 3 (150 > 120) aborts
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(FileService.read_upload_safely(mock_file, max_bytes=120, chunk_size=50))

    assert exc_info.value.status_code == 413
    assert "File too large" in exc_info.value.detail
    # Must have stopped reading at chunk 3, NEVER reading chunks 4 and 5
    assert call_count == 3


def test_read_upload_safely_exact_limit():
    """Upload exactly at limit succeeds."""
    data = b"X" * 100
    mock_file = AsyncMock(spec=UploadFile)
    mock_file.read = AsyncMock(side_effect=[data, b""])

    result = asyncio.run(FileService.read_upload_safely(mock_file, max_bytes=100, chunk_size=100))
    assert result == data


def test_read_upload_safely_empty_rejected():
    """Empty file raises 400 Bad Request."""
    mock_file = AsyncMock(spec=UploadFile)
    mock_file.read = AsyncMock(return_value=b"")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(FileService.read_upload_safely(mock_file, max_bytes=100, chunk_size=10))

    assert exc_info.value.status_code == 400
    assert "Empty file upload is prohibited" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Integration tests for /upload endpoint size enforcement
# ---------------------------------------------------------------------------

def test_upload_content_length_exceeds_limit_early_reject(client: TestClient, auth_tokens, monkeypatch):
    """
    1. Content-Length greater than configured limit.
    Header causes immediate 413 rejection before body processing.
    """
    monkeypatch.setattr(type(settings), "max_upload_size_bytes", property(lambda self: 1024))
    headers = {**auth_tokens["admin_a"]["headers"], "Content-Length": "50000"}

    res = client.post(
        "/upload",
        files={"file": ("report.txt", io.BytesIO(b"Small body payload"), "text/plain")},
        headers=headers
    )
    assert res.status_code == 413
    assert "File too large" in res.json()["detail"]


def test_upload_missing_content_length_oversized_streamed(client: TestClient, auth_tokens, monkeypatch):
    """
    2. Missing Content-Length with oversized streamed body.
    Streaming reader detects cumulative bytes exceed limit and aborts with 413.
    """
    monkeypatch.setattr(type(settings), "max_upload_size_bytes", property(lambda self: 500))
    headers = auth_tokens["admin_a"]["headers"]

    oversized_body = b"A" * 1500  # 1500 bytes > 500 byte limit
    res = client.post(
        "/upload",
        files={"file": ("streamed_large.txt", io.BytesIO(oversized_body), "text/plain")},
        headers=headers
    )
    assert res.status_code == 413
    assert "File too large" in res.json()["detail"]


def test_upload_invalid_content_length_oversized_streamed(client: TestClient, auth_tokens, monkeypatch):
    """
    3. Invalid Content-Length header with oversized streamed body.
    Invalid header falls back to chunked reading which catches the overflow (413).
    """
    monkeypatch.setattr(type(settings), "max_upload_size_bytes", property(lambda self: 500))
    headers = {**auth_tokens["admin_a"]["headers"], "Content-Length": "not-a-number"}

    oversized_body = b"B" * 1200
    res = client.post(
        "/upload",
        files={"file": ("invalid_cl.txt", io.BytesIO(oversized_body), "text/plain")},
        headers=headers
    )
    assert res.status_code == 413
    assert "File too large" in res.json()["detail"]


def test_upload_negative_content_length_oversized_streamed(client: TestClient, auth_tokens, monkeypatch):
    """Negative Content-Length header falls through safely to chunked reading."""
    monkeypatch.setattr(type(settings), "max_upload_size_bytes", property(lambda self: 500))
    headers = {**auth_tokens["admin_a"]["headers"], "Content-Length": "-100"}

    oversized_body = b"C" * 1200
    res = client.post(
        "/upload",
        files={"file": ("neg_cl.txt", io.BytesIO(oversized_body), "text/plain")},
        headers=headers
    )
    assert res.status_code == 413
    assert "File too large" in res.json()["detail"]


def test_upload_content_length_exactly_equal_to_limit(client: TestClient, auth_tokens, monkeypatch):
    """
    4. Content-Length exactly equal to limit is accepted by the size check.
    """
    limit = 256
    monkeypatch.setattr(type(settings), "max_upload_size_bytes", property(lambda self: limit))
    payload = b"Exact limit payload padding: " + b"Z" * (limit - 29)
    assert len(payload) == limit

    # Pass Content-Length header exactly equal to the configured limit
    headers = {**auth_tokens["admin_a"]["headers"], "Content-Length": str(limit)}
    res = client.post(
        "/upload",
        files={"file": ("exact_limit.txt", io.BytesIO(payload), "text/plain")},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "Uploaded"


def test_upload_empty_file_rejected(client: TestClient, auth_tokens):
    """
    5. Empty upload is rejected with 400 Bad Request.
    """
    headers = auth_tokens["admin_a"]["headers"]
    res = client.post(
        "/upload",
        files={"file": ("empty_file.txt", io.BytesIO(b""), "text/plain")},
        headers=headers
    )
    assert res.status_code == 400
    assert "empty file" in res.json()["detail"].lower()


def test_upload_normal_valid(client: TestClient, auth_tokens):
    """
    6. Normal valid upload succeeds with full metadata and processing.
    """
    headers = auth_tokens["admin_a"]["headers"]
    content = b"Safe compliance documentation content for memory test."
    res = client.post(
        "/upload",
        files={"file": ("normal_valid.txt", io.BytesIO(content), "text/plain")},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Uploaded"
    assert "file_id" in data


def test_upload_content_length_smaller_than_actual_body_detected(client: TestClient, auth_tokens, monkeypatch):
    """
    7. Content-Length smaller than actual body.
    Header is under the limit, but actual body exceeds limit.
    Incremental reader must detect real size and reject with 413.
    """
    monkeypatch.setattr(type(settings), "max_upload_size_bytes", property(lambda self: 500))
    # Client lies and claims body is only 100 bytes
    headers = {**auth_tokens["admin_a"]["headers"], "Content-Length": "100"}
    actual_body = b"X" * 1500  # Actually 1500 bytes (> 500 limit)

    res = client.post(
        "/upload",
        files={"file": ("spoofed_cl.txt", io.BytesIO(actual_body), "text/plain")},
        headers=headers
    )
    assert res.status_code == 413
    assert "File too large" in res.json()["detail"]


def test_upload_content_length_larger_than_actual_body_accepted(client: TestClient, auth_tokens, monkeypatch):
    """
    8. Content-Length larger than actual body, but still within limit.
    Must NOT be rejected merely because the body is smaller than the header.
    """
    monkeypatch.setattr(type(settings), "max_upload_size_bytes", property(lambda self: 1000))
    # Header says 800 (valid <= 1000), body is actually only 200
    headers = {**auth_tokens["admin_a"]["headers"], "Content-Length": "800"}
    actual_body = b"Short body content within limits."

    res = client.post(
        "/upload",
        files={"file": ("larger_cl.txt", io.BytesIO(actual_body), "text/plain")},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "Uploaded"
