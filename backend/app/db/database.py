"""
MongoDB connection singleton and collection handles.
"""
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from app.core.config import settings
from app.core.logging import logger

client = MongoClient(settings.MONGO_URI)
db: Database = client[settings.DATABASE_NAME]

def get_db() -> Database:
    """FastAPI dependency for accessing database."""
    return db

def get_collection(name: str) -> Collection:
    """Helper to access any named collection."""
    return db[name]

# Standard collections
users_collection: Collection = db["users"]
files_collection: Collection = db["files"]
blobs_collection: Collection = db["blobs"]
logs_collection: Collection = db["logs"]
companies_collection: Collection = db["companies"]
settings_collection: Collection = db["settings"]
