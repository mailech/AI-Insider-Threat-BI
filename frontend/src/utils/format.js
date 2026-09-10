import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'

export const SEVERITY_ORDER = ['informational', 'low', 'medium', 'high', 'critical']

export const SEVERITY_COLORS = {
  informational: '#64748b',
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

export const RISK_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

export const CHART_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#facc15', '#34d399', '#fb923c', '#60a5fa', '#f87171']

export function toDate(value) {
  if (!value) return null
  try {
    return typeof value === 'string' ? parseISO(value) : new Date(value)
  } catch {
    return null
  }
}

export function fmtDateTime(value) {
  const date = toDate(value)
  return date ? format(date, 'dd MMM yyyy, HH:mm') : '-'
}

export function fmtDate(value) {
  const date = toDate(value)
  return date ? format(date, 'dd MMM yyyy') : '-'
}

export function fmtTimeAgo(value) {
  const date = toDate(value)
  if (!date) return '-'
  try {
    return `${formatDistanceToNowStrict(date)} ago`
  } catch {
    return '-'
  }
}

export function fmtBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value.toFixed(0)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value / 1024
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[index]}`
}

export function fmtNumber(value, digits = 0) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function titleise(value) {
  if (!value) return '-'
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function riskCategory(score) {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
