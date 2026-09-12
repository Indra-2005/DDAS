"""
@file app.py
@description DDAS Application Entry Point — thin re-export layer.
Exposes the modular FastAPI application from app.main and backward-compatibility
aliases from app/__init__.py for existing scripts, tests, and ASGI servers.

Usage:
    uvicorn app:app --reload --host 127.0.0.1 --port 8000
"""
# Re-export everything from the app package for backward compatibility
from app import *  # noqa: F401, F403

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)