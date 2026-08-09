/** A stat tile, not a chart: a single headline number needs no plot. */
export default function StatCard({ label, value, hint, severity }) {
  const accent =
    severity === 'critical'
      ? 'text-critical'
      : severity === 'warning'
        ? 'text-warning'
        : severity === 'serious'
          ? 'text-serious'
          : 'text-ink'

  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-secondary">{hint}</p> : null}
    </div>
  )
}
