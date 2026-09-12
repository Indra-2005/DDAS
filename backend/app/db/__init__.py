"""Database connections and index management."""
from app.db.database import db, get_db, get_collection
from app.db.indexes import ensure_indexes

__all__ = ["db", "get_db", "get_collection", "ensure_indexes"]
