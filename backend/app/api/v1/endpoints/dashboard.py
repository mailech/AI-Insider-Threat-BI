from typing import Any, List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Integer

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.employee import Employee
from backend.app.models.feature import DailyBehavioralFeature
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident
from backend.app.schemas.analytics import (
    DashboardSummaryResponse, DashboardSummaryCards, RiskDistributionItem,
    TrendPoint, DepartmentRiskItem, ActivityDistributionItem, TopAnomalousUser
)
from backend.app.api.deps import get_current_user

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get quick high-level summary cards for SOC posture.
    """
    total_employees = db.query(Employee).count()
    monitored_employees = db.query(Employee).filter(Employee.is_monitored == True).count()
    anomalous_users = db.query(Employee).filter(Employee.anomaly_count > 0).count()
    high_risk_users = db.query(Employee).filter(Employee.current_risk_score >= 50.0, Employee.current_risk_score < 75.0).count()
    critical_threats = db.query(Employee).filter(Employee.current_risk_score >= 75.0).count()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["NEW", "INVESTIGATING"])).count()
    open_incidents = db.query(Incident).filter(Incident.status.in_(["OPEN", "IN_PROGRESS"])).count()

    return {
        "total_employees": total_employees,
        "monitored_employees": monitored_employees,
        "anomalous_users": anomalous_users,
        "high_risk_users": high_risk_users,
        "critical_threats": critical_threats,
        "active_alerts": active_alerts,
        "open_incidents": open_incidents
    }


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get top-level SOC dashboard metrics, cards, trend charts, risk distributions, and alerts.
    """
    total_employees = db.query(Employee).count()
    monitored_employees = db.query(Employee).filter(Employee.is_monitored == True).count()
    anomalous_users = db.query(Employee).filter(Employee.anomaly_count > 0).count()
    high_risk_users = db.query(Employee).filter(Employee.current_risk_score >= 50.0, Employee.current_risk_score < 75.0).count()
    critical_users = db.query(Employee).filter(Employee.current_risk_score >= 75.0).count()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["NEW", "INVESTIGATING"])).count()
    open_investigations = db.query(Incident).filter(Incident.status.in_(["OPEN", "IN_PROGRESS"])).count()

    cards = DashboardSummaryCards(
        total_employees=total_employees,
        monitored_employees=monitored_employees,
        anomalous_users=anomalous_users,
        high_risk_users=high_risk_users,
        critical_users=critical_users,
        active_alerts=active_alerts,
        open_investigations=open_investigations
    )

    # Risk Distribution
    low_count = db.query(Employee).filter(Employee.current_risk_score < 25.0).count()
    med_count = db.query(Employee).filter(Employee.current_risk_score >= 25.0, Employee.current_risk_score < 50.0).count()
    high_count = high_risk_users
    crit_count = critical_users

    risk_distribution = [
        RiskDistributionItem(name="LOW", count=low_count, color="#10B981"),
        RiskDistributionItem(name="MEDIUM", count=med_count, color="#F59E0B"),
        RiskDistributionItem(name="HIGH", count=high_count, color="#F97316"),
        RiskDistributionItem(name="CRITICAL", count=crit_count, color="#EF4444"),
    ]

    # Trend by Date (from DailyBehavioralFeature)
    trend_rows = db.query(
        DailyBehavioralFeature.date,
        func.avg(DailyBehavioralFeature.risk_score).label("avg_risk"),
        func.sum(cast(DailyBehavioralFeature.is_anomaly, Integer)).label("anomalies")
    ).group_by(DailyBehavioralFeature.date).order_by(DailyBehavioralFeature.date.desc()).limit(14).all()

    trend = []
    for r in reversed(trend_rows):
        date_str = r[0]
        alert_c = db.query(Alert).filter(Alert.timestamp.like(f"{date_str}%")).count()
        crit_c = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.date == date_str, DailyBehavioralFeature.risk_score >= 75.0).count()
        trend.append(TrendPoint(
            date=date_str,
            risk_avg=round(float(r[1] or 0), 1),
            anomaly_count=int(r[2] or 0),
            alert_count=alert_c,
            critical_count=crit_c
        ))

    # Top Anomalous Users
    top_emp_records = db.query(Employee).order_by(desc(Employee.current_risk_score), desc(Employee.anomaly_count)).limit(6).all()
    top_anomalous_users = []
    for emp in top_emp_records:
        latest_feat = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.user_id == emp.user_id).order_by(DailyBehavioralFeature.date.desc()).first()
        factors = latest_feat.contributing_factors if latest_feat and latest_feat.contributing_factors else ["Unusual access baseline deviation"]
        top_anomalous_users.append(TopAnomalousUser(
            user_id=emp.user_id,
            full_name=emp.full_name,
            department=emp.department,
            role=emp.role,
            risk_score=emp.current_risk_score,
            severity=emp.current_severity,
            anomaly_count=emp.anomaly_count,
            top_factors=factors[:3]
        ))

    # Department distribution
    dept_rows = db.query(
        Employee.department,
        func.avg(Employee.current_risk_score).label("avg_risk"),
        func.count(Employee.id).label("emp_count"),
        func.sum(Employee.anomaly_count).label("anom_sum")
    ).group_by(Employee.department).all()

    department_distribution = [
        DepartmentRiskItem(
            department=d[0],
            avg_risk=round(float(d[1] or 0), 1),
            employee_count=int(d[2] or 0),
            anomaly_count=int(d[3] or 0)
        ) for d in dept_rows
    ]

    # Activity distribution
    total_logon = db.query(func.sum(DailyBehavioralFeature.login_count)).scalar() or 1
    total_device = db.query(func.sum(DailyBehavioralFeature.device_connect_count)).scalar() or 1
    total_file = db.query(func.sum(DailyBehavioralFeature.file_activity_count)).scalar() or 1
    total_http = db.query(func.sum(DailyBehavioralFeature.http_request_count)).scalar() or 1
    total_email = db.query(func.sum(DailyBehavioralFeature.email_count)).scalar() or 1

    activity_distribution = [
        ActivityDistributionItem(name="Logon / Auth", count=int(total_logon), anomaly_ratio=0.08),
        ActivityDistributionItem(name="Removable Device / USB", count=int(total_device), anomaly_ratio=0.22),
        ActivityDistributionItem(name="File Activity", count=int(total_file), anomaly_ratio=0.15),
        ActivityDistributionItem(name="HTTP Web Requests", count=int(total_http), anomaly_ratio=0.05),
        ActivityDistributionItem(name="Email Communications", count=int(total_email), anomaly_ratio=0.11),
    ]

    # Latest Alerts
    latest_alerts_raw = db.query(Alert).order_by(Alert.id.desc()).limit(5).all()
    latest_alerts = [
        {
            "id": a.id,
            "alert_id": a.alert_id,
            "user_id": a.user_id,
            "timestamp": a.timestamp,
            "severity": a.severity,
            "risk_score": a.risk_score,
            "anomaly_score": a.anomaly_score,
            "reasons": a.reasons,
            "status": a.status,
            "assigned_analyst": a.assigned_analyst
        } for a in latest_alerts_raw
    ]

    # Active Investigations
    active_incidents_raw = db.query(Incident).filter(Incident.status != "CLOSED").order_by(Incident.id.desc()).limit(5).all()
    active_investigations = [
        {
            "id": inc.id,
            "incident_id": inc.incident_id,
            "title": inc.title,
            "user_id": inc.user_id,
            "severity": inc.severity,
            "status": inc.status,
            "assigned_analyst": inc.assigned_analyst,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        } for inc in active_incidents_raw
    ]

    return DashboardSummaryResponse(
        cards=cards,
        risk_distribution=risk_distribution,
        trend=trend,
        top_anomalous_users=top_anomalous_users,
        department_distribution=department_distribution,
        activity_distribution=activity_distribution,
        latest_alerts=latest_alerts,
        active_investigations=active_investigations
    )
