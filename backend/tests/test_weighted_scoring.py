"""Unit tests for the Milestone 3 five-factor risk formula and baseline matrix."""

from __future__ import annotations

from datetime import datetime, timezone

from types import SimpleNamespace

from app.models.domain import AccessLevelEnum, AssetTypeEnum, RiskCategoryEnum
from app.services.baseline import compute_behavioral_profile, extract_device_id
from app.services.scoring import (
    WEIGHT_ANOMALIES,
    WEIGHT_DATA_ACCESS,
    WEIGHT_HISTORY,
    WEIGHT_PATTERN,
    WEIGHT_PRIVILEGE,
    calculate_threat_score,
    derive_weighted_factors,
    score_to_risk_category,
)


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
    assert profile["typical_device_ids"] == []


def test_baseline_typical_device_ids_ranked() -> None:
    logs = [
        {
            "event_type": "LOGIN",
            "device_id": "ASSET-LT-001",
            "payload": {"success": True},
            "timestamp": datetime(2026, 9, 15, 9, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "FILE_DOWNLOAD",
            "payload": {"device_id": "ASSET-LT-001", "size_mb": 5.0},
            "timestamp": datetime(2026, 9, 15, 11, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "REMOTE_ACCESS",
            "payload": {"device_id": "VPN-GW-09", "success": True},
            "timestamp": datetime(2026, 9, 16, 22, 0, tzinfo=timezone.utc),
        },
    ]
    profile = compute_behavioral_profile(logs, window_days=2)
    assert profile["typical_device_ids"][0] == "ASSET-LT-001"
    assert "VPN-GW-09" in profile["typical_device_ids"]


def test_extract_device_id_from_payload_or_top_level() -> None:
    assert extract_device_id({"device_id": "ASSET-LT-001"}) == "ASSET-LT-001"
    assert extract_device_id({"payload": {"device_id": "HOST-A"}}) == "HOST-A"
    assert extract_device_id({"payload": {}}) is None


def test_spec_weights_match_milestone_formula() -> None:
    assert WEIGHT_ANOMALIES == 0.35
    assert WEIGHT_PRIVILEGE == 0.25
    assert WEIGHT_DATA_ACCESS == 0.20
    assert WEIGHT_PATTERN == 0.10
    assert WEIGHT_HISTORY == 0.10
    assert round(WEIGHT_ANOMALIES + WEIGHT_PRIVILEGE + WEIGHT_DATA_ACCESS + WEIGHT_PATTERN + WEIGHT_HISTORY, 4) == 1.0


def test_risk_category_band_boundaries() -> None:
    assert score_to_risk_category(0) == RiskCategoryEnum.LOW
    assert score_to_risk_category(29) == RiskCategoryEnum.LOW
    assert score_to_risk_category(30) == RiskCategoryEnum.MEDIUM
    assert score_to_risk_category(59) == RiskCategoryEnum.MEDIUM
    assert score_to_risk_category(60) == RiskCategoryEnum.HIGH
    assert score_to_risk_category(79) == RiskCategoryEnum.HIGH
    assert score_to_risk_category(80) == RiskCategoryEnum.CRITICAL
    assert score_to_risk_category(100) == RiskCategoryEnum.CRITICAL


def _dummy_employee(access_level: AccessLevelEnum = AccessLevelEnum.READ) -> SimpleNamespace:
    return SimpleNamespace(
        access_level=access_level,
        assets=[SimpleNamespace(asset_type=AssetTypeEnum.DEVICE)],
    )


def test_dummy_anomaly_data_risk_categories() -> None:
    """End-to-end: dummy telemetry → factor derivation → weighted score → risk band."""
    profile = {"typical_login_hour_start": 8, "typical_login_hour_end": 18}

    low_logs = [
        {
            "event_type": "LOGIN",
            "severity": "INFO",
            "payload": {"success": True},
            "timestamp": datetime(2026, 9, 16, 9, 30, tzinfo=timezone.utc),
        },
    ]
    low_factors = derive_weighted_factors(low_logs, _dummy_employee(), ml_anomaly_0_1=0.05, profile=profile)
    low_score = calculate_threat_score(
        anomaly_weight=low_factors["anomaly_weight"],
        frequency=int(low_factors["frequency"]),
        asset_criticality=low_factors["asset_criticality"],
        historical_severity=low_factors["historical_severity"],
        anomaly_score=low_factors["anomalies"],
        privilege_score=low_factors["privilege"],
        data_access_score=low_factors["data_access"],
        pattern_deviation_score=low_factors["pattern_deviation"],
    )
    assert score_to_risk_category(low_score) == RiskCategoryEnum.LOW

    critical_logs = [
        {
            "event_type": "PRIVILEGE_CHANGE",
            "severity": "CRITICAL",
            "payload": {"action": "admin_grant"},
            "timestamp": datetime(2026, 9, 17, 1, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "DATA_TRANSFER",
            "severity": "CRITICAL",
            "payload": {"size_mb": 9500.0},
            "timestamp": datetime(2026, 9, 17, 1, 30, tzinfo=timezone.utc),
        },
        {
            "event_type": "DATA_EXFILTRATION",
            "severity": "CRITICAL",
            "payload": {"size_mb": 4200.0},
            "timestamp": datetime(2026, 9, 17, 2, 0, tzinfo=timezone.utc),
        },
        {
            "event_type": "REMOTE_ACCESS",
            "severity": "CRITICAL",
            "payload": {"success": False, "attempts": 8, "off_hours": True},
            "timestamp": datetime(2026, 9, 17, 2, 30, tzinfo=timezone.utc),
        },
    ]
    critical_factors = derive_weighted_factors(
        critical_logs,
        _dummy_employee(AccessLevelEnum.ADMIN),
        ml_anomaly_0_1=0.95,
        profile=profile,
    )
    critical_score = calculate_threat_score(
        anomaly_weight=critical_factors["anomaly_weight"],
        frequency=int(critical_factors["frequency"]),
        asset_criticality=critical_factors["asset_criticality"],
        historical_severity=critical_factors["historical_severity"],
        anomaly_score=critical_factors["anomalies"],
        privilege_score=critical_factors["privilege"],
        data_access_score=critical_factors["data_access"],
        pattern_deviation_score=critical_factors["pattern_deviation"],
    )
    assert critical_score >= 80
    assert score_to_risk_category(critical_score) == RiskCategoryEnum.CRITICAL
