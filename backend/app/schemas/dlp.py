"""
DLP finding schemas, severity enums, and scan results.
"""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class DLPSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class DLPFinding(BaseModel):
    rule_name: str
    severity: DLPSeverity
    confidence: float = Field(ge=0.0, le=1.0)
    masked_value: str
    location: Optional[int] = None

class DLPScanResult(BaseModel):
    has_violations: bool
    violations: List[str] = []
    findings: List[DLPFinding] = []
    quarantine_required: bool = False
