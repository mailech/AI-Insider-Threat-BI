const API_BASE_URL = "http://127.0.0.1:8000";

export const loginUser = async (email, password) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || "Invalid email or password");
    }

    return await response.json();
  } catch (err) {
    if (err.name === "TypeError" || (err.message && err.message.includes("fetch"))) {
      throw new Error("Cannot connect to backend server (http://127.0.0.1:8000). Ensure Uvicorn is running.");
    }
    throw err;
  }
};

export const getEmployees = async (token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/employees`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch employees");
  }

  return await response.json();
};

export const getActivityLogs = async (token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/telemetry/logs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch activity logs");
  }

  return await response.json();
};

export const getEmployeeRisk = async (employeeId, token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/analytics/risk/${employeeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch risk data");
  }

  return await response.json();
};

export const getDatasetRisk = async (token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/analytics/dataset-risk`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch dataset risk");
  }

  return await response.json();
};

export const getAlerts = async (token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/alerts`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    // Fallback to legacy endpoint if required
    const fallback = await fetch(`${API_BASE_URL}/api/v1/analytics/alerts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (fallback.ok) return await fallback.json();
    throw new Error("Failed to fetch alerts");
  }

  return await response.json();
};

export const updateAlertStatus = async (alertId, status, token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/alerts/${alertId}/status`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update alert status");
  }

  return await response.json();
};

export const assignAlert = async (alertId, assignedTo, token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/alerts/${alertId}/assign`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assigned_to: assignedTo }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to assign investigator");
  }

  return await response.json();
};

export const resolveAlert = async (alertId, notes, token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/alerts/${alertId}/resolve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ resolution_notes: notes }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to resolve alert");
  }

  return await response.json();
};

export const getInvestigationDetails = async (employeeId, token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/analytics/investigation/${employeeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch investigation details");
  }

  return await response.json();
};

export const getRiskExplainability = async (employeeId, token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/analytics/risk-explain/${employeeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch risk explainability");
  }

  return await response.json();
};

export const getRiskHistory = async (employeeId, token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/analytics/risk-history/${employeeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch risk history");
  }

  return await response.json();
};

export const getAuditLogs = async (token) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/audit-logs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch audit logs");
  }

  return await response.json();
};