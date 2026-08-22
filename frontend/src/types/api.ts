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
