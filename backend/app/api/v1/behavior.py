"""Behavioral profile and UEBA analysis endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.behavior import BehaviorProfile
from app.models.user import User
from app.schemas.behavior import BehaviorAnalysis, BehaviorProfileRead
from app.services import behavior_service

router = APIRouter(prefix="/behavior", tags=["behavior"])


@router.get(
    "/{employee_id}",
    response_model=BehaviorProfileRead,
    summary="Get the stored behavioral baseline for an employee",
)
def get_behavior_profile(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BehaviorProfile:
    profile = db.scalars(
        select(BehaviorProfile).where(BehaviorProfile.employee_id == employee_id)
    ).first()
    if profile is None:
        # Build it on-the-fly if missing
        try:
            profile = behavior_service.build_profile(db, employee_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No behavior profile found for this employee.",
            )
    return profile


@router.get(
    "/{employee_id}/analysis",
    response_model=BehaviorAnalysis,
    summary="Full behavioral analysis with indicators and peer comparison",
)
def get_behavior_analysis(
    employee_id: uuid.UUID,
    lookback_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BehaviorAnalysis:
    return behavior_service.analyze(db, employee_id, lookback_days=lookback_days)
