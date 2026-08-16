"""
ITBIS — Core Application Settings
Loads configuration from environment variables (or a .env file).
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # ── PostgreSQL (Primary relational DB) ──────────────────────────────────
    # Set DATABASE_URL in .env to use PostgreSQL in production, e.g.:
    #   postgresql+psycopg2://itbis_user:itbis_pass@localhost:5432/itbis_db
    # Falls back to a local SQLite file when the variable is not provided.
    DATABASE_URL: str = "sqlite:///./sql_app.db"

    # ── MongoDB (Behavioural log / event store) ──────────────────────────────
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "itbis_logs"

    # ── JWT / Auth ───────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-a-256-bit-random-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── General ─────────────────────────────────────────────────────────────
    APP_NAME: str = "ITBIS"
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
