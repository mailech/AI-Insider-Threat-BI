import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token


@pytest.fixture
def auth_headers():
    token = create_access_token(subject="admin", role="Administrator")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    return TestClient(app)


def test_ml_metrics_endpoint(client, auth_headers):
    response = client.get("/api/ml/metrics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "isolation_forest" in data
    assert "xgboost" in data
    assert "feature_importance" in data
    assert len(data["feature_importance"]) > 0
    assert data["xgboost"]["roc_auc"] >= 0.90


def test_ml_predict_endpoint(client, auth_headers):
    # Anomalous feature vector
    payload = {
        "user_id": "AAE0190",
        "date": "2026-01-20",
        "feature_vector": {
            "login_count": 5,
            "after_hours_logon": 3,
            "weekend_logon": 1,
            "unique_pcs": 3,
            "avg_login_hour": 23.0,
            "device_connect_count": 5,
            "after_hours_device": 5,
            "file_activity_count": 500,
            "sensitive_file_activity": 120,
            "http_request_count": 1200,
            "suspicious_domain_count": 15,
            "email_count": 80,
            "attachment_count": 35,
            "avg_email_size": 25.0
        }
    }
    response = client.post("/api/ml/predict", json=payload, headers=auth_headers)
    assert response.status_code == 200
    res = response.json()
    assert res["user_id"] == "AAE0190"
    assert res["risk_score"] >= 70
    assert res["severity"] in ["HIGH", "CRITICAL"]
    assert "risk_breakdown" in res
    assert len(res["factors"]) > 0


def test_forensic_timeline_endpoint(client, auth_headers):
    response = client.get("/api/activities/timeline/AAE0190", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert "user_id" in data
    assert data["user_id"] == "AAE0190"


def test_dashboard_stats_endpoint(client, auth_headers):
    response = client.get("/api/dashboard/stats", headers=auth_headers)
    assert response.status_code == 200
    stats = response.json()
    assert "total_employees" in stats
    assert "critical_threats" in stats
    assert "high_risk_users" in stats
    assert "open_incidents" in stats
