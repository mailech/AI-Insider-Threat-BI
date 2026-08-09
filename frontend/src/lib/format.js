export function formatNumber(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatCompact(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/** Backend timestamps are naive UTC; append Z so the browser localises them. */
export function parseTimestamp(value) {
  if (!value) return null
  const normalised = /[Zz]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`
  const parsed = new Date(normalised)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Rendered in UTC on purpose. The backend decides is_after_hours from the
 * stored UTC hour, so showing the viewer's local time would put a "23:40" next
 * to a badge saying it happened during business hours. Per-employee timezones
 * are a later-milestone concern; until then one clock governs both.
 */
export function formatDateTime(value) {
  const parsed = parseTimestamp(value)
  if (!parsed) return '—'
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

export function formatDate(value) {
  if (!value) return '—'
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function humanise(value) {
  if (!value) return '—'
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

export function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
