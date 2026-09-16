/**
 * Real API client for the InsiderIQ FastAPI backend.
 * Replaces mock data with actual HTTP calls to localhost:8000.
 */

import { 
  Employee, User, ActivityLog, LogSource, BehavioralBaseline, 
  Anomaly, AnomalyStatus, FleetRiskData, RiskScore, RiskBand, 
  Investigation, InvestigationStatus 
} from "../types";

// ── Configuration ─────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8001";

// Token management - MUST use the same keys as AuthContext.tsx
// AuthContext uses: insideriq_token, insideriq_user, insideriq_token_expiry
const TOKEN_KEY = "insideriq_token";
const EXPIRY_KEY = "insideriq_token_expiry";

export function setAuthToken(token: string, expiresIn: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (stored && expiry && Date.now() < parseInt(expiry, 10)) {
      return stored;
    }
  }
  return null;
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem("insideriq_user");
  }
}

// Request timeout in milliseconds (30 seconds default)
const REQUEST_TIMEOUT_MS = 30000;
const inFlightGetRequests = new Map<string, Promise<unknown>>();

/** Turn FastAPI's string, object, or validation-error-array detail into UI text. */
function errorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const field = Array.isArray(record.loc) ? record.loc.slice(1).join(".") : "";
        return `${field ? `${field}: ` : ""}${String(record.msg || "Invalid value")}`;
      }
      return String(item);
    }).join("; ");
  }
  if (detail && typeof detail === "object") return Object.entries(detail as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join("; ");
  return fallback;
}

// Helper for API requests with timeout
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const requestKey = `${method}:${endpoint}`;
  // Development Strict Mode and dashboard widgets can request the same GET in
  // the same render window. Share that request so a duplicate cannot race a
  // successful response or produce spurious state transitions.
  if (method === "GET") {
    const existing = inFlightGetRequests.get(requestKey);
    if (existing) return existing as Promise<T>;
  }
  const request = performApiRequest<T>(endpoint, options);
  if (method === "GET") {
    inFlightGetRequests.set(requestKey, request);
    void request.then(
      () => inFlightGetRequests.delete(requestKey),
      () => inFlightGetRequests.delete(requestKey),
    );
  }
  return request;
}

async function performApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401) {
      // Only clear auth on genuine HTTP 401 responses
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorMessage(error?.detail, `HTTP ${response.status}`));
    }

    return response.json();
  } catch (err: any) {
    // Don't clear auth on network errors, timeouts, or 500s
    // Only HTTP 401 should trigger logout (handled above)
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Auth API ────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(errorMessage(error?.detail, "Invalid credentials"));
  }

  const data: LoginResponse = await response.json();
  setAuthToken(data.access_token, data.expires_in);
  return data;
}

export async function register(email: string, fullName: string, password: string, role?: string): Promise<User> {
  return apiRequest<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, full_name: fullName, password, role }),
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/auth/me');
}

// ── Employees API ────────────────────────────────────────────────────

export async function getEmployees(): Promise<Employee[]> {
  // Backend returns array directly: GET /api/v1/employees -> Employee[]
  const data = await apiRequest<any[]>('/employees');
  return data.map(transformEmployee);
}

export async function getEmployee(id: string): Promise<Employee | null> {
  try {
    const data = await apiRequest<any>(`/employees/${id}`);
    return transformEmployee(data);
  } catch {
    return null;
  }
}

function transformEmployee(data: any): Employee {
  return {
    // Keep the database UUID as the ID: detail, behavior, and mutation routes require it.
    id: data.id,
    name: data.full_name || `${data.first_name} ${data.last_name}`,
    department: data.department,
    designation: data.designation,
    manager: data.manager || '',
    devicesCount: data.devices_count || data.devices?.length || 0,
    accessLevel: data.access_level || 'Standard',
  };
}

// ── Users API ────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  // Backend returns array directly: GET /api/v1/users -> User[]
  const data = await apiRequest<any[]>('/users');
  return data.map(transformUser);
}

function transformUser(data: any): User {
  return {
    id: data.id,
    name: data.full_name,
    email: data.email,
    role: data.role,
    status: data.status,
    lastLogin: data.last_login_at || new Date().toISOString(),
  };
}

// ── Activity API ─────────────────────────────────────────────────────

export async function getActivityLogs(filters?: { employeeId?: string; type?: string }): Promise<ActivityLog[]> {
  const params = new URLSearchParams();
  if (filters?.employeeId) params.append('employee_id', filters.employeeId);
  if (filters?.type) params.append('activity_type', filters.type);

  const query = params.toString();
  // Backend returns array directly: GET /api/v1/activity -> ActivityLog[]
  const data = await apiRequest<any[]>(`/activity${query ? `?${query}` : ''}`);
  return data.map(transformActivityLog);
}

function transformActivityLog(data: any): ActivityLog {
  return {
    id: data.id,
    timestamp: data.timestamp,
    employeeId: data.employee_id,
    activityType: data.activity_type,
    source: data.source,
    device: data.device,
    ip: data.ip_address,
  };
}

// ── Behavior API ─────────────────────────────────────────────────────

export async function getBehavioralBaseline(employeeId: string): Promise<BehavioralBaseline | null> {
  try {
    const data = await apiRequest<any>(`/behavior/${employeeId}`);
    return {
      employeeId: data.employee_id,
      typicalLoginWindow: `${String(data.typical_login_hour_start).padStart(2, '0')}:00 - ${String(data.typical_login_hour_end).padStart(2, '0')}:00`,
      typicalWorkingHours: `${String(data.typical_login_hour_start).padStart(2, '0')}:30 - ${String(data.typical_login_hour_end).padStart(2, '0')}:30`,
      typicalDailyDataVolume: `${data.typical_daily_data_volume_mb || 450} MB`,
      typicalDeviceCount: data.typical_device_count || 1,
      typicalApplicationSet: data.typical_applications?.split(',').filter(Boolean) || [],
      workPattern: data.work_pattern || [],
    };
  } catch {
    return null;
  }
}

// ── Anomalies API ────────────────────────────────────────────────────

export async function getAnomalies(filters?: { status?: string; severity?: string }): Promise<Anomaly[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.severity) params.append('severity', filters.severity);

  const query = params.toString();
  // Backend returns array directly: GET /api/v1/anomalies -> Anomaly[]
  const data = await apiRequest<any[]>(`/anomalies${query ? `?${query}` : ''}`);
  return data.map(transformAnomaly);
}

export async function updateAnomalyStatus(id: string, status: AnomalyStatus): Promise<boolean> {
  try {
    await apiRequest(`/anomalies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return true;
  } catch {
    return false;
  }
}

function transformAnomaly(data: any): Anomaly {
  return {
    id: data.id,
    timestamp: data.detected_at,
    employeeId: data.employee_id,
    category: data.category,
    type: 'Behavioral anomaly',
    severity: data.severity === 'Informational' ? 'Info' : data.severity,
    description: data.description,
    status: data.status === 'Confirmed' ? 'Confirmed' : data.status === 'Dismissed' ? 'Dismissed' : data.status === 'Under Review' ? 'Under Review' : 'New',
    baselineDeviation: `${data.baseline_deviation}%`,
    relatedActivityIds: [],
  };
}

// ── Risk API ─────────────────────────────────────────────────────────

export async function getFleetRiskScores(lookbackDays: number = 30): Promise<FleetRiskData> {
  try {
    const data = await apiRequest<any>(`/risk/fleet-summary?lookback_days=${lookbackDays}`);
    return {
      lookbackDays: data.lookback_days || lookbackDays,
      totalScored: data.total_scored || data.results?.length || 0,
      results: (data.results || []).map((r: any) => ({
        employeeId: r.employee_id,
        decisionFunctionScore: r.decision_function_score,
        predictLabel: r.predict_label,
        riskBand: r.risk_band,
        riskScore: Math.round(r.risk_score),
      })),
      bandDistribution: data.band_distribution || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      fleetAvgScore: Math.round((data.fleet_average_score || 0) * 10) / 10,
      serviceAvailable: data.service_available ?? true,
    };
  } catch {
    return getFleetRiskScoresDirect(lookbackDays);
  }
}

async function getFleetRiskScoresDirect(lookbackDays: number): Promise<FleetRiskData> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/score/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ logon_count: 10, after_hours_logon_count: 2, usb_connect_count: 1, file_copy_count: 5, email_count: 8 }] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('ML service unavailable');
    return { lookbackDays, totalScored: 0, results: [], bandDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }, fleetAvgScore: 0, serviceAvailable: true };
  } catch {
    return { lookbackDays, totalScored: 0, results: [], bandDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }, fleetAvgScore: 0, serviceAvailable: false };
  }
}

// ── Log Sources API ───────────────────────────────────────────────────

export async function getLogSources(): Promise<LogSource[]> {
  // There is no log-source configuration resource in this backend.  Derive
  // truthful source summaries from persisted activity rather than presenting
  // hard-coded connectors as live integrations.
  const logs = await getActivityLogs();
  return deriveLogSources(logs);
}

export function deriveLogSources(logs: ActivityLog[]): LogSource[] {
  const latestBySource = new Map<string, string>();
  logs.forEach((log) => {
    if (log.source && !latestBySource.has(log.source)) latestBySource.set(log.source, log.timestamp);
  });
  return Array.from(latestBySource, ([name, lastSync]) => ({ id: name, name, type: "Observed activity source", status: "Connected" as const, lastSync }));
}

export interface ManagedDepartment { id: string; code: string; name: string; head_employee_id: string | null; employee_count: number; }
export const getDepartments = () => apiRequest<ManagedDepartment[]>('/employees/departments/managed');
export const createDepartment = (department: Omit<ManagedDepartment, 'id' | 'employee_count'>) => apiRequest<ManagedDepartment>('/employees/departments/managed', { method: 'POST', body: JSON.stringify(department) });
export const updateDepartment = (id: string, department: Partial<Omit<ManagedDepartment, 'id' | 'employee_count'>>) => apiRequest<ManagedDepartment>(`/employees/departments/managed/${id}`, { method: 'PATCH', body: JSON.stringify(department) });

export async function testLogSourceConnection(id: string): Promise<{ success: boolean; message: string }> {
  const exists = (await getLogSources()).some((source) => source.id === id);
  return exists
    ? { success: true, message: "Source is present in persisted activity logs." }
    : { success: false, message: "Source is not present in persisted activity logs." };
}

// ── Dashboard API ────────────────────────────────────────────────────

export interface DashboardSummary {
  totalMonitored: number;
  activeAnomalies: number;
  usersFlagged: number;
  avgAnomalyDensity: number;
  employeesError?: string;
  anomaliesError?: string;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // Use Promise.allSettled so one failure doesn't block the entire dashboard
  const [employeesResult, anomaliesResult] = await Promise.allSettled([
    getEmployees(),
    getAnomalies(),
  ]);

  const employees = employeesResult.status === 'fulfilled' ? employeesResult.value : [];
  const anomalies = anomaliesResult.status === 'fulfilled' ? anomaliesResult.value : [];

  return {
    totalMonitored: employees.length,
    activeAnomalies: anomalies.filter(a => a.severity === 'Critical' || a.severity === 'High').length,
    usersFlagged: new Set(anomalies.map(a => a.employeeId)).size,
    avgAnomalyDensity: employees.length ? Number(((anomalies.length / employees.length) * 100).toFixed(1)) : 0,
    employeesError: employeesResult.status === 'rejected' ? employeesResult.reason?.message || 'Failed to load employees' : undefined,
    anomaliesError: anomaliesResult.status === 'rejected' ? anomaliesResult.reason?.message || 'Failed to load anomalies' : undefined,
  };
}

export async function getAnomalyTrend(days: number = 7) {
  const anomalies = await getAnomalies();
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - i);
    buckets.set(date.toISOString().slice(0, 10), 0);
  }
  anomalies.forEach((anomaly) => {
    const key = new Date(anomaly.timestamp).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  return Array.from(buckets, ([date, anomalies]) => ({ date: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), anomalies }));
}

// ── Investigations API ───────────────────────────────────────────────

export async function getInvestigations(): Promise<Investigation[]> {
  // Backend returns array directly: GET /api/v1/investigations -> Investigation[]
  const data = await apiRequest<any[]>('/investigations');
  return data.map(transformInvestigation);
}

export async function createInvestigation(inv: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt' | 'notes'> & { severity?: 'Informational' | 'Low' | 'Medium' | 'High' | 'Critical' }): Promise<Investigation> {
  const data = await apiRequest<any>('/investigations', {
    method: 'POST',
    body: JSON.stringify({ title: inv.title, employee_id: inv.employeeId, description: inv.description, severity: inv.severity || ({ CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' } as const)[inv.riskBand] }),
  });
  return transformInvestigation(data);
}

export async function updateInvestigationStatus(id: string, status: InvestigationStatus): Promise<boolean> {
  try {
    if (status === 'Resolved') {
      await apiRequest(`/investigations/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution: 'Resolved via dashboard' }) });
    } else {
      // The service models starting as assignment; assigning the current user
      // is not available in this UI, so use the persisted update endpoint.
      await apiRequest(`/investigations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    }
    return true;
  } catch {
    return false;
  }
}

export async function downloadReport(type: 'pdf' | 'excel', reportType: string = 'insider_threat'): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/${type}?report_type=${encodeURIComponent(reportType)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(errorMessage((await response.json().catch(() => ({}))).detail, `HTTP ${response.status}`));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `${reportType}_report.${type === 'pdf' ? 'pdf' : 'xlsx'}`; link.click(); URL.revokeObjectURL(url);
}

export async function addInvestigationNote(id: string, author: string, content: string): Promise<boolean> {
  try {
    await apiRequest(`/investigations/${id}`, { method: 'PATCH', body: JSON.stringify({ note: content }) });
    return true;
  } catch {
    return false;
  }
}

function transformInvestigation(data: any): Investigation {
  return {
    id: data.id,
    title: data.title,
    employeeId: data.employee_id,
    employeeName: data.employee_name || '',
    status: data.status === 'In Progress' ? 'In Progress' : data.status === 'Resolved' || data.status === 'Closed' ? 'Resolved' : 'Open',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    createdBy: data.created_by_id || '',
    riskBand: data.severity || 'MEDIUM',
    description: data.description || '',
    notes: (data.events || []).map((e: any) => ({ id: e.id, timestamp: e.occurred_at, author: e.actor_name || 'System', content: e.message })),
    relatedAnomalyIds: data.anomaly_id ? [data.anomaly_id] : [],
  };
}

// ── Export convenience api object ────────────────────────────────────

export const api = {
  getEmployees,
  getDepartments,
  createDepartment,
  updateDepartment,
  getUsers,
  getActivityLogs,
  getLogSources,
  testLogSourceConnection,
  getBehavioralBaseline,
  getAnomalies,
  updateAnomalyStatus,
  getDashboardSummary,
  getAnomalyTrend,
  getInvestigations,
  createInvestigation,
  updateInvestigationStatus,
  addInvestigationNote,
  downloadReport,
};
