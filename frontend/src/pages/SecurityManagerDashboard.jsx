import { useState, useEffect } from "react";
import { BarChart3, ShieldCheck, TrendingUp, AlertOctagon, Award, Building2, CheckCircle2 } from "lucide-react";
import { palette } from "../styles/theme.js";
import { api } from "../services/api.js";

export default function SecurityManagerDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.getSecurityManagerMetrics().then(data => {
      if (data) setMetrics(data);
    });
  }, []);

  const deptData = metrics?.department_risks || {
    "Finance": 82.5,
    "IT Administration": 78.0,
    "Engineering": 64.0,
    "Legal": 59.0,
    "Sales": 45.0,
    "Human Resources": 28.0
  };

  const trendScores = metrics?.risk_trend_scores || [62.0, 58.5, 65.0, 71.0, 68.0, 74.0, 77.2];
  const trendLabels = metrics?.risk_trend_labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Security Executive & Risk Posture Dashboard</h1>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Enterprise-wide insider threat posture, historical risk trends, department vulnerability, and compliance framework metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div style={{ background: palette.raised, border: `1px solid ${palette.line}` }} className="px-4 py-2 rounded-xl flex items-center gap-3">
            <Award size={20} className="text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Security Compliance Audit</div>
              <div className="text-sm font-bold text-emerald-400">{metrics?.compliance_score_percent || 94.5}% PASSED</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Level KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Organizational Risk Score Widget */}
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-6 rounded-xl flex items-center gap-6">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-400"
                strokeDasharray={`${metrics?.org_risk_score || 77}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-extrabold text-white font-mono">{metrics?.org_risk_score || 77.2}</span>
              <span className="text-[9px] uppercase font-bold text-amber-400">HIGH RISK</span>
            </div>
          </div>

          <div>
            <span style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Org Threat Risk Score
            </span>
            <p className="text-xs text-slate-300">
              Weighted aggregate calculated across 6 departments and 1,420 monitored enterprise identities.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
              <TrendingUp size={14} />
              +4.8 pts elevation this week
            </div>
          </div>
        </div>

        {/* High Risk Departments Count */}
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-6 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider">High Risk Departments</span>
            <Building2 size={20} className="text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono my-2">
            {metrics?.high_risk_dept_count || 2} <span className="text-xs font-normal text-slate-400">/ 6 Total</span>
          </div>
          <p className="text-xs text-slate-400">
            Finance & IT Administration currently breach organizational risk thresholds.
          </p>
        </div>

        {/* Executive Compliance Framework Card */}
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-6 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider">Compliance Frameworks</span>
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">ISO/IEC 27001 A.12.6</span>
              <span className="text-emerald-400 font-bold font-mono">100% Compliant</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">SOC 2 Type II Security</span>
              <span className="text-emerald-400 font-bold font-mono">96.0% Compliant</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">NIST SP 800-53 Rev 5</span>
              <span className="text-emerald-400 font-bold font-mono">92.5% Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Risk Trend Chart */}
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">7-Day Insider Risk Trend</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Weighted Average Score</span>
          </div>

          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            {trendScores.map((score, idx) => {
              const label = trendLabels[idx] || `Day ${idx+1}`;
              const heightPct = Math.max(15, score);
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-mono font-semibold text-slate-300">{score}</span>
                  <div className="w-full max-w-[40px] bg-slate-800 rounded-t-lg relative overflow-hidden flex items-end" style={{ height: `${heightPct}%` }}>
                    <div
                      style={{ background: score >= 75 ? "#EF4444" : score >= 60 ? "#F59E0B" : "#10B981" }}
                      className="w-full h-full rounded-t-lg transition-all duration-500"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-400">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Departmental Risk Posture Heatmap */}
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Departmental Risk Posture</h2>
            <span className="text-xs font-mono text-slate-400">Risk Threshold: 60.0</span>
          </div>

          <div className="space-y-4">
            {Object.entries(deptData).map(([dept, score]) => {
              const color = score >= 80 ? "#EF4444" : score >= 60 ? "#F59E0B" : "#10B981";
              return (
                <div key={dept} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-white">{dept}</span>
                    <span style={{ color }} className="font-mono font-bold">{score} / 100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${score}%`, background: color }}
                      className="h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
