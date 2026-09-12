"""
Security tests for malicious uploads, path traversal, and prohibited extensions.
"""
import io
from fastapi.testclient import TestClient

def test_executable_extension_rejected(client: TestClient, auth_tokens):
    headers = auth_tokens["admin_a"]["headers"]

    # Uploading .exe file must be rejected
    res = client.post(
        "/upload",
        files={"file": ("malware.exe", io.BytesIO(b"MZ\x90\x00executable binary payload"), "application/octet-stream")},
        headers=headers
    )
    assert res.status_code == 400
    detail = res.json()["detail"].lower()
    assert "prohibited" in detail or "not permitted" in detail

def test_empty_file_rejected(client: TestClient, auth_tokens):
    headers = auth_tokens["admin_a"]["headers"]

    res = client.post(
        "/upload",
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
        headers=headers
    )
    assert res.status_code == 400
    assert "empty file" in res.json()["detail"].lower()

def test_path_traversal_filename_sanitized(client: TestClient, auth_tokens):
    headers = auth_tokens["admin_a"]["headers"]

    res = client.post(
        "/upload",
        files={"file": ("../../../../sensitive_file.txt", io.BytesIO(b"Sample safe text content"), "text/plain")},
        headers=headers
    )
    assert res.status_code == 200
    file_id = res.json()["file_id"]

    # Retrieve file info from list
    list_res = client.get("/files", headers=headers)
    assert list_res.status_code == 200
    uploaded_doc = [f for f in list_res.json() if f["_id"] == file_id][0]
    # Filename must NOT contain path traversal characters
    assert "../" not in uploaded_doc["filename"]
    assert uploaded_doc["filename"] == "sensitive_file.txt"
