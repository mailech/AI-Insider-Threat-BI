from fastapi import APIRouter, HTTPException

from app.database import get_connection

router = APIRouter(
    prefix="/activity",
    tags=["Activity"],
)


@router.get("/")
def get_activities():
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM activities
        ORDER BY timestamp DESC
        """
    ).fetchall()

    connection.close()

    return {
        "items": [dict(row) for row in rows],
        "total": len(rows),
    }


@router.get("/employee/{employee_id}")
def get_employee_activity(employee_id: str):
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM activities
        WHERE employee_id = ?
        ORDER BY timestamp DESC
        """,
        (employee_id,),
    ).fetchall()

    connection.close()

    return {
        "employeeId": employee_id,
        "items": [dict(row) for row in rows],
        "total": len(rows),
    }


@router.get("/{activity_id}")
def get_activity(activity_id: str):
    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM activities
        WHERE id = ?
        """,
        (activity_id,),
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    return dict(row)