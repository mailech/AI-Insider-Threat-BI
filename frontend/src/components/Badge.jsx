import { EVENT_SEVERITY, SEVERITY_STYLES, STATUS_SEVERITY } from '../lib/constants'
import { humanise } from '../lib/format'

/** Severity is carried by an icon and a label as well as the color, so it
 *  survives colorblindness, print and forced-colors mode. */
export default function Badge({ severity = 'neutral', children }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.neutral
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${style.ring} ${style.bg} ${style.text}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {children}
    </span>
  )
}

export function EventBadge({ eventType }) {
  return (
    <Badge severity={EVENT_SEVERITY[eventType] || 'neutral'}>{humanise(eventType)}</Badge>
  )
}

export function StatusBadge({ status }) {
  return <Badge severity={STATUS_SEVERITY[status] || 'neutral'}>{humanise(status)}</Badge>
}
