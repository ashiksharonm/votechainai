"""
VoteChainAI Backend Configuration

Centralized configuration management using Pydantic Settings.
All environment variables are validated and typed.
"""

from functools import lru_cache
from typing import List
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_JWT_SECRET = "your-super-secret-key-change-in-production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Database
    # Use absolute path relative to this file location
    # /app/config.py -> parent is /app
    base_dir: str = str(Path(__file__).resolve().parent)
    default_db_path: str = str(Path(__file__).resolve().parent / "db.sqlite3")
    
    database_url: str = f"sqlite:///{default_db_path}"
    database_url_sync: str = f"sqlite:///{default_db_path}"
    
    # JWT Authentication
    jwt_secret_key: str = DEFAULT_JWT_SECRET  # dev only; enforced below
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours
    
    # Blockchain
    blockchain_rpc_url: str = "http://localhost:8545"
    contract_address: str = ""
    private_key: str = ""
    
    # Server
    debug: bool = True
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000"
    
    # Security
    bcrypt_rounds: int = 12
    
    @model_validator(mode="after")
    def _require_real_jwt_secret_outside_debug(self) -> "Settings":
        """Refuse to start with the placeholder JWT secret unless DEBUG is on."""
        if not self.debug and self.jwt_secret_key == DEFAULT_JWT_SECRET:
            raise ValueError(
                "JWT_SECRET_KEY must be set to a unique value when DEBUG is false"
            )
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Using lru_cache ensures settings are only loaded once.
    """
    return Settings()


# Global settings instance for convenience
settings = get_settings()
