from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.employee import Employee
from backend.app.models.feature import DailyBehavioralFeature
from backend.app.models.baseline import BehavioralBaseline
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident
from backend.app.schemas.employee import EmployeeResponse, EmployeeDetailResponse
from backend.app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=List[EmployeeResponse])
def get_employees(
    department: Optional[str] = None,
    severity: Optional[str] = None,
    min_risk: Optional[float] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List all monitored employees with search, department, and risk level filtering.
    """
    query = db.query(Employee)

    if department and department != "ALL":
        query = query.filter(Employee.department == department)
    if severity and severity != "ALL":
        query = query.filter(Employee.current_severity == severity)
    if min_risk is not None:
        query = query.filter(Employee.current_risk_score >= min_risk)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Employee.user_id.ilike(search_pattern)) |
            (Employee.full_name.ilike(search_pattern)) |
            (Employee.email.ilike(search_pattern)) |
            (Employee.role.ilike(search_pattern))
        )

    return query.order_by(desc(Employee.current_risk_score)).offset(skip).limit(limit).all()


@router.get("/{user_id}", response_model=EmployeeDetailResponse)
def get_employee_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get in-depth employee behavioral profile, baselines, risk history, and alerts.
    """
    emp = db.query(Employee).filter(Employee.user_id == user_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Fetch Baselines
    baselines_raw = db.query(BehavioralBaseline).filter(BehavioralBaseline.user_id == user_id).all()
    baselines_dict = {
        b.metric_name: {
            "mean": b.mean,
            "std": b.std,
            "median": b.median,
            "q25": b.q25,
            "q75": b.q75,
            "normal_hours_start": b.normal_hours_start,
            "normal_hours_end": b.normal_hours_end,
            "sample_size": b.sample_size
        } for b in baselines_raw
    }

    # Fetch Features & Risk History
    features = db.query(DailyBehavioralFeature).filter(
        DailyBehavioralFeature.user_id == user_id
    ).order_by(DailyBehavioralFeature.date.asc()).all()

    risk_history = [
        {
            "date": f.date,
            "risk_score": f.risk_score,
            "anomaly_score": f.anomaly_score,
            "is_anomaly": f.is_anomaly,
            "severity": f.severity,
            "factors": f.contributing_factors
        } for f in features
    ]

    recent_anomalies = [
        {
            "date": f.date,
            "anomaly_score": f.anomaly_score,
            "risk_score": f.risk_score,
            "severity": f.severity,
            "factors": f.contributing_factors,
            "metrics": {
                "logins": f.login_count,
                "after_hours_logon": f.after_hours_logon,
                "device_connects": f.device_connect_count,
                "file_count": f.file_activity_count,
                "sensitive_files": f.sensitive_file_activity,
                "http_count": f.http_request_count,
                "suspicious_domains": f.suspicious_domain_count,
                "email_count": f.email_count,
                "attachments": f.attachment_count
            }
        } for f in features if f.is_anomaly
    ]

    # Alerts & Incidents
    alerts_raw = db.query(Alert).filter(Alert.user_id == user_id).order_by(Alert.id.desc()).all()
    alerts = [
        {
            "id": a.id,
            "alert_id": a.alert_id,
            "timestamp": a.timestamp,
            "severity": a.severity,
            "risk_score": a.risk_score,
            "anomaly_score": a.anomaly_score,
            "reasons": a.reasons,
            "status": a.status,
            "assigned_analyst": a.assigned_analyst
        } for a in alerts_raw
    ]

    incidents_raw = db.query(Incident).filter(Incident.user_id == user_id).order_by(Incident.id.desc()).all()
    incidents = [
        {
            "id": inc.id,
            "incident_id": inc.incident_id,
            "title": inc.title,
            "severity": inc.severity,
            "status": inc.status,
            "assigned_analyst": inc.assigned_analyst,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        } for inc in incidents_raw
    ]

    # Activity Timeline format
    activity_timeline = []
    for f in features:
        if f.login_count > 0:
            activity_timeline.append({
                "date": f.date,
                "type": "LOGON",
                "summary": f"{f.login_count} logins ({f.after_hours_logon} after-hours, {f.weekend_logon} weekend)",
                "is_anomalous": f.after_hours_logon > 0 or f.weekend_logon > 0
            })
        if f.device_connect_count > 0:
            activity_timeline.append({
                "date": f.date,
                "type": "DEVICE",
                "summary": f"{f.device_connect_count} USB removable drive connects",
                "is_anomalous": f.after_hours_device > 0 or f.device_connect_count > 2
            })
        if f.file_activity_count > 0:
            activity_timeline.append({
                "date": f.date,
                "type": "FILE",
                "summary": f"{f.file_activity_count} file actions ({f.sensitive_file_activity} sensitive / confidential)",
                "is_anomalous": f.sensitive_file_activity > 0
            })
        if f.http_request_count > 0:
            activity_timeline.append({
                "date": f.date,
                "type": "HTTP",
                "summary": f"{f.http_request_count} web requests ({f.suspicious_domain_count} suspicious domains)",
                "is_anomalous": f.suspicious_domain_count > 0
            })
        if f.email_count > 0:
            activity_timeline.append({
                "date": f.date,
                "type": "EMAIL",
                "summary": f"{f.email_count} emails sent ({f.attachment_count} attachments, {f.recipient_count} recipients)",
                "is_anomalous": f.attachment_count > 3
            })

    return EmployeeDetailResponse(
        id=emp.id,
        user_id=emp.user_id,
        full_name=emp.full_name,
        email=emp.email,
        department=emp.department,
        role=emp.role,
        manager=emp.manager,
        devices=emp.devices or [],
        access_privileges=emp.access_privileges or [],
        is_monitored=emp.is_monitored,
        current_risk_score=emp.current_risk_score,
        current_severity=emp.current_severity,
        anomaly_count=emp.anomaly_count,
        alert_count=emp.alert_count,
        last_active_date=emp.last_active_date,
        created_at=emp.created_at,
        updated_at=emp.updated_at,
        behavioral_baseline=baselines_dict,
        recent_anomalies=recent_anomalies,
        recent_alerts=alerts,
        recent_incidents=incidents,
        risk_history=risk_history,
        activity_timeline=activity_timeline[-50:]  # Last 50 timeline events
    )


@router.get("/{user_id}/behavior")
def get_employee_behavior(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get raw and normalized daily behavioral feature records for an employee.
    """
    features = db.query(DailyBehavioralFeature).filter(
        DailyBehavioralFeature.user_id == user_id
    ).order_by(DailyBehavioralFeature.date.desc()).limit(60).all()
    return features


@router.get("/{user_id}/risk-history")
def get_employee_risk_history(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get risk trajectory, moving average, and contributing factors for an employee.
    """
    features = db.query(DailyBehavioralFeature).filter(
        DailyBehavioralFeature.user_id == user_id
    ).order_by(DailyBehavioralFeature.date.asc()).all()

    return [
        {
            "date": f.date,
            "risk_score": f.risk_score,
            "anomaly_score": f.anomaly_score,
            "severity": f.severity,
            "is_anomaly": f.is_anomaly,
            "factors": f.contributing_factors
        } for f in features
    ]
