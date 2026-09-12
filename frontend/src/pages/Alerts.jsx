import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, FolderPlus, RefreshCw } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import {
  EmptyState,
  ErrorState,
  Loading,
  Pagination,
  Panel,
  SeverityBadge,
  StatusPill,
} from '../components/ui'
import { fmtDateTime, fmtNumber, titleise } from '../utils/format'

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'informational']
const STATUSES = ['new', 'acknowledged', 'in_review', 'escalated', 'closed', 'dismissed']

export default function Alerts() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ severity: '', status: '', days: 30, page: 1 })
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const params = {
    page: filters.page,
    size: 25,
    days: filters.days,
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
  const { data, loading, error, refetch } = useApi(() => api.listAlerts(params), [JSON.stringify(params)])

  const update = (patch) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 })

  async function acknowledge(alert) {
    setBusy(alert.id)
    setMessage(null)
    try {
      await api.acknowledgeAlert(alert.id)
      setMessage(`Alert #${alert.id} acknowledged`)
      refetch()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function openInvestigation(alert) {
    setBusy(alert.id)
    setMessage(null)
    try {
      const { data: incident } = await api.createIncident({
        employee_id: alert.employee_id,
        title: `Investigation: ${alert.title}`,
        summary: alert.description,
        category: alert.category,
        severity: alert.severity,
        alert_ids: [alert.id],
        anomaly_ids: alert.anomaly_id ? [alert.anomaly_id] : [],
        auto_build_timeline: true,
      })
      navigate(`/investigations/${incident.id}`)
    } catch (err) {
      setMessage(errorMessage(err))
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Threat Alerts</h1>
          <p className="text-sm text-ink-muted mt-0.5">Prioritised insider threat alerts from the detection engine.</p>
        </div>
        <button type="button" className="btn-ghost" onClick={refetch}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      {message && <p className="text-sm text-accent">{message}</p>}

      <Panel
        title={`Alerts${data ? ` (${fmtNumber(data.total)})` : ''}`}
        bodyClass="p-0"
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="input py-1.5 text-xs w-auto" value={filters.severity} onChange={(e) => update({ severity: e.target.value })}>
              <option value="">All severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{titleise(s)}</option>
              ))}
            </select>
            <select className="input py-1.5 text-xs w-auto" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{titleise(s)}</option>
              ))}
            </select>
            <select className="input py-1.5 text-xs w-auto" value={filters.days} onChange={(e) => update({ days: Number(e.target.value) })}>
              {[7, 30, 90, 180].map((d) => (
                <option key={d} value={d}>Last {d} days</option>
              ))}
            </select>
          </div>
        }
      >
        {loading && <Loading label="Loading alerts" />}
        {error && !loading && <ErrorState message={error} onRetry={refetch} />}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState title="No alerts match these filters" hint="Widen the time window or clear the filters." />
        )}
        {data && !loading && !error && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Severity</th>
                    <th>Alert</th>
                    <th className="text-right">Hits</th>
                    <th>Employee</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Triggered</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((alert) => (
                    <tr key={alert.id}>
                      <td className="font-mono text-xs text-ink-muted">P{alert.priority}</td>
                      <td><SeverityBadge value={alert.severity} /></td>
                      <td className="max-w-sm">
                        <p className="text-ink truncate">{alert.title}</p>
                        <p className="text-[11px] text-ink-muted truncate">{alert.description}</p>
                      </td>
                      <td className="text-right tabular-nums text-xs">
                        <span className={alert.occurrence_count > 1 ? 'text-sev-high' : 'text-ink-muted'}>
                          {alert.occurrence_count > 1 ? `x${alert.occurrence_count}` : '1'}
                        </span>
                      </td>
                      <td>
                        <Link to={`/employees/${alert.employee_id}`} className="link text-sm">
                          {alert.employee_name}
                        </Link>
                        <p className="text-[11px] text-ink-muted">{alert.department || 'Unassigned'}</p>
                      </td>
                      <td className="text-ink-secondary text-xs">{titleise(alert.category)}</td>
                      <td><StatusPill value={alert.status} /></td>
                      <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(alert.triggered_at)}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn-ghost px-2 py-1 text-xs"
                            disabled={busy === alert.id || alert.status !== 'new'}
                            onClick={() => acknowledge(alert)}
                            title="Acknowledge"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost px-2 py-1 text-xs"
                            disabled={busy === alert.id || Boolean(alert.incident_id)}
                            onClick={() => openInvestigation(alert)}
                            title={alert.incident_id ? 'Already linked to an incident' : 'Open investigation'}
                          >
                            <FolderPlus size={13} />
                          </button>
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
    </div>
  )
}
