/**
 * Threat AI — REST API Service Client
 * Connects the React dashboard to the FastAPI backend with automatic Bearer token injection,
 * unified error handling, and timeout resilience.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const HEALTH_URL = (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api/v1', '') : 'http://localhost:8000') + '/health';

const TOKEN_KEY = 'threat_ai_auth_token';

export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to persist auth token', e);
    }
  },
  remove: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to remove auth token', e);
    }
  }
};

async function request(endpoint, options = {}) {
  const token = tokenStorage.get();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Fallback to HTTP error status
      }
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export const api = {
  /**
   * Health check with 2s timeout
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(HEALTH_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  },

  // ---------------- Authentication ----------------
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (data.access_token) {
      tokenStorage.set(data.access_token);
    }
    return data;
  },

  async getMe() {
    return await request('/auth/me');
  },

  // ---------------- Monitored Identities ----------------
  async getEmployees(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.risk_level && params.risk_level !== 'All') query.append('risk_level', params.risk_level);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.order) query.append('order', params.order);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await request(`/employees${queryString}`);
  },

  async getEmployeeById(id) {
    return await request(`/employees/${id}`);
  },

  async lockEmployee(id) {
    return await request(`/employees/${id}/lock`, { method: 'POST' });
  },

  async resetEmployeeScore(id) {
    return await request(`/employees/${id}/reset-score`, { method: 'POST' });
  },

  async dismissEmployeeFlag(id) {
    return await request(`/employees/${id}/dismiss-flag`, { method: 'POST' });
  },

  // ---------------- Security Incident Alerts ----------------
  async getAlerts(params = {}) {
    const query = new URLSearchParams();
    if (params.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.employee_id) query.append('employee_id', params.employee_id);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await request(`/alerts${queryString}`);
  },

  async getAlertById(id) {
    return await request(`/alerts/${id}`);
  },

  async updateAlertStatus(id, status) {
    return await request(`/alerts/${id}`, {
      method: 'PATCH',
      body: { status }
    });
  }
};
