from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class DailyBehavioralFeatureResponse(BaseModel):
    id: int
    user_id: str
    date: str
    login_count: int
    logout_count: int
    after_hours_logon: int
    weekend_logon: int
    unique_pcs: int
    avg_login_hour: float
    device_connect_count: int
    device_disconnect_count: int
    after_hours_device: int
    weekend_device: int
    file_activity_count: int
    unique_files: int
    sensitive_file_activity: int
    after_hours_file: int
    weekend_file: int
    http_request_count: int
    unique_domains: int
    after_hours_http: int
    weekend_http: int
    suspicious_domain_count: int
    email_count: int
    attachment_count: int
    recipient_count: int
    avg_email_size: float
    after_hours_email: int
    weekend_email: int
    activity_deviation_score: float
    is_anomaly: bool
    anomaly_score: float
    risk_score: float
    severity: str
    contributing_factors: List[str] = []
    raw_metrics: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
