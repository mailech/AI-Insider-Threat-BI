from fastapi import APIRouter, status
from app.schemas.activity import ActivityEventCreate
from app.schemas.common import APIMessage

router = APIRouter(prefix="/activity", tags=["activity"])


@router.post("/events", response_model=APIMessage, status_code=status.HTTP_202_ACCEPTED)
def ingest_activity(event: ActivityEventCreate) -> APIMessage:
    # Queueing and durable storage are added after the database/streaming details are supplied.
    return APIMessage(message=f"Accepted {event.event_type} event for behavioral processing")
