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
  }
};

export default api;


