import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import RiskPill from '../components/RiskPill'
import api from '../lib/api'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])

  function load() {
    api.get('/alerts').then((r) => setAlerts(r.data))
  }
  useEffect(load, [])

  async function updateStatus(id, status) {
    await api.patch(`/alerts/${id}`, { status })
    load()
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">Threat Alerts</h1>
      <p className="text-slate-500 text-sm mb-6">Alert & incident management — triage, assign, and resolve.</p>

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="pb-2">Title</th>
              <th className="pb-2">Severity</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Created</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-base-700">
                <td className="py-2 text-slate-200 max-w-xs">
                  <div>{a.title}</div>
                  <div className="text-xs text-slate-500">{a.description}</div>
                </td>
                <td className="py-2"><RiskPill level={a.severity} /></td>
                <td className="py-2 text-slate-400 capitalize">{a.status.replace(/_/g, ' ')}</td>
                <td className="py-2 text-slate-500 font-mono text-xs">{new Date(a.created_at).toLocaleString()}</td>
                <td className="py-2 space-x-2">
                  {a.status === 'open' && (
                    <button onClick={() => updateStatus(a.id, 'investigating')} className="text-xs text-signal-cyan hover:underline">
                      Investigate
                    </button>
                  )}
                  {a.status !== 'resolved' && (
                    <button onClick={() => updateStatus(a.id, 'resolved')} className="text-xs text-signal-green hover:underline">
                      Resolve
                    </button>
                  )}
                  {a.status !== 'dismissed' && (
                    <button onClick={() => updateStatus(a.id, 'dismissed')} className="text-xs text-slate-500 hover:underline">
                      Dismiss
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-500">No alerts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
