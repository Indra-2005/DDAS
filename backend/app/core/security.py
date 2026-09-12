"""
Security primitives: password hashing, JWT operations, and role definitions.
"""
from enum import Enum
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException, status
from app.core.config import settings

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    EMPLOYEE = "employee"
    AUDITOR = "auditor"

    @classmethod
    def normalize(cls, role_str: str) -> str:
        s = role_str.strip().lower()
        if s in ("admin", "tenant_admin"):
            return cls.ADMIN.value
        elif s in ("super_admin", "superadmin"):
            return cls.SUPER_ADMIN.value
        elif s in ("auditor",):
            return cls.AUDITOR.value
        return cls.EMPLOYEE.value


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against its bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generates a bcrypt hash of the given password."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT with expiration in UTC."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT token. Raises HTTPException on error."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

def generate_invite_code(length: int = 8) -> str:
    """Generates a cryptographically random invite code."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))
