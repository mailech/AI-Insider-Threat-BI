import React from 'react'

export default function RiskPill({ level }) {
  const cls = {
    low: 'pill pill-low',
    medium: 'pill pill-medium',
    high: 'pill pill-high',
    critical: 'pill pill-critical',
  }[level] || 'pill'
  return <span className={cls}>{level}</span>
}
