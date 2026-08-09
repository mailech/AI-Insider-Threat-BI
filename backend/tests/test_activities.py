from datetime import datetime, timedelta

from app.db.session import SessionLocal
from app.models import ActivityEvent, EventType, UserRole
from app.services.ingestion import is_after_hours


def _add_events(employee_id: int, specs: list[tuple[EventType, datetime]]) -> None:
    with SessionLocal() as session:
        session.add_all(
            ActivityEvent(
                employee_id=employee_id,
                event_type=event_type,
                timestamp=timestamp,
                is_after_hours=is_after_hours(timestamp),
                bytes_transferred=1000,
            )
            for event_type, timestamp in specs
        )
        session.commit()


def test_after_hours_flag_follows_business_window():
    assert is_after_hours(datetime(2026, 8, 3, 2, 30)) is True
    assert is_after_hours(datetime(2026, 8, 3, 23, 0)) is True
    assert is_after_hours(datetime(2026, 8, 3, 10, 0)) is False
    assert is_after_hours(datetime(2026, 8, 3, 18, 59)) is False


def test_created_event_is_flagged_after_hours(client, auth_headers, seed_org):
    org = seed_org()
    response = client.post(
        "/api/v1/activities",
        headers=auth_headers(UserRole.SOC_ENGINEER),
        json={
            "employee_id": org["report_id"],
            "event_type": "FILE_DOWNLOAD",
            "timestamp": "2026-08-03T02:15:00",
            "bytes_transferred": 5000,
        },
    )
    assert response.status_code == 201
    assert response.json()["is_after_hours"] is True


def test_event_for_unknown_employee_is_404(client, auth_headers):
    response = client.post(
        "/api/v1/activities",
        headers=auth_headers(UserRole.SOC_ENGINEER),
        json={"employee_id": 9999, "event_type": "LOGIN"},
    )
    assert response.status_code == 404


def test_filters_by_employee_type_and_date_range(client, auth_headers, seed_org):
    org = seed_org()
    now = datetime.utcnow().replace(microsecond=0)

    _add_events(
        org["report_id"],
        [
            (EventType.LOGIN, now - timedelta(days=1)),
            (EventType.FILE_DOWNLOAD, now - timedelta(days=1)),
            (EventType.FILE_DOWNLOAD, now - timedelta(days=20)),
        ],
    )
    _add_events(org["manager_id"], [(EventType.LOGIN, now - timedelta(days=1))])

    headers = auth_headers(UserRole.SECURITY_ANALYST)

    assert client.get("/api/v1/activities", headers=headers).json()["total"] == 4

    by_employee = client.get(
        f"/api/v1/activities?employee_id={org['report_id']}", headers=headers
    ).json()
    assert by_employee["total"] == 3

    by_type = client.get(
        "/api/v1/activities?event_type=FILE_DOWNLOAD", headers=headers
    ).json()
    assert by_type["total"] == 2

    window_start = (now - timedelta(days=3)).isoformat()
    by_window = client.get(
        f"/api/v1/activities?start={window_start}", headers=headers
    ).json()
    assert by_window["total"] == 3


def test_activity_rows_carry_employee_name(client, auth_headers, seed_org):
    org = seed_org()
    _add_events(org["report_id"], [(EventType.LOGIN, datetime.utcnow())])

    items = client.get(
        "/api/v1/activities", headers=auth_headers(UserRole.SECURITY_ANALYST)
    ).json()["items"]
    assert items[0]["employee_name"] == "Report Two"


def test_dashboard_summary_aggregates(client, auth_headers, seed_org):
    org = seed_org()
    now = datetime.utcnow().replace(microsecond=0)

    _add_events(
        org["report_id"],
        [
            (EventType.LOGIN, now - timedelta(hours=2)),
            (EventType.USB_CONNECT, now.replace(hour=3) - timedelta(days=1)),
            (EventType.FAILED_LOGIN, now - timedelta(days=2)),
        ],
    )

    summary = client.get(
        "/api/v1/dashboard/summary", headers=auth_headers(UserRole.SECURITY_ANALYST)
    ).json()

    assert summary["total_employees"] == 2
    assert summary["active_employees"] == 2
    assert summary["total_events"] == 3
    assert summary["usb_events"] == 1
    assert summary["failed_logins"] == 1
    assert summary["total_bytes_transferred"] == 3000
    assert len(summary["events_by_type"]) == 3
    assert summary["top_active_employees"][0]["full_name"] == "Report Two"
    assert len(summary["recent_events"]) == 3
