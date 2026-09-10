"""Aggregate API v1 router."""
from fastapi import APIRouter

from app.api.v1 import (
    activity,
    alerts,
    analytics,
    auth,
    dashboards,
    employees,
    investigations,
    notifications,
    reports,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(employees.router)
api_router.include_router(activity.router)
api_router.include_router(analytics.router)
api_router.include_router(alerts.router)
api_router.include_router(investigations.router)
api_router.include_router(dashboards.router)
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
