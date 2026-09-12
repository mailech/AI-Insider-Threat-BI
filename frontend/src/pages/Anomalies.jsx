import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, RefreshCw, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  EmptyState,
  ErrorState,
  Loading,
  Pagination,
  Panel,
  SeverityBadge,
} from '../components/ui'
import { fmtDateTime, fmtNumber, titleise } from '../utils/format'

const CATEGORIES = [
  'unusual_login_time',
  'abnormal_data_download',
  'unauthorized_access_attempt',
  'excessive_file_transfer',
  'suspicious_device_usage',
  'data_exfiltration',
  'privilege_abuse',
  'access_pattern_deviation',
  'behavioral_deviation',
  'peer_group_outlier',
]
const METHODS = ['rule', 'statistical_zscore', 'isolation_forest', 'peer_group']

function DetailDrawer({ anomaly, onClose, onReview, busy }) {
  if (!anomaly) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg h-full overflow-y-auto bg-surface border-l border-line" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head sticky top-0 bg-surface z-10">
          <span className="panel-title">Anomaly #{anomaly.id}</span>
          <button type="button" className="text-ink-muted hover:text-ink" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge value={anomaly.severity} />
            <span className="badge bg-surface-sunken text-ink-secondary border border-line">{titleise(anomaly.category)}</span>
            <span className="badge bg-surface-sunken text-ink-secondary border border-line">{titleise(anomaly.detection_method)}</span>
          </div>
          <div>
            <h3 className="text-base font-medium text-ink">{anomaly.title}</h3>
            <p className="text-sm text-ink-secondary mt-2 leading-relaxed">{anomaly.description}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Employee', anomaly.employee_name],
              ['Department', anomaly.department || '-'],
              ['Anomaly score', fmtNumber(anomaly.score, 1)],
              ['Confidence', `${fmtNumber((anomaly.confidence || 0) * 100, 0)}%`],
              ['Deviation', `${fmtNumber(anomaly.deviation_sigma, 2)} sigma`],
              ['Observed', anomaly.observed_value != null ? fmtNumber(anomaly.observed_value, 2) : '-'],
              ['Baseline', anomaly.baseline_value != null ? fmtNumber(anomaly.baseline_value, 2) : '-'],
              ['Occurred', fmtDateTime(anomaly.occurred_at)],
              ['Detected', fmtDateTime(anomaly.detected_at)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-surface-sunken p-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</dt>
                <dd className="text-ink mt-0.5 truncate">{value}</dd>
              </div>
            ))}
          </dl>
          {anomaly.features && Object.keys(anomaly.features).length > 0 && (
            <div>
              <p className="label">Contributing features</p>
              <pre className="rounded-lg bg-surface-sunken border border-line p-3 text-[11px] text-ink-secondary overflow-x-auto">
                {JSON.stringify(anomaly.features, null, 2)}
              </pre>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-line">
            <button type="button" className="btn-ghost flex-1" disabled={busy} onClick={() => onReview(anomaly, false)}>
              <ThumbsUp size={14} /> Confirm as true positive
            </button>
            <button type="button" className="btn-ghost flex-1" disabled={busy} onClick={() => onReview(anomaly, true)}>
              <ThumbsDown size={14} /> Mark false positive
            </button>
          </div>
          <Link to={`/employees/${anomaly.employee_id}`} className="link text-sm block">
            View employee profile
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Anomalies() {
  const { isSoc } = useAuth()
  const [filters, setFilters] = useState({ category: '', severity: '', method: '', days: 30, page: 1 })
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const params = {
    page: filters.page,
    size: 25,
    days: filters.days,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.method ? { method: filters.method } : {}),
  }
  const { data, loading, error, refetch } = useApi(() => api.listAnomalies(params), [JSON.stringify(params)])

  const update = (patch) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 })

  async function review(anomaly, isFalsePositive) {
    setBusy(true)
    try {
      await api.reviewAnomaly(anomaly.id, isFalsePositive)
      setMessage(`Anomaly #${anomaly.id} marked as ${isFalsePositive ? 'false positive' : 'true positive'}`)
      setSelected(null)
      refetch()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function runDetection() {
    setBusy(true)
    setMessage('Running detection across all monitored employees...')
    try {
      const { data: result } = await api.runDetection({ lookback_days: 30, create_alerts: true })
      setMessage(
        `Detection complete: ${result.anomalies_detected} anomalies, ${result.alerts_created} alerts, ` +
          `${result.risk_scores_updated} risk scores updated in ${result.duration_ms} ms`,
      )
      refetch()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Behavioural Anomalies</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Rule, statistical, Isolation Forest and peer-group detections.
          </p>
        </div>
        <div className="flex gap-2">
          {isSoc && (
            <button type="button" className="btn-primary" onClick={runDetection} disabled={busy}>
              <Play size={15} /> Run detection
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={refetch}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {message && <p className="text-sm text-accent">{message}</p>}

      <Panel
        title={`Anomalies${data ? ` (${fmtNumber(data.total)})` : ''}`}
        bodyClass="p-0"
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="input py-1.5 text-xs w-auto" value={filters.category} onChange={(e) => update({ category: e.target.value })}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{titleise(c)}</option>
              ))}
            </select>
            <select className="input py-1.5 text-xs w-auto" value={filters.method} onChange={(e) => update({ method: e.target.value })}>
              <option value="">All methods</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>{titleise(m)}</option>
              ))}
            </select>
            <select className="input py-1.5 text-xs w-auto" value={filters.severity} onChange={(e) => update({ severity: e.target.value })}>
              <option value="">All severities</option>
              {['critical', 'high', 'medium', 'low', 'informational'].map((s) => (
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
        {loading && <Loading label="Loading anomalies" />}
        {error && !loading && <ErrorState message={error} onRetry={refetch} />}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState title="No anomalies match these filters" hint="Try a wider window or run detection." />
        )}
        {data && !loading && !error && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Detected</th>
                    <th>Employee</th>
                    <th>Category</th>
                    <th>Method</th>
                    <th>Severity</th>
                    <th className="text-right">Score</th>
                    <th className="text-right">Sigma</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((anomaly) => (
                    <tr key={anomaly.id} className="cursor-pointer" onClick={() => setSelected(anomaly)}>
                      <td className="text-ink-muted text-xs whitespace-nowrap">{fmtDateTime(anomaly.detected_at)}</td>
                      <td>
                        <p className="text-ink text-sm">{anomaly.employee_name}</p>
                        <p className="text-[11px] text-ink-muted">{anomaly.employee_code}</p>
                      </td>
                      <td className="text-ink-secondary text-xs">{titleise(anomaly.category)}</td>
                      <td className="text-ink-muted text-xs">{titleise(anomaly.detection_method)}</td>
                      <td><SeverityBadge value={anomaly.severity} /></td>
                      <td className="text-right tabular-nums text-ink">{fmtNumber(anomaly.score, 1)}</td>
                      <td className="text-right tabular-nums text-ink-muted">{fmtNumber(anomaly.deviation_sigma, 2)}</td>
                      <td className="text-xs">
                        {anomaly.is_false_positive ? (
                          <span className="text-ink-muted">False positive</span>
                        ) : anomaly.reviewed ? (
                          <span className="text-sev-low">Confirmed</span>
                        ) : (
                          <span className="text-sev-medium">Unreviewed</span>
                        )}
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

      <DetailDrawer anomaly={selected} onClose={() => setSelected(null)} onReview={review} busy={busy} />
    </div>
  )
}
