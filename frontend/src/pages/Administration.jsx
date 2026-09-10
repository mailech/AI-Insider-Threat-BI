import { useState } from 'react'
import { Plus, RefreshCw, ShieldOff, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { ROLE_LABELS } from '../context/AuthContext'
import { EmptyState, ErrorState, Loading, Pagination, Panel } from '../components/ui'
import { fmtDateTime, fmtNumber, titleise } from '../utils/format'

const ROLES = Object.keys(ROLE_LABELS)

function CreateUserModal({ open, onClose, onCreated }) {
  const empty = { full_name: '', email: '', password: '', role: 'security_analyst', job_title: '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  if (!open) return null

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.createUser(form)
      setForm(empty)
      onCreated()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="panel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span className="panel-title">Create platform user</span>
          <button type="button" className="text-ink-muted hover:text-ink" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <p className="text-sm text-sev-critical">{error}</p>}
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.full_name} onChange={update('full_name')} required minLength={2} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={update('email')} required />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input type="password" className="input" value={form.password} onChange={update('password')} required minLength={8} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={update('role')}>
              {ROLES.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Job title</label>
            <input className="input" value={form.job_title} onChange={update('job_title')} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating' : 'Create user'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UsersTab({ state, busy, onRole, onToggle, onPage }) {
  if (state.loading) return <Loading />
  if (state.error) return <ErrorState message={state.error} onRetry={state.refetch} />
  if (!state.data) return null
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Last login</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.data.items.map((user) => (
              <tr key={user.id}>
                <td>
                  <p className="text-ink text-sm">{user.full_name}</p>
                  <p className="text-[11px] text-ink-muted">{user.email}</p>
                </td>
                <td>
                  <select
                    className="input py-1 text-xs w-auto"
                    value={user.role}
                    disabled={busy}
                    onChange={(e) => onRole(user, e.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </td>
                <td className="text-ink-muted text-xs">{titleise(user.auth_provider)}</td>
                <td className="text-xs">
                  <span className={user.is_active ? 'text-sev-low' : 'text-sev-critical'}>
                    {user.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="text-ink-muted text-xs whitespace-nowrap">
                  {user.last_login_at ? fmtDateTime(user.last_login_at) : 'Never'}
                </td>
                <td className="text-right">
                  <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => onToggle(user)}>
                    <ShieldOff size={13} /> {user.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={state.data.page} pages={state.data.pages} total={state.data.total} onChange={onPage} />
    </>
  )
}

function AuditTab({ state, onPage }) {
  if (state.loading) return <Loading />
  if (state.error) return <ErrorState message={state.error} onRetry={state.refetch} />
  if (!state.data?.items?.length) return <EmptyState title="No audit records" />
  return (
    <>
      <div className="table-wrap max-h-[560px] overflow-y-auto">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Detail</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {state.data.items.map((log) => (
              <tr key={log.id}>
                <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(log.created_at)}</td>
                <td className="text-ink-secondary text-xs">{log.actor || 'system'}</td>
                <td className="font-mono text-xs text-accent">{log.action}</td>
                <td className="text-ink-muted text-xs">
                  {log.entity_type ? `${log.entity_type} ${log.entity_id ?? ''}` : '-'}
                </td>
                <td className="text-ink-muted text-xs max-w-md truncate">{log.detail || '-'}</td>
                <td className="font-mono text-[11px] text-ink-muted">{log.ip_address || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={state.data.page} pages={state.data.pages} total={state.data.total} onChange={onPage} />
    </>
  )
}

export default function Administration() {
  const [tab, setTab] = useState('Users')
  const [page, setPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const users = useApi(() => api.listUsers({ page, size: 25 }), [page])
  const audit = useApi(() => api.auditLogs({ page: auditPage, size: 50 }), [auditPage])
  const dashboard = useApi(() => api.adminDashboard(), [])

  async function changeRole(user, role) {
    setBusy(true)
    try {
      await api.updateUser(user.id, { role })
      setMessage(`${user.full_name} is now ${ROLE_LABELS[role]}`)
      users.refetch()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(user) {
    setBusy(true)
    try {
      if (user.is_active) {
        await api.deactivateUser(user.id)
        setMessage(`${user.email} deactivated`)
      } else {
        await api.updateUser(user.id, { is_active: true })
        setMessage(`${user.email} reactivated`)
      }
      users.refetch()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Administration</h1>
          <p className="text-sm text-ink-muted mt-0.5">User management, platform analytics and the audit trail.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Create user
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              users.refetch()
              audit.refetch()
              dashboard.refetch()
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {message && <p className="text-sm text-accent">{message}</p>}

      {dashboard.data && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {dashboard.data.kpis.map((kpi) => (
            <div key={kpi.label} className="panel p-4">
              <p className="text-[11px] uppercase tracking-wider text-ink-muted">{kpi.label}</p>
              <p className="figure">{fmtNumber(kpi.value)}</p>
            </div>
          ))}
        </div>
      )}

      <nav className="flex gap-1 border-b border-line">
        {['Users', 'Audit trail', 'System'].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={
              tab === name
                ? 'px-4 py-2.5 text-sm font-medium text-accent border-b-2 border-accent'
                : 'px-4 py-2.5 text-sm text-ink-muted hover:text-ink border-b-2 border-transparent'
            }
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === 'Users' && (
        <Panel title={`Platform users${users.data ? ` (${fmtNumber(users.data.total)})` : ''}`} bodyClass="p-0">
          <UsersTab state={users} busy={busy} onRole={changeRole} onToggle={toggleActive} onPage={setPage} />
        </Panel>
      )}

      {tab === 'Audit trail' && (
        <Panel title={`Audit log${audit.data ? ` (${fmtNumber(audit.data.total)})` : ''}`} bodyClass="p-0">
          <AuditTab state={audit} onPage={setAuditPage} />
        </Panel>
      )}

      {tab === 'System' && dashboard.data && (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Panel title="System health">
            <dl className="space-y-3 text-sm">
              {Object.entries(dashboard.data.system_health).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{titleise(key)}</dt>
                  <dd className="text-ink text-right truncate">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Platform analytics">
            <dl className="space-y-3 text-sm">
              {Object.entries(dashboard.data.platform_analytics).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{titleise(key)}</dt>
                  <dd className="tabular-nums text-ink">{fmtNumber(value)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      )}

      <CreateUserModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={users.refetch} />
    </div>
  )
}
