"""
ITBIS — Machine Learning Feature Vector Schemas (Milestone 2 - Step 2)
=====================================================================
Defines standardized feature representation extracted from raw behavioral telemetry
in MongoDB activity_logs for ingestion into ML anomaly detection & threat scoring pipelines.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
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


class RiskFactorItem(BaseModel):
    """Specific behavioral factor contributing to the employee's anomaly score."""
    feature_name: str = Field(..., description="Internal feature column name")
    feature_label: str = Field(..., description="Human-friendly risk category title")
    value: float = Field(..., description="Observed value for this employee")
    baseline_mean: float = Field(..., description="Population baseline average")
    z_score: float = Field(..., description="Standard deviations away from population mean")
    risk_level: str = Field(..., description="Severity tier: CRITICAL, HIGH, MEDIUM, LOW")
    description: str = Field(..., description="Contextual explanation of this risk factor")


class AnomalyPredictionResult(BaseModel):
    """Inference output produced by the Isolation Forest ML Anomaly Engine."""
    employee_id: str = Field(..., description="Target employee identifier")
    anomaly_score: float = Field(..., ge=0.0, le=100.0, description="Normalized anomaly score (0-100)")
    raw_decision_score: float = Field(..., description="Raw Isolation Forest decision function score")
    is_anomaly: bool = Field(..., description="True if flagged as outlier / security threat")
    severity: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW, or NORMAL")
    contributing_risk_factors: list[RiskFactorItem] = Field(
        default_factory=list,
        description="Top behavioral factors driving the anomaly",
    )
    features: dict[str, float] = Field(
        default_factory=dict,
        description="Raw feature vector values used during inference",
    )
    evaluated_at: str = Field(..., description="ISO 8601 evaluation timestamp")


class ModelTrainingSummary(BaseModel):
    """Metadata and performance summary generated upon model training."""
    model_type: str = Field(default="IsolationForest")
    total_samples: int = Field(..., description="Total feature vectors trained on")
    anomalies_detected: int = Field(..., description="Count of detected outlier samples")
    contamination: float = Field(..., description="Target contamination rate")
    window_days: int = Field(..., description="Telemetry lookback window in days")
    n_estimators: int = Field(..., description="Number of Isolation Trees")
    model_path: str = Field(..., description="Saved model artifact path")
    scaler_path: str = Field(..., description="Saved scaler artifact path")
    trained_at: str = Field(..., description="ISO timestamp of training completion")
    precision_metrics: dict[str, Any] = Field(
        default_factory=dict,
        description="Precision, recall, F1, and accuracy evaluation metrics",
    )
