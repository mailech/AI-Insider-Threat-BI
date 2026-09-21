import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Search, Filter, Plus, ArrowRight } from 'lucide-react';
import { alertAPI } from '../services/api';
import { SeverityBadge } from '../components/RiskBadge';

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const fetchAlerts = async () => {
    try {
      const res = await alertAPI.getAlerts({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        limit: 100
      });
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await alertAPI.acknowledgeAlert(alertId);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToIncident = async (alertId) => {
    try {
      await alertAPI.convertToIncident(alertId);
      fetchAlerts();
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
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Threat Alerts & Anomaly Signal Stream
          </h2>
          <p className="text-xs text-slate-400 mt-1">Autonomous high-risk signal generation, escalation queues, and one-click incident conversion</p>
        </div>
        <div className="text-xs font-mono text-amber-400 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800">
          {alerts.length} Active Threat Signals
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Severities (Critical, High, Medium, Low)</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Alert Statuses</option>
          <option value="New">New (Unreviewed)</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Converted to Incident">Converted to Incident</option>
        </select>
      </div>

      {/* Alerts Stream List */}
      <div className="space-y-3">
        {alerts.map((alt) => (
          <div
            key={alt.id}
            className="p-5 bg-[#111827] border border-slate-800 rounded-2xl hover:border-slate-700 transition-all space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <SeverityBadge severity={alt.severity} />
                <span className="font-mono text-xs font-bold text-cyan-400">{alt.alert_id}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {alt.employee_id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 font-medium">
                  {alt.status}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {new Date(alt.timestamp).toLocaleString()}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-100">{alt.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{alt.description}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                <span>Engine: <strong className="text-slate-300 font-sans">{alt.source_engine}</strong></span>
                <span>Anomaly: <strong className="text-cyan-400">{alt.anomaly_score}%</strong></span>
                <span>Threat Score: <strong className="text-red-400">{alt.risk_score}</strong></span>
                {alt.acknowledged_by && <span>Ack by: <strong className="text-emerald-400">{alt.acknowledged_by}</strong></span>}
              </div>

              <div className="flex items-center gap-2">
                {alt.status === 'New' && (
                  <button
                    onClick={() => handleAcknowledge(alt.alert_id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center gap-1 transition-colors border border-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Acknowledge
                  </button>
                )}
                {alt.status !== 'Converted to Incident' && (
                  <button
                    onClick={() => handleConvertToIncident(alt.alert_id)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Escalate to Incident <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
