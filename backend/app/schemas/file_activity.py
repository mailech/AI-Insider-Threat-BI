from datetime import datetime
from pydantic import BaseModel


class FileActivityBase(BaseModel):
    event_id: str
    event_time: datetime
    user_id: str
    pc: str
    filename: str
    content: str | None = None


class FileActivityCreate(FileActivityBase):
    pass


class FileActivityResponse(FileActivityBase):
    id: int

    class Config:
        from_attributes = True