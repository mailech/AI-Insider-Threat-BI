import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { apiErrorMessage } from '../api/client'
import { dashboardApi } from '../api/resources'
import { EventBadge } from '../components/Badge'
import { EventsByTypeChart, EventsOverTimeChart } from '../components/charts'
import DataTable from '../components/DataTable'
import Spinner from '../components/Spinner'
import StatCard from '../components/StatCard'
import { formatBytes, formatDateTime, formatNumber } from '../lib/format'

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
]

export default function Dashboard() {
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    dashboardApi
      .summary(days)
      .then((data) => {
        if (!cancelled) {
          setSummary(data)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Could not load the dashboard'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  if (loading && !summary) {
    return (
      <div className="flex justify-center p-16">
        <Spinner label="Loading dashboard" />
      </div>
    )
  }

  if (error && !summary) {
    return <p className="card text-sm text-critical">{error}</p>
  }

  // after_hours_events is scoped to the selected window, so the share has to be
  // taken against the window's own total rather than the all-time count.
  const windowEvents = summary.events_over_time.reduce((total, bucket) => total + bucket.count, 0)
  const afterHoursShare = windowEvents
    ? Math.round((summary.after_hours_events / windowEvents) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Security Analyst Dashboard</h1>
          <p className="text-sm text-ink-secondary">
            Monitored activity across the organisation
          </p>
        </div>
        {/* Filters sit in one row above the charts. */}
        <div className="flex gap-1 rounded-lg border border-hairline bg-surface p-1">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => setDays(range.days)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                days === range.days
                  ? 'bg-accent/15 text-accent'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monitored employees"
          value={formatNumber(summary.total_employees)}
          hint={`${formatNumber(summary.active_employees)} currently active`}
        />
        <StatCard
          label="Events in last 24h"
          value={formatNumber(summary.events_last_24h)}
          hint={`${formatNumber(summary.total_events)} recorded in total`}
        />
        <StatCard
          label="After-hours activity"
          value={formatNumber(summary.after_hours_events)}
          hint={`${afterHoursShare}% of events in this window`}
          severity={afterHoursShare > 25 ? 'warning' : undefined}
        />
        <StatCard
          label="Data transferred"
          value={formatBytes(summary.total_bytes_transferred)}
          hint="Downloads, uploads and transfers"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <h2 className="text-sm font-semibold">Monitored events per day</h2>
          <p className="mb-4 text-xs text-ink-secondary">
            All event types combined, last {days} days
          </p>
          <EventsOverTimeChart data={summary.events_over_time} />
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold">Events by type</h2>
          <p className="mb-4 text-xs text-ink-secondary">Volume per monitored activity</p>
          <EventsByTypeChart data={summary.events_by_type} />
        </section>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Most active employees</h2>
              <p className="text-xs text-ink-secondary">By event volume in this window</p>
            </div>
            <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs text-warning">
              <span aria-hidden="true">▲ </span>
              {formatNumber(summary.failed_logins)} failed logins
            </span>
          </div>
          <ol className="space-y-2">
            {summary.top_active_employees.map((employee, index) => (
              <li key={employee.employee_id}>
                <Link
                  to={`/employees/${employee.employee_id}`}
                  className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm hover:bg-raised"
                >
                  <span className="min-w-0">
                    <span className="tabular mr-2 text-xs text-ink-muted">{index + 1}</span>
                    {employee.full_name}
                    <span className="ml-2 text-xs text-ink-muted">
                      {employee.department || 'Unassigned'}
                    </span>
                  </span>
                  <span className="tabular text-xs text-ink-secondary">
                    {formatNumber(employee.count)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-0">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <p className="text-xs text-ink-secondary">Latest monitored events</p>
            </div>
            <Link to="/activity" className="text-xs text-accent hover:underline">
              Open activity monitor →
            </Link>
          </div>
          <DataTable
            columns={[
              {
                key: 'employee_name',
                header: 'Employee',
                render: (row) => row.employee_name || `#${row.employee_id}`,
              },
              {
                key: 'event_type',
                header: 'Event',
                render: (row) => <EventBadge eventType={row.event_type} />,
              },
              {
                key: 'timestamp',
                header: 'When',
                className: 'tabular text-ink-secondary',
                render: (row) => formatDateTime(row.timestamp),
              },
            ]}
            rows={summary.recent_events}
            emptyMessage="No activity has been recorded yet."
          />
        </section>
      </div>

      {/* The table view keeps the charts readable without color. */}
      <section className="card">
        <button
          type="button"
          className="text-xs text-ink-secondary hover:text-ink"
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? 'Hide' : 'Show'} chart data as a table
        </button>
        {showTable ? (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-ink-muted">
                Events per day
              </h3>
              <DataTable
                columns={[
                  { key: 'date', header: 'Date', className: 'tabular' },
                  {
                    key: 'count',
                    header: 'Events',
                    className: 'tabular',
                    render: (row) => formatNumber(row.count),
                  },
                ]}
                rows={summary.events_over_time}
                rowKey={(row) => row.date}
              />
            </div>
            <div>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-ink-muted">
                Events by type
              </h3>
              <DataTable
                columns={[
                  { key: 'event_type', header: 'Event type' },
                  {
                    key: 'count',
                    header: 'Events',
                    className: 'tabular',
                    render: (row) => formatNumber(row.count),
                  },
                ]}
                rows={summary.events_by_type}
                rowKey={(row) => row.event_type}
              />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
