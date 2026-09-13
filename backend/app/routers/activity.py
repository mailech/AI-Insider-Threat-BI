import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.config import risk_level_for_score
from backend.app.database import get_connection, row_to_dict
from backend.app.schemas import ActivityIngestRequest, ActivityOut
from backend.app.security import require_roles


router = APIRouter(prefix="/api/activity", tags=["Activity Monitoring"])

READ_ROLES = ("security_analyst", "soc_engineer", "security_manager", "administrator")
INGEST_ROLES = ("soc_engineer", "security_manager", "administrator")


def _activity_dict(row) -> dict:
    item = row_to_dict(row)
    item["metadata"] = json.loads(item.get("metadata") or "{}")
    return item


def _severity_weight(severity: str) -> int:
    return {
        "Informational": 0,
        "Low": 1,
        "Medium": 3,
        "High": 7,
        "Critical": 12,
    }[severity]


def _now_utc() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


@router.get("", response_model=list[ActivityOut])
def list_activity(
    limit: int = Query(default=50, ge=1, le=200),
    employee_id: str | None = Query(default=None, max_length=40),
    severity: str | None = Query(default=None, max_length=20),
    source: str | None = Query(default=None, max_length=80),
    current_user: dict = Depends(require_roles(*READ_ROLES)),
) -> list[dict]:
    conditions: list[str] = []
    params: list[str] = []
    if employee_id:
        conditions.append("(e.employee_id = ? OR CAST(e.id AS TEXT) = ?)")
        params.extend([employee_id.strip(), employee_id.strip()])
    if severity:
        conditions.append("a.severity = ?")
        params.append(severity.strip().title())
    if source:
        conditions.append("a.source = ?")
        params.append(source.strip())

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.append(str(limit))

    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT
                a.*,
                e.employee_id AS employee_ref,
                e.full_name AS employee_name,
                e.department AS department
            FROM activity_logs a
            JOIN employees e ON e.id = a.employee_id
            {where_clause}
            ORDER BY datetime(a.event_time) DESC, a.id DESC
            LIMIT ?
            """,
            params,
        ).fetchall()
    return [_activity_dict(row) for row in rows]


@router.post("/ingest", status_code=status.HTTP_201_CREATED)
def ingest_activity(
    payload: ActivityIngestRequest,
    current_user: dict = Depends(require_roles(*INGEST_ROLES)),
) -> dict:
    accepted = 0
    rejected: list[dict] = []
    with get_connection() as connection:
        batch_cursor = connection.execute(
            """
            INSERT INTO ingestion_batches (source, received_count, accepted_count, submitted_by)
            VALUES (?, ?, 0, ?)
            """,
            (payload.source, len(payload.events), current_user["id"]),
        )
        batch_id = batch_cursor.lastrowid

        for index, event in enumerate(payload.events):
            employee = connection.execute(
                "SELECT * FROM employees WHERE employee_id = ?",
                (event.employee_id.strip(),),
            ).fetchone()
            if employee is None:
                rejected.append({"index": index, "employee_id": event.employee_id, "reason": "Employee not found"})
                continue

            connection.execute(
                """
                INSERT INTO activity_logs (
                    employee_id, event_type, source, description, severity, asset, actor,
                    ip_address, event_time, ingested_by, batch_id, metadata
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    employee["id"],
                    event.event_type.strip(),
                    (event.source or payload.source).strip(),
                    event.description.strip(),
                    event.severity,
                    event.asset,
                    event.actor,
                    event.ip_address,
                    event.event_time or _now_utc(),
                    current_user["id"],
                    batch_id,
                    json.dumps(event.metadata, separators=(",", ":")),
                ),
            )
            next_score = min(100, int(employee["risk_score"]) + _severity_weight(event.severity))
            connection.execute(
                """
                UPDATE employees
                SET risk_score = ?, risk_level = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (next_score, risk_level_for_score(next_score), employee["id"]),
            )
            accepted += 1

        connection.execute(
            "UPDATE ingestion_batches SET accepted_count = ? WHERE id = ?",
            (accepted, batch_id),
        )
        connection.commit()

    return {
        "batch_id": batch_id,
        "received": len(payload.events),
        "accepted": accepted,
        "rejected": rejected,
    }


@router.get("/sources")
def list_sources(current_user: dict = Depends(require_roles(*READ_ROLES))) -> dict:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT source, COUNT(*) AS event_count, MAX(event_time) AS last_seen
            FROM activity_logs
            GROUP BY source
            ORDER BY event_count DESC
            """
        ).fetchall()
    return {"sources": [row_to_dict(row) for row in rows]}
