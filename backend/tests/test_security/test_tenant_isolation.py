"""
Security tests verifying tenant isolation and preventing Insecure Direct Object References (IDOR).
"""
import io
import uuid
from fastapi.testclient import TestClient

def test_tenant_cross_access_idor_prevention(client: TestClient, auth_tokens):
    headers_a = auth_tokens["admin_a"]["headers"]
    headers_b = auth_tokens["admin_b"]["headers"]
    uid = uuid.uuid4().hex[:6]

    # 1. Tenant A uploads a confidential file
    secret_payload = f"Tenant A confidential strategy document {uid}.".encode('utf-8')
    up_res = client.post(
        "/upload",
        files={"file": (f"confidential_{uid}.txt", io.BytesIO(secret_payload), "text/plain")},
        headers=headers_a
    )
    assert up_res.status_code == 200
    file_id_a = up_res.json()["file_id"]

    # 2. Tenant B attempts to download Tenant A's file -> MUST BE 404
    dl_res = client.get(f"/files/download/{file_id_a}", headers=headers_b)
    assert dl_res.status_code == 404, "CRITICAL IDOR: Cross-tenant file download permitted!"

    # 3. Tenant B attempts to read extracted text of Tenant A's file -> MUST BE 404
    text_res = client.get(f"/files/text/{file_id_a}", headers=headers_b)
    assert text_res.status_code == 404, "CRITICAL IDOR: Cross-tenant text extraction permitted!"

    # 4. Tenant B attempts to fetch summary of Tenant A's file -> MUST BE 404
    sum_res = client.get(f"/files/summary/{file_id_a}", headers=headers_b)
    assert sum_res.status_code == 404, "CRITICAL IDOR: Cross-tenant file summary permitted!"

    # 5. Tenant B attempts to delete Tenant A's file -> MUST BE 404
    del_res = client.delete(f"/files/{file_id_a}", headers=headers_b)
    assert del_res.status_code == 404, "CRITICAL IDOR: Cross-tenant file deletion permitted!"

    # 6. Tenant B file listing must NOT contain Tenant A's file
    list_b = client.get("/files", headers=headers_b)
    assert list_b.status_code == 200
    b_ids = [f["_id"] for f in list_b.json()]
    assert file_id_a not in b_ids, "Tenant B file listing contains Tenant A files!"


def test_cross_tenant_audit_log_isolation(client: TestClient, auth_tokens):
    """Tenant B admin must NOT see Tenant A's audit log entries."""
    headers_a = auth_tokens["admin_a"]["headers"]
    headers_b = auth_tokens["admin_b"]["headers"]
    company_a = auth_tokens["admin_a"]["company"]

    # Tenant A performs an action that generates an audit log
    uid = uuid.uuid4().hex[:6]
    client.post(
        "/upload",
        files={"file": (f"audit_test_{uid}.txt", io.BytesIO(f"audit test {uid}".encode()), "text/plain")},
        headers=headers_a
    )

    # Tenant B reads their audit logs
    logs_b = client.get("/admin/logs", headers=headers_b)
    assert logs_b.status_code == 200
    data = logs_b.json()
    items = data.get("items", data) if isinstance(data, dict) else data
    for log_entry in items:
        assert log_entry.get("company") != company_a, \
            "CRITICAL IDOR: Tenant B can see Tenant A's audit logs!"


def test_cross_tenant_user_listing_isolation(client: TestClient, auth_tokens):
    """Tenant B admin must NOT see Tenant A's users."""
    headers_a = auth_tokens["admin_a"]["headers"]
    headers_b = auth_tokens["admin_b"]["headers"]
    username_a = auth_tokens["admin_a"]["username"]

    users_b = client.get("/admin/users", headers=headers_b)
    assert users_b.status_code == 200
    b_usernames = [u.get("username") for u in users_b.json()]
    assert username_a not in b_usernames, \
        "CRITICAL IDOR: Tenant B user listing contains Tenant A users!"


def test_cross_tenant_dashboard_isolation(client: TestClient, auth_tokens):
    """Tenant B dashboard must NOT reflect Tenant A's file activity."""
    headers_a = auth_tokens["admin_a"]["headers"]
    headers_b = auth_tokens["admin_b"]["headers"]

    # Upload files as Tenant A to inflate their stats
    uid = uuid.uuid4().hex[:6]
    for i in range(3):
        client.post(
            "/upload",
            files={"file": (f"dash_{uid}_{i}.txt", io.BytesIO(f"dashboard test {uid} {i}".encode()), "text/plain")},
            headers=headers_a
        )

    # Tenant B dashboard must NOT count Tenant A's files
    dash_a = client.get("/dashboard/stats", headers=headers_a)
    dash_b = client.get("/dashboard/stats", headers=headers_b)
    assert dash_a.status_code == 200
    assert dash_b.status_code == 200

    # Tenant B should have fewer or equal files (never more than Tenant A if Tenant A uploaded)
    # The key assertion: the counts are independent
    assert dash_b.json()["total_files"] != dash_a.json()["total_files"] or \
           dash_b.json()["total_files"] == 0, \
        "Dashboard stats may be leaking cross-tenant data!"


def test_cross_tenant_settings_isolation(client: TestClient, auth_tokens):
    """Tenant B settings must be independent of Tenant A."""
    headers_a = auth_tokens["admin_a"]["headers"]
    headers_b = auth_tokens["admin_b"]["headers"]

    # Tenant A updates settings
    client.post(
        "/admin/settings",
        json={"webhook_url": "https://hooks.example.com/tenant-a-only"},
        headers=headers_a
    )

    # Tenant B reads settings — must NOT see Tenant A's webhook
    settings_b = client.get("/admin/settings", headers=headers_b)
    assert settings_b.status_code == 200
    b_data = settings_b.json()
    webhook = b_data.get("webhook_url", "")
    assert "tenant-a-only" not in webhook, \
        "CRITICAL IDOR: Tenant B settings reflect Tenant A's webhook!"


def test_cross_tenant_quarantine_remediation_blocked(client: TestClient, auth_tokens):
    """Tenant B admin must NOT be able to remediate Tenant A's quarantined files."""
    headers_a = auth_tokens["admin_a"]["headers"]
    headers_b = auth_tokens["admin_b"]["headers"]

    # Upload a file with sensitive content as Tenant A
    uid = uuid.uuid4().hex[:6]
    sensitive_payload = f"Payment card: 4111111111111111 expiry {uid}".encode('utf-8')
    up_res = client.post(
        "/upload",
        files={"file": (f"sensitive_{uid}.txt", io.BytesIO(sensitive_payload), "text/plain")},
        headers=headers_a
    )
    assert up_res.status_code == 200
    file_id_a = up_res.json()["file_id"]

    # Tenant B attempts to approve Tenant A's quarantined file
    remediate_res = client.post(
        "/admin/quarantine/remediate",
        json={"file_id": file_id_a, "action": "approve"},
        headers=headers_b
    )
    assert remediate_res.status_code == 404, \
        "CRITICAL IDOR: Tenant B can remediate Tenant A's quarantined files!"
