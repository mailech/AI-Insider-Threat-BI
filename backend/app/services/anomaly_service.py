from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session

from app import models


RISKY_RESOURCES = {"payroll_db", "customer_pii", "source_code_repo", "finance_ledger", "hr_records"}


def _rule_based_categories(event: models.ActivityEvent, baseline: models.BehaviorBaseline):
    """Flags specific anomaly categories called out in the spec."""
    categories = []

    if event.event_type == "login" and baseline:
        hour = event.timestamp.hour
        deviation = abs(hour - baseline.avg_login_hour)
        if deviation > max(3, baseline.login_hour_stddev * 2):
            categories.append(("unusual_login_time", min(1.0, deviation / 12)))

    if event.event_type in ("file_download", "data_transfer") and baseline:
        if event.data_volume_mb > baseline.avg_data_volume_mb + 3 * baseline.data_volume_stddev:
            categories.append(("abnormal_data_download", 0.9))
        elif event.data_volume_mb > baseline.avg_data_volume_mb + 2 * baseline.data_volume_stddev:
            categories.append(("excessive_file_transfer", 0.6))

    if event.event_type == "privilege_change":
        categories.append(("unauthorized_access_attempts", 0.7))

    if event.resource and event.resource.lower() in RISKY_RESOURCES and event.is_after_hours:
        categories.append(("suspicious_device_usage", 0.65))

    if event.is_remote and event.is_after_hours:
        categories.append(("insider_risk_indicators", 0.5))

    return categories


def run_isolation_forest(db: Session, employee_id: str, lookback_days: int = 30):
    """
    ML-based anomaly detection layer (Isolation Forest) over an employee's
    recent activity feature vectors: hour, data volume, is_after_hours, is_remote.
    """
    since = datetime.utcnow() - timedelta(days=lookback_days)
    events = (
        db.query(models.ActivityEvent)
        .filter(
            models.ActivityEvent.employee_id == employee_id,
            models.ActivityEvent.timestamp >= since,
        )
        .all()
    )
    if len(events) < 10:
        return {}

    df = pd.DataFrame(
        [
            {
                "id": e.id,
                "hour": e.timestamp.hour,
                "volume": e.data_volume_mb,
                "after_hours": int(e.is_after_hours),
                "remote": int(e.is_remote),
            }
            for e in events
        ]
    )
    features = df[["hour", "volume", "after_hours", "remote"]].values
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(features)
    raw_scores = -model.decision_function(features)  # higher = more anomalous
    normalized = (raw_scores - raw_scores.min()) / (raw_scores.ptp() + 1e-9)
    return dict(zip(df["id"], normalized))


def detect_anomalies_for_employee(db: Session, employee_id: str) -> list:
    baseline = (
        db.query(models.BehaviorBaseline)
        .filter(models.BehaviorBaseline.employee_id == employee_id)
        .first()
    )
    ml_scores = run_isolation_forest(db, employee_id)

    recent_events = (
        db.query(models.ActivityEvent)
        .filter(models.ActivityEvent.employee_id == employee_id)
        .order_by(models.ActivityEvent.timestamp.desc())
        .limit(200)
        .all()
    )

    created = []
    for event in recent_events:
        rule_hits = _rule_based_categories(event, baseline)
        ml_score = ml_scores.get(event.id, 0.0)

        for category, base_score in rule_hits:
            score = max(base_score, ml_score)
            existing = (
                db.query(models.Anomaly)
                .filter(
                    models.Anomaly.activity_event_id == event.id,
                    models.Anomaly.category == category,
                )
                .first()
            )
            if existing:
                continue
            anomaly = models.Anomaly(
                employee_id=employee_id,
                activity_event_id=event.id,
                category=category,
                anomaly_score=round(float(score), 3),
                description=(
                    f"{category.replace('_', ' ').title()} detected on "
                    f"{event.event_type} event at {event.timestamp.isoformat()}"
                ),
            )
            db.add(anomaly)
            created.append(anomaly)

        # Pure ML-flagged outliers with no rule match but a high ML score
        if ml_score > 0.75 and not rule_hits:
            existing = (
                db.query(models.Anomaly)
                .filter(
                    models.Anomaly.activity_event_id == event.id,
                    models.Anomaly.category == "behavioral_anomaly",
                )
                .first()
            )
            if not existing:
                anomaly = models.Anomaly(
                    employee_id=employee_id,
                    activity_event_id=event.id,
                    category="behavioral_anomaly",
                    anomaly_score=round(float(ml_score), 3),
                    description=(
                        f"Statistical outlier detected in activity pattern "
                        f"({event.event_type} at {event.timestamp.isoformat()})"
                    ),
                )
                db.add(anomaly)
                created.append(anomaly)

    db.commit()
    return created


def detect_anomalies_all(db: Session):
    employee_ids = [e.id for e in db.query(models.Employee.id).all()]
    total = 0
    for emp_id in employee_ids:
        total += len(detect_anomalies_for_employee(db, emp_id))
    return total
