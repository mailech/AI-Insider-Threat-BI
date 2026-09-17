"""Phase B SOC incident workflow, RBAC, and Excel export tests."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.api.deps import can_assign_any_user, can_close_incident
from app.api.v1.endpoints.incidents import (
    _enrich,
    assign_incident,
    create_incident_task,
    update_incident_status,
)
from app.api.v1.endpoints.reports import _build_executive_summary, _xlsx_bytes
from app.models.domain import (
    IncidentSeverityEnum,
    IncidentStatusEnum,
    IncidentTaskStatusEnum,
    RiskCategoryEnum,
    RoleEnum,
)
from app.schemas.schemas import (
    IncidentAssign,
    IncidentStatusUpdate,
    IncidentTaskCreate,
    normalize_incident_status,
)


class _RoleUser:
    def __init__(self, user_id: int, email: str, role: RoleEnum) -> None:
        self.id = user_id
        self.email = email
        self.role = role
        self.is_active = True


class _FakeIncident:
    def __init__(self) -> None:
        self.id = 11
        self.status = IncidentStatusEnum.NEW
        self.updated_at = datetime.now(timezone.utc)
        self.resolved_at = None
        self.assigned_to_id = None
        self.comments: list[object] = []
        self.employee = None
        self.assigned_to = None
        self.title = "UEBA alert"
        self.description = None
        self.severity = IncidentSeverityEnum.HIGH
        self.threat_score = 82
        self.employee_id = 1
        self.trigger_reason = "ML_AUTO_TRIGGER"
        self.triggered_at = datetime.now(timezone.utc)
        self.created_at = datetime.now(timezone.utc)

    def __getattr__(self, name: str) -> None:
        if name in {"emp_id", "employee_name", "department"}:
            return None
        raise AttributeError(name)


class _Query:
    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    def filter(self, *args: object, **kwargs: object) -> "_Query":
        return self

    def first(self) -> object | None:
        return self._rows[0] if self._rows else None

    def all(self) -> list[object]:
        return self._rows


class _Db:
    def __init__(self, incident: _FakeIncident, users: list[_RoleUser]) -> None:
        self.incident = incident
        self.users = users
        self.added: list[object] = []

    def query(self, model: object) -> _Query:
        name = getattr(model, "__name__", "")
        if name == "Incident":
            return _Query([self.incident])
        if name == "User":
            return _Query(self.users)
        return _Query([])

    def add(self, obj: object) -> None:
        self.added.append(obj)

    def commit(self) -> None:
        return None

    def refresh(self, obj: object) -> None:
        if getattr(obj, "id", None) is None:
            obj.id = 99  # type: ignore[attr-defined]


def test_in_progress_alias_maps_to_under_investigation() -> None:
    assert normalize_incident_status("IN_PROGRESS") == "UNDER_INVESTIGATION"
    assert normalize_incident_status("In Progress") == "UNDER_INVESTIGATION"


def test_analyst_cannot_close_incident() -> None:
    analyst = _RoleUser(2, "analyst@corp.internal", RoleEnum.SECURITY_ANALYST)
    manager = _RoleUser(1, "mgr@corp.internal", RoleEnum.SECURITY_MANAGER)
    assert can_close_incident(analyst) is False  # type: ignore[arg-type]
    assert can_close_incident(manager) is True  # type: ignore[arg-type]
    assert can_assign_any_user(analyst) is False  # type: ignore[arg-type]


def test_analyst_status_close_raises_403() -> None:
    incident = _FakeIncident()
    analyst = _RoleUser(2, "analyst@corp.internal", RoleEnum.SECURITY_ANALYST)
    db = _Db(incident, [analyst])
    with pytest.raises(HTTPException) as exc:
        update_incident_status(
            11,
            IncidentStatusUpdate(status=IncidentStatusEnum.RESOLVED, note="done"),
            db,  # type: ignore[arg-type]
            analyst,  # type: ignore[arg-type]
        )
    assert exc.value.status_code == 403


def test_analyst_can_move_to_in_progress() -> None:
    incident = _FakeIncident()
    analyst = _RoleUser(2, "analyst@corp.internal", RoleEnum.SECURITY_ANALYST)
    db = _Db(incident, [analyst])
    updated = update_incident_status(
        11,
        IncidentStatusUpdate.model_validate({"status": "IN_PROGRESS", "note": "triage started"}),
        db,  # type: ignore[arg-type]
        analyst,  # type: ignore[arg-type]
    )
    assert incident.status is IncidentStatusEnum.UNDER_INVESTIGATION
    assert updated.status is IncidentStatusEnum.UNDER_INVESTIGATION


def test_analyst_cannot_assign_other_user() -> None:
    incident = _FakeIncident()
    analyst = _RoleUser(2, "analyst@corp.internal", RoleEnum.SECURITY_ANALYST)
    manager = _RoleUser(1, "mgr@corp.internal", RoleEnum.SECURITY_MANAGER)
    db = _Db(incident, [analyst, manager])
    with pytest.raises(HTTPException) as exc:
        assign_incident(11, IncidentAssign(assignee_user_id=1), db, analyst)  # type: ignore[arg-type]
    assert exc.value.status_code == 403


def test_analyst_can_claim_case() -> None:
    incident = _FakeIncident()
    analyst = _RoleUser(2, "analyst@corp.internal", RoleEnum.SECURITY_ANALYST)
    db = _Db(incident, [analyst])
    result = assign_incident(11, IncidentAssign(assignee_user_id=2), db, analyst)  # type: ignore[arg-type]
    assert incident.assigned_to_id == 2
    assert result.assignee_email == "analyst@corp.internal"


def test_enrich_resolves_assignee_email_from_relationship() -> None:
    """assigned_to_id set without __dict__ entry must still populate assignee_email."""

    class _Assignee:
        email = "analyst@corp.internal"

    class _OrmIncident:
        id = 11
        title = "UEBA alert"
        description = None
        status = IncidentStatusEnum.NEW
        severity = IncidentSeverityEnum.HIGH
        threat_score = 82
        employee_id = 1
        assigned_to_id = 2
        trigger_reason = "ML_AUTO_TRIGGER"
        triggered_at = datetime.now(timezone.utc)
        created_at = datetime.now(timezone.utc)
        updated_at = datetime.now(timezone.utc)
        resolved_at = None

        @property
        def employee(self) -> object:
            return type(
                "Employee",
                (),
                {
                    "emp_id": "emp_1",
                    "first_name": "Ava",
                    "last_name": "Chen",
                    "department": "Finance",
                },
            )()

        @property
        def assigned_to(self) -> _Assignee:
            return _Assignee()

        @property
        def comments(self) -> list[object]:
            return []

    enriched = _enrich(_OrmIncident())  # type: ignore[arg-type]
    assert enriched.assignee_email == "analyst@corp.internal"
    assert enriched.employee_name == "Ava Chen"


def test_create_task_records_open_status() -> None:
    incident = _FakeIncident()
    analyst = _RoleUser(2, "analyst@corp.internal", RoleEnum.SECURITY_ANALYST)
    db = _Db(incident, [analyst])
    task = create_incident_task(
        11,
        IncidentTaskCreate(title="Pull USB timeline", description="Check removable media"),
        db,  # type: ignore[arg-type]
        analyst,  # type: ignore[arg-type]
    )
    assert task.status is IncidentTaskStatusEnum.OPEN
    assert task.title == "Pull USB timeline"


class _FakeEmployee:
    def __init__(self) -> None:
        self.emp_id = "emp_1"
        self.first_name = "Ava"
        self.last_name = "Chen"
        self.department = "Finance"
        self.risk_score = 0.91
        self.risk_category = RiskCategoryEnum.CRITICAL
        self.access_isolated = False


class _FakeReportIncident:
    def __init__(self) -> None:
        self.id = 7
        self.title = "Suspicious transfer"
        self.status = IncidentStatusEnum.NEW
        self.severity = type("Sev", (), {"value": "HIGH"})()
        self.threat_score = 82
        self.employee = None
        self.trigger_reason = "ML_AUTO_TRIGGER"
        self.triggered_at = datetime(2026, 9, 16, 12, 0, tzinfo=timezone.utc)
        self.updated_at = datetime(2026, 9, 16, 12, 0, tzinfo=timezone.utc)


class _ReportQuery:
    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    def order_by(self, *args: object, **kwargs: object) -> "_ReportQuery":
        return self

    def limit(self, _n: int) -> "_ReportQuery":
        return self

    def all(self) -> list[object]:
        return self._rows


class _ReportDb:
    def query(self, model: object) -> _ReportQuery:
        name = getattr(model, "__name__", "")
        if name == "Employee":
            return _ReportQuery([_FakeEmployee()])
        if name == "IncidentComment":
            return _ReportQuery([])
        return _ReportQuery([_FakeReportIncident()])


def test_xlsx_export_is_office_openxml() -> None:
    summary = _build_executive_summary(_ReportDb())  # type: ignore[arg-type]
    payload = _xlsx_bytes(summary, "incidents")
    assert payload[:2] == b"PK"
    anomalies = _xlsx_bytes(summary, "anomalies")
    assert anomalies[:2] == b"PK"
