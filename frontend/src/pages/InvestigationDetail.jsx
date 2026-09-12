import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpCircle,
  FileText,
  Fingerprint,
  Laptop,
  MessageSquarePlus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { RiskTrendChart } from '../components/charts'
import {
  EmptyState,
  ErrorState,
  Loading,
  Panel,
  SeverityBadge,
  StatusPill,
} from '../components/ui'
import { fmtBytes, fmtDateTime, fmtNumber, titleise } from '../utils/format'

const NEXT_STATUS = {
  open: ['investigating', 'escalated', 'false_positive', 'closed'],
  investigating: ['escalated', 'contained', 'resolved', 'false_positive'],
  escalated: ['investigating', 'contained', 'resolved'],
  contained: ['resolved', 'investigating'],
  resolved: ['closed', 'investigating'],
  false_positive: ['closed', 'investigating'],
  closed: ['investigating'],
}

const ENTRY_ICONS = {
  anomaly: AlertTriangle,
  alert: AlertTriangle,
  event: Fingerprint,
  status: ShieldCheck,
  action: ShieldCheck,
  note: MessageSquarePlus,
}

function Timeline({ entries = [] }) {
  if (!entries.length) return <EmptyState title="Timeline is empty" hint="Rebuild the timeline to pull in correlated activity." />
  return (
    <ol className="relative border-l border-line ml-3 space-y-5 py-2">
      {entries.map((entry) => {
        const Icon = ENTRY_ICONS[entry.entry_type] || Fingerprint
        return (
          <li key={entry.id} className="ml-6">
            <span className="absolute -left-3 grid h-6 w-6 place-items-center rounded-full bg-surface-sunken border border-line text-ink-secondary">
              <Icon size={12} />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-ink-muted">{titleise(entry.entry_type)}</span>
              {entry.severity && <SeverityBadge value={entry.severity} />}
              <span className="text-[11px] text-ink-muted ml-auto">{fmtDateTime(entry.occurred_at)}</span>
            </div>
            <p className="text-sm text-ink mt-1">{entry.title}</p>
            {entry.description && <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{entry.description}</p>}
          </li>
        )
      })}
    </ol>
  )
}

function CorrelatedEvents({ events = [] }) {
  if (!events.length) return <EmptyState title="No correlated activity" />
  return (
    <div className="table-wrap max-h-[420px] overflow-y-auto">
      <table className="table">
        <thead>
          <tr><th>Time</th><th>Activity</th><th>Resource / destination</th><th>Device</th><th className="text-right">Volume</th><th className="text-right">Signal</th></tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(event.event_time)}</td>
              <td className="text-ink text-xs">
                {titleise(event.activity_type)}
                <span className="ml-1.5 space-x-1 text-[10px]">
                  {event.is_external && <span className="text-sev-high">EXT</span>}
                  {event.is_removable_media && <span className="text-sev-critical">USB</span>}
                  {event.is_after_hours && <span className="text-sev-medium">AH</span>}
                  {!event.success && <span className="text-sev-critical">FAIL</span>}
                </span>
              </td>
              <td className="text-ink-secondary text-xs max-w-xs truncate">{event.resource || event.destination || '-'}</td>
              <td className="font-mono text-[11px] text-ink-muted">{event.device_id || '-'}</td>
              <td className="text-right tabular-nums text-ink-secondary text-xs">
                {event.megabytes > 0 ? `${fmtNumber(event.megabytes, 2)} MB` : '-'}
              </td>
              <td className="text-right tabular-nums text-accent text-xs">{fmtNumber(event.signal, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EscalateModal({ open, onClose, onSubmit, users }) {
  const [target, setTarget] = useState('')
  const [reason, setReason] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="panel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head"><span className="panel-title">Escalate investigation</span></div>
        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(Number(target), reason)
          }}
        >
          <div>
            <label className="label">Escalate to</label>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} required>
              <option value="">Select a recipient</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({titleise(user.role)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input min-h-[90px]" value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Escalate</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SidePanels({ data }) {
  return (
    <div className="space-y-4">
      <Panel title="Linked alerts" bodyClass="p-0">
        {data.alerts?.length ? (
          <ul className="divide-y divide-line max-h-64 overflow-y-auto">
            {data.alerts.map((alert) => (
              <li key={alert.id} className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <SeverityBadge value={alert.severity} />
                  <span className="text-[11px] text-ink-muted ml-auto">P{alert.priority}</span>
                </div>
                <p className="text-sm text-ink mt-1">{alert.title}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No linked alerts" />
        )}
      </Panel>

      <Panel title="Evidence chain" bodyClass="p-0">
        {data.evidence?.length ? (
          <ul className="divide-y divide-line max-h-72 overflow-y-auto">
            {data.evidence.map((item) => (
              <li key={item.id} className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-ink-muted" />
                  <span className="text-[11px] uppercase tracking-wider text-ink-muted">{titleise(item.evidence_type)}</span>
                  <span className="text-[11px] text-ink-muted ml-auto">{fmtDateTime(item.collected_at)}</span>
                </div>
                <p className="text-sm text-ink mt-1">{item.title}</p>
                {item.hash_value && (
                  <p className="font-mono text-[10px] text-ink-faint mt-0.5 truncate" title={item.hash_value}>
                    sha256:{item.hash_value.slice(0, 32)}...
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No evidence collected" />
        )}
      </Panel>

      <Panel title="Device analysis" bodyClass="p-0">
        {data.device_analysis?.length ? (
          <ul className="divide-y divide-line">
            {data.device_analysis.map((device) => (
              <li key={device.device_id} className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <Laptop size={13} className="text-ink-muted" />
                  <span className="font-mono text-xs text-ink">{device.device_id}</span>
                </div>
                <p className="text-[11px] text-ink-muted mt-1">
                  {fmtNumber(device.events)} events · {fmtNumber(device.megabytes, 1)} MB ·{' '}
                  {device.after_hours_events} after hours
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No device activity" />
        )}
      </Panel>
    </div>
  )
}

export default function InvestigationDetail() {
  const { id } = useParams()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [escalateOpen, setEscalateOpen] = useState(false)

  const { data, loading, error, refetch } = useApi(() => api.getIncident(id), [id])
  const { data: users } = useApi(() => api.assignableUsers(), [])

  async function act(fn, successMessage) {
    setBusy(true)
    setMessage(null)
    try {
      await fn()
      await refetch()
      setMessage(successMessage)
      return true
    } catch (err) {
      setMessage(errorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function submitNote(e) {
    e.preventDefault()
    if (!note.trim()) return
    const ok = await act(() => api.addIncidentNote(id, note.trim()), 'Note added')
    if (ok) setNote('')
  }

  if (loading) return <Loading label="Loading investigation" />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return null

  const transitions = NEXT_STATUS[data.status] || []

  return (
    <div className="space-y-5">
      <Link to="/investigations" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to investigations
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-accent">{data.reference}</span>
            <SeverityBadge value={data.severity} />
            <StatusPill value={data.status} />
            {data.escalated && (
              <span className="badge bg-sev-high text-sev-high border border-sev-high">Escalated</span>
            )}
            {data.outcome && (
              <span className="badge bg-surface-sunken text-ink-secondary border border-line">{titleise(data.outcome)}</span>
            )}
          </div>
          <h1 className="text-xl font-semibold text-ink mt-2">{data.title}</h1>
          <p className="text-sm text-ink-muted mt-1">
            <Link to={`/employees/${data.employee_id}`} className="link">{data.employee_name}</Link>
            {' · '}
            {data.department || 'Unassigned'} · opened {fmtDateTime(data.opened_at)} · risk{' '}
            {fmtNumber(data.risk_score, 1)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {transitions.map((status) => (
            <button
              key={status}
              type="button"
              className="btn-ghost text-xs"
              disabled={busy}
              onClick={() => act(() => api.updateIncident(id, { status }), `Status moved to ${titleise(status)}`)}
            >
              {titleise(status)}
            </button>
          ))}
          <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={() => setEscalateOpen(true)}>
            <ArrowUpCircle size={14} /> Escalate
          </button>
          <button
            type="button"
            className="btn-ghost text-xs"
            disabled={busy}
            onClick={() => act(() => api.rebuildTimeline(id), 'Timeline rebuilt')}
          >
            <RefreshCw size={14} /> Rebuild timeline
          </button>
        </div>
      </header>

      {message && <p className="text-sm text-accent">{message}</p>}

      {data.summary && (
        <Panel title="Summary">
          <p className="text-sm text-ink-secondary leading-relaxed">{data.summary}</p>
          {data.resolution && (
            <p className="text-sm text-ink-muted mt-3 pt-3 border-t border-line">
              <span className="text-ink-muted">Resolution: </span>
              {data.resolution}
            </p>
          )}
          {data.root_cause && (
            <p className="text-sm text-ink-muted mt-1.5">
              <span className="text-ink-muted">Root cause: </span>
              {data.root_cause}
            </p>
          )}
        </Panel>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Threat timeline" className="xl:col-span-2" bodyClass="p-5 max-h-[560px] overflow-y-auto">
          <Timeline entries={data.timeline} />
        </Panel>
        <SidePanels data={data} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Correlated activity" className="xl:col-span-2" bodyClass="p-0">
          <CorrelatedEvents events={data.correlated_events} />
        </Panel>
        <Panel title="Employee risk history">
          {data.risk_history?.length ? (
            <RiskTrendChart data={data.risk_history} dataKey="score" name="Insider risk" height={240} />
          ) : (
            <EmptyState title="No risk history" />
          )}
        </Panel>
      </div>

      <Panel title="Investigator notes">
        <div className="space-y-3">
          {data.notes?.map((item) => (
            <div key={item.id} className="rounded-lg border border-line bg-surface-sunken p-3">
              <p className="text-[11px] text-ink-muted mb-1">
                {item.author_name || 'Analyst'} · {fmtDateTime(item.created_at)}
              </p>
              <p className="text-sm text-ink leading-relaxed">{item.body}</p>
            </div>
          ))}
          {!data.notes?.length && <p className="text-sm text-ink-muted">No notes recorded yet.</p>}
          <form className="flex gap-2 pt-2" onSubmit={submitNote}>
            <input
              className="input flex-1"
              placeholder="Add an investigation note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={busy || !note.trim()}>
              <MessageSquarePlus size={15} /> Add note
            </button>
          </form>
        </div>
      </Panel>

      <EscalateModal
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        users={users || []}
        onSubmit={(escalated_to_id, reason) => {
          setEscalateOpen(false)
          act(() => api.escalateIncident(id, { escalated_to_id, reason }), 'Investigation escalated')
        }}
      />
    </div>
  )
}
