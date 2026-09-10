import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api/client'

const ROLES = [
  { value: 'security_analyst', label: 'Security Analyst' },
  { value: 'soc_engineer', label: 'SOC Engineer' },
  { value: 'security_manager', label: 'Security Manager' },
]

export default function Register() {
  const { signUp, user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'security_analyst' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await signUp({ ...form, email: form.email.trim() })
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <span className="rounded-lg bg-accent/15 p-2 text-accent">
            <Shield size={22} />
          </span>
          <p className="font-semibold text-ink">Insider Threat Intelligence</p>
        </div>

        <h2 className="text-xl font-semibold text-ink">Create account</h2>
        <p className="text-sm text-ink-muted mt-1">The first account created becomes the administrator.</p>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-sev-critical bg-sev-critical px-3 py-2.5 text-sm text-sev-critical">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input id="full_name" className="input" value={form.full_name} onChange={update('full_name')} required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={update('email')} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={form.password} onChange={update('password')} required minLength={8} />
          </div>
          <div>
            <label className="label" htmlFor="role">Requested role</label>
            <select id="role" className="input" value={form.role} onChange={update('role')}>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Creating account' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-ink-muted">
          Already registered? <Link to="/login" className="link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
