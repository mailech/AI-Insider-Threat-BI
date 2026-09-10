"""Shared response envelopes."""
from __future__ import annotations

from typing import Generic, List, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int = 1
    size: int = 25
    pages: int = 1


class Message(BaseModel):
    detail: str


class IdResponse(BaseModel):
    id: int
    detail: str = "ok"


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(25, ge=1, le=200)
