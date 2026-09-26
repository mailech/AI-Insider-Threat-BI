import pytest
import os
import pandas as pd
import numpy as np
from ml.models.xgboost_model import InsiderThreatXGBoost
from ml.features.engineer import BehavioralFeatureEngineer


@pytest.fixture
def synthetic_labeled_data():
    engineer = BehavioralFeatureEngineer(rolling_window=3)
    
    rows = []
    # 30 normal rows
    for d in range(1, 31):
        rows.append({
            "user_id": f"USR00{d%5:02d}", "date": f"2026-01-{d:02d}",
            "login_count": 2, "logout_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0,
            "device_connect_count": 0, "device_disconnect_count": 0, "after_hours_device": 0, "weekend_device": 0,
            "file_activity_count": 10, "unique_files": 10, "sensitive_file_activity": 0, "after_hours_file": 0, "weekend_file": 0,
            "http_request_count": 100, "unique_domains": 20, "after_hours_http": 0, "weekend_http": 0, "suspicious_domain_count": 0,
            "email_count": 10, "attachment_count": 1, "recipient_count": 10, "avg_email_size": 0.5, "after_hours_email": 0, "weekend_email": 0,
            "is_insider": 0
        })

    # 4 malicious rows
    for m in range(1, 5):
        rows.append({
            "user_id": f"MAL000{m}", "date": f"2026-01-{m:02d}",
            "login_count": 5, "logout_count": 3, "after_hours_logon": 3, "weekend_logon": 1, "unique_pcs": 3, "avg_login_hour": 23.0,
            "device_connect_count": 5, "device_disconnect_count": 5, "after_hours_device": 5, "weekend_device": 1,
            "file_activity_count": 500, "unique_files": 450, "sensitive_file_activity": 120, "after_hours_file": 500, "weekend_file": 100,
            "http_request_count": 1200, "unique_domains": 80, "after_hours_http": 1000, "weekend_http": 200, "suspicious_domain_count": 15,
            "email_count": 80, "attachment_count": 35, "recipient_count": 80, "avg_email_size": 25.0, "after_hours_email": 80, "weekend_email": 20,
            "is_insider": 1
        })

    raw_df = pd.DataFrame(rows)
    return engineer.engineer_features(raw_df)


def test_xgboost_fit_and_predict(synthetic_labeled_data, tmp_path):
    y = synthetic_labeled_data["is_insider"]
    model = InsiderThreatXGBoost(n_estimators=30, max_depth=3, random_state=42)
    model.fit(synthetic_labeled_data, y)
    assert model.is_fitted is True

    # Predictions
    probs = model.predict_proba(synthetic_labeled_data)
    assert len(probs) == len(synthetic_labeled_data)
    assert probs.min() >= 0.0 and probs.max() <= 1.0

    # Insider threats should have high probability
    insider_probs = probs[synthetic_labeled_data["is_insider"] == 1]
    normal_probs = probs[synthetic_labeled_data["is_insider"] == 0]
    assert insider_probs.mean() > normal_probs.mean()

    # Feature importances
    assert len(model.feature_importances_) > 0

    # Explain prediction
    explanations = model.explain_prediction(synthetic_labeled_data.iloc[-1])
    assert isinstance(explanations, list)

    # Persistence
    save_file = os.path.join(tmp_path, "test_xgb.joblib")
    model.save(save_file)
    assert os.path.exists(save_file)
    assert os.path.exists(save_file.replace(".joblib", "_metadata.json"))

    loaded = InsiderThreatXGBoost.load(save_file)
    assert loaded.is_fitted is True
    re_probs = loaded.predict_proba(synthetic_labeled_data)
    assert np.allclose(probs, re_probs)
