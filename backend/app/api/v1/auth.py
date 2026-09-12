"""
Authentication routes: /register and /login.
Supports both form-data (standard OAuth2) and JSON bodies.
"""
from fastapi import APIRouter, Form, Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.limiter import limiter
from app.services.auth_service import AuthService
from app.schemas.auth import TokenResponse, RegisterRequest

router = APIRouter(tags=["Authentication"])

@router.post("/register")
@limiter.limit("3/minute")
async def register(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    company: str = Form(""),
    invite_code: str = Form(""),
    role: str = Form("employee"),
    admin_secret: str = Form("")
):
    """Registers a new user and bounds them to their company tenant."""
    return AuthService.register(
        username=username,
        password=password,
        company=company,
        invite_code=invite_code,
        role=role,
        admin_secret=admin_secret
    )

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Authenticates username and password, issuing a signed JWT bearer token."""
    return AuthService.login(
        username=form_data.username,
        plain_password=form_data.password
    )

