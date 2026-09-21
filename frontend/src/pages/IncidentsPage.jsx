import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Plus, Search, Filter, Eye, AlertTriangle, User } from 'lucide-react';
import { incidentAPI } from '../services/api';
import { SeverityBadge } from '../components/RiskBadge';

export const IncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // New Incident Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [employeeId, setEmployeeId] = useState('EMP-007');
  const [severity, setSeverity] = useState('High');

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const fetchIncidents = async () => {
    try {
      const res = await incidentAPI.getIncidents({ status: statusFilter || undefined });
      setIncidents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    try {
      await incidentAPI.createIncident({
        title,
        description,
        employee_id: employeeId,
        severity,
        assigned_analyst: 'Security Analyst'
      });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      fetchIncidents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" /> Incident & Threat Case Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">SOC incident investigation dossiers, containment enforcement, and analyst triage</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-950/50"
        >
          <Plus className="w-4 h-4" /> Open New Threat Incident
        </button>
      </div>

      {/* Incidents Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {incidents.map((inc) => (
          <div
            key={inc.incident_id}
            className="p-5 bg-[#111827] border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400">{inc.incident_id}</span>
                <SeverityBadge severity={inc.severity} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">{inc.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{inc.description}</p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>TARGET ENTITY</span>
                <span className="text-white font-bold">{inc.employee_id}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>STATUS</span>
                <span className="text-amber-400 font-sans font-bold">{inc.status}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>ASSIGNED LEAD</span>
                <span className="text-slate-300 font-sans">{inc.assigned_analyst}</span>
              </div>

              <Link
                to={`/investigations/${inc.incident_id.replace('INC', 'INV')}`}
                className="w-full py-2 bg-slate-800 hover:bg-cyan-950 text-cyan-400 hover:text-cyan-300 font-sans font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700 mt-2"
              >
                <Eye className="w-3.5 h-3.5" /> Enter Investigation Case
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Incident Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" /> Open New Insider Threat Incident
            </h3>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-semibold text-slate-400 mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mass Cloud Exfiltration of Database Backups"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block uppercase font-semibold text-slate-400 mb-1">Target Employee ID</label>
                <input
                  type="text"
                  required
                  placeholder="EMP-007"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block uppercase font-semibold text-slate-400 mb-1">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block uppercase font-semibold text-slate-400 mb-1">Incident Summary & Evidence Notes</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe suspicious activities and observed behavioral baseline breaches..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl"
                >
                  Initialize Investigation Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
