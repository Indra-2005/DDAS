"""
User data schemas for profile views and user management.
"""
from typing import Optional
from pydantic import BaseModel, Field

class UserOut(BaseModel):
    username: str
    role: str
    company: str
    originals: Optional[int] = 0
    duplicates: Optional[int] = 0
    joined_at: Optional[str] = None

class UserProfileResponse(BaseModel):
    username: str
    role: str
    company: str
    originals: int
    duplicates: int
    storage_used: str
    storage_used_bytes: int

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)

class ResetPasswordRequest(BaseModel):
    username: str
    new_password: str = Field(..., min_length=6)
