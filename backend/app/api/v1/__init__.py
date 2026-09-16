"""API v1 package — aggregates all sub-routers into a single APIRouter."""

from fastapi import APIRouter

from app.api.v1.activity import router as activity_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.anomalies import router as anomalies_router
from app.api.v1.auth import router as auth_router
from app.api.v1.behavior import router as behavior_router
from app.api.v1.employees import router as employees_router
from app.api.v1.investigations import router as investigations_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.reports import router as reports_router
from app.api.v1.risk import router as risk_router
from app.api.v1.users import router as users_router

# Re-export individual routers for convenience
__all__ = [
    "activity_router",
    "alerts_router",
    "anomalies_router",
    "auth_router",
    "behavior_router",
    "employees_router",
    "investigations_router",
    "notifications_router",
    "reports_router",
    "risk_router",
    "users_router",
    "api_router",
]

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(employees_router)
api_router.include_router(activity_router)
api_router.include_router(behavior_router)
api_router.include_router(anomalies_router)
api_router.include_router(risk_router)
api_router.include_router(alerts_router)
api_router.include_router(notifications_router)
api_router.include_router(investigations_router)
api_router.include_router(reports_router)
