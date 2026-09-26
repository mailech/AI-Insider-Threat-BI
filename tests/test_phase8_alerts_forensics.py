import pytest
import os
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.db.session import Base
from backend.app.models.employee import Employee
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident
from ml.alerts.generator import AlertEngine
from ml.incidents.correlator import IncidentCorrelator
from ml.forensics.timeline import ForensicTimelineGenerator


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    # Add employee
    emp = Employee(
        user_id="AAE0190",
        full_name="Alexander Evans",
        email="alexander.evans@dtaa.com",
        role="Senior Software Engineer",
        department="Engineering",
        current_risk_score=85.0,
        current_severity="CRITICAL"
    )
    db.add(emp)
    db.commit()
    
    try:
        yield db
    finally:
        db.close()


def test_alert_engine_generation(test_db):
    engine = AlertEngine()
    
    # 1. Normal record should not trigger high alert
    normal_rec = {"user_id": "AAE0190", "date": "2026-01-01", "anomaly_score": 0.1, "threat_probability": 0.05}
    normal_risk = {"risk_score": 15, "risk_level": "LOW"}
    assert engine.evaluate_record(normal_rec, normal_risk) is None

    # 2. Critical record triggers alert
    crit_rec = {
        "user_id": "AAE0190",
        "date": "2026-01-15",
        "anomaly_score": 0.92,
        "threat_probability": 0.95,
        "sensitive_file_activity": 12,
        "device_connect_count": 2,
        "after_hours_device": 2,
        "after_hours_logon": 1,
        "suspicious_domain_count": 2,
        "attachment_count": 6,
        "avg_email_size": 10.0
    }
    crit_risk = {"risk_score": 85, "risk_level": "CRITICAL"}
    
    alert = engine.evaluate_record(crit_rec, crit_risk)
    assert alert is not None
    assert alert["severity"] == "CRITICAL"
    assert alert["risk_score"] == 85.0
    assert len(alert["reasons"]) >= 4

    # Sync to DB
    count = engine.sync_alerts_to_db([alert], test_db)
    assert count == 1
    
    db_alert = test_db.query(Alert).filter(Alert.user_id == "AAE0190").first()
    assert db_alert is not None
    assert db_alert.severity == "CRITICAL"


def test_incident_correlator(test_db):
    # Insert 2 alerts for AAE0190
    a1 = Alert(
        alert_id="ALT-2026-0001",
        user_id="AAE0190",
        timestamp="2026-01-15T18:00:00Z",
        severity="CRITICAL",
        risk_score=85.0,
        anomaly_score=0.92,
        reasons=["Access to 12 sensitive files", "Removable USB storage connected"],
        status="NEW"
    )
    a2 = Alert(
        alert_id="ALT-2026-0002",
        user_id="AAE0190",
        timestamp="2026-01-16T18:00:00Z",
        severity="CRITICAL",
        risk_score=88.0,
        anomaly_score=0.95,
        reasons=["Outbound requests to unapproved cloud storage mega.nz", "High attachment volume sent to personal webmail"],
        status="NEW"
    )
    test_db.add_all([a1, a2])
    test_db.commit()

    correlator = IncidentCorrelator()
    created = correlator.sync_incidents_to_db(test_db)
    assert created == 1

    inc = test_db.query(Incident).filter(Incident.user_id == "AAE0190").first()
    assert inc is not None
    assert inc.severity == "CRITICAL"
    assert "Alexander Evans" in inc.title or "AAE0190" in inc.title
    assert len(inc.evidence_references) >= 2


def test_forensic_timeline_generator(tmp_path):
    # Create mock CSV files
    logon_csv = tmp_path / "logon.csv"
    logon_csv.write_text("id,date,user,pc,activity\nLOG-1,2026-01-15 22:30:00,AAE0190,PC-AAE0190,Logon\n", encoding="utf-8")

    device_csv = tmp_path / "device.csv"
    device_csv.write_text("id,date,user,pc,activity\nDEV-1,2026-01-15 22:45:00,AAE0190,PC-AAE0190,Connect\n", encoding="utf-8")

    file_csv = tmp_path / "file.csv"
    file_csv.write_text("id,date,user,pc,filename,content\nFIL-1,2026-01-15 22:50:00,AAE0190,PC-AAE0190,confidential_src.zip,DATA\n", encoding="utf-8")

    gen = ForensicTimelineGenerator(raw_data_dir=str(tmp_path))
    timeline = gen.get_user_timeline("AAE0190")

    assert len(timeline) == 3
    assert timeline[0]["channel"] == "LOGON"
    assert timeline[0]["is_anomalous"] is True
    assert timeline[1]["channel"] == "DEVICE"
    assert timeline[2]["channel"] == "FILE"
    assert timeline[2]["severity"] == "CRITICAL"
