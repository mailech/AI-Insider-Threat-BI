from fastapi import APIRouter, HTTPException

from app.database import get_connection

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


def get_employee(employee_id: str):
    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM employees
        WHERE id = ?
        """,
        (employee_id,),
    ).fetchone()

    connection.close()

    return row


@router.get("/risk/{employee_id}")
def get_employee_risk(employee_id: str):
    employee = get_employee(employee_id)

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    return {
        "employeeId": employee["id"],
        "employee": employee["name"],
        "riskScore": employee["risk_score"],
        "riskLevel": employee["risk_level"],
        "primaryRisk": (
            "Excessive data transfer"
            if employee["id"] == "EMP-001"
            else "Unusual login pattern"
            if employee["id"] == "EMP-002"
            else "Normal behavior"
            if employee["id"] == "EMP-003"
            else "Abnormal file access"
        ),
    }


@router.get("/behavior/{employee_id}")
def get_employee_behavior(employee_id: str):
    employee = get_employee(employee_id)

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    deviation_map = {
        "EMP-001": 91,
        "EMP-002": 58,
        "EMP-003": 8,
        "EMP-004": 34,
    }

    baseline_map = {
        "EMP-001": "Low transfer volume during normal work hours",
        "EMP-002": "Office-hours authentication pattern",
        "EMP-003": "Stable engineering activity",
        "EMP-004": "Routine administrative file access",
    }

    current_map = {
        "EMP-001": "Very high transfer volume and confidential downloads",
        "EMP-002": "Repeated late-evening authentication",
        "EMP-003": "Behavior remains consistent with baseline",
        "EMP-004": "Sensitive files accessed at an unusual time",
    }

    deviation = deviation_map.get(employee_id, 0)

    if deviation >= 75:
        status = "Critical"
    elif deviation >= 40:
        status = "High"
    elif deviation >= 20:
        status = "Medium"
    else:
        status = "Normal"

    return {
        "employeeId": employee_id,
        "employee": employee["name"],
        "deviation": deviation,
        "status": status,
        "baseline": baseline_map.get(
            employee_id,
            "Normal employee activity",
        ),
        "currentBehavior": current_map.get(
            employee_id,
            "Activity is within expected range",
        ),
    }


@router.get("/summary")
def get_analytics_summary():
    connection = get_connection()

    employees = connection.execute(
        "SELECT * FROM employees"
    ).fetchall()

    activities = connection.execute(
        "SELECT * FROM activities"
    ).fetchall()

    connection.close()

    critical = sum(
        1 for employee in employees
        if employee["risk_level"] == "Critical"
    )

    high = sum(
        1 for employee in employees
        if employee["risk_level"] == "High"
    )

    medium = sum(
        1 for employee in employees
        if employee["risk_level"] == "Medium"
    )

    low = sum(
        1 for employee in employees
        if employee["risk_level"] == "Low"
    )

    average_risk = (
        round(
            sum(employee["risk_score"] for employee in employees)
            / len(employees),
            1,
        )
        if employees
        else 0
    )

    flagged = sum(
        1 for activity in activities
        if activity["status"] == "Flagged"
    )

    return {
        "employeesMonitored": len(employees),
        "activitiesMonitored": len(activities),
        "flaggedActivities": flagged,
        "averageRiskScore": average_risk,
        "riskDistribution": {
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
        },
    }