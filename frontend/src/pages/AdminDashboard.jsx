import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../lib/api'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState('')

  function load() {
    api.get('/dashboards/admin').then((r) => setData(r.data))
  }

  useEffect(load, [])

  async function runPipeline() {
    setRunning(true)
    setLog('Running full analytics pipeline (baselines → anomaly detection → risk scoring → alerts)…')
    try {
      const res = await api.post('/pipeline/run-all')
      setLog(
        `Done. Anomalies created: ${res.data.anomalies_created}, ` +
        `Risk scores computed: ${res.data.scores_computed}, ` +
        `Alerts created: ${res.data.alerts_created}`
      )
      load()
    } catch (e) {
      setLog('Pipeline failed: ' + (e.response?.data?.detail || e.message))
    }
    setRunning(false)
  }

  if (!data) return <Layout><div className="text-slate-500">Loading…</div></Layout>

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">Admin Dashboard</h1>
      <p className="text-slate-500 text-sm mb-6">Platform analytics, system monitoring, and pipeline controls.</p>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          ['Users', data.total_users],
          ['Employees', data.total_employees],
          ['Activity Events', data.total_activity_events],
          ['Anomalies', data.total_anomalies],
          ['Alerts', data.total_alerts],
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Analytics Pipeline</h2>
        <p className="text-xs text-slate-500 mb-4">
          Refreshes behavioral baselines, runs anomaly detection (rule-based + Isolation Forest),
          recomputes insider risk scores, and generates alerts for elevated-risk employees.
        </p>
        <button
          onClick={runPipeline}
          disabled={running}
          className="text-sm px-4 py-2 rounded-md bg-signal-cyan/90 hover:bg-signal-cyan text-base-950 font-semibold disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run Full Pipeline'}
        </button>
        {log && <div className="mt-3 text-xs font-mono text-slate-400">{log}</div>}
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Users by Role</h2>
        <div className="space-y-2">
          {data.users_by_role.map((r) => (
            <div key={r.role} className="flex justify-between text-sm border-b border-base-700 pb-2 last:border-0">
              <span className="capitalize text-slate-300">{r.role.replace(/_/g, ' ')}</span>
              <span className="font-mono text-slate-100">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
