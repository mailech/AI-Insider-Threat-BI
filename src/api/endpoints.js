import client from "./client";

// ==================== AUTHENTICATION ====================

export const login = (email, password) =>
  client.post("/auth/login", {
    email,
    password,
  });

export const register = (payload) =>
  client.post("/auth/register", payload);

export const me = () =>
  client.get("/auth/me");

export const refreshToken = (refresh_token) =>
  client.post("/auth/refresh", {
    refresh_token,
  });

export const updateProfile = (payload) =>
  client.patch("/auth/me", payload);

export const changePassword = (payload) =>
  client.post("/auth/change-password", payload);

export const googleAuthorize = () =>
  client.get("/auth/oauth/google/authorize");

// ==================== ACTIVITY MONITORING ====================

export const listActivityEvents = (params = {}) =>
  client.get("/activity/events", { params });

export const getActivityStats = (params = {}) =>
  client.get("/activity/stats", { params });

export const getEmployeeTimeline = (employeeId, params = {}) =>
  client.get(`/activity/employees/${employeeId}/timeline`, { params });

export const ingestActivityEvent = (payload) =>
  client.post("/activity/events", payload);

export const ingestActivityBatch = (events, runDetection = true) =>
  client.post("/activity/ingest", {
    events,
    run_detection: runDetection,
  });
  export const listEmployees = (params = {}) =>
  client.get("/employees", { params });

export const uploadActivityLogs = (file, runDetection = true) => {
  const formData = new FormData();

  formData.append("file", file);

  return client.post("/activity/upload", formData, {
    params: {
      run_detection: runDetection,
    },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};