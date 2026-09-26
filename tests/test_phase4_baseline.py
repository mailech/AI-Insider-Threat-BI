import pytest
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.db.session import Base
from backend.app.models.baseline import BehavioralBaseline
from ml.baseline.engine import BehavioralBaselineEngine


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_activity_history():
    return pd.DataFrame([
        # User 1: 5 days of normal baseline activity
        {"user_id": "USR0001", "login_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "after_hours_device": 0, "file_activity_count": 10, "sensitive_file_activity": 0, "after_hours_file": 0, "http_request_count": 100, "suspicious_domain_count": 0, "email_count": 10, "attachment_count": 1, "is_insider": 0},
        {"user_id": "USR0001", "login_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.2, "device_connect_count": 0, "after_hours_device": 0, "file_activity_count": 12, "sensitive_file_activity": 0, "after_hours_file": 0, "http_request_count": 110, "suspicious_domain_count": 0, "email_count": 12, "attachment_count": 1, "is_insider": 0},
        {"user_id": "USR0001", "login_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 8.8, "device_connect_count": 0, "after_hours_device": 0, "file_activity_count": 8, "sensitive_file_activity": 0, "after_hours_file": 0, "http_request_count": 90, "suspicious_domain_count": 0, "email_count": 8, "attachment_count": 0, "is_insider": 0},
        {"user_id": "USR0001", "login_count": 3, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "after_hours_device": 0, "file_activity_count": 11, "sensitive_file_activity": 0, "after_hours_file": 0, "http_request_count": 105, "suspicious_domain_count": 0, "email_count": 11, "attachment_count": 2, "is_insider": 0},
        {"user_id": "USR0001", "login_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.1, "device_connect_count": 0, "after_hours_device": 0, "file_activity_count": 9, "sensitive_file_activity": 0, "after_hours_file": 0, "http_request_count": 95, "suspicious_domain_count": 0, "email_count": 9, "attachment_count": 1, "is_insider": 0},
        
        # User 2: Exfiltration user with 1 malicious day excluded
        {"user_id": "AAE0190", "login_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "after_hours_device": 0, "file_activity_count": 15, "sensitive_file_activity": 0, "after_hours_file": 0, "http_request_count": 120, "suspicious_domain_count": 0, "email_count": 15, "attachment_count": 1, "is_insider": 0},
        {"user_id": "AAE0190", "login_count": 2, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1, "avg_login_hour": 9.0, "device_connect_count": 0, "after_hours_device": 0, "file_activity_count": 14, "sensitive_file_activity": 0, "after_hours_file": 0, "http_request_count": 115, "suspicious_domain_count": 0, "email_count": 14, "attachment_count": 2, "is_insider": 0},
        {"user_id": "AAE0190", "login_count": 5, "after_hours_logon": 3, "weekend_logon": 1, "unique_pcs": 3, "avg_login_hour": 23.0, "device_connect_count": 4, "after_hours_device": 4, "file_activity_count": 300, "sensitive_file_activity": 50, "after_hours_file": 300, "http_request_count": 800, "suspicious_domain_count": 10, "email_count": 50, "attachment_count": 20, "is_insider": 1},
    ])


def test_baseline_calculation(sample_activity_history):
    engine = BehavioralBaselineEngine()
    baselines = engine.calculate_baselines(sample_activity_history, exclude_known_anomalies=True)

    assert not baselines.empty
    assert set(baselines["user_id"].unique()) == {"USR0001", "AAE0190"}
    
    # Check USR0001 login_count baseline
    usr1_login = baselines[(baselines["user_id"] == "USR0001") & (baselines["metric_name"] == "login_count")].iloc[0]
    assert usr1_login["sample_size"] == 5
    assert usr1_login["mean"] == pytest.approx(2.2, 0.1)

    # Check AAE0190 sensitive_file_activity baseline (malicious row with 50 files excluded)
    aae_file = baselines[(baselines["user_id"] == "AAE0190") & (baselines["metric_name"] == "sensitive_file_activity")].iloc[0]
    assert aae_file["sample_size"] == 2
    assert aae_file["mean"] == 0.0


def test_baseline_deviation_detection(sample_activity_history):
    engine = BehavioralBaselineEngine()
    baselines = engine.calculate_baselines(sample_activity_history, exclude_known_anomalies=True)

    # Normal daily record for USR0001
    normal_record = {
        "user_id": "USR0001",
        "login_count": 2,
        "file_activity_count": 10,
        "sensitive_file_activity": 0,
        "attachment_count": 1
    }
    res_normal = engine.detect_baseline_deviations(normal_record, baselines)
    assert res_normal["has_baseline"] is True
    assert res_normal["anomalous_metrics_count"] == 0

    # Anomalous record for USR0001 (100 sensitive files, 15 attachments)
    anomalous_record = {
        "user_id": "USR0001",
        "login_count": 6,
        "file_activity_count": 250,
        "sensitive_file_activity": 85,
        "attachment_count": 25
    }
    res_anomaly = engine.detect_baseline_deviations(anomalous_record, baselines)
    assert res_anomaly["has_baseline"] is True
    assert res_anomaly["anomalous_metrics_count"] >= 3
    assert res_anomaly["max_zscore"] > 3.0


def test_baseline_db_sync(test_db, sample_activity_history):
    engine = BehavioralBaselineEngine()
    baselines = engine.calculate_baselines(sample_activity_history)
    synced_count = engine.sync_to_db(baselines, test_db)

    assert synced_count > 0
    db_records = test_db.query(BehavioralBaseline).all()
    assert len(db_records) == synced_count

    # Verify querying from DB
    usr1_db = test_db.query(BehavioralBaseline).filter(
        BehavioralBaseline.user_id == "USR0001",
        BehavioralBaseline.metric_name == "login_count"
    ).first()
    assert usr1_db is not None
    assert usr1_db.mean > 0
