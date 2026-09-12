"""
Tenant webhook and notification settings repository.
"""
from typing import Dict, Any, Optional
from app.db.database import settings_collection

class SettingsRepository:
    @staticmethod
    def get_by_company(company: str) -> Dict[str, Any]:
        """Retrieves company settings or defaults."""
        settings = settings_collection.find_one({"company": company}, {"_id": 0})
        if not settings:
            return {
                "webhook_events": {
                    "upload_original": True,
                    "duplicate_alert": True,
                    "dlp_violation": True
                },
                "slack_webhook": None,
                "discord_webhook": None,
                "teams_webhook": None
            }
        return settings

    @staticmethod
    def upsert_settings(company: str, settings_doc: Dict[str, Any]):
        """Saves company webhook settings."""
        settings_collection.update_one(
            {"company": company},
            {"$set": settings_doc},
            upsert=True
        )
