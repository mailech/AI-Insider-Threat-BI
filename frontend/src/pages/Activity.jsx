import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { apiErrorMessage } from '../api/client'
import { activitiesApi } from '../api/resources'
import { useAuth } from '../auth/AuthContext'
import Badge, { EventBadge } from '../components/Badge'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import { EVENT_TYPES, INGEST_ROLES } from '../lib/constants'
import { formatBytes, formatDateTime, humanise } from '../lib/format'

const PAGE_SIZE = 50

export default function Activity() {
  const { hasRole } = useAuth()
  const canIngest = hasRole(INGEST_ROLES)
  const fileInput = useRef(null)

  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState('')
  const [afterHours, setAfterHours] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ingestResult, setIngestResult] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    activitiesApi
      .list({
        page,
        page_size: PAGE_SIZE,
        event_type: eventType || undefined,
        after_hours: afterHours === '' ? undefined : afterHours === 'true',
        start: start || undefined,
        end: end || undefined,
      })
      .then((response) => {
        setData(response)
        setError('')
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load activity')))
      .finally(() => setLoading(false))
  }, [page, eventType, afterHours, start, end])

  useEffect(load, [load])

  async function onUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setIngestResult(null)
    try {
      const result = await activitiesApi.ingest(file)
      setIngestResult(result)
      setPage(1)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not ingest the file'))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function resetFilters() {
    setEventType('')
    setAfterHours('')
    setStart('')
    setEnd('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Activity Monitor</h1>
          <p className="text-sm text-ink-secondary">
            Logins, file access, transfers, email, USB and remote sessions · all times UTC
          </p>
        </div>
        {canIngest ? (
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={onUpload}
              className="hidden"
              id="ingest-file"
            />
            <label htmlFor="ingest-file" className="btn-primary cursor-pointer">
              {uploading ? 'Ingesting…' : 'Ingest CSV log'}
            </label>
          </div>
        ) : null}
      </div>

      {ingestResult ? (
        <div className="card space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge severity={ingestResult.rejected ? 'warning' : 'good'}>
              {ingestResult.inserted} of {ingestResult.received} rows ingested
            </Badge>
            {ingestResult.rejected ? (
              <span className="text-xs text-ink-secondary">
                {ingestResult.rejected} row(s) rejected
              </span>
            ) : null}
            <button
              type="button"
              className="ml-auto text-xs text-ink-muted hover:text-ink"
              onClick={() => setIngestResult(null)}
            >
              Dismiss
            </button>
          </div>
          {ingestResult.errors?.length ? (
            <ul className="space-y-1 text-xs text-ink-secondary">
              {ingestResult.errors.map((message) => (
                <li key={message}>• {message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-ink-secondary">Event type</span>
          <select
            className="field sm:w-48"
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All event types</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {humanise(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-secondary">Timing</span>
          <select
            className="field sm:w-40"
            value={afterHours}
            onChange={(e) => {
              setAfterHours(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Any time</option>
            <option value="true">After hours only</option>
            <option value="false">Business hours only</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-secondary">From</span>
          <input
            type="datetime-local"
            className="field sm:w-52"
            value={start}
            onChange={(e) => {
              setStart(e.target.value)
              setPage(1)
            }}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-secondary">To</span>
          <input
            type="datetime-local"
            className="field sm:w-52"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value)
              setPage(1)
            }}
          />
        </label>

        <button type="button" className="btn-ghost" onClick={resetFilters}>
          Reset
        </button>
      </div>

      {error ? <p className="card text-sm text-critical">{error}</p> : null}

      <div className="card p-0">
        <DataTable
          columns={[
            {
              key: 'timestamp',
              header: 'Timestamp',
              className: 'tabular text-ink-secondary whitespace-nowrap',
              render: (row) => formatDateTime(row.timestamp),
            },
            {
              key: 'employee_name',
              header: 'Employee',
              render: (row) => (
                <Link
                  to={`/employees/${row.employee_id}`}
                  className="hover:text-accent hover:underline"
                >
                  {row.employee_name || `#${row.employee_id}`}
                </Link>
              ),
            },
            {
              key: 'event_type',
              header: 'Event',
              render: (row) => <EventBadge eventType={row.event_type} />,
            },
            {
              key: 'source',
              header: 'Source',
              className: 'text-ink-secondary',
              render: (row) => humanise(row.source),
            },
            {
              key: 'ip_address',
              header: 'IP address',
              className: 'tabular text-ink-secondary',
              render: (row) => row.ip_address || '—',
            },
            {
              key: 'bytes_transferred',
              header: 'Volume',
              className: 'tabular text-ink-secondary',
              render: (row) => (row.bytes_transferred ? formatBytes(row.bytes_transferred) : '—'),
            },
            {
              key: 'is_after_hours',
              header: 'Timing',
              render: (row) =>
                row.is_after_hours ? <Badge severity="warning">After hours</Badge> : null,
            },
          ]}
          rows={data.items}
          loading={loading}
          emptyMessage="No events match these filters."
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      </div>

      {canIngest ? (
        <p className="text-xs text-ink-muted">
          CSV columns: employee_code, event_type, timestamp[, source, ip_address,
          bytes_transferred, details]. Malformed rows are reported without failing the batch.
        </p>
      ) : null}
    </div>
  )
}
