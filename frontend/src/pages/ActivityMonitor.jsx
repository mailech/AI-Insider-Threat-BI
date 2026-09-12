import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Upload } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { CategoryBarChart, EventsTimelineChart } from '../components/charts'
import { EmptyState, ErrorState, KpiCard, Loading, Pagination, Panel } from '../components/ui'
import { fmtBytes, fmtDateTime, fmtNumber, titleise } from '../utils/format'

const ACTIVITY_TYPES = [
  'login', 'failed_login', 'file_download', 'file_upload', 'file_access', 'data_transfer',
  'email_sent', 'email_external', 'privilege_change', 'remote_access', 'usb_connect',
  'usb_file_copy', 'app_usage', 'network_connection', 'unauthorized_access', 'vpn_session',
]

function EventFlags({ event }) {
  return (
    <span className="text-[10px] space-x-1 whitespace-nowrap">
      {event.is_after_hours && <span className="text-sev-medium">AH</span>}
      {event.is_weekend && <span className="text-ink-muted">WKND</span>}
      {event.is_external && <span className="text-sev-high">EXT</span>}
      {event.is_removable_media && <span className="text-sev-critical">USB</span>}
      {!event.success && <span className="text-sev-critical">FAIL</span>}
    </span>
  )
}

export default function ActivityMonitor() {
  const { isSoc } = useAuth()
  const fileRef = useRef(null)
  const [filters, setFilters] = useState({ activity_type: '', after_hours: '', external_only: false, days: 30, page: 1 })
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const params = {
    page: filters.page,
    size: 50,
    ...(filters.activity_type ? { activity_type: filters.activity_type } : {}),
    ...(filters.after_hours !== '' ? { after_hours: filters.after_hours === 'true' } : {}),
    ...(filters.external_only ? { external_only: true } : {}),
  }
  const events = useApi(() => api.listEvents(params), [JSON.stringify(params)])
  const stats = useApi(() => api.activityStats({ days: filters.days }), [filters.days])

  const update = (patch) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 })

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(`Uploading ${file.name}...`)
    try {
      const { data } = await api.uploadLogs(file, true)
      setMessage(
        `Ingested ${data.ingested} events (${data.skipped} skipped) across ${data.employees_touched} employees. ` +
          `${data.anomalies_detected} anomalies detected, ${data.alerts_created} alerts raised.` +
          (data.errors?.length ? ` First issue: ${data.errors[0]}` : ''),
      )
      events.refetch()
      stats.refetch()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const summary = stats.data
  const timeline = (summary?.timeline || []).map((row) => ({ ...row, anomalies: 0, alerts: 0 }))

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Activity Monitor</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Login, file, email, network, USB and privileged activity across every monitored log source.
          </p>
        </div>
        <div className="flex gap-2">
          {isSoc && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
              <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload size={15} /> {uploading ? 'Ingesting' : 'Upload CSV logs'}
              </button>
            </>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              events.refetch()
              stats.refetch()
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {message && <p className="text-sm text-accent">{message}</p>}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total events" value={summary.total_events} />
          <KpiCard label="After-hours" value={summary.after_hours_events} tone="warn" />
          <KpiCard label="Weekend" value={summary.weekend_events} />
          <KpiCard label="External transfers" value={summary.external_transfers} tone="danger" />
          <KpiCard label="Data volume" value={fmtBytes(summary.total_bytes)} />
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title={`Activity volume (${filters.days} days)`} className="xl:col-span-2">
          {stats.loading ? <Loading /> : <EventsTimelineChart data={timeline} height={260} />}
        </Panel>
        <Panel title="Events by type">
          {stats.loading ? <Loading /> : <CategoryBarChart data={summary?.by_type || {}} height={260} color="#a78bfa" />}
        </Panel>
      </div>

      <Panel
        title={`Event log${events.data ? ` (${fmtNumber(events.data.total)})` : ''}`}
        bodyClass="p-0"
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              className="input py-1.5 text-xs w-auto"
              value={filters.activity_type}
              onChange={(e) => update({ activity_type: e.target.value })}
            >
              <option value="">All activity types</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>{titleise(type)}</option>
              ))}
            </select>
            <select
              className="input py-1.5 text-xs w-auto"
              value={filters.after_hours}
              onChange={(e) => update({ after_hours: e.target.value })}
            >
              <option value="">Any hours</option>
              <option value="true">After hours only</option>
              <option value="false">Working hours only</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={filters.external_only}
                onChange={(e) => update({ external_only: e.target.checked })}
              />
              External only
            </label>
            <select
              className="input py-1.5 text-xs w-auto"
              value={filters.days}
              onChange={(e) => update({ days: Number(e.target.value) })}
            >
              {[7, 30, 90].map((d) => (
                <option key={d} value={d}>Stats window: {d} days</option>
              ))}
            </select>
          </div>
        }
      >
        {events.loading && <Loading label="Loading events" />}
        {events.error && !events.loading && <ErrorState message={events.error} onRetry={events.refetch} />}
        {events.data && !events.loading && events.data.items.length === 0 && (
          <EmptyState title="No events match these filters" />
        )}
        {events.data && !events.loading && events.data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Employee</th>
                    <th>Activity</th>
                    <th>Source</th>
                    <th>Resource / destination</th>
                    <th>Device</th>
                    <th className="text-right">Volume</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {events.data.items.map((event) => (
                    <tr key={event.id}>
                      <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(event.event_time)}</td>
                      <td>
                        <Link to={`/employees/${event.employee_id}`} className="link text-xs">
                          {event.employee_name || `#${event.employee_id}`}
                        </Link>
                      </td>
                      <td className="text-ink text-xs">{titleise(event.activity_type)}</td>
                      <td className="text-ink-muted text-xs">{titleise(event.log_source)}</td>
                      <td className="text-ink-secondary text-xs max-w-xs truncate">
                        {event.resource || event.destination || '-'}
                      </td>
                      <td className="font-mono text-[11px] text-ink-muted">{event.device_id || '-'}</td>
                      <td className="text-right tabular-nums text-ink-secondary text-xs">
                        {event.bytes_transferred > 0 ? fmtBytes(event.bytes_transferred) : '-'}
                      </td>
                      <td><EventFlags event={event} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={events.data.page}
              pages={events.data.pages}
              total={events.data.total}
              onChange={(page) => update({ page })}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
