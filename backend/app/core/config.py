"""
Centralized application settings using Pydantic BaseSettings.
Loads from environment variables and .env file.
"""
import os
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Preload .env
load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Database
    MONGO_URI: str = Field(default="mongodb://localhost:27017")
    DATABASE_NAME: str = Field(default="ddas_db", alias="DB_NAME")

    # Storage
    STORAGE_DIR: str = Field(default="./storage", alias="STORAGE_PATH")

    # Security / Auth
    JWT_SECRET: str = Field(..., min_length=32, description="Secret key for JWT generation (min 32 chars)")
    JWT_ALGORITHM: str = Field(default="HS256", alias="JWT_ALGO")
    ACCESS_TOKEN_EXPIRE_HOURS: int = Field(default=24)
    ACCESS_TOKEN_EXPIRE_MINUTES: Optional[int] = Field(default=None, description="Optional compatibility alias in minutes")
    ADMIN_SECRET: Optional[str] = Field(default=None, description="Secret required for admin registration")

    # Encryption at rest
    ENCRYPTION_MASTER_KEY: str = Field(..., min_length=64, max_length=64, description="64-char hex key (32 bytes) for AES-256-GCM")

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = Field(default=500)

    # CORS - Accept either comma-separated string or list
    CORS_ORIGINS: Union[str, List[str]] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    )

    # Deduplication
    NEAR_DUP_THRESHOLD: float = Field(default=0.8)
    MINHASH_NUM_PERM: int = Field(default=128)

    # Logging
    LOG_LEVEL: str = Field(default="INFO")

    @field_validator("ENCRYPTION_MASTER_KEY")
    @classmethod
    def validate_hex_key(cls, v: str) -> str:
        try:
            raw = bytes.fromhex(v)
            if len(raw) != 32:
                raise ValueError("Key must decode to exactly 32 bytes (64 hex characters)")
        except ValueError as e:
            raise ValueError(f"Invalid ENCRYPTION_MASTER_KEY hex: {e}")
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            if self.CORS_ORIGINS.startswith("[") and self.CORS_ORIGINS.endswith("]"):
                import json
                try:
                    return json.loads(self.CORS_ORIGINS)
                except Exception:
                    pass
            return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def encryption_key_bytes(self) -> bytes:
        return bytes.fromhex(self.ENCRYPTION_MASTER_KEY)

    @property
    def effective_storage_dir(self) -> str:
        path = self.STORAGE_DIR
        # If the storage path drive does not exist (e.g. F:/), fallback to ./storage
        drive = os.path.splitdrive(path)[0]
        if drive and not os.path.exists(drive):
            path = "./storage"
        os.makedirs(path, exist_ok=True)
        return path

    @property
    def token_expire_hours(self) -> int:
        if self.ACCESS_TOKEN_EXPIRE_MINUTES is not None and self.ACCESS_TOKEN_EXPIRE_MINUTES > 0:
            return max(1, self.ACCESS_TOKEN_EXPIRE_MINUTES // 60)
        return self.ACCESS_TOKEN_EXPIRE_HOURS

# Instantiate singleton settings
settings = Settings()
