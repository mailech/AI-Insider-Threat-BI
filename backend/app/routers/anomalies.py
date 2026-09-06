from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])


@router.get("", response_model=list[schemas.AnomalyOut])
def list_anomalies(
    employee_id: str | None = None,
    category: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Anomaly)
    if employee_id:
        q = q.filter(models.Anomaly.employee_id == employee_id)
    if category:
        q = q.filter(models.Anomaly.category == category)
    return q.order_by(models.Anomaly.detected_at.desc()).limit(limit).all()
