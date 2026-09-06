import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Layout from '../components/Layout'
import api from '../lib/api'

export default function SocDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/dashboards/soc').then((r) => setData(r.data))
  }, [])

  if (!data) return <Layout><div className="text-slate-500">Loading…</div></Layout>

  const chartData = data.behavioral_anomalies_by_category.map((c) => ({
    category: c.category.replace(/_/g, ' '),
    count: c.count,
  }))

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">SOC Dashboard</h1>
      <p className="text-slate-500 text-sm mb-6">Security events, behavioral anomalies, and active investigations.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Events (7d)</div>
          <div className="stat-value">{data.security_events_last_7d}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Active Investigations</div>
          <div className="stat-value">{data.active_investigations}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Anomaly Categories</div>
          <div className="stat-value">{data.behavioral_anomalies_by_category.length}</div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Behavioral Anomalies by Category</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2836" />
            <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={{ background: '#141d2a', border: '1px solid #2a3a4d' }} />
            <Bar dataKey="count" fill="#3fb8c9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Threat Intelligence Feed — Recent Anomalies</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="pb-2">Category</th>
              <th className="pb-2">Score</th>
              <th className="pb-2">Detected</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_anomalies.map((a) => (
              <tr key={a.id} className="border-t border-base-700">
                <td className="py-2 text-slate-300">{a.category.replace(/_/g, ' ')}</td>
                <td className="py-2 font-mono text-slate-100">{a.score}</td>
                <td className="py-2 text-slate-500 font-mono">{new Date(a.detected_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
