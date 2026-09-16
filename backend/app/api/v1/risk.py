"""Risk scoring endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.employee import Employee
from app.models.user import User
from app.schemas.risk import FleetRiskEntry, FleetRiskSummary, RiskScoreRead
from app.services import risk_service

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post(
    "/compute/{employee_id}",
    response_model=RiskScoreRead,
    summary="Compute and persist a risk score for a single employee",
)
def compute_risk(
    employee_id: uuid.UUID,
    lookback_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> object:
    emp = db.get(Employee, employee_id)
    if emp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    try:
        return risk_service.compute_risk(db, employee_id, lookback_days=lookback_days)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML service unavailable: {exc}",
        ) from exc


@router.post(
    "/compute-fleet",
    response_model=list[RiskScoreRead],
    summary="Compute risk scores for all employees in one batch",
)
def compute_fleet(
    lookback_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    try:
        return risk_service.compute_fleet(db, lookback_days=lookback_days)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML service unavailable: {exc}",
        ) from exc


@router.get(
    "/fleet-summary",
    response_model=FleetRiskSummary,
    summary="Aggregated fleet risk summary with band distribution",
)
def fleet_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FleetRiskSummary:
    scores_map = risk_service.latest_scores(db)
    employees = {
        emp.id: emp
        for emp in db.scalars(select(Employee))
    }

    results: list[FleetRiskEntry] = []
    band_counts: dict[str, int] = {}
    total_score = 0.0

    for employee_id, score in scores_map.items():
        emp = employees.get(employee_id)
        if emp is None:
            continue
        band_key = score.risk_band.value if hasattr(score.risk_band, "value") else str(score.risk_band)
        band_counts[band_key] = band_counts.get(band_key, 0) + 1
        total_score += score.risk_score
        results.append(
            FleetRiskEntry(
                employee_id=employee_id,
                employee_code=emp.employee_code,
                employee_name=emp.full_name,
                department=emp.department,
                risk_score=score.risk_score,
                risk_band=score.risk_band,
                decision_function_score=score.decision_function_score,
                computed_at=score.computed_at,
            )
        )

    results.sort(key=lambda x: x.risk_score, reverse=True)
    fleet_avg = round(total_score / len(results), 2) if results else 0.0

    return FleetRiskSummary(
        total_scored=len(results),
        fleet_average_score=fleet_avg,
        band_distribution=band_counts,
        results=results,
        service_available=True,
    )


@router.get(
    "/employee/{employee_id}/history",
    response_model=list[RiskScoreRead],
    summary="Historical risk scores for a single employee",
)
def risk_history(
    employee_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    emp = db.get(Employee, employee_id)
    if emp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    return risk_service.score_history(db, employee_id, limit=limit)
