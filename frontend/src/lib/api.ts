import {
  UserLogin,
  OverviewResponse,
  EmployeeListItem,
  EmployeeDetail,
  TelemetrySummary,
  TelemetryLog,
  AnalyticsOverview,
  RecalculateRequest,
  RecalculateResponse,
  NotificationSettings,
  ThreatScoringWeights,
  SystemHealthResponse,
  AuditLog,
  InvestigationNote,
  CaseStatusUpdatePayload,
  Incident,
  IncidentDetailResponse,
  IncidentMetrics,
  IncidentListResponse,
  DeviceFleetListResponse,
} from './types';



const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ams_auth_token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (initialErr) {
    // If 127.0.0.1 fails, try localhost:8000 and /api proxy fallbacks
    try {
      const fallbackUrl = API_BASE_URL.includes('127.0.0.1:8000')
        ? API_BASE_URL.replace('127.0.0.1:8000', 'localhost:8000')
        : '/api';
      response = await fetch(`${fallbackUrl}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      throw new Error(`Unable to connect to AMS Backend API. Please ensure 'python run.py' is running in the backend terminal.`);
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ams_auth_token');
      }
      if (endpoint === '/auth/me') {
        return null;
      }
    }

    let errorDetail = 'An unexpected error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }


  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
}

async function fetchRawWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ams_auth_token') : null;
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (initialErr) {
    try {
      const fallbackUrl = API_BASE_URL.includes('127.0.0.1:8000')
        ? API_BASE_URL.replace('127.0.0.1:8000', 'localhost:8000')
        : '/api';
      response = await fetch(`${fallbackUrl}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      throw new Error(`Unable to connect to AMS Backend API. Please ensure 'python run.py' is running.`);
    }
  }

  if (!response.ok) {
    let errorDetail = 'Export failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.text();
}


export const api = {
  // Auth
  async login(credentials: { email: string; password: string }): Promise<{ access_token: string; token_type: string; user: any }> {
    return fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async ssoLogin(payload: { role: string; provider?: string }): Promise<{ access_token: string; token_type: string; user: any }> {
    return fetchWithAuth('/auth/sso-login', {
      method: 'POST',
      body: JSON.stringify({
        role: payload.role,
        provider: payload.provider || 'Corporate_SSO_Demo',
      }),
    });
  },

  async getMe() {
    return fetchWithAuth('/auth/me');
  },

  // Dashboard Overview
  async getOverview(): Promise<OverviewResponse> {
    return fetchWithAuth('/dashboard/overview');
  },

  // Employees Directory & Drawer
  async getEmployees(params?: { search?: string; risk_category?: string; department?: string }): Promise<EmployeeListItem[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.risk_category && params.risk_category !== 'All') query.append('risk_category', params.risk_category);
    if (params?.department && params.department !== 'All') query.append('department', params.department);
    
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/employees${qs}`);
  },

  async getEmployeeDetail(id: string): Promise<EmployeeDetail> {
    return fetchWithAuth(`/employees/${id}`);
  },

  async getEmployeeBaseline(id: string): Promise<import('./types').BehavioralBaseline> {
    return fetchWithAuth(`/employees/${id}/baseline`);
  },

  async exportEmployeesCsv(params?: { search?: string; risk_category?: string; department?: string }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.risk_category && params.risk_category !== 'All') query.append('risk_category', params.risk_category);
    if (params?.department && params.department !== 'All') query.append('department', params.department);
    
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchRawWithAuth(`/employees/export${qs}`);
  },

  async exportEmployeesXlsx(params?: { search?: string; risk_category?: string; department?: string }): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ams_auth_token') : null;
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.risk_category && params.risk_category !== 'All') query.append('risk_category', params.risk_category);
    if (params?.department && params.department !== 'All') query.append('department', params.department);
    
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/employees/export-xlsx${qs}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Failed to export employee directory to Excel' }));
      throw new Error(errData.detail || 'Excel export failed');
    }

    return res.blob();
  },

  async exportEmployeeDossierJson(id: string): Promise<any> {
    return fetchWithAuth(`/employees/${id}/export`);
  },

  // Telemetry Stream
  async getTelemetrySummary(params?: { employee_id?: string; severity?: string; event_type?: string; anomaly_category?: string }): Promise<TelemetrySummary> {
    const query = new URLSearchParams();
    if (params?.employee_id && params.employee_id !== 'All') query.append('employee_id', params.employee_id);
    if (params?.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params?.event_type && params.event_type !== 'All') query.append('event_type', params.event_type);
    if (params?.anomaly_category && params.anomaly_category !== 'All') query.append('anomaly_category', params.anomaly_category);
    
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/telemetry/summary${qs}`);
  },

  async getTelemetryLogs(params?: { employee_id?: string; severity?: string; event_type?: string; anomaly_category?: string; limit?: number; offset?: number }): Promise<TelemetryLog[]> {
    const query = new URLSearchParams();
    if (params?.employee_id && params.employee_id !== 'All') query.append('employee_id', params.employee_id);
    if (params?.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params?.event_type && params.event_type !== 'All') query.append('event_type', params.event_type);
    if (params?.anomaly_category && params.anomaly_category !== 'All') query.append('anomaly_category', params.anomaly_category);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/telemetry/logs${qs}`);
  },

  async exportTelemetryCsv(params?: { employee_id?: string; severity?: string; event_type?: string; anomaly_category?: string }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.employee_id && params.employee_id !== 'All') query.append('employee_id', params.employee_id);
    if (params?.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params?.event_type && params.event_type !== 'All') query.append('event_type', params.event_type);
    if (params?.anomaly_category && params.anomaly_category !== 'All') query.append('anomaly_category', params.anomaly_category);
    
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchRawWithAuth(`/telemetry/export${qs}`);
  },

  // Anomaly Intelligence & Reports (Milestone 2 A3 & Round 2)
  async getAnomalyReport(params?: { start_date?: string; end_date?: string; department?: string; employee_id?: string; anomaly_category?: string; severity?: string }): Promise<import('./types').AnomalyReportResponse> {
    const query = new URLSearchParams();
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    if (params?.department && params.department !== 'All') query.append('department', params.department);
    if (params?.employee_id && params.employee_id !== 'All') query.append('employee_id', params.employee_id);
    if (params?.anomaly_category && params.anomaly_category !== 'All') query.append('anomaly_category', params.anomaly_category);
    if (params?.severity && params.severity !== 'All') query.append('severity', params.severity);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/anomalies/report${qs}`);
  },

  async exportAnomalyReportCsv(params?: { start_date?: string; end_date?: string; department?: string; employee_id?: string; anomaly_category?: string; severity?: string }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    if (params?.department && params.department !== 'All') query.append('department', params.department);
    if (params?.employee_id && params.employee_id !== 'All') query.append('employee_id', params.employee_id);
    if (params?.anomaly_category && params.anomaly_category !== 'All') query.append('anomaly_category', params.anomaly_category);
    if (params?.severity && params.severity !== 'All') query.append('severity', params.severity);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchRawWithAuth(`/anomalies/report/export${qs}`);
  },

  async getAnomalyThresholds(): Promise<Record<string, import('./types').AnomalyThreshold>> {
    return fetchWithAuth('/anomalies/thresholds');
  },



  // Risk Analytics
  async getAnalytics(): Promise<AnalyticsOverview> {
    return fetchWithAuth('/analytics/overview');
  },

  async exportFleetAnalyticsCsv(): Promise<string> {
    return fetchRawWithAuth('/analytics/export');
  },

  async recalculateRisk(data: RecalculateRequest): Promise<RecalculateResponse> {
    return fetchWithAuth('/analytics/recalculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Elevation Feature 2: SOC Case Status Actions
  async updateEmployeeCaseStatus(employeeId: string, payload: CaseStatusUpdatePayload): Promise<EmployeeDetail> {
    return fetchWithAuth(`/employees/${employeeId}/case-status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Elevation Feature 4: Analyst Investigation Notes
  async getEmployeeNotes(employeeId: string): Promise<InvestigationNote[]> {
    return fetchWithAuth(`/employees/${employeeId}/notes`);
  },

  async addEmployeeNote(employeeId: string, noteText: string): Promise<InvestigationNote> {
    return fetchWithAuth(`/employees/${employeeId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note_text: noteText }),
    });
  },

  // Audit Logs (Administrator & Security Manager)
  async getAuditLogs(params?: { action?: string; user_email?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.action && params.action !== 'All') query.append('action', params.action);
    if (params?.user_email && params.user_email !== 'All') query.append('user_email', params.user_email);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/audit/logs${qs}`);
  },

  // Elevation Feature 5: Export Audit Trail CSV
  async exportAuditLogsCsv(params?: { action?: string; user_email?: string; limit?: number }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.action && params.action !== 'All') query.append('action', params.action);
    if (params?.user_email && params.user_email !== 'All') query.append('user_email', params.user_email);
    if (params?.limit) query.append('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchRawWithAuth(`/audit/export${qs}`);
  },

  // Settings
  async getNotificationSettings(): Promise<NotificationSettings> {
    return fetchWithAuth('/settings/notifications');
  },

  async updateNotificationSettings(data: NotificationSettings): Promise<NotificationSettings> {
    return fetchWithAuth('/settings/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getWeights(): Promise<ThreatScoringWeights> {
    return fetchWithAuth('/settings/weights');
  },

  async updateWeights(weights: ThreatScoringWeights): Promise<ThreatScoringWeights> {
    return fetchWithAuth('/settings/weights', {
      method: 'POST',
      body: JSON.stringify(weights),
    });
  },

  async resetWeights(): Promise<ThreatScoringWeights> {
    return fetchWithAuth('/settings/weights/reset', {
      method: 'POST',
    });
  },

  async getHealth(): Promise<SystemHealthResponse> {
    return fetchWithAuth('/settings/health');
  },

  // ==============================================================================
  // --- Milestone 3: Alert & Incident Management API ---
  // ==============================================================================

  async getIncidents(params?: {
    status?: string;
    severity?: string;
    employee_id?: string;
    assigned_to_email?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<IncidentListResponse> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params?.employee_id && params.employee_id !== 'All') query.append('employee_id', params.employee_id);
    if (params?.assigned_to_email && params.assigned_to_email !== 'All') query.append('assigned_to_email', params.assigned_to_email);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/incidents${qs}`);
  },

  async getIncidentDetail(incident_identifier: string | number): Promise<IncidentDetailResponse> {
    return fetchWithAuth(`/incidents/${incident_identifier}`);
  },

  async updateIncidentStatus(
    incident_identifier: string | number,
    data: { status: string; resolution_summary?: string; note_text?: string }
  ): Promise<Incident> {
    return fetchWithAuth(`/incidents/${incident_identifier}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async assignIncident(
    incident_identifier: string | number,
    assigned_to_email: string
  ): Promise<Incident> {
    return fetchWithAuth(`/incidents/${incident_identifier}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to_email }),
    });
  },

  async getIncidentMetrics(): Promise<IncidentMetrics> {
    return fetchWithAuth('/incidents/metrics/fleet');
  },

  // ==============================================================================
  // --- Milestone 3: Entity / Device-Centric View API ---
  // ==============================================================================

  async getDeviceFleet(params?: {
    device_type?: string;
    risk_status?: string;
    search?: string;
  }): Promise<DeviceFleetListResponse> {
    const query = new URLSearchParams();
    if (params?.device_type && params.device_type !== 'All') query.append('device_type', params.device_type);
    if (params?.risk_status && params.risk_status !== 'All') query.append('risk_status', params.risk_status);
    if (params?.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/devices${qs}`);
  },

  // ==============================================================================
  // --- Milestone 3 Polish: Incident CSV Export & 1-Click Escalation ---
  // ==============================================================================

  async exportIncidentsCsv(params?: {
    status?: string;
    severity?: string;
    employee_id?: string;
    assigned_to_email?: string;
  }): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ams_auth_token') : null;
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params?.employee_id) query.append('employee_id', params.employee_id);
    if (params?.assigned_to_email && params.assigned_to_email !== 'All') query.append('assigned_to_email', params.assigned_to_email);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/incidents/export${qs}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Failed to export incidents' }));
      throw new Error(errData.detail || 'Export failed');
    }

    return res.blob();
  },

  async exportIncidentsXlsx(params?: {
    status?: string;
    severity?: string;
    employee_id?: string;
    assigned_to_email?: string;
  }): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ams_auth_token') : null;
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params?.employee_id) query.append('employee_id', params.employee_id);
    if (params?.assigned_to_email && params.assigned_to_email !== 'All') query.append('assigned_to_email', params.assigned_to_email);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/incidents/export-xlsx${qs}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Failed to export incidents to Excel' }));
      throw new Error(errData.detail || 'Excel export failed');
    }

    return res.blob();
  },

  async escalateAnomalyToIncident(logId: number): Promise<Incident> {
    return fetchWithAuth(`/incidents/escalate-anomaly/${logId}`, {
      method: 'POST',
    });
  },

  async getShowcaseScenarios(): Promise<import('./types').ShowcaseScenarioItem[]> {
    return fetchWithAuth('/incidents/showcase-scenarios');
  },

  // ML Corroboration Model Endpoints
  async getMLModelMetadata(): Promise<import('./types').MLModelMetadata> {
    return fetchWithAuth('/settings/ml-model');
  },

  async retrainMLModel(): Promise<import('./types').MLRetrainResponse> {
    return fetchWithAuth('/settings/ml-model/retrain', {
      method: 'POST',
    });
  },

  // ==============================================================================
  // --- Milestone 4: Executive Intelligence & Notification System ---
  // ==============================================================================

  async getExecutiveSummary(): Promise<import('./types').ExecutiveSummaryResponse> {
    return fetchWithAuth('/executive/summary');
  },

  async exportExecutiveXlsx(): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ams_auth_token') : null;
    const res = await fetch(`${API_BASE_URL}/executive/export-xlsx`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Failed to export Executive Posture Report' }));
      throw new Error(errData.detail || 'Executive Excel export failed');
    }

    return res.blob();
  },

  async exportExecutivePdf(): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ams_auth_token') : null;
    const res = await fetch(`${API_BASE_URL}/executive/export-pdf`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Failed to export Executive Posture Report PDF' }));
      throw new Error(errData.detail || 'Executive PDF export failed');
    }

    return res.blob();
  },

  async auditExecutivePdfExport(): Promise<{ status: string; message: string }> {
    return fetchWithAuth('/executive/audit-pdf-export', {
      method: 'POST',
    });
  },

  async getNotificationStatus(): Promise<import('./types').NotificationDeliveryStatus> {
    return fetchWithAuth('/settings/notifications/status');
  },

  async triggerDailyDigest(): Promise<{ status: string; message: string; email_delivered: boolean; slack_delivered: boolean; timestamp: string }> {
    return fetchWithAuth('/settings/notifications/digest', {
      method: 'POST',
    });
  },

  async triggerTestNotification(payload?: { channel?: 'both' | 'email' | 'slack'; severity?: string }): Promise<any> {
    return fetchWithAuth('/settings/notifications/test', {
      method: 'POST',
      body: JSON.stringify(payload || { channel: 'both', severity: 'HIGH' }),
    });
  },

  // ==============================================================================
  // --- Live Windows Ingestion (Scoped Exception Module) ---
  // ==============================================================================

  async getLiveIngestionStatus(): Promise<import('./types').LiveIngestionStatus> {
    return fetchWithAuth('/live-ingestion/status');
  },

  async getIdentityMappings(): Promise<import('./types').IdentityMapping[]> {
    return fetchWithAuth('/admin/identity-mappings');
  },

  async createIdentityMapping(payload: {
    windows_identifier: string;
    employee_id: string;
    description?: string;
  }): Promise<import('./types').IdentityMapping> {
    return fetchWithAuth('/admin/identity-mappings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteIdentityMapping(mappingId: number): Promise<{ status: string; mapping_id: number; windows_identifier: string }> {
    return fetchWithAuth(`/admin/identity-mappings/${mappingId}`, {
      method: 'DELETE',
    });
  },

  async getUnmappedIngestionLog(params?: {
    limit?: number;
    offset?: number;
    channel?: string;
    search?: string;
  }): Promise<import('./types').UnmappedIngestionLogItem[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.channel && params.channel !== 'All') query.append('channel', params.channel);
    if (params?.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/live-ingestion/unmapped-log${qs}`);
  },

  async simulateLiveEvent(payload: {
    channel: string;
    event_id: number;
    raw_identifier: string;
    source_ip?: string;
    details?: Record<string, any>;
  }): Promise<any> {
    return fetchWithAuth('/live-ingestion/simulate-test-event', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};





