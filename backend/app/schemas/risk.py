from pydantic import BaseModel


# ----------------------------
# Risk Create Schema
# ----------------------------
class RiskCreate(BaseModel):
    employee_id: str
    risk_score: int
    risk_level: str


# ----------------------------
# Risk Response Schema
# ----------------------------
class RiskResponse(BaseModel):
    id: int
    employee_id: str
    risk_score: int
    risk_level: str

    class Config:
        from_attributes = True