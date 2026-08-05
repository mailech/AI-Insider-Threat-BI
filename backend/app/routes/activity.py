from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.schemas.activity import ActivityCreate, ActivityResponse
from app.auth.roles import require_role

router = APIRouter(
    prefix="/activities",
    tags=["Activity Management"]
)


# --------------------------------------------------
# Get All Activities
# Accessible by: Admin, Security Analyst
# --------------------------------------------------
@router.get("/", response_model=list[ActivityResponse])
def get_all_activities(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Security Analyst"]))
):
    activities = db.query(Activity).all()
    return activities


# --------------------------------------------------
# Create Activity
# Accessible by: Admin Only
# --------------------------------------------------
@router.post("/", response_model=ActivityResponse)
def create_activity(
    activity: ActivityCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin"]))
):
    new_activity = Activity(
        employee_id=activity.employee_id,
        activity_type=activity.activity_type,
        file_name=activity.file_name,
        device=activity.device,
        ip_address=activity.ip_address,
        risk_level=activity.risk_level
    )

    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)

    return new_activity