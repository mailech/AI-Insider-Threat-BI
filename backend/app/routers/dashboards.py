from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models
from app.deps import get_current_user

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])


@router.get("/analyst")
def analyst_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    open_alerts = (
        db.query(models.Alert)
        .filter(models.Alert.status.in_(["open", "investigating"]))
        .order_by(models.Alert.created_at.desc())
        .limit(20)
        .all()
    )
    top_risk = (
        db.query(models.RiskScore)
        .order_by(models.RiskScore.computed_at.desc())
        .limit(500)
        .all()
    )
    seen = set()
    top_risk_unique = []
    for r in top_risk:
        if r.employee_id not in seen:
            seen.add(r.employee_id)
            top_risk_unique.append(r)
    top_risk_unique.sort(key=lambda r: r.score, reverse=True)

    incidents = db.query(models.Incident).filter(models.Incident.status != "closed").count()

    return {
        "threat_alerts": [
            {"id": a.id, "title": a.title, "severity": a.severity.value, "status": a.status.value,
             "created_at": a.created_at}
            for a in open_alerts
        ],
        "insider_risk_scores": [
            {"employee_id": r.employee_id, "score": r.score, "risk_level": r.risk_level.value}
            for r in top_risk_unique[:10]
        ],
        "investigation_queue_size": incidents,
        "incident_summary": {
            "open": db.query(models.Incident).filter(models.Incident.status == "open").count(),
            "in_progress": db.query(models.Incident).filter(models.Incident.status == "in_progress").count(),
            "closed": db.query(models.Incident).filter(models.Incident.status == "closed").count(),
        },
    }


@router.get("/soc")
def soc_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    since = datetime.utcnow() - timedelta(days=7)
    events_last_7d = (
        db.query(models.ActivityEvent).filter(models.ActivityEvent.timestamp >= since).count()
    )
    anomalies_by_category = (
        db.query(models.Anomaly.category, func.count(models.Anomaly.id))
        .group_by(models.Anomaly.category)
        .all()
    )
    active_investigations = (
        db.query(models.Incident).filter(models.Incident.status == "in_progress").count()
    )
    return {
        "security_events_last_7d": events_last_7d,
        "behavioral_anomalies_by_category": [
            {"category": c, "count": n} for c, n in anomalies_by_category
        ],
        "active_investigations": active_investigations,
        "recent_anomalies": [
            {
                "id": a.id,
                "employee_id": a.employee_id,
                "category": a.category,
                "score": a.anomaly_score,
                "detected_at": a.detected_at,
            }
            for a in db.query(models.Anomaly).order_by(models.Anomaly.detected_at.desc()).limit(15).all()
        ],
    }


@router.get("/manager")
def manager_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_employees = db.query(models.Employee).count()
    latest_scores = []
    for (emp_id,) in db.query(models.Employee.id).all():
        latest = (
            db.query(models.RiskScore)
            .filter(models.RiskScore.employee_id == emp_id)
            .order_by(models.RiskScore.computed_at.desc())
            .first()
        )
        if latest:
            latest_scores.append(latest)

    risk_distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for r in latest_scores:
        risk_distribution[r.risk_level.value] += 1

    avg_score = round(sum(r.score for r in latest_scores) / len(latest_scores), 2) if latest_scores else 0

    return {
        "total_employees_monitored": total_employees,
        "organizational_risk_posture": {
            "average_risk_score": avg_score,
            "distribution": risk_distribution,
        },
        "risk_trend_last_30d": _risk_trend(db),
        "open_incidents": db.query(models.Incident).filter(models.Incident.status != "closed").count(),
    }


def _risk_trend(db: Session, days: int = 30):
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(func.date(models.RiskScore.computed_at), func.avg(models.RiskScore.score))
        .filter(models.RiskScore.computed_at >= since)
        .group_by(func.date(models.RiskScore.computed_at))
        .order_by(func.date(models.RiskScore.computed_at))
        .all()
    )
    return [{"date": str(d), "avg_score": round(float(s), 2)} for d, s in rows]


@router.get("/admin")
def admin_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return {
        "total_users": db.query(models.User).count(),
        "total_employees": db.query(models.Employee).count(),
        "total_activity_events": db.query(models.ActivityEvent).count(),
        "total_anomalies": db.query(models.Anomaly).count(),
        "total_alerts": db.query(models.Alert).count(),
        "users_by_role": [
            {"role": r, "count": n}
            for r, n in db.query(models.User.role, func.count(models.User.id)).group_by(models.User.role).all()
        ],
    }
