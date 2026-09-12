"""
Authentication schemas for registration, login, and token transport.
"""
from typing import Optional
from pydantic import BaseModel, Field

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    company: str

class TokenPayload(BaseModel):
    sub: str
    exp: int

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    company: Optional[str] = Field(default="")
    invite_code: Optional[str] = Field(default="")
    role: Optional[str] = Field(default="employee")
    admin_secret: Optional[str] = Field(default="")

class LoginRequest(BaseModel):
    username: str
    password: str
