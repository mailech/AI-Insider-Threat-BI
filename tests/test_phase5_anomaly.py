import pytest
import os
import pandas as pd
import numpy as np
from ml.models.isolation_forest import InsiderThreatIsolationForest
from ml.features.engineer import BehavioralFeatureEngineer


@pytest.fixture
def synthetic_behavioral_data():
    engineer = BehavioralFeatureEngineer(rolling_window=3)
    
    # 20 normal days for user 1
    normal_rows = []
    for d in range(1, 21):
        normal_rows.append({
            "user_id": "USR0001", "date": f"2026-01-{d:02d}",
            "login_count": 2, "logout_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0,
            "device_connect_count": 0, "device_disconnect_count": 0, "after_hours_device": 0, "weekend_device": 0,
            "file_activity_count": 10, "unique_files": 10, "sensitive_file_activity": 0, "after_hours_file": 0, "weekend_file": 0,
            "http_request_count": 100, "unique_domains": 20, "after_hours_http": 0, "weekend_http": 0, "suspicious_domain_count": 0,
            "email_count": 10, "attachment_count": 1, "recipient_count": 10, "avg_email_size": 0.5, "after_hours_email": 0, "weekend_email": 0
        })

    # 1 anomalous day for user 2 (Massive after-hours USB exfiltration)
    anom_row = {
        "user_id": "AAE0190", "date": "2026-01-22",
        "login_count": 5, "logout_count": 3, "after_hours_logon": 3, "weekend_logon": 1, "unique_pcs": 3, "avg_login_hour": 23.0,
        "device_connect_count": 5, "device_disconnect_count": 5, "after_hours_device": 5, "weekend_device": 1,
        "file_activity_count": 500, "unique_files": 450, "sensitive_file_activity": 120, "after_hours_file": 500, "weekend_file": 100,
        "http_request_count": 1200, "unique_domains": 80, "after_hours_http": 1000, "weekend_http": 200, "suspicious_domain_count": 15,
        "email_count": 80, "attachment_count": 35, "recipient_count": 80, "avg_email_size": 25.0, "after_hours_email": 80, "weekend_email": 20
    }

    raw_df = pd.DataFrame(normal_rows + [anom_row])
    return engineer.engineer_features(raw_df)


def test_isolation_forest_fit_and_score(synthetic_behavioral_data, tmp_path):
    model = InsiderThreatIsolationForest(n_estimators=50, contamination=0.05, random_state=42)
    model.fit(synthetic_behavioral_data)
    assert model.is_fitted is True

    scored = model.score_samples(synthetic_behavioral_data)
    assert not scored.empty
    assert "anomaly_score" in scored.columns
    assert "severity" in scored.columns
    assert "anomaly_factors" in scored.columns

    # Normal user scores should be low (< 0.70)
    normal_scores = scored[scored["user_id"] == "USR0001"]["anomaly_score"]
    assert normal_scores.mean() < 0.65

    # Anomalous record should be high score and flagged
    anom_res = scored[scored["user_id"] == "AAE0190"].iloc[0]
    assert anom_res["anomaly_score"] > 0.75
    assert anom_res["severity"] in ["HIGH", "CRITICAL"]
    assert len(anom_res["anomaly_factors"]) > 0

    # Verify model save and load
    save_file = os.path.join(tmp_path, "test_iso_forest.joblib")
    model.save(save_file)
    assert os.path.exists(save_file)
    assert os.path.exists(save_file.replace(".joblib", "_metadata.json"))

    loaded_model = InsiderThreatIsolationForest.load(save_file)
    assert loaded_model.is_fitted is True
    re_scored = loaded_model.score_samples(synthetic_behavioral_data)
    assert np.allclose(scored["anomaly_score"], re_scored["anomaly_score"])
