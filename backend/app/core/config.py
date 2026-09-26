import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Insider Threat Behavioral Intelligence Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment Variables requested in specification
    CERT_DATA_PATH: str = os.getenv("CERT_DATA_PATH", "./data/cert_r4.2")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models")
    PROCESSED_DATA_PATH: str = os.getenv("PROCESSED_DATA_PATH", "./data/processed")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./insider_threat.db")
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017/insider_threat")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecret_cert_insider_threat_soc_key_2026_x99")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Risk Engine Default Weights (as specified: 35%, 25%, 20%, 10%, 10%)
    WEIGHT_BEHAVIORAL_ANOMALIES: float = 0.35
    WEIGHT_PRIVILEGE_MISUSE: float = 0.25
    WEIGHT_DATA_ACCESS: float = 0.20
    WEIGHT_ACCESS_PATTERNS: float = 0.10
    WEIGHT_HISTORICAL_SECURITY: float = 0.10

    # Risk Thresholds
    THRESHOLD_LOW: int = 25
    THRESHOLD_MEDIUM: int = 50
    THRESHOLD_HIGH: int = 75

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()

# Ensure required directory paths exist
Path(settings.MODEL_PATH).mkdir(parents=True, exist_ok=True)
Path(settings.PROCESSED_DATA_PATH).mkdir(parents=True, exist_ok=True)
Path(settings.CERT_DATA_PATH).mkdir(parents=True, exist_ok=True)
