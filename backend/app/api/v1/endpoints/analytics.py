from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Integer

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.feature import DailyBehavioralFeature
from backend.app.models.employee import Employee
from backend.app.models.alert import Alert
from backend.app.schemas.analytics import TrendPoint
from backend.app.api.deps import get_current_user

router = APIRouter()


@router.get("/risk-trends", response_model=List[TrendPoint])
def get_risk_trends(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get historical risk trends, anomalies, and alert frequencies over time.
    """
    trend_rows = db.query(
        DailyBehavioralFeature.date,
        func.avg(DailyBehavioralFeature.risk_score).label("avg_risk"),
        func.sum(cast(DailyBehavioralFeature.is_anomaly, Integer)).label("anomalies")
    ).group_by(DailyBehavioralFeature.date).order_by(DailyBehavioralFeature.date.desc()).limit(days).all()

    trend = []
    for r in reversed(trend_rows):
        date_str = r[0]
        alert_c = db.query(Alert).filter(Alert.timestamp.like(f"{date_str}%")).count()
        crit_c = db.query(DailyBehavioralFeature).filter(
            DailyBehavioralFeature.date == date_str,
            DailyBehavioralFeature.risk_score >= 75.0
        ).count()
        trend.append(TrendPoint(
            date=date_str,
            risk_avg=round(float(r[1] or 0), 1),
            anomaly_count=int(r[2] or 0),
            alert_count=alert_c,
            critical_count=crit_c
        ))

    return trend


@router.get("/anomalies")
def get_anomalies_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get breakdown of anomaly triggers by feature categories (Logon, Device, File, HTTP, Email).
    """
    total_anomalies = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.is_anomaly == True).count()
    after_hours_logon_anom = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.is_anomaly == True, DailyBehavioralFeature.after_hours_logon > 0).count()
    usb_anom = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.is_anomaly == True, DailyBehavioralFeature.device_connect_count > 0).count()
    sensitive_file_anom = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.is_anomaly == True, DailyBehavioralFeature.sensitive_file_activity > 0).count()
    suspicious_web_anom = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.is_anomaly == True, DailyBehavioralFeature.suspicious_domain_count > 0).count()
    email_spike_anom = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.is_anomaly == True, DailyBehavioralFeature.attachment_count > 3).count()

    return {
        "total_anomalies": total_anomalies,
        "triggers_breakdown": [
            {"category": "After-Hours Logon", "count": after_hours_logon_anom, "percentage": round((after_hours_logon_anom / max(total_anomalies, 1)) * 100, 1)},
            {"category": "Removable USB Activity", "count": usb_anom, "percentage": round((usb_anom / max(total_anomalies, 1)) * 100, 1)},
            {"category": "Sensitive File Exfiltration Risk", "count": sensitive_file_anom, "percentage": round((sensitive_file_anom / max(total_anomalies, 1)) * 100, 1)},
            {"category": "Suspicious Cloud/Web Request", "count": suspicious_web_anom, "percentage": round((suspicious_web_anom / max(total_anomalies, 1)) * 100, 1)},
            {"category": "Abnormal Email Attachment Spikes", "count": email_spike_anom, "percentage": round((email_spike_anom / max(total_anomalies, 1)) * 100, 1)},
        ]
    }
