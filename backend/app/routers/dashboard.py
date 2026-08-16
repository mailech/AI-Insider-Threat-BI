import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

from backend.app.config import RISK_LEVELS, SEVERITY_LEVELS
from backend.app.database import get_connection, row_to_dict
from backend.app.security import require_roles


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

READ_ROLES = ("security_analyst", "soc_engineer", "security_manager", "administrator")


def _activity_dict(row) -> dict:
    item = row_to_dict(row)
    item["metadata"] = json.loads(item.get("metadata") or "{}")
    return item


@router.get("/summary")
def dashboard_summary(current_user: dict = Depends(require_roles(*READ_ROLES))) -> dict:
    with get_connection() as connection:
        total_employees = connection.execute(
            "SELECT COUNT(*) AS total FROM employees WHERE status != 'inactive'"
        ).fetchone()["total"]
        avg_risk = connection.execute(
            "SELECT COALESCE(ROUND(AVG(risk_score), 0), 0) AS average FROM employees"
        ).fetchone()["average"]
        events_24h = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM activity_logs
            WHERE datetime(event_time) >= datetime('now', '-24 hours')
            """
        ).fetchone()["total"]
        active_alerts = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM activity_logs
            WHERE severity IN ('High', 'Critical')
              AND datetime(event_time) >= datetime('now', '-72 hours')
            """
        ).fetchone()["total"]

        risk_rows = connection.execute(
            """
            SELECT risk_level, COUNT(*) AS total
            FROM employees
            GROUP BY risk_level
            """
        ).fetchall()
        severity_rows = connection.execute(
            """
            SELECT severity, COUNT(*) AS total
            FROM activity_logs
            WHERE datetime(event_time) >= datetime('now', '-7 days')
            GROUP BY severity
            """
        ).fetchall()
        latest_rows = connection.execute(
            """
            SELECT
                a.*,
                e.employee_id AS employee_ref,
                e.full_name AS employee_name,
                e.department AS department
            FROM activity_logs a
            JOIN employees e ON e.id = a.employee_id
            ORDER BY datetime(a.event_time) DESC, a.id DESC
            LIMIT 8
            """
        ).fetchall()
        elevated_rows = connection.execute(
            """
            SELECT *
            FROM employees
            WHERE risk_level IN ('High', 'Critical') OR status = 'under_review'
            ORDER BY risk_score DESC, updated_at DESC
            LIMIT 6
            """
        ).fetchall()

    risk_distribution = {level: 0 for level in RISK_LEVELS}
    risk_distribution.update({row["risk_level"]: row["total"] for row in risk_rows})
    severity_distribution = {level: 0 for level in SEVERITY_LEVELS}
    severity_distribution.update({row["severity"]: row["total"] for row in severity_rows})

    return {
        "kpis": {
            "employees": total_employees,
            "events_24h": events_24h,
            "active_alerts": active_alerts,
            "average_risk": int(avg_risk),
        },
        "risk_distribution": risk_distribution,
        "severity_distribution": severity_distribution,
        "latest_activity": [_activity_dict(row) for row in latest_rows],
        "elevated_employees": [row_to_dict(row) for row in elevated_rows],
    }


@router.get("/trends")
def dashboard_trends(current_user: dict = Depends(require_roles(*READ_ROLES))) -> dict:
    today = datetime.utcnow().date()
    days = [(today - timedelta(days=offset)) for offset in range(6, -1, -1)]
    trend_map = {day.isoformat(): {"day": day.isoformat(), "events": 0, "elevated": 0} for day in days}

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                date(event_time) AS day,
                COUNT(*) AS events,
                SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) AS elevated
            FROM activity_logs
            WHERE datetime(event_time) >= datetime('now', '-7 days')
            GROUP BY date(event_time)
            ORDER BY day ASC
            """
        ).fetchall()

    for row in rows:
        if row["day"] in trend_map:
            trend_map[row["day"]] = {
                "day": row["day"],
                "events": row["events"],
                "elevated": row["elevated"] or 0,
            }

    return {"trend": list(trend_map.values())}
