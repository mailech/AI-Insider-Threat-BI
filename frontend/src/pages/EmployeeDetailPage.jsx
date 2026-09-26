import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  ArrowLeft,
  Laptop,
  Flame,
  AlertTriangle,
  BrainCircuit,
  Activity,
  Calendar,
  Clock,
  Key,
  FolderLock,
  Mail,
  FileText,
  Radio,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import RiskScoreGauge from '../components/RiskScoreGauge';

export const EmployeeDetailPage = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('baseline'); // baseline, timeline, anomalies, alerts
  const navigate = useNavigate();

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployeeById(id);
      setEmployee(res.data);
    } catch (err) {
      console.error('Failed to load employee details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center glass-panel rounded-xl border border-rose-500/30">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-slate-300 font-mono">Employee ID '{id}' not found in CERT directory.</p>
        <button
          onClick={() => navigate('/employees')}
          className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono hover:bg-slate-700"
        >
          Return to Employees
        </button>
      </div>
    );
  }

  const { behavioral_baseline, risk_history, recent_anomalies, recent_alerts, recent_incidents, activity_timeline } = employee;

  return (
    <div className="space-y-6 pb-16">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Monitored Employees</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/incidents?user_id=${employee.user_id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-mono font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open Incident Investigation</span>
          </button>
        </div>
      </div>

      {/* Top Profile Summary Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-rose-500"></div>

        <div className="flex flex-col lg:flex-row justify-between gap-6">
          {/* Left Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center font-mono text-xl font-bold text-cyan-400 shadow-cyber-cyan shrink-0">
              {employee.user_id.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold font-mono text-slate-100">{employee.full_name}</h1>
                <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 font-semibold">
                  {employee.user_id}
                </span>
                <SeverityBadge severity={employee.current_severity} size="md" />
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                {employee.role} • <span className="text-cyan-300">{employee.department}</span>
              </p>
              <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 mt-2 flex-wrap">
                <span>Email: <span className="text-slate-300">{employee.email}</span></span>
                <span>Manager: <span className="text-slate-300">{employee.manager || 'N/A'}</span></span>
              </div>
            </div>
          </div>

          {/* Right Risk Posture Gauge */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 shrink-0">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Composite Risk Score</div>
              <div className="text-3xl font-mono font-bold text-slate-100">{employee.current_risk_score} <span className="text-xs text-slate-500 font-normal">/ 100</span></div>
              <div className="text-[11px] font-mono text-rose-400 font-semibold mt-0.5">{employee.current_severity} THREAT</div>
            </div>
            <div className="h-12 w-px bg-slate-800"></div>
            <div className="space-y-1 font-mono text-xs">
              <div className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{employee.anomaly_count} Anomalies Detected</span>
              </div>
              <div className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>{employee.alert_count} Security Alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Devices and Privileges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <span className="font-mono text-slate-400 font-medium block mb-2 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span>Assigned Workstation & Devices:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
              {employee.devices && employee.devices.length > 0 ? (
                employee.devices.map((d) => (
                  <span key={d} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                    {d}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">Standard Office PC</span>
              )}
            </div>
          </div>

          <div>
            <span className="font-mono text-slate-400 font-medium block mb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Privilege & Access Footprint:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
              {employee.access_privileges && employee.access_privileges.length > 0 ? (
                employee.access_privileges.map((p) => (
                  <span key={p} className="px-2 py-1 rounded bg-slate-900 border border-cyan-500/20 text-cyan-300">
                    {p}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">Standard User Access</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Risk Trajectory Chart */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800">
        <h3 className="text-sm font-bold font-mono text-slate-200 mb-1">Behavioral Risk Trajectory & Anomaly History</h3>
        <p className="text-xs text-slate-400 mb-4">Historical daily risk score tracking against baseline norm</p>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={risk_history}>
              <defs>
                <linearGradient id="userRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0b1329', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
              />
              <Area type="monotone" dataKey="risk_score" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#userRisk)" name="Daily Risk Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profile Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('baseline')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition ${
            activeTab === 'baseline'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Normal Behavioral Baselines
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition ${
            activeTab === 'timeline'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Forensic Activity Timeline ({activity_timeline.length})
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition ${
            activeTab === 'anomalies'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Detected Anomalies ({recent_anomalies.length})
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition ${
            activeTab === 'alerts'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Linked Alerts & Cases ({recent_alerts.length})
        </button>
      </div>

      {/* Tab 1: Behavioral Baselines */}
      {activeTab === 'baseline' && (
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="mb-4">
            <h3 className="text-sm font-bold font-mono text-slate-200">Statistical Normal Working Baselines</h3>
            <p className="text-xs text-slate-400">Calculated exclusively from non-malicious historical behavior</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Behavioral Metric</th>
                  <th className="py-2.5 px-3">Mean (Avg)</th>
                  <th className="py-2.5 px-3">Std Dev (σ)</th>
                  <th className="py-2.5 px-3">Median</th>
                  <th className="py-2.5 px-3">Normal Range (Q25 - Q75)</th>
                  <th className="py-2.5 px-3">Working Hours Baseline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {Object.entries(behavioral_baseline).map(([metric, stats]) => (
                  <tr key={metric} className="hover:bg-slate-850/40">
                    <td className="py-3 px-3 font-semibold text-cyan-300">{metric}</td>
                    <td className="py-3 px-3 text-slate-200">{stats.mean}</td>
                    <td className="py-3 px-3 text-slate-400">± {stats.std}</td>
                    <td className="py-3 px-3 text-slate-300">{stats.median}</td>
                    <td className="py-3 px-3 text-slate-400">{stats.q25} - {stats.q75}</td>
                    <td className="py-3 px-3 text-emerald-400">08:30 - 17:30 (M-F)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Activity Timeline */}
      {activeTab === 'timeline' && (
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-bold font-mono text-slate-200 mb-4">Chronological Event Timeline</h3>
          <div className="space-y-3">
            {activity_timeline.map((act, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs ${
                  act.is_anomalous
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1 font-mono text-[11px]">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${act.is_anomalous ? 'bg-rose-400' : 'bg-cyan-400'}`}></span>
                    <span className="font-bold">{act.type}</span>
                    <span className="text-slate-500">[{act.date}]</span>
                  </span>
                  {act.is_anomalous && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]">
                      BASELINE DEVIATION
                    </span>
                  )}
                </div>
                <div className="font-sans pl-4">{act.summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Anomalies */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          {recent_anomalies.map((anom, idx) => (
            <div key={idx} className="glass-panel rounded-xl p-4 border border-rose-500/30 bg-rose-950/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-rose-400 font-bold">ANOMALY DATE: {anom.date}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300">Anomaly Score: {anom.anomaly_score}</span>
                </div>
                <SeverityBadge severity={anom.severity} />
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-xs font-mono text-slate-400 font-semibold">Measurable Baseline Explanations:</div>
                {anom.factors && anom.factors.map((f, fIdx) => (
                  <div key={fIdx} className="text-xs text-rose-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Linked Alerts & Cases */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {recent_alerts.map((alert) => (
            <div key={alert.id} className="glass-panel rounded-xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-cyan-400">{alert.alert_id}</span>
                <SeverityBadge severity={alert.severity} />
              </div>
              <div className="text-xs text-slate-200 mb-2">{alert.reasons[0]}</div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
                <span>Timestamp: {alert.timestamp}</span>
                <span>Analyst: {alert.assigned_analyst || 'Unassigned'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeDetailPage;
