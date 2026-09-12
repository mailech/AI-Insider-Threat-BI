import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, model_validator

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    is_active: bool

# --- Device Asset Schema ---
class DeviceAssetSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: str
    asset_type: str
    ip_address: str
    mac_address: Optional[str] = None
    os_name: str
    status: str

# --- Risk Trajectory Schema ---
class RiskTrajectorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day_offset: int
    date: datetime.datetime
    score: float
    baseline_score: float

# --- Telemetry Log Schemas ---
class TelemetryLogSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: str
    employee_name: Optional[str] = None
    employee_department: Optional[str] = None
    event_type: str
    severity: str
    anomaly_category: Optional[str] = None
    source_ip: str
    timestamp: datetime.datetime
    description: str
    payload: Optional[Dict[str, Any]] = None
    incident_id: Optional[str] = None
    has_incident: bool = False
    source: Optional[str] = "seeded"



class TelemetryFilter(BaseModel):
    employee_id: Optional[str] = None
    severity: Optional[str] = None
    event_type: Optional[str] = None
    anomaly_category: Optional[str] = None
    limit: int = 50
    offset: int = 0

class TelemetrySummary(BaseModel):
    total_logs: int
    filtered_count: int
    critical_events: int
    high_events: int
    medium_events: int
    low_events: int
    info_events: int

# --- Behavioral Baseline Schemas (A1, Elevation Feature 1 & Milestone 3 UEBA) ---
class WeeklyRiskTrendPoint(BaseModel):
    week_index: int  # -8 to 0 (0 = Current Week)
    week_label: str  # e.g. "Week -8", "Current Week"
    start_date: str
    end_date: str
    avg_risk_score: float
    anomaly_count: int
    transfer_volume_gb: float

class LinearTrendProjection(BaseModel):
    slope: float
    intercept: float
    projected_7d_score: float
    projected_14d_score: float
    trend_direction: str  # RISING, STABLE, DECLINING
    projection_disclaimer: str = "Statistical Linear Extrapolation — Not a Predictive ML Model"
    projected_points: List[Dict[str, Any]] = []

class BehavioralBaselineResponse(BaseModel):
    employee_id: str
    employee_name: str
    department: str
    calculated_at: datetime.datetime

    # Login Baseline (Self)
    typical_login_start: str      # e.g. "08:30 AM"
    typical_login_end: str        # e.g. "09:30 AM"
    typical_login_median: str     # e.g. "08:45 AM"
    today_login_time: Optional[str] = None  # e.g. "08:52 AM" or "Not Logged Today"
    login_anomaly_flag: bool = False

    # Event Volume Baseline (Self)
    avg_daily_events: float       # e.g. 14.2
    today_event_count: int        # e.g. 19
    volume_anomaly_flag: bool = False

    # Data Transfer Volume Baseline (Self)
    avg_daily_transfer_mb: float  # e.g. 120.5 MB
    today_transfer_mb: float      # e.g. 14800.0 MB
    transfer_anomaly_flag: bool = False

    # Device & Network Usage Baseline (Self)
    primary_device_id: str        # e.g. "LAPTOP-FIN-8821"
    primary_source_ip: str        # e.g. "10.14.8.42"
    today_source_ip: Optional[str] = None
    device_anomaly_flag: bool = False

    total_historical_events_analyzed: int
    days_analyzed: int = 30

    # Elevation Feature 1 & Enhancement 4: Department Peer Group Benchmarks
    dept_name: Optional[str] = None
    dept_peer_count: int = 0
    dept_member_count: int = 1
    dept_avg_daily_events: float = 0.0
    dept_avg_daily_transfer_mb: float = 0.0
    dept_typical_login_median: Optional[str] = None
    event_volume_peer_multiple: float = 1.0
    transfer_peer_multiple: float = 1.0

    # Underlying raw comparison values for Peer Group Benchmark Visualizer
    employee_daily_events: float = 0.0
    employee_daily_transfer_mb: float = 0.0
    employee_total_transfer_mb: float = 0.0
    dept_avg_total_transfer_mb: float = 0.0
    has_sufficient_peer_data: bool = True

    # Milestone 1 & 2 Round 5 Feature C: Statistical Z-Score / Cohort Standard Deviation
    dept_std_daily_events: float = 0.0
    dept_std_daily_transfer_mb: float = 0.0
    z_score_daily_events: Optional[float] = None
    z_score_daily_transfer: Optional[float] = None
    cohort_sample_size_adequate: bool = True

    # In-Bounds Feature 2: 24-Hour Activity / Work Pattern Distribution
    hourly_activity_distribution: List[int] = []
    hourly_activity_spikes: List[int] = []

    # In-Bounds Feature 3: Communication Pattern / Exfiltration Baseline
    email_baseline_total: int = 0
    email_baseline_internal_pct: float = 100.0
    email_baseline_external_pct: float = 0.0
    email_today_total: int = 0
    email_today_internal_pct: float = 100.0
    email_today_external_pct: float = 0.0
    email_exfiltration_flag: bool = False

    # Milestone 2 Round 2 Feature 1: Top Application Usage & Productivity Baseline
    top_applications: List[Dict[str, Any]] = []
    unsanctioned_tools_detected: List[Dict[str, Any]] = []

    # Milestone 2 Round 2 Feature 2: Removable Media & USB Device Activity
    usb_total_events_30d: int = 0
    usb_unauthorized_detected: bool = False
    usb_unauthorized_device_ids: List[str] = []
    usb_events: List[Dict[str, Any]] = []

    # Milestone 1 & 2 Round 3 Feature 1: Remote Access & VPN Session Analysis
    vpn_total_sessions_30d: int = 0
    vpn_primary_gateway: Optional[str] = None
    vpn_recent_client_ips: List[str] = []
    vpn_avg_session_duration_mins: int = 0
    vpn_anomalous_sessions_detected: bool = False
    vpn_anomalies: List[Dict[str, Any]] = []

    # Milestone 2 Round 3 Feature 2: Resource & File Share Access Baseline
    top_repositories: List[Dict[str, Any]] = []
    out_of_scope_access_detected: bool = False
    out_of_scope_access_count: int = 0
    out_of_scope_repositories: List[Dict[str, Any]] = []

    # Milestone 1 & 2 Round 4 Feature 2: Network Destination Port & Protocol Breakdown
    network_total_events_30d: int = 0
    network_top_protocols: List[Dict[str, Any]] = []
    network_non_standard_ports_detected: bool = False
    network_flagged_connections: List[Dict[str, Any]] = []

    # Milestone 3 Feature C: UEBA Trend Analysis & Statistical Threat Projection
    weekly_risk_trends: List[WeeklyRiskTrendPoint] = []
    linear_trend_projection: Optional[LinearTrendProjection] = None




# --- Anomaly Thresholds & Detection Rules (Milestone 2 Round 2) ---

class AnomalyThresholdItem(BaseModel):
    category: str
    name: str
    condition: str
    metrics: Dict[str, Any]
    mitre_id: str
    mitre_name: str
    cert_taxonomy: str

# --- Anomaly Report Schemas (A3 & Elevation Feature 3 MITRE) ---
class AnomalyEventRead(BaseModel):

    id: int
    employee_id: str
    employee_name: str
    department: str
    risk_category: str
    anomaly_category: str
    mitre_technique_id: Optional[str] = None
    mitre_technique_name: Optional[str] = None
    event_type: str
    severity: str
    source_ip: str
    timestamp: datetime.datetime
    description: str
    payload: Optional[Dict[str, Any]] = None
    incident_id: Optional[str] = None
    has_incident: bool = False


class AnomalyReportResponse(BaseModel):
    total_anomalies: int
    filtered_count: int
    critical_count: int = 0
    active_mitre_techniques_count: int = 0
    most_affected_department: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    category_counts: Dict[str, int] = {}
    mitre_technique_counts: Dict[str, int] = {}
    department_counts: Dict[str, int] = {}
    severity_counts: Dict[str, int] = {}
    events: List[AnomalyEventRead] = []


# --- Investigation Notes Schemas (Elevation Feature 4 & Milestone 3 Linkage) ---
class InvestigationNoteCreate(BaseModel):
    note_text: Optional[str] = None
    note: Optional[str] = None
    incident_id: Optional[Any] = None

    @model_validator(mode="after")
    def populate_text(self):
        if not self.note_text and self.note:
            self.note_text = self.note
        if not self.note_text:
            self.note_text = ""
        return self

class InvestigationNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: str
    incident_id: Optional[Any] = None
    author_email: str
    author_name: str
    author_role: str
    note_text: str
    timestamp: datetime.datetime


# --- SOC Case Status Update (Elevation Feature 2) ---
class CaseStatusUpdateRequest(BaseModel):
    vpn_revocation_flagged: Optional[bool] = None
    containment_status: Optional[str] = None  # normal / isolated
    requires_mfa_reset: Optional[bool] = None
    training_assigned: Optional[bool] = None

# --- Employee Schemas ---
class EmployeeListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    department: str
    designation: str
    direct_manager: str
    enrolled_date: datetime.datetime
    threat_score: float
    risk_category: str
    avatar_initials: str
    last_active: datetime.datetime

    # SOC Case Flags
    vpn_revocation_flagged: bool = False
    containment_status: str = "normal"
    requires_mfa_reset: bool = False
    training_assigned: bool = False
    training_assigned_date: Optional[datetime.datetime] = None

    # Additive ML Corroboration Engine
    ml_corroboration_score: Optional[float] = None

class EmployeeDetail(EmployeeListItem):
    model_config = ConfigDict(from_attributes=True)

    device_assets: List[DeviceAssetSchema] = []
    trajectories: List[RiskTrajectorySchema] = []
    recent_logs: List[TelemetryLogSchema] = []
    notes: List[InvestigationNoteRead] = []
    access_privileges: Optional[List[Dict[str, Any]]] = None
    ml_feature_vector: Optional[Dict[str, float]] = None
    updated_at: datetime.datetime




# --- Dashboard & Analytics Schemas ---
class KPICards(BaseModel):
    total_employees: int
    critical_risk_alerts: int
    high_risk_users: int
    medium_risk_users: int
    low_risk_users: int
    avg_threat_score: float
    critical_rate: float
    high_risk_rate: float

class OverviewResponse(BaseModel):
    kpis: KPICards
    fleet_threat_score: float
    recent_alerts: List[EmployeeListItem]
    role_view: str
    role_specific_data: Dict[str, Any] = {}

class ThreatVelocityPoint(BaseModel):
    day_label: str
    date_str: str
    avg_score: float
    velocity_delta: float
    anomalies_count: int
    zone: str

class RiskDistributionItem(BaseModel):
    name: str
    count: int
    percentage: float
    color: str

class ScoreBandItem(BaseModel):
    band: str
    count: int
    employees: List[EmployeeListItem] = []

class DepartmentRiskItem(BaseModel):
    department: str
    employee_count: int
    high_risk_count: int
    avg_risk_score: float
    risk_category: str

class AnalyticsOverview(BaseModel):
    kpis: KPICards
    threat_velocity: List[ThreatVelocityPoint]
    risk_distribution: List[RiskDistributionItem]
    score_distribution: List[ScoreBandItem]
    department_breakdown: List[DepartmentRiskItem]

# --- Risk Recalculation ---
class RecalculateRequest(BaseModel):
    employee_id: str
    lookback_window: str = "24h"

class RecalculationComponent(BaseModel):
    name: str
    raw_score: float
    weight: float
    weighted_score: float
    description: str

class RecalculateResponse(BaseModel):
    employee_id: str
    employee_name: str
    previous_score: float
    new_score: float
    previous_tier: str
    new_tier: str
    lookback_window: str
    timestamp: datetime.datetime
    components: List[RecalculationComponent]
    events_analyzed: int
    preview_mode: bool = False

# --- Audit Log Schema ---
class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_email: str
    user_role: str
    action: str
    target_resource: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    timestamp: datetime.datetime

# --- Settings Schemas ---
class NotificationSettings(BaseModel):
    high_severity_alerts: bool = True
    critical_severity_urgent: bool = True
    daily_security_digest: bool = True
    alert_delivery_email: Optional[str] = "soc-team@ams.internal"

    # Milestone 4 Delivery Channel Configuration & Status
    email_delivery_configured: bool = False
    slack_delivery_configured: bool = False
    smtp_host: Optional[str] = ""
    smtp_port: Optional[int] = 587
    smtp_from: Optional[str] = "ams-alerts@enterprise.internal"
    slack_webhook_configured: bool = False
    last_digest_sent_at: Optional[datetime.datetime] = None

class NotificationDeliveryStatusResponse(BaseModel):
    email_configured: bool
    email_host: str
    email_recipient: str
    slack_configured: bool
    status_summary: str
    active_channels: List[str]
    delivery_mode: str = "inert_safeguard"

class DigestTriggerResponse(BaseModel):
    status: str
    timestamp: datetime.datetime
    digest_summary: Dict[str, Any]
    channels_attempted: List[str]
    delivery_status: Dict[str, str]
    audit_logged: bool

class ThreatScoringWeights(BaseModel):
    behavioral_anomalies: float = 0.35
    privilege_misuse: float = 0.25
    data_access_violations: float = 0.20
    access_pattern_deviations: float = 0.10
    historical_security_events: float = 0.10

class ServiceHealth(BaseModel):
    name: str
    status: str
    latency_ms: float
    details: str

class SystemHealthResponse(BaseModel):
    status: str
    timestamp: datetime.datetime
    services: List[ServiceHealth]
    api_base_url: str
    swagger_url: str
    jwt_standard: str = "HMAC-SHA256 (RFC 7519)"
    session_active: bool = True
    token_protection: str = "Bearer Token Header + TLS"


# ==============================================================================
# --- Milestone 3: Alert & Incident Management Schemas ---
# ==============================================================================

class IncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: str
    title: str
    description: str
    severity: str
    status: str  # Open, Investigating, Escalated, Resolved
    employee_id: str
    employee_name: Optional[str] = None
    employee_department: Optional[str] = None
    employee_designation: Optional[str] = None
    telemetry_event_id: Optional[int] = None
    anomaly_category: Optional[str] = None
    mitre_technique_id: Optional[str] = None
    mitre_technique_name: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assigned_to_email: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_role: Optional[str] = None
    created_at: datetime.datetime
    first_investigated_at: Optional[datetime.datetime] = None
    updated_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    resolution_summary: Optional[str] = None
    notes_count: int = 0
    mttd_seconds: Optional[float] = None
    mtti_minutes: Optional[float] = None
    mttr_hours: Optional[float] = None

class IncidentDetailResponse(IncidentRead):
    notes: List[InvestigationNoteRead] = []
    triggering_telemetry: Optional[TelemetryLogSchema] = None
    correlated_telemetry: List[TelemetryLogSchema] = []
    correlated_telemetry_2h: List[TelemetryLogSchema] = []
    employee_threat_score: Optional[float] = None
    employee_risk_category: Optional[str] = None

class IncidentStatusUpdateRequest(BaseModel):
    status: str  # Open, Investigating, Escalated, Resolved
    resolution_summary: Optional[str] = None
    note_text: Optional[str] = None

class IncidentAssignRequest(BaseModel):
    assigned_to_email: str

class IncidentMetricsResponse(BaseModel):
    total_incidents: int
    open_incidents: int
    investigating_incidents: int
    escalated_incidents: int
    resolved_incidents: int
    mttd_seconds_avg: Optional[float] = None
    mtti_minutes_avg: Optional[float] = None
    mttr_hours_avg: Optional[float] = None
    insufficient_resolved_history: bool = False

class IncidentListResponse(BaseModel):
    metrics: IncidentMetricsResponse
    incidents: List[IncidentRead]
    total_count: int


# ==============================================================================
# --- Milestone 3: Device-Centric Entity Fleet Schemas ---
# ==============================================================================

class DeviceFleetItem(BaseModel):
    id: int
    asset_id: str
    device_type: str
    model_name: str
    assigned_ip: str
    mac_address: str
    os_version: str
    employee_id: str
    employee_name: str
    department: str
    total_telemetry_events: int
    anomaly_events_count: int
    risk_status: str  # NORMAL, ELEVATED, HIGH_ANOMALY_DENSITY
    last_seen: datetime.datetime
    recent_anomaly_categories: List[str] = []

class DeviceFleetListResponse(BaseModel):
    total_devices: int
    elevated_devices_count: int
    device_type_counts: Dict[str, int]
    devices: List[DeviceFleetItem]


# ==============================================================================
# --- ML Anomaly Corroboration Schemas ---
# ==============================================================================

class MLModelMetadataResponse(BaseModel):
    is_trained: bool
    last_trained: Optional[str] = None
    sample_size: int = 0
    features_used: List[str] = []
    observed_min: Optional[float] = None
    observed_max: Optional[float] = None
    algorithm: str = "Multi-Feature Isolation Forest (Unsupervised Anomaly Detection)"
    hyperparameters: Dict[str, Any] = {}
    status: str = "Operational"

class MLRetrainResponse(MLModelMetadataResponse):
    employee_scores: Dict[str, float] = {}
    message: str = "ML model successfully retrained against current telemetry."


# ==============================================================================
# --- Live Windows Event Ingestion Schemas (Scoped Exception Module) ---
# ==============================================================================

class IdentityMappingCreate(BaseModel):
    windows_identifier: str
    employee_id: str
    description: Optional[str] = None

class IdentityMappingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    windows_identifier: str
    employee_id: str
    employee_name: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime.datetime
    created_by: str

class UnmappedIngestionLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    raw_identifier: str
    channel: str
    event_id: int
    event_type: str
    source_ip: str
    timestamp: datetime.datetime
    reason: str
    raw_details: Optional[Dict[str, Any]] = None

class LiveIngestionStatusResponse(BaseModel):
    is_enabled: bool
    is_running: bool
    is_windows: bool
    pywin32_available: bool
    has_event_log_access: bool
    last_event_timestamp: Optional[datetime.datetime] = None
    total_mapped_processed: int = 0
    total_unmapped_processed: int = 0
    channels_monitored: List[str] = []
    poll_interval_seconds: float = 5.0
    status_summary: str
    message: str

class SimulateEventRequest(BaseModel):
    channel: str = "Security"
    event_id: int = 4624
    raw_identifier: str  # e.g. "CORP\\elena.rostova" or "CORP\\unknown.intruder"
    source_ip: str = "10.14.8.42"
    details: Optional[Dict[str, Any]] = None

class SimulateEventResponse(BaseModel):
    status: str
    mapped: bool
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    telemetry_log_id: Optional[int] = None
    unmapped_log_id: Optional[int] = None
    event_type: str
    severity: str
    message: str


# ==============================================================================
# --- Showcase Attack Scenarios (Verified Real Data Only) ---
# ==============================================================================

class ShowcaseScenarioItem(BaseModel):
    incident_id: str
    title: str
    description: str
    severity: str
    status: str
    anomaly_category: Optional[str] = None
    mitre_technique_id: Optional[str] = None
    mitre_technique_name: Optional[str] = None
    created_at: datetime.datetime
    first_investigated_at: Optional[datetime.datetime] = None
    resolved_at: Optional[datetime.datetime] = None
    resolution_summary: Optional[str] = None
    employee_id: str
    employee_name: str
    employee_department: str
    employee_designation: str
    employee_threat_score: float
    employee_risk_category: str
    employee_containment_status: str
    telemetry_trigger: Optional[Dict[str, Any]] = None
    scenario_index: int
    scenario_label: str




