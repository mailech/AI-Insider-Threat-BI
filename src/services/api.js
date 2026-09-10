/**
 * Threat AI — Backend API & JWT Authentication Service (Phase 9.2)
 * 
 * Lightweight API client using native browser fetch with AbortController timeout.
 * Provides JWT Bearer token storage, authenticated requests, health checks, and session verification.
 */

const RAW_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const BASE_URL = RAW_URL.replace(/\/$/, '');

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

/**
 * Universal fetch wrapper that automatically injects JWT Bearer token into headers.
 */
async function request(endpoint, options = {}) {
  const token = tokenStorage.get();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

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
      // Fall back to status text
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  return await response.json();
}

export const api = {
  /**
   * Returns the configured backend base URL.
   */
  getBaseUrl: () => BASE_URL,

  /**
   * Checks connectivity to the FastAPI backend with timeout protection.
   * @param {number} timeoutMs - Maximum wait time before aborting (default: 2500ms).
   * @returns {Promise<{ isOnline: boolean, data: object|null }>}
   */
  checkHealth: async (timeoutMs = 2500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        return { isOnline: true, data };
      }
      return { isOnline: false, data: null };
    } catch {
      clearTimeout(timer);
      return { isOnline: false, data: null };
    }
  },

  /**
   * Authenticates an analyst with email and password, issuing a JWT Bearer token.
   * @param {string} email
   * @param {string} password
   */
  login: async (email, password) => {
    const data = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (data && data.access_token) {
      tokenStorage.set(data.access_token);
    }
    return data;
  },

  /**
   * Validates active session and retrieves current analyst clearance dossier.
   */
  getMe: async () => {
    return await request('/api/v1/auth/me');
  },

  // ================= Monitored Workforce Endpoints =================

  /**
   * Retrieves a paginated and filtered list of monitored employees from FastAPI.
   * @param {object} params - search, department, risk_level, status, sort_by, order, page, page_size
   */
  getEmployees: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.risk_level && params.risk_level !== 'All') query.append('risk_level', params.risk_level);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.order) query.append('order', params.order);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await request(`/api/v1/employees${qs}`);
    return {
      total: response.total,
      page: response.page,
      pageSize: response.page_size,
      items: (response.items || []).map(normalizeEmployee)
    };
  },

  /**
   * Retrieves full behavioral dossier for a single monitored identity.
   * @param {string} id
   */
  getEmployeeById: async (id) => {
    const data = await request(`/api/v1/employees/${id}`);
    return normalizeEmployee(data);
  },

  /**
   * Dispatches containment directive isolating credentials and terminating active sessions.
   * @param {string} id
   */
  lockEmployee: async (id) => {
    return await request(`/api/v1/employees/${id}/lock`, { method: 'POST' });
  },

  /**
   * Recalibrates behavioral threat score back to baseline (15 / 100).
   * @param {string} id
   */
  resetEmployeeScore: async (id) => {
    return await request(`/api/v1/employees/${id}/reset-score`, { method: 'POST' });
  },

  /**
   * Clears security incident flag for the specified identity.
   * @param {string} id
   */
  dismissEmployeeFlag: async (id) => {
    return await request(`/api/v1/employees/${id}/dismiss-flag`, { method: 'POST' });
  }
};

/**
 * Normalizes FastAPI snake_case employee objects to frontend camelCase convention,
 * ensuring complete backwards compatibility with existing UI components.
 */
export function normalizeEmployee(emp) {
  if (!emp) return null;
  return {
    id: String(emp.id),
    name: emp.name || '',
    department: emp.department || '',
    role: emp.role || '',
    status: emp.status || 'Active',
    email: emp.email || '',
    workstation: emp.workstation || 'WS-CORP-001',
    ipAddress: emp.ipAddress || emp.ip_address || '192.168.1.100',
    location: emp.location || 'HQ / On-Premise',
    riskLevel: emp.riskLevel || emp.risk_level || 'Low',
    score: typeof emp.score === 'number' ? emp.score : 15,
    lastActivity: emp.lastActivity || emp.last_activity || 'Normal authenticated activity',
    seen: emp.seen || 'Just now',
    avatarBg: emp.avatarBg || emp.avatar_bg || '#e8f0fe',
    avatarColor: emp.avatarColor || emp.avatar_color || '#1a73e8',
    initial:
      emp.initial ||
      (emp.name
        ? emp.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'ID'),
    details: emp.details || '',
    behavioralIndicators: emp.behavioralIndicators || emp.behavioral_indicators || [],
    riskFactors: emp.riskFactors || emp.risk_factors || [],
    securityEvents: emp.securityEvents || emp.security_events || []
  };
}

export default api;



