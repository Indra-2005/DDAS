"""
FastAPI dependency injection: JWT authentication, tenant isolation, and RBAC enforcement.
"""
from typing import Dict, Any, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_access_token, UserRole
from app.db.database import users_collection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    Validates JWT token and fetches user document from database.
    Guarantees user exists and derives company tenant directly from database.
    """
    payload = decode_access_token(token)
    username: str = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Convert ObjectId to string
    user["_id"] = str(user["_id"])
    # Ensure role is normalized
    user["role"] = UserRole.normalize(user.get("role", "employee"))
    # Ensure company string is present
    user["company"] = user.get("company", "").strip()

    return user

def require_role(allowed_roles: List[str]):
    """
    RBAC dependency factory. Ensures the current user possesses one of the allowed roles.
    """
    normalized_allowed = [UserRole.normalize(r) for r in allowed_roles]

    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "employee")
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: insufficient role permissions"
            )
        return current_user

    return role_checker

async def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Requires tenant admin or super admin privilege."""
    if current_user.get("role") not in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required"
        )
    return current_user

async def get_tenant_company(current_user: Dict[str, Any] = Depends(get_current_user)) -> str:
    """Extracts and verifies current user's tenant company identifier."""
    company = current_user.get("company", "").strip()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not bound to a valid tenant organization"
        )
    return company
