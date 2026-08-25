from datetime import datetime
from pydantic import BaseModel


class HttpActivityBase(BaseModel):
    event_id: str
    event_time: datetime
    user_id: str
    pc: str
    url: str
    content: str | None = None


class HttpActivityCreate(HttpActivityBase):
    pass


class HttpActivityResponse(HttpActivityBase):
    id: int

    class Config:
        from_attributes = True