from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import Employee, TelemetryLog, User
from app.schemas import OverviewResponse, KPICards, EmployeeListItem
from app.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview", response_model=OverviewResponse)
def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    employees = db.query(Employee).all()
    total_employees = len(employees)

    critical_count = sum(1 for e in employees if e.risk_category == "Critical")
    high_count = sum(1 for e in employees if e.risk_category == "High")
    medium_count = sum(1 for e in employees if e.risk_category == "Medium")
    low_count = sum(1 for e in employees if e.risk_category == "Low")

    avg_score = round(sum(e.threat_score for e in employees) / max(1, total_employees), 1)
    critical_rate = round((critical_count / max(1, total_employees)) * 100, 1)
    high_risk_rate = round(((critical_count + high_count) / max(1, total_employees)) * 100, 1)

    kpis = KPICards(
        total_employees=total_employees,
        critical_risk_alerts=critical_count,
        high_risk_users=high_count,
        medium_risk_users=medium_count,
        low_risk_users=low_count,
        avg_threat_score=avg_score,
        critical_rate=critical_rate,
        high_risk_rate=high_risk_rate,
    )

    # Sort employees by threat score descending for recent alerts list
    sorted_employees = sorted(employees, key=lambda x: x.threat_score, reverse=True)
    recent_alerts = [EmployeeListItem.model_validate(e) for e in sorted_employees]

    # Role-specific tailored data blocks
    role_specific_data = {}
    
    if current_user.role == "Security Analyst":
        # Investigation Queue & Incident Summaries
        queue = [
            {"id": e.id, "name": e.full_name, "dept": e.department, "score": e.threat_score, "priority": "P1 - Immediate" if e.threat_score >= 80 else "P2 - Elevated", "status": "Under Review"}
            for e in sorted_employees if e.threat_score >= 60
        ]
        role_specific_data = {
            "title": "Security Analyst Investigation Queue",
            "focus": "Active Insider Risk Alerts & Incident Triage",
            "investigation_queue": queue,
            "open_cases_count": len(queue),
            "pending_reviews": sum(1 for q in queue if q["priority"].startswith("P1"))
        }
    elif current_user.role == "SOC Engineer":
        # Security Events & Anomalies Feed
        critical_logs = db.query(TelemetryLog).filter(
            TelemetryLog.severity.in_(["CRITICAL", "HIGH"])
        ).order_by(desc(TelemetryLog.timestamp)).limit(8).all()

        role_specific_data = {
            "title": "SOC Behavioral Telemetry Feed",
            "focus": "Real-Time Anomalies & Live Ingestion Signals",
            "active_threat_feed": [
                {
                    "id": l.id,
                    "employee_id": l.employee_id,
                    "event_type": l.event_type,
                    "severity": l.severity,
                    "source_ip": l.source_ip,
                    "timestamp": l.timestamp.isoformat(),
                    "desc": l.description
                } for l in critical_logs
            ]
        }
    elif current_user.role == "Security Manager":
        # Executive Risk Posture & Compliance Metrics
        role_specific_data = {
            "title": "Executive Risk Posture & Compliance",
            "focus": "Organizational Threat Exposure & Policy Adherence",
            "compliance_score": 94.2,
            "monitored_departments_count": len(set(e.department for e in employees)),
            "policy_violation_rate": f"{high_risk_rate}%",
            "risk_trend_direction": "Elevated (+3.4% this week)"
        }
    else:  # Administrator
        role_specific_data = {
            "title": "Fleet-Wide System Administration Overview",
            "focus": "Complete Governance, Threat Telemetry & System Operations",
            "system_health": "100% Operational",
            "active_nodes_count": total_employees * 2,
            "admin_privileges": "Full Settings & Config Access Granted"
        }

    return OverviewResponse(
        kpis=kpis,
        fleet_threat_score=avg_score,
        recent_alerts=recent_alerts,
        role_view=current_user.role,
        role_specific_data=role_specific_data
    )
