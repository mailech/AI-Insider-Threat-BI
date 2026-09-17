"""
ITBIS — Multi-Factor Threat Risk Scoring Engine  (Module 6 / Step 6)

Public API
----------
calculate_threat_score()   — deterministic, pure Python, no I/O
compute_employee_risk()    — async orchestrator: reads MongoDB telemetry +
                              PostgreSQL employee/assets, persists updated
                              risk_score / risk_category back to PostgreSQL.
score_to_risk_category()   — maps a 0–100 score to a RiskCategoryEnum band.

Scoring Formula
---------------
Four factors, weighted sum → normalised to 0–100:

    Factor                Weight   Notes
    ─────────────────     ──────   ─────────────────────────────────────────
    anomaly_weight         35 %   highest anomaly weight seen in the window
    frequency              25 %   log-scaled so bursts don't trivially max score
    asset_criticality      25 %   derived from device/IP mix assigned to employee
    historical_severity    15 %   mean severity weight of events in the window

Risk Bands
----------
     0–29  → LOW
    30–59  → MEDIUM
    60–79  → HIGH
    80–100 → CRITICAL
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session

from app.models.domain import AssetTypeEnum, Employee, RiskCategoryEnum

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Lookup tables
# ─────────────────────────────────────────────────────────────

# Severity label → numeric weight  (used to average historical_severity)
_SEVERITY_WEIGHTS: Dict[str, float] = {
    "CRITICAL": 1.00,
    "HIGH":     0.80,
    "MEDIUM":   0.50,
    "LOW":      0.25,
    "INFO":     0.05,
}

# Event type → anomaly weight  (higher = more suspicious)
# Includes both Milestone 1 canonical types and legacy sensor type names.
_EVENT_ANOMALY_WEIGHTS: Dict[str, float] = {
    # ── Milestone 1 canonical event types ─────────────────────────────────
    "PRIVILEGE_CHANGE":     0.95,   # access escalation or permission modification
    "DATA_TRANSFER":        0.85,   # large/bulk data movement
    "REMOTE_ACCESS":        0.80,   # RDP, VPN, SSH outside normal hours/location
    "FILE_DOWNLOAD":        0.70,   # bulk or sensitive file download
    "FILE_UPLOAD":          0.65,   # outbound upload to external service
    "EMAIL_ACTIVITY":       0.60,   # forwarding, BCC exfil, bulk send
    "LOGIN":                0.45,   # failed/repeated login attempts
    # ── Legacy sensor event types (retained for backwards-compatibility) ───
    "DATA_EXFILTRATION":    1.00,
    "PRIVILEGE_ESCALATION": 0.95,
    "USB_INSERTED":         0.85,
    "SUSPICIOUS_PROCESS":   0.80,
    "FILE_DELETE":          0.75,
    "LARGE_DOWNLOAD":       0.70,
    "NETWORK_SCAN":         0.70,
    "AFTER_HOURS_ACCESS":   0.65,
    "EMAIL_FORWARD":        0.60,
    "FILE_ACCESS":          0.50,
    "LOGIN_ATTEMPT":        0.45,
}
_DEFAULT_ANOMALY_WEIGHT: float = 0.35   # fallback for unknown event types

# Asset type → criticality score used in weighted-mean calculation
_ASSET_CRITICALITY: Dict[str, float] = {
    AssetTypeEnum.DEVICE.value: 0.90,
    AssetTypeEnum.IP.value:     0.60,
}
_NO_ASSET_CRITICALITY: float = 0.30   # risk floor when employee has no assets


# ─────────────────────────────────────────────────────────────
# Band helper
# ─────────────────────────────────────────────────────────────

def score_to_risk_category(score: int) -> RiskCategoryEnum:
    """
    Map a 0–100 integer threat score to a ``RiskCategoryEnum`` band.

    Thresholds (aligned with seed data and domain model)
    ----------
     0–29  → LOW
    30–59  → MEDIUM
    60–79  → HIGH
    80–100 → CRITICAL
    """
    if score >= 80:
        return RiskCategoryEnum.CRITICAL
    if score >= 60:
        return RiskCategoryEnum.HIGH
    if score >= 30:
        return RiskCategoryEnum.MEDIUM
    return RiskCategoryEnum.LOW


# ─────────────────────────────────────────────────────────────
# Core scoring engine — pure, deterministic, no I/O
# ─────────────────────────────────────────────────────────────

def calculate_threat_score(
    anomaly_weight: float,
    frequency: int,
    asset_criticality: float,
    historical_severity: float,
    anomaly_score: float | None = None,
) -> int:
    """
    Compute a 0–100 threat score from four normalised input factors.

    Parameters
    ----------
    anomaly_weight : float [0.0–1.0]
        How anomalous the dominant event type is for this employee.
        Use the *highest* anomaly weight observed across all events in the
        evaluation window (worst-case principle).
    frequency : int [0–∞]
        Raw count of telemetry events in the evaluation window.
        Log-scaled internally so that a burst of 100 events saturates
        this factor (score component = 1.0).
    asset_criticality : float [0.0–1.0]
        Weighted criticality of assets assigned to the employee.
        Devices (0.90) are weighted higher than IP-only assets (0.60).
    historical_severity : float [0.0–1.0]
        Mean severity weight of events in the evaluation window,
        derived from the ``_SEVERITY_WEIGHTS`` lookup table.
    anomaly_score : float | None, optional
        External ML model anomaly score [0.0–1.0]. If provided, it overrides
        the static rule-based `anomaly_weight`. If None, fallback to `anomaly_weight`.

    Returns
    -------
    int
        Threat score in the closed range [0, 100].

    Formula
    -------
    raw  = 0.35 * effective_anomaly
         + 0.25 * log_scale(frequency)
         + 0.25 * asset_criticality
         + 0.15 * historical_severity

    score = round(raw * 100)

    where:
      effective_anomaly = anomaly_score if anomaly_score is not None else anomaly_weight
      log_scale(n)      = min(log1p(n) / log1p(100), 1.0)
    """
    # Clamp continuous inputs to [0.0, 1.0]
    anomaly_weight      = max(0.0, min(1.0, float(anomaly_weight)))
    asset_criticality   = max(0.0, min(1.0, float(asset_criticality)))
    historical_severity = max(0.0, min(1.0, float(historical_severity)))

    # Use ML model anomaly score if provided, else fallback to rule-based anomaly_weight
    effective_anomaly: float = (
        max(0.0, min(1.0, float(anomaly_score)))
        if anomaly_score is not None
        else anomaly_weight
    )

    # Log-scale frequency: 100 events → 1.0, 0 events → 0.0
    freq_scaled: float = min(
        math.log1p(max(0, int(frequency))) / math.log1p(100),
        1.0,
    )

    raw: float = (
        0.35 * effective_anomaly
        + 0.25 * freq_scaled
        + 0.25 * asset_criticality
        + 0.15 * historical_severity
    )
    return round(raw * 100)


# ─────────────────────────────────────────────────────────────
# Result container
# ─────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class EmployeeRiskResult:
    """Immutable snapshot of a completed risk evaluation."""

    emp_id:              str
    threat_score:        int                # 0–100
    risk_category:       RiskCategoryEnum
    anomaly_weight:      float
    frequency:           int
    asset_criticality:   float
    historical_severity: float
    evaluated_at:        datetime


# ─────────────────────────────────────────────────────────────
# Async orchestrator — reads Mongo + Postgres, writes back
# ─────────────────────────────────────────────────────────────

async def compute_employee_risk(
    emp_id: str,
    db: Session,
    mdb: AsyncIOMotorDatabase,
    window_hours: int = 24,
    anomaly_score: float | None = None,
) -> EmployeeRiskResult:
    """
    Orchestrate a full risk re-calculation for a single employee.

    Steps
    -----
    1. Resolve ``emp_id`` in PostgreSQL (raises ``ValueError`` if missing).
    2. Query MongoDB ``activity_logs`` collection for events within
       the last ``window_hours`` hours.
    3. Derive the four scoring factors:
        - ``anomaly_weight``      — highest anomaly weight seen in the window
        - ``frequency``           — raw event count
        - ``asset_criticality``   — weighted mean across employee's assets
        - ``historical_severity`` — mean severity weight of window events
    4. Call ``calculate_threat_score()`` to produce a 0–100 score.
    5. Map score → ``RiskCategoryEnum`` via ``score_to_risk_category()``.
    6. Persist ``risk_score`` (stored as 0.0–1.0) and ``risk_category``
       back to PostgreSQL.
    7. Return an ``EmployeeRiskResult`` dataclass.

    Parameters
    ----------
    emp_id        : str  — human-readable employee ID (e.g. ``"emp_4091"``)
    db            : sqlalchemy.orm.Session — PostgreSQL session
    mdb           : AsyncIOMotorDatabase   — Motor MongoDB database handle
    window_hours  : int  — look-back window in hours (default 24)
    anomaly_score : float | None, optional — external ML model anomaly score [0.0–1.0]

    Raises
    ------
    ValueError
        If ``emp_id`` does not exist in PostgreSQL.
    """
    # ── Step 1: Resolve employee in PostgreSQL ────────────────
    employee: Employee | None = (
        db.query(Employee).filter(Employee.emp_id == emp_id).first()
    )
    if employee is None:
        raise ValueError(f"Employee '{emp_id}' not found.")

    # ── Step 2: Fetch telemetry from MongoDB ──────────────────
    since: datetime = datetime.now(tz=timezone.utc) - timedelta(hours=window_hours)
    cursor = mdb["activity_logs"].find(
        {"emp_id": emp_id, "timestamp": {"$gte": since}},
        {"_id": 0, "event_type": 1, "severity": 1},
    )
    logs: List[Dict[str, Any]] = await cursor.to_list(length=10_000)
    frequency: int = len(logs)

    # ── Step 3a: Anomaly weight — worst-case event in window ──
    if logs:
        anomaly_weight: float = max(
            _EVENT_ANOMALY_WEIGHTS.get(
                str(log.get("event_type", "")),
                _DEFAULT_ANOMALY_WEIGHT,
            )
            for log in logs
        )
    else:
        anomaly_weight = 0.0

    # ── Step 3b: Historical severity — mean of all events ─────
    if logs:
        severity_values: List[float] = [
            _SEVERITY_WEIGHTS.get(
                str(log.get("severity", "INFO")),
                _SEVERITY_WEIGHTS["INFO"],
            )
            for log in logs
        ]
        historical_severity: float = sum(severity_values) / len(severity_values)
    else:
        historical_severity = 0.0

    # ── Step 3c: Asset criticality — weighted mean ────────────
    assets = employee.assets   # loaded via SQLAlchemy relationship
    if assets:
        asset_criticality: float = sum(
            _ASSET_CRITICALITY.get(a.asset_type.value, 0.5) for a in assets
        ) / len(assets)
    else:
        asset_criticality = _NO_ASSET_CRITICALITY

    # ── Step 3d: ML anomaly inference (if anomaly_score not explicitly provided)
    effective_ml_score: float | None = anomaly_score
    if effective_ml_score is None:
        try:
            from app.services.feature_extraction import extract_employee_features
            from app.services.ml_engine import predict_employee_anomaly

            window_days = max(14, math.ceil(window_hours / 24))
            feature_vec = await extract_employee_features(
                employee_id=emp_id,
                window_days=window_days,
                mdb=mdb,
            )
            prediction = predict_employee_anomaly(feature_vec)
            # Normalize 0-100 anomaly score to 0.0-1.0 scale
            effective_ml_score = round(float(prediction.get("anomaly_score", 0.0)) / 100.0, 4)
            logger.info(
                "ML Anomaly Inference | emp_id=%s anomaly_score=%.2f severity=%s",
                emp_id,
                prediction.get("anomaly_score", 0.0),
                prediction.get("severity", "NORMAL"),
            )
        except Exception as exc:
            logger.warning(
                "ML anomaly inference fallback for emp_id=%s: %s (using rule-based anomaly weight)",
                emp_id,
                exc,
            )
            effective_ml_score = None

    # ── Step 4: Score ─────────────────────────────────────────
    threat_score: int = calculate_threat_score(
        anomaly_weight=anomaly_weight,
        frequency=frequency,
        asset_criticality=asset_criticality,
        historical_severity=historical_severity,
        anomaly_score=effective_ml_score,
    )

    # ── Step 5: Risk band ─────────────────────────────────────
    risk_category: RiskCategoryEnum = score_to_risk_category(threat_score)

    # ── Step 6: Persist to PostgreSQL ────────────────────────
    employee.risk_score    = round(threat_score / 100, 4)   # stored as 0.0–1.0
    employee.risk_category = risk_category
    employee.updated_at    = datetime.utcnow()
    db.commit()
    db.refresh(employee)

    # ── Step 6b: Persist baseline to MongoDB ─────────────────
    effective_anomaly: float = (
        max(0.0, min(1.0, float(effective_ml_score)))
        if effective_ml_score is not None
        else anomaly_weight
    )
    try:
        baseline_doc = {
            "emp_id": emp_id,
            "employee_db_id": employee.id,
            "threat_score": threat_score,
            "risk_score": round(threat_score / 100, 4),
            "risk_category": risk_category.value,
            "anomaly_score": round(float(effective_ml_score or 0.0) * 100.0, 2),
            "frequency": frequency,
            "anomaly_weight": round(effective_anomaly, 4),
            "asset_criticality": round(asset_criticality, 4),
            "historical_severity": round(historical_severity, 4),
            "evaluated_at": datetime.now(tz=timezone.utc),
            "updated_at": datetime.now(tz=timezone.utc),
        }
        await mdb["employee_risk_baselines"].update_one(
            {"emp_id": emp_id},
            {"$set": baseline_doc},
            upsert=True,
        )
    except Exception as m_err:
        logger.warning("Failed to upsert employee risk baseline to MongoDB for %s: %s", emp_id, m_err)

    logger.info(
        "Risk recalculated | emp_id=%s score=%d category=%s window=%dh",
        emp_id, threat_score, risk_category.value, window_hours,
    )

    # ── Step 7: Return result ─────────────────────────────────
    return EmployeeRiskResult(
        emp_id=emp_id,
        threat_score=threat_score,
        risk_category=risk_category,
        anomaly_weight=round(effective_anomaly, 4),
        frequency=frequency,
        asset_criticality=round(asset_criticality, 4),
        historical_severity=round(historical_severity, 4),
        evaluated_at=datetime.now(tz=timezone.utc),
    )


# ─────────────────────────────────────────────────────────────
# Real-Time Telemetry ML Anomaly & Risk Evaluation Service
# ─────────────────────────────────────────────────────────────

@dataclass
class RealtimeRiskInferenceResult:
    """Rich inference & risk scoring output produced immediately upon telemetry ingestion."""
    emp_id:                    str
    threat_score:              int
    risk_score:                float
    risk_category:             str
    anomaly_score:             float
    raw_decision_score:        float
    is_anomaly:                bool
    severity:                  str
    contributing_risk_factors: list[Any]
    features:                  dict[str, float]
    evaluated_at:              str


async def evaluate_and_persist_realtime_risk(
    emp_id: str,
    db: Session,
    mdb: AsyncIOMotorDatabase,
    window_days: int = 14,
    latest_event: dict[str, Any] | None = None,
) -> RealtimeRiskInferenceResult:
    """
    Real-time end-to-end ML inference & risk baseline recalculation.
    Executes immediately when incoming telemetry arrives at /api/v1/telemetry/ingest:
      1. Extracts the updated 8D feature vector from MongoDB activity_logs.
      2. Runs Isolation Forest anomaly inference + Z-score risk factor attribution.
      3. Computes the composite threat score and risk category.
      4. Persists the updated risk state to PostgreSQL Employee table.
      5. Upserts the full behavioral baseline snapshot to MongoDB employee_risk_baselines.
    """
    from app.services.feature_extraction import extract_employee_features
    from app.services.ml_engine import predict_employee_anomaly

    # 1. Resolve employee
    employee: Employee | None = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if employee is None:
        raise ValueError(f"Employee '{emp_id}' not found in PostgreSQL.")

    # 2. Extract updated feature vector over sliding window
    feature_vec = await extract_employee_features(
        employee_id=emp_id,
        window_days=window_days,
        mdb=mdb,
    )

    # 3. Perform ML Anomaly Inference
    try:
        prediction = predict_employee_anomaly(feature_vec)
    except Exception as ml_exc:
        logger.error("Real-time ML anomaly inference error for %s: %s", emp_id, ml_exc)
        prediction = {
            "anomaly_score": 0.0,
            "raw_decision_score": 0.0,
            "is_anomaly": False,
            "severity": "NORMAL",
            "contributing_risk_factors": [],
            "features": {},
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }

    anomaly_score_0_100: float = float(prediction.get("anomaly_score", 0.0))
    normalized_ml_score: float = round(anomaly_score_0_100 / 100.0, 4)
    severity_tier: str = str(prediction.get("severity", "NORMAL"))
    is_anomaly: bool = bool(prediction.get("is_anomaly", False))
    raw_decision: float = float(prediction.get("raw_decision_score", 0.0))
    factors = prediction.get("contributing_risk_factors", [])
    features_dict = prediction.get("features", {})
    eval_iso: str = prediction.get("evaluated_at") or datetime.now(timezone.utc).isoformat()

    # 4. Multi-factor scoring inputs over the window
    since_utc = datetime.now(timezone.utc) - timedelta(days=window_days)
    cursor = mdb["activity_logs"].find(
        {"emp_id": emp_id, "timestamp": {"$gte": since_utc}},
        {"_id": 0, "event_type": 1, "severity": 1},
    )
    logs: list[dict[str, Any]] = await cursor.to_list(length=10_000)
    frequency: int = len(logs)

    if logs:
        anomaly_weight = max(
            _EVENT_ANOMALY_WEIGHTS.get(str(l.get("event_type", "")), _DEFAULT_ANOMALY_WEIGHT)
            for l in logs
        )
        sev_values = [
            _SEVERITY_WEIGHTS.get(str(l.get("severity", "INFO")), _SEVERITY_WEIGHTS["INFO"])
            for l in logs
        ]
        historical_severity = sum(sev_values) / len(sev_values)
    else:
        anomaly_weight = 0.0
        historical_severity = 0.0

    assets = employee.assets
    if assets:
        asset_criticality = sum(
            _ASSET_CRITICALITY.get(a.asset_type.value, 0.5) for a in assets
        ) / len(assets)
    else:
        asset_criticality = _NO_ASSET_CRITICALITY

    # 5. Calculate composite threat score
    threat_score: int = calculate_threat_score(
        anomaly_weight=anomaly_weight,
        frequency=frequency,
        asset_criticality=asset_criticality,
        historical_severity=historical_severity,
        anomaly_score=normalized_ml_score,
    )
    risk_cat = score_to_risk_category(threat_score)
    normalized_risk_score = round(threat_score / 100.0, 4)

    # 6. Persist to PostgreSQL
    employee.risk_score = normalized_risk_score
    employee.risk_category = risk_cat
    employee.updated_at = datetime.utcnow()
    try:
        db.commit()
        db.refresh(employee)
    except Exception as db_err:
        db.rollback()
        logger.error("Failed to commit employee risk update in PostgreSQL for %s: %s", emp_id, db_err)
        raise

    # 7. Persist baseline snapshot to MongoDB
    factors_serializable = []
    for f in factors:
        if hasattr(f, "model_dump"):
            factors_serializable.append(f.model_dump())
        elif isinstance(f, dict):
            factors_serializable.append(f)
        else:
            factors_serializable.append(str(f))

    baseline_doc = {
        "emp_id": emp_id,
        "employee_db_id": employee.id,
        "threat_score": threat_score,
        "risk_score": normalized_risk_score,
        "risk_category": risk_cat.value,
        "anomaly_score": anomaly_score_0_100,
        "raw_decision_score": raw_decision,
        "is_anomaly": is_anomaly,
        "severity": severity_tier,
        "contributing_risk_factors": factors_serializable,
        "features": features_dict,
        "frequency": frequency,
        "anomaly_weight": round(anomaly_weight, 4),
        "asset_criticality": round(asset_criticality, 4),
        "historical_severity": round(historical_severity, 4),
        "window_days": window_days,
        "last_event": latest_event or {},
        "evaluated_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    try:
        await mdb["employee_risk_baselines"].update_one(
            {"emp_id": emp_id},
            {"$set": baseline_doc},
            upsert=True,
        )
    except Exception as m_err:
        logger.warning("Failed to persist risk baseline in MongoDB for %s: %s", emp_id, m_err)

    logger.info(
        "Real-time ML risk evaluated | emp_id=%s threat_score=%d risk_cat=%s anomaly_score=%.2f sev=%s",
        emp_id,
        threat_score,
        risk_cat.value,
        anomaly_score_0_100,
        severity_tier,
    )

    return RealtimeRiskInferenceResult(
        emp_id=emp_id,
        threat_score=threat_score,
        risk_score=normalized_risk_score,
        risk_category=risk_cat.value,
        anomaly_score=anomaly_score_0_100,
        raw_decision_score=raw_decision,
        is_anomaly=is_anomaly,
        severity=severity_tier,
        contributing_risk_factors=factors,
        features=features_dict,
        evaluated_at=eval_iso,
    )
