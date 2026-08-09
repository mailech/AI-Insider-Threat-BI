from app.models import UserRole

HEADER = "employee_code,event_type,timestamp,source,ip_address,bytes_transferred,details\n"


def _upload(client, headers, csv_text: str):
    return client.post(
        "/api/v1/activities/ingest",
        headers=headers,
        files={"file": ("events.csv", csv_text.encode("utf-8"), "text/csv")},
    )


def test_valid_batch_is_inserted(client, auth_headers, seed_org):
    seed_org()
    csv_text = HEADER + (
        "EMP002,LOGIN,2026-08-03T09:00:00,ACTIVE_DIRECTORY,10.0.0.5,0,\n"
        "EMP002,FILE_DOWNLOAD,2026-08-03T23:40:00,ENDPOINT_AGENT,10.0.0.5,4096,q3.xlsx\n"
        "EMP001,USB_CONNECT,2026-08-04T02:10:00,ENDPOINT_AGENT,10.0.0.9,0,\n"
    )
    response = _upload(client, auth_headers(UserRole.SOC_ENGINEER), csv_text)

    assert response.status_code == 200
    assert response.json() == {"received": 3, "inserted": 3, "rejected": 0, "errors": []}


def test_after_hours_is_computed_during_ingestion(client, auth_headers, seed_org):
    seed_org()
    headers = auth_headers(UserRole.SOC_ENGINEER)
    _upload(
        client,
        headers,
        HEADER
        + "EMP002,LOGIN,2026-08-03T09:00:00,ACTIVE_DIRECTORY,10.0.0.5,0,\n"
        + "EMP002,LOGIN,2026-08-03T23:40:00,ACTIVE_DIRECTORY,10.0.0.5,0,\n",
    )

    after_hours = client.get("/api/v1/activities?after_hours=true", headers=headers).json()
    assert after_hours["total"] == 1


def test_bad_rows_are_reported_without_losing_the_batch(client, auth_headers, seed_org):
    seed_org()
    csv_text = HEADER + (
        "EMP002,LOGIN,2026-08-03T09:00:00,ACTIVE_DIRECTORY,10.0.0.5,0,\n"
        "EMP999,LOGIN,2026-08-03T09:00:00,ACTIVE_DIRECTORY,10.0.0.5,0,\n"
        "EMP002,TELEPORT,2026-08-03T09:00:00,ACTIVE_DIRECTORY,10.0.0.5,0,\n"
        "EMP002,LOGIN,not-a-timestamp,ACTIVE_DIRECTORY,10.0.0.5,0,\n"
    )
    result = _upload(client, auth_headers(UserRole.SOC_ENGINEER), csv_text).json()

    assert result["received"] == 4
    assert result["inserted"] == 1
    assert result["rejected"] == 3
    assert len(result["errors"]) == 3
    assert "EMP999" in result["errors"][0]


def test_missing_required_columns_is_reported(client, auth_headers, seed_org):
    seed_org()
    result = _upload(
        client, auth_headers(UserRole.SOC_ENGINEER), "employee_code,event_type\nEMP002,LOGIN\n"
    ).json()

    assert result["inserted"] == 0
    assert "timestamp" in result["errors"][0]


def test_empty_file_is_reported(client, auth_headers, seed_org):
    seed_org()
    result = _upload(client, auth_headers(UserRole.SOC_ENGINEER), "").json()
    assert result["inserted"] == 0
    assert result["errors"]


def test_analyst_cannot_upload(client, auth_headers, seed_org):
    seed_org()
    response = _upload(
        client, auth_headers(UserRole.SECURITY_ANALYST), HEADER + "EMP002,LOGIN,2026-08-03T09:00:00,,,,\n"
    )
    assert response.status_code == 403
