from fastapi import APIRouter
from app.schemas.dashboard import DashboardOverview

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverview)
def get_overview() -> DashboardOverview:
    return DashboardOverview(organization_risk="Moderate", open_alerts=3, active_investigations=4, protected_identities=2841, elevated_signal_change=18.0)
