"""Unit tests for the Milestone 3 five-factor risk formula and baseline matrix."""

from __future__ import annotations

from datetime import datetime, timezone

from app.services.baseline import compute_behavioral_profile
from app.services.scoring import calculate_threat_score


def test_spec_formula_all_ones() -> None:
    score = calculate_threat_score(
        anomaly_weight=1.0,
        frequency=0,
        asset_criticality=1.0,
        historical_severity=1.0,
        anomaly_score=1.0,
        privilege_score=1.0,
        data_access_score=1.0,
        pattern_deviation_score=1.0,
    )
    assert score == 100


def test_spec_formula_anomalies_only() -> None:
    score = calculate_threat_score(
        anomaly_weight=0.0,
        frequency=0,
        asset_criticality=0.0,
        historical_severity=0.0,
        anomaly_score=1.0,
        privilege_score=0.0,
        data_access_score=0.0,
        pattern_deviation_score=0.0,
    )
    assert score == 35


def test_spec_formula_mixed_weights() -> None:
    # 0.35*0.8 + 0.25*0.4 + 0.20*0.5 + 0.10*0.2 + 0.10*0.6 = 0.28+0.10+0.10+0.02+0.06 = 0.56
    score = calculate_threat_score(
        anomaly_weight=0.0,
        frequency=0,
        asset_criticality=0.0,
        historical_severity=0.6,
        anomaly_score=0.8,
        privilege_score=0.4,
        data_access_score=0.5,
        pattern_deviation_score=0.2,
    )
    assert score == 56


def test_baseline_login_hours_and_download_volume() -> None:
    logs = [
        {
            "event_type": "LOGIN",
            "payload": {"success": True},
            "timestamp": datetime(2026, 9, 15, 9, 0, tzinfo=timezone.utc),  # Tuesday
        },
        {
            "event_type": "LOGIN",
            "payload": {"success": True},
            "timestamp": datetime(2026, 9, 16, 10, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "FILE_DOWNLOAD",
            "payload": {"size_mb": 40.0},
            "timestamp": datetime(2026, 9, 16, 11, 0, tzinfo=timezone.utc),
        },
    ]
    profile = compute_behavioral_profile(logs, window_days=2)
    assert profile["typical_login_hour_start"] in {9, 10}
    assert profile["typical_login_hour_end"] in {9, 10}
    assert profile["avg_download_mb_per_day"] == 20.0
    assert profile["sample_event_count"] == 3
