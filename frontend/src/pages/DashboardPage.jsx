import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  FileSearch,
  Activity,
  Flame,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  Brain,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';
import SeverityBadge from '../components/SeverityBadge';
import RiskScoreGauge from '../components/RiskScoreGauge';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardSummary();
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard summary', err);
      setError('Unable to fetch live SOC telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono text-cyan-300">Synchronizing CERT R4.2 Behavioral Telemetry...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center glass-panel rounded-xl border border-rose-500/30">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-slate-300 font-mono">{error || 'No telemetry data available.'}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-mono border border-cyan-500/40 hover:bg-cyan-500/30 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { cards, risk_distribution, trend, top_anomalous_users, department_distribution, activity_distribution, latest_alerts, active_investigations } = data;

  const RISK_COLORS = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#ef4444'
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <span>Executive SOC Threat Intelligence</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              CERT R4.2
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time behavioral baseline tracking, dual-engine ML anomaly detection & multi-factor risk scores
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <MetricCard
          title="Monitored Users"
          value={cards.monitored_employees}
          subtext={`of ${cards.total_employees} Total`}
          icon={Users}
          color="cyan"
        />
        <MetricCard
          title="Anomalous Users"
          value={cards.anomalous_users}
          subtext="Baseline Deviations"
          icon={Brain}
          color="purple"
        />
        <MetricCard
          title="High Risk"
          value={cards.high_risk_users}
          subtext="Score 50-74"
          icon={Flame}
          color="amber"
        />
        <MetricCard
          title="Critical Threats"
          value={cards.critical_users}
          subtext="Score ≥ 75"
          icon={ShieldAlert}
          color="red"
        />
        <MetricCard
          title="Active Alerts"
          value={cards.active_alerts}
          subtext="Requires Triage"
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          title="Open Cases"
          value={cards.open_investigations}
          subtext="Under Investigation"
          icon={FileSearch}
          color="cyan"
        />
        <MetricCard
          title="Engine Status"
          value="99.8%"
          subtext="Model Uptime"
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk & Anomaly Trajectory (2 Cols) */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-200">14-Day Enterprise Risk & Anomaly Trajectory</h3>
              <p className="text-xs text-slate-400">Moving average risk score and anomaly spikes across organization</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Avg Risk Index
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Anomalies Flagged
              </span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="risk_avg" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#riskGrad)" name="Avg Risk (0-100)" />
                <Area type="monotone" dataKey="anomaly_count" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#anomGrad)" name="Anomalies" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Pie / Bar (1 Col) */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-200 mb-1">Employee Risk Posture</h3>
            <p className="text-xs text-slate-400 mb-4">Distribution of employees by threat severity tier</p>
          </div>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={risk_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {risk_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || '#06b6d4'} stroke="#060913" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
            {risk_distribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[item.name] }}></span>
                  {item.name}
                </span>
                <span className="text-xs font-mono font-bold text-slate-100">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row: Top Anomalous Employees & Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Anomalous Users Table (2 Cols) */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-200">Priority Threat Watchlist</h3>
              <p className="text-xs text-slate-400">Employees with highest risk scores and anomalous deviations</p>
            </div>
            <button
              onClick={() => navigate('/employees')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>View All Monitored</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Dept & Role</th>
                  <th className="py-2.5 px-3">Risk Index</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Primary Explanatory Factors</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {top_anomalous_users.map((emp) => (
                  <tr key={emp.user_id} className="hover:bg-slate-850/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-100">{emp.full_name}</div>
                      <div className="font-mono text-[11px] text-cyan-400">{emp.user_id}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{emp.department}</div>
                      <div className="text-[11px] text-slate-500">{emp.role}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-sm text-slate-100">{emp.risk_score}</span>
                    </td>
                    <td className="py-3 px-3">
                      <SeverityBadge severity={emp.severity} />
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      <div className="text-[11px] text-slate-300 truncate">
                        {emp.top_factors[0] || 'Baseline access deviation'}
                      </div>
                      {emp.top_factors[1] && (
                        <div className="text-[10px] text-slate-500 truncate">
                          + {emp.top_factors[1]}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/employees/${emp.user_id}`)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-slate-800 hover:border-cyan-500/40 font-mono text-[11px] transition"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Risk Distribution (1 Col) */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-bold font-mono text-slate-200 mb-1">Department Threat Index</h3>
          <p className="text-xs text-slate-400 mb-4">Average risk score by business division</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={department_distribution} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} domain={[0, 100]} />
                <YAxis type="category" dataKey="department" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="avg_risk" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Avg Risk Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Latest Alerts & Active Investigations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Alerts */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-200">Latest Security Alerts</h3>
              <p className="text-xs text-slate-400">Triggered by anomaly & multi-factor risk engine</p>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>View All Alerts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {latest_alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">{alert.alert_id}</span>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-xs text-slate-300">{alert.user_id}</span>
                  </div>
                  <SeverityBadge severity={alert.severity} size="sm" />
                </div>
                <div className="text-xs text-slate-300 font-sans mb-2">
                  {alert.reasons[0] || 'Behavioral anomaly crossing threat threshold'}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1.5 border-t border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {alert.timestamp.replace('T', ' ').replace('Z', '')}
                  </span>
                  <span className="text-cyan-300/80">Status: {alert.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Investigations */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-200">Active Incident Investigations</h3>
              <p className="text-xs text-slate-400">Formal forensic cases assigned to SOC analysts</p>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>View All Cases</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {active_investigations.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.incident_id}`)}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-cyan-400">{inc.incident_id}</span>
                  <SeverityBadge severity={inc.severity} size="sm" />
                </div>
                <div className="text-xs font-medium text-slate-200 line-clamp-1 mb-1">
                  {inc.title}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1.5 border-t border-slate-800/60">
                  <span>Assigned: {inc.assigned_analyst || 'Unassigned'}</span>
                  <span className="text-amber-400">{inc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
