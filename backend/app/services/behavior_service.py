"""Behavioral baselines, UEBA indicators, and peer comparison."""

import uuid
from collections import Counter, defaultdict
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models.activity import ActivityLog, ActivityType
from app.models.behavior import BehaviorProfile
from app.models.employee import Employee
from app.schemas.behavior import (
    BehaviorAnalysis,
    BehaviorIndicator,
    BehaviorProfileRead,
    PeerComparison,
    WorkPatternPoint,
)
from app.services import risk_service
from app.services.features import is_after_hours

DAY_NAMES = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
BASELINE_WINDOW_DAYS = 90


def _daily_average(count: int, days: int) -> float:
    return round(count / days, 3) if days else 0.0


def build_profile(
    db: Session, employee_id: uuid.UUID, window_days: int = BASELINE_WINDOW_DAYS
) -> BehaviorProfile:
    """Recompute and persist an employee's behavioral baseline."""
    since = utcnow() - timedelta(days=window_days)
    logs = list(
        db.scalars(
            select(ActivityLog).where(
                ActivityLog.employee_id == employee_id, ActivityLog.timestamp >= since
            )
        )
    )

    logins = [log for log in logs if log.activity_type == ActivityType.LOGIN]
    login_hours = [log.timestamp.hour for log in logins]
    downloads = [log for log in logs if log.activity_type == ActivityType.FILE_DOWNLOAD]
    transfers = [
        log
        for log in logs
        if log.activity_type in (ActivityType.DATA_TRANSFER, ActivityType.FILE_UPLOAD)
    ]
    emails = [log for log in logs if log.activity_type == ActivityType.EMAIL]
    volume = sum(log.data_volume_mb for log in logs)
    devices = {log.device for log in logs}
    applications = [log.application for log in logs if log.application]
    common_apps = [name for name, _ in Counter(applications).most_common(5)]

    profile = db.scalars(
        select(BehaviorProfile).where(BehaviorProfile.employee_id == employee_id)
    ).first()
    if profile is None:
        profile = BehaviorProfile(employee_id=employee_id)
        db.add(profile)

    profile.typical_login_hour_start = min(login_hours, default=8)
    profile.typical_login_hour_end = max(login_hours, default=19)
    profile.typical_daily_logins = _daily_average(len(logins), window_days)
    profile.typical_daily_downloads = _daily_average(len(downloads), window_days)
    profile.typical_daily_transfers = _daily_average(len(transfers), window_days)
    profile.typical_daily_emails = _daily_average(len(emails), window_days)
    profile.typical_daily_data_volume_mb = round(volume / window_days, 3) if window_days else 0.0
    profile.typical_device_count = max(len(devices), 1)
    profile.typical_applications = ", ".join(common_apps)

    db.commit()
    db.refresh(profile)
    return profile


def _trend(deviation_percent: float) -> str:
    if deviation_percent > 15:
        return "Increasing"
    if deviation_percent < -15:
        return "Decreasing"
    return "Stable"


def _indicator(name: str, baseline: float, observed: float) -> BehaviorIndicator:
    if baseline > 0:
        deviation = round(((observed - baseline) / baseline) * 100, 2)
    else:
        deviation = 100.0 if observed > 0 else 0.0
    return BehaviorIndicator(
        name=name,
        baseline_value=round(baseline, 3),
        observed_value=round(observed, 3),
        deviation_percent=deviation,
        trend=_trend(deviation),
    )


def analyze(
    db: Session, employee_id: uuid.UUID, lookback_days: int = 30
) -> BehaviorAnalysis:
    profile = db.scalars(
        select(BehaviorProfile).where(BehaviorProfile.employee_id == employee_id)
    ).first()
    if profile is None:
        profile = build_profile(db, employee_id)

    since = utcnow() - timedelta(days=lookback_days)
    logs = list(
        db.scalars(
            select(ActivityLog).where(
                ActivityLog.employee_id == employee_id, ActivityLog.timestamp >= since
            )
        )
    )

    logins = [log for log in logs if log.activity_type == ActivityType.LOGIN]
    downloads = [log for log in logs if log.activity_type == ActivityType.FILE_DOWNLOAD]
    transfers = [
        log
        for log in logs
        if log.activity_type in (ActivityType.DATA_TRANSFER, ActivityType.FILE_UPLOAD)
    ]
    emails = [log for log in logs if log.activity_type == ActivityType.EMAIL]
    after_hours = [log for log in logins if is_after_hours(log.timestamp)]

    indicators = [
        _indicator("Daily logins", profile.typical_daily_logins, len(logins) / lookback_days),
        _indicator(
            "Daily downloads", profile.typical_daily_downloads, len(downloads) / lookback_days
        ),
        _indicator(
            "Daily transfers", profile.typical_daily_transfers, len(transfers) / lookback_days
        ),
        _indicator("Daily emails", profile.typical_daily_emails, len(emails) / lookback_days),
        _indicator(
            "Daily data volume (MB)",
            profile.typical_daily_data_volume_mb,
            sum(log.data_volume_mb for log in logs) / lookback_days,
        ),
        _indicator(
            "After-hours logins",
            profile.typical_daily_logins * 0.1,
            len(after_hours) / lookback_days,
        ),
    ]

    per_day: dict[int, float] = defaultdict(float)
    for log in logs:
        per_day[log.timestamp.weekday()] += 0.5
    weeks = max(lookback_days / 7, 1)
    work_pattern = [
        WorkPatternPoint(day=DAY_NAMES[index], hours=round(per_day.get(index, 0.0) / weeks, 2))
        for index in range(7)
    ]

    peer_comparison = _peer_comparison(db, employee_id)
    history = risk_service.score_history(db, employee_id, limit=5)
    if len(history) >= 2:
        delta = history[0].risk_score - history[-1].risk_score
        risk_trend = "Increasing" if delta > 1 else "Decreasing" if delta < -1 else "Stable"
    else:
        risk_trend = "Insufficient history"

    return BehaviorAnalysis(
        employee_id=employee_id,
        lookback_days=lookback_days,
        profile=BehaviorProfileRead.model_validate(profile),
        indicators=indicators,
        work_pattern=work_pattern,
        peer_comparison=peer_comparison,
        risk_trend=risk_trend,
    )


def _peer_comparison(db: Session, employee_id: uuid.UUID) -> PeerComparison | None:
    employee = db.get(Employee, employee_id)
    if employee is None:
        return None
    peers = list(
        db.scalars(
            select(Employee).where(
                Employee.department == employee.department, Employee.id != employee_id
            )
        )
    )
    scores = risk_service.latest_scores(db)
    own = scores.get(employee_id)
    peer_scores = [scores[peer.id].risk_score for peer in peers if peer.id in scores]
    if own is None or not peer_scores:
        return None
    peer_average = sum(peer_scores) / len(peer_scores)
    if own.risk_score > peer_average * 1.1:
        position = "Above peers"
    elif own.risk_score < peer_average * 0.9:
        position = "Below peers"
    else:
        position = "In line with peers"
    return PeerComparison(
        peer_group=employee.department,
        peer_count=len(peer_scores),
        employee_average_risk=round(own.risk_score, 2),
        peer_average_risk=round(peer_average, 2),
        relative_position=position,
    )
