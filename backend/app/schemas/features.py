"""
ITBIS — Machine Learning Feature Vector Schemas (Milestone 2 - Step 2)
=====================================================================
Defines standardized feature representation extracted from raw behavioral telemetry
in MongoDB activity_logs for ingestion into ML anomaly detection & threat scoring pipelines.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class EmployeeFeatureVector(BaseModel):
    """
    Structured feature vector extracted from an employee's behavioral telemetry
    over a sliding historical time window (e.g., 14 days).
    """
    employee_id: str = Field(
        ...,
        examples=["emp_1001"],
        description="Human-readable employee identifier (e.g. 'emp_1001')",
    )
    window_days: int = Field(
        default=14,
        ge=1,
        le=365,
        examples=[14],
        description="Historical evaluation window in days",
    )
    off_hours_logon_count: int = Field(
        default=0,
        ge=0,
        description="Total logon events occurring outside normal business hours or on weekends",
    )
    total_file_download_mb: float = Field(
        default=0.0,
        ge=0.0,
        description="Cumulative volume of downloaded / retrieved files in megabytes",
    )
    total_file_upload_mb: float = Field(
        default=0.0,
        ge=0.0,
        description="Cumulative volume of outbound uploaded files in megabytes",
    )
    usb_device_connect_count: int = Field(
        default=0,
        ge=0,
        description="Count of external removable storage / USB connection events",
    )
    external_email_count: int = Field(
        default=0,
        ge=0,
        description="Count of emails sent or forwarded to external non-corporate domains",
    )
    privilege_escalation_count: int = Field(
        default=0,
        ge=0,
        description="Count of privilege escalation or unapproved sudo/root elevation attempts",
    )
    failed_logon_count: int = Field(
        default=0,
        ge=0,
        description="Total failed authentication or credential brute force attempts",
    )
    critical_event_count: int = Field(
        default=0,
        ge=0,
        description="Total events flagged with CRITICAL severity tier in the window",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "employee_id": "emp_1001",
                "window_days": 14,
                "off_hours_logon_count": 4,
                "total_file_download_mb": 1485.0,
                "total_file_upload_mb": 5800.0,
                "usb_device_connect_count": 0,
                "external_email_count": 4,
                "privilege_escalation_count": 0,
                "failed_logon_count": 0,
                "critical_event_count": 12,
            }
        }
    }
