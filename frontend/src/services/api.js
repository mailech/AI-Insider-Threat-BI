import axios from 'axios';

const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach JWT Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s to redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  getMe: () => apiClient.get('/auth/me'),
  getUsers: () => apiClient.get('/auth/users'),
};

export const dashboardAPI = {
  getAnalystDashboard: () => apiClient.get('/dashboards/analyst'),
  getSocDashboard: () => apiClient.get('/dashboards/soc'),
  getManagerDashboard: () => apiClient.get('/dashboards/manager'),
  getAdminDashboard: () => apiClient.get('/dashboards/admin'),
};

export const employeeAPI = {
  getEmployees: (params) => apiClient.get('/employees', { params }),
  getEmployee: (id) => apiClient.get(`/employees/${id}`),
  getDepartments: () => apiClient.get('/employees/departments'),
  createEmployee: (data) => apiClient.post('/employees', data),
  updateEmployee: (id, data) => apiClient.put(`/employees/${id}`, data),
  deleteEmployee: (id) => apiClient.delete(`/employees/${id}`),
};

export const activityAPI = {
  getActivities: (params) => apiClient.get('/activities', { params }),
  ingestActivity: (data) => apiClient.post('/activities', data),
  getStats: () => apiClient.get('/activities/stats'),
};

export const anomalyAPI = {
  getAnomalies: (params) => apiClient.get('/anomalies', { params }),
  getExplanation: (employeeId) => apiClient.get(`/anomalies/explain/${employeeId}`),
  getGraphNetwork: () => apiClient.get('/anomalies/graph-network'),
};

export const riskAPI = {
  getRiskScores: (params) => apiClient.get('/risk-scoring', { params }),
  getDistribution: () => apiClient.get('/risk-scoring/distribution'),
  getFormula: () => apiClient.get('/risk-scoring/formula'),
  calculateCustom: (params) => apiClient.post('/risk-scoring/calculate-custom', null, { params }),
};

export const uebaAPI = {
  getProfiles: (params) => apiClient.get('/ueba/profiles', { params }),
  getPeerBaselines: () => apiClient.get('/ueba/peer-baselines'),
  getPeerComparison: (employeeId) => apiClient.get(`/ueba/peer-comparison/${employeeId}`),
};

export const alertAPI = {
  getAlerts: (params) => apiClient.get('/alerts', { params }),
  createAlert: (data) => apiClient.post('/alerts', data),
  acknowledgeAlert: (alertId) => apiClient.put(`/alerts/${alertId}/acknowledge`),
  convertToIncident: (alertId) => apiClient.post(`/alerts/${alertId}/convert-to-incident`),
};

export const incidentAPI = {
  getIncidents: (params) => apiClient.get('/incidents', { params }),
  getIncident: (incidentId) => apiClient.get(`/incidents/${incidentId}`),
  createIncident: (data) => apiClient.post('/incidents', data),
  updateIncident: (incidentId, data) => apiClient.put(`/incidents/${incidentId}`, data),
};

export const investigationAPI = {
  getInvestigations: (params) => apiClient.get('/investigations', { params }),
  getInvestigation: (investigationId) => apiClient.get(`/investigations/${investigationId}`),
  addNote: (investigationId, text) => apiClient.post(`/investigations/${investigationId}/notes`, { text }),
  addEvidence: (investigationId, evidence) => apiClient.post(`/investigations/${investigationId}/evidence`, evidence),
  addTimelineEvent: (investigationId, event) => apiClient.post(`/investigations/${investigationId}/timeline`, event),
  executeContainment: (investigationId, action) => apiClient.post(`/investigations/${investigationId}/execute-containment`, { action }),
};

export const reportAPI = {
  getThreatPdfUrl: () => `${API_BASE}/reports/threat/pdf`,
  getThreatExcelUrl: () => `${API_BASE}/reports/threat/excel`,
  getThreatCsvUrl: () => `${API_BASE}/reports/threat/csv`,
  getRiskExcelUrl: () => `${API_BASE}/reports/risk/excel`,
  downloadPdfReport: () => apiClient.get('/reports/threat/pdf', { responseType: 'blob' }),
  downloadExcelReport: () => apiClient.get('/reports/threat/excel', { responseType: 'blob' }),
  downloadCsvReport: () => apiClient.get('/reports/threat/csv', { responseType: 'blob' }),
};

export const adminAPI = {
  retrainMl: () => apiClient.post('/admin/retrain-ml'),
  simulateAttack: (scenario, targetEmployeeId) => apiClient.post('/admin/simulate-attack', { scenario, target_employee_id: targetEmployeeId }),
  getAuditLogs: (limit = 50) => apiClient.get('/admin/audit-logs', { params: { limit } }),
};

export default apiClient;
