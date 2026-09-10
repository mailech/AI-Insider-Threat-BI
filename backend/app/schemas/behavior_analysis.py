from pydantic import BaseModel
from typing import Optional


class BehaviorAnalysisResponse(BaseModel):
    employee_id: str

    # -----------------------------
    # Behavioral activity
    # -----------------------------

    logon_activity: int
    email_activity: int
    file_activity: int
    http_activity: int
    device_activity: int

    # -----------------------------
    # Device / activity diversity
    # -----------------------------

    logon_unique_devices: int
    email_unique_devices: int
    file_unique_devices: int
    http_unique_devices: int
    device_unique_devices: int

    # -----------------------------
    # Behavioral indicators
    # -----------------------------

    activity_volume: float
    activity_diversity: float
    device_diversity: float

    # -----------------------------
    # Anomaly indicators
    # -----------------------------

    anomaly_score: float
    anomaly_level: str

    # -----------------------------
    # Behavioral interpretation
    # -----------------------------

    behavioral_status: str
    explanation: str

    # -----------------------------
    # Last activity
    # -----------------------------

    last_logon_activity: Optional[str] = None
    last_email_activity: Optional[str] = None
    last_file_activity: Optional[str] = None
    last_http_activity: Optional[str] = None
    last_device_activity: Optional[str] = None