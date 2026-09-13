from fastapi import APIRouter

from app.database import get_connection

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/summary")
def get_dashboard_summary():
    connection = get_connection()

    employees = connection.execute(
        "SELECT * FROM employees"
    ).fetchall()

    activities = connection.execute(
        "SELECT * FROM activities"
    ).fetchall()

    alerts = connection.execute(
        "SELECT * FROM alerts"
    ).fetchall()

    investigations = connection.execute(
        "SELECT * FROM investigations"
    ).fetchall()

    connection.close()

    return {
        "totalEmployees": len(employees),
        "totalActivities": len(activities),
        "activeAlerts": sum(
            1
            for alert in alerts
            if alert["status"] != "Closed"
        ),
        "highRiskEmployees": sum(
            1
            for employee in employees
            if employee["risk_score"] >= 60
        ),
        "criticalEmployees": sum(
            1
            for employee in employees
            if employee["risk_level"] == "Critical"
        ),
        "openInvestigations": sum(
            1
            for investigation in investigations
            if investigation["status"] != "Closed"
        ),
        "averageRiskScore": round(
            sum(employee["risk_score"] for employee in employees)
            / len(employees),
            1,
        ) if employees else 0,
    }