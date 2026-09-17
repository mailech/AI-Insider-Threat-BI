"""
ITBIS — System monitoring endpoints (Milestone 4 / Administrator dashboard)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.db.mongo import get_mongo_db
from app.models.domain import Employee, Incident, IncidentStatusEnum, RoleEnum, User
from app.services.ml_engine import MODEL_PATH, SCALER_PATH

router = APIRouter(prefix="/system", tags=["System Monitoring"])


@router.get(
    "/status",
    summary="Platform health and operational counters",
)
async def get_system_status(
    db: Session = Depends(get_db),
    mdb: AsyncIOMotorDatabase = Depends(get_mongo_db),
    _: User = Depends(require_roles([RoleEnum.ADMINISTRATOR, RoleEnum.SECURITY_MANAGER])),
) -> dict[str, Any]:
    postgres_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        postgres_ok = False

    mongo_ok = True
    log_count_24h = 0
    try:
        since = datetime.now(timezone.utc) - timedelta(hours=24)
        log_count_24h = await mdb["activity_logs"].count_documents({"timestamp": {"$gte": since}})
    except Exception:
        mongo_ok = False

    ml_loaded = MODEL_PATH.exists() and SCALER_PATH.exists()
    employees = db.query(Employee).count() if postgres_ok else 0
    users = db.query(User).count() if postgres_ok else 0
    open_incidents = 0
    if postgres_ok:
        open_incidents = (
            db.query(Incident)
            .filter(Incident.status.in_([IncidentStatusEnum.NEW, IncidentStatusEnum.UNDER_INVESTIGATION]))
            .count()
        )

    return {
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "services": {
            "api": "online",
            "postgres": "online" if postgres_ok else "offline",
            "mongodb": "online" if mongo_ok else "offline",
            "ml_artifacts": "ready" if ml_loaded else "missing",
        },
        "counters": {
            "employees": employees,
            "platform_users": users,
            "telemetry_events_24h": log_count_24h,
            "open_incidents": open_incidents,
        },
        "ml": {
            "model_path": str(MODEL_PATH),
            "scaler_path": str(SCALER_PATH),
            "loaded": ml_loaded,
        },
    }


@router.get("/health-lite", summary="Unauthenticated-adjacent authenticated ping")
def health_lite(_: User = Depends(get_current_active_user)) -> dict[str, str]:
    return {"status": "ok"}
