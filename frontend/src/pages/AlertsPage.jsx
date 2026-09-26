import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  UserCheck,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts({
        status_filter: statusFilter !== 'ALL' ? statusFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        user_id: searchTerm || undefined,
      });
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      await api.updateAlert(alertId, { status: newStatus });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert status', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Explainable Security Alerts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time threat alerts with measurable baseline indicator evidence and SOC triage workflows
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-400 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by User ID (AAE0190)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAlerts()}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Triage Statuses</option>
            <option value="NEW">New (Unassigned)</option>
            <option value="INVESTIGATING">Under Investigation</option>
            <option value="RESOLVED">Resolved / Remediated</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Threat Tiers</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center text-slate-400 font-mono text-xs border border-slate-800">
          No security alerts matching filter criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="glass-panel rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm font-bold text-cyan-400">{alert.alert_id}</div>
                  <span className="text-slate-500">•</span>
                  <div className="font-mono text-xs text-slate-200 font-semibold">User: {alert.user_id}</div>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs font-mono text-slate-400">Risk: {alert.risk_score}</span>
                </div>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={alert.severity} />
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    alert.status === 'NEW'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : alert.status === 'INVESTIGATING'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {alert.status}
                  </span>
                </div>
              </div>

              {/* Explainable Reasons */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-3">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                  Why this alert fired (Measurable Baseline Deviations):
                </div>
                <ul className="space-y-1.5 text-xs text-slate-200 font-sans">
                  {alert.reasons && alert.reasons.map((r, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-mono mt-0.5">›</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Associated Activities */}
              {alert.related_activities && alert.related_activities.length > 0 && (
                <div className="mb-3 text-[11px] font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-500">Correlated Logs:</span>
                  {alert.related_activities.map((act, aIdx) => (
                    <span key={aIdx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {act.event || 'EVENT'}: {act.time || ''} {act.pc || act.device || act.domain || ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Triage Action Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
                <div className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{alert.timestamp.replace('T', ' ').replace('Z', '')}</span>
                  {alert.assigned_analyst && (
                    <span className="text-cyan-400/80 ml-2">• Assigned: {alert.assigned_analyst}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {alert.status === 'NEW' && (
                    <button
                      onClick={() => handleUpdateStatus(alert.alert_id, 'INVESTIGATING')}
                      className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition text-[11px]"
                    >
                      Start Investigation
                    </button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(alert.alert_id, 'RESOLVED')}
                      className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition text-[11px]"
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/employees/${alert.user_id}`)}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-slate-800 hover:border-cyan-500/30 transition text-[11px] flex items-center gap-1"
                  >
                    <span>User Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
