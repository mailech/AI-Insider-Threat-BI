import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw, Search, X } from 'lucide-react'
import { useApi, useDebounced } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  EmptyState,
  ErrorState,
  Loading,
  Pagination,
  Panel,
  RiskBadge,
  RiskMeter,
} from '../components/ui'
import { fmtNumber, titleise } from '../utils/format'

function OnboardModal({ open, onClose, departments, onCreated }) {
  const empty = {
    employee_code: '',
    full_name: '',
    email: '',
    department_id: '',
    designation: '',
    location: '',
    access_level: 'standard',
    is_privileged: false,
  }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!open) return null
  const update = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.createEmployee({
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
      })
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
      <div className="panel w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span className="panel-title">Onboard employee</span>
          <button type="button" className="text-ink-muted hover:text-ink" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <p className="text-sm text-sev-critical">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Employee code</label>
              <input className="input" value={form.employee_code} onChange={update('employee_code')} required />
            </div>
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.full_name} onChange={update('full_name')} required minLength={2} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={update('email')} required />
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department_id} onChange={update('department_id')}>
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Designation</label>
              <input className="input" value={form.designation} onChange={update('designation')} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location} onChange={update('location')} />
            </div>
            <div>
              <label className="label">Access level</label>
              <select className="input" value={form.access_level} onChange={update('access_level')}>
                {['standard', 'elevated', 'privileged', 'admin'].map((level) => (
                  <option key={level} value={level}>{titleise(level)}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input type="checkbox" checked={form.is_privileged} onChange={update('is_privileged')} className="accent-[var(--accent)]" />
            Privileged account holder
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving' : 'Onboard employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Employees() {
  const { isManager } = useAuth()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ risk_category: '', department_id: '', sort: 'risk', page: 1 })
  const [modalOpen, setModalOpen] = useState(false)
  const query = useDebounced(search, 350)

  const params = {
    page: filters.page,
    size: 25,
    sort: filters.sort,
    ...(query ? { q: query } : {}),
    ...(filters.risk_category ? { risk_category: filters.risk_category } : {}),
    ...(filters.department_id ? { department_id: Number(filters.department_id) } : {}),
  }
  const { data, loading, error, refetch } = useApi(() => api.listEmployees(params), [JSON.stringify(params)])
  const { data: departments } = useApi(() => api.listDepartments(), [])

  const update = (patch) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 })

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Employees</h1>
          <p className="text-sm text-ink-muted mt-0.5">Monitored workforce with live insider risk scoring.</p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={15} /> Onboard employee
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={refetch}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      <Panel
        title={`Workforce${data ? ` (${fmtNumber(data.total)})` : ''}`}
        bodyClass="p-0"
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                className="input py-1.5 pl-8 text-xs w-48"
                placeholder="Search name, code, email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input py-1.5 text-xs w-auto" value={filters.department_id} onChange={(e) => update({ department_id: e.target.value })}>
              <option value="">All departments</option>
              {(departments || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select className="input py-1.5 text-xs w-auto" value={filters.risk_category} onChange={(e) => update({ risk_category: e.target.value })}>
              <option value="">All risk levels</option>
              {['critical', 'high', 'medium', 'low'].map((r) => (
                <option key={r} value={r}>{titleise(r)}</option>
              ))}
            </select>
            <select className="input py-1.5 text-xs w-auto" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="risk">Sort by risk</option>
              <option value="name">Sort by name</option>
              <option value="code">Sort by code</option>
              <option value="created">Sort by newest</option>
            </select>
          </div>
        }
      >
        {loading && <Loading label="Loading employees" />}
        {error && !loading && <ErrorState message={error} onRetry={refetch} />}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState title="No employees found" hint="Adjust your filters or onboard a new employee." />
        )}
        {data && !loading && !error && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Access</th>
                    <th className="w-44">Insider risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((employee) => (
                    <tr key={employee.id}>
                      <td className="font-mono text-xs text-ink-muted">{employee.employee_code}</td>
                      <td>
                        <Link to={`/employees/${employee.id}`} className="link text-sm">{employee.full_name}</Link>
                        <p className="text-[11px] text-ink-muted">{employee.email}</p>
                      </td>
                      <td className="text-ink-secondary text-sm">{employee.department_name || '-'}</td>
                      <td className="text-ink-muted text-xs">{employee.designation || '-'}</td>
                      <td className="text-xs">
                        <span className={employee.employment_status === 'active' ? 'text-ink-secondary' : 'text-sev-high'}>
                          {titleise(employee.employment_status)}
                        </span>
                        {employee.on_watchlist && <span className="ml-1.5 text-[10px] text-sev-critical">WATCHLIST</span>}
                      </td>
                      <td className="text-xs text-ink-muted">
                        {titleise(employee.access_level)}
                        {employee.is_privileged && <span className="ml-1 text-accent">•</span>}
                      </td>
                      <td>
                        <div className="space-y-1.5">
                          <RiskBadge category={employee.current_risk_category} score={employee.current_risk_score} />
                          <RiskMeter score={employee.current_risk_score} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={(page) => update({ page })} />
          </>
        )}
      </Panel>

      <OnboardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        departments={departments || []}
        onCreated={refetch}
      />
    </div>
  )
}
