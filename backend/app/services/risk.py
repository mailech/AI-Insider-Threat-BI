from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..models import SecurityEvent, Alert, Employee
from ..settings import settings
from .features import feature_vector, FEATURE_NAMES


class RiskEngine:
    WEIGHTS = {
        "anomaly": 0.35,
        "privilege": 0.25,
        "data": 0.20,
        "access": 0.10,
        "history": 0.10,
    }

    def __init__(self):
        self.model = None

        model_path = Path(settings.model_path)

        if model_path.exists():
            try:
                loaded = joblib.load(model_path)

                if isinstance(loaded, dict) and "model" in loaded:
                    self.model = loaded["model"]
                else:
                    self.model = loaded

            except Exception as exc:
                print(f"Risk model could not be loaded: {exc}")
                self.model = None

    def anomaly(self, event: SecurityEvent) -> float:
        """
        Calculate an anomaly score using the CERT-compatible
        13-feature schema.

        The trained Isolation Forest expects the same feature
        names/order used during training.
        """

        if self.model is None:
            return 20.0

        features = feature_vector(
            event.event_type,
            event.timestamp.hour,
            event.bytes_transferred or 0,
            event.file_count or 0,
            bool(event.is_remote),
            len(event.risk_indicators or []),
        )

        # IMPORTANT:
        # Use a DataFrame with the exact feature names used
        # during model training.
        x = pd.DataFrame(
            [features],
            columns=FEATURE_NAMES,
        )

        try:
            raw = float(self.model.decision_function(x)[0])

            # Convert Isolation Forest decision value into
            # a 0-100 anomaly score.
            return float(
                max(
                    0.0,
                    min(
                        100.0,
                        50.0 - raw * 35.0,
                    ),
                )
            )

        except Exception as exc:
            print(f"Anomaly scoring failed: {exc}")
            return 20.0

    def score(self, db: Session, event: SecurityEvent):
        indicators = set(event.risk_indicators or [])
        event_type = event.event_type

        privilege_events = {
            "privilege_change",
            "group_change",
            "account_created",
            "account_disabled",
            "password_change",
        }

        data_events = {
            "file_download",
            "file_copy",
            "file_move",
            "usb_file_copy",
            "data_transfer",
        }

        access_events = {
            "file_read",
            "network_connection",
            "http_request",
            "remote_session_connect",
        }

        if event_type in privilege_events:
            indicators.add("privilege_or_account_change")

        if event_type in data_events:
            indicators.add("data_activity")

        if (
            event.bytes_transferred
            and event.bytes_transferred >= 50_000_000
        ):
            indicators.add("high_data_volume")

        if event.timestamp.hour < 7 or event.timestamp.hour >= 22:
            indicators.add("unusual_activity_time")

        if event.is_remote:
            indicators.add("remote_access")

        # Historical event count for this user.
        history = (
            db.scalar(
                select(func.count())
                .select_from(SecurityEvent)
                .where(SecurityEvent.user_id == event.user_id)
            )
            or 0
        )

        # Privilege component (0-100)
        privilege = 90 if event_type in privilege_events else (60 if "privilege_or_account_change" in indicators else 10)

        # Data component (0-100)
        if event_type in {"usb_file_copy", "data_transfer"}:
            data = 95
        elif event_type in {"file_download", "file_copy", "file_move"}:
            data = 80
        elif "high_data_volume" in indicators or "data_activity" in indicators:
            data = 75
        else:
            data = 10

        # Access component (0-100)
        if event_type in access_events or "remote_access" in indicators:
            access = 85
        elif "unusual_activity_time" in indicators:
            access = 75
        else:
            access = 10

        # History component (0-100)
        hist = min(max(history * 4, 15), 100)

        # Anomaly component (0-100)
        anomaly = self.anomaly(event)
        if "high_risk_behavior" in indicators:
            anomaly = max(anomaly, 85.0)
        if "unusual_activity_time" in indicators:
            anomaly = max(anomaly, 75.0)

        # When explicit high risk behavior is flagged, scale components to reflect threat level
        if "high_risk_behavior" in indicators:
            privilege = max(privilege, 80)
            data = max(data, 85)
            access = max(access, 80)

        score = (
            anomaly * self.WEIGHTS["anomaly"]
            + privilege * self.WEIGHTS["privilege"]
            + data * self.WEIGHTS["data"]
            + access * self.WEIGHTS["access"]
            + hist * self.WEIGHTS["history"]
        )

        level = (
            "critical"
            if score >= 90
            else "high"
            if score >= 70
            else "medium"
            if score >= 40
            else "low"
        )

        return (
            round(score, 2),
            level,
            sorted(indicators),
            round(anomaly, 2),
        )

    def enrich(self, db: Session, event: SecurityEvent):
        score, level, indicators, anomaly_score = self.score(
            db,
            event,
        )

        event.risk_score = score
        event.risk_level = level
        event.risk_indicators = indicators
        event.anomaly_score = anomaly_score

        if event.employee_id:
            employee = db.scalar(
                select(Employee).where(
                    Employee.employee_id == event.employee_id
                )
            )

            if employee:
                employee.risk_score = score
                employee.risk_level = level
                employee.updated_at = datetime.now(timezone.utc)

        if level in {"high", "critical"}:
            existing = db.scalar(
                select(Alert).where(
                    Alert.event_id == event.event_id
                )
            )

            if not existing:
                db.add(
                    Alert(
                        event_id=event.event_id,
                        employee_id=event.employee_id,
                        username=event.username,
                        severity=level,
                        title=(
                            f"{level.upper()} insider-risk activity: "
                            f"{event.event_type}"
                        ),
                        description=(
                            f"{event.event_type} observed for "
                            f"{event.username or event.user_id}; "
                            f"risk score {score}. "
                            f"Indicators: "
                            f"{', '.join(indicators) or 'none'}."
                        ),
                        created_at=datetime.now(timezone.utc),
                    )
                )