"""
Audit log schemas.
"""
from typing import Optional, Any
from pydantic import BaseModel, Field

class AuditLogOut(BaseModel):
    id: str = Field(..., alias="_id")
    username: str
    company: str
    action: str
    details: str
    timestamp: Any
    resource_id: Optional[str] = None

    model_config = {
        "populate_by_name": True
    }
