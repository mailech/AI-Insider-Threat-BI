import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../lib/api'

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({ employee_id: '', title: '', summary: '' })
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState([])
  const [noteText, setNoteText] = useState('')

  function load() {
    api.get('/incidents').then((r) => setIncidents(r.data))
  }
  useEffect(() => {
    load()
    api.get('/employees').then((r) => setEmployees(r.data))
  }, [])

  async function createIncident(e) {
    e.preventDefault()
    if (!form.employee_id || !form.title) return
    await api.post('/incidents', form)
    setForm({ employee_id: '', title: '', summary: '' })
    load()
  }

  async function openIncident(inc) {
    setSelected(inc)
    const res = await api.get(`/incidents/${inc.id}/notes`)
    setNotes(res.data)
  }

  async function addNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    await api.post('/incidents/notes', { incident_id: selected.id, note: noteText })
    setNoteText('')
    const res = await api.get(`/incidents/${selected.id}/notes`)
    setNotes(res.data)
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">Threat Investigations</h1>
      <p className="text-slate-500 text-sm mb-6">Incident creation, evidence notes, and case tracking.</p>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">New Incident</h2>
            <form onSubmit={createIncident} className="space-y-3">
              <select
                className="w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm"
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
              <input
                placeholder="Title"
                className="w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                placeholder="Summary"
                className="w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
              <button className="w-full bg-signal-cyan/90 hover:bg-signal-cyan text-base-950 font-semibold rounded-md py-2 text-sm">
                Create Incident
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Incidents</h2>
            <div className="space-y-1">
              {incidents.map((i) => (
                <button
                  key={i.id}
                  onClick={() => openIncident(i)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    selected?.id === i.id ? 'bg-base-700 text-slate-50' : 'hover:bg-base-800 text-slate-300'
                  }`}
                >
                  <div>{i.title}</div>
                  <div className="text-xs text-slate-500 capitalize">{i.status.replace(/_/g, ' ')}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          {!selected && <div className="card text-slate-500 text-sm">Select an incident to view details.</div>}
          {selected && (
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-100">{selected.title}</h2>
              <p className="text-sm text-slate-400 mt-1">{selected.summary}</p>

              <h3 className="text-sm font-semibold text-slate-200 mt-6 mb-3">Investigation Notes</h3>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {notes.map((n) => (
                  <div key={n.id} className="border-b border-base-700 pb-2">
                    <div className="text-sm text-slate-300">{n.note}</div>
                    <div className="text-xs text-slate-600 font-mono">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {notes.length === 0 && <div className="text-sm text-slate-500">No notes yet.</div>}
              </div>

              <form onSubmit={addNote} className="flex gap-2">
                <input
                  className="flex-1 bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm"
                  placeholder="Add investigation note…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button className="px-4 py-2 rounded-md bg-base-700 text-sm text-slate-200 hover:bg-base-600">
                  Add
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
