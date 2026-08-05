from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.risk import Risk
from app.schemas.risk import RiskCreate, RiskResponse
from app.auth.roles import require_role

router = APIRouter(
    prefix="/risk",
    tags=["Risk Management"]
)


# --------------------------------------------------
# Get All Risk Records
# Accessible by: Admin, Security Analyst
# --------------------------------------------------
@router.get("/", response_model=list[RiskResponse])
def get_all_risks(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Security Analyst"]))
):
    risks = db.query(Risk).all()
    return risks


# --------------------------------------------------
# Create Risk Record
# Accessible by: Admin Only
# --------------------------------------------------
@router.post("/", response_model=RiskResponse)
def create_risk(
    risk: RiskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin"]))
):
    new_risk = Risk(
        employee_id=risk.employee_id,
        risk_score=risk.risk_score,
        risk_level=risk.risk_level
    )

    db.add(new_risk)
    db.commit()
    db.refresh(new_risk)

    return new_risk