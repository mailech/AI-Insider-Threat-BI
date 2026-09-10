import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, Monitor, Moon, Shield, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { errorMessage } from '../api/client'

const DEMO_ACCOUNTS = [
  { email: 'analyst@itbis.io', password: 'Analyst@12345', role: 'Security Analyst' },
  { email: 'soc@itbis.io', password: 'SocEng@12345', role: 'SOC Engineer' },
  { email: 'manager@itbis.io', password: 'Manager@12345', role: 'Security Manager' },
  { email: 'admin@itbis.io', password: 'Admin@12345', role: 'Administrator' },
]

export default function Login() {
  const { signIn, user, loading } = useAuth()
  const { mode, cycle } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Sign in failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center gap-2.5 px-6">
        <Shield size={18} className="text-accent" />
        <span className="text-sm font-semibold tracking-tight">Insider Threat</span>
        <button type="button" className="btn btn-quiet ml-auto px-2 py-2" onClick={cycle} aria-label="Change theme">
          <ThemeIcon size={16} />
        </button>
      </header>

      <main className="mx-auto flex max-w-sm flex-col px-6 pt-10 sm:pt-16">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Behavioural intelligence console. All access is audited.
        </p>

        {error && (
          <div
            className="mt-5 flex items-start gap-2 rounded px-3 py-2.5 text-[13px]"
            style={{ background: 'var(--surface-sunken)', color: 'var(--sev-critical)' }}
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? 'Signing in' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-[13px] text-ink-muted">
          No account yet? <Link to="/register" className="link">Register</Link>
        </p>

        <div className="mt-10 hairline-t pt-5">
          <p className="eyebrow mb-2.5">Demo accounts</p>
          <div className="panel divide-y divide-line overflow-hidden">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email)
                  setPassword(account.password)
                  setError(null)
                }}
                className="flex w-full items-baseline gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="text-[13px] text-ink">{account.role}</span>
                <span className="ml-auto truncate text-2xs text-ink-muted">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
