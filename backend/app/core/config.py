"""Application configuration loaded from the environment / backend/.env."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

# Default to SQLite for local development (no PostgreSQL required)
DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / "data" / "insideriq.db"
DEFAULT_TEST_DB_PATH = Path(__file__).resolve().parents[3] / "data" / "insideriq_test.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), extra="ignore")

    database_url: str = f"sqlite:///{DEFAULT_DB_PATH}"
    test_database_url: str = f"sqlite:///{DEFAULT_TEST_DB_PATH}"

    jwt_secret_key: str = "development-only-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    ml_service_url: str = "http://localhost:8001"
    ml_service_timeout_seconds: float = 10.0

    cors_origins: str = "http://localhost:3000"

    initial_account_password: str = "InsiderIQ#2024"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
