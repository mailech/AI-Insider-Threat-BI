import api from './client'

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login/json', { email, password }).then((r) => r.data),
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateMe: (payload) => api.patch('/auth/me', payload).then((r) => r.data),
}

export const employeesApi = {
  list: (params) => api.get('/employees', { params }).then((r) => r.data),
  get: (id) => api.get(`/employees/${id}`).then((r) => r.data),
  create: (payload) => api.post('/employees', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/employees/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/employees/${id}`),
  activities: (id, limit = 50) =>
    api.get(`/employees/${id}/activities`, { params: { limit } }).then((r) => r.data),
  devices: (id) => api.get(`/employees/${id}/devices`).then((r) => r.data),
  privileges: (id) => api.get(`/employees/${id}/privileges`).then((r) => r.data),
}

export const departmentsApi = {
  list: () => api.get('/departments').then((r) => r.data),
}

export const activitiesApi = {
  list: (params) => api.get('/activities', { params }).then((r) => r.data),
  ingest: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post('/activities/ingest', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}

export const dashboardApi = {
  summary: (days = 30) => api.get('/dashboard/summary', { params: { days } }).then((r) => r.data),
}

export const usersApi = {
  list: () => api.get('/users').then((r) => r.data),
  update: (id, payload) => api.patch(`/users/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/users/${id}`),
}
