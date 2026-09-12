from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.mongodb import activity_logs

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Risk Analytics"]
)


def calculate_risk(logs):
    if not logs:
        return {
            "threat_score": 0,
            "threat_level": "LOW"
        }

    # Frequency factor
    frequency = min(len(logs) / 10, 1)

    # Severity factor
    severity_values = {
        "LOW": 0.25,
        "MEDIUM": 0.5,
        "HIGH": 0.75,
        "CRITICAL": 1.0
    }

    severity = max(
        severity_values.get(
            log.get("severity", "LOW").upper(),
            0.25
        )
        for log in logs
    )

    # Simple anomaly factor
    anomaly = 1.0 if any(
        log.get("severity", "").upper() in ["HIGH", "CRITICAL"]
        for log in logs
    ) else 0.25

    # Asset criticality placeholder for MVP
    asset_criticality = 0.5

    threat_score = 100 * (
        0.35 * anomaly +
        0.25 * frequency +
        0.25 * asset_criticality +
        0.15 * severity
    )

    threat_score = round(threat_score, 2)

    if threat_score >= 80:
        level = "CRITICAL"
    elif threat_score >= 60:
        level = "HIGH"
    elif threat_score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "threat_score": threat_score,
        "threat_level": level
    }


@router.get("/risk/{employee_id}")
def get_employee_risk(
    employee_id: str,
    current_user: dict = Depends(get_current_user)
):
    logs = list(
        activity_logs.find(
            {"employee_id": employee_id}
        )
    )

    result = calculate_risk(logs)

    return {
        "employee_id": employee_id,
        **result,
        "activity_count": len(logs)
    }


@router.get("/alerts")
def get_alerts(
    current_user: dict = Depends(get_current_user)
):
    logs = list(
        activity_logs.find(
            {
                "severity": {
                    "$in": ["MEDIUM", "HIGH", "CRITICAL"]
                }
            },
            {"_id": 0}
        ).sort("timestamp", -1)
    )

    alerts = []

    for index, log in enumerate(logs):
        severity = log.get("severity", "LOW").upper()

        if severity == "CRITICAL":
            risk = 90
            alert_type = "Suspicious Activity"

        elif severity == "HIGH":
            risk = 70
            alert_type = "Suspicious Activity"

        else:
            risk = 40
            alert_type = "Unusual Behavior"

        alerts.append({
            "id": index + 1,
            "employee_id": log.get("employee_id"),
            "activity_type": log.get("activity_type"),
            "description": log.get("description"),
            "severity": severity,
            "risk_score": risk,
            "alert_type": alert_type,
            "timestamp": log.get("timestamp")
        })

    return {
        "total_alerts": len(alerts),
        "alerts": alerts
    }