import pytest
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.db.session import Base
from backend.app.models.employee import Employee
from ml.risk.engine import ExplainableRiskEngine


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    # Add sample employees
    db.add(Employee(user_id="USR0001", full_name="Normal Staff", email="normal@dtaa.com", role="Staff", department="Engineering", current_risk_score=10.0, current_severity="LOW"))
    db.add(Employee(user_id="AAE0190", full_name="Exfil Admin", email="admin@dtaa.com", role="IT Admin", department="Security", current_risk_score=20.0, current_severity="LOW"))
    db.commit()
    
    try:
        yield db
    finally:
        db.close()


def test_normal_employee_risk_calculation():
    engine = ExplainableRiskEngine()
    normal_record = {
        "user_id": "USR0001",
        "anomaly_score": 0.10,
        "threat_probability": 0.05,
        "sensitive_file_activity": 0,
        "device_connect_count": 0,
        "after_hours_device": 0,
        "attachment_count": 1,
        "after_hours_logon": 0,
        "weekend_logon": 0,
        "unique_pcs": 1,
        "activity_deviation_score": 0.05
    }
    emp_context = {"role": "Staff", "neuroticism": 20.0, "agreeableness": 35.0, "conscientiousness": 35.0}
    
    result = engine.calculate_risk(normal_record, emp_context)
    assert result["risk_score"] < 40
    assert result["risk_level"] == "LOW"
    assert "ml_anomaly_factor" in result["risk_breakdown"]
    assert "privilege_role_factor" in result["risk_breakdown"]
    assert "data_sensitivity_factor" in result["risk_breakdown"]


def test_malicious_employee_critical_risk_calculation():
    engine = ExplainableRiskEngine()
    malicious_record = {
        "user_id": "AAE0190",
        "anomaly_score": 0.95,
        "threat_probability": 0.98,
        "sensitive_file_activity": 45,
        "device_connect_count": 4,
        "after_hours_device": 4,
        "attachment_count": 15,
        "suspicious_domain_count": 5,
        "avg_email_size": 20.0,
        "after_hours_logon": 2,
        "weekend_logon": 1,
        "unique_pcs": 3,
        "after_hours_http": 500,
        "after_hours_file": 200,
        "activity_deviation_score": 0.95,
        "activity_volume_zscore": 6.0,
        "sensitive_file_zscore": 8.0,
        "file_activity_zscore": 5.0
    }
    emp_context = {"role": "IT Admin", "neuroticism": 45.0, "agreeableness": 15.0, "conscientiousness": 18.0}

    result = engine.calculate_risk(malicious_record, emp_context)
    assert result["risk_score"] >= 80
    assert result["risk_level"] == "CRITICAL"
    assert len(result["key_drivers"]) >= 3


def test_risk_engine_dataframe_and_db_sync(test_db):
    engine = ExplainableRiskEngine()
    df = pd.DataFrame([
        {
            "user_id": "USR0001", "anomaly_score": 0.1, "threat_probability": 0.05,
            "sensitive_file_activity": 0, "device_connect_count": 0, "after_hours_device": 0,
            "attachment_count": 1, "after_hours_logon": 0, "weekend_logon": 0, "unique_pcs": 1,
            "activity_deviation_score": 0.05
        },
        {
            "user_id": "AAE0190", "anomaly_score": 0.92, "threat_probability": 0.95,
            "sensitive_file_activity": 30, "device_connect_count": 3, "after_hours_device": 3,
            "attachment_count": 10, "suspicious_domain_count": 4, "avg_email_size": 15.0,
            "after_hours_logon": 2, "weekend_logon": 1, "unique_pcs": 2, "after_hours_http": 300,
            "after_hours_file": 100, "activity_deviation_score": 0.90, "activity_volume_zscore": 5.0,
            "sensitive_file_zscore": 7.0, "file_activity_zscore": 4.0
        }
    ])

    scored_df = engine.score_dataframe(df, {"USR0001": {"role": "Staff"}, "AAE0190": {"role": "IT Admin"}})
    assert "risk_score" in scored_df.columns
    assert "risk_level" in scored_df.columns

    # Sync to DB
    updated = engine.sync_employee_risk_scores(scored_df, test_db)
    assert updated == 2

    # Check database records
    aae = test_db.query(Employee).filter(Employee.user_id == "AAE0190").first()
    assert aae.current_risk_score >= 80
    assert aae.current_severity == "CRITICAL"
