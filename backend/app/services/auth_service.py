"""
Authentication and identity management service.
"""
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.file_repository import FileRepository
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    UserRole,
    generate_invite_code
)
from app.core.config import settings

class AuthService:
    @staticmethod
    def register(
        username: str,
        password: str,
        company: str = "",
        invite_code: str = "",
        role: str = "employee",
        admin_secret: str = ""
    ) -> Dict[str, str]:
        """Registers a new user and ensures proper company tenant association."""
        if UserRepository.find_by_username(username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )

        final_role = UserRole.EMPLOYEE.value
        target_company = company.strip()

        if role == "admin":
            if not settings.ADMIN_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin registration is disabled. ADMIN_SECRET not configured."
                )
            if admin_secret == settings.ADMIN_SECRET:
                final_role = UserRole.ADMIN.value
                if not target_company:
                    target_company = f"{username}'s Organization"
                # If company doesn't exist, create it with new invite code
                if not UserRepository.get_company_by_name(target_company):
                    inv = generate_invite_code()
                    UserRepository.insert_company(target_company, inv)
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid Admin Secret key"
                )
        else:
            # Employee registration requires valid invite code
            if not invite_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invite code is required for employee registration"
                )
            comp_record = UserRepository.get_company_by_invite(invite_code)
            if not comp_record:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired invite code"
                )
            target_company = comp_record["name"]

        user_doc = {
            "username": username,
            "password": get_password_hash(password),
            "role": final_role,
            "company": target_company
        }
        UserRepository.insert_user(user_doc)

        AuditRepository.log(
            username=username,
            company=target_company,
            action="USER_REGISTER",
            details=f"User registered as {final_role}"
        )

        return {"msg": f"User created successfully as {final_role}"}

    @staticmethod
    def login(username: str, plain_password: str) -> Dict[str, Any]:
        """Authenticates credentials and returns JWT token."""
        user = UserRepository.find_by_username(username)
        if not user or not verify_password(plain_password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )

        company = user.get("company", "").strip()
        role = UserRole.normalize(user.get("role", "employee"))
        token = create_access_token(data={"sub": user["username"]})

        AuditRepository.log(
            username=username,
            company=company,
            action="USER_LOGIN",
            details="User logged in successfully"
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "role": role,
            "username": user["username"],
            "company": company
        }
