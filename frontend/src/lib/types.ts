export type UserRole = 
  | 'Administrator'
  | 'Security Manager'
  | 'SOC Engineer'
  | 'Security Analyst';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type RiskTier = 'Critical' | 'High' | 'Medium' | 'Low';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AnomalyCategory =
  | 'UNUSUAL_LOGIN_TIME'
  | 'ABNORMAL_DATA_DOWNLOAD'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'EXCESSIVE_FILE_TRANSFER'
  | 'SUSPICIOUS_DEVICE_USAGE';

export interface DeviceAsset {
  id: number;
  asset_id: string;
  asset_type: string;
  ip_address: string;
  mac_address?: string | null;
  os_name: string;
  status: string;
}

export interface RiskTrajectory {
  day_offset: number;
  date: string;
  score: number;
  baseline_score: number;
}

export interface TelemetryLog {
  id: number;
  employee_id: string;
  employee_name?: string;
  employee_department?: string;
  event_type: string;
  severity: SeverityLevel;
  anomaly_category?: AnomalyCategory | string | null;
  mitre_technique_id?: string | null;
  mitre_technique_name?: string | null;
  source_ip: string;
  timestamp: string;
  description: string;
  payload?: Record<string, any> | null;
  incident_id?: string | null;
  has_incident?: boolean;
  source?: string | null;
}




export interface BehavioralBaseline {
  employee_id: string;
  employee_name: string;
  department: string;
  calculated_at: string;
  typical_login_start: string;
  typical_login_end: string;
  typical_login_median: string;
  today_login_time?: string | null;
  login_anomaly_flag: boolean;
  avg_daily_events: number;
  today_event_count: number;
  volume_anomaly_flag: boolean;
  avg_daily_transfer_mb: number;
  today_transfer_mb: number;
  transfer_anomaly_flag: boolean;
  primary_device_id: string;
  primary_source_ip: string;
  today_source_ip?: string | null;
  device_anomaly_flag: boolean;
  total_historical_events_analyzed: number;
  days_analyzed: number;

  // Elevation Feature 1 & Enhancement 4: Department Peer Group Benchmarks
  dept_name?: string | null;
  dept_peer_count?: number;
  dept_member_count?: number;
  dept_avg_daily_events?: number;
  dept_avg_daily_transfer_mb?: number;
  dept_typical_login_median?: string | null;
  event_volume_peer_multiple?: number;
  transfer_peer_multiple?: number;

  // Underlying raw comparison values for Peer Group Benchmark Visualizer
  employee_daily_events?: number;
  employee_daily_transfer_mb?: number;
  employee_total_transfer_mb?: number;
  dept_avg_total_transfer_mb?: number;
  has_sufficient_peer_data?: boolean;

  // Milestone 1 & 2 Round 5 Feature C: Statistical Z-Score / Cohort Standard Deviation
  dept_std_daily_events?: number;
  dept_std_daily_transfer_mb?: number;
  z_score_daily_events?: number | null;
  z_score_daily_transfer?: number | null;
  cohort_sample_size_adequate?: boolean;


  // In-Bounds Feature 2: 24-Hour Activity / Work Pattern Distribution
  hourly_activity_distribution?: number[];
  hourly_activity_spikes?: number[];

  // In-Bounds Feature 3: Communication Pattern / Exfiltration Baseline
  email_baseline_total?: number;
  email_baseline_internal_pct?: number;
  email_baseline_external_pct?: number;
  email_today_total?: number;
  email_today_internal_pct?: number;
  email_today_external_pct?: number;
  email_exfiltration_flag?: boolean;

  // Milestone 2 Round 2 Feature 1: Top Application Usage Profile
  top_applications?: {
    name: string;
    count: number;
    percentage: number;
    is_unsanctioned: boolean;
  }[];
  unsanctioned_tools_detected?: {
    name: string;
    process_name: string;
    severity: SeverityLevel;
    timestamp: string;
    description: string;
  }[];

  // Milestone 2 Round 2 Feature 2: Removable Media & USB Security
  usb_total_events_30d?: number;
  usb_unauthorized_detected?: boolean;
  usb_unauthorized_device_ids?: string[];
  usb_events?: {
    device_id: string;
    device_name: string;
    status: string;
    severity: string;
    timestamp: string;
    description: string;
  }[];

  // Milestone 1 & 2 Round 3 Feature 1: Remote Access & VPN Security
  vpn_total_sessions_30d?: number;
  vpn_primary_gateway?: string | null;
  vpn_recent_client_ips?: string[];
  vpn_avg_session_duration_mins?: number;
  vpn_anomalous_sessions_detected?: boolean;
  vpn_anomalies?: {
    gateway_name: string;
    client_ip: string;
    timestamp: string;
    severity: SeverityLevel;
    description: string;
    anomaly_type?: string;
    duration_mins?: number;
  }[];

  // Milestone 2 Round 3 Feature 2: Resource & File Share Access Baseline
  top_repositories?: {
    repository: string;
    access_count: number;
    percentage: number;
    is_in_scope: boolean;
  }[];
  out_of_scope_access_detected?: boolean;
  out_of_scope_access_count?: number;
  out_of_scope_repositories?: {
    repository_path: string;
    target_department: string;
    severity: SeverityLevel;
    timestamp: string;
    description: string;
    action: string;
  }[];

  // Milestone 1 & 2 Round 4 Feature 2: Network Destination Port & Protocol Breakdown
  network_total_events_30d?: number;
  network_top_protocols?: {
    port: number;
    protocol: string;
    count: number;
    percentage: number;
    is_standard: boolean;
  }[];
  network_non_standard_ports_detected?: boolean;
  network_flagged_connections?: {
    destination_ip: string;
    destination_port: number;
    protocol: string;
    severity: SeverityLevel;
    timestamp: string;
    description: string;
    bytes_sent?: number;
    bytes_received?: number;
  }[];

  // Milestone 3 Feature C: UEBA Weekly Behavioral Trends & Linear Projection
  weekly_risk_trends?: WeeklyRiskTrendPoint[];
  linear_trend_projection?: LinearTrendProjection;
}

export interface WeeklyRiskTrendPoint {
  week_index: number;
  week_label: string;
  start_date: string;
  end_date: string;
  avg_risk_score: number;
  anomaly_count: number;
  transfer_volume_gb: number;
}

export interface LinearTrendProjection {
  slope: number;
  intercept: number;
  projected_7d_score: number;
  projected_14d_score: number;
  trend_direction: 'RISING' | 'STABLE' | 'DECLINING';
  projection_disclaimer: string;
  projected_points: {
    day_offset: number;
    day_label: string;
    score: number;
    is_projection: boolean;
  }[];
}



export interface AnomalyThreshold {

  category: string;
  name: string;
  condition: string;
  metrics: Record<string, any>;
  mitre_id: string;
  mitre_name: string;
  cert_taxonomy: string;
}

export interface AnomalyEvent {

  id: number;
  employee_id: string;
  employee_name: string;
  department: string;
  risk_category: RiskTier;
  anomaly_category: AnomalyCategory | string;
  mitre_technique_id?: string | null;
  mitre_technique_name?: string | null;
  event_type: string;
  severity: SeverityLevel;
  source_ip: string;
  timestamp: string;
  description: string;
  payload?: Record<string, any> | null;
  incident_id?: string | null;
  has_incident?: boolean;
}


export interface AnomalyReportResponse {
  total_anomalies: number;
  filtered_count: number;
  critical_count?: number;
  active_mitre_techniques_count?: number;
  most_affected_department?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  category_counts: Record<string, number>;
  mitre_technique_counts?: Record<string, number>;
  department_counts?: Record<string, number>;
  severity_counts?: Record<string, number>;
  events: AnomalyEvent[];
}


export interface InvestigationNote {
  id: number;
  employee_id: string;
  author_email: string;
  author_name: string;
  author_role: UserRole | string;
  note_text: string;
  timestamp: string;
}

export interface CaseStatusUpdatePayload {
  vpn_revocation_flagged?: boolean;
  containment_status?: 'normal' | 'isolated' | string;
  requires_mfa_reset?: boolean;
  training_assigned?: boolean;
}

export interface TelemetrySummary {
  total_logs: number;
  filtered_count: number;
  critical_events: number;
  high_events: number;
  medium_events: number;
  low_events: number;
  info_events: number;
}

export interface EmployeeListItem {
  id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  direct_manager: string;
  enrolled_date: string;
  threat_score: number;
  risk_category: RiskTier;
  avatar_initials: string;
  last_active: string;

  // SOC Case Flags
  vpn_revocation_flagged?: boolean;
  containment_status?: 'normal' | 'isolated' | string;
  requires_mfa_reset?: boolean;
  training_assigned?: boolean;
  training_assigned_date?: string | null;

  // Additive ML Corroboration Engine
  ml_corroboration_score?: number | null;
}

export interface AccessPrivilege {
  id: string;
  name: string;
  level: 'Standard' | 'High Risk' | 'Critical' | 'Elevated Admin' | string;
  system_resource: string;
  description: string;
}

export interface EmployeeDetail extends EmployeeListItem {
  device_assets: DeviceAsset[];
  trajectories: RiskTrajectory[];
  recent_logs: TelemetryLog[];
  notes?: InvestigationNote[];
  access_privileges?: AccessPrivilege[];
  ml_feature_vector?: Record<string, number> | null;
  updated_at: string;
}



export interface KPICards {
  total_employees: number;
  critical_risk_alerts: number;
  high_risk_users: number;
  medium_risk_users: number;
  low_risk_users: number;
  avg_threat_score: number;
  critical_rate: number;
  high_risk_rate: number;
}

export interface OverviewResponse {
  kpis: KPICards;
  fleet_threat_score: number;
  recent_alerts: EmployeeListItem[];
  role_view: string;
  role_specific_data: Record<string, any>;
}

export interface ThreatVelocityPoint {
  day_label: string;
  date_str: string;
  avg_score: number;
  velocity_delta: number;
  anomalies_count: number;
  zone: RiskTier;
}

export interface RiskDistributionItem {
  name: RiskTier;
  count: number;
  percentage: number;
  color: string;
}

export interface ScoreBandItem {
  band: string;
  count: number;
  employees: EmployeeListItem[];
}

export interface DepartmentRiskItem {
  department: string;
  employee_count: number;
  high_risk_count: number;
  avg_risk_score: number;
  risk_category: RiskTier;
}

export interface AnalyticsOverview {
  kpis: KPICards;
  threat_velocity: ThreatVelocityPoint[];
  risk_distribution: RiskDistributionItem[];
  score_distribution: ScoreBandItem[];
  department_breakdown: DepartmentRiskItem[];
}

export interface RecalculateRequest {
  employee_id: string;
  lookback_window: string;
}

export interface RecalculationComponent {
  name: string;
  raw_score: number;
  weight: number;
  weighted_score: number;
  description: string;
}

export interface RecalculateResponse {
  employee_id: string;
  employee_name: string;
  previous_score: number;
  new_score: number;
  previous_tier: RiskTier;
  new_tier: RiskTier;
  lookback_window: string;
  timestamp: string;
  components: RecalculationComponent[];
  events_analyzed: number;
  preview_mode?: boolean;
}

export interface AuditLog {
  id: number;
  user_email: string;
  user_role: UserRole;
  action: string;
  target_resource?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  timestamp: string;
}


export interface NotificationSettings {
  high_severity_alerts: boolean;
  critical_severity_urgent: boolean;
  daily_security_digest: boolean;
  alert_delivery_email?: string;
}

export interface ThreatScoringWeights {
  behavioral_anomalies: number;
  privilege_misuse: number;
  data_access_violations: number;
  access_pattern_deviations: number;
  historical_security_events: number;
}

export interface ServiceHealth {
  name: string;
  status: string;
  latency_ms: number;
  details: string;
}

export interface SystemHealthResponse {
  status: string;
  timestamp: string;
  services: ServiceHealth[];
  api_base_url: string;
  swagger_url: string;
  jwt_standard: string;
  session_active: boolean;
  token_protection: string;
}

// ==============================================================================
// --- Milestone 3: Incident Management & Threat Investigation Types ---
// ==============================================================================

export type IncidentStatus = 'Open' | 'Investigating' | 'Escalated' | 'Resolved';

export interface Incident {
  id: number;
  incident_id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  employee_id: string;
  employee_name?: string | null;
  employee_department?: string | null;
  employee_designation?: string | null;
  telemetry_event_id?: number | null;
  anomaly_category?: string | null;
  mitre_technique_id?: string | null;
  mitre_technique_name?: string | null;
  assigned_to_user_id?: number | null;
  assigned_to_email?: string | null;
  assigned_to_name?: string | null;
  assigned_to_role?: string | null;
  created_at: string;
  first_investigated_at?: string | null;
  updated_at: string;
  resolved_at?: string | null;
  resolution_summary?: string | null;
  notes_count?: number;
  mttd_seconds?: number | null;
  mtti_minutes?: number | null;
  mttr_hours?: number | null;
}

export interface IncidentDetailResponse extends Incident {
  notes: InvestigationNote[];
  triggering_telemetry?: TelemetryLog | null;
  correlated_telemetry: TelemetryLog[];
  correlated_telemetry_2h?: TelemetryLog[];
  employee_threat_score?: number;
  employee_risk_category?: RiskTier;
}

export interface IncidentMetrics {
  total_incidents: number;
  open_incidents: number;
  investigating_incidents: number;
  escalated_incidents: number;
  resolved_incidents: number;
  mttd_seconds_avg?: number | null;
  mtti_minutes_avg?: number | null;
  mttr_hours_avg?: number | null;
  insufficient_resolved_history?: boolean;
}

export interface IncidentListResponse {
  metrics: IncidentMetrics;
  incidents: Incident[];
  total_count: number;
}

// ==============================================================================
// --- Milestone 3: Entity / Device-Centric View Types ---
// ==============================================================================

export interface DeviceFleetItem {
  id: number;
  asset_id: string;
  device_type: string;
  model_name: string;
  assigned_ip: string;
  mac_address: string;
  os_version: string;
  employee_id: string;
  employee_name: string;
  department: string;
  total_telemetry_events: number;
  anomaly_events_count: number;
  risk_status: 'NORMAL' | 'ELEVATED' | 'HIGH_ANOMALY_DENSITY';
  last_seen: string;
  recent_anomaly_categories: string[];
}

export interface DeviceFleetListResponse {
  total_devices: number;
  elevated_devices_count: number;
  device_type_counts: Record<string, number>;
  devices: DeviceFleetItem[];
}

// ==============================================================================
// --- ML Anomaly Corroboration Engine Types ---
// ==============================================================================

export interface MLModelMetadata {
  is_trained: boolean;
  last_trained?: string | null;
  sample_size: number;
  features_used: string[];
  observed_min?: number | null;
  observed_max?: number | null;
  algorithm: string;
  hyperparameters: Record<string, any>;
  status: string;
}

export interface MLRetrainResponse extends MLModelMetadata {
  employee_scores?: Record<string, number>;
  message: string;
}

// ==============================================================================
// --- Milestone 4: Notification Delivery & Executive Intelligence Types ---
// ==============================================================================

export interface NotificationDeliveryStatus {
  email_configured: boolean;
  email_from?: string | null;
  email_host?: string | null;
  slack_configured: boolean;
  slack_webhook_masked?: string | null;
  delivery_mode: string;
}

export interface ExecutiveKPIs {
  fleet_threat_score: number;
  total_employees: number;
  critical_risk_alerts: number;
  high_risk_users: number;
  medium_risk_users: number;
  low_risk_users: number;
  critical_rate: number;
  high_risk_rate: number;
  fleet_risk_tier: string;
}

export interface ExecutiveTopRiskEmployee {
  id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  threat_score: number;
  risk_category: string;
  ml_corroboration_score?: number | null;
  containment_status: string;
  mitre_indicator: string;
  incident_count: number;
  total_incident_count: number;
}

export interface ExecutiveDepartmentItem {
  department: string;
  employee_count: number;
  high_risk_count: number;
  avg_risk_score: number;
  risk_tier: string;
  egress_share_pct: number;
  anomaly_count: number;
}

export interface ExecutiveSOCMetrics {
  total_incidents: number;
  open_incidents: number;
  investigating_incidents: number;
  escalated_incidents: number;
  resolved_incidents: number;
  mttd_seconds_avg: number;
  mtti_minutes_avg: number;
  mttr_hours_avg?: number | null;
  resolved_ratio_pct: number;
}

export interface ExecutiveSummaryResponse {
  kpis: ExecutiveKPIs;
  top_risk_employees: ExecutiveTopRiskEmployee[];
  department_breakdown: ExecutiveDepartmentItem[];
  soc_metrics: ExecutiveSOCMetrics;
  mitre_techniques: { technique: string; count: number }[];
  threat_velocity: { day_label: string; date_str: string; score: number; risk_tier: string }[];
  generated_at_utc: string;
}

// Live Windows Ingestion Types (Scoped Exception Module)
export interface IdentityMapping {
  id: number;
  windows_identifier: string;
  employee_id: string;
  employee_name?: string;
  department?: string;
  description?: string;
  created_at: string;
  created_by: string;
}

export interface UnmappedIngestionLogItem {
  id: number;
  raw_identifier: string;
  channel: string;
  event_id: number;
  event_type: string;
  source_ip: string;
  timestamp: string;
  reason: string;
  raw_details?: Record<string, any> | null;
}

export interface LiveIngestionStatus {
  is_enabled: boolean;
  is_running: boolean;
  is_windows: boolean;
  pywin32_available: boolean;
  has_event_log_access: boolean;
  last_event_timestamp?: string | null;
  total_mapped_processed: number;
  total_unmapped_processed: number;
  channels_monitored: string[];
  poll_interval_seconds: number;
  status_summary: string;
  message: string;
}

// Guided Attack Scenarios Showcase (Verified Real Data Only)
export interface ShowcaseScenarioItem {
  incident_id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: string;
  anomaly_category?: string | null;
  mitre_technique_id?: string | null;
  mitre_technique_name?: string | null;
  created_at: string;
  first_investigated_at?: string | null;
  resolved_at?: string | null;
  resolution_summary?: string | null;
  employee_id: string;
  employee_name: string;
  employee_department: string;
  employee_designation: string;
  employee_threat_score: number;
  employee_risk_category: string;
  employee_containment_status: string;
  telemetry_trigger?: {
    id: number;
    event_type: string;
    severity: string;
    source_ip: string;
    timestamp?: string | null;
    description: string;
    payload?: Record<string, any>;
  } | null;
  scenario_index: number;
  scenario_label: string;
}

