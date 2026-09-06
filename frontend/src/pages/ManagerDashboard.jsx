import React, { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Layout from '../components/Layout'
import api from '../lib/api'

export default function ManagerDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/dashboards/manager').then((r) => setData(r.data))
  }, [])

  if (!data) return <Layout><div className="text-slate-500">Loading…</div></Layout>

  const dist = data.organizational_risk_posture.distribution

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">Security Manager Dashboard</h1>
      <p className="text-slate-500 text-sm mb-6">Organizational risk posture, trends, and compliance overview.</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Employees Monitored</div>
          <div className="stat-value">{data.total_employees_monitored}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Avg Risk Score</div>
          <div className="stat-value">{data.organizational_risk_posture.average_risk_score}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Open Incidents</div>
          <div className="stat-value">{data.open_incidents}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Critical Risk Users</div>
          <div className="stat-value text-signal-red">{dist.critical}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Risk Distribution</h2>
          <div className="space-y-3">
            {Object.entries(dist).map(([level, count]) => (
              <div key={level}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="capitalize text-slate-400">{level}</span>
                  <span className="font-mono text-slate-300">{count}</span>
                </div>
                <div className="w-full h-2 bg-base-800 rounded">
                  <div
                    className={{
                      low: 'bg-signal-green',
                      medium: 'bg-signal-amber',
                      high: 'bg-orange-400',
                      critical: 'bg-signal-red',
                    }[level]}
                    style={{
                      width: `${Math.min(100, (count / Math.max(1, data.total_employees_monitored)) * 100)}%`,
                      height: '100%',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Risk Trend (30d)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.risk_trend_last_30d}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2836" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ background: '#141d2a', border: '1px solid #2a3a4d' }} />
              <Line type="monotone" dataKey="avg_score" stroke="#e8a33d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <a href="/api/reports/insider-risk/pdf" className="text-sm px-4 py-2 rounded-md bg-base-800 border border-base-600 hover:border-signal-cyan text-slate-200">
          Export PDF Report
        </a>
        <a href="/api/reports/insider-risk/excel" className="text-sm px-4 py-2 rounded-md bg-base-800 border border-base-600 hover:border-signal-cyan text-slate-200">
          Export Excel Report
        </a>
      </div>
    </Layout>
  )
}
