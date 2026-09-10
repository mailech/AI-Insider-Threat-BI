import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, RefreshCw, TrendingUp } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { PeerComparisonChart, RiskTrendChart } from '../components/charts'
import {
  EmptyState,
  ErrorState,
  KpiCard,
  Loading,
  Panel,
  RiskBadge,
} from '../components/ui'
import { fmtNumber, titleise } from '../utils/format'

function VerdictBadge({ verdict }) {
  const tones = {
    outlier: 'text-sev-critical bg-sev-critical border-sev-critical',
    elevated: 'text-sev-high bg-sev-high border-sev-high',
    normal: 'text-sev-low bg-sev-low border-risk-low/40',
  }
  return <span className={`badge border ${tones[verdict] || tones.normal}`}>{titleise(verdict)}</span>
}

export default function Ueba() {
  const [selected, setSelected] = useState(null)

  const predictions = useApi(() => api.uebaPredictions({ limit: 12 }), [])
  const entities = useApi(() => api.uebaEntities({ lookback_days: 30 }), [])
  const peerGroups = useApi(() => api.uebaPeerGroups(), [])
  const profile = useApi(
    () => (selected ? api.uebaProfile(selected, { lookback_days: 30 }) : Promise.resolve({ data: null })),
    [selected],
  )

  const top = predictions.data?.[0]

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">UEBA Intelligence</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            User and entity behaviour analytics, peer group comparison and threat prediction.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            predictions.refetch()
            entities.refetch()
            peerGroups.refetch()
          }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Entities profiled" value={predictions.data?.length || 0} icon={Brain} />
        <KpiCard label="Peer groups" value={peerGroups.data?.length || 0} />
        <KpiCard
          label="Highest escalation risk"
          value={top ? `${fmtNumber(top.escalation_probability * 100, 1)}%` : '-'}
          tone="danger"
          icon={TrendingUp}
        />
        <KpiCard label="Top predicted score" value={top ? top.predicted_score_7d : 0} tone="warn" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Threat prediction: 7-day escalation risk" bodyClass="p-0">
          {predictions.loading && <Loading />}
          {predictions.error && <ErrorState message={predictions.error} onRetry={predictions.refetch} />}
          {predictions.data && (
            <div className="table-wrap max-h-[520px] overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th className="text-right">Now</th>
                    <th className="text-right">Predicted</th>
                    <th className="text-right">P(escalate)</th>
                    <th>Top driver</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.data.map((row) => (
                    <tr
                      key={row.employee_id}
                      className="cursor-pointer"
                      onClick={() => setSelected(row.employee_id)}
                    >
                      <td>
                        <p className="text-ink text-sm">{row.employee_name}</p>
                        <p className="text-[11px] text-ink-muted">{row.department || 'Unassigned'}</p>
                      </td>
                      <td className="text-right tabular-nums text-ink-secondary">{fmtNumber(row.current_score, 1)}</td>
                      <td className="text-right tabular-nums text-ink">{fmtNumber(row.predicted_score_7d, 1)}</td>
                      <td className="text-right tabular-nums">
                        <span className={row.escalation_probability > 0.6 ? 'text-sev-critical' : 'text-ink-secondary'}>
                          {fmtNumber(row.escalation_probability * 100, 1)}%
                        </span>
                      </td>
                      <td className="text-ink-muted text-xs max-w-[220px] truncate">{row.drivers?.[0] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Entity behaviour analytics">
          {entities.loading && <Loading />}
          {entities.data && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Top devices', entities.data.devices],
                ['Top applications', entities.data.applications],
                ['Top resources', entities.data.resources],
                ['Top destinations', entities.data.destinations],
              ].map(([title, rows]) => (
                <div key={title}>
                  <p className="label">{title}</p>
                  <ul className="space-y-1.5">
                    {(rows || []).slice(0, 6).map((row) => (
                      <li key={row.entity} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-ink-secondary truncate">{row.entity}</span>
                        <span className="text-ink-muted tabular-nums shrink-0">
                          {fmtNumber(row.events)} · {fmtNumber(row.megabytes, 1)} MB
                        </span>
                      </li>
                    ))}
                    {!rows?.length && <li className="text-xs text-ink-faint">No data</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {selected && (
        <Panel
          title="Entity profile"
          actions={
            <button type="button" className="text-xs link" onClick={() => setSelected(null)}>
              Clear selection
            </button>
          }
        >
          {profile.loading && <Loading label="Building UEBA profile" />}
          {profile.error && <ErrorState message={profile.error} onRetry={profile.refetch} />}
          {profile.data && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/employees/${profile.data.employee_id}`} className="text-base font-medium link">
                  {profile.data.employee_name}
                </Link>
                <RiskBadge category={profile.data.risk_category} score={profile.data.risk_score} />
                <span className="badge bg-surface-sunken text-ink-secondary border border-line">
                  Peer group: {profile.data.peer_group} ({profile.data.peer_group_size} members)
                </span>
                <span className="badge bg-surface-sunken text-ink-secondary border border-line">
                  Outlier score {fmtNumber(profile.data.outlier_score, 2)} sigma
                </span>
              </div>

              <div className="grid items-start gap-4 xl:grid-cols-2">
                <div>
                  <p className="label">Peer group comparison</p>
                  <PeerComparisonChart data={profile.data.comparisons} height={300} />
                </div>
                <div>
                  <p className="label">Behavioural trend</p>
                  {profile.data.behavioral_trend?.length ? (
                    <RiskTrendChart data={profile.data.behavioral_trend} dataKey="score" name="Risk score" height={300} />
                  ) : (
                    <EmptyState title="No trend data yet" />
                  )}
                </div>
              </div>

              <div className="grid items-start gap-4 xl:grid-cols-2">
                <div>
                  <p className="label">Feature verdicts</p>
                  <div className="table-wrap max-h-64 overflow-y-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Feature</th>
                          <th className="text-right">This employee</th>
                          <th className="text-right">Peer mean</th>
                          <th className="text-right">Sigma</th>
                          <th>Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.data.comparisons.map((row) => (
                          <tr key={row.feature}>
                            <td className="text-ink text-xs">{titleise(row.feature)}</td>
                            <td className="text-right tabular-nums text-ink">{fmtNumber(row.employee_value, 2)}</td>
                            <td className="text-right tabular-nums text-ink-muted">{fmtNumber(row.peer_mean, 2)}</td>
                            <td className="text-right tabular-nums text-ink-secondary">{fmtNumber(row.z_score, 2)}</td>
                            <td><VerdictBadge verdict={row.verdict} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <p className="label">Threat prediction</p>
                  <div className="rounded-lg border border-line bg-surface-sunken p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted">Current</p>
                        <p className="text-lg font-semibold text-ink tabular-nums">
                          {fmtNumber(profile.data.prediction.current_score, 1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted">Predicted 7d</p>
                        <p className="text-lg font-semibold text-sev-high tabular-nums">
                          {fmtNumber(profile.data.prediction.predicted_score_7d, 1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted">P(escalate)</p>
                        <p className="text-lg font-semibold text-sev-critical tabular-nums">
                          {fmtNumber(profile.data.prediction.escalation_probability * 100, 1)}%
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-line">
                      <p className="text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Drivers</p>
                      <ul className="space-y-1">
                        {profile.data.prediction.drivers.map((driver) => (
                          <li key={driver} className="flex gap-2 text-xs text-ink-secondary">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            {driver}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-ink-muted mt-2">
                        Model confidence {fmtNumber(profile.data.prediction.confidence * 100, 0)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}
