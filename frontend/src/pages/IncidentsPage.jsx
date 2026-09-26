import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileSearch,
  Search,
  Plus,
  RefreshCw,
  FolderLock,
  ArrowRight,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export const IncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    user_id: searchParams.get('user_id') || '',
    severity: 'HIGH',
    description: '',
    evidence_references: ''
  });
  const navigate = useNavigate();

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.getIncidents();
      setIncidents(res.data);
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: newIncident.title,
        user_id: newIncident.user_id,
        severity: newIncident.severity,
        description: newIncident.description,
        evidence_references: newIncident.evidence_references
          ? newIncident.evidence_references.split(',').map((s) => s.trim())
          : []
      };
      await api.createIncident(payload);
      setShowModal(false);
      setNewIncident({ title: '', user_id: '', severity: 'HIGH', description: '', evidence_references: '' });
      fetchIncidents();
    } catch (err) {
      console.error('Failed to create incident', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <FileSearch className="w-5 h-5 text-cyan-400" />
            <span>Incident Investigation Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage active insider threat forensic cases, correlated evidence, and analyst collaboration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono shadow-cyber-cyan transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Case</span>
          </button>
          <button
            onClick={fetchIncidents}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-400 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : incidents.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center text-slate-400 font-mono text-xs border border-slate-800">
          No incident cases open.
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Case ID & User</th>
                  <th className="py-3 px-4">Case Title & Scope</th>
                  <th className="py-3 px-4">Threat Tier</th>
                  <th className="py-3 px-4">Investigation Status</th>
                  <th className="py-3 px-4">Assigned SOC Analyst</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-850/40 transition">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-cyan-400">{inc.incident_id}</div>
                      <div className="text-[11px] text-slate-300">{inc.user_id}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-medium text-slate-100 line-clamp-1">{inc.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{inc.description}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <span className={`px-2 py-0.5 rounded border ${
                        inc.status === 'OPEN'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : inc.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                      {inc.assigned_analyst || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/incidents/${inc.incident_id}`)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono text-xs font-semibold flex items-center gap-1.5 ml-auto transition"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <h2 className="text-lg font-bold font-mono text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              <span>Initiate Security Incident Case</span>
            </h2>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">Target Employee ID</label>
                <input
                  type="text"
                  required
                  value={newIncident.user_id}
                  onChange={(e) => setNewIncident({ ...newIncident, user_id: e.target.value })}
                  placeholder="e.g. AAE0190"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Case Title</label>
                <input
                  type="text"
                  required
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="e.g. Mass intellectual property file extraction via USB"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Severity Tier</label>
                <select
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Case Description & Findings</label>
                <textarea
                  rows="4"
                  required
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Detailed behavioral anomalies, access pattern deviations, timestamps..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Evidence References (Comma Separated)</label>
                <input
                  type="text"
                  value={newIncident.evidence_references}
                  onChange={(e) => setNewIncident({ ...newIncident, evidence_references: e.target.value })}
                  placeholder="ALT-2026-0091, SHA256:abc..., wetransfer.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold transition shadow-cyber-cyan"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentsPage;
