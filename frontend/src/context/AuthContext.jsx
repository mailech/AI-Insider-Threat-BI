import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../api/endpoints'
import { clearTokens, getToken, storeTokens } from '../api/client'

const AuthContext = createContext(null)

export const ROLE_LABELS = {
  security_analyst: 'Security Analyst',
  soc_engineer: 'SOC Engineer',
  security_manager: 'Security Manager',
  administrator: 'Administrator',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const { data } = await api.me()
        if (active) setUser(data)
      } catch {
        clearTokens()
      } finally {
        if (active) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { data } = await api.login(email, password)
    storeTokens(data.access_token, data.refresh_token)
    setUser(data.user)
    return data.user
  }, [])

  const signUp = useCallback(async (payload) => {
    const { data } = await api.register(payload)
    storeTokens(data.access_token, data.refresh_token)
    setUser(data.user)
    return data.user
  }, [])

  const signOut = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await api.me()
    setUser(data)
    return data
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
      role: user?.role,
      roleLabel: user ? ROLE_LABELS[user.role] || user.role : null,
      isAdmin: user?.role === 'administrator',
      isManager: ['security_manager', 'administrator'].includes(user?.role),
      isSoc: ['soc_engineer', 'security_manager', 'administrator'].includes(user?.role),
    }),
    [user, loading, signIn, signUp, signOut, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
