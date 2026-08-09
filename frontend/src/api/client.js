import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const REFRESH_STORAGE_KEY = 'itbis.refresh_token'

// The access token lives in memory only -- a token sitting in localStorage is
// readable by any injected script. Only the refresh token is persisted, so a
// page reload can recover a session without keeping the bearer around.
let accessToken = null
let onSessionExpired = () => {}

export const tokenStore = {
  get access() {
    return accessToken
  },
  get refresh() {
    return localStorage.getItem(REFRESH_STORAGE_KEY)
  },
  set({ access_token, refresh_token }) {
    accessToken = access_token ?? accessToken
    if (refresh_token) localStorage.setItem(REFRESH_STORAGE_KEY, refresh_token)
  },
  clear() {
    accessToken = null
    localStorage.removeItem(REFRESH_STORAGE_KEY)
  },
}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler
}

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthCall = original?.url?.startsWith('/auth/login') || original?.url === '/auth/refresh'

    // Retry exactly once. A second 401 after a fresh token means the session is
    // genuinely gone, and retrying again would loop.
    if (error.response?.status === 401 && !original?._retried && !isAuthCall) {
      original._retried = true
      const refreshToken = tokenStore.refresh
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          tokenStore.set(data)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          tokenStore.clear()
          onSessionExpired()
        }
      } else {
        tokenStore.clear()
        onSessionExpired()
      }
    }
    return Promise.reject(error)
  },
)

export function apiErrorMessage(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) return detail[0]?.msg || fallback
  return error?.message || fallback
}

export default api
