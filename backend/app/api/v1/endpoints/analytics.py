"""
ITBIS — Analytics & Risk Scoring Endpoints  (Module 6 / Step 6)

Routes
------
GET  /api/v1/analytics/summary
    Returns an aggregated risk posture overview:
      • total employee count
      • number of HIGH + CRITICAL employees
      • number of CRITICAL-only employees
      • average threat score (0–100) across all employees
      • risk_distribution — per-category employee count
      • department_breakdown — per-dept avg score + high-risk count

POST /api/v1/analytics/calculate-risk
    Triggers a manual risk score re-calculation for a given emp_id.
    Pulls recent telemetry from MongoDB, runs the multi-factor scoring engine,
    and persists the updated risk_score + risk_category to PostgreSQL.

Access Control
--------------
Both endpoints require a valid Bearer JWT (any active ITBIS user role).
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.db.mongo import get_mongo_db
from app.models.domain import Employee, RiskCategoryEnum, User
from app.schemas.schemas import (
    DepartmentRisk,
    RiskCalculateRequest,
    RiskCalculateResponse,
    RiskSummaryResponse,
)
from app.services.scoring import compute_employee_risk

router = APIRouter(prefix="/analytics", tags=["Analytics & Risk Scoring"])


# ─────────────────────────────────────────────────────────────
# GET /api/v1/analytics/summary
# ─────────────────────────────────────────────────────────────

@router.get(
    "/summary",
    response_model=RiskSummaryResponse,
    summary="Overall risk posture summary",
    description=(
        "Returns aggregate metrics for the current risk posture across all "
        "monitored employees: total count, number in HIGH or CRITICAL risk bands, "
        "number in CRITICAL band only, the fleet-wide average threat score (0–100), "
        "a per-risk-category distribution map, and a per-department breakdown. "
        "Risk scores are derived from the most recent risk re-calculation stored "
        "in PostgreSQL. Requires any active ITBIS user account."
    ),
)
def get_risk_summary(
    db: Session = Depends(get_db),
    _:  User    = Depends(get_current_active_user),
) -> RiskSummaryResponse:
    """
    Aggregate and return the current risk posture from PostgreSQL.

    No MongoDB queries are performed here — this endpoint reflects the
    *persisted* risk state (last calculate-risk run or ingestion update).
    For a live recalculation use POST /analytics/calculate-risk.
    """
    employees: list[Employee] = db.query(Employee).all()
    total: int = len(employees)

    high_risk_count: int = sum(
        1 for e in employees
        if e.risk_category in (RiskCategoryEnum.HIGH, RiskCategoryEnum.CRITICAL)
    )
    critical_count: int = sum(
        1 for e in employees
        if e.risk_category == RiskCategoryEnum.CRITICAL
    )

    # risk_score stored as 0.0–1.0; multiply by 100 for human-readable display
    average_threat_score: float = (
        round(sum(e.risk_score for e in employees) / total * 100, 2)
        if total > 0
        else 0.0
    )

    # ── Risk distribution (count per category) ────────────────
    risk_distribution: dict[str, int] = {cat.value: 0 for cat in RiskCategoryEnum}
    for e in employees:
        risk_distribution[e.risk_category.value] += 1

    # ── Department breakdown ──────────────────────────────────
    dept_map: dict[str, list[Employee]] = defaultdict(list)
    for e in employees:
        dept_map[e.department].append(e)

    department_breakdown: list[DepartmentRisk] = []
    for dept_name, dept_emps in sorted(dept_map.items()):
        dept_count = len(dept_emps)
        dept_avg   = round(
            sum(e.risk_score for e in dept_emps) / dept_count * 100, 2
        )
        dept_high  = sum(
            1 for e in dept_emps
            if e.risk_category in (RiskCategoryEnum.HIGH, RiskCategoryEnum.CRITICAL)
        )
        department_breakdown.append(
            DepartmentRisk(
                department=dept_name,
                employee_count=dept_count,
                avg_risk_score=dept_avg,
                high_risk_count=dept_high,
            )
        )

    # Sort departments by avg_risk_score descending for charts
    department_breakdown.sort(key=lambda d: d.avg_risk_score, reverse=True)

    return RiskSummaryResponse(
        total_employees=total,
        high_risk_count=high_risk_count,
        critical_count=critical_count,
        average_threat_score=average_threat_score,
        evaluated_at=datetime.now(tz=timezone.utc),
        risk_distribution=risk_distribution,
        department_breakdown=department_breakdown,
    )


# ─────────────────────────────────────────────────────────────
# POST /api/v1/analytics/calculate-risk
# ─────────────────────────────────────────────────────────────

@router.post(
    "/calculate-risk",
    response_model=RiskCalculateResponse,
    summary="Trigger manual risk score re-calculation",
    description=(
        "Manually triggers a full risk score re-calculation for the employee "
        "identified by **emp_id**. "
        "The engine queries MongoDB ``activity_logs`` for events within the "
        "specified ``window_hours`` look-back period and evaluates four factors:\n\n"
        "| Factor | Weight |\n"
        "|---|---|\n"
        "| Anomaly weight (worst-case event type) | 35 % |\n"
        "| Frequency (log-scaled event count)     | 25 % |\n"
        "| Asset criticality (device/IP mix)      | 25 % |\n"
        "| Historical severity (mean of events)   | 15 % |\n\n"
        "The resulting ``threat_score`` (0–100) and its ``risk_category`` band "
        "are persisted back to PostgreSQL. "
        "Returns all factor values for auditability. "
        "Requires any active ITBIS user account."
    ),
)
async def calculate_risk(
    payload: RiskCalculateRequest,
    db:      Session               = Depends(get_db),
    mdb:     AsyncIOMotorDatabase  = Depends(get_mongo_db),
    _:       User                  = Depends(get_current_active_user),
) -> RiskCalculateResponse:
    """
    Orchestrate a risk re-calculation via the scoring service and return
    the full audit trail of factors and the resulting threat score.

    Raises 404 if ``emp_id`` is not found in PostgreSQL.
    """
    try:
        result = await compute_employee_risk(
            emp_id=payload.emp_id,
            db=db,
            mdb=mdb,
            window_hours=payload.window_hours,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return RiskCalculateResponse(
        emp_id=result.emp_id,
        threat_score=result.threat_score,
        risk_category=result.risk_category,
        anomaly_weight=result.anomaly_weight,
        frequency=result.frequency,
        asset_criticality=result.asset_criticality,
        historical_severity=result.historical_severity,
        evaluated_at=result.evaluated_at,
    )
