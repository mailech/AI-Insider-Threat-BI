from app.models import UserRole


def test_create_and_fetch_employee(client, auth_headers):
    headers = auth_headers(UserRole.SECURITY_MANAGER)
    created = client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": "EMP500",
            "full_name": "Asha Menon",
            "email": "asha.menon@test.io",
            "designation": "Data Engineer",
        },
    )
    assert created.status_code == 201
    employee_id = created.json()["id"]

    fetched = client.get(f"/api/v1/employees/{employee_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["full_name"] == "Asha Menon"


def test_duplicate_employee_code_is_rejected(client, auth_headers):
    headers = auth_headers(UserRole.SECURITY_MANAGER)
    payload = {
        "employee_code": "EMP501",
        "full_name": "First Person",
        "email": "first@test.io",
        "designation": "Engineer",
    }
    client.post("/api/v1/employees", headers=headers, json=payload)

    response = client.post(
        "/api/v1/employees",
        headers=headers,
        json={**payload, "email": "second@test.io", "full_name": "Second Person"},
    )
    assert response.status_code == 409


def test_employee_cannot_manage_themselves(client, auth_headers, seed_org):
    org = seed_org()
    response = client.patch(
        f"/api/v1/employees/{org['report_id']}",
        headers=auth_headers(UserRole.SECURITY_MANAGER),
        json={"manager_id": org["report_id"]},
    )
    assert response.status_code == 400


def test_search_and_department_filters(client, auth_headers, seed_org):
    org = seed_org()
    headers = auth_headers(UserRole.SECURITY_ANALYST)

    all_employees = client.get("/api/v1/employees", headers=headers).json()
    assert all_employees["total"] == 2

    searched = client.get("/api/v1/employees?q=report", headers=headers).json()
    assert searched["total"] == 1
    assert searched["items"][0]["employee_code"] == "EMP002"

    by_department = client.get(
        f"/api/v1/employees?department_id={org['department_id']}", headers=headers
    ).json()
    assert by_department["total"] == 2

    empty = client.get("/api/v1/employees?department_id=9999", headers=headers).json()
    assert empty["total"] == 0


def test_pagination_splits_results(client, auth_headers, seed_org):
    seed_org()
    page = client.get(
        "/api/v1/employees?page=1&page_size=1", headers=auth_headers(UserRole.SECURITY_ANALYST)
    ).json()
    assert page["total"] == 2
    assert len(page["items"]) == 1


def test_deleting_employee_cascades_to_devices(client, auth_headers, seed_org, db):
    from app.models import Device

    org = seed_org()
    headers = auth_headers(UserRole.SECURITY_MANAGER)

    client.post(
        "/api/v1/devices",
        headers=auth_headers(UserRole.SOC_ENGINEER),
        json={"employee_id": org["report_id"], "hostname": "emp002-lt"},
    )
    assert db.query(Device).count() == 1

    assert client.delete(f"/api/v1/employees/{org['report_id']}", headers=headers).status_code == 204
    db.expire_all()
    assert db.query(Device).count() == 0


def test_privileges_can_be_added_and_removed(client, auth_headers, seed_org):
    org = seed_org()
    headers = auth_headers(UserRole.SECURITY_MANAGER)
    employee_id = org["report_id"]

    created = client.post(
        f"/api/v1/employees/{employee_id}/privileges",
        headers=headers,
        json={"employee_id": employee_id, "name": "Production Servers", "level": "ADMIN"},
    )
    assert created.status_code == 201
    privilege_id = created.json()["id"]

    listed = client.get(f"/api/v1/employees/{employee_id}/privileges", headers=headers).json()
    assert len(listed) == 1

    removed = client.delete(
        f"/api/v1/employees/{employee_id}/privileges/{privilege_id}", headers=headers
    )
    assert removed.status_code == 204


def test_missing_employee_is_404(client, auth_headers):
    response = client.get(
        "/api/v1/employees/424242", headers=auth_headers(UserRole.SECURITY_ANALYST)
    )
    assert response.status_code == 404
