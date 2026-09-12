"""Behaviour, anomaly, risk, UEBA and dashboard schemas (modules 4-6, 8, 10)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import AnomalyCategory, DetectionMethod, RiskCategory, Severity


# ---------- Behavioural profiling ----------
class BaselineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    events_analysed: int
    days_observed: int
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    mean_login_hour: float
    std_login_hour: float
    typical_start_hour: float
    typical_end_hour: float
    weekend_activity_ratio: float
    after_hours_ratio: float
    mean_daily_events: float
    mean_daily_downloads: float
    mean_daily_bytes: float
    mean_daily_uploads: float
    mean_daily_emails: float
    mean_external_emails: float
    mean_daily_usb_events: float
    quality_score: float
    updated_at: datetime


class BaselineDetail(BaselineOut):
    device_profile: Dict[str, Any] = {}
    application_profile: Dict[str, Any] = {}
    resource_profile: Dict[str, Any] = {}
    hourly_histogram: List[float] = []


class BaselineBuildRequest(BaseModel):
    employee_ids: Optional[List[int]] = None
    lookback_days: int = 90
    rebuild_all: bool = False


class BaselineBuildResult(BaseModel):
    baselines_built: int
    employees_skipped: int
    peer_groups_updated: int = 0
    details: List[Dict[str, Any]] = []


# ---------- Anomalies ----------
class AnomalyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    event_id: Optional[int] = None
    category: str
    detection_method: str
    severity: str
    title: str
    description: Optional[str] = None
    score: float
    confidence: float
    deviation_sigma: float
    observed_value: Optional[float] = None
    baseline_value: Optional[float] = None
    occurred_at: datetime
    detected_at: datetime
    is_false_positive: bool
    reviewed: bool
    alert_generated: bool


class AnomalyDetail(AnomalyOut):
    features: Dict[str, Any] = {}


class DetectionRunRequest(BaseModel):
    employee_ids: Optional[List[int]] = None
    lookback_days: int = 30
    create_alerts: bool = True


class DetectionRunResult(BaseModel):
    employees_analysed: int
    events_analysed: int
    anomalies_detected: int
    alerts_created: int
    risk_scores_updated: int
    by_category: Dict[str, int] = {}
    duration_ms: int = 0


# ---------- Risk scoring ----------
class RiskComponentBreakdown(BaseModel):
    behavioral_anomalies: float
    privilege_misuse: float
    data_access_violations: float
    access_pattern_deviations: float
    historical_security_events: float


class RiskScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    score: float
    category: str
    previous_score: float
    trend: str
    behavioral_anomaly_component: float
    privilege_misuse_component: float
    data_access_component: float
    access_deviation_component: float
    historical_events_component: float
    window_days: int
    computed_at: datetime


class RiskScoreDetail(RiskScoreOut):
    raw_components: RiskComponentBreakdown
    contributing_factors: List[Dict[str, Any]] = []
    weights: Dict[str, float] = {}


class RiskTrendPoint(BaseModel):
    date: str
    score: float
    category: str


class RiskDistribution(BaseModel):
    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0


# ---------- UEBA ----------
class PeerComparison(BaseModel):
    feature: str
    employee_value: float
    peer_mean: float
    peer_p95: float
    z_score: float
    verdict: str  # normal|elevated|outlier


class UEBAProfile(BaseModel):
    employee_id: int
    employee_name: str
    department: Optional[str] = None
    peer_group: str
    peer_group_size: int
    risk_score: float
    risk_category: str
    comparisons: List[PeerComparison] = []
    behavioral_trend: List[Dict[str, Any]] = []
    outlier_score: float = 0.0
    prediction: Dict[str, Any] = {}


class ThreatPrediction(BaseModel):
    employee_id: int
    employee_name: str
    department: Optional[str] = None
    current_score: float
    predicted_score_7d: float
    escalation_probability: float
    confidence: float
    drivers: List[str] = []


# ---------- Dashboards ----------
class KPI(BaseModel):
    label: str
    value: float
    unit: Optional[str] = None
    delta: Optional[float] = None
    trend: Optional[str] = None


class AnalystDashboard(BaseModel):
    kpis: List[KPI]
    open_alerts: List[Dict[str, Any]]
    top_risky_employees: List[Dict[str, Any]]
    investigation_queue: List[Dict[str, Any]]
    incident_summary: Dict[str, int]
    anomalies_by_category: Dict[str, int]


class SocDashboard(BaseModel):
    kpis: List[KPI]
    security_events_timeline: List[Dict[str, Any]]
    behavioral_anomalies: List[Dict[str, Any]]
    active_investigations: List[Dict[str, Any]]
    threat_intelligence: Dict[str, Any]
    severity_breakdown: Dict[str, int]


class ManagerDashboard(BaseModel):
    kpis: List[KPI]
    organizational_risk_posture: Dict[str, Any]
    risk_trends: List[Dict[str, Any]]
    department_risk: List[Dict[str, Any]]
    insider_threat_summary: Dict[str, Any]
    compliance_metrics: Dict[str, Any]


class AdminDashboard(BaseModel):
    kpis: List[KPI]
    user_stats: Dict[str, Any]
    platform_analytics: Dict[str, Any]
    system_health: Dict[str, Any]
    recent_audit_logs: List[Dict[str, Any]]
