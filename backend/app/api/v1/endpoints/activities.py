from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.feature import DailyBehavioralFeature
from backend.app.schemas.feature import DailyBehavioralFeatureResponse
from backend.app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=List[DailyBehavioralFeatureResponse])
def get_activities(
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    anomaly_only: bool = False,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Search and filter daily aggregated user activities across logon, device, file, http, and email.
    """
    query = db.query(DailyBehavioralFeature)

    if user_id:
        query = query.filter(DailyBehavioralFeature.user_id.ilike(f"%{user_id}%"))
    if start_date:
        query = query.filter(DailyBehavioralFeature.date >= start_date)
    if end_date:
        query = query.filter(DailyBehavioralFeature.date <= end_date)
    if anomaly_only:
        query = query.filter(DailyBehavioralFeature.is_anomaly == True)
    if severity and severity != "ALL":
        query = query.filter(DailyBehavioralFeature.severity == severity)

    return query.order_by(desc(DailyBehavioralFeature.date)).offset(skip).limit(limit).all()


@router.get("/timeline/{user_id}")
def get_forensic_timeline(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Reconstruct granular chronological forensic event timeline across Logon, USB, File, Web, and Email.
    """
    from ml.forensics.timeline import ForensicTimelineGenerator
    generator = ForensicTimelineGenerator()
    timeline = generator.get_user_timeline(user_id=user_id, start_date=start_date, end_date=end_date, limit=limit)
    return {
        "user_id": user_id,
        "event_count": len(timeline),
        "events": timeline
    }

