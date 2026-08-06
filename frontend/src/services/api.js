// Unified API Service with Live FastAPI Connection & Graceful Mock Fallback

const API_BASE_URL = "http://localhost:8000/api/v1";

// Helper fetch wrapper with fallback
async function fetchWithFallback(endpoint, options = {}, fallbackData = null) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[AEGIS API] Backend endpoint ${endpoint} offline or unreachable. Using client intelligence fallback.`, err);
    return fallbackData;
  }
}

export const api = {
  // Auth & Roles
  login: async (username, password) => {
    return fetchWithFallback("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }, {
      access_token: "mock_jwt_token_12345",
      token_type: "bearer",
      user_id: "USR-001",
      username,
      role: username === "manager" ? "Security Manager" : username === "soc_eng" ? "SOC Engineer" : username === "admin" ? "Administrator" : "Security Analyst",
      name: username === "manager" ? "Elena Rostova" : username === "soc_eng" ? "Jordan Vance" : username === "admin" ? "Marcus Vance" : "Alex Reyes"
    });
  },

  register: async (userData) => {
    return fetchWithFallback("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    }, {
      access_token: `mock_jwt_token_${Date.now()}`,
      token_type: "bearer",
      user_id: `USR-${Math.floor(Math.random()*900+100)}`,
      username: userData.username,
      role: userData.role || "Security Analyst",
      name: userData.name || "New Registered User"
    });
  },

  oauth2Login: async (provider = "Google SSO") => {
    return fetchWithFallback("/auth/oauth2", {
      method: "POST",
      body: JSON.stringify({ provider, email: "sso.analyst@enterprise-security.io", name: "SSO Security Member" })
    }, {
      access_token: `mock_oauth2_jwt_${provider.toLowerCase().replace(/\s+/g, '_')}`,
      token_type: "bearer",
      user_id: "USR-SSO-99",
      username: "sso_user",
      role: "Security Analyst",
      name: `Authenticated (${provider})`
    });
  },

  getProfile: async (username) => {
    return fetchWithFallback(`/auth/me?username=${username}`, {}, {
      id: "USR-001",
      username: username || "analyst",
      name: "Alex Reyes",
      email: "a.reyes@aegis-security.io",
      role: "Security Analyst",
      department: "SOC Operations"
    });
  },

  // Employee Identity & Profile Management
  getEmployees: async (department = null) => {
    const query = department ? `?department=${encodeURIComponent(department)}` : "";
    return fetchWithFallback(`/employees${query}`, {}, null);
  },

  onboardEmployee: async (empData) => {
    return fetchWithFallback("/employees", {
      method: "POST",
      body: JSON.stringify(empData)
    }, {
      ...empData,
      id: `EMP-${Math.floor(Math.random()*900+100)}`,
      risk_score: 12.0,
      risk_category: "Low",
      status: "Active"
    });
  },

  updateEmployee: async (empId, empData) => {
    return fetchWithFallback(`/employees/${empId}`, {
      method: "PUT",
      body: JSON.stringify(empData)
    }, {
      ...empData,
      id: empId
    });
  },

  // Alerts & Incidents
  getAlerts: async (severity = "All", status = "All", query = "") => {
    const params = new URLSearchParams();
    if (severity && severity !== "All") params.append("severity", severity);
    if (status && status !== "All") params.append("status", status);
    if (query) params.append("search", query);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    return fetchWithFallback(`/alerts${queryStr}`, {}, null);
  },

  updateAlertStatus: async (alertId, newStatus, analyst = "Alex Reyes") => {
    return fetchWithFallback(`/alerts/${alertId}/status?new_status=${newStatus}&analyst=${encodeURIComponent(analyst)}`, {
      method: "PATCH"
    }, { status: "success" });
  },

  recalculateRiskScore: async (alertId, scores) => {
    const params = new URLSearchParams(scores).toString();
    return fetchWithFallback(`/alerts/${alertId}/recalculate?${params}`, {
      method: "POST"
    }, null);
  },

  // Activities Log Ingestion
  getActivities: async (activityType = "All", employeeId = null, anomaliesOnly = false) => {
    const params = new URLSearchParams();
    if (activityType && activityType !== "All") params.append("activity_type", activityType);
    if (employeeId) params.append("employee_id", employeeId);
    if (anomaliesOnly) params.append("anomalies_only", "true");
    
    const queryStr = params.toString() ? `?${params.toString()}` : "";
    return fetchWithFallback(`/activities${queryStr}`, {}, null);
  },

  // Dashboards
  getAnalystMetrics: async () => {
    return fetchWithFallback("/dashboards/analyst", {}, null);
  },

  getSOCMetrics: async () => {
    return fetchWithFallback("/dashboards/soc", {}, null);
  },

  getSecurityManagerMetrics: async () => {
    return fetchWithFallback("/dashboards/manager", {}, null);
  },

  getAdminMetrics: async () => {
    return fetchWithFallback("/dashboards/admin", {}, null);
  },

  // Export CSV URL
  getCSVExportUrl: () => `${API_BASE_URL}/reports/export/csv`
};
