"""Behavioural profiling, anomaly detection, risk scoring and UEBA endpoints
(modules 4, 5, 6 and 8)."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, require_analyst, require_soc
from app.db.session import get_db
from app.ml import anomaly as anomaly_engine
from app.ml import baseline as baseline_engine
from app.ml import features as F
from app.ml import risk as risk_engine
from app.ml import ueba as ueba_engine
from app.models.anomaly import Anomaly
from app.models.behavior import BehaviorBaseline
from app.models.employee import Employee
from app.models.enums import AnomalyCategory, DetectionMethod, RiskCategory, Severity
from app.models.risk import RiskScore
from app.models.user import User
from app.schemas.analytics import (
    AnomalyDetail,
    AnomalyOut,
    BaselineBuildRequest,
    BaselineBuildResult,
    BaselineDetail,
    BaselineOut,
    DetectionRunRequest,
    DetectionRunResult,
    RiskDistribution,
    RiskScoreDetail,
    RiskScoreOut,
    ThreatPrediction,
    UEBAProfile,
)
from app.schemas.common import Message, Page
from app.services import alerts as alert_service
from app.services import audit

router = APIRouter(tags=["Behavioural Analytics & Risk"])


def _loads(raw: Optional[str], fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def _anomaly_row(anomaly: Anomaly) -> dict:
    data = {c.name: getattr(anomaly, c.name) for c in Anomaly.__table__.columns}
    employee = anomaly.employee
    data["employee_name"] = employee.full_name if employee else None
    data["employee_code"] = employee.employee_code if employee else None
    data["department"] = employee.department.name if employee and employee.department else None
    data["features"] = _loads(anomaly.features, {})
    return data


# --------------------------------------------------- behavioural baselines
@router.post("/baselines/build", response_model=BaselineBuildResult)
def build_baselines(
    payload: BaselineBuildRequest,
    request: Request,
    user: User = Depends(require_soc),
    db: Session = Depends(get_db),
) -> Any:
    """Behavioural Profiling Engine: (re)build baselines and peer groups."""
    result = baseline_engine.build_all_baselines(
        db,
        employee_ids=None if payload.rebuild_all else payload.employee_ids,
        lookback_days=payload.lookback_days,
    )
    audit.record(
        db, "baseline.build", user, "baseline", None,
        f"built={result['baselines_built']} skipped={result['employees_skipped']}", client_ip(request),
    )
    db.commit()
    return result


@router.get("/baselines", response_model=Page[BaselineOut])
def list_baselines(
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    stmt = select(BehaviorBaseline)
    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(
        stmt.order_by(BehaviorBaseline.quality_score.desc()).offset((page - 1) * size).limit(size)
    ).scalars().all()
    return {
        "items": list(rows),
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }


@router.get("/employees/{employee_id}/baseline", response_model=BaselineDetail)
def get_baseline(
    employee_id: int, _: User = Depends(require_analyst), db: Session = Depends(get_db)
) -> Any:
    baseline = db.execute(
        select(BehaviorBaseline).where(BehaviorBaseline.employee_id == employee_id)
    ).scalar_one_or_none()
    if not baseline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No behavioural baseline yet. Ingest more activity and rebuild baselines.",
        )
    data = {c.name: getattr(baseline, c.name) for c in BehaviorBaseline.__table__.columns}
    data["device_profile"] = _loads(baseline.device_profile, {})
    data["application_profile"] = _loads(baseline.application_profile, {})
    data["resource_profile"] = _loads(baseline.resource_profile, {})
    data["hourly_histogram"] = _loads(baseline.hourly_histogram, [])
    return data


# ------------------------------------------------------ anomaly detection
@router.post("/detection/run", response_model=DetectionRunResult)
def run_detection(
    payload: DetectionRunRequest,
    request: Request,
    user: User = Depends(require_soc),
    db: Session = Depends(get_db),
) -> Any:
    """Anomaly Detection Engine: run every detector, then score and alert."""
    result = anomaly_engine.run_detection(
        db, employee_ids=payload.employee_ids, lookback_days=payload.lookback_days
    )
    anomalies = result.pop("anomalies")
    scores = risk_engine.recompute_all(db, employee_ids=payload.employee_ids)
    created = alert_service.generate_alerts(db, anomalies) if payload.create_alerts else []
    result["alerts_created"] = len(created)
    result["risk_scores_updated"] = len(scores)
    audit.record(
        db, "detection.run", user, "detection", None,
        f"anomalies={result['anomalies_detected']} alerts={len(created)}", client_ip(request),
    )
    db.commit()
    return result


@router.get("/anomalies", response_model=Page[AnomalyOut])
def list_anomalies(
    employee_id: Optional[int] = None,
    category: Optional[AnomalyCategory] = None,
    severity: Optional[Severity] = None,
    method: Optional[DetectionMethod] = None,
    reviewed: Optional[bool] = None,
    days: int = Query(30, ge=1, le=365),
    min_score: float = Query(0, ge=0, le=100),
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = select(Anomaly).where(Anomaly.detected_at >= since, Anomaly.score >= min_score)
    if employee_id:
        stmt = stmt.where(Anomaly.employee_id == employee_id)
    if category:
        stmt = stmt.where(Anomaly.category == category.value)
    if severity:
        stmt = stmt.where(Anomaly.severity == severity.value)
    if method:
        stmt = stmt.where(Anomaly.detection_method == method.value)
    if reviewed is not None:
        stmt = stmt.where(Anomaly.reviewed.is_(reviewed))

    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(
        stmt.order_by(Anomaly.detected_at.desc(), Anomaly.score.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).scalars().all()
    return {
        "items": [_anomaly_row(a) for a in rows],
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }


@router.get("/anomalies/{anomaly_id}", response_model=AnomalyDetail)
def get_anomaly(
    anomaly_id: int, _: User = Depends(require_analyst), db: Session = Depends(get_db)
) -> Any:
    anomaly = db.get(Anomaly, anomaly_id)
    if not anomaly:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found")
    return _anomaly_row(anomaly)


@router.post("/anomalies/{anomaly_id}/review", response_model=AnomalyOut)
def review_anomaly(
    anomaly_id: int,
    request: Request,
    is_false_positive: bool = Query(False),
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Analyst disposition; false positives are excluded from future risk scoring."""
    anomaly = db.get(Anomaly, anomaly_id)
    if not anomaly:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found")
    anomaly.reviewed = True
    anomaly.is_false_positive = is_false_positive
    employee = db.get(Employee, anomaly.employee_id)
    if employee:
        risk_engine.compute_risk(db, employee)
    audit.record(
        db, "anomaly.review", user, "anomaly", anomaly_id,
        f"false_positive={is_false_positive}", client_ip(request),
    )
    db.commit()
    db.refresh(anomaly)
    return _anomaly_row(anomaly)


# ---------------------------------------------------------- risk scoring
def _risk_row(record: RiskScore, employee: Optional[Employee] = None) -> dict:
    data = {c.name: getattr(record, c.name) for c in RiskScore.__table__.columns}
    employee = employee or record.employee
    data["employee_name"] = employee.full_name if employee else None
    return data


@router.post("/risk/recompute", response_model=List[RiskScoreOut])
def recompute_risk(
    request: Request,
    employee_ids: Optional[List[int]] = None,
    window_days: int = Query(30, ge=1, le=365),
    user: User = Depends(require_soc),
    db: Session = Depends(get_db),
) -> Any:
    """Insider Risk Scoring Engine: recompute the weighted risk model."""
    scores = risk_engine.recompute_all(db, employee_ids=employee_ids, window_days=window_days)
    audit.record(db, "risk.recompute", user, "risk", None, f"count={len(scores)}", client_ip(request))
    db.commit()
    return [_risk_row(s) for s in scores]


@router.get("/risk/distribution", response_model=RiskDistribution)
def risk_distribution(_: User = Depends(require_analyst), db: Session = Depends(get_db)) -> Any:
    return risk_engine.risk_distribution(db)


@router.get("/risk/organisation", response_model=dict)
def organisational_risk(_: User = Depends(require_analyst), db: Session = Depends(get_db)) -> Any:
    return risk_engine.organisational_risk(db)


@router.get("/employees/{employee_id}/risk", response_model=RiskScoreDetail)
def employee_risk(
    employee_id: int,
    recompute: bool = Query(False),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Current risk score with the full weighted-component breakdown."""
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    record = db.execute(
        select(RiskScore)
        .where(RiskScore.employee_id == employee_id)
        .order_by(RiskScore.computed_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if record is None or recompute:
        record = risk_engine.compute_risk(db, employee)
        db.commit()
        db.refresh(record)

    data = _risk_row(record, employee)
    explanation = risk_engine.explain(record)
    raw = explanation["raw_components"]
    data["raw_components"] = {
        "behavioral_anomalies": raw.get("behavioral_anomalies", 0.0),
        "privilege_misuse": raw.get("privilege_misuse", 0.0),
        "data_access_violations": raw.get("data_access_violations", 0.0),
        "access_pattern_deviations": raw.get("access_pattern_deviations", 0.0),
        "historical_security_events": raw.get("historical_security_events", 0.0),
    }
    data["contributing_factors"] = explanation["contributing_factors"]
    data["weights"] = explanation["weights"]
    return data


@router.get("/employees/{employee_id}/risk/history", response_model=List[dict])
def risk_history(
    employee_id: int,
    days: int = Query(90, ge=1, le=365),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    from app.services.investigations import risk_history as history

    if not db.get(Employee, employee_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return history(db, employee_id, days)


# ------------------------------------------------------------------ UEBA
@router.get("/ueba/employees/{employee_id}", response_model=UEBAProfile)
def ueba_profile(
    employee_id: int,
    lookback_days: int = Query(30, ge=7, le=180),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Full UEBA profile: peer comparison, trend analysis and threat prediction."""
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return ueba_engine.build_profile(db, employee, lookback_days)


@router.get("/ueba/predictions", response_model=List[ThreatPrediction])
def threat_predictions(
    limit: int = Query(10, ge=1, le=50),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Employees ranked by predicted escalation probability."""
    return ueba_engine.top_predictions(db, limit)


@router.get("/ueba/entities", response_model=dict)
def entity_analytics(
    lookback_days: int = Query(30, ge=1, le=180),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Entity behaviour analytics across devices, applications and destinations."""
    return ueba_engine.entity_analytics(db, lookback_days)


@router.get("/ueba/peer-groups", response_model=List[dict])
def peer_groups(_: User = Depends(require_analyst), db: Session = Depends(get_db)) -> Any:
    from app.models.behavior import PeerGroupStat

    rows = db.execute(select(PeerGroupStat).order_by(PeerGroupStat.member_count.desc())).scalars().all()
    return [
        {
            "group_key": r.group_key,
            "designation": r.designation,
            "department_id": r.department_id,
            "member_count": r.member_count,
            "metrics": _loads(r.metrics, {}),
            "updated_at": r.updated_at,
        }
        for r in rows
    ]
