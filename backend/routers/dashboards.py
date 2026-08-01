from fastapi import APIRouter
from models.schemas import (
    AnalystDashboardMetrics,
    SOCDashboardMetrics,
    SecurityManagerDashboardMetrics,
    AdminDashboardMetrics
)
from routers.alerts import ALERTS_DB
from routers.activity import ACTIVITIES_DB

router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboards & Analytics"])

@router.get("/analyst", response_model=AnalystDashboardMetrics)
def get_analyst_dashboard():
    open_alerts = [a for a in ALERTS_DB if a["status"] in ["Open", "Investigating"]]
    critical = [a for a in ALERTS_DB if a["severity"] == "Critical"]
    active_inv = len([a for a in ALERTS_DB if a["status"] == "Investigating"])

    return AnalystDashboardMetrics(
        open_alerts=len(open_alerts),
        critical_risk_users=len(critical),
        mean_time_to_detect="4.2m",
        active_investigations=active_inv,
        recent_alerts=ALERTS_DB
    )

@router.get("/soc", response_model=SOCDashboardMetrics)
def get_soc_dashboard():
    anomalies = [a for a in ACTIVITIES_DB if a["is_anomaly"]]

    return SOCDashboardMetrics(
        total_events_today=142850,
        anomalies_flagged=len(anomalies),
        active_threat_level="ELEVATED (LEVEL 3)",
        investigations_in_flight=3,
        live_event_stream=ACTIVITIES_DB
    )

@router.get("/manager", response_model=SecurityManagerDashboardMetrics)
def get_security_manager_dashboard():
    scores = [a["score"] for a in ALERTS_DB]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 42.0

    return SecurityManagerDashboardMetrics(
        org_risk_score=avg_score,
        high_risk_dept_count=2,
        compliance_score_percent=94.5,
        risk_trend_labels=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        risk_trend_scores=[62.0, 58.5, 65.0, 71.0, 68.0, 74.0, avg_score],
        department_risks={
            "Finance": 82.5,
            "IT Administration": 78.0,
            "Engineering": 64.0,
            "Legal": 59.0,
            "Sales": 45.0,
            "Human Resources": 28.0
        }
    )

@router.get("/admin", response_model=AdminDashboardMetrics)
def get_admin_dashboard():
    return AdminDashboardMetrics(
        total_users=42,
        active_sessions=14,
        log_ingestion_rate_eps=1250,
        system_health_status="99.98% Healthy",
        audit_logs=[
            {"id": "AUD-101", "time": "2026-08-01 18:10:02", "actor": "admin", "action": "Updated Risk Weights", "ip": "10.4.1.20"},
            {"id": "AUD-102", "time": "2026-08-01 17:45:18", "actor": "analyst", "action": "Escalated Alert INT-4471", "ip": "10.4.12.89"},
            {"id": "AUD-103", "time": "2026-08-01 16:20:00", "actor": "soc_eng", "action": "Modified IsolationForest Contamination to 0.08", "ip": "10.4.14.102"},
            {"id": "AUD-104", "time": "2026-08-01 14:05:33", "actor": "admin", "action": "Generated System Security Compliance Audit", "ip": "10.4.1.20"}
        ]
    )
