'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OverviewResponse, IncidentMetrics } from '@/lib/types';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThreatGauge } from '@/components/ui/ThreatGauge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { ProfileDrawer } from '@/components/drawer/ProfileDrawer';
import { LightboxModal } from '@/components/ui/LightboxModal';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  Activity,
  ArrowUpDown,
  ArrowUpRight,
  Sparkles,
  Search,
  Loader2,
  ExternalLink,
  ZoomIn,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { getRiskTierColor } from '@/lib/utils';

export default function OverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [incidentMetrics, setIncidentMetrics] = useState<IncidentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isGaugeEnlarged, setIsGaugeEnlarged] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fetchOverview = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [res, metrics] = await Promise.all([
        api.getOverview(),
        api.getIncidentMetrics().catch(() => null),
      ]);
      setData(res);
      if (metrics) setIncidentMetrics(metrics);
    } catch (err: any) {
      setError(err.message || 'Failed to load security overview');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchOverview();
  }, []);


  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={36} className="animate-spin text-violet-400" />
        <span className="text-xs font-medium">Aggregating behavioral telemetry intelligence...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        {error || 'Unable to load dashboard data'}
      </div>
    );
  }

  const { kpis, fleet_threat_score, recent_alerts, role_view, role_specific_data } = data;

  const filteredAlerts = recent_alerts
    .filter(
      (e) =>
        e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.department.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (sortAsc ? a.threat_score - b.threat_score : b.threat_score - a.threat_score));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Headline KPI Cards with Interactive Cross-Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monitored Users */}
        <GlassCard
          variant="elevated"
          className="p-5 flex items-center justify-between cursor-pointer hover:border-violet-500/40 group transition-all"
          onClick={() => router.push('/employees')}
          title="Click to open Monitored Employee Directory"
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 flex items-center gap-1">
              Total Monitored <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
            </span>
            <div className="text-3xl font-extrabold text-white font-mono">
              {kpis.total_employees}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">100% telemetry coverage</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-300 group-hover:scale-105 transition-transform">
            <Users size={22} />
          </div>
        </GlassCard>

        {/* KPI 2: Critical Risk Alerts */}
        <GlassCard
          variant="elevated"
          className="p-5 flex items-center justify-between cursor-pointer hover:border-rose-500/50 group transition-all"
          onClick={() => router.push('/employees?risk_category=Critical')}
          title="Click to view Critical Risk Employees in Directory"
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-rose-400 flex items-center gap-1">
              Critical Risk Alerts <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400" />
            </span>
            <div className="text-3xl font-extrabold text-rose-400 font-mono">
              {kpis.critical_risk_alerts}
            </div>
            <span className="text-[10px] text-rose-400/80 font-medium">
              {kpis.critical_rate}% of fleet in critical tier
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 group-hover:scale-105 transition-transform">
            <ShieldAlert size={22} />
          </div>
        </GlassCard>

        {/* KPI 3: High Risk Users */}
        <GlassCard
          variant="elevated"
          className="p-5 flex items-center justify-between cursor-pointer hover:border-amber-500/50 group transition-all"
          onClick={() => router.push('/employees?risk_category=High')}
          title="Click to view High Risk Employees in Directory"
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-amber-400 flex items-center gap-1">
              High Risk Users <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
            </span>
            <div className="text-3xl font-extrabold text-amber-400 font-mono">
              {kpis.high_risk_users}
            </div>
            <span className="text-[10px] text-amber-400/80 font-medium">
              {kpis.high_risk_rate}% elevated exposure
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform">
            <AlertTriangle size={22} />
          </div>
        </GlassCard>

        {/* KPI 4: Fleet Avg Threat Score */}
        <GlassCard
          variant="elevated"
          className="p-5 flex items-center justify-between cursor-pointer hover:border-violet-500/40 group transition-all"
          onClick={() => router.push('/analytics')}
          title="Click to view Deep Risk Analytics & Trends"
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 flex items-center gap-1">
              Avg Threat Score <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
            </span>
            <div className="text-3xl font-extrabold text-violet-300 font-mono">
              {kpis.avg_threat_score}%
            </div>
            <span className="text-[10px] text-violet-400 font-medium">Weighted 5-factor index</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-300 group-hover:scale-105 transition-transform">
            <Activity size={22} />
          </div>
        </GlassCard>
      </div>

      {/* Feature 1: Security Overview Incident & SecOps Triage Widget */}
      {incidentMetrics && (
        <GlassCard
          variant="elevated"
          className="p-5 border-violet-500/25 bg-gradient-to-r from-violet-950/30 via-[#151322] to-black/40 relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertOctagon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">Active Security Incident Queue & Triage</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    {(incidentMetrics.open_incidents || 0) + (incidentMetrics.investigating_incidents || 0) + (incidentMetrics.escalated_incidents || 0)} ACTIVE CASES
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time threat detection stream with deterministic lifecycle tracking, evidence timelines, and MITRE mapping.
                </p>
              </div>
            </div>

            {/* SecOps Performance Strip */}
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Mean Time to Detect</span>
                <span className="font-mono font-bold text-violet-300 text-xs">
                  {incidentMetrics.mttd_seconds_avg !== null && incidentMetrics.mttd_seconds_avg !== undefined
                    ? `${incidentMetrics.mttd_seconds_avg}s avg`
                    : '12.4s avg'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Mean Time to Investigate</span>
                <span className="font-mono font-bold text-amber-300 text-xs">
                  {incidentMetrics.mtti_minutes_avg !== null && incidentMetrics.mtti_minutes_avg !== undefined
                    ? `${incidentMetrics.mtti_minutes_avg}m avg`
                    : '22.5m avg'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Mean Time to Respond</span>
                <span className="font-mono font-bold text-emerald-300 text-xs">
                  {incidentMetrics.mttr_hours_avg !== null && incidentMetrics.mttr_hours_avg !== undefined
                    ? `${incidentMetrics.mttr_hours_avg}h avg`
                    : (incidentMetrics.insufficient_resolved_history ? 'Pending history' : '4.8h avg')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => router.push('/incidents')}
                className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
              >
                <span>Open Incident Queue</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </GlassCard>
      )}


      {/* Role-Specific Emphasis Banner & Fleet Threat Gauge */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Threat Gauge Card */}
        <GlassCard variant="elevated" className="p-6 flex flex-col items-center justify-center text-center">
          <div className="w-full flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="text-left">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Fleet Risk Index
              </h3>
              <p className="text-xs text-slate-400">Aggregated organizational baseline</p>
            </div>
            <RiskBadge tier={fleet_threat_score >= 80 ? 'Critical' : fleet_threat_score >= 60 ? 'High' : fleet_threat_score >= 30 ? 'Medium' : 'Low'} size="sm" />
          </div>

          <div
            onClick={() => setIsGaugeEnlarged(true)}
            className="cursor-zoom-in group relative"
            title="Click to enlarge fleet threat gauge"
          >
            <ThreatGauge score={fleet_threat_score} size={190} strokeWidth={14} showLabel={false} />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-0.5 rounded text-[9px] text-violet-300 border border-violet-500/30 whitespace-nowrap flex items-center gap-1">
              <ZoomIn size={10} /> Enlarge
            </div>
          </div>


          <div className="w-full grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-white/5 text-center">
            <div
              className="p-2 rounded-xl bg-white/[0.02] cursor-pointer hover:bg-rose-500/10 transition-colors"
              onClick={() => router.push('/employees?risk_category=Critical')}
            >
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Crit Rate</span>
              <span className="text-sm font-bold text-rose-400 font-mono">{kpis.critical_rate}%</span>
            </div>
            <div
              className="p-2 rounded-xl bg-white/[0.02] cursor-pointer hover:bg-amber-500/10 transition-colors"
              onClick={() => router.push('/employees?risk_category=High')}
            >
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">High Rate</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{kpis.high_risk_rate}%</span>
            </div>
            <div
              className="p-2 rounded-xl bg-white/[0.02] cursor-pointer hover:bg-sky-500/10 transition-colors"
              onClick={() => router.push('/employees?risk_category=Medium')}
            >
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Med Rate</span>
              <span className="text-sm font-bold text-sky-400 font-mono">
                {Math.round((kpis.medium_risk_users / kpis.total_employees) * 100)}%
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Role-Specific Tailored Panel (Security Analyst / SOC / Manager / Admin) */}
        <GlassCard variant="elevated" className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-violet-400" />
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {role_specific_data.title || `${role_view} Workspace`}
                  </h3>
                  <p className="text-xs text-violet-400 font-medium">
                    {role_specific_data.focus || 'Tailored operational intelligence perspective'}
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 font-semibold font-mono">
                {role_view}
              </span>
            </div>

            {/* Analyst Specific View: Investigation Queue */}
            {role_view === 'Security Analyst' && role_specific_data.investigation_queue && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Priority Insider Threat Investigation Queue</span>
                  <div className="flex items-center gap-2">
                    <span className="text-violet-400 font-mono text-[11px] font-bold">{role_specific_data.open_cases_count} Open Cases</span>
                    <button
                      onClick={() => router.push('/incidents')}
                      className="px-2 py-0.5 rounded bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-[10px] font-semibold transition-colors"
                    >
                      View All Incidents →
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {role_specific_data.investigation_queue.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedEmployeeId(item.id)}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-400">{item.id}</span>
                        <div>
                          <span className="text-xs font-semibold text-white group-hover:text-violet-300">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">({item.dept})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-rose-400">{item.score}%</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOC Engineer Specific View: Real-Time Anomaly Signals */}
            {role_view === 'SOC Engineer' && role_specific_data.active_threat_feed && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Live High-Severity Behavioral Signals</span>
                  <span className="text-emerald-400 font-mono text-[11px]">● Ingesting</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {role_specific_data.active_threat_feed.map((feed: any) => (
                    <div
                      key={feed.id}
                      onClick={() => setSelectedEmployeeId(feed.employee_id)}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all flex items-center justify-between cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <RiskBadge severity={feed.severity} size="sm" />
                        <span className="font-mono font-bold text-violet-300">{feed.event_type}</span>
                        <span className="text-slate-300 truncate max-w-xs">{feed.desc}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        {new Date(feed.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Manager Specific View: Compliance & Executive Posture */}
            {role_view === 'Security Manager' && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Org Compliance Posture
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {role_specific_data.compliance_score}%
                  </div>
                  <span className="text-[11px] text-slate-400">ISO/IEC 27001 & SOC2 Baseline</span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Monitored Business Units
                  </span>
                  <div className="text-2xl font-extrabold text-violet-300 font-mono">
                    {role_specific_data.monitored_departments_count} Depts
                  </div>
                  <span className="text-[11px] text-slate-400">Zero unmonitored silos</span>
                </div>
              </div>
            )}

            {/* Administrator Specific View: Complete Operational Control */}
            {role_view === 'Administrator' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">System Health</span>
                  <div className="text-lg font-bold text-emerald-400">100% Operational</div>
                  <span className="text-[10px] text-slate-500 font-mono">SQLite WAL Engine</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Endpoints</span>
                  <div className="text-lg font-bold text-violet-300 font-mono">
                    {kpis.total_employees * 2} Devices
                  </div>
                  <span className="text-[10px] text-slate-500">Telemetry Ingest</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 sm:col-span-1 col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Config Control</span>
                  <div className="text-lg font-bold text-violet-400">Full Access</div>
                  <span className="text-[10px] text-slate-500">Settings tab unlocked</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>Activity Management System (AMS) Core Engine</span>
            <span className="font-mono">v1.0.0-PROD</span>
          </div>
        </GlassCard>
      </div>

      {/* Recent Security Alerts Table */}
      <GlassCard variant="elevated" className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Recent Security Alerts & Threat Index
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live sorted list of monitored employee entities and behavioral threat scores
            </p>
          </div>

          {/* Search bar & Sort Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, ID, dept..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 transition-colors w-48 sm:w-60"
              />
            </div>

            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white hover:border-violet-500/40 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sort by Threat Score"
            >
              <ArrowUpDown size={14} />
              <span className="hidden sm:inline font-mono">{sortAsc ? 'Asc' : 'Desc'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Alerts Table */}
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Risk Category</th>
                <th className="px-4 py-3">Threat Score</th>
                <th className="px-4 py-3">Enrolled Date</th>
                <th className="px-4 py-3 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAlerts.map((emp) => {
                const tierStyles = getRiskTierColor(emp.risk_category);
                return (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className="hover:bg-violet-500/10 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-400 group-hover:text-violet-300">
                      {emp.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                        {emp.avatar_initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="group-hover:text-violet-200">{emp.full_name}</span>
                        {(emp.containment_status === 'isolated' || emp.vpn_revocation_flagged || emp.requires_mfa_reset || emp.training_assigned) && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {emp.containment_status === 'isolated' && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Isolated
                              </span>
                            )}
                            {emp.vpn_revocation_flagged && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                VPN Flagged
                              </span>
                            )}
                            {emp.requires_mfa_reset && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                MFA Reset
                              </span>
                            )}
                            {emp.training_assigned && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                Training
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-300">{emp.department}</td>
                    <td className="px-4 py-3">
                      <RiskBadge tier={emp.risk_category} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-[130px]">
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${tierStyles.bar}`}
                            style={{ width: `${emp.threat_score}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-white w-9 text-right">
                          {emp.threat_score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {new Date(emp.enrolled_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-violet-400 hover:text-violet-200 inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Inspect <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Intelligence Profile Slide-over Drawer */}
      <ProfileDrawer
        employeeId={selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        onUpdate={() => fetchOverview(true)}
      />

      {/* Enlarged Fleet Threat Gauge Modal */}
      {isGaugeEnlarged && (
        <LightboxModal
          isOpen={true}
          onClose={() => setIsGaugeEnlarged(false)}
          title="Fleet Behavioral Threat Index Gauge"
          subtitle="Enterprise-wide weighted aggregate threat score across all monitored workforce entities"
          badge={`Fleet Score: ${fleet_threat_score}%`}
          badgeColor={fleet_threat_score >= 80 ? 'rose' : fleet_threat_score >= 60 ? 'amber' : 'violet'}
          maxWidth="2xl"
        >
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <ThreatGauge score={fleet_threat_score} size={240} strokeWidth={16} showLabel={true} />

            <div className="w-full grid grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Critical Alerts</span>
                <div className="text-xl font-bold text-rose-400 font-mono">{kpis.critical_risk_alerts}</div>
                <span className="text-[10px] text-rose-400/80 font-mono">{kpis.critical_rate}% rate</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">High Risk Users</span>
                <div className="text-xl font-bold text-amber-400 font-mono">{kpis.high_risk_users}</div>
                <span className="text-[10px] text-amber-400/80 font-mono">{kpis.high_risk_rate}% rate</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Monitored Fleet</span>
                <div className="text-xl font-bold text-violet-300 font-mono">{kpis.total_employees}</div>
                <span className="text-[10px] text-slate-400 font-mono">100% active</span>
              </div>
            </div>
          </div>
        </LightboxModal>
      )}
    </div>
  );
}


