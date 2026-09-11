from pydantic import BaseModel, Field


class DashboardOverview(BaseModel):
    organization_risk: str
    open_alerts: int = Field(ge=0)
    active_investigations: int = Field(ge=0)
    protected_identities: int = Field(ge=0)
    elevated_signal_change: float
