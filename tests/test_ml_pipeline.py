import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@soc.corp", "password": "analyst123"}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_anomaly_scores_endpoint(auth_headers):
    res = client.get("/api/v1/anomalies", headers=auth_headers)
    assert res.status_code == 200
    scores = res.json()
    assert len(scores) > 0
    first = scores[0]
    assert "isolation_forest" in first
    assert "oneclass_svm" in first
    assert "autoencoder" in first
    assert "graph_analytics" in first
    assert "gnn_score" in first
    assert "ensemble_score" in first

def test_explainability_endpoint(auth_headers):
    res = client.get("/api/v1/anomalies/explain/EMP-007", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["employee_id"] == "EMP-007"
    assert "models" in data
    assert "shap_feature_importance" in data
    assert "lime_weights" in data

def test_graph_network_topology(auth_headers):
    res = client.get("/api/v1/anomalies/graph-network", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0
