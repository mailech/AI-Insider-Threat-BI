"""Application settings, loaded from the environment."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Insider Threat Behavioral Intelligence System"
    API_V1_PREFIX: str = "/api/v1"

    # Postgres under docker-compose; SQLite fallback so the API runs bare.
    DATABASE_URL: str = "sqlite:///./insider_threat.db"

    SECRET_KEY: str = "change-me-in-production-this-is-a-development-default"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Comma-separated in the environment, e.g. "http://localhost:5173,http://web"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost"

    # Activity outside this window is flagged is_after_hours at write time.
    BUSINESS_HOUR_START: int = 8
    BUSINESS_HOUR_END: int = 19

    SEED_ON_STARTUP: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
