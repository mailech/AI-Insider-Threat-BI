"""Feature engineering: turn raw activity events into daily behavioural feature vectors.

Shared by the profiling engine (module 4), the anomaly detection engine (module 5),
the risk scoring engine (module 6) and the UEBA engine (module 8).
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from typing import Any, Dict, Iterable, List, Sequence

from app.models.activity import ActivityEvent
from app.models.enums import ActivityType

MB = 1024.0 * 1024.0

# Ordered feature vector used by the IsolationForest models.
FEATURE_NAMES: List[str] = [
    "event_count",
    "login_count",
    "failed_login_count",
    "download_count",
    "upload_count",
    "download_mb",
    "upload_mb",
    "email_count",
    "external_email_count",
    "usb_event_count",
    "usb_mb",
    "unauthorized_attempts",
    "privilege_changes",
    "remote_sessions",
    "distinct_devices",
    "distinct_resources",
    "distinct_applications",
    "after_hours_ratio",
    "weekend_flag",
    "mean_hour",
    "hour_spread",
    "sensitive_access_count",
    "external_transfer_mb",
    "night_activity_count",
]

WORK_START_HOUR = 8
WORK_END_HOUR = 19

DOWNLOAD_TYPES = {ActivityType.FILE_DOWNLOAD.value}
UPLOAD_TYPES = {ActivityType.FILE_UPLOAD.value, ActivityType.DATA_TRANSFER.value}
EMAIL_TYPES = {ActivityType.EMAIL_SENT.value, ActivityType.EMAIL_EXTERNAL.value}
USB_TYPES = {ActivityType.USB_CONNECT.value, ActivityType.USB_FILE_COPY.value}


def as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def is_after_hours(dt: datetime) -> bool:
    h = as_utc(dt).hour
    return h < WORK_START_HOUR or h >= WORK_END_HOUR


def is_weekend(dt: datetime) -> bool:
    return as_utc(dt).weekday() >= 5


def enrich_event_flags(event: ActivityEvent) -> ActivityEvent:
    """Populate derived flags on an event prior to persisting it."""
    event.event_time = as_utc(event.event_time)
    event.is_after_hours = is_after_hours(event.event_time)
    event.is_weekend = is_weekend(event.event_time)
    if event.activity_type in USB_TYPES:
        event.is_removable_media = True
    if event.activity_type == ActivityType.EMAIL_EXTERNAL.value:
        event.is_external = True
    return event


def group_by_day(events: Iterable[ActivityEvent]) -> Dict[date, List[ActivityEvent]]:
    buckets: Dict[date, List[ActivityEvent]] = defaultdict(list)
    for e in events:
        buckets[as_utc(e.event_time).date()].append(e)
    return dict(buckets)


def daily_features(events: Sequence[ActivityEvent]) -> Dict[str, float]:
    """Compute one feature vector (as a dict) for a single employee-day."""
    if not events:
        return {name: 0.0 for name in FEATURE_NAMES}

    hours = [as_utc(e.event_time).hour for e in events]
    devices = {e.device_id for e in events if e.device_id}
    resources = {e.resource for e in events if e.resource}
    apps = {e.application for e in events if e.application}

    def count(pred) -> int:
        return sum(1 for e in events if pred(e))

    def total(pred, attr: str = "bytes_transferred") -> float:
        return float(sum(getattr(e, attr) or 0.0 for e in events if pred(e)))

    after_hours = count(lambda e: e.is_after_hours)
    feats: Dict[str, float] = {
        "event_count": float(len(events)),
        "login_count": float(count(lambda e: e.activity_type == ActivityType.LOGIN.value)),
        "failed_login_count": float(count(lambda e: e.activity_type == ActivityType.FAILED_LOGIN.value)),
        "download_count": float(count(lambda e: e.activity_type in DOWNLOAD_TYPES)),
        "upload_count": float(count(lambda e: e.activity_type in UPLOAD_TYPES)),
        "download_mb": total(lambda e: e.activity_type in DOWNLOAD_TYPES) / MB,
        "upload_mb": total(lambda e: e.activity_type in UPLOAD_TYPES) / MB,
        "email_count": float(count(lambda e: e.activity_type in EMAIL_TYPES)),
        "external_email_count": float(count(lambda e: e.activity_type == ActivityType.EMAIL_EXTERNAL.value)),
        "usb_event_count": float(count(lambda e: e.activity_type in USB_TYPES)),
        "usb_mb": total(lambda e: e.activity_type in USB_TYPES) / MB,
        "unauthorized_attempts": float(count(lambda e: e.activity_type == ActivityType.UNAUTHORIZED_ACCESS.value or not e.success)),
        "privilege_changes": float(count(lambda e: e.activity_type == ActivityType.PRIVILEGE_CHANGE.value)),
        "remote_sessions": float(count(lambda e: e.activity_type in {ActivityType.REMOTE_ACCESS.value, ActivityType.VPN_SESSION.value})),
        "distinct_devices": float(len(devices)),
        "distinct_resources": float(len(resources)),
        "distinct_applications": float(len(apps)),
        "after_hours_ratio": after_hours / float(len(events)),
        "weekend_flag": 1.0 if any(e.is_weekend for e in events) else 0.0,
        "mean_hour": float(sum(hours)) / len(hours),
        "hour_spread": float(max(hours) - min(hours)),
        "sensitive_access_count": float(count(lambda e: (e.sensitivity or "") in {"confidential", "restricted"})),
        "external_transfer_mb": total(lambda e: bool(e.is_external)) / MB,
        "night_activity_count": float(count(lambda e: as_utc(e.event_time).hour < 6 or as_utc(e.event_time).hour >= 22)),
    }
    return feats


def build_daily_matrix(events: Sequence[ActivityEvent]) -> tuple[List[date], List[List[float]], List[Dict[str, float]]]:
    """Return (days, matrix, per-day feature dicts) sorted by day."""
    buckets = group_by_day(events)
    days = sorted(buckets)
    dicts = [daily_features(buckets[d]) for d in days]
    matrix = [[fd[name] for name in FEATURE_NAMES] for fd in dicts]
    return days, matrix, dicts


def vector(features: Dict[str, float]) -> List[float]:
    return [float(features.get(name, 0.0)) for name in FEATURE_NAMES]


def profile_counts(events: Iterable[ActivityEvent], attr: str, top: int = 15) -> Dict[str, int]:
    counter: Counter = Counter()
    for e in events:
        value = getattr(e, attr, None)
        if value:
            counter[str(value)] += 1
    return dict(counter.most_common(top))


def hourly_histogram(events: Iterable[ActivityEvent]) -> List[float]:
    hist = [0.0] * 24
    total = 0
    for e in events:
        hist[as_utc(e.event_time).hour] += 1.0
        total += 1
    if total:
        hist = [round(h / total, 5) for h in hist]
    return hist


def summarise(features: Dict[str, float], keys: Sequence[str] | None = None) -> Dict[str, Any]:
    keys = keys or FEATURE_NAMES
    return {k: round(float(features.get(k, 0.0)), 3) for k in keys}
