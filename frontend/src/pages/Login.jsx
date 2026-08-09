import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { apiErrorMessage } from '../api/client'
import { authApi } from '../api/resources'
import { useAuth } from '../auth/AuthContext'

const DEMO_ACCOUNTS = [
  ['admin@insiderthreat.io', 'Administrator'],
  ['manager@insiderthreat.io', 'Security Manager'],
  ['soc@insiderthreat.io', 'SOC Engineer'],
  ['analyst@insiderthreat.io', 'Security Analyst'],
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'register') {
        await authApi.register({ email, full_name: fullName, password })
      }
      await login(email, password)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to sign in'))
    } finally {
      setSubmitting(false)
    }
  }

  function useDemoAccount(demoEmail) {
    setMode('login')
    setEmail(demoEmail)
    setPassword('Insider@2026')
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Insider Threat Behavioral Intelligence</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {mode === 'login' ? 'Sign in to the security console' : 'Create an analyst account'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="full_name" className="mb-1 block text-xs text-ink-secondary">
                Full name
              </label>
              <input
                id="full_name"
                className="field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-ink-secondary">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs text-ink-secondary">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
              <span aria-hidden="true">■ </span>
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            className="w-full text-xs text-ink-secondary hover:text-ink"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
          >
            {mode === 'login'
              ? 'No account? Register as an analyst'
              : 'Already registered? Sign in'}
          </button>
        </form>

        <div className="mt-6">
          <p className="mb-2 text-center text-xs text-ink-muted">
            Demo accounts · password Insider@2026
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(([demoEmail, label]) => (
              <button
                key={demoEmail}
                type="button"
                className="btn-ghost text-xs"
                onClick={() => useDemoAccount(demoEmail)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
