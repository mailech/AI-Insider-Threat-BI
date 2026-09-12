import clsx from 'clsx'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { fmtNumber, titleise } from '../utils/format'

const SEVERITY_VAR = {
  informational: 'var(--sev-informational)',
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  critical: 'var(--sev-critical)',
}

export function Panel({ title, actions, children, className, bodyClass }) {
  return (
    <section className={clsx('panel', className)}>
      {(title || actions) && (
        <header className="panel-head">
          <h2 className="panel-title">{title}</h2>
          {actions}
        </header>
      )}
      <div className={bodyClass ?? 'p-4'}>{children}</div>
    </section>
  )
}

/** Severity as a coloured dot plus its name - hue never carries meaning alone. */
export function SeverityBadge({ value, className }) {
  const key = String(value || 'informational').toLowerCase()
  return (
    <span className={clsx('sev', className)}>
      <span className="sev-dot" style={{ background: SEVERITY_VAR[key] || SEVERITY_VAR.informational }} />
      {titleise(key)}
    </span>
  )
}

export function RiskBadge({ category, score, className }) {
  const key = String(category || 'low').toLowerCase()
  return (
    <span className={clsx('sev', className)}>
      <span className="sev-dot" style={{ background: SEVERITY_VAR[key] || SEVERITY_VAR.low }} />
      {score !== undefined && score !== null && (
        <span className="tabular-nums font-semibold text-ink">{fmtNumber(score, 1)}</span>
      )}
      <span className="text-ink-muted">{titleise(key)}</span>
    </span>
  )
}

export function StatusPill({ value }) {
  const key = String(value || '').toLowerCase()
  const open = ['new', 'open', 'acknowledged', 'in_review', 'investigating', 'escalated'].includes(key)
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium border',
        open ? 'border-line-strong text-ink-secondary' : 'border-transparent text-ink-muted',
      )}
      style={open ? undefined : { background: 'var(--surface-sunken)' }}
    >
      {titleise(key)}
    </span>
  )
}

/**
 * A stat is a figure with a label - no icon chip, no box of its own.
 * Cards sit in one hairline-divided row so the numbers line up and read across.
 */
export function StatRow({ items = [], className }) {
  return (
    <div className={clsx('panel grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 overflow-hidden', className)}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={clsx(
            'px-4 py-3.5',
            index > 0 && 'border-l border-line',
            index >= 2 && 'border-t md:border-t-0 border-line',
            index % 2 === 0 && index > 0 && 'border-l-0 md:border-l',
          )}
        >
          <p className="eyebrow truncate">{item.label}</p>
          <p className="figure mt-1">
            {typeof item.value === 'number'
              ? fmtNumber(item.value, Number.isInteger(item.value) ? 0 : 1)
              : (item.value ?? '—')}
            {item.unit && <span className="ml-1 text-sm font-normal text-ink-muted">{item.unit}</span>}
          </p>
          {item.trend && <p className="mt-0.5 text-2xs text-ink-muted">{titleise(item.trend)}</p>}
        </div>
      ))}
    </div>
  )
}

export function Loading({ label = 'Loading', className }) {
  return (
    <div className={clsx('flex items-center justify-center gap-2 py-12 text-sm text-ink-muted', className)}>
      <Loader2 size={15} className="animate-spin" />
      {label}
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', hint, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
      <Icon size={22} className="text-ink-faint" />
      <p className="text-sm text-ink-secondary">{title}</p>
      {hint && <p className="max-w-sm text-2xs text-ink-muted">{hint}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <AlertTriangle size={22} style={{ color: 'var(--sev-high)' }} />
      <p className="max-w-md text-sm text-ink-secondary">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) {
    return <p className="px-4 py-2.5 text-2xs text-ink-muted">{fmtNumber(total)} records</p>
  }
  return (
    <div className="flex items-center justify-between px-4 py-2.5 hairline-t">
      <p className="text-2xs text-ink-muted">
        Page {page} of {pages} · {fmtNumber(total)} records
      </p>
      <div className="flex gap-1.5">
        <button type="button" className="btn btn-ghost px-2 py-1 text-2xs" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button type="button" className="btn btn-ghost px-2 py-1 text-2xs" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

export function RiskMeter({ score }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0))
  const key = value >= 80 ? 'critical' : value >= 60 ? 'high' : value >= 35 ? 'medium' : 'low'
  return (
    <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${value}%`, background: SEVERITY_VAR[key] }}
      />
    </div>
  )
}

/** Kept for pages that still render a single stat outside a row. */
export function KpiCard({ label, value, unit, trend }) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="eyebrow truncate">{label}</p>
      <p className="figure mt-1">
        {typeof value === 'number' ? fmtNumber(value, Number.isInteger(value) ? 0 : 1) : (value ?? '—')}
        {unit && <span className="ml-1 text-sm font-normal text-ink-muted">{unit}</span>}
      </p>
      {trend && <p className="mt-0.5 text-2xs text-ink-muted">{titleise(trend)}</p>}
    </div>
  )
}
