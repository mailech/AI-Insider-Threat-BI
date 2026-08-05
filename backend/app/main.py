from fastapi import FastAPI

from app.database import Base, engine

# Import Models
from app.models.user import User
from app.models.employee import Employee

# Import Routers
from app.routes.auth import router as auth_router
from app.routes.employee import router as employee_router

# Create Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Insider Threat Behavioral Intelligence System",
    version="1.0.0"
)

# Include Routers
app.include_router(auth_router)
app.include_router(employee_router)


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