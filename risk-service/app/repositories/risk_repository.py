from __future__ import annotations

from typing import Any


class RiskRepository:
    def __init__(self) -> None:
        self._timeline: list[dict[str, Any]] = []

    def add_timeline_entry(self, employee_id: str, score: float, severity: str, explanation: str) -> None:
        self._timeline.append(
            {
                "employee_id": employee_id,
                "score": score,
                "severity": severity,
                "timestamp": "2026-08-04T00:00:00Z",
                "explanation": explanation,
            }
        )

    def get_timeline(self, employee_id: str) -> list[dict[str, Any]]:
        return [entry for entry in self._timeline if entry["employee_id"] == employee_id]
