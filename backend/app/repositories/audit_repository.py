"""
Tenant-scoped audit log repository.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from app.db.database import logs_collection
from app.core.logging import logger

class AuditRepository:
    @staticmethod
    def log(
        username: str,
        company: str,
        action: str,
        details: str = "",
        resource_id: Optional[str] = None
    ):
        """Inserts an immutable audit event scoped to tenant."""
        try:
            logs_collection.insert_one({
                "username": username,
                "company": company,
                "action": action,
                "details": details,
                "resource_id": resource_id,
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as e:
            logger.error(f"Failed to record audit log: {type(e).__name__}: {e}")

    @staticmethod
    def list_by_company(
        company: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists audit logs scoped to company tenant with pagination."""
        query = {"company": company}
        total = logs_collection.count_documents(query)
        cursor = logs_collection.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        items = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(doc)
        return items, total
