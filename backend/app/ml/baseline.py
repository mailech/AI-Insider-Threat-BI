"""Behavioural Profiling Engine (module 4).

Builds a per-employee behavioural baseline: work/login patterns, device usage,
access patterns and productivity volume statistics, plus a per-user
IsolationForest model consumed later by the anomaly detection engine.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml import features as F
from app.models.activity import ActivityEvent
from app.models.behavior import BehaviorBaseline, PeerGroupStat
from app.models.employee import Employee

try:  # scikit-learn stays optional so the API still boots without it
    from sklearn.ensemble import IsolationForest
    import joblib
    SKLEARN_AVAILABLE = True
except Exception:  # pragma: no cover
    SKLEARN_AVAILABLE = False


def _mean_std(values: Sequence[float]) -> tuple[float, float]:
    """Mean and a robust dispersion estimate.

    The floor is relative to the mean: without it a high-volume feature with a
    tight sample std produces spurious multi-sigma deviations on ordinary days.
    """
    if not values:
        return 0.0, 1.0
    arr = np.asarray(values, dtype=float)
    mean = float(arr.mean())
    std = float(arr.std(ddof=1)) if len(arr) > 1 else 0.0
    std = max(std, 0.30 * abs(mean), 1.0)
    return mean, std


def _model_path(employee_id: int) -> str:
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    return os.path.join(settings.MODEL_DIR, f"iforest_employee_{employee_id}.joblib")


def _baseline_quality(days_observed: int, events: int, feature_matrix: List[List[float]]) -> float:
    """Baseline quality metric (0-100): coverage x volume x stability."""
    if not feature_matrix:
        return 0.0
    coverage = min(days_observed / 30.0, 1.0)
    volume = min(events / 300.0, 1.0)
    arr = np.asarray(feature_matrix, dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        means = arr.mean(axis=0)
        stds = arr.std(axis=0)
        cv = np.where(means > 0, stds / np.where(means > 0, means, 1.0), 0.0)
    stability = float(max(0.0, 1.0 - min(float(np.nanmean(cv)), 1.5) / 1.5))
    return round(100.0 * (0.4 * coverage + 0.3 * volume + 0.3 * stability), 2)


def fetch_events(
    db: Session,
    employee_id: int,
    lookback_days: int,
    exclude_recent_days: int = 0,
) -> List[ActivityEvent]:
    """Events for an employee, optionally holding back the most recent days."""
    now = datetime.now(timezone.utc)
    conditions = [
        ActivityEvent.employee_id == employee_id,
        ActivityEvent.event_time >= now - timedelta(days=lookback_days),
    ]
    if exclude_recent_days > 0:
        conditions.append(ActivityEvent.event_time < now - timedelta(days=exclude_recent_days))
    stmt = select(ActivityEvent).where(*conditions).order_by(ActivityEvent.event_time)
    return list(db.execute(stmt).scalars().all())


def build_baseline(
    db: Session,
    employee: Employee,
    lookback_days: int = 90,
    exclude_recent_days: int = 7,
) -> Optional[BehaviorBaseline]:
    """Compute and persist the behavioural baseline for one employee.

    ``exclude_recent_days`` holds back the live detection window so that an
    in-progress attack cannot quietly become part of the employee's normal.
    """
    events = fetch_events(db, employee.id, lookback_days, exclude_recent_days)
    if len(events) < settings.BASELINE_MIN_EVENTS:
        events = fetch_events(db, employee.id, lookback_days)
        if len(events) < settings.BASELINE_MIN_EVENTS:
            return None

    days, matrix, per_day = F.build_daily_matrix(events)
    login_hours = [
        F.as_utc(e.event_time).hour
        for e in events
        if e.activity_type in {"login", "remote_access", "vpn_session"}
    ]
    active_hours = login_hours or [F.as_utc(e.event_time).hour for e in events]

    baseline = db.execute(
        select(BehaviorBaseline).where(BehaviorBaseline.employee_id == employee.id)
    ).scalar_one_or_none()
    if baseline is None:
        baseline = BehaviorBaseline(employee_id=employee.id)
        db.add(baseline)

    mean_hour, std_hour = _mean_std(active_hours)
    per_day_series = {
        "daily_events": [d["event_count"] for d in per_day],
        "daily_downloads": [d["download_mb"] for d in per_day],
        "daily_bytes": [d["download_mb"] + d["upload_mb"] for d in per_day],
        "daily_uploads": [d["upload_mb"] for d in per_day],
        "daily_emails": [d["email_count"] for d in per_day],
    }

    baseline.events_analysed = len(events)
    baseline.days_observed = len(days)
    baseline.window_start = F.as_utc(events[0].event_time)
    baseline.window_end = F.as_utc(events[-1].event_time)

    baseline.mean_login_hour = round(mean_hour, 3)
    baseline.std_login_hour = round(max(std_hour, 0.75), 3)
    baseline.typical_start_hour = round(float(np.percentile(active_hours, 10)), 2)
    baseline.typical_end_hour = round(float(np.percentile(active_hours, 90)), 2)
    baseline.weekend_activity_ratio = round(sum(1 for e in events if e.is_weekend) / len(events), 4)
    baseline.after_hours_ratio = round(sum(1 for e in events if e.is_after_hours) / len(events), 4)

    for attr, values in per_day_series.items():
        m, s = _mean_std(values)
        setattr(baseline, f"mean_{attr}", round(m, 4))
        setattr(baseline, f"std_{attr}", round(s, 4))

    ext_emails = [d["external_email_count"] for d in per_day]
    usb_events = [d["usb_event_count"] for d in per_day]
    baseline.mean_external_emails = round(float(np.mean(ext_emails)) if ext_emails else 0.0, 4)
    baseline.mean_daily_usb_events = round(float(np.mean(usb_events)) if usb_events else 0.0, 4)

    baseline.device_profile = json.dumps(F.profile_counts(events, "device_id"))
    baseline.application_profile = json.dumps(F.profile_counts(events, "application"))
    baseline.resource_profile = json.dumps(F.profile_counts(events, "resource", top=25))
    baseline.hourly_histogram = json.dumps(F.hourly_histogram(events))
    baseline.quality_score = _baseline_quality(len(days), len(events), matrix)

    # Per-user unsupervised model trained on the daily feature matrix.
    if SKLEARN_AVAILABLE and len(matrix) >= 7:
        try:
            model = IsolationForest(
                n_estimators=150,
                contamination=settings.ANOMALY_CONTAMINATION,
                random_state=42,
                n_jobs=1,
            )
            model.fit(np.asarray(matrix, dtype=float))
            path = _model_path(employee.id)
            joblib.dump({"model": model, "features": F.FEATURE_NAMES}, path)
            baseline.model_path = path
        except Exception:
            baseline.model_path = None

    employee.baseline_ready = True
    db.flush()
    return baseline


def load_user_model(baseline: BehaviorBaseline):
    if not SKLEARN_AVAILABLE or not baseline.model_path or not os.path.exists(baseline.model_path):
        return None
    try:
        return joblib.load(baseline.model_path)
    except Exception:  # pragma: no cover
        return None


def baseline_to_dict(baseline: BehaviorBaseline) -> Dict[str, Any]:
    """Flatten a baseline into the mean/std lookup used by the detectors."""
    return {
        "mean_daily_events": baseline.mean_daily_events,
        "std_daily_events": baseline.std_daily_events,
        "mean_daily_downloads": baseline.mean_daily_downloads,
        "std_daily_downloads": baseline.std_daily_downloads,
        "mean_daily_uploads": baseline.mean_daily_uploads,
        "std_daily_uploads": baseline.std_daily_uploads,
        "mean_daily_bytes": baseline.mean_daily_bytes,
        "std_daily_bytes": baseline.std_daily_bytes,
        "mean_daily_emails": baseline.mean_daily_emails,
        "std_daily_emails": baseline.std_daily_emails,
        "mean_external_emails": baseline.mean_external_emails,
        "mean_daily_usb_events": baseline.mean_daily_usb_events,
        "mean_login_hour": baseline.mean_login_hour,
        "std_login_hour": baseline.std_login_hour,
        "after_hours_ratio": baseline.after_hours_ratio,
        "weekend_activity_ratio": baseline.weekend_activity_ratio,
    }


# ---------------------------------------------------------------- peer groups
# A peer group needs enough members for its mean and spread to mean anything;
# below this the comparison is noise, so the detector skips the group entirely.
MIN_PEER_GROUP_SIZE = 4


def peer_group_key(employee: Employee) -> str:
    """Peer group identity: department scope.

    Department plus designation was too fine-grained - it produced groups of one
    or two people whose variance was meaningless - so peers are department-wide.
    """
    dept = employee.department.name if employee.department else "unassigned"
    return f"{dept}::all"


PEER_FEATURES = [
    "event_count",
    "download_mb",
    "upload_mb",
    "email_count",
    "external_email_count",
    "usb_event_count",
    "after_hours_ratio",
    "unauthorized_attempts",
    "distinct_resources",
    "night_activity_count",
]


def rebuild_peer_groups(db: Session, lookback_days: int = 30) -> int:
    """Aggregate per-peer-group behavioural statistics used for UEBA comparison."""
    employees = list(db.execute(select(Employee)).scalars().all())
    grouped: Dict[str, List[Employee]] = {}
    for emp in employees:
        grouped.setdefault(peer_group_key(emp), []).append(emp)

    updated = 0
    for key, members in grouped.items():
        per_member: List[Dict[str, float]] = []
        for emp in members:
            events = fetch_events(db, emp.id, lookback_days)
            if not events:
                continue
            _, _, per_day = F.build_daily_matrix(events)
            if not per_day:
                continue
            per_member.append({name: float(np.mean([d[name] for d in per_day])) for name in PEER_FEATURES})
        if not per_member:
            continue

        metrics: Dict[str, Dict[str, float]] = {}
        for name in PEER_FEATURES:
            vals = np.asarray([m[name] for m in per_member], dtype=float)
            mean = float(vals.mean())
            std = float(vals.std(ddof=1)) if len(vals) > 1 else 0.0
            metrics[name] = {
                "mean": round(mean, 4),
                "std": round(max(std, 0.30 * abs(mean), 1.0), 4),
                "p95": round(float(np.percentile(vals, 95)), 4),
                "max": round(float(vals.max()), 4),
            }

        stat = db.execute(select(PeerGroupStat).where(PeerGroupStat.group_key == key)).scalar_one_or_none()
        if stat is None:
            stat = PeerGroupStat(group_key=key)
            db.add(stat)
        stat.designation = None
        stat.department_id = members[0].department_id
        stat.member_count = len(per_member)
        stat.metrics = json.dumps(metrics)
        updated += 1

    db.flush()
    return updated


def build_all_baselines(
    db: Session,
    employee_ids: Optional[List[int]] = None,
    lookback_days: int = 90,
    exclude_recent_days: int = 7,
) -> Dict[str, Any]:
    stmt = select(Employee)
    if employee_ids:
        stmt = stmt.where(Employee.id.in_(employee_ids))
    employees = list(db.execute(stmt).scalars().all())

    built, skipped, details = 0, 0, []
    for emp in employees:
        baseline = build_baseline(db, emp, lookback_days, exclude_recent_days)
        if baseline is None:
            skipped += 1
            details.append({"employee_id": emp.id, "status": "skipped", "reason": "insufficient events"})
        else:
            built += 1
            details.append(
                {
                    "employee_id": emp.id,
                    "status": "built",
                    "events": baseline.events_analysed,
                    "days": baseline.days_observed,
                    "quality": baseline.quality_score,
                }
            )
    groups = rebuild_peer_groups(db, lookback_days=min(lookback_days, 45))
    db.commit()
    return {
        "baselines_built": built,
        "employees_skipped": skipped,
        "peer_groups_updated": groups,
        "details": details[:200],
    }
