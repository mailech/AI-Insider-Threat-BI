import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ShieldAlert, Users, FolderCheck,
  Search, ExternalLink, ArrowUpRight, Cpu, Eye, CheckCircle2
} from 'lucide-react';
import { dashboardAPI, alertAPI, anomalyAPI } from '../services/api';
import { StatsCard } from '../components/StatsCard';
import { RiskBadge, SeverityBadge } from '../components/RiskBadge';
import { AnomalyExplainModal } from '../components/AnomalyExplainModal';

export const AnalystDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedExplainEmp, setSelectedExplainEmp] = useState(null);
  const [explainData, setExplainData] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await dashboardAPI.getAnalystDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analyst dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await alertAPI.acknowledgeAlert(alertId);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenExplain = async (empId) => {
    setSelectedExplainEmp(empId);
    setExplainLoading(true);
    try {
      const res = await anomalyAPI.getExplanation(empId);
      setExplainData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setExplainLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Security Analyst Intelligence Feed...</div>;
  }

  const { stats, recent_alerts, top_risk_users, open_incidents } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Security Analyst Operations Center</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">LIVE TRIAGE</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time prioritization of insider behavioral anomalies and investigation queue</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/alerts"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-950/50"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Full Alert Feed
          </Link>
          <Link
            to="/incidents"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Incident Cases
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Critical Alerts"
          value={stats?.critical_alerts || 0}
          subtitle="Immediate triage needed"
          icon={AlertTriangle}
          color="red"
          badge="High Priority"
        />
        <StatsCard
          title="High Risk Entities"
          value={stats?.high_risk_entities || 0}
          subtitle="Employees exceeding 60.0 threshold"
          icon={Users}
          color="amber"
        />
        <StatsCard
          title="Active Investigations"
          value={stats?.active_investigations || 0}
          subtitle="Assigned cases in progress"
          icon={ShieldAlert}
          color="cyan"
        />
        <StatsCard
          title="Triage Queue"
          value={stats?.triage_queue_count || 0}
          subtitle="Unacknowledged threat signals"
          icon={FolderCheck}
          color="purple"
        />
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Threat Alerts Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-cyan-400" /> Real-Time Threat Alerts & Triage Queue
                </h3>
                <p className="text-xs text-slate-500">Autonomous detections by UEBA & multi-model anomaly detection</p>
              </div>
              <Link to="/alerts" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recent_alerts && recent_alerts.length > 0 ? (
                recent_alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-4 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={alt.severity} />
                        <span className="font-mono text-xs text-cyan-400">{alt.employee_id}</span>
                        <span className="text-xs font-bold text-slate-200">{alt.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Threat Score: <strong className="text-amber-400">{alt.risk_score}</strong> &bull; Status: {alt.status} &bull; {new Date(alt.timestamp).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenExplain(alt.employee_id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-cyan-950 text-cyan-400 hover:text-cyan-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Cpu className="w-3 h-3" /> XAI Diagnosis
                      </button>
                      {alt.status === 'New' && (
                        <button
                          onClick={() => handleAcknowledge(alt.id)}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Ack
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">No active threat alerts in queue.</div>
              )}
            </div>
          </div>

          {/* Open Incidents Summary */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" /> Active Incident Investigations
              </h3>
              <Link to="/incidents" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                Manage Incidents <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Incident ID</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assigned Lead</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {open_incidents && open_incidents.map((inc) => (
                    <tr key={inc.incident_id} className="hover:bg-slate-900/60">
                      <td className="py-3 px-3 text-cyan-400 font-bold">{inc.incident_id}</td>
                      <td className="py-3 px-3 text-slate-300 font-sans">{inc.employee_id}</td>
                      <td className="py-3 px-3 font-sans"><SeverityBadge severity={inc.severity} /></td>
                      <td className="py-3 px-3 font-sans text-amber-400 font-medium">{inc.status}</td>
                      <td className="py-3 px-3 font-sans text-slate-400">{inc.assigned_analyst}</td>
                      <td className="py-3 px-3 text-right font-sans">
                        <Link
                          to={`/investigations/${inc.incident_id.replace('INC', 'INV')}`}
                          className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Case
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Top At-Risk Identities */}
        <div className="space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Top Ranked Risk Identities
              </h3>
              <Link to="/employees" className="text-xs text-cyan-400 hover:underline">All</Link>
            </div>

            <div className="space-y-3">
              {top_risk_users && top_risk_users.map((u) => (
                <div key={u.employee_id} className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-100">{u.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{u.employee_id} &bull; {u.department}</p>
                    </div>
                    <RiskBadge level={u.risk_level} score={u.risk_score} />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">{u.designation}</span>
                    <button
                      onClick={() => handleOpenExplain(u.employee_id)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5"
                    >
                      Diagnose <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-gradient-to-br from-slate-900 to-cyan-950/20 border border-cyan-500/20 rounded-2xl p-5 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Analyst SOP Quick Checklist
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Review composite anomaly scores {'>'} 60.0.</li>
              <li>Inspect SHAP top risk factors to verify intent vs error.</li>
              <li>Acknowledge or convert high-severity alerts into Incident cases.</li>
              <li>Execute containment actions (revoke keys, isolate host).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Explainability Modal */}
      <AnomalyExplainModal
        isOpen={Boolean(selectedExplainEmp)}
        onClose={() => setSelectedExplainEmp(null)}
        explanationData={explainData}
      />
    </div>
  );
};
