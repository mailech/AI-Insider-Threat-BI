from fastapi import FastAPI

from app.database import Base, engine

# Import Models
from app.models.user import User
from app.models.employee import Employee
from app.models.activity import Activity
from app.models.risk import Risk

# Import Routers
from app.routes.auth import router as auth_router
from app.routes.employee import router as employee_router
from app.routes.activity import router as activity_router
from app.routes.risk import router as risk_router
from app.routes.dashboard import router as dashboard_router

# Create Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Insider Threat Behavioral Intelligence System",
    version="1.0.0"
)

# Register Routers
app.include_router(auth_router)
app.include_router(employee_router)
app.include_router(activity_router)
app.include_router(risk_router)
app.include_router(dashboard_router)


@app.get("/")
def home():
    return {
        "message": "Backend Running Successfully"
    }


@app.get("/health")
def health():
    return {
        "status": "Healthy"
    }