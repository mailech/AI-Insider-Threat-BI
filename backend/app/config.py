import os


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://insider:insider@db:5432/insider_threat"
    )
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-this-secret-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    # Risk scoring weights (from the project spec)
    WEIGHT_BEHAVIORAL_ANOMALIES: float = 0.35
    WEIGHT_PRIVILEGE_MISUSE: float = 0.25
    WEIGHT_DATA_ACCESS_VIOLATIONS: float = 0.20
    WEIGHT_ACCESS_PATTERN_DEVIATIONS: float = 0.10
    WEIGHT_HISTORICAL_SECURITY_EVENTS: float = 0.10


settings = Settings()
