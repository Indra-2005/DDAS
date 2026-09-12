"""
User and Company repository with tenant-scoped operations.
"""
from typing import List, Dict, Any, Optional
from app.db.database import users_collection, companies_collection

class UserRepository:
    @staticmethod
    def find_by_username(username: str) -> Optional[Dict[str, Any]]:
        """Finds user by exact username."""
        return users_collection.find_one({"username": username})

    @staticmethod
    def find_by_username_and_company(username: str, company: str) -> Optional[Dict[str, Any]]:
        """Finds user scoped to specific company tenant."""
        return users_collection.find_one({"username": username, "company": company})

    @staticmethod
    def list_by_company(company: str) -> List[Dict[str, Any]]:
        """Lists users belonging to tenant company (excluding password hashes)."""
        cursor = users_collection.find({"company": company}, {"password": 0})
        users = []
        for u in cursor:
            u["_id"] = str(u["_id"])
            users.append(u)
        return users

    @staticmethod
    def insert_user(user_doc: Dict[str, Any]) -> str:
        """Inserts a new user record."""
        result = users_collection.insert_one(user_doc)
        return str(result.inserted_id)

    @staticmethod
    def update_password(username: str, hashed_password: str) -> bool:
        """Updates user's hashed password."""
        res = users_collection.update_one(
            {"username": username},
            {"$set": {"password": hashed_password}}
        )
        return res.matched_count > 0

    @staticmethod
    def reset_password_scoped(username: str, company: str, hashed_password: str) -> bool:
        """Admin resets password for a user within the same company tenant."""
        res = users_collection.update_one(
            {"username": username, "company": company},
            {"$set": {"password": hashed_password}}
        )
        return res.matched_count > 0

    @staticmethod
    def delete_user_scoped(username: str, company: str) -> bool:
        """Deletes user scoped to tenant company."""
        res = users_collection.delete_one({"username": username, "company": company})
        return res.deleted_count > 0

    # --- Company operations ---
    @staticmethod
    def get_company_by_name(name: str) -> Optional[Dict[str, Any]]:
        return companies_collection.find_one({"name": name})

    @staticmethod
    def get_company_by_invite(invite_code: str) -> Optional[Dict[str, Any]]:
        return companies_collection.find_one({"invite_code": invite_code})

    @staticmethod
    def insert_company(name: str, invite_code: str) -> str:
        res = companies_collection.insert_one({"name": name, "invite_code": invite_code})
        return str(res.inserted_id)
