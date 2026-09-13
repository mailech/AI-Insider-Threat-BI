import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from backend.app.config import DATASET_DIR
from backend.app.database import get_connection, row_to_dict
from backend.app.security import require_roles
from backend.app.services.analytics import import_cert_dataset, list_rows, run_analytics, train_model

router = APIRouter(prefix="/api/analytics", tags=["Behavioral Analytics"])
READ_ROLES = ("security_analyst", "soc_engineer", "security_manager", "administrator")
WRITE_ROLES = ("soc_engineer", "security_manager", "administrator")


@router.post("/run")
def analyze(current_user: dict = Depends(require_roles(*WRITE_ROLES))) -> dict:
    return run_analytics()


@router.post("/datasets/import-cert")
def import_cert(current_user: dict = Depends(require_roles(*WRITE_ROLES))) -> dict:
    return import_cert_dataset(DATASET_DIR / "cert")


@router.get("/profiles")
def profiles(current_user: dict = Depends(require_roles(*READ_ROLES))) -> list[dict]:
    return list_rows("behavioral_profiles")


@router.get("/anomalies")
def anomalies(current_user: dict = Depends(require_roles(*READ_ROLES))) -> list[dict]:
    return list_rows("anomalies")


@router.get("/risk")
def risk(current_user: dict = Depends(require_roles(*READ_ROLES))) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute("SELECT employee_id, full_name, department, risk_score, risk_level, status, updated_at FROM employees ORDER BY risk_score DESC").fetchall()
    return [row_to_dict(row) for row in rows]


@router.get("/ueba")
def ueba(current_user: dict = Depends(require_roles(*READ_ROLES))) -> dict:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT e.department AS peer_group, COUNT(e.id) AS employees,
                   ROUND(AVG(e.risk_score), 1) AS average_risk,
                   COUNT(CASE WHEN e.risk_level IN ('High', 'Critical') THEN 1 END) AS elevated
            FROM employees e GROUP BY e.department ORDER BY average_risk DESC
            """
        ).fetchall()
    return {"peer_groups": [row_to_dict(row) for row in rows]}


@router.post("/datasets/upload", status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    source: str = Form("custom"),
    target_column: str | None = Form(None),
    current_user: dict = Depends(require_roles(*WRITE_ROLES)),
) -> dict:
    if not file.filename or Path(file.filename).suffix.lower() != ".csv":
        raise HTTPException(status_code=400, detail="Only CSV datasets are supported")
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{Path(file.filename).name}"
    destination = DATASET_DIR / safe_name
    destination.write_bytes(await file.read())
    try:
        import pandas as pd
        frame = pd.read_csv(destination)
        columns = list(frame.columns)
        row_count = len(frame)
    except Exception as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {error}") from error
    with get_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO datasets (name, source, file_path, row_count, feature_columns, target_column) VALUES (?, ?, ?, ?, ?, ?)",
            (Path(file.filename).name, source, str(destination), row_count, json.dumps(columns), target_column),
        )
        connection.commit()
        dataset_id = cursor.lastrowid
    return {"dataset_id": dataset_id, "name": file.filename, "source": source, "rows": row_count, "columns": columns}


@router.get("/datasets")
def datasets(current_user: dict = Depends(require_roles(*READ_ROLES))) -> list[dict]:
    return list_rows("datasets")


@router.post("/datasets/{dataset_id}/train")
def train(dataset_id: int, current_user: dict = Depends(require_roles(*WRITE_ROLES))) -> dict:
    with get_connection() as connection:
        dataset = connection.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    try:
        result = train_model(Path(dataset["file_path"]), dataset["target_column"])
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    with get_connection() as connection:
        connection.execute("UPDATE datasets SET status = 'trained' WHERE id = ?", (dataset_id,))
        connection.commit()
    return result


@router.post("/investigations", status_code=status.HTTP_201_CREATED)
def create_investigation(payload: dict, current_user: dict = Depends(require_roles(*WRITE_ROLES))) -> dict:
    employee_id = payload.get("employee_id")
    title = str(payload.get("title", "Threat investigation")).strip()
    if not employee_id or not title:
        raise HTTPException(status_code=422, detail="employee_id and title are required")
    case_ref = f"ITBI-{uuid.uuid4().hex[:8].upper()}"
    with get_connection() as connection:
        employee = connection.execute("SELECT id FROM employees WHERE employee_id = ?", (employee_id,)).fetchone()
        if employee is None:
            raise HTTPException(status_code=404, detail="Employee not found")
        cursor = connection.execute(
            "INSERT INTO investigations (case_ref, employee_id, title, priority, assigned_to, notes) VALUES (?, ?, ?, ?, ?, ?)",
            (case_ref, employee["id"], title, payload.get("priority", "Medium"), current_user["id"], payload.get("notes", "")),
        )
        connection.commit()
        return row_to_dict(connection.execute("SELECT * FROM investigations WHERE id = ?", (cursor.lastrowid,)).fetchone())


@router.get("/investigations")
def investigations(current_user: dict = Depends(require_roles(*READ_ROLES))) -> list[dict]:
    return list_rows("investigations")
