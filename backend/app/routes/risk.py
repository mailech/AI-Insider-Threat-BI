from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.risk import RiskResponse
from app.services.risk_service import RiskService
from app.auth.roles import require_role


router = APIRouter(
    prefix="/risk",
    tags=["Risk Intelligence"]
)


# ============================================================
# GET RISK DISTRIBUTION
# ============================================================

@router.get(
    "/dashboard/distribution"
)
def risk_distribution(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):

    return RiskService.get_risk_summary(db)


# ============================================================
# CALCULATE RISK FOR ALL EMPLOYEES
#
# This is the important endpoint.
#
# It reads all employees from:
# employee_behavior_features
#
# and generates/updates risk records for all employees.
# ============================================================

@router.post(
    "/calculate-all"
)
def calculate_all_risks(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):

    result = RiskService.calculate_all_risks(db)

    return result


# ============================================================
# GET ALL RISK RECORDS
# ============================================================

@router.get(
    "/",
    response_model=list[RiskResponse]
)
def get_all_risks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):

    return RiskService.get_all_risks(
        db,
        skip,
        limit
    )


# ============================================================
# GET RISK FOR ONE EMPLOYEE
# ============================================================

@router.get(
    "/{user_id}",
    response_model=RiskResponse
)
def get_risk_by_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):

    risk = RiskService.get_risk_by_employee(
        db,
        user_id
    )

    if not risk:

        raise HTTPException(
            status_code=404,
            detail="Risk record not found for this user"
        )

    return risk