"""
Integration tests for registration, authentication, token issuance, and password management.
"""
import uuid
from fastapi.testclient import TestClient

def test_register_and_login_flow(client: TestClient, test_tenants):
    uid = uuid.uuid4().hex[:6]
    ta = test_tenants["tenant_a"]

    # 1. Register employee using valid invite code
    invite_code = f"INV_A_{test_tenants['uid']}"
    reg_res = client.post("/register", data={
        "username": f"user_reg_{uid}",
        "password": "Password123!",
        "company": ta,
        "invite_code": invite_code,
        "role": "employee"
    })
    assert reg_res.status_code == 200
    assert "User created successfully" in reg_res.json()["msg"]

    # 2. Login with newly created user
    login_res = client.post("/login", data={
        "username": f"user_reg_{uid}",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["company"] == ta
    assert token_data["role"] == "employee"

    # 3. Access profile /users/me
    token = token_data["access_token"]
    me_res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == f"user_reg_{uid}"
    assert me_data["company"] == ta

def test_login_invalid_credentials(client: TestClient):
    res = client.post("/login", data={
        "username": "non_existent_user_999",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    assert "Incorrect username or password" in res.json()["detail"]
