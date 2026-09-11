from fastapi import APIRouter, Depends, HTTPException, status
from app.repositories.alerts import AlertRepository, InMemoryAlertRepository
from app.schemas.alert import Alert

router = APIRouter(prefix="/alerts", tags=["alerts"])
repository = InMemoryAlertRepository()


def get_alert_repository() -> AlertRepository:
    return repository


@router.get("", response_model=list[Alert])
def list_alerts(repo: AlertRepository = Depends(get_alert_repository)) -> list[Alert]:
    return repo.list_open()


@router.post("/{alert_id}/acknowledge", response_model=Alert)
def acknowledge_alert(alert_id: str, repo: AlertRepository = Depends(get_alert_repository)) -> Alert:
    alert = repo.acknowledge(alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert
