const API_BASE_URL = "http://127.0.0.1:8000";

export const loginUser = async (email, password) => {
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
    throw new Error("Invalid email or password");
  }

  return await response.json();
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
    `${API_BASE_URL}/api/v1/analytics/alerts`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch alerts");
  }

  return await response.json();
};