from datetime import datetime
from pydantic import BaseModel, ConfigDict


class APIMessage(BaseModel):
    message: str


class TimestampedModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    created_at: datetime | None = None
    updated_at: datetime | None = None
