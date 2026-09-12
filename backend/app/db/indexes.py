"""
MongoDB index creation on application startup.
Ensures high performance and prevents full collection scans.
"""
from pymongo import ASCENDING, DESCENDING
from app.db.database import (
    users_collection,
    files_collection,
    blobs_collection,
    logs_collection,
    companies_collection,
    settings_collection
)
from app.core.logging import logger

def ensure_indexes():
    """Create all required compound and unique indexes across collections."""
    try:
        # Users
        users_collection.create_index([("username", ASCENDING)], unique=True)
        users_collection.create_index([("company", ASCENDING)])

        # Files (Tenant-scoped query optimization)
        files_collection.create_index([("company", ASCENDING), ("upload_date", DESCENDING)])
        files_collection.create_index([("company", ASCENDING), ("hash", ASCENDING)])
        files_collection.create_index([("company", ASCENDING), ("quarantine_status", ASCENDING)])
        files_collection.create_index([("company", ASCENDING), ("owner", ASCENDING)])
        files_collection.create_index([("hash", ASCENDING)])  # For global reference tracking

        # Blobs (Physical storage reference tracking)
        blobs_collection.create_index([("content_hash", ASCENDING)], unique=True)

        # Logs
        logs_collection.create_index([("company", ASCENDING), ("timestamp", DESCENDING)])

        # Companies
        companies_collection.create_index([("name", ASCENDING)], unique=True)
        companies_collection.create_index([("invite_code", ASCENDING)])

        # Settings
        settings_collection.create_index([("company", ASCENDING)], unique=True)

        logger.info("Successfully verified and created all MongoDB database indexes.")
    except Exception as e:
        logger.warning(f"Index creation note (non-critical): {e}")
