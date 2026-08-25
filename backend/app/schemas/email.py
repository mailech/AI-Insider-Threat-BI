from datetime import datetime

from pydantic import BaseModel


class EmailBase(BaseModel):
    event_id: str
    event_time: datetime
    user_id: str
    pc: str
    sender: str
    recipient_to: str | None = None
    recipient_cc: str | None = None
    recipient_bcc: str | None = None
    email_size: int | None = None
    attachments: int | None = None
    content: str | None = None


class EmailCreate(EmailBase):
    pass


class EmailResponse(EmailBase):
    id: int

    class Config:
        from_attributes = True