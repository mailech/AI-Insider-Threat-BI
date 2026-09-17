"""Unit tests for Milestone 3 incident auto-trigger and report builders."""

from __future__ import annotations

from app.api.v1.endpoints.incidents import CRITICAL_SCORE_THRESHOLD, _severity_from_score, auto_trigger_incident
from app.models.domain import IncidentSeverityEnum


def test_severity_bands_from_score() -> None:
    assert _severity_from_score(40) is IncidentSeverityEnum.LOW
    assert _severity_from_score(60) is IncidentSeverityEnum.MEDIUM
    assert _severity_from_score(80) is IncidentSeverityEnum.HIGH
    assert _severity_from_score(91) is IncidentSeverityEnum.CRITICAL


def test_threshold_is_greater_than_75() -> None:
    assert CRITICAL_SCORE_THRESHOLD == 75


class _FakeQuery:
    def filter(self, *args: object, **kwargs: object) -> "_FakeQuery":
        return self

    def order_by(self, *args: object, **kwargs: object) -> "_FakeQuery":
        return self

    def first(self) -> None:
        return None


class _FakeDb:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.committed = False

    def query(self, *_args: object) -> _FakeQuery:
        return _FakeQuery()

    def add(self, obj: object) -> None:
        self.added.append(obj)

    def commit(self) -> None:
        self.committed = True

    def refresh(self, obj: object) -> None:
        if getattr(obj, "id", None) is None:
            obj.id = 1  # type: ignore[attr-defined]


class _FakeEmployee:
    id = 42
    emp_id = "emp_1001"
    first_name = "Marcus"
    last_name = "Hale"
    department = "Finance"


def test_auto_trigger_skips_at_or_below_threshold() -> None:
    db = _FakeDb()
    emp = _FakeEmployee()
    assert auto_trigger_incident(emp=emp, threat_score=75, db=db) is None  # type: ignore[arg-type]
    assert db.committed is False


def test_auto_trigger_creates_high_incident() -> None:
    db = _FakeDb()
    emp = _FakeEmployee()
    incident = auto_trigger_incident(emp=emp, threat_score=82, db=db)  # type: ignore[arg-type]
    assert incident is not None
    assert incident.severity is IncidentSeverityEnum.HIGH
    assert incident.threat_score == 82
    assert db.committed is True
