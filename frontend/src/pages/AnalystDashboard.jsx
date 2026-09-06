import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import RiskPill from '../components/RiskPill'
import api from '../lib/api'

export default function AnalystDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/dashboards/analyst').then((r) => setData(r.data))
  }, [])

  if (!data) return <Layout><div className="text-slate-500">Loading…</div></Layout>

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">Security Analyst Dashboard</h1>
      <p className="text-slate-500 text-sm mb-6">Threat alerts, insider risk scores, and your investigation queue.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Open Alerts</div>
          <div className="stat-value">{data.threat_alerts.length}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Investigation Queue</div>
          <div className="stat-value">{data.investigation_queue_size}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Closed Incidents</div>
          <div className="stat-value">{data.incident_summary.closed}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Recent Threat Alerts</h2>
          <div className="space-y-2">
            {data.threat_alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-base-700 pb-2 last:border-0">
                <div>
                  <div className="text-sm text-slate-200">{a.title}</div>
                  <div className="text-xs text-slate-500 font-mono">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <RiskPill level={a.severity} />
              </div>
            ))}
            {data.threat_alerts.length === 0 && (
              <div className="text-sm text-slate-500">No open alerts. Run the analytics pipeline from the Admin dashboard to generate demo alerts.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Top Insider Risk Scores</h2>
          <div className="space-y-2">
            {data.insider_risk_scores.map((r) => (
              <div key={r.employee_id} className="flex items-center justify-between border-b border-base-700 pb-2 last:border-0">
                <div className="text-sm text-slate-300 font-mono">{r.employee_id.slice(0, 8)}…</div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-100">{r.score}</span>
                  <RiskPill level={r.risk_level} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
