import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, Search as SearchIcon, Zap } from 'lucide-react'
import { useApi, useDebounced } from '../hooks/useApi'
import * as api from '../api/endpoints'
import {
  EmptyState,
  ErrorState,
  Loading,
  Panel,
  SeverityBadge,
} from '../components/ui'
import { fmtDateTime, titleise } from '../utils/format'

const SOURCES = [
  { key: 'events', label: 'Activity' },
  { key: 'anomalies', label: 'Anomalies' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'notes', label: 'Case notes' },
]

/** Result kind carries a glyph as well as a colour, so the distinction never
 *  rests on hue alone. */
const KIND_STYLE = {
  event: { icon: '▤', tone: 'text-ink-muted' },
  anomaly: { icon: '◆', tone: 'text-sev-high' },
  alert: { icon: '▲', tone: 'text-sev-critical' },
  note: { icon: '✎', tone: 'text-ink-muted' },
}

function KindTag({ kind }) {
  const style = KIND_STYLE[kind] || KIND_STYLE.event
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${style.tone}`}>
      <span aria-hidden="true">{style.icon}</span>
      {titleise(kind)}
    </span>
  )
}

export default function SearchPage() {
  const [term, setTerm] = useState('')
  const [sources, setSources] = useState([])
  const query = useDebounced(term, 400)

  const results = useApi(
    () =>
      query.trim().length >= 2
        ? api.search({ q: query.trim(), sources: sources.length ? sources : undefined, limit: 40 })
        : Promise.resolve({ data: null }),
    [query, sources.join(',')],
  )

  const grouped = useMemo(() => {
    const items = results.data?.results || []
    return items.reduce((acc, item) => {
      ;(acc[item.kind] = acc[item.kind] || []).push(item)
      return acc
    }, {})
  }, [results.data])

  const toggle = (key) =>
    setSources((current) =>
      current.includes(key) ? current.filter((s) => s !== key) : [...current, key],
    )

  const backend = results.data?.backend

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-ink">Investigation Search</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          One query across activity events, anomalies, alerts and case notes.
        </p>
      </header>

      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Resource, employee, hostname, alert title…"
              aria-label="Search across all investigation sources"
              className="input w-full pl-9"
            />
          </div>
          {backend && (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted"
              title={
                backend === 'opensearch'
                  ? 'Ranked full-text search from the OpenSearch cluster'
                  : 'No search cluster configured — matching directly in PostgreSQL'
              }
            >
              {backend === 'opensearch' ? (
                <Zap aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <Database aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {backend === 'opensearch' ? 'OpenSearch' : 'PostgreSQL'}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SOURCES.map((source) => {
            const active = sources.includes(source.key)
            return (
              <button
                key={source.key}
                type="button"
                onClick={() => toggle(source.key)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-hairline text-ink-muted hover:text-ink'
                }`}
              >
                {source.label}
              </button>
            )
          })}
          {sources.length > 0 && (
            <button
              type="button"
              onClick={() => setSources([])}
              className="rounded-full px-3 py-1 text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </Panel>

      {results.error && <ErrorState message={results.error} onRetry={results.refetch} />}
      {results.loading && <Loading label="Searching" />}

      {!results.loading && query.trim().length < 2 && (
        <EmptyState
          icon={SearchIcon}
          title="Search the whole investigation surface"
          hint="Type at least two characters. Try a file name, an employee, or a hostname."
        />
      )}

      {!results.loading && query.trim().length >= 2 && results.data?.total === 0 && (
        <EmptyState
          icon={SearchIcon}
          title={`Nothing matches “${query.trim()}”`}
          hint="Check the spelling, or widen the source filters above."
        />
      )}

      {!results.loading &&
        Object.entries(grouped).map(([kind, items]) => (
          <Panel key={kind} title={`${titleise(kind)} (${items.length})`}>
            <ul className="divide-y divide-hairline">
              {items.map((item) => (
                <li key={`${kind}-${item.id}`} className="py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <KindTag kind={item.kind} />
                        {item.severity && <SeverityBadge value={item.severity} />}
                      </div>
                      <Link
                        to={item.link || '#'}
                        className="mt-1 block truncate text-sm text-ink hover:text-accent"
                      >
                        {item.title}
                      </Link>
                      {item.text && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{item.text}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-ink-muted">
                      {item.employee_name && <div>{item.employee_name}</div>}
                      {item.occurred_at && <div>{fmtDateTime(item.occurred_at)}</div>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
    </div>
  )
}
