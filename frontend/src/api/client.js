import axios from 'axios'

/**
 * API origin.
 *
 * Unset in a production build means "same origin" - the API serves the console,
 * so requests go to /api/v1 relatively and there is no CORS to configure. In dev
 * the two run on separate ports, so default to the local API. An explicit
 * VITE_API_URL always wins, for split deployments.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')
export const API_PREFIX = '/api/v1'

export const TOKEN_KEY = 'itbis.access'
export const REFRESH_KEY = 'itbis.refresh'

const client = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 45000,
})

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY)

export function storeTokens(access, refresh) {
  if (access) localStorage.setItem(TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refresh once on a 401, then replay the original request.
let refreshing = null

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {}
    const status = error.response?.status

    if (status === 401 && !original._retried && getRefreshToken()) {
      original._retried = true
      try {
        refreshing =
          refreshing ||
          axios.post(`${BASE_URL}${API_PREFIX}/auth/refresh`, {
            refresh_token: getRefreshToken(),
          })
        const { data } = await refreshing
        refreshing = null
        storeTokens(data.access_token, data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return client(original)
      } catch (refreshError) {
        refreshing = null
        clearTokens()
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg || String(d)).join(', ')
  if (error?.response?.data?.errors?.length) {
    return error.response.data.errors.map((e) => e.msg).join(', ')
  }
  return error?.message || fallback
}

export const socketURL = (token) => {
  const origin = BASE_URL || window.location.origin
  return `${origin.replace(/^http/, 'ws')}${API_PREFIX}/notifications/ws?token=${encodeURIComponent(token)}`
}

export default client
