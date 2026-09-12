"""
Shared rate limiter instance using slowapi.
Automatically disables rate limiting during testing to prevent false 429 errors.
"""
import os
import sys
from slowapi import Limiter
from slowapi.util import get_remote_address

is_testing = bool(os.getenv("TESTING") or "pytest" in sys.modules)

limiter = Limiter(
    key_func=get_remote_address,
    enabled=not is_testing
)
