"""
Production readiness regression tests verifying:
1. super_admin RBAC permissions (file deletion & quarantined file download)
2. Employee authorization boundary enforcement
3. Cross-tenant quarantine remediation IDOR prevention (404)
4. StorageService.cleanup_stale_temp_files lifecycle safety
5. MongoDB aggregation for /users/me storage metrics and tenant isolation
"""
import io
import os
import time
import uuid
import pytest
from fastapi.testclient import TestClient
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, UserRole
from app.db.database import users_collection, files_collection
from app.services.storage_service import StorageService


@pytest.fixture(scope="module")
def super_admin_token(test_tenants):
    """Creates a temporary super_admin user within Tenant A."""
    company = test_tenants["tenant_a"]
    uid = uuid.uuid4().hex[:6]
    username = f"superadmin_{uid}"
    pw_hash = get_password_hash("SuperAdminSecret123!")

    users_collection.insert_one({
        "username": username,
        "password": pw_hash,
        "role": UserRole.SUPER_ADMIN.value,
        "company": company
    })

    token = create_access_token({"sub": username})
    yield {
        "username": username,
        "company": company,
        "headers": {"Authorization": f"Bearer {token}"}
    }

    users_collection.delete_one({"username": username})


def test_super_admin_can_delete_employee_file_in_same_tenant(client: TestClient, auth_tokens, super_admin_token):
    """F1: super_admin must be authorized to delete an employee-owned file within the same tenant."""
    headers_emp = auth_tokens["user_a"]["headers"]
    headers_super = super_admin_token["headers"]
    uid = uuid.uuid4().hex[:6]

    # Employee uploads file
    up_res = client.post(
        "/upload",
        files={"file": (f"emp_file_{uid}.txt", io.BytesIO(f"Employee file content {uid}".encode()), "text/plain")},
        headers=headers_emp
    )
    assert up_res.status_code == 200
    file_id = up_res.json()["file_id"]

    # super_admin deletes employee's file
    del_res = client.delete(f"/files/{file_id}", headers=headers_super)
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json().get("msg", "")

    # Confirm file is gone from tenant
    get_res = client.get(f"/files/text/{file_id}", headers=headers_super)
    assert get_res.status_code == 404


def test_super_admin_can_download_quarantined_file(client: TestClient, auth_tokens, super_admin_token):
    """F1: super_admin must be authorized to download quarantined files, while employees are forbidden."""
    headers_emp = auth_tokens["user_a"]["headers"]
    headers_super = super_admin_token["headers"]
    uid = uuid.uuid4().hex[:6]

    # Upload file with sensitive credit card data -> triggers quarantine
    secret_text = f"Customer card number: 4111111111111111 uid: {uid}"
    up_res = client.post(
        "/upload",
        files={"file": (f"quarantine_doc_{uid}.txt", io.BytesIO(secret_text.encode()), "text/plain")},
        headers=headers_emp
    )
    assert up_res.status_code == 200
    file_id = up_res.json()["file_id"]
    assert up_res.json()["quarantined"] is True

    # Employee download must be blocked with HTTP 403 Forbidden
    emp_dl = client.get(f"/files/download/{file_id}", headers=headers_emp)
    assert emp_dl.status_code == 403

    # super_admin download must succeed with HTTP 200 OK
    super_dl = client.get(f"/files/download/{file_id}", headers=headers_super)
    assert super_dl.status_code == 200
    assert secret_text.encode() in super_dl.content


def test_employee_cannot_delete_other_user_file(client: TestClient, auth_tokens):
    """Employee must NOT obtain admin deletion privileges over other users' files."""
    headers_admin = auth_tokens["admin_a"]["headers"]
    headers_emp = auth_tokens["user_a"]["headers"]
    uid = uuid.uuid4().hex[:6]

    # Admin A uploads a file
    up_res = client.post(
        "/upload",
        files={"file": (f"admin_file_{uid}.txt", io.BytesIO(f"Admin private file {uid}".encode()), "text/plain")},
        headers=headers_admin
    )
    assert up_res.status_code == 200
    file_id = up_res.json()["file_id"]

    # Employee attempts to delete Admin's file -> 403 Forbidden
    del_res = client.delete(f"/files/{file_id}", headers=headers_emp)
    assert del_res.status_code == 403
    assert "Unauthorized" in del_res.json().get("detail", "")


def test_tenant_b_admin_cannot_remediate_tenant_a_quarantined_file(client: TestClient, auth_tokens):
    """Tenant B admin cannot remediate (approve, redact) Tenant A's quarantined file (must return 404)."""
    headers_a = auth_tokens["admin_a"]["headers"]
    headers_b = auth_tokens["admin_b"]["headers"]
    uid = uuid.uuid4().hex[:6]

    # Tenant A uploads a quarantined file
    up_res = client.post(
        "/upload",
        files={"file": (f"quarantine_a_{uid}.txt", io.BytesIO(f"Credit card: 4111111111111111 {uid}".encode()), "text/plain")},
        headers=headers_a
    )
    assert up_res.status_code == 200
    file_id_a = up_res.json()["file_id"]

    # Tenant B admin attempts to approve Tenant A's file -> 404
    approve_res = client.post(
        "/admin/quarantine/remediate",
        json={"file_id": file_id_a, "action": "approve"},
        headers=headers_b
    )
    assert approve_res.status_code == 404

    # Tenant B admin attempts to redact Tenant A's file -> 404
    redact_res = client.post(
        "/admin/quarantine/remediate",
        json={"file_id": file_id_a, "action": "redact"},
        headers=headers_b
    )
    assert redact_res.status_code == 404


def test_stale_temp_files_cleanup(tmp_path, monkeypatch):
    """F4: Verify stale .tmp_* and .dl_spool_* files are deleted while fresh files and legitimate blobs remain."""
    storage_dir = str(tmp_path / "test_storage")
    os.makedirs(storage_dir, exist_ok=True)
    monkeypatch.setattr(settings, "STORAGE_DIR", storage_dir)

    now = time.time()
    stale_time = now - 7200  # 2 hours ago (exceeds default 3600s)

    # 1. Create stale .tmp_ file
    stale_tmp = os.path.join(storage_dir, ".tmp_upload_123_stale")
    with open(stale_tmp, "wb") as f:
        f.write(b"stale temp data")
    os.utime(stale_tmp, (stale_time, stale_time))

    # 2. Create stale .dl_spool_ file
    stale_spool = os.path.join(storage_dir, ".dl_spool_download_456_stale")
    with open(stale_spool, "wb") as f:
        f.write(b"stale spool data")
    os.utime(stale_spool, (stale_time, stale_time))

    # 3. Create fresh .tmp_ file (active write)
    fresh_tmp = os.path.join(storage_dir, ".tmp_upload_fresh_789")
    with open(fresh_tmp, "wb") as f:
        f.write(b"fresh temp data")

    # 4. Create legitimate storage blob (even if old, must never be deleted)
    legit_blob = os.path.join(storage_dir, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    with open(legit_blob, "wb") as f:
        f.write(b"valid encrypted storage blob")
    os.utime(legit_blob, (stale_time, stale_time))

    # Run cleanup with max_age_seconds=3600
    removed = StorageService.cleanup_stale_temp_files(max_age_seconds=3600)

    assert removed == 2
    assert not os.path.exists(stale_tmp), "Stale .tmp_ file was not cleaned!"
    assert not os.path.exists(stale_spool), "Stale .dl_spool_ file was not cleaned!"
    assert os.path.exists(fresh_tmp), "Fresh .tmp_ file was improperly deleted!"
    assert os.path.exists(legit_blob), "Legitimate storage blob was improperly deleted!"


def test_missing_storage_dir_cleanup_handled_safely(monkeypatch):
    """F4: Missing storage directory must be handled gracefully without raising exceptions."""
    non_existent = os.path.join(os.getcwd(), "non_existent_dir_xyz_12345")
    monkeypatch.setattr(settings, "STORAGE_DIR", non_existent)
    # Ensure it returns 0 without crashing
    assert StorageService.cleanup_stale_temp_files() == 0


def test_users_me_storage_aggregation_accuracy(client: TestClient, auth_tokens):
    """F3: /users/me aggregation accurately computes storage bytes in O(1) memory and isolates totals."""
    headers_emp = auth_tokens["user_a"]["headers"]
    username_emp = auth_tokens["user_a"]["username"]
    company = auth_tokens["user_a"]["company"]
    uid = uuid.uuid4().hex[:6]

    # Baseline before test
    pre_me = client.get("/users/me", headers=headers_emp).json()
    pre_bytes = pre_me["storage_used_bytes"]

    payload1 = f"File 1 content with unique id {uid}".encode()
    payload2 = f"File 2 content with different content {uid}".encode()

    client.post("/upload", files={"file": (f"user_file1_{uid}.txt", io.BytesIO(payload1), "text/plain")}, headers=headers_emp)
    client.post("/upload", files={"file": (f"user_file2_{uid}.txt", io.BytesIO(payload2), "text/plain")}, headers=headers_emp)

    # Inspect /users/me
    post_me = client.get("/users/me", headers=headers_emp).json()
    expected_added = len(payload1) + len(payload2)
    assert post_me["storage_used_bytes"] == pre_bytes + expected_added
    assert "B" in post_me["storage_used"] or "KB" in post_me["storage_used"]

    # Verify admin_a's /users/me is unaffected
    admin_me = client.get("/users/me", headers=auth_tokens["admin_a"]["headers"]).json()
    # admin_a didn't upload these files, so admin's storage does not include them
    admin_files = list(files_collection.find({"owner": auth_tokens["admin_a"]["username"], "company": company}))
    expected_admin_bytes = sum(f.get("size", 0) for f in admin_files)
    assert admin_me["storage_used_bytes"] == expected_admin_bytes
