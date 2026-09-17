"""
CYBER AI — Core Application Settings
Loads configuration from environment variables (or a .env file).
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # ── PostgreSQL / SQLite (Primary relational DB) ──────────────────────────
    DATABASE_URL: str = "sqlite:///./cyberai.db"

    # ── MongoDB (Behavioural log / event store) ──────────────────────────────
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "cyberai_logs"

    # ── JWT / Auth ───────────────────────────────────────────────────────────
    SECRET_KEY: str = "cyberai-secret-key-production-256bit-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # ── General ─────────────────────────────────────────────────────────────
    APP_NAME: str = "CYBER AI"
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of Settings so .env is only read once."""
    return Settings()


settings: Settings = get_settings()
