from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import (
    auth, employees, activities, behavior, anomalies, risk, investigations,
    dashboards, reports,
)

app = FastAPI(
    title="Insider Threat Behavioral Intelligence System",
    description="AI-powered platform for monitoring, analyzing, and scoring insider risk.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(activities.router)
app.include_router(behavior.router)
app.include_router(anomalies.router)
app.include_router(risk.router)
app.include_router(investigations.router)
app.include_router(dashboards.router)
app.include_router(reports.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
