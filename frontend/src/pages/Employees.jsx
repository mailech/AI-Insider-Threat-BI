import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import RiskPill from '../components/RiskPill'
import api from '../lib/api'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [risk, setRisk] = useState(null)
  const [anomalies, setAnomalies] = useState([])

  useEffect(() => {
    api.get('/employees').then((r) => setEmployees(r.data))
  }, [])

  async function selectEmployee(emp) {
    setSelected(emp)
    const [tRes, rRes, aRes] = await Promise.all([
      api.get(`/employees/${emp.id}/timeline`),
      api.get(`/risk-scores`, { params: { employee_id: emp.id } }),
      api.get(`/anomalies`, { params: { employee_id: emp.id } }),
    ])
    setTimeline(tRes.data)
    setRisk(rRes.data[0] || null)
    setAnomalies(aRes.data)
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">Employees</h1>
      <p className="text-slate-500 text-sm mb-6">Identity, profile, and per-employee investigation view.</p>

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-1 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1">
            {employees.map((e) => (
              <button
                key={e.id}
                onClick={() => selectEmployee(e)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selected?.id === e.id ? 'bg-base-700 text-slate-50' : 'hover:bg-base-800 text-slate-300'
                }`}
              >
                <div>{e.full_name}</div>
                <div className="text-xs text-slate-500 font-mono">{e.employee_code} · {e.department}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          {!selected && <div className="card text-slate-500 text-sm">Select an employee to view their profile.</div>}
          {selected && (
            <>
              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">{selected.full_name}</h2>
                    <div className="text-sm text-slate-500">{selected.designation} · {selected.department}</div>
                    <div className="text-xs text-slate-600 font-mono mt-1">Manager: {selected.manager}</div>
                  </div>
                  {risk && <RiskPill level={risk.risk_level} />}
                </div>
                {risk && (
                  <div className="grid grid-cols-5 gap-3 mt-4 text-xs">
                    <div><div className="text-slate-500">Score</div><div className="font-mono text-slate-100">{risk.score}</div></div>
                    <div><div className="text-slate-500">Behavioral</div><div className="font-mono text-slate-100">{risk.behavioral_component}</div></div>
                    <div><div className="text-slate-500">Privilege</div><div className="font-mono text-slate-100">{risk.privilege_component}</div></div>
                    <div><div className="text-slate-500">Data Access</div><div className="font-mono text-slate-100">{risk.data_access_component}</div></div>
                    <div><div className="text-slate-500">Historical</div><div className="font-mono text-slate-100">{risk.historical_component}</div></div>
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Recent Anomalies</h3>
                <div className="space-y-2">
                  {anomalies.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex justify-between text-sm border-b border-base-700 pb-2 last:border-0">
                      <span className="text-slate-300">{a.category.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-slate-500">{a.anomaly_score}</span>
                    </div>
                  ))}
                  {anomalies.length === 0 && <div className="text-sm text-slate-500">No anomalies detected yet.</div>}
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Activity Timeline</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {timeline.map((t) => (
                    <div key={t.id} className="flex justify-between text-xs border-b border-base-700 pb-2 last:border-0">
                      <span className="text-slate-300">{t.event_type}{t.resource ? ` · ${t.resource}` : ''}</span>
                      <span className="font-mono text-slate-500">{new Date(t.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
