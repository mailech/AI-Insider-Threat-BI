export const ROLES = {
  ADMIN: 'ADMIN',
  SECURITY_MANAGER: 'SECURITY_MANAGER',
  SOC_ENGINEER: 'SOC_ENGINEER',
  SECURITY_ANALYST: 'SECURITY_ANALYST',
}

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  SECURITY_MANAGER: 'Security Manager',
  SOC_ENGINEER: 'SOC Engineer',
  SECURITY_ANALYST: 'Security Analyst',
}

// Mirrors the backend's require_roles groupings. The API is the authority --
// these only decide whether the UI bothers to show a control.
export const WRITE_ROLES = [ROLES.ADMIN, ROLES.SECURITY_MANAGER]
export const INGEST_ROLES = [ROLES.ADMIN, ROLES.SECURITY_MANAGER, ROLES.SOC_ENGINEER]
export const ADMIN_ONLY = [ROLES.ADMIN]

export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']

export const EVENT_TYPES = [
  'LOGIN',
  'LOGOUT',
  'FAILED_LOGIN',
  'FILE_DOWNLOAD',
  'FILE_UPLOAD',
  'DATA_TRANSFER',
  'EMAIL_SENT',
  'USB_CONNECT',
  'PRIVILEGE_CHANGE',
  'REMOTE_ACCESS',
]

export const DEVICE_TYPES = ['LAPTOP', 'DESKTOP', 'MOBILE', 'SERVER', 'VIRTUAL_MACHINE']

export const PRIVILEGE_LEVELS = ['READ', 'WRITE', 'ADMIN']

/** Which events warrant a second look, and how urgently. Drives the icon +
 *  label pairing on event badges so severity never rides on color alone. */
export const EVENT_SEVERITY = {
  FAILED_LOGIN: 'warning',
  USB_CONNECT: 'serious',
  DATA_TRANSFER: 'serious',
  PRIVILEGE_CHANGE: 'critical',
  FILE_DOWNLOAD: 'warning',
  FILE_UPLOAD: 'warning',
  REMOTE_ACCESS: 'warning',
}

export const SEVERITY_STYLES = {
  good: { text: 'text-good', ring: 'border-good/40', bg: 'bg-good/10', icon: '●' },
  warning: { text: 'text-warning', ring: 'border-warning/40', bg: 'bg-warning/10', icon: '▲' },
  serious: { text: 'text-serious', ring: 'border-serious/40', bg: 'bg-serious/10', icon: '◆' },
  critical: { text: 'text-critical', ring: 'border-critical/40', bg: 'bg-critical/10', icon: '■' },
  neutral: {
    text: 'text-ink-secondary',
    ring: 'border-hairline',
    bg: 'bg-raised',
    icon: '○',
  },
}

export const STATUS_SEVERITY = {
  ACTIVE: 'good',
  ON_LEAVE: 'neutral',
  SUSPENDED: 'warning',
  TERMINATED: 'critical',
}

/** Chart ink, from the validated dark palette. Single-series charts only --
 *  no categorical palette is in play, so identity never rides on hue. */
export const CHART = {
  series: '#3987e5',
  grid: '#262a32',
  axis: '#898781',
  surface: '#16181d',
  tooltipBorder: '#383835',
}
