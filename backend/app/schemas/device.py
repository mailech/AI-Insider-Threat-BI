from datetime import datetime
from pydantic import BaseModel


class DeviceBase(BaseModel):
    event_id: str
    event_time: datetime
    user_id: str
    pc: str
    activity: str


class DeviceCreate(DeviceBase):
    pass


class DeviceResponse(DeviceBase):
    id: int

    class Config:
        from_attributes = True