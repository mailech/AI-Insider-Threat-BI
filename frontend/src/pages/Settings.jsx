import { useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Panel } from '../components/ui'
import { fmtDateTime, titleise } from '../utils/format'

export default function SettingsPage() {
  const { user, roleLabel, refreshUser } = useAuth()
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    job_title: user?.job_title || '',
  })
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [profileMessage, setProfileMessage] = useState(null)
  const [passwordMessage, setPasswordMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  async function saveProfile(e) {
    e.preventDefault()
    setBusy(true)
    setProfileMessage(null)
    try {
      await api.updateProfile(profile)
      await refreshUser()
      setProfileMessage('Profile updated')
    } catch (err) {
      setProfileMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setBusy(true)
    setPasswordMessage(null)
    try {
      await api.changePassword(passwords)
      setPasswords({ current_password: '', new_password: '' })
      setPasswordMessage('Password updated successfully')
    } catch (err) {
      setPasswordMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-xl font-semibold text-ink">Profile and settings</h1>
        <p className="text-sm text-ink-muted mt-0.5">Manage your console account.</p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title="Account">
          <dl className="space-y-3 text-sm">
            {[
              ['Email', user?.email],
              ['Role', roleLabel],
              ['Auth provider', titleise(user?.auth_provider)],
              ['Verified', user?.is_verified ? 'Yes' : 'No'],
              ['Last login', user?.last_login_at ? fmtDateTime(user.last_login_at) : 'Never'],
              ['Member since', fmtDateTime(user?.created_at)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="text-ink text-right truncate">{value || '-'}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Edit profile">
          <form onSubmit={saveProfile} className="space-y-4">
            {profileMessage && <p className="text-sm text-accent">{profileMessage}</p>}
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                minLength={2}
                required
              />
            </div>
            <div>
              <label className="label">Job title</label>
              <input
                className="input"
                value={profile.job_title}
                onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>
              <Save size={15} /> Save profile
            </button>
          </form>
        </Panel>
      </div>

      <Panel title="Change password">
        <form onSubmit={savePassword} className="space-y-4 max-w-md">
          {passwordMessage && <p className="text-sm text-accent">{passwordMessage}</p>}
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>
            <KeyRound size={15} /> Update password
          </button>
        </form>
      </Panel>
    </div>
  )
}
