import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.seed_data import seed_database
from app.routers import (
    auth, employees, activities, anomalies,
    risk_scoring, ueba, alerts, incidents,
    investigations, reports, dashboards, admin
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed if necessary
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("Detected fresh database. Performing initial enterprise seed and ML model training...")
            seed_database()
        else:
            print("Database already contains data. Ready.")
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Insider Threat Behavioral Intelligence System REST API & Machine Learning Engine",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(employees.router, prefix=settings.API_V1_STR)
app.include_router(activities.router, prefix=settings.API_V1_STR)
app.include_router(anomalies.router, prefix=settings.API_V1_STR)
app.include_router(risk_scoring.router, prefix=settings.API_V1_STR)
app.include_router(ueba.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(investigations.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(dashboards.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "api_docs": "/docs",
        "supported_roles": ["Security Analyst", "SOC Engineer", "Security Manager", "Administrator"],
        "anomaly_models": ["Isolation Forest", "One-Class SVM", "Neural Autoencoder", "NetworkX Graph Analytics", "PyTorch GNN"]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
