import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.database import get_connection, row_to_dict
from backend.app.schemas import EmployeeCreate, EmployeeOut, EmployeeUpdate, employee_risk_level
from backend.app.security import require_roles


router = APIRouter(prefix="/api/employees", tags=["Employees"])

READ_ROLES = ("security_analyst", "soc_engineer", "security_manager", "administrator")
WRITE_ROLES = ("security_manager", "administrator")


@router.get("", response_model=list[EmployeeOut])
def list_employees(
    q: str | None = Query(default=None, max_length=80),
    department: str | None = Query(default=None, max_length=80),
    risk_level: str | None = Query(default=None, max_length=20),
    current_user: dict = Depends(require_roles(*READ_ROLES)),
) -> list[dict]:
    conditions: list[str] = []
    params: list[str] = []

    if q:
        search = f"%{q.strip()}%"
        conditions.append("(employee_id LIKE ? OR full_name LIKE ? OR department LIKE ? OR designation LIKE ?)")
        params.extend([search, search, search, search])
    if department:
        conditions.append("department = ?")
        params.append(department.strip())
    if risk_level:
        conditions.append("risk_level = ?")
        params.append(risk_level.strip().title())

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT *
            FROM employees
            {where_clause}
            ORDER BY risk_score DESC, full_name ASC
            """,
            params,
        ).fetchall()
    return [row_to_dict(row) for row in rows]


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    current_user: dict = Depends(require_roles(*WRITE_ROLES)),
) -> dict:
    risk_level = employee_risk_level(payload.risk_score, payload.risk_level)
    with get_connection() as connection:
        try:
            cursor = connection.execute(
                """
                INSERT INTO employees (
                    employee_id, full_name, department, designation, manager,
                    device_info, access_privileges, risk_score, risk_level, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.employee_id.strip(),
                    payload.full_name.strip(),
                    payload.department.strip(),
                    payload.designation.strip(),
                    payload.manager.strip(),
                    payload.device_info.strip(),
                    payload.access_privileges.strip(),
                    payload.risk_score,
                    risk_level,
                    payload.status,
                ),
            )
            connection.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee ID already exists.") from exc

        row = connection.execute("SELECT * FROM employees WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_dict(row)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, current_user: dict = Depends(require_roles(*READ_ROLES))) -> dict:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    return row_to_dict(row)


@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    current_user: dict = Depends(require_roles(*WRITE_ROLES)),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if "risk_score" in fields and "risk_level" not in fields:
        fields["risk_level"] = employee_risk_level(fields["risk_score"], None)

    with get_connection() as connection:
        existing = connection.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

        if fields:
            assignments = ", ".join([f"{key} = ?" for key in fields.keys()])
            values = list(fields.values()) + [employee_id]
            connection.execute(
                f"UPDATE employees SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                values,
            )
            connection.commit()

        row = connection.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
    return row_to_dict(row)


@router.delete("/{employee_id}", response_model=EmployeeOut)
def deactivate_employee(
    employee_id: int,
    current_user: dict = Depends(require_roles("administrator")),
) -> dict:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
        connection.execute(
            "UPDATE employees SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (employee_id,),
        )
        connection.commit()
        updated = connection.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
    return row_to_dict(updated)
