"""Unit tests for the executive reports summary payload."""

from __future__ import annotations

from datetime import datetime, timezone

from app.api.v1.endpoints.reports import _build_executive_summary, _csv_bytes, _pdf_bytes
from app.models.domain import IncidentComment, IncidentStatusEnum, RiskCategoryEnum


class _FakeQuery:
    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    def order_by(self, *args: object, **kwargs: object) -> "_FakeQuery":
        return self

    def limit(self, _n: int) -> "_FakeQuery":
        return self

    def all(self) -> list[object]:
        return self._rows


class _FakeDb:
    def __init__(self, employees: list[object], incidents: list[object], comments: list[object]) -> None:
        self._employees = employees
        self._incidents = incidents
        self._comments = comments

    def query(self, model: object) -> _FakeQuery:
        if model is IncidentComment:
            return _FakeQuery(self._comments)
        name = getattr(model, "__name__", "")
        if name == "Employee":
            return _FakeQuery(self._employees)
        return _FakeQuery(self._incidents)


class _FakeEmployee:
    def __init__(
        self,
        emp_id: str,
        first_name: str,
        last_name: str,
        department: str,
        risk_score: float,
        category: RiskCategoryEnum,
    ) -> None:
        self.emp_id = emp_id
        self.first_name = first_name
        self.last_name = last_name
        self.department = department
        self.risk_score = risk_score
        self.risk_category = category
        self.access_isolated = False


class _FakeIncident:
    def __init__(self, incident_id: int, title: str, status: IncidentStatusEnum) -> None:
        self.id = incident_id
        self.title = title
        self.status = status
        self.severity = type("Sev", (), {"value": "HIGH"})()
        self.threat_score = 82
        self.employee = None
        self.trigger_reason = "ML_AUTO_TRIGGER"
        self.triggered_at = datetime(2026, 9, 16, 12, 0, tzinfo=timezone.utc)
        self.updated_at = datetime(2026, 9, 16, 12, 0, tzinfo=timezone.utc)


def test_summary_contains_required_briefing_fields() -> None:
    employees = [
        _FakeEmployee("emp_1", "Ava", "Chen", "Finance", 0.91, RiskCategoryEnum.CRITICAL),
        _FakeEmployee("emp_2", "Ben", "Ortiz", "Engineering", 0.22, RiskCategoryEnum.LOW),
    ]
    incidents = [_FakeIncident(7, "Suspicious transfer", IncidentStatusEnum.NEW)]
    db = _FakeDb(employees, incidents, [])
    payload = _build_executive_summary(db)  # type: ignore[arg-type]

    assert payload["total_incidents"] == 1
    assert payload["high_risk_users"] == 1
    assert isinstance(payload["compliance_score"], float)
    assert 0.0 <= payload["compliance_score"] <= 1.0
    assert isinstance(payload["department_risk_breakdown"], list)
    assert payload["department_risk_breakdown"][0]["department"] in {"Finance", "Engineering"}
    assert isinstance(payload["recent_audit_events"], list)
    assert payload["recent_audit_events"][0]["event_type"] == "INCIDENT_TRIGGER"


def test_csv_and_pdf_builders_emit_bytes() -> None:
    db = _FakeDb([], [], [])
    summary = _build_executive_summary(db)  # type: ignore[arg-type]
    csv_payload = _csv_bytes(summary)
    pdf_payload = _pdf_bytes(summary)
    assert b"ITBIS Executive Threat Summary" in csv_payload
    assert pdf_payload.startswith(b"%PDF")
