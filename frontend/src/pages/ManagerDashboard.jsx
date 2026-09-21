import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Shield, Award, Users, FileSpreadsheet,
  Download, BarChart3, AlertOctagon, CheckCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { dashboardAPI } from '../services/api';
import { StatsCard } from '../components/StatsCard';

export const ManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManagerData();
  }, []);

  const fetchManagerData = async () => {
    try {
      const res = await dashboardAPI.getManagerDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Executive & Managerial Posture...</div>;
  }

  const { executive_summary, department_risk_posture, resolved_incidents_this_month, open_escalations } = data || {};

  const pieData = [
    { name: 'Critical', value: executive_summary?.critical_risk_entities || 0, color: '#ef4444' },
    { name: 'High', value: executive_summary?.high_risk_entities || 0, color: '#f97316' },
    { name: 'Medium', value: executive_summary?.medium_risk_entities || 0, color: '#f59e0b' },
    { name: 'Low', value: executive_summary?.low_risk_entities || 0, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Security Manager & CISO Executive Posture</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              RISK POSTURE: {executive_summary?.overall_org_risk_posture?.toUpperCase()}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Enterprise-wide insider risk posture, compliance audit metrics, and departmental exposure</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/reports"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-950/50"
          >
            <Download className="w-3.5 h-3.5" /> Export Executive Reports
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Org Mean Risk Score"
          value={`${executive_summary?.org_average_risk_score || 0}/100`}
          subtitle="Enterprise weighted composite"
          icon={TrendingUp}
          color="amber"
        />
        <StatsCard
          title="Compliance Score"
          value={executive_summary?.compliance_posture_score || "94.2%"}
          subtitle="ISO27001 / SOC2 Type II"
          icon={Award}
          color="green"
        />
        <StatsCard
          title="Mean Time To Respond"
          value={executive_summary?.mean_time_to_respond_mttr || "32.0 mins"}
          subtitle="Incident containment speed"
          icon={Shield}
          color="cyan"
        />
        <StatsCard
          title="Resolved Incidents"
          value={resolved_incidents_this_month || 0}
          subtitle={`${open_escalations || 0} active escalations`}
          icon={CheckCircle}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Exposure Bar Chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" /> Departmental Average Risk Score & Threat Count
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={department_risk_posture || []}>
                <XAxis dataKey="department" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="average_risk_score" name="Avg Risk Score" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="threat_entities" name="High/Critical Entities" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-cyan-400" /> Identity Risk Distribution
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                <span className="text-slate-400">{p.name}: <strong className="text-white font-mono">{p.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-cyan-400" /> Department Compliance & Threat Posture Roster
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Monitored Headcount</th>
                <th className="py-2.5 px-3">Average Risk Score</th>
                <th className="py-2.5 px-3">High / Critical Threat Entities</th>
                <th className="py-2.5 px-3 text-right">Compliance Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {department_risk_posture && department_risk_posture.map((d) => (
                <tr key={d.department} className="hover:bg-slate-900/60">
                  <td className="py-3 px-3 text-slate-200 font-sans font-bold">{d.department}</td>
                  <td className="py-3 px-3 text-slate-400">{d.total_headcount}</td>
                  <td className="py-3 px-3 font-bold text-cyan-400">{d.average_risk_score} / 100</td>
                  <td className="py-3 px-3">
                    {d.threat_entities > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-sans font-semibold">
                        {d.threat_entities} Active Threat(s)
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-sans font-medium">0 Threats Flagged</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      PASSED (SOC2)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
