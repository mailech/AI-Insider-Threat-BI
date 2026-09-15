from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "running"

def test_login():
    r = client.post("/api/auth/login", data={"username":"admin","password":"Admin@123"})
    assert r.status_code == 200
    assert "access_token" in r.json()

def test_dashboard():
    token = client.post("/api/auth/login", data={"username":"admin","password":"Admin@123"}).json()["access_token"]
    r = client.get("/api/dashboard/summary", headers={"Authorization":f"Bearer {token}"})
    assert r.status_code == 200
    assert "employees" in r.json()
