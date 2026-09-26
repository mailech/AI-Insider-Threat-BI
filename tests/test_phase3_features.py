import pytest
import pandas as pd
import numpy as np
from ml.features.engineer import BehavioralFeatureEngineer


@pytest.fixture
def sample_daily_data():
    return pd.DataFrame([
        # User 1: Normal working pattern
        {"user_id": "USR0001", "date": "2026-01-01", "login_count": 2, "logout_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "device_disconnect_count": 0, "after_hours_device": 0, "weekend_device": 0, "file_activity_count": 10, "unique_files": 10, "sensitive_file_activity": 0, "after_hours_file": 0, "weekend_file": 0, "http_request_count": 100, "unique_domains": 20, "after_hours_http": 0, "weekend_http": 0, "suspicious_domain_count": 0, "email_count": 10, "attachment_count": 1, "recipient_count": 10, "avg_email_size": 0.5, "after_hours_email": 0, "weekend_email": 0},
        {"user_id": "USR0001", "date": "2026-01-02", "login_count": 2, "logout_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "device_disconnect_count": 0, "after_hours_device": 0, "weekend_device": 0, "file_activity_count": 12, "unique_files": 12, "sensitive_file_activity": 0, "after_hours_file": 0, "weekend_file": 0, "http_request_count": 95, "unique_domains": 22, "after_hours_http": 0, "weekend_http": 0, "suspicious_domain_count": 0, "email_count": 12, "attachment_count": 1, "recipient_count": 12, "avg_email_size": 0.5, "after_hours_email": 0, "weekend_email": 0},
        {"user_id": "USR0001", "date": "2026-01-03", "login_count": 2, "logout_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "device_disconnect_count": 0, "after_hours_device": 0, "weekend_device": 0, "file_activity_count": 11, "unique_files": 11, "sensitive_file_activity": 0, "after_hours_file": 0, "weekend_file": 0, "http_request_count": 105, "unique_domains": 19, "after_hours_http": 0, "weekend_http": 0, "suspicious_domain_count": 0, "email_count": 9, "attachment_count": 0, "recipient_count": 9, "avg_email_size": 0.2, "after_hours_email": 0, "weekend_email": 0},
        # User 2: Malicious Exfiltration Spike on Day 3
        {"user_id": "AAE0190", "date": "2026-01-01", "login_count": 2, "logout_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "device_disconnect_count": 0, "after_hours_device": 0, "weekend_device": 0, "file_activity_count": 15, "unique_files": 15, "sensitive_file_activity": 0, "after_hours_file": 0, "weekend_file": 0, "http_request_count": 120, "unique_domains": 25, "after_hours_http": 0, "weekend_http": 0, "suspicious_domain_count": 0, "email_count": 15, "attachment_count": 1, "recipient_count": 15, "avg_email_size": 0.8, "after_hours_email": 0, "weekend_email": 0},
        {"user_id": "AAE0190", "date": "2026-01-02", "login_count": 2, "logout_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "device_disconnect_count": 0, "after_hours_device": 0, "weekend_device": 0, "file_activity_count": 14, "unique_files": 14, "sensitive_file_activity": 0, "after_hours_file": 0, "weekend_file": 0, "http_request_count": 115, "unique_domains": 20, "after_hours_http": 0, "weekend_http": 0, "suspicious_domain_count": 0, "email_count": 14, "attachment_count": 2, "recipient_count": 14, "avg_email_size": 0.6, "after_hours_email": 0, "weekend_email": 0},
        {"user_id": "AAE0190", "date": "2026-01-03", "login_count": 3, "logout_count": 2, "after_hours_logon": 1, "weekend_logon": 0, "unique_pcs": 2, "avg_login_hour": 22.0, "device_connect_count": 2, "device_disconnect_count": 2, "after_hours_device": 2, "weekend_device": 0, "file_activity_count": 180, "unique_files": 180, "sensitive_file_activity": 25, "after_hours_file": 180, "weekend_file": 0, "http_request_count": 450, "unique_domains": 30, "after_hours_http": 400, "weekend_http": 0, "suspicious_domain_count": 4, "email_count": 35, "attachment_count": 12, "recipient_count": 35, "avg_email_size": 15.0, "after_hours_email": 35, "weekend_email": 0}
    ])


def test_feature_engineering_pipeline(sample_daily_data):
    engineer = BehavioralFeatureEngineer(rolling_window=3)
    enriched = engineer.engineer_features(sample_daily_data)

    assert not enriched.empty
    assert "activity_volume_zscore" in enriched.columns
    assert "sensitive_file_zscore" in enriched.columns
    assert "attachment_zscore" in enriched.columns
    assert "unusual_login_indicator" in enriched.columns
    assert "unusual_usb_indicator" in enriched.columns
    assert "unusual_file_indicator" in enriched.columns
    assert "unusual_web_indicator" in enriched.columns
    assert "unusual_email_indicator" in enriched.columns
    assert "activity_deviation_score" in enriched.columns

    # Verify normal user on normal days has 0 anomaly indicators
    usr1_day1 = enriched[(enriched["user_id"] == "USR0001") & (enriched["date"] == "2026-01-01")].iloc[0]
    assert usr1_day1["unusual_login_indicator"] == 0
    assert usr1_day1["unusual_usb_indicator"] == 0
    assert usr1_day1["unusual_file_indicator"] == 0

    # Verify anomalous user on exfiltration spike day triggers indicators
    mal_day3 = enriched[(enriched["user_id"] == "AAE0190") & (enriched["date"] == "2026-01-03")].iloc[0]
    assert mal_day3["unusual_login_indicator"] == 1
    assert mal_day3["unusual_usb_indicator"] == 1
    assert mal_day3["unusual_file_indicator"] == 1
    assert mal_day3["unusual_web_indicator"] == 1
    assert mal_day3["unusual_email_indicator"] == 1
    assert mal_day3["activity_deviation_score"] > 0.8


def test_feature_column_names_contract():
    engineer = BehavioralFeatureEngineer()
    cols = engineer.get_feature_column_names()
    assert len(cols) > 25
    assert "login_count" in cols
    assert "sensitive_file_activity" in cols
    assert "activity_deviation_score" in cols
