"""
Security tests for Role-Based Access Control (RBAC) enforcement.
"""
import io
import uuid
from fastapi.testclient import TestClient

def test_employee_forbidden_from_admin_endpoints(client: TestClient, auth_tokens):
    headers_emp = auth_tokens["user_a"]["headers"]

    # Employee tries to list all company users -> 403 Forbidden
    res = client.get("/admin/users", headers=headers_emp)
    assert res.status_code == 403

    # Employee tries to fetch invite code -> 403 Forbidden
    res = client.get("/admin/invite-code", headers=headers_emp)
    assert res.status_code == 403

    # Employee tries to access audit logs -> 403 Forbidden
    res = client.get("/admin/logs", headers=headers_emp)
    assert res.status_code == 403

def test_admin_allowed_access_to_admin_endpoints(client: TestClient, auth_tokens):
    headers_admin = auth_tokens["admin_a"]["headers"]

    res = client.get("/admin/users", headers=headers_admin)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    res = client.get("/admin/invite-code", headers=headers_admin)
    assert res.status_code == 200
    assert "invite_code" in res.json()

def test_employee_cannot_access_quarantine_listing(client: TestClient, auth_tokens):
    """Employees must NOT be able to list quarantined files."""
    headers_emp = auth_tokens["user_a"]["headers"]
    res = client.get("/admin/quarantined-files", headers=headers_emp)
    assert res.status_code == 403

def test_employee_cannot_remediate_quarantine(client: TestClient, auth_tokens):
    """Employees must NOT be able to approve/redact/purge quarantined files."""
    headers_admin = auth_tokens["admin_a"]["headers"]
    headers_emp = auth_tokens["user_a"]["headers"]

    # Upload a file with sensitive data as admin
    uid = uuid.uuid4().hex[:6]
    payload = f"Card number: 4111111111111111 confidential {uid}".encode('utf-8')
    up_res = client.post(
        "/upload",
        files={"file": (f"rbac_quarantine_{uid}.txt", io.BytesIO(payload), "text/plain")},
        headers=headers_admin
    )
    assert up_res.status_code == 200
    file_id = up_res.json()["file_id"]

    # Employee attempts to approve the quarantined file -> must be 403
    res = client.post(
        "/admin/quarantine/remediate",
        json={"file_id": file_id, "action": "approve"},
        headers=headers_emp
    )
    assert res.status_code == 403, "Employee should NOT be able to remediate quarantined files!"

def test_employee_cannot_access_settings(client: TestClient, auth_tokens):
    """Employees must NOT be able to read or modify company settings."""
    headers_emp = auth_tokens["user_a"]["headers"]

    res = client.get("/admin/settings", headers=headers_emp)
    assert res.status_code == 403

    res = client.post("/admin/settings", json={"webhook_url": "https://evil.com"}, headers=headers_emp)
    assert res.status_code == 403

