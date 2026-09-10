from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.behavior_analysis import (
    BehaviorAnalysisResponse
)

from app.services.behavior_analysis_service import (
    BehaviorAnalysisService
)


router = APIRouter(
    prefix="/behavior",
    tags=["Behavior Analysis"]
)


# ============================================================
# GET BEHAVIOR BY EMPLOYEE
# ============================================================

@router.get(
    "/{employee_id}",
    response_model=BehaviorAnalysisResponse
)
def get_employee_behavior(
    employee_id: str,
    db: Session = Depends(get_db)
):

    result = (
        BehaviorAnalysisService
        .get_employee_behavior(
            db,
            employee_id
        )
    )

    if not result:

        raise HTTPException(
            status_code=404,
            detail=(
                "Behavior data not found "
                f"for employee {employee_id}"
            )
        )

    return result


# ============================================================
# GET ALL BEHAVIOR
# ============================================================

@router.get(
    "/",
    response_model=list[BehaviorAnalysisResponse]
)
def get_all_behavior(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):

    return (
        BehaviorAnalysisService
        .get_all_behavior(
            db,
            skip,
            limit
        )
    )