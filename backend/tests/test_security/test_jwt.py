"""
Security tests for JWT authentication, tampered tokens, and missing credentials.
"""
from datetime import timedelta
from fastapi.testclient import TestClient
from app.core.security import create_access_token

def test_missing_token_returns_401(client: TestClient):
    res = client.get("/files")
    assert res.status_code == 401

def test_tampered_token_returns_401(client: TestClient):
    valid_token = create_access_token({"sub": "someuser"})
    tampered = valid_token[:-4] + "fake"
    res = client.get("/files", headers={"Authorization": f"Bearer {tampered}"})
    assert res.status_code == 401

def test_expired_token_returns_401(client: TestClient):
    # Expired token with negative delta
    expired_token = create_access_token({"sub": "someuser"}, expires_delta=timedelta(seconds=-60))
    res = client.get("/files", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
