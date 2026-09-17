/**
 * CYBER AI — API Type Definitions
 * Mirrors backend Pydantic schemas exactly.
 */

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export type RoleEnum =
  | 'SECURITY_ANALYST'
  | 'SOC_ENGINEER'
  | 'SECURITY_MANAGER'
  | 'ADMINISTRATOR';

export interface UserRead {
  id:         number;
  email:      string;
  role:       RoleEnum;
  is_active:  boolean;
  created_at: string;
}


// ── Risk / Analytics ─────────────────────────────────────────────────────────

/** Short-code risk category strings — matches RiskCategoryEnum on the backend. */
export type RiskCategory = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DepartmentRisk {
  department:      string;
  employee_count:  number;
  avg_risk_score:  number; // 0–100
  high_risk_count: number;
}

export interface RiskSummaryResponse {
  total_employees:       number;
  high_risk_count:       number;
  critical_count:        number;
  average_threat_score:  number;  // 0–100
  evaluated_at:          string;  // ISO datetime
  risk_distribution:     Record<string, number>; // { CRITICAL: n, HIGH: n, ... }
  department_breakdown:  DepartmentRisk[];
}

export interface RiskCalculateRequest {
  emp_id:       string;
  window_hours: number;
}

export interface RiskCalculateResponse {
  emp_id:               string;
  threat_score:         number;
  risk_category:        RiskCategory;
  anomaly_weight:       number;
  frequency:            number;
  asset_criticality:    number;
  historical_severity:  number;
  evaluated_at:         string;
}

// ── Employee ──────────────────────────────────────────────────────────────────

export interface AssetRead {
  id:          number;
  asset_id:    string;
  asset_type:  'DEVICE' | 'IP';
  ip_address:  string | null;
  mac_address: string | null;
  employee_id: number;
  created_at:  string;
}

export interface EmployeeCreate {
  emp_id:       string;
  first_name:   string;
  last_name:    string;
  department:   string;
  designation:  string;
  manager_name: string | null;
}

export interface EmployeeRead {
  id:            number;
  emp_id:        string;
  first_name:    string;
  last_name:     string;
  department:    string;
  designation:   string;
  manager_name:  string | null;
  risk_score:    number;       // 0.0 – 1.0
  risk_category: RiskCategory;
  created_at:    string;
  updated_at:    string;
  assets:        AssetRead[];
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export type Severity    = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface TelemetryEventCreate {
  emp_id:     string;
  event_type: string;
  severity:   Severity;
  source_ip?: string;
  payload?:   Record<string, unknown>;
  timestamp?: string;
}

export interface TelemetryIngestResponse {
  status: string;
  log_id: string;
}

export interface TelemetryLogRead {
  id:           string;       // MongoDB ObjectId as string
  emp_id:       string;
  event_type:   string;
  severity:     Severity;
  description:  string;
  device_id:    string | null;
  ip_address:   string | null;
  timestamp:    string;
  metadata:     Record<string, unknown>;
}

// ── Generic API state ─────────────────────────────────────────────────────────

export type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

// ── UEBA Intelligence Engine ──────────────────────────────────────────────────

export interface UEBAOverview {
  total_monitored_users: number;
  total_monitored_entities: number;
  high_anomaly_users: number;
  peer_outliers_count: number;
  fleet_avg_risk_score: number;
  predicted_threat_spikes_72h: number;
  evaluated_at: string;
}

export interface UEBAUserBehavior {
  emp_id: string;
  name: string;
  department: string;
  role_title: string;
  current_risk_score: number;
  risk_category: string;
  total_events_7d: number;
  off_hours_ratio: number;
  high_severity_events: number;
  unique_ip_count: number;
  anomaly_index: number;
  event_distribution: Record<string, number>;
}

export interface UEBAPeerComparison {
  emp_id: string;
  department: string;
  peer_count: number;
  target_score: number;
  dept_avg_score: number;
  dept_std_dev: number;
  z_score: number;
  percentile_standing: number;
  is_outlier: boolean;
  risk_delta_from_peers: number;
}

export interface UEBATrendPoint {
  date: string;
  score: number;
  event_count: number;
  critical_events: number;
  category: string;
}

export interface UEBAThreatPrediction {
  emp_id: string;
  current_score: number;
  predicted_24h: number;
  predicted_48h: number;
  predicted_72h: number;
  escalation_probability_pct: number;
  predicted_risk_category: string;
  primary_threat_vectors: string[];
  soc_action_recommended: boolean;
}

export interface UEBAUserProfileResponse {
  user_behavior: UEBAUserBehavior;
  peer_comparison: UEBAPeerComparison;
  trend_points: UEBATrendPoint[];
  prediction: UEBAThreatPrediction;
}

export interface UEBAEntityRead {
  asset_id: number;
  identifier: string;
  asset_type: string;
  owner_name: string;
  emp_id: string;
  entity_risk_score: number;
  total_events: number;
  high_severity_events: number;
  status: 'ANOMALOUS' | 'NORMAL';
}

// ── Reports & Export System Interfaces ───────────────────────────────────────

export interface ReportTypeMetadata {
  id: string;
  title: string;
  badge: string;
  icon: string;
  description: string;
  default_time_range: string;
  supports_employee_target: boolean;
  supports_framework: boolean;
}

export interface ReportFilterPayload {
  report_type: string;
  time_range?: string;
  department?: string;
  min_risk?: string;
  employee_id?: string;
  framework?: string;
}

export interface ReportKPI {
  label: string;
  value: string;
}

export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ReportPreviewResponse {
  report_type: string;
  title: string;
  generated_at: string;
  time_range: string;
  summary: {
    executive_takeaway: string;
    [key: string]: any;
  };
  kpis: ReportKPI[];
  tables: ReportTable[];
  recommendations: string[];
}

// ── Insider Risk Scoring Engine Interfaces ───────────────────────────────────

export interface ScoringFactors {
  behavioral_anomalies_35: number;
  privilege_misuse_25: number;
  data_access_violations_20: number;
  access_pattern_deviations_10: number;
  historical_events_10: number;
}

export interface InsiderRiskMatrixItem {
  id: number;
  emp_id: string;
  name: string;
  department: string;
  designation: string;
  access_level: string;
  insider_risk_score: number;
  risk_category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  threat_severity: string;
  recommended_action: string;
  factors: ScoringFactors;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface ScoringOverviewResponse {
  model_weights: {
    behavioral_anomalies_pct: number;
    privilege_misuse_pct: number;
    data_access_violations_pct: number;
    access_pattern_deviations_pct: number;
    historical_security_events_pct: number;
  };
  summary: {
    total_identities: number;
    average_risk_score: number;
    category_counts: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
  };
  matrix: InsiderRiskMatrixItem[];
}
