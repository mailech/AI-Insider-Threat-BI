"""Application configuration loaded from environment / .env file."""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core
    PROJECT_NAME: str = "Insider Threat Behavioral Intelligence System"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Databases
    DATABASE_URL: str = "sqlite:///./itbis.db"
    MONGODB_URL: str = ""
    MONGODB_DB: str = "itbis_logs"

    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost"

    # OAuth2
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    OAUTH_REDIRECT_URL: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    # Detection tuning
    ANOMALY_CONTAMINATION: float = 0.035
    BASELINE_MIN_EVENTS: int = 25
    RISK_CRITICAL_THRESHOLD: float = 80.0
    RISK_HIGH_THRESHOLD: float = 60.0
    RISK_MEDIUM_THRESHOLD: float = 35.0

    # Bootstrap
    FIRST_ADMIN_EMAIL: str = "admin@itbis.io"
    FIRST_ADMIN_PASSWORD: str = "Admin@12345"

    MODEL_DIR: str = "./models_store"

    # In development any localhost port is allowed so Vite dev/preview servers
    # work without reconfiguration. Production uses the explicit origin list only.
    LOCAL_ORIGIN_REGEX: str = r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"

    @property
    def cors_origin_regex(self) -> str | None:
        return self.LOCAL_ORIGIN_REGEX if self.ENVIRONMENT == "development" else None

    @property
    def cors_origins(self) -> List[str]:
        raw = (self.BACKEND_CORS_ORIGINS or "").strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
