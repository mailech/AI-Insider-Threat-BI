"""Anomaly Detection Engine (module 5).

Three complementary detection layers, all of which write Anomaly rows:

1. Rule detectors      - explainable, category-aligned policy rules.
2. Statistical z-score - deviation of a day against the employee baseline.
3. IsolationForest     - multivariate unsupervised outliers over daily vectors.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml import baseline as B
from app.ml import features as F
from app.models.activity import ActivityEvent
from app.models.anomaly import Anomaly
from app.models.behavior import BehaviorBaseline
from app.models.employee import Employee
from app.models.enums import ActivityType, AnomalyCategory, DetectionMethod, Severity

# Rule thresholds (tunable policy knobs).
NIGHT_START, NIGHT_END = 23, 5
FAILED_LOGIN_BURST = 6
UNAUTHORIZED_BURST = 3
LARGE_DOWNLOAD_MB = 400.0
LARGE_USB_MB = 100.0
EXTERNAL_EMAIL_BURST = 8
FILE_TRANSFER_BURST = 60
SIGMA_WARN = 3.2
SIGMA_HIGH = 4.0
SIGMA_CRITICAL = 5.5

# A day needs a minimum amount of activity before statistical comparison is
# meaningful - two events on a quiet Sunday are not a behavioural signal.
MIN_EVENTS_FOR_STATS = 5

# Peer comparison is a coarser signal than personal history, so it needs a
# wider margin before it is worth an analyst's time.
PEER_SIGMA_MIN = 5.0


@dataclass
class Finding:
    """A detector result before it becomes a persisted Anomaly."""
    category: AnomalyCategory
    method: DetectionMethod
    title: str
    description: str
    score: float
    severity: Severity
    occurred_at: datetime
    confidence: float = 0.6
    deviation_sigma: float = 0.0
    observed_value: Optional[float] = None
    baseline_value: Optional[float] = None
    event_id: Optional[int] = None
    features: Dict[str, Any] = field(default_factory=dict)


def severity_from_score(score: float) -> Severity:
    if score >= 85:
        return Severity.CRITICAL
    if score >= 68:
        return Severity.HIGH
    if score >= 45:
        return Severity.MEDIUM
    if score >= 25:
        return Severity.LOW
    return Severity.INFORMATIONAL


def _z(value: float, mean: float, std: float) -> float:
    std = max(float(std), 0.5)
    return (float(value) - float(mean)) / std


def _score_from_sigma(sigma: float) -> float:
    """Map a z-score onto a 0-100 anomaly score with saturation at 6 sigma."""
    return float(min(100.0, max(0.0, (abs(sigma) / 6.0) * 100.0)))


# --------------------------------------------------------------- rule layer
def rule_detectors(
    employee: Employee,
    day: date,
    events: Sequence[ActivityEvent],
    feats: Dict[str, float],
    base: Optional[Dict[str, float]],
    device_profile: Dict[str, int],
) -> List[Finding]:
    """Explainable policy rules mapped onto the specification anomaly categories."""
    out: List[Finding] = []
    when = F.as_utc(events[0].event_time) if events else datetime.now(timezone.utc)

    # 1. Unusual login time
    night_logins = [
        e for e in events
        if e.activity_type in {ActivityType.LOGIN.value, ActivityType.REMOTE_ACCESS.value, ActivityType.VPN_SESSION.value}
        and (F.as_utc(e.event_time).hour >= NIGHT_START or F.as_utc(e.event_time).hour < NIGHT_END)
    ]
    if night_logins and base is not None:
        first_hour = F.as_utc(night_logins[0].event_time).hour
        # An employee whose own baseline is nocturnal is not anomalous at night.
        habitual = (
            abs(_z(first_hour, base["mean_login_hour"], base["std_login_hour"])) < 2.5
            or base["after_hours_ratio"] > 0.35
        )
        if habitual and len(night_logins) < 3:
            night_logins = []

    if night_logins:
        hour = F.as_utc(night_logins[0].event_time).hour
        sigma = abs(_z(hour, base["mean_login_hour"], base["std_login_hour"])) if base else 3.0
        score = max(45.0, min(92.0, 38.0 + 8.0 * sigma + 4.0 * len(night_logins)))
        out.append(
            Finding(
                category=AnomalyCategory.UNUSUAL_LOGIN_TIME,
                method=DetectionMethod.RULE,
                title=f"Off-hours access at {hour:02d}:00",
                description=(
                    f"{len(night_logins)} session(s) started outside working hours on {day}. "
                    f"Baseline login hour is {base['mean_login_hour']:.1f} +/- {base['std_login_hour']:.1f}."
                    if base else f"{len(night_logins)} night-time session(s) recorded on {day}."
                ),
                score=score,
                severity=severity_from_score(score),
                occurred_at=F.as_utc(night_logins[0].event_time),
                confidence=0.8,
                deviation_sigma=round(sigma, 2),
                observed_value=float(hour),
                baseline_value=base["mean_login_hour"] if base else None,
                event_id=night_logins[0].id,
                features={"night_sessions": len(night_logins), "hour": hour},
            )
        )

    # 2. Abnormal data download
    dl_mb = feats["download_mb"]
    if base and base["mean_daily_downloads"] > 0:
        sigma = _z(dl_mb, base["mean_daily_downloads"], base["std_daily_downloads"])
    else:
        sigma = dl_mb / max(LARGE_DOWNLOAD_MB / 3.0, 1.0)
    if dl_mb >= LARGE_DOWNLOAD_MB or sigma >= SIGMA_WARN:
        score = max(_score_from_sigma(sigma), min(95.0, 40.0 + dl_mb / 20.0))
        out.append(
            Finding(
                category=AnomalyCategory.ABNORMAL_DATA_DOWNLOAD,
                method=DetectionMethod.RULE,
                title=f"Abnormal download volume: {dl_mb:.1f} MB",
                description=(
                    f"Downloaded {dl_mb:.1f} MB across {int(feats['download_count'])} file operations on {day}"
                    + (f", against a baseline of {base['mean_daily_downloads']:.1f} MB/day." if base else ".")
                ),
                score=score,
                severity=severity_from_score(score),
                occurred_at=when,
                confidence=0.85,
                deviation_sigma=round(sigma, 2),
                observed_value=round(dl_mb, 2),
                baseline_value=round(base["mean_daily_downloads"], 2) if base else None,
                features={"download_mb": round(dl_mb, 2), "download_count": feats["download_count"]},
            )
        )

    # 3. Unauthorised access attempts
    failed = int(feats["failed_login_count"])
    unauth = sum(1 for e in events if e.activity_type == ActivityType.UNAUTHORIZED_ACCESS.value)
    if failed >= FAILED_LOGIN_BURST or unauth >= UNAUTHORIZED_BURST:
        score = min(96.0, 45.0 + 6.0 * failed + 11.0 * unauth)
        out.append(
            Finding(
                category=AnomalyCategory.UNAUTHORIZED_ACCESS_ATTEMPT,
                method=DetectionMethod.RULE,
                title=f"{failed + unauth} unauthorised access attempt(s)",
                description=(
                    f"{failed} failed logins and {unauth} denied resource access attempts recorded on {day}. "
                    "Possible credential misuse or privilege probing."
                ),
                score=score,
                severity=severity_from_score(score),
                occurred_at=when,
                confidence=0.9,
                observed_value=float(failed + unauth),
                baseline_value=0.0,
                features={"failed_logins": failed, "denied_access": unauth},
            )
        )

    # 4. Excessive file transfers
    transfers = int(feats["download_count"] + feats["upload_count"])
    sigma = _z(transfers, base["mean_daily_events"], base["std_daily_events"]) if base else 3.0
    burst = transfers >= FILE_TRANSFER_BURST
    statistical = base is not None and sigma >= SIGMA_HIGH and transfers >= base["mean_daily_events"] * 1.8
    if burst or statistical:
        score = max(50.0, min(94.0, 35.0 + transfers * 0.6))
        out.append(
            Finding(
                category=AnomalyCategory.EXCESSIVE_FILE_TRANSFER,
                method=DetectionMethod.RULE,
                title=f"Excessive file transfers: {transfers} operations",
                description=f"{transfers} file transfer operations executed on {day}, well above normal working volume.",
                score=score,
                severity=severity_from_score(score),
                occurred_at=when,
                confidence=0.75,
                deviation_sigma=round(sigma, 2),
                observed_value=float(transfers),
                baseline_value=round(base["mean_daily_events"], 2) if base else None,
                features={"transfers": transfers, "upload_mb": round(feats["upload_mb"], 2)},
            )
        )
    return out


def rule_detectors_extended(
    employee: Employee,
    day: date,
    events: Sequence[ActivityEvent],
    feats: Dict[str, float],
    base: Optional[Dict[str, float]],
    device_profile: Dict[str, int],
) -> List[Finding]:
    """Device, exfiltration and privilege rules (categories 5-8 of module 5)."""
    out: List[Finding] = []
    when = F.as_utc(events[0].event_time) if events else datetime.now(timezone.utc)

    # 5. Suspicious device usage - unknown device or heavy removable media use
    seen_devices = {e.device_id for e in events if e.device_id}
    unknown = [d for d in seen_devices if device_profile and d not in device_profile]
    usb_mb = feats["usb_mb"]
    usb_spike = feats["usb_event_count"] >= max(6.0, (base or {}).get("mean_daily_usb_events", 0.0) * 5 + 4)
    if unknown or usb_mb >= LARGE_USB_MB or usb_spike:
        score = 45.0 + 15.0 * len(unknown) + min(35.0, usb_mb / 5.0)
        score = min(93.0, score)
        detail = []
        if unknown:
            detail.append(f"unrecognised device(s): {', '.join(sorted(unknown)[:3])}")
        if usb_mb > 0:
            detail.append(f"{usb_mb:.1f} MB copied to removable media")
        out.append(
            Finding(
                category=AnomalyCategory.SUSPICIOUS_DEVICE_USAGE,
                method=DetectionMethod.RULE,
                title="Suspicious device usage detected",
                description=f"On {day}: " + "; ".join(detail) + ".",
                score=score,
                severity=severity_from_score(score),
                occurred_at=when,
                confidence=0.8,
                observed_value=round(usb_mb, 2),
                baseline_value=round((base or {}).get("mean_daily_usb_events", 0.0), 2),
                features={"unknown_devices": sorted(unknown)[:5], "usb_mb": round(usb_mb, 2)},
            )
        )

    # 6. Data exfiltration - external transfer of sensitive data
    ext_mb = feats["external_transfer_mb"]
    ext_emails = int(feats["external_email_count"])
    sensitive = int(feats["sensitive_access_count"])
    baseline_ext_emails = (base or {}).get("mean_external_emails", 0.0)
    exfil_signal = (
        ext_mb >= 100.0
        or (ext_emails >= EXTERNAL_EMAIL_BURST and ext_emails >= baseline_ext_emails * 3 + 3)
        or (usb_mb >= 50.0 and sensitive >= 3)
        or (sensitive >= 20 and (ext_mb >= 25.0 or usb_mb >= 25.0))
    )
    if exfil_signal:
        score = min(98.0, 50.0 + ext_mb / 4.0 + 2.5 * ext_emails + 1.5 * sensitive + (12.0 if usb_mb > 0 else 0.0))
        out.append(
            Finding(
                category=AnomalyCategory.DATA_EXFILTRATION,
                method=DetectionMethod.RULE,
                title="Potential data exfiltration pattern",
                description=(
                    f"{ext_mb:.1f} MB transferred externally, {ext_emails} external email(s) and "
                    f"{sensitive} sensitive resource access(es) on {day}."
                ),
                score=score,
                severity=severity_from_score(score),
                occurred_at=when,
                confidence=0.85,
                observed_value=round(ext_mb, 2),
                baseline_value=round((base or {}).get("mean_external_emails", 0.0), 2),
                features={
                    "external_mb": round(ext_mb, 2),
                    "external_emails": ext_emails,
                    "sensitive_access": sensitive,
                    "usb_mb": round(usb_mb, 2),
                },
            )
        )

    # 7. Privilege abuse
    priv_changes = int(feats["privilege_changes"])
    off_hours_privilege = priv_changes > 0 and feats["after_hours_ratio"] > 0.5
    privilege_burst = priv_changes >= 3
    excessive_sensitive = employee.is_privileged and sensitive >= 25
    if privilege_burst or off_hours_privilege or excessive_sensitive:
        score = min(95.0, 42.0 + 14.0 * priv_changes + 0.9 * sensitive)
        out.append(
            Finding(
                category=AnomalyCategory.PRIVILEGE_ABUSE,
                method=DetectionMethod.RULE,
                title="Privilege escalation or misuse indicator",
                description=(
                    f"{priv_changes} privilege change event(s) and {sensitive} sensitive resource access(es) on {day}"
                    + (" by a privileged account." if employee.is_privileged else ".")
                ),
                score=score,
                severity=severity_from_score(score),
                occurred_at=when,
                confidence=0.8,
                observed_value=float(priv_changes),
                baseline_value=0.0,
                features={"privilege_changes": priv_changes, "sensitive_access": sensitive},
            )
        )

    # 8. Access pattern deviation - new resources / unusual working window
    if base and feats["event_count"] >= 8:
        weekend_new = feats["weekend_flag"] > 0 and base["weekend_activity_ratio"] < 0.02
        after_hours_spike = feats["after_hours_ratio"] > max(0.65, base["after_hours_ratio"] * 3 + 0.3)
        if weekend_new or after_hours_spike:
            score = 40.0 + (22.0 if weekend_new else 0.0) + (28.0 * feats["after_hours_ratio"] if after_hours_spike else 0.0)
            reasons = []
            if weekend_new:
                reasons.append("weekend activity from an employee with no weekend baseline")
            if after_hours_spike:
                reasons.append(f"{feats['after_hours_ratio'] * 100:.0f}% of activity outside working hours")
            out.append(
                Finding(
                    category=AnomalyCategory.ACCESS_PATTERN_DEVIATION,
                    method=DetectionMethod.RULE,
                    title="Access pattern deviation",
                    description=f"On {day}: " + "; ".join(reasons) + ".",
                    score=min(88.0, score),
                    severity=severity_from_score(min(88.0, score)),
                    occurred_at=when,
                    confidence=0.7,
                    observed_value=round(feats["after_hours_ratio"], 3),
                    baseline_value=round(base["after_hours_ratio"], 3),
                    features={"after_hours_ratio": round(feats["after_hours_ratio"], 3), "weekend": bool(weekend_new)},
                )
            )
    return out


# ------------------------------------------------- statistical + ML layers
ZSCORE_FEATURES = {
    "event_count": ("mean_daily_events", "std_daily_events", "daily activity volume"),
    "download_mb": ("mean_daily_downloads", "std_daily_downloads", "download volume"),
    "upload_mb": ("mean_daily_uploads", "std_daily_uploads", "upload volume"),
    "email_count": ("mean_daily_emails", "std_daily_emails", "email volume"),
}


def zscore_detector(day: date, feats: Dict[str, float], base: Dict[str, float], when: datetime) -> List[Finding]:
    """Flag any baseline feature that deviates beyond the sigma warning threshold."""
    out: List[Finding] = []
    for feature, (mean_key, std_key, label) in ZSCORE_FEATURES.items():
        mean, std = base.get(mean_key, 0.0), base.get(std_key, 1.0)
        if mean <= 0 and feats[feature] <= 0:
            continue
        sigma = _z(feats[feature], mean, std)
        # Both tests must agree: a large sigma AND a materially larger value,
        # so a tiny absolute change against a tight baseline stays quiet.
        if sigma < SIGMA_WARN or feats[feature] < mean * 1.6:
            continue
        score = _score_from_sigma(sigma)
        out.append(
            Finding(
                category=AnomalyCategory.BEHAVIORAL_DEVIATION,
                method=DetectionMethod.STATISTICAL_ZSCORE,
                title=f"Behavioural deviation in {label} ({sigma:.1f} sigma)",
                description=(
                    f"{label.capitalize()} on {day} was {feats[feature]:.1f} against a baseline mean of "
                    f"{mean:.1f} (sigma {std:.1f}) - a {sigma:.1f} standard deviation departure."
                ),
                score=score,
                severity=severity_from_score(score),
                occurred_at=when,
                confidence=min(0.95, 0.5 + sigma / 12.0),
                deviation_sigma=round(sigma, 2),
                observed_value=round(feats[feature], 2),
                baseline_value=round(mean, 2),
                features={"feature": feature, "sigma": round(sigma, 2)},
            )
        )
    return out


def isolation_forest_detector(
    day: date,
    feats: Dict[str, float],
    bundle: Optional[Dict[str, Any]],
    when: datetime,
) -> List[Finding]:
    """Multivariate outlier detection over the 24-dimension daily feature vector."""
    if not bundle:
        return []
    model = bundle.get("model")
    if model is None:
        return []
    try:
        x = np.asarray([F.vector(feats)], dtype=float)
        prediction = int(model.predict(x)[0])
        raw = float(model.decision_function(x)[0])
    except Exception:  # pragma: no cover
        return []
    # decision_function is negative for outliers; -0.05 filters the marginal ones.
    if prediction != -1 or raw > -0.05:
        return []
    score = float(min(97.0, max(35.0, 50.0 + abs(raw) * 220.0)))
    top = sorted(
        ((k, v) for k, v in feats.items() if v > 0),
        key=lambda kv: kv[1],
        reverse=True,
    )[:6]
    return [
        Finding(
            category=AnomalyCategory.BEHAVIORAL_DEVIATION,
            method=DetectionMethod.ISOLATION_FOREST,
            title="Multivariate behavioural outlier",
            description=(
                f"The IsolationForest model flagged {day} as an outlier against this employee's own "
                f"behavioural history (isolation score {raw:.4f}). Dominant features: "
                + ", ".join(f"{k}={v:.1f}" for k, v in top)
                + "."
            ),
            score=score,
            severity=severity_from_score(score),
            occurred_at=when,
            confidence=0.7,
            observed_value=round(raw, 4),
            features={"isolation_score": round(raw, 4), "top_features": dict((k, round(v, 2)) for k, v in top)},
        )
    ]


def peer_outlier_detector(
    day: date,
    feats: Dict[str, float],
    peer_metrics: Optional[Dict[str, Dict[str, float]]],
    when: datetime,
    group_size: int = 0,
) -> List[Finding]:
    """UEBA layer: compare the day against the employee's peer group (module 8)."""
    if not peer_metrics or group_size < B.MIN_PEER_GROUP_SIZE:
        return []
    worst: Optional[tuple[str, float, Dict[str, float]]] = None
    for feature, stats in peer_metrics.items():
        if feature not in feats:
            continue
        value = feats[feature]
        sigma = _z(value, stats.get("mean", 0.0), max(stats.get("std", 0.0), 1.0))
        # Must also clear the ceiling the group has actually been observed at.
        if value <= stats.get("max", 0.0) * 1.25:
            continue
        if sigma >= PEER_SIGMA_MIN and (worst is None or sigma > worst[1]):
            worst = (feature, sigma, stats)
    if not worst:
        return []
    feature, sigma, stats = worst
    # Peer deviation is circumstantial next to a direct policy hit, so it is
    # capped below the critical band - it should inform, not page someone.
    score = min(72.0, _score_from_sigma(sigma))
    return [
        Finding(
            category=AnomalyCategory.PEER_GROUP_OUTLIER,
            method=DetectionMethod.PEER_GROUP,
            title=f"Peer group outlier on {feature}",
            description=(
                f"{feature} was {feats[feature]:.1f} on {day} while the peer group averages "
                f"{stats.get('mean', 0.0):.1f} (p95 {stats.get('p95', 0.0):.1f}) - {sigma:.1f} sigma above peers."
            ),
            score=score,
            severity=severity_from_score(score),
            occurred_at=when,
            confidence=0.75,
            deviation_sigma=round(sigma, 2),
            observed_value=round(feats[feature], 2),
            baseline_value=round(stats.get("mean", 0.0), 2),
            features={"feature": feature, "peer_mean": stats.get("mean"), "peer_p95": stats.get("p95")},
        )
    ]


# ------------------------------------------------------------- orchestration
def _dedupe_key(employee_id: int, finding: Finding) -> tuple:
    return (employee_id, finding.category.value, finding.method.value, F.as_utc(finding.occurred_at).date())


def _existing_keys(db: Session, employee_id: int, since: datetime) -> set:
    rows = db.execute(
        select(Anomaly.category, Anomaly.detection_method, Anomaly.occurred_at).where(
            Anomaly.employee_id == employee_id, Anomaly.occurred_at >= since
        )
    ).all()
    return {(employee_id, r[0], r[1], F.as_utc(r[2]).date()) for r in rows}


def detect_for_employee(
    db: Session,
    employee: Employee,
    lookback_days: int = 30,
) -> List[Anomaly]:
    """Run every detection layer for one employee and persist new anomalies."""
    events = B.fetch_events(db, employee.id, lookback_days)
    if not events:
        return []

    baseline = db.execute(
        select(BehaviorBaseline).where(BehaviorBaseline.employee_id == employee.id)
    ).scalar_one_or_none()
    base = B.baseline_to_dict(baseline) if baseline else None
    bundle = B.load_user_model(baseline) if baseline else None
    device_profile: Dict[str, int] = {}
    if baseline and baseline.device_profile:
        try:
            device_profile = json.loads(baseline.device_profile)
        except json.JSONDecodeError:
            device_profile = {}

    peer_metrics = None
    peer_group_size = 0
    from app.models.behavior import PeerGroupStat  # local import avoids a cycle at module load

    stat = db.execute(
        select(PeerGroupStat).where(PeerGroupStat.group_key == B.peer_group_key(employee))
    ).scalar_one_or_none()
    if stat:
        peer_group_size = stat.member_count
    if stat and stat.metrics:
        try:
            peer_metrics = json.loads(stat.metrics)
        except json.JSONDecodeError:
            peer_metrics = None

    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    seen = _existing_keys(db, employee.id, since)
    buckets = F.group_by_day(events)
    created: List[Anomaly] = []

    for day in sorted(buckets):
        day_events = buckets[day]
        feats = F.daily_features(day_events)
        when = F.as_utc(day_events[0].event_time)

        findings: List[Finding] = []
        findings += rule_detectors(employee, day, day_events, feats, base, device_profile)
        findings += rule_detectors_extended(employee, day, day_events, feats, base, device_profile)
        if len(day_events) >= MIN_EVENTS_FOR_STATS:
            if base:
                findings += zscore_detector(day, feats, base, when)
            findings += isolation_forest_detector(day, feats, bundle, when)
            findings += peer_outlier_detector(day, feats, peer_metrics, when, peer_group_size)

        for finding in findings:
            key = _dedupe_key(employee.id, finding)
            if key in seen:
                continue
            seen.add(key)
            anomaly = Anomaly(
                employee_id=employee.id,
                event_id=finding.event_id,
                category=finding.category.value,
                detection_method=finding.method.value,
                severity=finding.severity.value,
                title=finding.title,
                description=finding.description,
                score=round(float(finding.score), 2),
                confidence=round(float(finding.confidence), 3),
                deviation_sigma=round(float(finding.deviation_sigma), 2),
                observed_value=finding.observed_value,
                baseline_value=finding.baseline_value,
                features=json.dumps(finding.features, default=str),
                occurred_at=finding.occurred_at,
                detected_at=datetime.now(timezone.utc),
            )
            db.add(anomaly)
            created.append(anomaly)

    for e in events:
        e.processed = True
    db.flush()
    return created


def run_detection(
    db: Session,
    employee_ids: Optional[List[int]] = None,
    lookback_days: int = 30,
) -> Dict[str, Any]:
    """Batch detection entry point used by the API and the scheduler."""
    started = datetime.now(timezone.utc)
    stmt = select(Employee)
    if employee_ids:
        stmt = stmt.where(Employee.id.in_(employee_ids))
    employees = list(db.execute(stmt).scalars().all())

    since = started - timedelta(days=lookback_days)
    total_anomalies: List[Anomaly] = []
    events_analysed = 0
    for emp in employees:
        total_anomalies.extend(detect_for_employee(db, emp, lookback_days))
        events_analysed += int(
            db.execute(
                select(func.count(ActivityEvent.id)).where(
                    ActivityEvent.employee_id == emp.id,
                    ActivityEvent.event_time >= since,
                )
            ).scalar_one()
        )

    by_category: Dict[str, int] = {}
    for a in total_anomalies:
        by_category[a.category] = by_category.get(a.category, 0) + 1

    db.flush()
    return {
        "employees_analysed": len(employees),
        "events_analysed": events_analysed,
        "anomalies": total_anomalies,
        "anomalies_detected": len(total_anomalies),
        "by_category": by_category,
        "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
    }
