import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
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

const STATUSES = ['open', 'investigating', 'escalated', 'contained', 'resolved', 'closed', 'false_positive']

export default function Investigations() {
  const [filters, setFilters] = useState({ status: '', severity: '', open_only: false, assigned_to_me: false, page: 1 })

  const params = {
    page: filters.page,
    size: 25,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.open_only ? { open_only: true } : {}),
    ...(filters.assigned_to_me ? { assigned_to_me: true } : {}),
  }
  const { data, loading, error, refetch } = useApi(() => api.listIncidents(params), [JSON.stringify(params)])
  const update = (patch) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 })

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Threat Investigations</h1>
          <p className="text-sm text-ink-muted mt-0.5">Incident queue with timelines, evidence and escalation workflow.</p>
        </div>
        <button type="button" className="btn-ghost" onClick={refetch}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      <Panel
        title={`Incidents${data ? ` (${fmtNumber(data.total)})` : ''}`}
        bodyClass="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select className="input py-1.5 text-xs w-auto" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{titleise(s)}</option>
              ))}
            </select>
            <select className="input py-1.5 text-xs w-auto" value={filters.severity} onChange={(e) => update({ severity: e.target.value })}>
              <option value="">All severities</option>
              {['critical', 'high', 'medium', 'low'].map((s) => (
                <option key={s} value={s}>{titleise(s)}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <input type="checkbox" className="accent-[var(--accent)]" checked={filters.open_only} onChange={(e) => update({ open_only: e.target.checked })} />
              Open only
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <input type="checkbox" className="accent-[var(--accent)]" checked={filters.assigned_to_me} onChange={(e) => update({ assigned_to_me: e.target.checked })} />
              Assigned to me
            </label>
          </div>
        }
      >
        {loading && <Loading label="Loading investigations" />}
        {error && !loading && <ErrorState message={error} onRetry={refetch} />}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState title="No investigations found" hint="Open one from an alert or an employee profile." />
        )}
        {data && !loading && !error && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th><th>Title</th><th>Employee</th><th>Severity</th>
                    <th>Status</th><th>Assignee</th><th className="text-right">Risk</th><th>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((incident) => (
                    <tr key={incident.id}>
                      <td>
                        <Link to={`/investigations/${incident.id}`} className="font-mono text-xs link">
                          {incident.reference}
                        </Link>
                      </td>
                      <td className="max-w-xs">
                        <p className="text-ink text-sm truncate">{incident.title}</p>
                        <p className="text-[11px] text-ink-muted">
                          {incident.alert_count} alerts · {incident.evidence_count} evidence items
                        </p>
                      </td>
                      <td>
                        <Link to={`/employees/${incident.employee_id}`} className="link text-sm">{incident.employee_name}</Link>
                        <p className="text-[11px] text-ink-muted">{incident.department || 'Unassigned'}</p>
                      </td>
                      <td><SeverityBadge value={incident.severity} /></td>
                      <td>
                        <StatusPill value={incident.status} />
                        {incident.escalated && <span className="ml-1.5 text-[10px] text-sev-high">ESCALATED</span>}
                      </td>
                      <td className="text-ink-secondary text-xs">{incident.assignee_name || 'Unassigned'}</td>
                      <td className="text-right tabular-nums text-ink">{fmtNumber(incident.risk_score, 1)}</td>
                      <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(incident.opened_at)}</td>
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
