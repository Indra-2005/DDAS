"""
Unit tests for SHA-256 hashing, filename sanitization, and safe ObjectId parsing.
"""
import pytest
from bson import ObjectId
from fastapi import HTTPException
from app.algorithms.hashing import sha256_bytes, sanitize_filename, safe_object_id

def test_sha256_bytes():
    data = b"Hello DDAS World"
    # echo -n "Hello DDAS World" | sha256sum -> e.g. deterministic check
    h = sha256_bytes(data)
    assert len(h) == 64
    assert h == sha256_bytes(data)
    assert h != sha256_bytes(b"Different content")

def test_sanitize_filename_traversal():
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("foo/../../bar.txt") == "bar.txt"

def test_sanitize_filename_null_bytes():
    assert sanitize_filename("safe_file\x00.exe.txt") == "safe_file.exe.txt"

def test_sanitize_filename_control_chars():
    assert sanitize_filename("report\r\n\t.pdf") == "report.pdf"

def test_sanitize_filename_empty_fallback():
    assert sanitize_filename("") == "unnamed_file"
    assert sanitize_filename("   ") == "unnamed_file"

def test_sanitize_filename_length_cap():
    long_name = "a" * 300 + ".txt"
    sanitized = sanitize_filename(long_name)
    assert len(sanitized) <= 255
    assert sanitized.endswith(".txt")

def test_safe_object_id_valid():
    oid_str = str(ObjectId())
    parsed = safe_object_id(oid_str)
    assert isinstance(parsed, ObjectId)
    assert str(parsed) == oid_str

def test_safe_object_id_invalid():
    with pytest.raises(HTTPException) as exc_info:
        safe_object_id("not-a-valid-oid")
    assert exc_info.value.status_code == 404
