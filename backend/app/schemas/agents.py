"""Pydantic schemas for endpoint agent enrollment and administration."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AgentEnrollRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=128, examples=["WS-001"])
    device_name: str = Field(..., min_length=1, max_length=255, examples=["Workstation 001"])
    device_type: str | None = Field(default="workstation", max_length=64)
    operating_system: str | None = Field(default="Windows", max_length=64)


class EnrolledDeviceRead(BaseModel):
    device_id: str
    device_name: str | None
    device_type: str | None = None
    operating_system: str | None = None
    is_active: bool
    api_key_hint: str
    employee_emp_id: str | None = None
    last_seen_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentEnrollResponse(BaseModel):
    device: EnrolledDeviceRead
    api_key: str
    warning: str = (
        "Copy this key into the agent's config now — it will not be shown again."
    )


class AgentListResponse(BaseModel):
    items: list[EnrolledDeviceRead]
    total: int
