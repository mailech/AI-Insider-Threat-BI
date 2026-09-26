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
def get_anomalies(
    user_id: Optional[str] = None,
    severity: Optional[str] = None,
    min_risk: Optional[float] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get all detected behavioral anomalies detected by Isolation Forest and statistical baseline deviations.
    """
    query = db.query(DailyBehavioralFeature).filter(DailyBehavioralFeature.is_anomaly == True)

    if user_id:
        query = query.filter(DailyBehavioralFeature.user_id.ilike(f"%{user_id}%"))
    if severity and severity != "ALL":
        query = query.filter(DailyBehavioralFeature.severity == severity)
    if min_risk is not None:
        query = query.filter(DailyBehavioralFeature.risk_score >= min_risk)

    return query.order_by(desc(DailyBehavioralFeature.risk_score), desc(DailyBehavioralFeature.date)).offset(skip).limit(limit).all()
