from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    auth, dashboard, employees, activities,
    anomalies, alerts, incidents, analytics, ml, reports
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & RBAC"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["SOC Dashboard"])
api_router.include_router(employees.router, prefix="/employees", tags=["Employee Behavioral Intelligence"])
api_router.include_router(activities.router, prefix="/activities", tags=["Activities & Audit Logs"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomalies & Baseline Deviations"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Explainable Security Alerts"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Case Management & Investigations"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["SOC Analytics & Risk Trends"])
api_router.include_router(ml.router, prefix="/ml", tags=["ML Ops & Dual-Engine Intelligence"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Executive Exports"])

