from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from threading import Lock

from app.database import get_db
from app.schemas.risk import RiskResponse
from app.services.risk_service import RiskService
from app.auth.roles import require_role


router = APIRouter(
    prefix="/risk",
    tags=["Risk Intelligence"]
)
risk_calculation_lock = Lock()


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

    if not risk_calculation_lock.acquire(
        blocking=False
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Risk calculation is already running. "
                "Please wait for it to finish."
            )
        )

    try:

        result = RiskService.calculate_all_risks(
            db
        )

        return result

    finally:

        risk_calculation_lock.release()




# ============================================================
# CALCULATE RISK FOR ONE EMPLOYEE
# ============================================================

@router.post(
    "/calculate/{user_id}"
)
def calculate_risk_for_employee(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"]))
):

    try:

        result = RiskService.calculate_and_save(
            db,
            user_id
        )

        return result

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )


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

    risk = RiskService.get_risk_by_user(
        db,
        user_id
    )

    if not risk:

        raise HTTPException(
            status_code=404,
            detail="Risk record not found for this user"
        )

    return risk