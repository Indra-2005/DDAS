"""
Integration tests for file upload, listing, downloading, text extraction, and deletion.
"""
import io
import uuid
from fastapi.testclient import TestClient

def test_file_upload_download_delete_lifecycle(client: TestClient, auth_tokens):
    headers_a = auth_tokens["admin_a"]["headers"]
    uid = uuid.uuid4().hex[:6]

    file_content = f"Quarterly audit report for internal review {uid}.".encode('utf-8')
    filename = f"audit_report_{uid}.txt"

    # 1. Upload file
    upload_res = client.post(
        "/upload",
        files={"file": (filename, io.BytesIO(file_content), "text/plain")},
        headers=headers_a
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["status"] == "Uploaded"
    assert upload_data["is_duplicate"] is False
    file_id = upload_data["file_id"]
    assert file_id is not None

    # 2. List files
    list_res = client.get("/files", headers=headers_a)
    assert list_res.status_code == 200
    files = list_res.json()
    assert any(f["_id"] == file_id for f in files)

    # 3. Get file text for diff
    text_res = client.get(f"/files/text/{file_id}", headers=headers_a)
    assert text_res.status_code == 200
    assert file_content.decode('utf-8') in text_res.json()["text"]

    # 4. Get deterministic summary
    sum_res = client.get(f"/files/summary/{file_id}", headers=headers_a)
    assert sum_res.status_code == 200
    assert "Deterministic Security Summary" in sum_res.json()["summary"]

    # 5. Download file (verifies AES-256-GCM decrypt on the fly)
    dl_res = client.get(f"/files/download/{file_id}", headers=headers_a)
    assert dl_res.status_code == 200
    assert dl_res.content == file_content

    # 6. Delete file
    del_res = client.delete(f"/files/{file_id}", headers=headers_a)
    assert del_res.status_code == 200

    # 7. Confirm deleted
    post_dl = client.get(f"/files/download/{file_id}", headers=headers_a)
    assert post_dl.status_code == 404
