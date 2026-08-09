import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { apiErrorMessage } from '../api/client'
import { employeesApi } from '../api/resources'
import Badge, { EventBadge, StatusBadge } from '../components/Badge'
import Spinner from '../components/Spinner'
import { formatBytes, formatDate, formatDateTime, humanise, initials } from '../lib/format'

const PRIVILEGE_SEVERITY = { READ: 'neutral', WRITE: 'warning', ADMIN: 'critical' }

export default function EmployeeDetail() {
  const { id } = useParams()
  const [employee, setEmployee] = useState(null)
  const [activities, setActivities] = useState([])
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      employeesApi.get(id),
      employeesApi.activities(id, 50),
      employeesApi.devices(id),
    ])
      .then(([employeeData, activityData, deviceData]) => {
        if (cancelled) return
        setEmployee(employeeData)
        setActivities(activityData)
        setDevices(deviceData)
        setError('')
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Could not load this employee'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Spinner label="Loading employee" />
      </div>
    )
  }

  if (error || !employee) {
    return <p className="card text-sm text-critical">{error || 'Employee not found'}</p>
  }

  const afterHoursCount = activities.filter((event) => event.is_after_hours).length
  const transferred = activities.reduce((total, event) => total + (event.bytes_transferred || 0), 0)

  return (
    <div className="space-y-6">
      <Link to="/employees" className="text-xs text-ink-secondary hover:text-ink">
        ← Back to employees
      </Link>

      <div className="card flex flex-wrap items-start gap-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent">
          {initials(employee.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold">{employee.full_name}</h1>
            <StatusBadge status={employee.status} />
          </div>
          <p className="text-sm text-ink-secondary">
            {employee.designation} · {employee.department?.name || 'Unassigned'}
          </p>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Employee code" value={employee.employee_code} />
            <Detail label="Email" value={employee.email} />
            <Detail label="Manager" value={employee.manager?.full_name || 'None'} />
            <Detail label="Joined" value={formatDate(employee.joined_at)} />
          </dl>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card">
          <h2 className="text-sm font-semibold">Devices</h2>
          <p className="mb-3 text-xs text-ink-secondary">Associated assets</p>
          {devices.length ? (
            <ul className="space-y-2">
              {devices.map((device) => (
                <li key={device.id} className="rounded-lg border border-hairline px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{device.hostname}</span>
                    {device.is_managed ? (
                      <Badge severity="good">Managed</Badge>
                    ) : (
                      <Badge severity="warning">Unmanaged</Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted">
                    {humanise(device.device_type)} · {device.os || 'Unknown OS'}
                  </p>
                  <p className="tabular text-xs text-ink-muted">{device.mac_address || '—'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-secondary">No devices associated.</p>
          )}
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold">Access privileges</h2>
          <p className="mb-3 text-xs text-ink-secondary">Granted entitlements</p>
          {employee.privileges?.length ? (
            <ul className="space-y-2">
              {employee.privileges.map((privilege) => (
                <li
                  key={privilege.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2 text-sm"
                >
                  <span>{privilege.name}</span>
                  <Badge severity={PRIVILEGE_SEVERITY[privilege.level] || 'neutral'}>
                    {humanise(privilege.level)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-secondary">No privileges recorded.</p>
          )}
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold">Recent behaviour</h2>
          <p className="mb-3 text-xs text-ink-secondary">Across the last 50 events</p>
          <dl className="space-y-3 text-sm">
            <Detail label="Events shown" value={activities.length} />
            <Detail
              label="After-hours events"
              value={afterHoursCount}
              severity={afterHoursCount > activities.length * 0.3 ? 'warning' : undefined}
            />
            <Detail label="Data transferred" value={formatBytes(transferred)} />
          </dl>
        </section>
      </div>

      <section className="card p-0">
        <div className="border-b border-hairline px-5 py-4">
          <h2 className="text-sm font-semibold">Activity timeline</h2>
          <p className="text-xs text-ink-secondary">
            Most recent monitored events first · all times UTC
          </p>
        </div>
        {activities.length ? (
          <ol className="divide-y divide-hairline/60">
            {activities.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="tabular w-32 shrink-0 text-xs text-ink-muted">
                  {formatDateTime(event.timestamp)}
                </span>
                <EventBadge eventType={event.event_type} />
                <span className="text-xs text-ink-secondary">{humanise(event.source)}</span>
                {event.is_after_hours ? (
                  <Badge severity="warning">After hours</Badge>
                ) : null}
                {event.bytes_transferred ? (
                  <span className="tabular ml-auto text-xs text-ink-secondary">
                    {formatBytes(event.bytes_transferred)}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="p-10 text-center text-sm text-ink-secondary">
            No activity recorded for this employee.
          </p>
        )}
      </section>
    </div>
  )
}

function Detail({ label, value, severity }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={severity === 'warning' ? 'text-warning' : 'text-ink'}>{value}</dd>
    </div>
  )
}
