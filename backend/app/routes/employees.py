from fastapi import APIRouter, HTTPException
from app.database import get_connection

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("/")
def get_employees():
    connection = get_connection()

    rows = connection.execute(
        "SELECT * FROM employees"
    ).fetchall()

    connection.close()

    employees = [dict(row) for row in rows]

    return {
        "items": employees,
        "total": len(employees),
    }


@router.get("/{employee_id}")
def get_employee(employee_id: str):
    connection = get_connection()

    row = connection.execute(
        "SELECT * FROM employees WHERE id = ?",
        (employee_id,),
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    return dict(row)