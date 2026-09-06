from collections import Counter
from datetime import datetime

import numpy as np
from sqlalchemy.orm import Session

from app import models


def build_baseline_for_employee(db: Session, employee_id: str) -> models.BehaviorBaseline:
    """
    Generates / refreshes a behavioral baseline for one employee from their
    historical activity events (Module 4: Behavioral Profiling Engine).
    """
    events = (
        db.query(models.ActivityEvent)
        .filter(models.ActivityEvent.employee_id == employee_id)
        .all()
    )

    baseline = (
        db.query(models.BehaviorBaseline)
        .filter(models.BehaviorBaseline.employee_id == employee_id)
        .first()
    )
    if baseline is None:
        baseline = models.BehaviorBaseline(employee_id=employee_id)
        db.add(baseline)

    if not events:
        db.commit()
        db.refresh(baseline)
        return baseline

    login_hours = [e.timestamp.hour for e in events if e.event_type == "login"]
    if login_hours:
        baseline.avg_login_hour = float(np.mean(login_hours))
        baseline.login_hour_stddev = float(np.std(login_hours)) or 1.0

    # events per day
    by_day = Counter(e.timestamp.date() for e in events)
    daily_counts = list(by_day.values())
    baseline.avg_daily_events = float(np.mean(daily_counts))
    baseline.daily_events_stddev = float(np.std(daily_counts)) or 1.0

    volumes = [e.data_volume_mb for e in events if e.data_volume_mb]
    if volumes:
        baseline.avg_data_volume_mb = float(np.mean(volumes))
        baseline.data_volume_stddev = float(np.std(volumes)) or 1.0

    resource_counts = Counter(e.resource for e in events if e.resource)
    baseline.common_resources = ",".join([r for r, _ in resource_counts.most_common(10)])

    baseline.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(baseline)
    return baseline


def build_all_baselines(db: Session):
    employee_ids = [e.id for e in db.query(models.Employee.id).all()]
    for emp_id in employee_ids:
        build_baseline_for_employee(db, emp_id)
