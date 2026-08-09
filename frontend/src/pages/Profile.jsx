import { useState } from 'react'

import { apiErrorMessage } from '../api/client'
import { authApi } from '../api/resources'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABELS } from '../lib/constants'
import { formatDate } from '../lib/format'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)

    const payload = { full_name: fullName }
    if (password) payload.password = password

    try {
      const updated = await authApi.updateMe(payload)
      setUser(updated)
      setPassword('')
      setStatus({ kind: 'good', message: 'Profile updated' })
    } catch (err) {
      setStatus({ kind: 'critical', message: apiErrorMessage(err, 'Could not update profile') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Your profile</h1>
        <p className="text-sm text-ink-secondary">
          {ROLE_LABELS[user?.role] || user?.role} · member since {formatDate(user?.created_at)}
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs text-ink-secondary">Email</span>
          <input className="field opacity-60" value={user?.email || ''} disabled />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-secondary">Full name</span>
          <input
            className="field"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-secondary">
            New password (leave blank to keep current)
          </span>
          <input
            type="password"
            autoComplete="new-password"
            className="field"
            value={password}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {status ? (
          <p className={status.kind === 'good' ? 'text-xs text-good' : 'text-xs text-critical'}>
            <span aria-hidden="true">{status.kind === 'good' ? '● ' : '■ '}</span>
            {status.message}
          </p>
        ) : null}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
