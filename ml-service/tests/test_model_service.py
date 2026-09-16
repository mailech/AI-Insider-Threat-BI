"""Test suite for the Insider Threat ML scoring service.

Tests:
  1. Health check — verifies model metadata
  2. Single score — verifies response structure
  3. Batch distribution — proves percentile ranking produces varied bands
  4. predict() vs decision_function() scale-mismatch — the critical test
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ── Test 1: Health Check ───────────────────────────────────────────────

def test_health_check():
    """GET /health returns 200 with correct model metadata."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["n_features"] == 5
    assert data["feature_cols"] == [
        "logon_count",
        "after_hours_logon_count",
        "usb_connect_count",
        "file_copy_count",
        "email_count",
    ]
    assert data["model_params"]["contamination"] == 0.03


# ── Test 2: Single Score ───────────────────────────────────────────────

def test_single_score():
    """POST /score with a known feature vector returns a complete response."""
    response = client.post("/score", json={
        "employee_id": "TEST-001",
        "logon_count": 20,
        "after_hours_logon_count": 2,
        "usb_connect_count": 1,
        "file_copy_count": 5,
        "email_count": 40,
    })
    assert response.status_code == 200

    data = response.json()
    assert data["employee_id"] == "TEST-001"
    assert "decision_function_score" in data
    assert "predict_label" in data
    assert data["predict_label"] in [-1, 1]
    assert "risk_band" in data
    assert data["risk_band"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    assert "risk_score" in data
    assert 0 <= data["risk_score"] <= 100


# ── Test 3: Batch Distribution ─────────────────────────────────────────

def test_batch_distribution():
    """POST /score/batch with varied magnitudes produces different risk bands.

    Feeds 20 synthetic employees with deliberately varied feature magnitudes
    to prove the percentile-ranking approach produces a real distribution,
    not everyone landing in the same band.
    """
    employees = []
    for i in range(20):
        # Vary magnitudes deliberately: some very low, some very high
        multiplier = (i + 1) * 5
        employees.append({
            "employee_id": f"BATCH-{i:03d}",
            "logon_count": 10 + multiplier,
            "after_hours_logon_count": 1 + (i * 3),
            "usb_connect_count": max(0, i - 5) * 10,
            "file_copy_count": (i ** 2),
            "email_count": 20 + multiplier * 2,
        })

    response = client.post("/score/batch", json={
        "employees": employees,
        "lookback_days": 30,
    })
    assert response.status_code == 200

    data = response.json()
    assert data["total_scored"] == 20
    assert data["lookback_days"] == 30

    # Verify that the band distribution has more than one band populated
    dist = data["band_distribution"]
    populated_bands = [band for band, count in dist.items() if count > 0]
    assert len(populated_bands) >= 2, (
        f"Expected at least 2 different risk bands, got: {dist}. "
        f"This means the percentile ranking isn't differentiating employees."
    )

    # Verify results are sorted by risk_score descending
    scores = [r["risk_score"] for r in data["results"]]
    assert scores == sorted(scores, reverse=True), "Results should be sorted by risk_score descending"


# ── Test 4: predict() vs decision_function() Scale-Mismatch ───────────

def test_predict_vs_decision_function_scale_mismatch():
    """CRITICAL TEST: Does raw predict() label everyone identically on mock-scale data?

    This test feeds two batches:
      A) Mock-scale data (small counts: 5-50 range, typical of short-window aggregation)
      B) Training-scale data (hundreds to thousands, matching the scaler's fitted means)

    It then checks whether predict() uniformly labels the entire batch the same way
    for mock-scale data — which is the specific failure mode the percentile-ranking
    mitigation guards against.

    IMPORTANT: This test documents observed behavior. It may PASS even if predict()
    labels everyone identically, because that's the expected behavior we're testing
    for. The test prints its observations for the README documentation.
    """
    # Batch A: Mock-scale data (short-window activity counts, 5-50 range)
    mock_scale_employees = [
        {"employee_id": f"MOCK-{i}", "logon_count": 5 + i * 3,
         "after_hours_logon_count": i, "usb_connect_count": max(0, i - 2),
         "file_copy_count": i * 2, "email_count": 10 + i * 5}
        for i in range(10)
    ]

    # Batch B: Training-scale data (cumulative counts, hundreds to thousands)
    training_scale_employees = [
        {"employee_id": f"TRAIN-{i}", "logon_count": 500 + i * 100,
         "after_hours_logon_count": 30 + i * 20, "usb_connect_count": 200 + i * 150,
         "file_copy_count": 300 + i * 100, "email_count": 2000 + i * 200}
        for i in range(10)
    ]

    # Score both batches
    mock_response = client.post("/score/batch", json={
        "employees": mock_scale_employees, "lookback_days": 30,
    })
    train_response = client.post("/score/batch", json={
        "employees": training_scale_employees, "lookback_days": 30,
    })

    assert mock_response.status_code == 200
    assert train_response.status_code == 200

    mock_data = mock_response.json()
    train_data = train_response.json()

    # Extract raw predict labels
    mock_labels = [r["predict_label"] for r in mock_data["results"]]
    train_labels = [r["predict_label"] for r in train_data["results"]]

    mock_all_same = len(set(mock_labels)) == 1
    train_all_same = len(set(train_labels)) == 1

    # Document observations (printed to test output via -v)
    print("\n" + "=" * 60)
    print("SCALE-MISMATCH TEST OBSERVATIONS")
    print("=" * 60)
    print(f"  Mock-scale predict() labels : {mock_labels}")
    print(f"  Mock-scale all same?        : {mock_all_same}")
    print(f"  Training-scale predict() labels : {train_labels}")
    print(f"  Training-scale all same?        : {train_all_same}")

    # Extract decision_function scores for analysis
    mock_scores = [r["decision_function_score"] for r in mock_data["results"]]
    train_scores = [r["decision_function_score"] for r in train_data["results"]]
    print(f"  Mock-scale decision_function range : [{min(mock_scores):.4f}, {max(mock_scores):.4f}]")
    print(f"  Training-scale decision_function range : [{min(train_scores):.4f}, {max(train_scores):.4f}]")

    # Verify that even if predict() is uniform, the percentile-based bands differ
    mock_bands = data_band_set(mock_data)
    train_bands = data_band_set(train_data)
    print(f"  Mock-scale risk bands used  : {mock_bands}")
    print(f"  Training-scale risk bands   : {train_bands}")

    if mock_all_same:
        print("\n  [!] CONFIRMED: predict() labels ALL mock-scale employees identically.")
        print("      This validates the need for percentile-based risk banding.")
    else:
        print("\n  [OK] predict() produces varied labels even on mock-scale data.")
        print("       The percentile mitigation is still beneficial for finer granularity.")

    print("=" * 60)

    # The actual assertion: percentile-based bands must still produce variety
    # even when predict() doesn't
    assert len(mock_bands) >= 2, (
        f"Percentile banding should produce at least 2 bands even on mock-scale data, "
        f"got: {mock_data['band_distribution']}"
    )


def data_band_set(data: dict) -> set:
    """Extract the set of populated risk bands from a batch response."""
    return {band for band, count in data["band_distribution"].items() if count > 0}
