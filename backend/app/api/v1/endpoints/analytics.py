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
from datetime import datetime, timedelta, timezone
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.db.mongo import get_mongo_db
from app.models.domain import Employee, RiskCategoryEnum, User
from app.schemas.features import (
    AnomaliesListResponse,
    BehavioralMetricComparison,
    EmployeeBaselineResponse,
    FlaggedAnomalyEmployee,
)
from app.schemas.schemas import (
    DepartmentRisk,
    RiskCalculateRequest,
    RiskCalculateResponse,
    RiskSummaryResponse,
)
from app.services.feature_extraction import (
    extract_all_employee_features,
    extract_employee_features,
)
from app.services.ml_engine import (
    FEATURE_COLUMNS,
    FEATURE_METADATA,
    load_trained_model,
    predict_employee_anomaly,
)
from app.services.scoring import compute_employee_risk
from app.api.v1.endpoints.incidents import auto_trigger_incident

logger = logging.getLogger(__name__)

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
        "specified ``window_hours`` look-back period and dynamically extracts "
        "behavioral feature vectors evaluated by the live Isolation Forest ML model "
        "alongside asset criticality, event frequency, and historical severity.\n\n"
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
            anomaly_score=payload.anomaly_score,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    # ── Auto-trigger incident if score exceeds CRITICAL threshold ────────────
    try:
        emp = db.query(Employee).filter(Employee.emp_id == payload.emp_id).first()
        if emp is not None:
            triggered = auto_trigger_incident(
                emp=emp,
                threat_score=result.threat_score,
                db=db,
            )
            if triggered:
                logger.info(
                    "Incident auto-triggered for emp_id=%s with score=%d (incident_id=%d)",
                    payload.emp_id, result.threat_score, triggered.id,
                )
    except Exception as trigger_err:
        # Never let incident creation failure break the risk response
        logger.warning("Incident auto-trigger failed for %s: %s", payload.emp_id, trigger_err)

    return RiskCalculateResponse(
        emp_id=result.emp_id,
        threat_score=result.threat_score,
        risk_category=result.risk_category,
        anomaly_weight=result.anomaly_weight,
        frequency=result.frequency,
        asset_criticality=result.asset_criticality,
        historical_severity=result.historical_severity,
        evaluated_at=result.evaluated_at,
        privilege_score=result.privilege_score,
        data_access_score=result.data_access_score,
        pattern_deviation_score=result.pattern_deviation_score,
    )


# ─────────────────────────────────────────────────────────────
# GET /api/v1/analytics/anomalies
# ─────────────────────────────────────────────────────────────

@router.get(
    "/anomalies",
    response_model=AnomaliesListResponse,
    summary="List flagged anomalous employees",
    description=(
        "Evaluates the entire employee cohort against the trained Isolation Forest ML "
        "anomaly engine over a sliding telemetry window (default: 14 days). Returns all "
        "flagged outliers sorted by ML anomaly score descending with top risk factor attributions."
    ),
)
async def get_anomalies(
    window_days:    int                   = Query(default=14, ge=1, le=365, description="Telemetry lookback window in days"),
    only_anomalies: bool                  = Query(default=True, description="Filter to only anomalous employees (score >= 50 or is_anomaly)"),
    limit:          int                   = Query(default=50, ge=1, le=500, description="Max employees to return"),
    db:             Session               = Depends(get_db),
    mdb:            AsyncIOMotorDatabase  = Depends(get_mongo_db),
    _:              User                  = Depends(get_current_active_user),
) -> AnomaliesListResponse:
    """
    Extracts behavioral telemetry feature vectors for all monitored employees,
    executes real-time Isolation Forest inference, and ranks anomalies by threat score.
    """
    # 1. Load trained ML model & scaler
    try:
        model, scaler, _ = load_trained_model()
    except Exception as exc:
        logger.warning("ML engine artifacts not ready: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML anomaly engine artifacts unavailable: {exc}. Run model training first.",
        ) from exc

    # 2. Extract feature vectors for all employees
    vectors = await extract_all_employee_features(window_days=window_days, db=db, mdb=mdb)
    if not vectors:
        return AnomaliesListResponse(
            total_evaluated=0,
            total_anomalies=0,
            window_days=window_days,
            anomalies=[],
        )

    # 3. Fetch employee domain records for metadata enrichment
    employees = db.query(Employee).all()
    emp_map = {e.emp_id: e for e in employees}

    # 4. Perform anomaly inference for each employee
    flagged_list: list[FlaggedAnomalyEmployee] = []
    total_anomalies = 0

    for vec in vectors:
        pred = predict_employee_anomaly(vec, model=model, scaler=scaler)
        emp = emp_map.get(vec.employee_id)

        is_flagged = bool(pred["is_anomaly"] or pred["anomaly_score"] >= 50.0)
        if is_flagged:
            total_anomalies += 1

        if not only_anomalies or is_flagged:
            flagged_list.append(
                FlaggedAnomalyEmployee(
                    employee_id=vec.employee_id,
                    first_name=emp.first_name if emp else "",
                    last_name=emp.last_name if emp else "",
                    department=emp.department if emp else "",
                    designation=emp.designation if emp else "",
                    anomaly_score=pred["anomaly_score"],
                    raw_decision_score=pred["raw_decision_score"],
                    is_anomaly=pred["is_anomaly"],
                    severity=pred["severity"],
                    risk_category=emp.risk_category.value if emp else "LOW",
                    contributing_risk_factors=pred["contributing_risk_factors"],
                    features=pred["features"],
                    evaluated_at=pred["evaluated_at"],
                )
            )

    # Sort descending by anomaly score
    flagged_list.sort(key=lambda x: x.anomaly_score, reverse=True)

    return AnomaliesListResponse(
        total_evaluated=len(vectors),
        total_anomalies=total_anomalies,
        window_days=window_days,
        anomalies=flagged_list[:limit],
    )


# ─────────────────────────────────────────────────────────────
# GET /api/v1/analytics/employee/{employee_id}/baseline
# ─────────────────────────────────────────────────────────────

@router.get(
    "/employee/{employee_id}/baseline",
    response_model=EmployeeBaselineResponse,
    summary="Get employee behavioral baseline vs real-time deviations",
    description=(
        "Retrieves an employee's behavioral feature vector over a sliding window "
        "and compares each metric against the population baseline mean and standard "
        "deviation, detailing Z-scores, percentage deviations, and top anomaly risk factors."
    ),
)
async def get_employee_baseline(
    employee_id: str,
    window_days: int                   = Query(default=14, ge=1, le=365, description="Telemetry lookback window in days"),
    db:          Session               = Depends(get_db),
    mdb:         AsyncIOMotorDatabase  = Depends(get_mongo_db),
    _:           User                  = Depends(get_current_active_user),
) -> EmployeeBaselineResponse:
    """
    Computes an individual employee's feature metrics and evaluates deviations
    against population baselines derived from the trained ML scaler.
    """
    # 1. Resolve employee in PostgreSQL
    emp = db.query(Employee).filter(Employee.emp_id == employee_id).first()
    if emp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{employee_id}' not found.",
        )

    # 2. Load model & scaler
    try:
        model, scaler, _ = load_trained_model()
    except Exception as exc:
        logger.warning("ML engine artifacts not ready: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML anomaly engine artifacts unavailable: {exc}. Run model training first.",
        ) from exc

    # 3. Extract employee feature vector
    vec = await extract_employee_features(employee_id=employee_id, window_days=window_days, mdb=mdb)

    since_utc = datetime.now(timezone.utc) - timedelta(days=window_days)
    profile_logs = await mdb["activity_logs"].find(
        {"emp_id": employee_id, "timestamp": {"$gte": since_utc}},
        {"_id": 0, "event_type": 1, "severity": 1, "payload": 1, "timestamp": 1},
    ).to_list(length=10_000)
    profile_snapshot = None
    try:
        from app.services.baseline import persist_user_baseline

        profile_snapshot = await persist_user_baseline(
            emp=emp,
            logs=profile_logs,
            db=db,
            mdb=mdb,
            window_days=window_days,
        )
        db.refresh(emp)
    except Exception as base_err:
        logger.warning("Baseline matrix persist skipped for %s: %s", employee_id, base_err)

    # 4. Compute feature-by-feature comparisons
    means = scaler.mean_ if hasattr(scaler, "mean_") and scaler.mean_ is not None else [0.0] * len(FEATURE_COLUMNS)
    scales = scaler.scale_ if hasattr(scaler, "scale_") and scaler.scale_ is not None else [1.0] * len(FEATURE_COLUMNS)

    metrics: list[BehavioralMetricComparison] = []
    for idx, col in enumerate(FEATURE_COLUMNS):
        current_val = float(getattr(vec, col, 0.0))
        mean_val = float(means[idx]) if idx < len(means) else 0.0
        std_val = float(scales[idx]) if idx < len(scales) and scales[idx] > 1e-6 else 1.0

        z_score = round((current_val - mean_val) / std_val, 2) if std_val > 1e-6 else 0.0
        dev_pct = round(((current_val - mean_val) / max(mean_val, 1e-2)) * 100.0, 1)

        if z_score >= 2.5:
            metric_status = "CRITICAL"
        elif z_score >= 1.0:
            metric_status = "ELEVATED"
        else:
            metric_status = "NORMAL"

        meta = FEATURE_METADATA.get(col, {"label": col, "unit": "", "description": ""})
        metrics.append(
            BehavioralMetricComparison(
                feature_name=col,
                feature_label=meta["label"],
                unit=meta["unit"],
                current_value=round(current_val, 2),
                baseline_mean=round(mean_val, 2),
                baseline_std=round(std_val, 2),
                z_score=z_score,
                deviation_pct=dev_pct,
                status=metric_status,
                description=meta["description"],
            )
        )

    # 5. Predict anomaly & risk factors
    pred = predict_employee_anomaly(vec, model=model, scaler=scaler)

    return EmployeeBaselineResponse(
        employee_id=employee_id,
        first_name=emp.first_name,
        last_name=emp.last_name,
        department=emp.department,
        designation=emp.designation,
        window_days=window_days,
        anomaly_score=pred["anomaly_score"],
        is_anomaly=pred["is_anomaly"],
        severity=pred["severity"],
        metrics=metrics,
        top_deviations=pred["contributing_risk_factors"],
        evaluated_at=pred["evaluated_at"],
        typical_login_hour_start=(
            emp.behavioral_baseline.typical_login_hour_start
            if emp.behavioral_baseline
            else int((profile_snapshot or {}).get("typical_login_hour_start", 8))
        ),
        typical_login_hour_end=(
            emp.behavioral_baseline.typical_login_hour_end
            if emp.behavioral_baseline
            else int((profile_snapshot or {}).get("typical_login_hour_end", 18))
        ),
        peak_login_hour=(
            emp.behavioral_baseline.peak_login_hour
            if emp.behavioral_baseline
            else int((profile_snapshot or {}).get("peak_login_hour", 9))
        ),
        avg_download_mb_per_day=(
            emp.behavioral_baseline.avg_download_mb_per_day
            if emp.behavioral_baseline
            else float((profile_snapshot or {}).get("avg_download_mb_per_day", 0.0))
        ),
        avg_upload_mb_per_day=(
            emp.behavioral_baseline.avg_upload_mb_per_day
            if emp.behavioral_baseline
            else float((profile_snapshot or {}).get("avg_upload_mb_per_day", 0.0))
        ),
        avg_daily_logins=(
            emp.behavioral_baseline.avg_daily_logins
            if emp.behavioral_baseline
            else float((profile_snapshot or {}).get("avg_daily_logins", 0.0))
        ),
    )

