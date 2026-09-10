import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FolderPlus, RefreshCw, ShieldAlert } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { HourlyHistogram, RiskComponentChart, RiskTrendChart } from '../components/charts'
import {
  EmptyState,
  ErrorState,
  KpiCard,
  Loading,
  Panel,
  RiskBadge,
  SeverityBadge,
  StatusPill,
} from '../components/ui'
import { fmtBytes, fmtDateTime, fmtNumber, titleise } from '../utils/format'

const TABS = ['Overview', 'Risk breakdown', 'Baseline', 'Activity', 'Anomalies']

function Overview({ employee, risk, anomalies, history }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Insider risk score" value={employee.current_risk_score} tone="danger" icon={ShieldAlert} />
        <KpiCard label="Activity events" value={employee.total_events} />
        <KpiCard label="Open anomalies" value={employee.open_anomalies} tone="warn" />
        <KpiCard label="Open incidents" value={employee.open_incidents} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Identity and access" className="xl:col-span-1">
          <dl className="space-y-2.5 text-sm">
            {[
              ['Employee code', employee.employee_code],
              ['Email', employee.email],
              ['Department', employee.department_name || '-'],
              ['Designation', employee.designation || '-'],
              ['Manager', employee.manager_name || '-'],
              ['Location', employee.location || '-'],
              ['Employment status', titleise(employee.employment_status)],
              ['Access level', titleise(employee.access_level)],
              ['Privileged', employee.is_privileged ? 'Yes' : 'No'],
              ['Watchlist', employee.on_watchlist ? 'Yes' : 'No'],
              ['Privileges', employee.privileges || '-'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-ink-muted shrink-0">{label}</dt>
                <dd className="text-ink text-right truncate">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Risk trend" className="xl:col-span-2">
          {history?.length ? (
            <RiskTrendChart data={history} dataKey="score" name="Insider risk" height={260} />
          ) : (
            <EmptyState title="No risk history yet" hint="Risk snapshots appear after detection runs." />
          )}
        </Panel>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Assigned devices" bodyClass="p-0">
          {employee.assets?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Asset tag</th><th>Type</th><th>Hostname</th><th>OS</th><th>IP</th></tr>
                </thead>
                <tbody>
                  {employee.assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="font-mono text-xs text-ink-secondary">{asset.asset_tag}</td>
                      <td className="text-ink-muted text-xs">{titleise(asset.device_type)}</td>
                      <td className="text-ink-secondary text-xs">{asset.hostname || '-'}</td>
                      <td className="text-ink-muted text-xs">{asset.os || '-'}</td>
                      <td className="font-mono text-xs text-ink-muted">{asset.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No devices associated" />
          )}
        </Panel>

        <Panel title="Recent anomalies" bodyClass="p-0">
          {anomalies?.items?.length ? (
            <ul className="divide-y divide-line max-h-80 overflow-y-auto">
              {anomalies.items.slice(0, 8).map((anomaly) => (
                <li key={anomaly.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge value={anomaly.severity} />
                    <span className="text-[11px] text-ink-muted ml-auto">{fmtDateTime(anomaly.detected_at)}</span>
                  </div>
                  <p className="text-sm text-ink">{anomaly.title}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {titleise(anomaly.category)} · {titleise(anomaly.detection_method)} · score {fmtNumber(anomaly.score, 1)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No anomalies detected" hint="This employee is behaving within their baseline." />
          )}
        </Panel>
      </div>
    </div>
  )
}

function RiskBreakdown({ risk }) {
  if (!risk) return <EmptyState title="No risk score computed yet" />
  const weighted = {
    behavioral_anomalies: risk.behavioral_anomaly_component,
    privilege_misuse: risk.privilege_misuse_component,
    data_access_violations: risk.data_access_component,
    access_pattern_deviations: risk.access_deviation_component,
    historical_security_events: risk.historical_events_component,
  }
  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Weighted risk model (raw component scores)">
          <RiskComponentChart components={risk.raw_components} weights={risk.weights} height={280} />
          <p className="text-[11px] text-ink-muted mt-3 leading-relaxed">
            Each component is normalised to 0-100, then weighted per the scoring model:
            behavioural anomalies 35%, privilege misuse 25%, data access violations 20%,
            access pattern deviations 10%, historical security events 10%.
          </p>
        </Panel>
        <Panel title="Weighted contributions">
          <div className="space-y-3">
            {Object.entries(weighted).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-secondary">{titleise(key)}</span>
                  <span className="tabular-nums text-ink">
                    {fmtNumber(value, 2)} pts
                    <span className="text-ink-muted ml-1.5 text-xs">
                      ({Math.round((risk.weights?.[key] || 0) * 100)}% weight)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, (value / 35) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-line flex items-center justify-between">
              <span className="text-sm text-ink-secondary">Total insider risk score</span>
              <RiskBadge category={risk.category} score={risk.score} />
            </div>
            <p className="text-xs text-ink-muted">
              Trend {titleise(risk.trend)} · previous {fmtNumber(risk.previous_score, 1)} ·
              window {risk.window_days} days · computed {fmtDateTime(risk.computed_at)}
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Contributing evidence" bodyClass="p-0">
        {risk.contributing_factors?.length ? (
          <div className="table-wrap max-h-96 overflow-y-auto">
            <table className="table">
              <thead>
                <tr><th>Component</th><th>Evidence</th><th>Severity</th><th className="text-right">Contribution</th></tr>
              </thead>
              <tbody>
                {risk.contributing_factors.map((factor, index) => (
                  <tr key={`${factor.anomaly_id || factor.title}-${index}`}>
                    <td className="text-ink-muted text-xs">{titleise(factor.component)}</td>
                    <td className="text-ink text-sm">{factor.title}</td>
                    <td>{factor.severity ? <SeverityBadge value={factor.severity} /> : <span className="text-ink-muted text-xs">-</span>}</td>
                    <td className="text-right tabular-nums text-ink-secondary">{fmtNumber(factor.contribution, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No contributing evidence" hint="Risk is at baseline for this employee." />
        )}
      </Panel>
    </div>
  )
}

function BaselineView({ baseline }) {
  if (!baseline) {
    return <EmptyState title="No behavioural baseline yet" hint="Baselines need at least 25 events of history. Build baselines from the Behaviour Analytics page." />
  }
  const stats = [
    ['Events analysed', fmtNumber(baseline.events_analysed)],
    ['Days observed', fmtNumber(baseline.days_observed)],
    ['Baseline quality', `${fmtNumber(baseline.quality_score, 1)} / 100`],
    ['Mean login hour', `${fmtNumber(baseline.mean_login_hour, 1)}:00`],
    ['Typical window', `${fmtNumber(baseline.typical_start_hour, 0)}:00 - ${fmtNumber(baseline.typical_end_hour, 0)}:00`],
    ['After-hours share', `${fmtNumber(baseline.after_hours_ratio * 100, 1)}%`],
    ['Weekend share', `${fmtNumber(baseline.weekend_activity_ratio * 100, 1)}%`],
    ['Daily events', fmtNumber(baseline.mean_daily_events, 1)],
    ['Daily downloads', `${fmtNumber(baseline.mean_daily_downloads, 1)} MB`],
    ['Daily uploads', `${fmtNumber(baseline.mean_daily_uploads, 1)} MB`],
    ['Daily emails', fmtNumber(baseline.mean_daily_emails, 1)],
    ['External emails/day', fmtNumber(baseline.mean_external_emails, 2)],
    ['USB events/day', fmtNumber(baseline.mean_daily_usb_events, 2)],
  ]
  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Behavioural baseline" className="xl:col-span-1">
          <dl className="space-y-2.5 text-sm">
            {stats.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Activity by hour of day" className="xl:col-span-2">
          <HourlyHistogram data={baseline.hourly_histogram} height={260} />
        </Panel>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        {[
          ['Device profile', baseline.device_profile],
          ['Application profile', baseline.application_profile],
          ['Resource profile', baseline.resource_profile],
        ].map(([title, profile]) => (
          <Panel key={title} title={title} bodyClass="p-0">
            <ul className="divide-y divide-line max-h-64 overflow-y-auto">
              {Object.entries(profile || {}).slice(0, 12).map(([key, count]) => (
                <li key={key} className="flex items-center justify-between gap-3 px-5 py-2 text-sm">
                  <span className="text-ink-secondary truncate">{key}</span>
                  <span className="tabular-nums text-ink-muted shrink-0">{count}</span>
                </li>
              ))}
              {!Object.keys(profile || {}).length && <li className="px-5 py-4 text-xs text-ink-muted">No data</li>}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function ActivityView({ events }) {
  if (!events?.length) return <EmptyState title="No recent activity" />
  return (
    <Panel title={`Activity timeline (${events.length} most recent events)`} bodyClass="p-0">
      <div className="table-wrap max-h-[600px] overflow-y-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th><th>Activity</th><th>Source</th><th>Resource / destination</th>
              <th>Device</th><th className="text-right">Volume</th><th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(event.event_time)}</td>
                <td className="text-ink text-xs">{titleise(event.activity_type)}</td>
                <td className="text-ink-muted text-xs">{titleise(event.log_source)}</td>
                <td className="text-ink-secondary text-xs max-w-xs truncate">{event.resource || event.destination || '-'}</td>
                <td className="font-mono text-[11px] text-ink-muted">{event.device_id || '-'}</td>
                <td className="text-right tabular-nums text-ink-secondary text-xs">
                  {event.bytes_transferred > 0 ? fmtBytes(event.bytes_transferred) : '-'}
                </td>
                <td className="text-[10px] space-x-1 whitespace-nowrap">
                  {event.is_after_hours && <span className="text-sev-medium">AFTER-HOURS</span>}
                  {event.is_external && <span className="text-sev-high">EXTERNAL</span>}
                  {event.is_removable_media && <span className="text-sev-critical">USB</span>}
                  {!event.success && <span className="text-sev-critical">FAILED</span>}
                  {event.sensitivity === 'restricted' && <span className="text-sev-high">RESTRICTED</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function AnomalyView({ anomalies }) {
  if (!anomalies?.items?.length) return <EmptyState title="No anomalies for this employee" />
  return (
    <Panel title={`Anomalies (${anomalies.total})`} bodyClass="p-0">
      <div className="table-wrap max-h-[600px] overflow-y-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Detected</th><th>Category</th><th>Method</th><th>Severity</th>
              <th className="text-right">Score</th><th className="text-right">Sigma</th><th>Description</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.items.map((anomaly) => (
              <tr key={anomaly.id}>
                <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(anomaly.detected_at)}</td>
                <td className="text-ink-secondary text-xs">{titleise(anomaly.category)}</td>
                <td className="text-ink-muted text-xs">{titleise(anomaly.detection_method)}</td>
                <td><SeverityBadge value={anomaly.severity} /></td>
                <td className="text-right tabular-nums text-ink">{fmtNumber(anomaly.score, 1)}</td>
                <td className="text-right tabular-nums text-ink-muted">{fmtNumber(anomaly.deviation_sigma, 2)}</td>
                <td className="text-ink-muted text-xs max-w-md truncate">{anomaly.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(TABS[0])
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const employee = useApi(() => api.getEmployee(id), [id])
  const risk = useApi(() => api.employeeRisk(id), [id])
  const history = useApi(() => api.riskHistory(id, { days: 90 }), [id])
  const baseline = useApi(() => api.getBaseline(id), [id])
  const events = useApi(() => api.employeeTimeline(id, { days: 30, limit: 250 }), [id])
  const anomalies = useApi(() => api.listAnomalies({ employee_id: id, days: 90, size: 100 }), [id])

  async function recompute() {
    setBusy(true)
    try {
      await api.employeeRisk(id, { recompute: true })
      await Promise.all([risk.refetch(), employee.refetch(), history.refetch()])
      setMessage('Risk score recomputed')
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function openInvestigation() {
    setBusy(true)
    try {
      const topAnomalies = (anomalies.data?.items || []).slice(0, 8).map((a) => a.id)
      const { data: incident } = await api.createIncident({
        employee_id: Number(id),
        title: `Investigation: ${employee.data?.full_name}`,
        summary: `Manual investigation opened from the employee profile. Current insider risk ${fmtNumber(employee.data?.current_risk_score, 1)}.`,
        severity: employee.data?.current_risk_category === 'critical' ? 'critical' : 'high',
        anomaly_ids: topAnomalies,
        auto_build_timeline: true,
      })
      navigate(`/investigations/${incident.id}`)
    } catch (err) {
      setMessage(errorMessage(err))
      setBusy(false)
    }
  }

  if (employee.loading) return <Loading label="Loading employee profile" />
  if (employee.error) return <ErrorState message={employee.error} onRetry={employee.refetch} />
  if (!employee.data) return null

  const person = employee.data

  return (
    <div className="space-y-5">
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to employees
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface-sunken text-sm font-semibold text-ink">
            {person.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </span>
          <div>
            <h1 className="text-xl font-semibold text-ink">{person.full_name}</h1>
            <p className="text-sm text-ink-muted">
              {person.employee_code} · {person.department_name || 'Unassigned'} · {person.designation || '-'}
            </p>
          </div>
          <RiskBadge category={person.current_risk_category} score={person.current_risk_score} className="ml-2" />
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={recompute} disabled={busy}>
            <RefreshCw size={15} /> Recompute risk
          </button>
          <button type="button" className="btn-primary" onClick={openInvestigation} disabled={busy}>
            <FolderPlus size={15} /> Open investigation
          </button>
        </div>
      </header>

      {message && <p className="text-sm text-accent">{message}</p>}

      <nav className="flex gap-1 border-b border-line overflow-x-auto">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={
              tab === name
                ? 'px-4 py-2.5 text-sm font-medium text-accent border-b-2 border-accent whitespace-nowrap'
                : 'px-4 py-2.5 text-sm text-ink-muted hover:text-ink border-b-2 border-transparent whitespace-nowrap'
            }
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <Overview employee={person} risk={risk.data} anomalies={anomalies.data} history={history.data} />
      )}
      {tab === 'Risk breakdown' && (risk.loading ? <Loading /> : <RiskBreakdown risk={risk.data} />)}
      {tab === 'Baseline' && (baseline.loading ? <Loading /> : <BaselineView baseline={baseline.data} />)}
      {tab === 'Activity' && (events.loading ? <Loading /> : <ActivityView events={events.data} />)}
      {tab === 'Anomalies' && (anomalies.loading ? <Loading /> : <AnomalyView anomalies={anomalies.data} />)}
    </div>
  )
}
