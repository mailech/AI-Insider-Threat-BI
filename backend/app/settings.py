from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    database_url:str='postgresql+psycopg://itbis:itbis@postgres:5432/itbis'
    ingestion_api_key:str='dev-ingestion-key'
    secret_pepper:str='change-this-pepper'
    jwt_secret:str='change-this-jwt-secret'
    bootstrap_admin_username:str='admin'
    bootstrap_admin_password:str='ChangeMe123!'
    cors_origins:str='http://localhost:3000'
    model_path:str='/models/isolation_forest.joblib'
    baseline_path:str='/models/baselines.parquet'
    model_metrics_path:str='/models/model_metrics.json'
    model_config=SettingsConfigDict(env_file='.env',extra='ignore')
settings=Settings()
