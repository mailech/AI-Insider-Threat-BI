
from fastapi import APIRouter

router = APIRouter(prefix="/alerts", tags=["Alerts"])

alerts = [
    {
        "id": "ALT-001",
        "employeeId": "EMP-001",
        "employee": "Rahul Sharma",
        "activity": "Excessive Data Transfer",
        "risk": "Critical",
        "score": 87,
        "status": "Open",
        "time": "10 min ago",
    },
    {
        "id": "ALT-002",
        "employeeId": "EMP-002",
        "employee": "Priya Reddy",
        "activity": "Unusual Login Pattern",
        "risk": "High",
        "score": 64,
        "status": "Investigating",
        "time": "32 min ago",
    },
    {
        "id": "ALT-003",
        "employeeId": "EMP-004",
        "employee": "Sneha Rao",
        "activity": "Abnormal File Access",
        "risk": "Medium",
        "score": 42,
        "status": "Open",
        "time": "1 hour ago",
    },
]


@router.get("/")
def get_alerts():
    return {
        "items": alerts,
        "total": len(alerts),
    }


@router.get("/{alert_id}")
def get_alert(alert_id: str):
    for alert in alerts:
        if alert["id"] == alert_id:
            return alert

    return {"message": "Alert not found"}