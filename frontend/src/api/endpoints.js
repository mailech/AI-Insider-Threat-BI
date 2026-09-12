import client from './client'

// --- auth ---
export const login = (email, password) => client.post('/auth/login', { email, password })
export const register = (payload) => client.post('/auth/register', payload)
export const me = () => client.get('/auth/me')
export const updateProfile = (payload) => client.patch('/auth/me', payload)
export const changePassword = (payload) => client.post('/auth/change-password', payload)
export const googleAuthorize = () => client.get('/auth/oauth/google/authorize')

// --- employees ---
export const listEmployees = (params) => client.get('/employees', { params })
export const getEmployee = (id) => client.get(`/employees/${id}`)
export const createEmployee = (payload) => client.post('/employees', payload)
export const updateEmployee = (id, payload) => client.patch(`/employees/${id}`, payload)
export const listDepartments = () => client.get('/departments')
export const createDepartment = (payload) => client.post('/departments', payload)
export const listAssets = (id) => client.get(`/employees/${id}/assets`)
export const createAsset = (payload) => client.post('/assets', payload)

// --- activity ---
export const listEvents = (params) => client.get('/activity/events', { params })
export const activityStats = (params) => client.get('/activity/stats', { params })
export const employeeTimeline = (id, params) => client.get(`/activity/employees/${id}/timeline`, { params })
export const ingestBatch = (payload) => client.post('/activity/ingest', payload)
export const uploadLogs = (file, runDetection = true) => {
  const form = new FormData()
  form.append('file', file)
  return client.post(`/activity/upload?run_detection=${runDetection}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  })
}

// --- behavioural analytics ---
export const buildBaselines = (payload) => client.post('/baselines/build', payload)
export const listBaselines = (params) => client.get('/baselines', { params })
export const getBaseline = (id) => client.get(`/employees/${id}/baseline`)
export const runDetection = (payload) => client.post('/detection/run', payload)
export const listAnomalies = (params) => client.get('/anomalies', { params })
export const getAnomaly = (id) => client.get(`/anomalies/${id}`)
export const reviewAnomaly = (id, isFalsePositive) =>
  client.post(`/anomalies/${id}/review?is_false_positive=${isFalsePositive}`)

// --- risk scoring ---
export const recomputeRisk = (params) => client.post('/risk/recompute', null, { params })
export const riskDistribution = () => client.get('/risk/distribution')
export const organisationalRisk = () => client.get('/risk/organisation')
export const employeeRisk = (id, params) => client.get(`/employees/${id}/risk`, { params })
export const riskHistory = (id, params) => client.get(`/employees/${id}/risk/history`, { params })

// --- ueba ---
export const uebaProfile = (id, params) => client.get(`/ueba/employees/${id}`, { params })
export const uebaPredictions = (params) => client.get('/ueba/predictions', { params })
export const uebaEntities = (params) => client.get('/ueba/entities', { params })
export const uebaPeerGroups = () => client.get('/ueba/peer-groups')

// --- alerts ---
export const listAlerts = (params) => client.get('/alerts', { params })
export const getAlert = (id) => client.get(`/alerts/${id}`)
export const updateAlert = (id, payload) => client.patch(`/alerts/${id}`, payload)
export const acknowledgeAlert = (id) => client.post(`/alerts/${id}/acknowledge`)

// --- investigations ---
export const listIncidents = (params) => client.get('/investigations', { params })
export const getIncident = (id) => client.get(`/investigations/${id}`)
export const createIncident = (payload) => client.post('/investigations', payload)
export const updateIncident = (id, payload) => client.patch(`/investigations/${id}`, payload)
export const escalateIncident = (id, payload) => client.post(`/investigations/${id}/escalate`, payload)
export const assignIncident = (id, assigneeId) =>
  client.post(`/investigations/${id}/assign?assignee_id=${assigneeId}`)
export const addIncidentNote = (id, body) => client.post(`/investigations/${id}/notes`, { body })
export const addEvidence = (id, payload) => client.post(`/investigations/${id}/evidence`, payload)
export const rebuildTimeline = (id) => client.post(`/investigations/${id}/rebuild-timeline`)

// --- dashboards ---
export const analystDashboard = () => client.get('/dashboards/analyst')
export const socDashboard = () => client.get('/dashboards/soc')
export const managerDashboard = () => client.get('/dashboards/manager')
export const adminDashboard = () => client.get('/dashboards/admin')
export const securityMetrics = (params) => client.get('/dashboards/metrics', { params })

// --- notifications ---
export const listNotifications = (params) => client.get('/notifications', { params })
export const unreadCount = () => client.get('/notifications/unread-count')
export const markRead = (id) => client.post(`/notifications/${id}/read`)
export const markAllRead = () => client.post('/notifications/read-all')

// --- users / administration ---
export const listUsers = (params) => client.get('/users', { params })
export const assignableUsers = (params) => client.get('/users/assignable', { params })
export const createUser = (payload) => client.post('/users', payload)
export const updateUser = (id, payload) => client.patch(`/users/${id}`, payload)
export const deactivateUser = (id) => client.delete(`/users/${id}`)
export const auditLogs = (params) => client.get('/users/audit/logs', { params })

// --- reports ---
export const reportTypes = () => client.get('/reports/types')
export const previewReport = (type, params) => client.get(`/reports/${type}`, { params })
export const exportReport = (type, params) =>
  client.get(`/reports/${type}/export`, { params, responseType: 'blob', timeout: 120000 })
