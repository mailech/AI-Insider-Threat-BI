"""UEBA Intelligence Engine (module 8).

User behaviour analytics, entity behaviour analytics, peer group comparison,
behavioural trend analysis and forward-looking threat prediction.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import numpy as np
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ml import baseline as B
from app.ml import features as F
from app.models.anomaly import Anomaly
from app.models.behavior import PeerGroupStat
from app.models.employee import Employee
from app.models.risk import RiskScore

TREND_FEATURES = B.PEER_FEATURES


def _peer_metrics(db: Session, employee: Employee) -> tuple[str, int, Optional[Dict[str, Dict[str, float]]]]:
    key = B.peer_group_key(employee)
    stat = db.execute(select(PeerGroupStat).where(PeerGroupStat.group_key == key)).scalar_one_or_none()
    if not stat or not stat.metrics:
        return key, 0, None
    try:
        return key, stat.member_count, json.loads(stat.metrics)
    except json.JSONDecodeError:
        return key, stat.member_count, None


def peer_comparison(db: Session, employee: Employee, lookback_days: int = 30) -> Dict[str, Any]:
    """Compare an employee against their department/designation peer group."""
    key, size, metrics = _peer_metrics(db, employee)
    events = B.fetch_events(db, employee.id, lookback_days)
    comparisons: List[Dict[str, Any]] = []
    outlier_score = 0.0

    if events and metrics:
        _, _, per_day = F.build_daily_matrix(events)
        for feature in TREND_FEATURES:
            stats = metrics.get(feature)
            if not stats:
                continue
            value = float(np.mean([d[feature] for d in per_day]))
            std = max(float(stats.get("std", 0.0)), 0.5)
            z = (value - float(stats.get("mean", 0.0))) / std
            if z >= 3.0:
                verdict = "outlier"
            elif z >= 1.5:
                verdict = "elevated"
            else:
                verdict = "normal"
            outlier_score = max(outlier_score, z)
            comparisons.append(
                {
                    "feature": feature,
                    "employee_value": round(value, 3),
                    "peer_mean": round(float(stats.get("mean", 0.0)), 3),
                    "peer_p95": round(float(stats.get("p95", 0.0)), 3),
                    "z_score": round(z, 2),
                    "verdict": verdict,
                }
            )
    comparisons.sort(key=lambda c: c["z_score"], reverse=True)
    return {
        "peer_group": key,
        "peer_group_size": size,
        "comparisons": comparisons,
        "outlier_score": round(max(0.0, min(outlier_score, 10.0)), 2),
    }


def behavioural_trend(db: Session, employee_id: int, days: int = 30) -> List[Dict[str, Any]]:
    """Daily risk / anomaly trend series for charts."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    scores = list(
        db.execute(
            select(RiskScore)
            .where(RiskScore.employee_id == employee_id, RiskScore.computed_at >= since)
            .order_by(RiskScore.computed_at)
        ).scalars().all()
    )
    anomalies = list(
        db.execute(
            select(Anomaly).where(Anomaly.employee_id == employee_id, Anomaly.detected_at >= since)
        ).scalars().all()
    )

    per_day: Dict[str, Dict[str, Any]] = {}
    for s in scores:
        key = F.as_utc(s.computed_at).date().isoformat()
        per_day.setdefault(key, {"date": key, "score": 0.0, "anomalies": 0, "max_severity": "informational"})
        per_day[key]["score"] = round(float(s.score), 2)
    order = ["informational", "low", "medium", "high", "critical"]
    for a in anomalies:
        key = F.as_utc(a.detected_at).date().isoformat()
        entry = per_day.setdefault(key, {"date": key, "score": 0.0, "anomalies": 0, "max_severity": "informational"})
        entry["anomalies"] += 1
        if order.index(a.severity) > order.index(entry["max_severity"]):
            entry["max_severity"] = a.severity
    return [per_day[k] for k in sorted(per_day)]


def predict_threat(db: Session, employee: Employee, horizon_days: int = 7) -> Dict[str, Any]:
    """Project the risk trajectory and estimate escalation probability.

    Uses a least-squares trend over recent risk scores, blended with live
    anomaly pressure (recent count and severity) so that a spike is reflected
    even when the score history is short.
    """
    since = datetime.now(timezone.utc) - timedelta(days=45)
    history = list(
        db.execute(
            select(RiskScore.score, RiskScore.computed_at)
            .where(RiskScore.employee_id == employee.id, RiskScore.computed_at >= since)
            .order_by(RiskScore.computed_at)
        ).all()
    )
    current = float(employee.current_risk_score)
    slope = 0.0
    if len(history) >= 3:
        t0 = F.as_utc(history[0][1])
        xs = np.asarray([(F.as_utc(row[1]) - t0).total_seconds() / 86400.0 for row in history], dtype=float)
        ys = np.asarray([float(row[0]) for row in history], dtype=float)
        if xs.max() > 0:
            slope = float(np.polyfit(xs, ys, 1)[0])

    recent_anomalies = list(
        db.execute(
            select(Anomaly).where(
                Anomaly.employee_id == employee.id,
                Anomaly.detected_at >= datetime.now(timezone.utc) - timedelta(days=14),
                Anomaly.is_false_positive.is_(False),
            )
        ).scalars().all()
    )
    pressure = sum(
        (a.score / 100.0) * (1.5 if a.severity in {"high", "critical"} else 1.0) for a in recent_anomalies
    )

    predicted = current + slope * horizon_days + min(12.0, pressure * 1.2)
    predicted = float(max(0.0, min(100.0, predicted)))

    # Escalation probability: logistic over projected score and anomaly pressure.
    logit = -4.2 + 0.055 * predicted + 0.18 * min(pressure, 20.0) + (0.6 if employee.on_watchlist else 0.0)
    probability = float(1.0 / (1.0 + np.exp(-logit)))

    drivers: List[str] = []
    if slope > 0.5:
        drivers.append(f"Risk score rising {slope:.1f} points/day over the recent window")
    if pressure > 3:
        drivers.append(f"{len(recent_anomalies)} anomalies in the last 14 days")
    critical = [a for a in recent_anomalies if a.severity in {"high", "critical"}]
    if critical:
        drivers.append(f"{len(critical)} high/critical severity detections")
    if employee.employment_status in {"notice_period", "terminated"}:
        drivers.append(f"Employment status: {employee.employment_status}")
    if employee.is_privileged:
        drivers.append("Privileged account holder")
    if not drivers:
        drivers.append("No significant escalation drivers detected")

    confidence = min(0.95, 0.35 + 0.08 * len(history) + 0.02 * len(recent_anomalies))
    return {
        "employee_id": employee.id,
        "employee_name": employee.full_name,
        "department": employee.department.name if employee.department else None,
        "current_score": round(current, 2),
        "predicted_score_7d": round(predicted, 2),
        "escalation_probability": round(probability, 4),
        "confidence": round(confidence, 3),
        "drivers": drivers,
    }


def build_profile(db: Session, employee: Employee, lookback_days: int = 30) -> Dict[str, Any]:
    """Full UEBA profile for one entity - the API view model."""
    peers = peer_comparison(db, employee, lookback_days)
    return {
        "employee_id": employee.id,
        "employee_name": employee.full_name,
        "department": employee.department.name if employee.department else None,
        "peer_group": peers["peer_group"],
        "peer_group_size": peers["peer_group_size"],
        "risk_score": round(float(employee.current_risk_score), 2),
        "risk_category": employee.current_risk_category,
        "comparisons": peers["comparisons"],
        "behavioral_trend": behavioural_trend(db, employee.id, lookback_days),
        "outlier_score": peers["outlier_score"],
        "prediction": predict_threat(db, employee),
    }


def top_predictions(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """Rank the workforce by predicted escalation probability."""
    employees = list(
        db.execute(
            select(Employee).order_by(Employee.current_risk_score.desc()).limit(max(limit * 4, 40))
        ).scalars().all()
    )
    predictions = [predict_threat(db, emp) for emp in employees]
    predictions.sort(key=lambda p: (p["escalation_probability"], p["predicted_score_7d"]), reverse=True)
    return predictions[:limit]


def entity_analytics(db: Session, lookback_days: int = 30) -> Dict[str, Any]:
    """Entity (device / resource / application) behaviour analytics."""
    from app.models.activity import ActivityEvent

    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    def top(column, limit: int = 10) -> List[Dict[str, Any]]:
        rows = db.execute(
            select(column, func.count(ActivityEvent.id), func.coalesce(func.sum(ActivityEvent.bytes_transferred), 0.0))
            .where(ActivityEvent.event_time >= since, column.is_not(None))
            .group_by(column)
            .order_by(func.count(ActivityEvent.id).desc())
            .limit(limit)
        ).all()
        return [
            {"entity": r[0], "events": int(r[1]), "megabytes": round(float(r[2]) / F.MB, 2)}
            for r in rows
        ]

    return {
        "devices": top(ActivityEvent.device_id),
        "applications": top(ActivityEvent.application),
        "resources": top(ActivityEvent.resource),
        "destinations": top(ActivityEvent.destination),
        "window_days": lookback_days,
    }
