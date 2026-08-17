from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Insider Threat Behavioral Intelligence System"
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_PUBLISHABLE_KEY: str
    SUPABASE_JWT_SECRET: str

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()