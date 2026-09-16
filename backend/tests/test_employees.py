"""Tests for /api/v1/employees endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.models.employee import Employee


BASE_URL = "/api/v1/employees"

VALID_EMPLOYEE_PAYLOAD = {
    "employee_code": "EMP-X001",
    "first_name": "Carol",
    "last_name": "White",
    "email": "carol.white@corp.example",
    "department": "Engineering",
    "designation": "DevOps Engineer",
    "manager": "Dave Manager",
    "access_level": "Privileged",
    "access_privileges": "aws,k8s,terraform",
    "devices": [
        {
            "name": "Carol-Macbook",
            "device_type": "Laptop",
            "operating_system": "macOS",
            "serial_number": "SN-CAROL-001",
        }
    ],
}


# ---------------------------------------------------------------------------
# GET /api/v1/employees
# ---------------------------------------------------------------------------

class TestListEmployees:
    def test_list_empty_returns_list(self, client: TestClient, auth_headers: dict):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_includes_created_employee(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        ids = [e["id"] for e in resp.json()]
        assert str(sample_employee.id) in ids

    def test_list_filter_by_department(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(BASE_URL, params={"department": "Engineering"}, headers=auth_headers)
        assert resp.status_code == 200
        for emp in resp.json():
            assert emp["department"] == "Engineering"

    def test_list_pagination_skip_limit(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(BASE_URL, params={"skip": 0, "limit": 1}, headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) <= 1

    def test_list_requires_auth(self, client: TestClient):
        resp = client.get(BASE_URL)
        assert resp.status_code == 401

    def test_full_name_computed_field_present(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        emp_data = next(e for e in resp.json() if e["id"] == str(sample_employee.id))
        assert emp_data["full_name"] == "Alice Smith"


# ---------------------------------------------------------------------------
# POST /api/v1/employees
# ---------------------------------------------------------------------------

class TestCreateEmployee:
    def test_create_success(self, client: TestClient, auth_headers: dict):
        resp = client.post(BASE_URL, json=VALID_EMPLOYEE_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["employee_code"] == VALID_EMPLOYEE_PAYLOAD["employee_code"]
        assert data["email"] == VALID_EMPLOYEE_PAYLOAD["email"]
        assert len(data["devices"]) == 1
        assert data["devices_count"] == 1

    def test_create_duplicate_code_returns_409(self, client: TestClient, auth_headers: dict):
        client.post(BASE_URL, json=VALID_EMPLOYEE_PAYLOAD, headers=auth_headers)
        resp = client.post(BASE_URL, json=VALID_EMPLOYEE_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 409

    def test_create_without_devices(self, client: TestClient, auth_headers: dict):
        payload = {**VALID_EMPLOYEE_PAYLOAD, "employee_code": "EMP-NODEV", "devices": []}
        resp = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["devices_count"] == 0

    def test_create_missing_required_fields_422(self, client: TestClient, auth_headers: dict):
        resp = client.post(BASE_URL, json={"employee_code": "EMP-BAD"}, headers=auth_headers)
        assert resp.status_code == 422

    def test_create_requires_auth(self, client: TestClient):
        resp = client.post(BASE_URL, json=VALID_EMPLOYEE_PAYLOAD)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/employees/{employee_id}
# ---------------------------------------------------------------------------

class TestGetEmployee:
    def test_get_existing(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(f"{BASE_URL}/{sample_employee.id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(sample_employee.id)
        assert data["employee_code"] == sample_employee.employee_code

    def test_get_nonexistent_returns_404(self, client: TestClient, auth_headers: dict):
        import uuid
        resp = client.get(f"{BASE_URL}/{uuid.uuid4()}", headers=auth_headers)
        assert resp.status_code == 404

    def test_get_requires_auth(self, client: TestClient, sample_employee: Employee):
        resp = client.get(f"{BASE_URL}/{sample_employee.id}")
        assert resp.status_code == 401

    def test_devices_included_in_response(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(f"{BASE_URL}/{sample_employee.id}", headers=auth_headers)
        assert resp.status_code == 200
        assert "devices" in resp.json()


# ---------------------------------------------------------------------------
# PATCH /api/v1/employees/{employee_id}
# ---------------------------------------------------------------------------

class TestUpdateEmployee:
    def test_update_department(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.patch(
            f"{BASE_URL}/{sample_employee.id}",
            json={"department": "Security"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["department"] == "Security"

    def test_update_multiple_fields(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.patch(
            f"{BASE_URL}/{sample_employee.id}",
            json={"first_name": "Alicia", "access_level": "Privileged"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Alicia"
        assert data["access_level"] == "Privileged"

    def test_update_nonexistent_returns_404(self, client: TestClient, auth_headers: dict):
        import uuid
        resp = client.patch(
            f"{BASE_URL}/{uuid.uuid4()}",
            json={"department": "X"},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_update_requires_auth(self, client: TestClient, sample_employee: Employee):
        resp = client.patch(f"{BASE_URL}/{sample_employee.id}", json={"department": "X"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/v1/employees/{employee_id}
# ---------------------------------------------------------------------------

class TestDeleteEmployee:
    def test_delete_success(self, client: TestClient, auth_headers: dict, db):
        """Create a throwaway employee and delete it."""
        from app.models.employee import Employee as EmpModel
        emp = EmpModel(
            employee_code="DEL-001",
            first_name="Delete",
            last_name="Me",
            email="deleteme@corp.example",
            department="Temp",
            designation="Temp",
        )
        db.add(emp)
        db.commit()
        db.refresh(emp)

        resp = client.delete(f"{BASE_URL}/{emp.id}", headers=auth_headers)
        assert resp.status_code == 204

        # Confirm it's gone
        resp2 = client.get(f"{BASE_URL}/{emp.id}", headers=auth_headers)
        assert resp2.status_code == 404

    def test_delete_nonexistent_returns_404(self, client: TestClient, auth_headers: dict):
        import uuid
        resp = client.delete(f"{BASE_URL}/{uuid.uuid4()}", headers=auth_headers)
        assert resp.status_code == 404

    def test_delete_requires_auth(self, client: TestClient, sample_employee: Employee):
        resp = client.delete(f"{BASE_URL}/{sample_employee.id}")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/employees/departments
# ---------------------------------------------------------------------------

class TestDepartments:
    URL = f"{BASE_URL}/departments"

    def test_departments_returns_list(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(self.URL, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        names = [d["department"] for d in data]
        assert "Engineering" in names

    def test_department_summary_fields(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(self.URL, headers=auth_headers)
        assert resp.status_code == 200
        for dept in resp.json():
            assert "department" in dept
            assert "employee_count" in dept
            assert "open_anomalies" in dept
            assert "average_risk_score" in dept
