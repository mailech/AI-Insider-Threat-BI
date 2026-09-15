from datetime import datetime
from collections import Counter
import math

import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session

from .models import (
    Activity,
    Employee,
    BehavioralProfile,
    Anomaly,
    RiskScore,
    Alert,
)


# ============================================================
# SENTINEL - Insider Threat Behavioral Intelligence
# Analytics Engine
# ============================================================

RISK_WEIGHTS = {
    "behavioral_anomalies": 0.35,
    "privilege_misuse": 0.25,
    "data_access_violations": 0.20,
    "access_pattern_deviations": 0.10,
    "historical_security_events": 0.10,
}

PRIVILEGED_LEVELS = {
    "admin",
    "administrator",
    "elevated",
    "root",
    "superuser",
}

LOGIN_TYPES = {
    "login",
    "remote_login",
    "authentication",
}

WORK_START = 7
WORK_END = 21


# ============================================================
# Utility Functions
# ============================================================

def _hour(timestamp: datetime) -> float:
    """Convert timestamp into decimal hour."""
    return timestamp.hour + (timestamp.minute / 60.0)


def _safe_log(value: float) -> float:
    """Safe logarithmic transformation for data-transfer values."""
    return math.log1p(max(float(value or 0), 0))


def _is_privileged(activity: Activity) -> bool:
    """Return True when activity uses elevated privileges."""
    return (
        str(activity.privilege_level or "").strip().lower()
        in PRIVILEGED_LEVELS
    )


def _is_login(activity: Activity) -> bool:
    """Return True when activity represents authentication."""
    return (
        str(activity.activity_type or "").strip().lower()
        in LOGIN_TYPES
    )


def _severity_from_score(score: float) -> str:
    """Convert anomaly score into a human-readable severity."""
    if score >= 0.30:
        return "Critical"
    if score >= 0.15:
        return "High"
    if score >= 0.07:
        return "Medium"
    return "Low"


# ============================================================
# Behavioral Profiling
# ============================================================

def build_profile(db: Session, employee_id: str):
    """
    Build or update a behavioral baseline for an employee.

    Baseline signals:
    - Login time
    - Data transfer
    - Activity frequency
    - Resource/application diversity
    """

    activities = (
        db.query(Activity)
        .filter(Activity.employee_id == employee_id)
        .order_by(Activity.timestamp.asc())
        .all()
    )

    if not activities:
        return None

    login_hours = [
        _hour(activity.timestamp)
        for activity in activities
        if _is_login(activity)
    ]

    transfers = [
        float(activity.bytes_transferred or 0)
        for activity in activities
    ]

    resources = Counter(
        activity.resource
        for activity in activities
        if activity.resource
    )

    profile = (
        db.query(BehavioralProfile)
        .filter(
            BehavioralProfile.employee_id == employee_id
        )
        .first()
    )

    if profile is None:
        profile = BehavioralProfile(
            employee_id=employee_id
        )
        db.add(profile)

    # Login behavior baseline
    if login_hours:
        profile.login_hour_mean = float(
            np.mean(login_hours)
        )

        profile.login_hour_std = float(
            max(np.std(login_hours), 0.5)
        )
    else:
        profile.login_hour_mean = 10.0
        profile.login_hour_std = 2.0

    # Data transfer baseline
    profile.avg_data_transfer = float(
        np.mean(transfers)
    ) if transfers else 0.0

    # Overall activity frequency
    profile.avg_access_frequency = float(
        len(activities)
    )

    # Resource/application diversity
    profile.application_count = len(resources)

    profile.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(profile)

    return profile


# ============================================================
# Feature Engineering
# ============================================================

def _build_features(activity: Activity, profile):
    """
    Convert an activity event into ML features.

    Features:
    1. Time of activity
    2. Data-transfer magnitude
    3. Successful/failed event
    4. Privileged activity
    5. Deviation from employee login baseline
    """

    hour = _hour(activity.timestamp)

    if profile:
        login_deviation = abs(
            hour - float(profile.login_hour_mean or 10)
        )
    else:
        login_deviation = 0.0

    return [
        hour,
        _safe_log(activity.bytes_transferred),
        1 if activity.success else 0,
        1 if _is_privileged(activity) else 0,
        login_deviation,
    ]


# ============================================================
# Anomaly Detection
# ============================================================

def detect_anomalies(
    db: Session,
    employee_id: str,
):
    """
    Detect suspicious behavior using Isolation Forest.

    The engine evaluates:
    - Unusual login times
    - Large data transfers
    - Privileged activity
    - Failed/unauthorized access
    - General behavioral deviation
    """

    activities = (
        db.query(Activity)
        .filter(Activity.employee_id == employee_id)
        .order_by(Activity.timestamp.desc())
        .limit(1000)
        .all()
    )

    if not activities:
        return []

    profile = build_profile(
        db,
        employee_id,
    )

    # --------------------------------------------------------
    # Minimum-data protection
    # --------------------------------------------------------

    if len(activities) < 5:
        return []

    features = [
        _build_features(activity, profile)
        for activity in activities
    ]

    X = np.asarray(
        features,
        dtype=float,
    )

    # --------------------------------------------------------
    # Adaptive contamination
    # --------------------------------------------------------

    contamination = min(
        0.15,
        max(
            0.03,
            5.0 / len(X),
        ),
    )

    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )

    predictions = model.fit_predict(X)

    raw_scores = -model.decision_function(X)

    # Normalize anomaly scores into 0-100
    if len(raw_scores) > 1:
        minimum = float(np.min(raw_scores))
        maximum = float(np.max(raw_scores))

        if maximum > minimum:
            normalized_scores = (
                (raw_scores - minimum)
                / (maximum - minimum)
            ) * 100
        else:
            normalized_scores = np.zeros(
                len(raw_scores)
            )
    else:
        normalized_scores = np.zeros(
            len(raw_scores)
        )

    created = []

    # --------------------------------------------------------
    # Event-level analysis
    # --------------------------------------------------------

    for prediction, normalized_score, activity in zip(
        predictions,
        normalized_scores,
        activities,
    ):

        # Isolation Forest considers this event suspicious
        if prediction != -1:
            continue

        score = float(
            round(normalized_score, 2)
        )

        hour = _hour(activity.timestamp)

        category = "Behavioral Anomaly"
        description = (
            "Activity differs significantly "
            "from the learned behavioral baseline."
        )

        # Highest priority indicators first
        if (
            _is_login(activity)
            and (
                hour < WORK_START
                or hour >= WORK_END
            )
        ):
            category = "Unusual Login Time"
            description = (
                "Authentication activity occurred "
                "outside the employee's normal "
                "working window."
            )

        elif float(
            activity.bytes_transferred or 0
        ) >= 100 * 1024 * 1024:

            category = "Abnormal Data Download"
            description = (
                "Large-scale data transfer detected. "
                "The event requires exfiltration review."
            )

        elif _is_privileged(activity):

            category = "Privilege Misuse Indicator"
            description = (
                "Elevated privilege activity detected "
                "and requires security review."
            )

        elif not activity.success:

            category = "Unauthorized Access Attempt"
            description = (
                "An unsuccessful access event was "
                "detected against a protected resource."
            )

        elif (
            profile
            and _is_login(activity)
            and abs(
                hour
                - float(profile.login_hour_mean or 10)
            )
            > max(
                2.5
                * float(
                    profile.login_hour_std or 2
                ),
                3.0,
            )
        ):
            category = "Access Pattern Deviation"
            description = (
                "Authentication behavior deviates "
                "substantially from the employee baseline."
            )

        severity = _severity_from_score(
            score / 100
        )

        # ----------------------------------------------------
        # Prevent duplicate open anomalies
        # ----------------------------------------------------

        existing = (
            db.query(Anomaly)
            .filter(
                Anomaly.activity_id == activity.id,
                Anomaly.status == "Open",
            )
            .first()
        )

        if existing:
            continue

        anomaly = Anomaly(
            employee_id=employee_id,
            activity_id=activity.id,
            category=category,
            severity=severity,
            score=score,
            description=description,
        )

        db.add(anomaly)
        db.flush()

        # ----------------------------------------------------
        # Create linked security alert
        # ----------------------------------------------------

        alert = Alert(
            employee_id=employee_id,
            anomaly_id=anomaly.id,
            title=category,
            severity=severity,
            message=description,
        )

        db.add(alert)

        created.append(anomaly)

    db.commit()

    return created


# ============================================================
# Risk Scoring Engine
# ============================================================

def calculate_risk(
    db: Session,
    employee_id: str,
):
    """
    Calculate enterprise insider-risk score.

    Weighted model:
    Behavioral Anomalies        35%
    Privilege Misuse            25%
    Data Access Violations      20%
    Access Pattern Deviations   10%
    Historical Security Events  10%
    """

    activities = (
        db.query(Activity)
        .filter(Activity.employee_id == employee_id)
        .all()
    )

    if not activities:
        return None

    anomalies = (
        db.query(Anomaly)
        .filter(Anomaly.employee_id == employee_id)
        .all()
    )

    alerts = (
        db.query(Alert)
        .filter(Alert.employee_id == employee_id)
        .all()
    )

    total_activities = max(
        len(activities),
        1,
    )

    # --------------------------------------------------------
    # 1. Behavioral Anomaly Component
    # --------------------------------------------------------

    open_anomalies = [
        anomaly
        for anomaly in anomalies
        if anomaly.status != "Closed"
    ]

    behavioral_anomalies = min(
        100.0,
        (
            len(open_anomalies)
            / total_activities
        ) * 1000,
    )

    # --------------------------------------------------------
    # 2. Privilege Misuse Component
    # --------------------------------------------------------

    privileged_events = sum(
        1
        for activity in activities
        if _is_privileged(activity)
    )

    privilege_misuse = min(
        100.0,
        (
            privileged_events
            / total_activities
        ) * 100,
    )

    # --------------------------------------------------------
    # 3. Data Access Violations
    # --------------------------------------------------------

    data_access_events = sum(
        1
        for anomaly in anomalies
        if any(
            keyword in str(
                anomaly.category
            ).lower()
            for keyword in (
                "data",
                "access",
                "download",
                "exfiltration",
            )
        )
    )

    data_access_violations = min(
        100.0,
        (
            data_access_events
            / total_activities
        ) * 1000,
    )

    # --------------------------------------------------------
    # 4. Access Pattern Deviations
    # --------------------------------------------------------

    pattern_events = sum(
        1
        for anomaly in anomalies
        if any(
            keyword in str(
                anomaly.category
            ).lower()
            for keyword in (
                "login",
                "behavioral",
                "pattern",
            )
        )
    )

    access_pattern_deviations = min(
        100.0,
        (
            pattern_events
            / total_activities
        ) * 1000,
    )

    # --------------------------------------------------------
    # 5. Historical Security Events
    # --------------------------------------------------------

    historical_security_events = min(
        100.0,
        len(alerts) * 5.0,
    )

    components = {
        "behavioral_anomalies": behavioral_anomalies,
        "privilege_misuse": privilege_misuse,
        "data_access_violations": data_access_violations,
        "access_pattern_deviations": access_pattern_deviations,
        "historical_security_events": historical_security_events,
    }

    # --------------------------------------------------------
    # Weighted risk score
    # --------------------------------------------------------

    total_score = sum(
        components[key]
        * RISK_WEIGHTS[key]
        for key in components
    )

    total_score = round(
        min(100.0, total_score),
        2,
    )

    # --------------------------------------------------------
    # Risk category
    # --------------------------------------------------------

    if total_score >= 80:
        category = "Critical Risk"
    elif total_score >= 60:
        category = "High Risk"
    elif total_score >= 30:
        category = "Medium Risk"
    else:
        category = "Low Risk"

    # --------------------------------------------------------
    # Persist risk score
    # --------------------------------------------------------

    risk = (
        db.query(RiskScore)
        .filter(
            RiskScore.employee_id == employee_id
        )
        .first()
    )

    if risk is None:
        risk = RiskScore(
            employee_id=employee_id
        )
        db.add(risk)

    for key, value in components.items():
        setattr(
            risk,
            key,
            float(value),
        )

    risk.total_score = total_score
    risk.category = category
    risk.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(risk)

    return risk


# ============================================================
# Complete Employee Analysis
# ============================================================

def analyze_employee(
    db: Session,
    employee_id: str,
):
    """
    Execute the complete SENTINEL analysis pipeline.

    Activity
       ↓
    Behavioral Profile
       ↓
    Anomaly Detection
       ↓
    Risk Scoring
       ↓
    Security Alert
    """

    detect_anomalies(
        db,
        employee_id,
    )

    return calculate_risk(
        db,
        employee_id,
    )


# ============================================================
# Dashboard Analytics
# ============================================================

def dashboard_summary(db: Session):
    """
    Generate executive-level security posture summary.
    """

    employees = db.query(Employee).count()

    activities = db.query(Activity).count()

    open_anomalies = (
        db.query(Anomaly)
        .filter(
            Anomaly.status != "Closed"
        )
        .count()
    )

    open_alerts = (
        db.query(Alert)
        .filter(
            Alert.status != "Resolved"
        )
        .count()
    )

    critical_users = (
        db.query(RiskScore)
        .filter(
            RiskScore.category
            == "Critical Risk"
        )
        .count()
    )

    high_risk_users = (
        db.query(RiskScore)
        .filter(
            RiskScore.category
            == "High Risk"
        )
        .count()
    )

    medium_risk_users = (
        db.query(RiskScore)
        .filter(
            RiskScore.category
            == "Medium Risk"
        )
        .count()
    )

    low_risk_users = (
        db.query(RiskScore)
        .filter(
            RiskScore.category
            == "Low Risk"
        )
        .count()
    )

    return {
        "employees": employees,
        "activities": activities,
        "open_anomalies": open_anomalies,
        "open_alerts": open_alerts,
        "critical_risk_users": critical_users,
        "high_risk_users": high_risk_users,
        "medium_risk_users": medium_risk_users,
        "low_risk_users": low_risk_users,
        "risk_distribution": {
            "critical": critical_users,
            "high": high_risk_users,
            "medium": medium_risk_users,
            "low": low_risk_users,
        },
    }