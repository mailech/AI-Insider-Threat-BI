import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { setSessionExpiredHandler, tokenStore } from '../api/client'
import { authApi } from '../api/resources'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
  }, [])

  // A reload loses the in-memory access token. If a refresh token survived,
  // trade it for a new one rather than bouncing the user to the login screen.
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (!tokenStore.refresh) {
        setLoading(false)
        return
      }
      try {
        const profile = await authApi.me()
        if (!cancelled) setUser(profile)
      } catch {
        tokenStore.clear()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const tokens = await authApi.login(email, password)
    tokenStore.set(tokens)
    const profile = await authApi.me()
    setUser(profile)
    return profile
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      setUser,
      hasRole: (roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
