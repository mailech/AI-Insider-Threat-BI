from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.activity import Activity
from app.models.risk import Risk

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# Dashboard Summary
@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):

    total_employees = db.query(Employee).count()
    total_activities = db.query(Activity).count()
    total_risks = db.query(Risk).count()

    return {
        "total_employees": total_employees,
        "total_activities": total_activities,
        "total_risks": total_risks
    }


# High Risk Employees
@router.get("/high-risk-users")
def high_risk_users(db: Session = Depends(get_db)):

    users = db.query(Risk).filter(Risk.risk_level == "High").all()

    return users


# Recent Activities
@router.get("/recent-activities")
def recent_activities(db: Session = Depends(get_db)):

    activities = (
        db.query(Activity)
        .order_by(Activity.id.desc())
        .limit(10)
        .all()
    )

    return activities


# Risk Distribution
@router.get("/risk-distribution")
def risk_distribution(db: Session = Depends(get_db)):

    low = db.query(Risk).filter(Risk.risk_level == "Low").count()
    medium = db.query(Risk).filter(Risk.risk_level == "Medium").count()
    high = db.query(Risk).filter(Risk.risk_level == "High").count()

    return {
        "Low": low,
        "Medium": medium,
        "High": high
    }