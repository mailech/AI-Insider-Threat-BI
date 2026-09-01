"""Pydantic request/response schemas for the ML scoring service."""

from pydantic import BaseModel


class EmployeeFeatures(BaseModel):
    employee_id: str
    logon_count: float
    after_hours_logon_count: float
    usb_connect_count: float
    file_copy_count: float
    email_count: float


class BatchScoreRequest(BaseModel):
    employees: list[EmployeeFeatures]
    lookback_days: int = 30


class SingleScoreResponse(BaseModel):
    employee_id: str
    decision_function_score: float
    predict_label: int  # 1 = normal, -1 = anomaly (IsolationForest convention)
    risk_band: str  # CRITICAL / HIGH / MEDIUM / LOW
    risk_score: float  # 0-100, derived from percentile position


class BatchScoreResponse(BaseModel):
    lookback_days: int
    total_scored: int
    results: list[SingleScoreResponse]
    band_distribution: dict[str, int]  # e.g. {"CRITICAL": 1, "HIGH": 3, ...}


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    n_features: int
    feature_cols: list[str]
    model_params: dict
