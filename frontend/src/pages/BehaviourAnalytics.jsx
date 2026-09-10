import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Gauge, Play, RefreshCw, Sparkles } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { RiskDistributionDonut } from '../components/charts'
import { EmptyState, ErrorState, KpiCard, Loading, Pagination, Panel } from '../components/ui'
import { fmtDateTime, fmtNumber, formatMetric, metricLabel } from '../utils/format'

function BaselineTable({ state, onPage }) {
  if (state.loading) return <Loading label="Loading baselines" />
  if (state.error) return <ErrorState message={state.error} onRetry={state.refetch} />
  if (!state.data?.items?.length) {
    return (
      <EmptyState
        title="No baselines built yet"
        hint="Ingest at least 25 activity events per employee, then rebuild baselines."
      />
    )
  }
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th className="text-right">Events</th>
              <th className="text-right">Days</th>
              <th className="text-right">Login hour</th>
              <th className="text-right">Daily events</th>
              <th className="text-right">Downloads MB</th>
              <th className="text-right">After hours</th>
              <th className="text-right">Quality</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {state.data.items.map((baseline) => (
              <tr key={baseline.id}>
                <td>
                  <Link to={`/employees/${baseline.employee_id}`} className="link text-sm">
                    Employee #{baseline.employee_id}
                  </Link>
                </td>
                <td className="text-right tabular-nums text-ink-secondary">{fmtNumber(baseline.events_analysed)}</td>
                <td className="text-right tabular-nums text-ink-muted">{baseline.days_observed}</td>
                <td className="text-right tabular-nums text-ink-secondary">{fmtNumber(baseline.mean_login_hour, 1)}</td>
                <td className="text-right tabular-nums text-ink-secondary">{fmtNumber(baseline.mean_daily_events, 1)}</td>
                <td className="text-right tabular-nums text-ink-secondary">{fmtNumber(baseline.mean_daily_downloads, 1)}</td>
                <td className="text-right tabular-nums text-ink-muted">
                  {fmtNumber(baseline.after_hours_ratio * 100, 1)}%
                </td>
                <td className="text-right tabular-nums">
                  <span
                    className={
                      baseline.quality_score >= 70
                        ? 'text-sev-low'
                        : baseline.quality_score >= 45
                          ? 'text-sev-medium'
                          : 'text-sev-high'
                    }
                  >
                    {fmtNumber(baseline.quality_score, 1)}
                  </span>
                </td>
                <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(baseline.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={state.data.page}
        pages={state.data.pages}
        total={state.data.total}
        onChange={onPage}
      />
    </>
  )
}

export default function BehaviourAnalytics() {
  const { isSoc } = useAuth()
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const baselines = useApi(() => api.listBaselines({ page, size: 25 }), [page])
  const distribution = useApi(() => api.riskDistribution(), [])
  const organisation = useApi(() => api.organisationalRisk(), [])
  const metrics = useApi(() => api.securityMetrics({ days: 30 }), [])

  async function buildBaselines() {
    setBusy(true)
    setMessage('Rebuilding behavioural baselines and peer groups...')
    try {
      const { data } = await api.buildBaselines({ lookback_days: 90, rebuild_all: true })
      setMessage(
        `Built ${data.baselines_built} baselines (${data.employees_skipped} skipped for insufficient history), ` +
          `${data.peer_groups_updated} peer groups updated.`,
      )
      baselines.refetch()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function runDetection() {
    setBusy(true)
    setMessage('Running detection and risk scoring...')
    try {
      const { data } = await api.runDetection({ lookback_days: 30, create_alerts: true })
      setMessage(
        `${data.anomalies_detected} anomalies detected across ${data.employees_analysed} employees ` +
          `(${data.events_analysed} events), ${data.alerts_created} alerts raised in ${data.duration_ms} ms.`,
      )
      distribution.refetch()
      organisation.refetch()
      metrics.refetch()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const posture = organisation.data

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Behaviour Analytics</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Behavioural baselines, detection quality and organisational risk posture.
          </p>
        </div>
        <div className="flex gap-2">
          {isSoc && (
            <>
              <button type="button" className="btn-ghost" onClick={buildBaselines} disabled={busy}>
                <Sparkles size={15} /> Rebuild baselines
              </button>
              <button type="button" className="btn-primary" onClick={runDetection} disabled={busy}>
                <Play size={15} /> Run detection
              </button>
            </>
          )}
          <button type="button" className="btn-ghost" onClick={baselines.refetch}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {message && <p className="text-sm text-accent">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Organisational risk"
          value={posture?.average_risk_score ?? 0}
          trend={posture?.posture}
          icon={Gauge}
        />
        <KpiCard label="High and critical" value={posture?.high_and_critical ?? 0} tone="danger" />
        <KpiCard label="Employees assessed" value={posture?.employees_assessed ?? 0} />
        <KpiCard label="MTTD" value={metrics.data?.mttd_hours ?? 0} unit="hours" />
        <KpiCard label="False positive rate" value={metrics.data?.false_positive_rate ?? 0} unit="%" tone="warn" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Risk distribution">
          {distribution.loading ? <Loading /> : <RiskDistributionDonut data={distribution.data || {}} height={260} />}
        </Panel>
        <Panel title="Detection quality (30 days)" className="xl:col-span-2">
          {metrics.loading ? (
            <Loading />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(metrics.data || {}).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-line bg-surface-sunken p-3">
                  <p className="eyebrow">{metricLabel(key)}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{formatMetric(key, value)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title={`Behavioural baselines${baselines.data ? ` (${fmtNumber(baselines.data.total)})` : ''}`} bodyClass="p-0">
        <BaselineTable state={baselines} onPage={setPage} />
      </Panel>
    </div>
  )
}
