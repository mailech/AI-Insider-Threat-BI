from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/api/risk-scores", tags=["risk"])


@router.get("", response_model=list[schemas.RiskScoreOut])
def list_risk_scores(
    employee_id: str | None = None,
    latest_only: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if employee_id:
        q = db.query(models.RiskScore).filter(models.RiskScore.employee_id == employee_id)
        return q.order_by(models.RiskScore.computed_at.desc()).limit(50).all()

    if latest_only:
        # latest score per employee
        employees = db.query(models.Employee.id).all()
        results = []
        for (emp_id,) in employees:
            latest = (
                db.query(models.RiskScore)
                .filter(models.RiskScore.employee_id == emp_id)
                .order_by(models.RiskScore.computed_at.desc())
                .first()
            )
            if latest:
                results.append(latest)
        results.sort(key=lambda r: r.score, reverse=True)
        return results

    return db.query(models.RiskScore).order_by(models.RiskScore.computed_at.desc()).limit(200).all()
