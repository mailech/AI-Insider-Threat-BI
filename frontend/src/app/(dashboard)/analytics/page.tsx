'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsOverview, RecalculateResponse, EmployeeListItem } from '@/lib/types';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { ThreatVelocityChart } from '@/components/charts/ThreatVelocityChart';
import { RiskDonutChart } from '@/components/charts/RiskDonutChart';
import { ScoreBarChart } from '@/components/charts/ScoreBarChart';
import { ProfileDrawer } from '@/components/drawer/ProfileDrawer';
import { MitreBadge } from '@/components/ui/MitreBadge';
import { LightboxModal } from '@/components/ui/LightboxModal';
import {
  LineChart as ChartIcon,
  RotateCcw,
  ShieldAlert,
  Building2,
  AlertTriangle,
  Activity,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader2,
  Clock,
  Download,
  Lock,
  Eye,
  Info,
  Sliders,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { getRiskTierColor } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Enlarged Chart Lightbox State
  const [enlargedChart, setEnlargedChart] = useState<'velocity' | 'donut' | 'bars' | null>(null);

  // Recalculation panel state
  const [recalcEmpId, setRecalcEmpId] = useState<string>('emp_1001');
  const [lookbackWindow, setLookbackWindow] = useState<string>('24h');
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [recalcResult, setRecalcResult] = useState<RecalculateResponse | null>(null);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  // Anomaly Report state (Milestone 2 A3)
  const [anomalyReport, setAnomalyReport] = useState<import('@/lib/types').AnomalyReportResponse | null>(null);
  const [anomalyDept, setAnomalyDept] = useState<string>('All');
  const [anomalyCategoryFilter, setAnomalyCategoryFilter] = useState<string>('All');
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState<string>('All');
  const [isExportingAnomaly, setIsExportingAnomaly] = useState<boolean>(false);
  const [anomalyExportMsg, setAnomalyExportMsg] = useState<string | null>(null);

  // Behavioral Anomaly Detection Thresholds (Milestone 2 Round 2)
  const [showThresholdsModal, setShowThresholdsModal] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<Record<string, import('@/lib/types').AnomalyThreshold>>({});

  const canExport = user?.role === 'Administrator' || user?.role === 'Security Manager';
  const isAnalyst = user?.role === 'Security Analyst';

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [analyticsData, empList, anomalyData, thresholdsData] = await Promise.all([
        api.getAnalytics(),
        api.getEmployees(),
        api.getAnomalyReport({
          department: anomalyDept !== 'All' ? anomalyDept : undefined,
          anomaly_category: anomalyCategoryFilter !== 'All' ? anomalyCategoryFilter : undefined,
          severity: anomalySeverityFilter !== 'All' ? anomalySeverityFilter : undefined,
        }),
        api.getAnomalyThresholds().catch(() => ({})),
      ]);
      setData(analyticsData);
      setEmployees(empList);
      setAnomalyReport(anomalyData);
      if (thresholdsData && Object.keys(thresholdsData).length > 0) {
        setThresholds(thresholdsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load risk analytics');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [anomalyDept, anomalyCategoryFilter, anomalySeverityFilter]);



  const handleRecalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecalculating(true);
    setRecalcError(null);
    try {
      const result = await api.recalculateRisk({
        employee_id: recalcEmpId,
        lookback_window: lookbackWindow,
      });
      setRecalcResult(result);
      if (!isAnalyst) {
        const refreshed = await api.getAnalytics();
        setData(refreshed);
      }
    } catch (err: any) {
      setRecalcError(err.message || 'Failed to recompute risk score');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDeptClick = (department: string) => {
    router.push(`/employees?department=${encodeURIComponent(department)}`);
  };

  const handleExportFleetReport = async () => {
    if (!canExport) {
      setExportMessage('Access Restricted: Fleet Risk Report export is restricted to Administrator and Security Manager roles.');
      setTimeout(() => setExportMessage(null), 4000);
      return;
    }
    try {
      setIsExporting(true);
      const csvData = await api.exportFleetAnalyticsCsv();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ams_fleet_risk_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setExportMessage(err.message || 'Fleet report export failed');
      setTimeout(() => setExportMessage(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAnomalyReport = async () => {
    if (!canExport) {
      setAnomalyExportMsg('Access Restricted: Anomaly report export is restricted to Administrator and Security Manager roles.');
      setTimeout(() => setAnomalyExportMsg(null), 4000);
      return;
    }
    try {
      setIsExportingAnomaly(true);
      const csvData = await api.exportAnomalyReportCsv({
        department: anomalyDept !== 'All' ? anomalyDept : undefined,
        anomaly_category: anomalyCategoryFilter !== 'All' ? anomalyCategoryFilter : undefined,
        severity: anomalySeverityFilter !== 'All' ? anomalySeverityFilter : undefined,
      });

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ams_anomaly_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setAnomalyExportMsg(err.message || 'Anomaly report export failed');
      setTimeout(() => setAnomalyExportMsg(null), 4000);
    } finally {
      setIsExportingAnomaly(false);
    }
  };


  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={36} className="animate-spin text-violet-400" />
        <span className="text-xs font-medium">Computing multi-dimensional risk models...</span>
      </div>
    );
  }


  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        {error || 'Unable to load analytics'}
      </div>
    );
  }

  const { kpis, threat_velocity, risk_distribution, score_distribution, department_breakdown } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Risk Analytics & Behavioral Intelligence</h1>
          <p className="text-xs text-slate-400 mt-1">
            7-Day organizational threat velocity, score distributions, departmental exposures, and live rule recomputations
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Anomaly taxonomy and risk categories informed by CERT, CMU, and LANL insider-threat research datasets
            </span>
          </div>
        </div>


        <div className="flex flex-col items-start sm:items-end gap-1.5 self-start sm:self-auto">
          <button
            onClick={handleExportFleetReport}
            disabled={isExporting}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              canExport
                ? 'bg-violet-600/15 border border-violet-500/30 text-violet-300 hover:bg-violet-600/25 hover:text-white cursor-pointer'
                : 'bg-white/[0.03] border border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-400 cursor-not-allowed'
            }`}
            title={canExport ? 'Export Organizational Fleet Risk Analytics to CSV' : 'Fleet report export restricted to Admin & Security Manager'}
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin text-violet-400" />
            ) : canExport ? (
              <Download size={14} />
            ) : (
              <Lock size={14} className="text-amber-400" />
            )}
            <span>Export Fleet Report (CSV)</span>
            {!canExport && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">
                Admin/Mgr Only
              </span>
            )}
          </button>
          {exportMessage && (
            <span className="text-[11px] text-amber-300 animate-in fade-in">
              {exportMessage}
            </span>
          )}
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard variant="elevated" className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
              Total Monitored
            </span>
            <div className="text-3xl font-extrabold text-white font-mono">{kpis.total_employees}</div>
            <span className="text-[10px] text-slate-400 font-medium">Entities in fleet</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-300">
            <ChartIcon size={22} />
          </div>
        </GlassCard>

        <GlassCard
          variant="elevated"
          className="p-5 flex items-center justify-between cursor-pointer hover:border-rose-500/50 transition-colors"
          onClick={() => router.push('/employees?risk_category=Critical')}
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-rose-400">
              Critical Threats
            </span>
            <div className="text-3xl font-extrabold text-rose-400 font-mono">
              {kpis.critical_risk_alerts}
            </div>
            <span className="text-[10px] text-rose-400/80 font-medium">80%+ Threat Index</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <ShieldAlert size={22} />
          </div>
        </GlassCard>

        <GlassCard
          variant="elevated"
          className="p-5 flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-colors"
          onClick={() => router.push('/employees?risk_category=High')}
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-amber-400">
              High Risk Tier
            </span>
            <div className="text-3xl font-extrabold text-amber-400 font-mono">
              {kpis.high_risk_users}
            </div>
            <span className="text-[10px] text-amber-400/80 font-medium">60-80% Exposure Band</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <AlertTriangle size={22} />
          </div>
        </GlassCard>

        <GlassCard variant="elevated" className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
              Avg Threat Score
            </span>
            <div className="text-3xl font-extrabold text-violet-300 font-mono">
              {kpis.avg_threat_score}%
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Normal variance</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-300">
            <Activity size={22} />
          </div>
        </GlassCard>
      </div>

      {/* 7-Day Velocity & Anomaly Trends Chart */}
      <ThreatVelocityChart
        data={threat_velocity}
        onEnlarge={() => setEnlargedChart('velocity')}
      />

      {/* Distribution Charts: Risk Donut + Score Bands Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskDonutChart
          data={risk_distribution}
          totalCount={kpis.total_employees}
          onEnlarge={() => setEnlargedChart('donut')}
        />
        <ScoreBarChart
          data={score_distribution}
          onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
          onEnlarge={() => setEnlargedChart('bars')}
        />
      </div>


      {/* Department Risk Breakdown + Live Risk Recalculation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Risk Breakdown */}
        <GlassCard variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-violet-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Department Risk Breakdown
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Click department to filter directory</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {department_breakdown.map((dept) => {
              const tierStyles = getRiskTierColor(dept.risk_category);
              return (
                <div
                  key={dept.department}
                  onClick={() => handleDeptClick(dept.department)}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-violet-300">
                        {dept.department}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({dept.employee_count} personnel)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      {dept.high_risk_count > 0 ? (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          ● {dept.high_risk_count} High/Critical Risks
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">● 0 High Risk Alerts</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-white block">
                        {dept.avg_risk_score}%
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">Avg Score</span>
                    </div>
                    <RiskBadge tier={dept.risk_category} size="sm" />
                    <ArrowRight
                      size={14}
                      className="text-slate-500 group-hover:text-violet-300 group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Live Risk Recalculation Engine Panel */}
        <GlassCard variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <RotateCcw size={18} className="text-violet-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Rule-Based Risk Recalculator
                </h3>
                <p className="text-xs text-slate-400">
                  {isAnalyst
                    ? 'Analyst Preview Mode: Computes 5-factor decomposition for triage without mutating the database'
                    : 'Trigger deterministic 5-factor scoring engine over telemetry windows & persist results'}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${
                isAnalyst
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-violet-600/20 text-violet-300 border-violet-500/30'
              }`}
            >
              {isAnalyst ? 'Preview Mode' : 'Live Engine'}
            </span>
          </div>

          <form onSubmit={handleRecalculate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Employee selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Target Employee
                </label>
                <select
                  value={recalcEmpId}
                  onChange={(e) => setRecalcEmpId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.id} - {emp.threat_score}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Lookback Window */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Lookback Window
                </label>
                <select
                  value={lookbackWindow}
                  onChange={(e) => setLookbackWindow(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors font-mono"
                >
                  <option value="6h">Past 6 Hours</option>
                  <option value="12h">Past 12 Hours</option>
                  <option value="24h">Past 24 Hours</option>
                  <option value="48h">Past 48 Hours</option>
                  <option value="7d">Past 7 Days</option>
                </select>
              </div>
            </div>

            {isAnalyst && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  <strong>IAM Least-Privilege Notice:</strong> As a Security Analyst, your computations run in read-only preview mode. Scores are computed live for triage without altering persisted employee records.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isRecalculating}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isAnalyst
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.35)]'
              }`}
            >
              {isRecalculating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Computing Rule-Based Threat Index...</span>
                </>
              ) : isAnalyst ? (
                <>
                  <Eye size={14} />
                  <span>Compute Risk Preview (Non-Persisting)</span>
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  <span>Recalculate & Persist Risk Score</span>
                </>
              )}
            </button>
          </form>

          {/* Recalculation Results Dossier */}
          {recalcResult && (
            <div className="p-4 rounded-xl bg-black/40 border border-violet-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold ${recalcResult.preview_mode ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {recalcResult.preview_mode ? <Eye size={15} /> : <CheckCircle2 size={15} />}
                  <span>
                    {recalcResult.preview_mode
                      ? `Calculation Preview (Read-Only): ${recalcResult.employee_name}`
                      : `Score Recalculated & Persisted: ${recalcResult.employee_name}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">{recalcResult.previous_score}%</span>
                  <span className="text-violet-400 font-bold">→</span>
                  <span className="text-white font-bold text-sm">{recalcResult.new_score}%</span>
                  <RiskBadge tier={recalcResult.new_tier} size="sm" />
                </div>
              </div>


              {/* 5 Component Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-violet-400" />
                  Weighted Factor Decomposition (Formula §7):
                </span>
                {recalcResult.components.map((comp) => (
                  <div
                    key={comp.name}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs hover:border-violet-500/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">{comp.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-600/15 text-violet-300 font-mono font-medium">
                          {Math.round(comp.weight * 100)}% wt
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{comp.description}</span>
                    </div>
                    <div className="text-right font-mono flex-shrink-0 ml-2">
                      <span className="font-bold text-violet-300">
                        {comp.raw_score} × {Math.round(comp.weight * 100)}%
                      </span>
                      <span className="text-[10px] text-emerald-400 block font-bold">
                        = +{comp.weighted_score} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-1 text-right">
                Analyzed {recalcResult.events_analyzed} telemetry logs • Timestamp: {new Date(recalcResult.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}

          {recalcError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {recalcError}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Anomaly Detection & Behavioral Forensic Reports (Milestone 2 A3) */}
      <GlassCard variant="elevated" className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-violet-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Anomaly Detection & Forensic Reports
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dedicated forensic audit reports for anomalous behaviors, organizational filtering, and compliance exports
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter */}
            <select
              value={anomalyDept}
              onChange={(e) => setAnomalyDept(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="All">All Departments</option>
              <option value="Finance">Finance</option>
              <option value="IT Infrastructure">IT Infrastructure</option>
              <option value="R&D AI Labs">R&D AI Labs</option>
              <option value="Enterprise Sales">Enterprise Sales</option>
              <option value="Supply Chain">Supply Chain</option>
              <option value="Cloud Platform">Cloud Platform</option>
              <option value="Legal & Compliance">Legal & Compliance</option>
              <option value="Human Resources">Human Resources</option>
            </select>

            {/* Category Filter */}
            <select
              value={anomalyCategoryFilter}
              onChange={(e) => setAnomalyCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="All">All Anomaly Categories</option>
              <option value="UNUSUAL_LOGIN_TIME">Unusual Login Time</option>
              <option value="ABNORMAL_DATA_DOWNLOAD">Abnormal Data Download</option>
              <option value="UNAUTHORIZED_ACCESS_ATTEMPT">Unauthorized Access Attempt</option>
              <option value="EXCESSIVE_FILE_TRANSFER">Excessive File Transfer</option>
              <option value="SUSPICIOUS_DEVICE_USAGE">Suspicious Device Usage</option>
            </select>

            {/* Detection Thresholds Inspector Trigger Button (Milestone 2 Round 2) */}
            <button
              type="button"
              onClick={() => setShowThresholdsModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-violet-600/10 border border-violet-500/25 text-violet-300 hover:bg-violet-600/20 hover:text-white transition-all cursor-pointer"
              title="Inspect live mathematical detection thresholds from the rule-based anomaly engine"
            >
              <Sliders size={13} className="text-violet-400" />
              <span>Detection Thresholds</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportAnomalyReport}
              disabled={isExportingAnomaly}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                canExport
                  ? 'bg-violet-600/15 border border-violet-500/30 text-violet-300 hover:bg-violet-600/25 hover:text-white cursor-pointer'
                  : 'bg-white/[0.03] border border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-400 cursor-not-allowed'
              }`}
              title={canExport ? 'Export Dedicated Anomaly Report as CSV' : 'Anomaly report export restricted to Administrator and Security Manager'}
            >
              {isExportingAnomaly ? (
                <Loader2 size={13} className="animate-spin text-violet-400" />
              ) : canExport ? (
                <Download size={13} />
              ) : (
                <Lock size={13} className="text-amber-400" />
              )}
              <span>Export Anomaly Report (CSV)</span>
              {!canExport && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono">
                  Admin/Mgr
                </span>
              )}
            </button>
          </div>
        </div>

        {anomalyExportMsg && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Lock size={14} />
            <span>{anomalyExportMsg}</span>
          </div>
        )}

        {/* Feature 5: Anomaly Category Quick-Filter Chips */}
        {anomalyReport && anomalyReport.category_counts && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
              Category Filters:
            </span>
            {[
              { key: 'UNUSUAL_LOGIN_TIME', label: 'Unusual Login Time' },
              { key: 'ABNORMAL_DATA_DOWNLOAD', label: 'Abnormal Data Download' },
              { key: 'UNAUTHORIZED_ACCESS_ATTEMPT', label: 'Unauthorized Access Attempt' },
              { key: 'EXCESSIVE_FILE_TRANSFER', label: 'Excessive File Transfer' },
              { key: 'SUSPICIOUS_DEVICE_USAGE', label: 'Suspicious Device Usage' },
            ].map((cat) => {
              const count = anomalyReport.category_counts[cat.key] || 0;
              const isSelected = anomalyCategoryFilter === cat.key;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setAnomalyCategoryFilter(isSelected ? 'All' : cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] border border-violet-400'
                      : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08] hover:border-violet-500/30'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-violet-500/20 text-violet-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
            {anomalyCategoryFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setAnomalyCategoryFilter('All')}
                className="text-[11px] text-violet-400 hover:text-violet-300 underline ml-1 cursor-pointer font-medium"
              >
                Clear Category
              </button>
            )}
          </div>
        )}

        {/* Milestone 2 Round 2 Feature 4: Anomaly Severity Quick-Toggle Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
            Severity Filters:
          </span>
          {[
            { key: 'All', label: 'All Severities' },
            { key: 'CRITICAL', label: 'Critical' },
            { key: 'HIGH', label: 'High' },
            { key: 'MEDIUM', label: 'Medium' },
          ].map((sev) => {
            const isSelected = anomalySeverityFilter === sev.key;
            return (
              <button
                key={sev.key}
                type="button"
                onClick={() => setAnomalySeverityFilter(sev.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? sev.key === 'CRITICAL'
                      ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] border border-rose-400'
                      : sev.key === 'HIGH'
                      ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)] border border-amber-400'
                      : sev.key === 'MEDIUM'
                      ? 'bg-sky-600 text-white shadow-[0_0_10px_rgba(56,189,248,0.4)] border border-sky-400'
                      : 'bg-violet-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)] border border-violet-400'
                    : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                <span>{sev.label}</span>
              </button>
            );
          })}
          {(anomalyCategoryFilter !== 'All' || anomalySeverityFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setAnomalyCategoryFilter('All');
                setAnomalySeverityFilter('All');
              }}
              className="text-[11px] text-violet-400 hover:text-violet-300 underline ml-2 cursor-pointer font-medium"
            >
              Reset All Filters
            </button>
          )}
        </div>



        {/* Anomaly Events Table */}
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Risk Tier</th>
                <th className="px-4 py-3">Anomaly Category</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Source IP</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {anomalyReport?.events && anomalyReport.events.length > 0 ? (
                anomalyReport.events.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setSelectedEmployeeId(ev.employee_id)}
                    className="hover:bg-violet-500/10 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono">
                      <span className="font-bold text-white block hover:text-violet-300">
                        {ev.employee_name}
                      </span>
                      <span className="text-[10px] text-slate-400">{ev.employee_id}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{ev.department}</td>
                    <td className="px-4 py-3">
                      <RiskBadge tier={ev.risk_category} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap font-mono">
                          {ev.anomaly_category.replace(/_/g, ' ')}
                        </span>
                        <MitreBadge
                          techniqueId={ev.mitre_technique_id || (ev.anomaly_category === 'UNUSUAL_LOGIN_TIME' ? 'T1078' : ev.anomaly_category === 'ABNORMAL_DATA_DOWNLOAD' ? 'T1048' : ev.anomaly_category === 'UNAUTHORIZED_ACCESS_ATTEMPT' ? 'T1098' : 'T1052')}
                          techniqueName={ev.mitre_technique_name}
                          size="sm"
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono font-semibold text-violet-300">
                      {ev.event_type}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge severity={ev.severity} size="sm" />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{ev.source_ip}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                      {ev.description}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleDateString()} {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No anomaly records match the selected department and category filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Intelligence Profile Slide-over Drawer */}
      <ProfileDrawer
        employeeId={selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        onUpdate={() => fetchAnalytics(true)}
      />

      {/* Enlarged Threat Velocity Modal */}
      {enlargedChart === 'velocity' && (
        <LightboxModal
          isOpen={true}
          onClose={() => setEnlargedChart(null)}
          title="7-Day Organizational Threat Velocity & Anomaly Trends"
          subtitle="Longitudinal time-series analysis of fleet threat momentum, risk deltas, and incident density"
          badge="7-Day Window"
          badgeColor="violet"
          maxWidth="5xl"
        >
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
              <ThreatVelocityChart data={threat_velocity} />
            </div>

            {/* Detailed Day-by-Day Data Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Daily Metric Breakdown
              </span>
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/5">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Day</th>
                      <th className="px-4 py-2.5">Average Threat Score</th>
                      <th className="px-4 py-2.5">Day-over-Day Velocity Delta</th>
                      <th className="px-4 py-2.5">Anomalies Detected</th>
                      <th className="px-4 py-2.5">Risk Tier Band</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {threat_velocity.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2 text-white">{pt.date_str}</td>
                        <td className="px-4 py-2 text-slate-400">{pt.day_label}</td>
                        <td className="px-4 py-2 font-bold text-violet-300">{pt.avg_score}%</td>
                        <td className="px-4 py-2">
                          <span className={pt.velocity_delta > 0 ? 'text-rose-400 font-bold' : pt.velocity_delta < 0 ? 'text-emerald-400' : 'text-slate-400'}>
                            {pt.velocity_delta > 0 ? `+${pt.velocity_delta}%` : `${pt.velocity_delta}%`}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-bold text-amber-300">{pt.anomalies_count}</td>
                        <td className="px-4 py-2">
                          <RiskBadge tier={pt.zone} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </LightboxModal>
      )}

      {/* Enlarged Risk Donut Modal */}
      {enlargedChart === 'donut' && (
        <LightboxModal
          isOpen={true}
          onClose={() => setEnlargedChart(null)}
          title="Workforce Risk Tier Distribution"
          subtitle="Proportional categorization of entire monitored fleet across standardized behavioral threat tiers"
          badge={`${kpis.total_employees} Monitored Entities`}
          badgeColor="amber"
          maxWidth="3xl"
        >
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
              <RiskDonutChart data={risk_distribution} totalCount={kpis.total_employees} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {risk_distribution.map((item) => (
                <div
                  key={item.name}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-white uppercase">{item.name}</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">{item.count}</div>
                  <span className="text-[10px] text-slate-400 font-mono">{item.percentage}% of fleet</span>
                </div>
              ))}
            </div>
          </div>
        </LightboxModal>
      )}

      {/* Enlarged Score Band Distribution Modal */}
      {enlargedChart === 'bars' && (
        <LightboxModal
          isOpen={true}
          onClose={() => setEnlargedChart(null)}
          title="Threat Score Band Histogram"
          subtitle="Distribution of employee population across 20% threat score intervals"
          badge="Score Spectrum"
          badgeColor="violet"
          maxWidth="4xl"
        >
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
              <ScoreBarChart
                data={score_distribution}
                onSelectEmployee={(empId) => {
                  setEnlargedChart(null);
                  setSelectedEmployeeId(empId);
                }}
              />
            </div>
          </div>
        </LightboxModal>
      )}

      {/* Behavioral Anomaly Detection Thresholds Modal (Milestone 2 Round 2) */}
      {showThresholdsModal && (

        <LightboxModal
          isOpen={true}
          onClose={() => setShowThresholdsModal(false)}
          title="Behavioral Anomaly Detection Thresholds (Modeled After CERT / CMU Research)"
          subtitle="Inspectable deterministic trigger conditions for the rule-based anomaly detection engine"
          badge="5 Active Engine Rules"
          badgeColor="violet"
          maxWidth="4xl"
        >

          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs flex items-center gap-2">
              <ShieldCheck size={16} className="text-violet-400 flex-shrink-0" />
              <span>
                Transparency Audit: The rules below represent the active mathematical criteria evaluated against telemetry streams to flag anomalous insider behaviors.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {Object.values(thresholds || {}).map((item) => (
                <div
                  key={item.category}
                  className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 hover:border-violet-500/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white tracking-wide">
                        {item.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/25 font-mono">
                        {item.cert_taxonomy}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <span className="text-slate-500">MITRE ATT&CK:</span>
                      <span className="font-bold text-amber-300">{item.mitre_id}</span>
                      <span>({item.mitre_name})</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    <strong className="text-violet-300 font-mono">Trigger Condition: </strong>
                    {item.condition}
                  </p>

                  {item.metrics && Object.keys(item.metrics).length > 0 && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                        Engine Parameters & Threshold Limits:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.entries(item.metrics).map(([k, v]) => (
                          <div key={k} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] font-mono">
                            <span className="text-slate-400 block text-[10px]">{k.replace(/_/g, ' ')}</span>
                            <span className="text-white font-semibold">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </LightboxModal>
      )}
    </div>



  );
}

