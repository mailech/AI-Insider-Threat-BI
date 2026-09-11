from enum import Enum
from pydantic import BaseModel, Field


class Severity(str, Enum):
    informational = "Informational"
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class Alert(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    department: str
    issue: str
    detail: str
    score: int = Field(ge=0, le=100)
    severity: Severity
    time: str
    acknowledged: bool = False
