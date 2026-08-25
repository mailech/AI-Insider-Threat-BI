from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine


# =====================================================
# IMPORT MODELS
# =====================================================

from app.models.user import User
from app.models.employee import Employee
from app.models.activity import Activity

from app.models.logon import LogonActivity
from app.models.email import EmailActivity
from app.models.file_activity import FileActivity
from app.models.http_activity import HttpActivity
from app.models.device import DeviceActivity

from app.models.psychometric import PsychometricProfile
from app.models.risk import Risk
from app.models.alert import Alert

# Optimized employee behavioral feature model
from app.models.behavior_features import EmployeeBehaviorFeatures


# =====================================================
# IMPORT ROUTERS
# =====================================================

from app.routes.auth import router as auth_router
from app.routes.employee import router as employee_router
from app.routes.activity import router as activity_router

from app.routes.logon import router as logon_router
from app.routes.email import router as email_router
from app.routes.file_activity import router as file_activity_router
from app.routes.http_activity import router as http_activity_router
from app.routes.device import router as device_router

from app.routes.psychometric import router as psychometric_router
from app.routes.risk import router as risk_router
from app.routes.alert import router as alert_router


# =====================================================
# CREATE DATABASE TABLES
# =====================================================

Base.metadata.create_all(bind=engine)


# =====================================================
# FASTAPI APPLICATION
# =====================================================

app = FastAPI(
    title="Insider Threat Behavioral Intelligence System",
    version="1.0.0"
)


# =====================================================
# CORS CONFIGURATION
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# REGISTER ROUTERS
# =====================================================

app.include_router(auth_router)

app.include_router(employee_router)

app.include_router(activity_router)

app.include_router(logon_router)
app.include_router(email_router)
app.include_router(file_activity_router)
app.include_router(http_activity_router)
app.include_router(device_router)

app.include_router(psychometric_router)

app.include_router(risk_router)

app.include_router(alert_router)


# =====================================================
# ROOT ENDPOINT
# =====================================================

@app.get("/")
def home():
    return {
        "message": "Backend Running Successfully"
    }


# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/health")
def health():
    return {
        "status": "Healthy"
    }