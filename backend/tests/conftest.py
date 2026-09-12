"""
Pytest configuration and shared fixtures for DDAS test suite.
"""
import os
import sys
import uuid
import pytest

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token, get_password_hash, UserRole
from app.db.database import db, users_collection, files_collection, companies_collection, blobs_collection

@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient session with rate limiting disabled for testing."""
    app.state.limiter.enabled = False
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def test_tenants():
    """Unique tenant identifiers for testing."""
    uid = uuid.uuid4().hex[:6]
    tenant_a = f"TestTenantA_{uid}"
    tenant_b = f"TestTenantB_{uid}"

    # Seed test companies
    companies_collection.insert_many([
        {"name": tenant_a, "invite_code": f"INV_A_{uid}"},
        {"name": tenant_b, "invite_code": f"INV_B_{uid}"}
    ])

    yield {"tenant_a": tenant_a, "tenant_b": tenant_b, "uid": uid}

    # Cleanup after session
    companies_collection.delete_many({"name": {"$in": [tenant_a, tenant_b]}})
    users_collection.delete_many({"company": {"$in": [tenant_a, tenant_b]}})
    files_collection.delete_many({"company": {"$in": [tenant_a, tenant_b]}})

@pytest.fixture(scope="session")
def auth_tokens(test_tenants):
    """Generates valid JWT tokens for test users across tenants."""
    ta = test_tenants["tenant_a"]
    tb = test_tenants["tenant_b"]
    uid = test_tenants["uid"]

    admin_a_user = f"admin_a_{uid}"
    user_a_user = f"user_a_{uid}"
    admin_b_user = f"admin_b_{uid}"

    pw_hash = get_password_hash("TestPassword123!")

    users_collection.insert_many([
        {"username": admin_a_user, "password": pw_hash, "role": UserRole.ADMIN.value, "company": ta},
        {"username": user_a_user, "password": pw_hash, "role": UserRole.EMPLOYEE.value, "company": ta},
        {"username": admin_b_user, "password": pw_hash, "role": UserRole.ADMIN.value, "company": tb}
    ])

    token_admin_a = create_access_token({"sub": admin_a_user})
    token_user_a = create_access_token({"sub": user_a_user})
    token_admin_b = create_access_token({"sub": admin_b_user})

    return {
        "admin_a": {"username": admin_a_user, "company": ta, "headers": {"Authorization": f"Bearer {token_admin_a}"}},
        "user_a": {"username": user_a_user, "company": ta, "headers": {"Authorization": f"Bearer {token_user_a}"}},
        "admin_b": {"username": admin_b_user, "company": tb, "headers": {"Authorization": f"Bearer {token_admin_b}"}}
    }
