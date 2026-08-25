from datetime import datetime
from pydantic import BaseModel


class LogonBase(BaseModel):
    event_id: str
    user_id: str
    pc: str
    activity: str
    event_time: datetime


class LogonCreate(LogonBase):
    pass


class LogonResponse(LogonBase):
    id: int

    class Config:
        from_attributes = True