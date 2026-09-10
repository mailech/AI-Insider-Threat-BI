/**
 * Threat AI — Backend Connection Foundation Service (Phase 9.1)
 * 
 * Lightweight API client using native browser fetch with AbortController timeout.
 * Provides backend health check and connectivity verification without external dependencies.
 */

const RAW_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const BASE_URL = RAW_URL.replace(/\/$/, '');

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
  }
};

export default api;

