/**
 * ITBIS — API Type Definitions
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
  privilege_score?:     number;
  data_access_score?:   number;
  pattern_deviation_score?: number;
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
  access_isolated?: boolean;
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

// ── Module 7 — Incidents & Alerts (Milestone 3) ───────────────────────────────

export type IncidentStatus = 'NEW' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'FALSE_POSITIVE';
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface IncidentCommentRead {
  id:           number;
  incident_id:  number;
  content:      string;
  author_id:    number | null;
  author_email: string | null;
  created_at:   string;
}

export interface IncidentCommentCreate {
  content: string;
}

export interface IncidentRead {
  id:              number;
  title:           string;
  description:     string | null;
  status:          IncidentStatus;
  severity:        IncidentSeverity;
  threat_score:    number;
  employee_id:     number;
  emp_id:          string;
  employee_name:   string;
  department:      string;
  assigned_to_id:  number | null;
  assignee_email:  string | null;
  trigger_reason:  string;
  triggered_at:    string;
  created_at:      string;
  updated_at:      string;
  resolved_at:     string | null;
  comment_count:   number;
}

export interface IncidentListResponse {
  total: number;
  items: IncidentRead[];
}

export interface IncidentStatsResponse {
  total:               number;
  open?:               number;
  new:                 number;
  under_investigation: number;
  resolved:            number;
  false_positive:      number;
}

export interface IncidentTimelineEvent {
  id:          string;
  timestamp:   string;
  event_type:  string;
  severity:    Severity;
  description: string;
  device_id:   string | null;
  ip_address:  string | null;
  metadata:    Record<string, unknown>;
}

export interface IncidentTimelineResponse {
  incident_id:  number;
  emp_id:       string;
  total_events: number;
  events:       IncidentTimelineEvent[];
}

export interface RiskFactorRead {
  feature_name:   string;
  feature_label:  string;
  value:          number;
  baseline_mean:  number;
  z_score:        number;
  risk_level:     string;
  description:    string;
}

export interface IncidentRiskFactorsResponse {
  incident_id:    number;
  emp_id:         string;
  threat_score:   number;
  anomaly_score:  number | null;
  factors:        RiskFactorRead[];
  evaluated_at:   string | null;
}

export interface IncidentIsolateResponse {
  incident:              IncidentRead;
  emp_id:                string;
  access_isolated:       boolean;
  previous_access_level: string;
  current_access_level:  string;
  message:               string;
}

export interface ExecutiveReportSummary {
  generated_at: string;
  title:        string;
  fleet: {
    total_employees:      number;
    high_risk_count:      number;
    critical_count:       number;
    average_threat_score: number;
    risk_distribution:    Record<string, number>;
    isolated_identities:  number;
  };
  incidents: {
    total:               number;
    open:                number;
    new:                 number;
    under_investigation: number;
    resolved:            number;
    false_positive:      number;
  };
  top_risk_employees: Array<{
    emp_id:           string;
    name:             string;
    department:       string;
    threat_score:     number;
    risk_category:    RiskCategory;
    access_isolated:  boolean;
  }>;
  recent_incidents: Array<{
    id:             number;
    title:          string;
    status:         IncidentStatus;
    severity:       IncidentSeverity;
    threat_score:   number;
    emp_id:         string;
    employee_name:  string;
    department:     string;
    trigger_reason: string;
    triggered_at:   string;
  }>;
}

export interface SystemStatusResponse {
  evaluated_at: string;
  services: {
    api: string;
    postgres: string;
    mongodb: string;
    ml_artifacts: string;
  };
  counters: {
    employees: number;
    platform_users: number;
    telemetry_events_24h: number;
    open_incidents: number;
  };
  ml: {
    model_path: string;
    scaler_path: string;
    loaded: boolean;
  };
}

export interface TelemetryStreamEvent {
  log_id:         string;
  emp_id:         string;
  event_type:     string;
  severity:       Severity;
  source_ip?:     string | null;
  payload?:       Record<string, unknown>;
  timestamp:      string;
  threat_score?:  number | null;
  risk_score?:    number | null;
  risk_category?: string | null;
  is_anomaly?:    boolean | null;
  ingested_at?:   string;
}
