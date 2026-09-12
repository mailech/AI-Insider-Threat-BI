from fastapi import APIRouter,Depends
from pydantic import BaseModel
from datetime import datetime
from app.mongodb import activity_logs
from app.auth import get_current_user


router = APIRouter(
    prefix="/api/v1/telemetry",
    tags=["Telemetry"]
)


class ActivityLog(BaseModel):
    employee_id: str
    activity_type: str
    description: str
    severity: str = "LOW"


@router.post("/logs")
def create_activity_log(
    log: ActivityLog,
    current_user: dict = Depends(get_current_user)
):

    data = {
        "employee_id": log.employee_id,
        "activity_type": log.activity_type,
        "description": log.description,
        "severity": log.severity,
        "timestamp": datetime.utcnow()
    }

    result = activity_logs.insert_one(data)

    return {
        "message": "Activity log stored successfully",
        "log_id": str(result.inserted_id)
    }


@router.get("/logs")
def get_activity_logs(
    current_user: dict = Depends(get_current_user)
):

    logs = list(
        activity_logs.find(
            {},
            {"_id": 0}
        ).sort("timestamp", -1)
    )

    return logs