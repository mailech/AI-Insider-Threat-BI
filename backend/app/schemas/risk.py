from pydantic import BaseModel, Field


class RiskResponse(BaseModel):
    id: int
    employee_id: str
    risk_score: int = Field(ge=0, le=100)
    risk_level: str

    class Config:
        from_attributes = True


class RiskCalculationResponse(BaseModel):
    employee_id: str
    risk_score: int = Field(ge=0, le=100)
    risk_level: str

    behavioral_anomalies: float
    privilege_misuse: float
    data_access_violations: float
    access_pattern_deviations: float
    historical_security_events: float

    explanation: str