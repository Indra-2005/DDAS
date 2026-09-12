"""
Admin routes: user management, quarantine remediation, audit logs, and settings.
Protected by require_role(["admin", "super_admin"]).
"""
from typing import Dict, Any, List, Optional
import requests
import threading
from fastapi import APIRouter, Depends, HTTPException, Form, Query, Request, status
from app.core.dependencies import get_current_user, require_role
from app.core.security import get_password_hash
from app.repositories.user_repository import UserRepository
from app.repositories.file_repository import FileRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.settings_repository import SettingsRepository
from app.services.quarantine_service import QuarantineService
from app.services.file_service import FileService
from app.db.database import files_collection
from app.core.logging import logger

router = APIRouter(tags=["Admin"], dependencies=[Depends(require_role(["admin", "super_admin"]))])

@router.get("/users")
async def get_all_users(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Admin endpoint to list all users in the same company tenant."""
    company = current_user.get("company", "").strip()
    users = UserRepository.list_by_company(company)
    for u in users:
        u["originals"] = files_collection.count_documents({
            "owner": u["username"],
            "company": company,
            "is_duplicate": False
        })
        u["duplicates"] = files_collection.count_documents({
            "owner": u["username"],
            "company": company,
            "is_duplicate": True
        })
    return users

@router.get("/user-details/{username}")
async def get_user_details(username: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Admin endpoint to view detail metrics of a user."""
    company = current_user.get("company", "").strip()
    user_data = UserRepository.find_by_username_and_company(username, company)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    originals = files_collection.count_documents({
        "owner": username,
        "company": company,
        "is_duplicate": False
    })
    duplicates = files_collection.count_documents({
        "owner": username,
        "company": company,
        "is_duplicate": True
    })

    return {
        "username": username,
        "role": user_data.get("role", "employee"),
        "originals": originals,
        "duplicates": duplicates,
        "joined_at": str(user_data["_id"].generation_time if hasattr(user_data["_id"], "generation_time") else "")
    }

@router.post("/reset-password")
async def reset_password(
    username: str = Form(...),
    new_password: str = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Admin endpoint to reset a company user's password."""
    company = current_user.get("company", "").strip()
    success = UserRepository.reset_password_scoped(username, company, get_password_hash(new_password))
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    AuditRepository.log(
        username=current_user["username"],
        company=company,
        action="USER_PASSWORD_RESET",
        details=f"Admin reset password for {username}"
    )
    return {"msg": f"Password for {username} updated successfully"}

@router.delete("/users/{username}")
async def delete_user(username: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Admin endpoint to remove a company employee."""
    if username == current_user["username"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account")

    company = current_user.get("company", "").strip()
    success = UserRepository.delete_user_scoped(username, company)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    AuditRepository.log(
        username=current_user["username"],
        company=company,
        action="USER_DELETE",
        details=f"Terminated user {username}"
    )
    return {"msg": f"User {username} successfully removed"}

@router.get("/invite-code")
async def get_invite_code(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetch the onboarding invite code for the current company tenant."""
    company = current_user.get("company", "").strip()
    comp = UserRepository.get_company_by_name(company)
    if comp:
        return {"invite_code": comp.get("invite_code", "UNKNOWN")}
    return {"invite_code": "UNKNOWN"}

@router.get("/global-duplicates")
async def get_global_duplicates(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Deduplication overview. Scoped strictly to the tenant company."""
    company = current_user.get("company", "").strip()
    return FileRepository.get_duplicates_aggregation(company)

@router.get("/quarantined-files")
async def get_quarantined_files(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Fetch files currently under quarantine within this tenant."""
    company = current_user.get("company", "").strip()
    if page is not None:
        size = page_size or 50
        items, total = FileRepository.get_quarantined_scoped(company, skip=(page - 1) * size, limit=size)
        total_pages = (total + size - 1) // size if size else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": size,
            "total_pages": total_pages
        }
    items, _ = FileRepository.get_quarantined_scoped(company, skip=0, limit=100)
    return items

@router.post("/quarantine/remediate")
async def remediate_quarantine(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Remediates a quarantined file via approve, purge, or redact action. Supports JSON and Form bodies."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            body = {}
        file_id = body.get("file_id")
        action = body.get("action")
    else:
        try:
            form = await request.form()
        except Exception:
            form = {}
        file_id = form.get("file_id")
        action = form.get("action")

    if not file_id or not action:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="file_id and action are required")

    company = current_user.get("company", "").strip()
    username = current_user["username"]

    action_norm = str(action).strip().lower()
    if action_norm == "approve":
        return QuarantineService.approve(str(file_id), company, username)
    elif action_norm == "purge":
        await FileService.delete_file(str(file_id), current_user)
        return {"msg": "File purged successfully."}
    elif action_norm == "redact":
        return QuarantineService.redact(str(file_id), company, username)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid remediation action '{action}'")

@router.get("/logs")
async def get_activity_logs(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=500),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Fetches audit logs scoped strictly to the authenticated tenant."""
    company = current_user.get("company", "").strip()
    if page is not None:
        size = page_size or 50
        skip = (page - 1) * size
        items, total = AuditRepository.list_by_company(company, skip=skip, limit=size)
        total_pages = (total + size - 1) // size if size else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": size,
            "total_pages": total_pages
        }
    items, _ = AuditRepository.list_by_company(company, skip=0, limit=100)
    return items

@router.get("/settings")
async def get_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetch company notification and webhook settings."""
    company = current_user.get("company", "").strip()
    return SettingsRepository.get_by_company(company)

@router.post("/settings")
async def save_settings(
    upload_original: str = Form("true"),
    duplicate_alert: str = Form("true"),
    dlp_violation: str = Form("true"),
    slack_webhook: Optional[str] = Form(None),
    discord_webhook: Optional[str] = Form(None),
    teams_webhook: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update webhook settings for current tenant."""
    company = current_user.get("company", "").strip()
    events = {
        "upload_original": upload_original.lower() == "true",
        "duplicate_alert": duplicate_alert.lower() == "true",
        "dlp_violation": dlp_violation.lower() == "true",
    }
    settings_doc = {
        "company": company,
        "webhook_events": events,
        "slack_webhook": slack_webhook.strip() if slack_webhook else None,
        "discord_webhook": discord_webhook.strip() if discord_webhook else None,
        "teams_webhook": teams_webhook.strip() if teams_webhook else None,
    }
    SettingsRepository.upsert_settings(company, settings_doc)
    AuditRepository.log(
        username=current_user["username"],
        company=company,
        action="SETTINGS_UPDATE",
        details="Updated webhook configuration"
    )
    return {"msg": "Settings saved successfully"}

@router.post("/settings/test")
async def test_settings(
    slack_webhook: Optional[str] = Form(None),
    discord_webhook: Optional[str] = Form(None),
    teams_webhook: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Dispatches a test notification to configured webhooks."""
    company = current_user.get("company", "").strip()
    message = f"🧪 DDAS Test Notification for {company}: Webhook integration verified."

    def _fire():
        if slack_webhook:
            try:
                requests.post(slack_webhook, json={"text": message}, timeout=5)
            except requests.RequestException as e:
                logger.warning(f"Test Slack webhook error: {e}")
        if discord_webhook:
            try:
                requests.post(discord_webhook, json={"content": message}, timeout=5)
            except requests.RequestException as e:
                logger.warning(f"Test Discord webhook error: {e}")
        if teams_webhook:
            try:
                requests.post(teams_webhook, json={"text": message}, timeout=5)
            except requests.RequestException as e:
                logger.warning(f"Test Teams webhook error: {e}")

    threading.Thread(target=_fire, daemon=True).start()
    return {"msg": "Test dispatched"}
