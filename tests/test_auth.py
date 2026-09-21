import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "system" in data
    assert data["status"] == "OPERATIONAL"

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_auth_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@soc.corp", "password": "analyst123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "analyst@soc.corp"
    assert data["user"]["role"] == "Security Analyst"

def test_auth_login_invalid():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@soc.corp", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_role_based_access():
    # Login as Analyst
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@soc.corp", "password": "analyst123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Analyst can view employees
    emp_res = client.get("/api/v1/employees", headers=headers)
    assert emp_res.status_code == 200
    assert len(emp_res.json()) >= 20
