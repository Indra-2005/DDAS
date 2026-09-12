"""
Structured logging module for DDAS.
Ensures uniform logging across services and routers while scrubbing sensitive data.
"""
import logging
import re
import sys
from typing import Optional
from app.core.config import settings

# Patterns to scrub from logs
SENSITIVE_PATTERNS = [
    (re.compile(r'(?i)(password|secret|token|master_key|key)["\s:=]+["\']?([^"\'\s,]+)'), r'\1="[REDACTED]"'),
    (re.compile(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b'), r'[REDACTED_CREDIT_CARD]'),
    (re.compile(r'AKIA[0-9A-Z]{16}'), r'AKIA[REDACTED]'),
]

class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg = record.msg
            for pattern, repl in SENSITIVE_PATTERNS:
                msg = pattern.sub(repl, msg)
            record.msg = msg
        return True

def setup_logger(name: str = "ddas") -> logging.Logger:
    logger = logging.getLogger(name)
    level_str = getattr(settings, "LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_str, logging.INFO)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z"
        )
        handler.setFormatter(formatter)
        handler.addFilter(SensitiveDataFilter())
        logger.addHandler(handler)

    return logger

logger = setup_logger("ddas")
