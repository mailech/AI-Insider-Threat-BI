import axios from 'axios';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('threat_bi_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if not already on login/register
      const isAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
      if (!isAuthPage) {
        localStorage.removeItem('threat_bi_token');
        localStorage.removeItem('threat_bi_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Service Functions
export const api = {
  // Auth
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  getCurrentUser: () => apiClient.get('/auth/me'),

  // Dashboard
  getDashboardSummary: () => apiClient.get('/dashboard/summary'),

  // Employees
  getEmployees: (params) => apiClient.get('/employees', { params }),
  getEmployeeById: (id) => apiClient.get(`/employees/${id}`),
  getEmployeeBehavior: (id) => apiClient.get(`/employees/${id}/behavior`),
  getEmployeeRiskHistory: (id) => apiClient.get(`/employees/${id}/risk-history`),

  // Activities & Anomalies
  getActivities: (params) => apiClient.get('/activities', { params }),
  getAnomalies: (params) => apiClient.get('/anomalies', { params }),

  // Alerts
  getAlerts: (params) => apiClient.get('/alerts', { params }),
  updateAlert: (id, data) => apiClient.patch(`/alerts/${id}`, data),

  // Incidents
  getIncidents: (params) => apiClient.get('/incidents', { params }),
  getIncidentById: (id) => apiClient.get(`/incidents/${id}`),
  createIncident: (data) => apiClient.post('/incidents', data),
  updateIncident: (id, data) => apiClient.patch(`/incidents/${id}`, data),
  addIncidentComment: (id, data) => apiClient.post(`/incidents/${id}/comments`, data),

  // Analytics
  getRiskTrends: (days = 30) => apiClient.get('/analytics/risk-trends', { params: { days } }),
  getAnomaliesAnalytics: () => apiClient.get('/analytics/anomalies'),

  // ML
  getMLMetrics: () => apiClient.get('/ml/metrics'),
  triggerMLTrain: (params) => apiClient.post('/ml/train', params),
  predictRisk: (featureVector) => apiClient.post('/ml/predict', featureVector),

  // Reports
  generateReportPreview: (data) => apiClient.post('/reports/generate', data),
  listSavedReports: (params) => apiClient.get('/reports', { params }),
  getSavedReport: (id) => apiClient.get(`/reports/${id}`),
  saveReport: (data) => apiClient.post('/reports/save', data),
  deleteSavedReport: (id) => apiClient.delete(`/reports/${id}`),
  
  // Direct Export Downloads (Blob response)
  downloadDirectPDF: (data) => apiClient.post('/reports/export/pdf', data, { responseType: 'blob' }),
  downloadDirectExcel: (data) => apiClient.post('/reports/export/excel', data, { responseType: 'blob' }),
  downloadSavedPDF: (id) => apiClient.get(`/reports/${id}/pdf`, { responseType: 'blob' }),
  downloadSavedExcel: (id) => apiClient.get(`/reports/${id}/excel`, { responseType: 'blob' }),
};

export default api;

