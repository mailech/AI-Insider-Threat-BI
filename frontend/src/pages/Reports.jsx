import { useState } from 'react'
import { FileSpreadsheet, FileText, RefreshCw } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/client'
import { EmptyState, ErrorState, Loading, Panel, StatRow } from '../components/ui'
import { downloadBlob, fmtNumber, titleise } from '../utils/format'

const REPORTS = [
  { key: 'insider_threat', label: 'Insider threat', headline: ['average_risk_score', 'high_and_critical', 'anomalies_detected', 'alerts_raised'] },
  { key: 'behavioral_analytics', label: 'Behavioural analytics', headline: ['baselines', 'average_quality'] },
  { key: 'investigation', label: 'Investigation', headline: ['incidents'] },
  { key: 'compliance', label: 'Compliance', headline: ['monitoring_coverage', 'baseline_quality', 'anomaly_review_rate', 'incident_closure_rate'] },
  { key: 'risk_assessment', label: 'Risk assessment', headline: ['average_risk_score', 'employees_assessed', 'high_and_critical', 'high_risk_percentage'] },
]

// Metadata that belongs in the period line, not in a metric tile.
const HIDDEN_KEYS = new Set(['window_days', 'period_start', 'period_end', 'distribution'])

const RISK_BANDS = ['low', 'medium', 'high', 'critical']

/** Units are inferred from the key so counts never render as "187.00". */
function formatMetric(key, value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return titleise(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value !== 'number') return String(value)

  const name = key.toLowerCase()
  if (name.endsWith('_hours')) return `${fmtNumber(value, 1)} h`
  if (name.includes('percentage') || name.endsWith('_rate') || name.includes('coverage') || name.includes('precision')) {
    return `${fmtNumber(value, 1)}%`
  }
  if (name.startsWith('weight') || name === 'weights') return `${fmtNumber(value * 100, 0)}%`
  return Number.isInteger(value) ? fmtNumber(value, 0) : fmtNumber(value, 2)
}

function metricLabel(key) {
  return titleise(key)
    .replace(/\bMttd\b/, 'MTTD')
    .replace(/\bMtti\b/, 'MTTI')
    .replace(/\bMttr\b/, 'MTTR')
}

/** Risk bands as one stacked bar rather than four identical tiles. */
function DistributionBar({ data = {} }) {
  const total = RISK_BANDS.reduce((sum, band) => sum + (Number(data[band]) || 0), 0)
  if (!total) return null
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
        {RISK_BANDS.map((band) => {
          const value = Number(data[band]) || 0
          if (!value) return null
          return (
            <div
              key={band}
              style={{ width: `${(value / total) * 100}%`, background: `var(--sev-${band})` }}
              title={`${titleise(band)}: ${value}`}
            />
          )
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {RISK_BANDS.map((band) => (
          <span key={band} className="sev">
            <span className="sev-dot" style={{ background: `var(--sev-${band})` }} />
            {titleise(band)}
            <span className="ml-0.5 font-semibold tabular-nums text-ink">{fmtNumber(data[band] || 0)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Label/value rows in columns - denser and calmer than a grid of boxes. */
function DetailList({ entries }) {
  if (!entries.length) return null
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-4 py-2 hairline-b">
          <dt className="text-[13px] text-ink-secondary">{metricLabel(key)}</dt>
          <dd className="shrink-0 text-[13px] font-medium tabular-nums text-ink">{formatMetric(key, value)}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Split a report summary into headline figures, grouped detail sections and the
 * risk distribution, dropping metadata and anything already shown higher up.
 */
function buildSummary(summary = {}, headlineKeys = []) {
  const seen = new Set()
  const scalar = (entries) =>
    entries.filter(([key, value]) => {
      if (HIDDEN_KEYS.has(key) || value === null || typeof value === 'object') return false
      const label = metricLabel(key)
      if (seen.has(label)) return false
      seen.add(label)
      return true
    })

  const top = Object.entries(summary)
  const headline = headlineKeys
    .filter((key) => key in summary && typeof summary[key] !== 'object')
    .map((key) => {
      seen.add(metricLabel(key))
      return { label: metricLabel(key), value: formatMetric(key, summary[key]) }
    })

  const primary = scalar(top)
  const sections = []
  for (const [key, value] of top) {
    if (!value || typeof value !== 'object' || Array.isArray(key)) continue
    if (key === 'distribution') continue
    const entries = scalar(Object.entries(value))
    if (entries.length) sections.push({ title: metricLabel(key), entries })
  }

  return { headline, primary, sections, distribution: summary.distribution }
}

function ReportTable({ title, rows }) {
  if (!rows?.length) {
    return (
      <Panel title={title} bodyClass="p-0">
        <EmptyState title="No records in this period" />
      </Panel>
    )
  }
  const headers = Object.keys(rows[0])
  const numeric = new Set(headers.filter((h) => rows.every((r) => typeof r[h] === 'number')))
  return (
    <Panel title={`${title} · ${fmtNumber(rows.length)}`} bodyClass="p-0">
      <div className="table-wrap max-h-[440px] overflow-y-auto">
        <table className="table">
          <thead className="sticky top-0 z-10" style={{ background: 'var(--surface)' }}>
            <tr>
              {headers.map((header) => (
                <th key={header} className={numeric.has(header) ? 'text-right' : undefined}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((row, index) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td
                    key={header}
                    className={
                      numeric.has(header)
                        ? 'whitespace-nowrap text-right tabular-nums text-ink'
                        : 'max-w-xs truncate'
                    }
                  >
                    {typeof row[header] === 'number'
                      ? fmtNumber(row[header], Number.isInteger(row[header]) ? 0 : 2)
                      : String(row[header] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 200 && (
        <p className="px-4 py-2.5 text-2xs text-ink-muted hairline-t">
          Showing the first 200 of {fmtNumber(rows.length)} rows. Export to Excel for the full data set.
        </p>
      )}
    </Panel>
  )
}

export default function Reports() {
  const [type, setType] = useState(REPORTS[0].key)
  const [days, setDays] = useState(30)
  const [exporting, setExporting] = useState(null)
  const [message, setMessage] = useState(null)

  const { data, loading, error, refetch } = useApi(() => api.previewReport(type, { days }), [type, days])
  const active = REPORTS.find((report) => report.key === type)

  async function exportAs(format) {
    setExporting(format)
    setMessage(null)
    try {
      const response = await api.exportReport(type, { format, days })
      const extension = format === 'pdf' ? 'pdf' : 'xlsx'
      downloadBlob(response.data, `${type}_${new Date().toISOString().slice(0, 10)}.${extension}`)
      setMessage(`${format === 'pdf' ? 'PDF' : 'Excel'} export downloaded`)
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setExporting(null)
    }
  }

  const summary = data ? buildSummary(data.summary, active?.headline || []) : null

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Reports and export</h1>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          Insider threat, behavioural, investigation, compliance and risk assessment reporting.
        </p>
      </header>

      {/* Report choice, window and export sit together in one control bar. */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 hairline-b pb-px">
        {REPORTS.map((report) => (
          <button
            key={report.key}
            type="button"
            onClick={() => setType(report.key)}
            className={
              type === report.key
                ? 'border-b-2 border-accent px-3 py-2 text-[13px] font-medium text-ink'
                : 'border-b-2 border-transparent px-3 py-2 text-[13px] text-ink-muted transition-colors hover:text-ink'
            }
          >
            {report.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <select className="input w-auto py-1.5 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 30, 90, 180, 365].map((d) => (
              <option key={d} value={d}>Last {d} days</option>
            ))}
          </select>
          <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => exportAs('pdf')} disabled={Boolean(exporting)}>
            <FileText size={14} /> {exporting === 'pdf' ? 'Generating' : 'PDF'}
          </button>
          <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => exportAs('excel')} disabled={Boolean(exporting)}>
            <FileSpreadsheet size={14} /> {exporting === 'excel' ? 'Generating' : 'Excel'}
          </button>
          <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs" onClick={refetch}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <p className="text-[13px] text-accent">{message}</p>}
      {loading && <Loading label="Building report" />}
      {error && !loading && <ErrorState message={error} onRetry={refetch} />}

      {data && !loading && !error && (
        <>
          <p className="text-2xs text-ink-muted">
            {data.meta?.period_start} to {data.meta?.period_end} · {data.meta?.window_days} days · generated{' '}
            {String(data.meta?.generated_at || '').slice(0, 16).replace('T', ' ')} UTC
          </p>

          {summary.headline.length > 0 && <StatRow items={summary.headline} />}

          <div className="grid items-start gap-4 xl:grid-cols-3">
            <Panel title="Summary" className={summary.distribution ? 'xl:col-span-2' : 'xl:col-span-3'}>
              <DetailList entries={summary.primary} />
              {summary.sections.map((section) => (
                <div key={section.title} className="mt-5">
                  <p className="eyebrow mb-1">{section.title}</p>
                  <DetailList entries={section.entries} />
                </div>
              ))}
              {!summary.primary.length && !summary.sections.length && (
                <p className="text-[13px] text-ink-muted">No summary metrics for this period.</p>
              )}
            </Panel>

            {summary.distribution && (
              <Panel title="Risk distribution">
                <DistributionBar data={summary.distribution} />
              </Panel>
            )}
          </div>

          {Object.entries(data.tables || {}).map(([title, rows]) => (
            <ReportTable key={title} title={title} rows={rows} />
          ))}
        </>
      )}
    </div>
  )
}
