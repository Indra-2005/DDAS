"""
User self-service routes: profile inspection and credential updates.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Form, status
from app.core.dependencies import get_current_user
from app.core.security import verify_password, get_password_hash
from app.repositories.user_repository import UserRepository
from app.repositories.file_repository import FileRepository
from app.db.database import files_collection

router = APIRouter(tags=["Users"])

def format_bytes(s: int) -> str:
    if s == 0:
        return "0 B"
    s_float = float(s)
    for u in ['B', 'KB', 'MB', 'GB']:
        if s_float < 1024:
            return f"{s_float:.1f} {u}"
        s_float /= 1024
    return f"{s_float:.1f} TB"

@router.get("/me")
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve profile and personal storage metrics for the authenticated user."""
    username = current_user["username"]
    company = current_user.get("company", "").strip()

    user_data = UserRepository.find_by_username(username)
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

    user_files = files_collection.find({"owner": username, "company": company})
    storage_used_bytes = sum(f.get("size", 0) for f in user_files)

    return {
        "username": user_data["username"],
        "role": user_data.get("role", "employee"),
        "company": company,
        "originals": originals,
        "duplicates": duplicates,
        "storage_used": format_bytes(storage_used_bytes),
        "storage_used_bytes": storage_used_bytes
    }

@router.post("/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Allows user to change their account password upon verifying current password."""
    username = current_user["username"]
    user_data = UserRepository.find_by_username(username)
    if not user_data or not verify_password(current_password, user_data["password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password incorrect")

    UserRepository.update_password(username, get_password_hash(new_password))
    return {"msg": "Password updated successfully"}
