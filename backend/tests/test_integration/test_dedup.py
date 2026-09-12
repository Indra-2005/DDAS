"""
Integration tests for exact and near-duplicate deduplication.
"""
import io
import uuid
from fastapi.testclient import TestClient

def test_exact_deduplication_same_tenant(client: TestClient, auth_tokens):
    headers_a = auth_tokens["admin_a"]["headers"]
    uid = uuid.uuid4().hex[:6]

    file_content = f"Deduplication test data unique content {uid}.".encode('utf-8')
    filename = f"dedup_test_{uid}.txt"

    # First upload: original
    res1 = client.post(
        "/upload",
        files={"file": (filename, io.BytesIO(file_content), "text/plain")},
        headers=headers_a
    )
    assert res1.status_code == 200
    assert res1.json()["is_duplicate"] is False

    # Second upload: duplicate
    res2 = client.post(
        "/upload",
        files={"file": (f"copy_{filename}", io.BytesIO(file_content), "text/plain")},
        headers=headers_a
    )
    assert res2.status_code == 200
    assert res2.json()["is_duplicate"] is True

def test_near_duplicate_detection(client: TestClient, auth_tokens):
    headers_a = auth_tokens["admin_a"]["headers"]
    uid = uuid.uuid4().hex[:6]

    text_original = (
        f"Data Download Duplication Alert System monitors sensitive files and alerts admins {uid}. "
        "It provides compliance, security audit, and deterministic cryptographic deduplication algorithms."
    )
    text_near = (
        f"Data Download Duplication Alert System monitors sensitive files and alerts administrators {uid}. "
        "It provides compliance, security audit, and deterministic cryptographic deduplication algorithms."
    )

    # Upload original
    res1 = client.post(
        "/upload",
        files={"file": (f"orig_{uid}.txt", io.BytesIO(text_original.encode('utf-8')), "text/plain")},
        headers=headers_a
    )
    assert res1.status_code == 200

    # Upload near-duplicate
    res2 = client.post(
        "/upload",
        files={"file": (f"near_{uid}.txt", io.BytesIO(text_near.encode('utf-8')), "text/plain")},
        headers=headers_a
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_near_duplicate"] is True
    assert data2["similarity_score"] >= 80.0
