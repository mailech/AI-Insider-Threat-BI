from pydantic import BaseModel


class ActivityCreate(BaseModel):
    employee_id: str
    activity_type: str
    file_name: str | None = None
    device: str
    ip_address: str
    risk_level: str


class ActivityResponse(ActivityCreate):
    id: int

    class Config:
        from_attributes = True