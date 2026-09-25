"""Helpers shared across the agent."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def _parse_iso(value: Any) -> datetime:
    """Best-effort ISO parser; falls back to current UTC time."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if not value:
        return datetime.now(UTC)
    if isinstance(value, str):
        try:
            # Windows WMI emits strings like "20240102150412.123456+000"
            if "." in value and ("+" in value or "Z" in value):
                # WMI CIM_DATETIME
                base, _, frac_tz = value.partition(".")
                frac, _, tz = frac_tz.partition("+")
                tz = "+" + tz if tz else "+0000"
                cleaned = base + "." + frac[:6] + tz
                return datetime.strptime(cleaned, "%Y%m%d%H%M%S.%f%z")
            # Python 3.11+ parses a trailing "Z" directly.
            return datetime.fromisoformat(value)
        except ValueError:
            return datetime.now(UTC)
    return datetime.now(UTC)
