from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, Index
from backend.app.db.session import Base


class DailyBehavioralFeature(Base):
    __tablename__ = "daily_behavioral_features"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), index=True, nullable=False)
    date = Column(String(20), index=True, nullable=False)  # YYYY-MM-DD
    
    # Logon Features
    login_count = Column(Integer, default=0)
    logout_count = Column(Integer, default=0)
    after_hours_logon = Column(Integer, default=0)
    weekend_logon = Column(Integer, default=0)
    unique_pcs = Column(Integer, default=0)
    avg_login_hour = Column(Float, default=9.0)
    
    # Device (USB/Removable) Features
    device_connect_count = Column(Integer, default=0)
    device_disconnect_count = Column(Integer, default=0)
    after_hours_device = Column(Integer, default=0)
    weekend_device = Column(Integer, default=0)
    
    # File Features
    file_activity_count = Column(Integer, default=0)
    unique_files = Column(Integer, default=0)
    sensitive_file_activity = Column(Integer, default=0)
    after_hours_file = Column(Integer, default=0)
    weekend_file = Column(Integer, default=0)
    
    # HTTP Features
    http_request_count = Column(Integer, default=0)
    unique_domains = Column(Integer, default=0)
    after_hours_http = Column(Integer, default=0)
    weekend_http = Column(Integer, default=0)
    suspicious_domain_count = Column(Integer, default=0)
    
    # Email Features
    email_count = Column(Integer, default=0)
    attachment_count = Column(Integer, default=0)
    recipient_count = Column(Integer, default=0)
    avg_email_size = Column(Float, default=0.0)
    after_hours_email = Column(Integer, default=0)
    weekend_email = Column(Integer, default=0)
    
    # Behavioral Deviation / Anomaly Scores
    activity_deviation_score = Column(Float, default=0.0)
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)  # Raw ML score
    risk_score = Column(Float, default=0.0)     # 0 - 100
    severity = Column(String(20), default="LOW")
    contributing_factors = Column(JSON, default=list)
    raw_metrics = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_user_date", "user_id", "date", unique=True),
    )
