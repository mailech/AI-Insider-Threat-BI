from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.activity import Activity
from app.models.risk import Risk
from app.auth.roles import require_role

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Security Analyst"]))
):
    return {
        "total_employees": db.query(Employee).count(),
        "total_activities": db.query(Activity).count(),
        "total_risks": db.query(Risk).count()
    }


@router.get("/high-risk-users")
def high_risk_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Security Analyst"]))
):
    return db.query(Risk).filter(Risk.risk_level == "High").all()


@router.get("/recent-activities")
def recent_activities(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Security Analyst"]))
):
    return (
        db.query(Activity)
        .order_by(Activity.id.desc())
        .limit(10)
        .all()
    )


@router.get("/risk-distribution")
def risk_distribution(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Security Analyst"]))
):
    return {
        "Low": db.query(Risk).filter(Risk.risk_level == "Low").count(),
        "Medium": db.query(Risk).filter(Risk.risk_level == "Medium").count(),
        "High": db.query(Risk).filter(Risk.risk_level == "High").count()
    }