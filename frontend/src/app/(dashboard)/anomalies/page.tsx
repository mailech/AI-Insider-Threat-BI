'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AnomalyReportResponse, AnomalyEvent, AnomalyThreshold } from '@/lib/types';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { MitreBadge } from '@/components/ui/MitreBadge';
import { ProfileDrawer } from '@/components/drawer/ProfileDrawer';
import { LightboxModal } from '@/components/ui/LightboxModal';
import { ThreatInvestigationModal } from '@/components/incidents/ThreatInvestigationModal';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  Download,
  Lock,
  Loader2,
  Search,
  Sliders,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
  ExternalLink,
  Info,
  CheckCircle2,
  RefreshCw,
  AlertOctagon,
  Flame,
  RotateCcw,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function AnomalyIntelligencePage() {
  const { user } = useAuth();
  const [report, setReport] = useState<AnomalyReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');

  // Interactive UI States
  const [expandedAnomalyId, setExpandedAnomalyId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [copiedIpId, setCopiedIpId] = useState<number | null>(null);
  const [liveAutoRefresh, setLiveAutoRefresh] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Milestone 3 Polish: 1-Click Escalation & Investigation Modal State
  const [selectedIncidentIdForModal, setSelectedIncidentIdForModal] = useState<string | number | null>(null);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState<boolean>(false);
  const [escalatingLogId, setEscalatingLogId] = useState<number | null>(null);


  // Thresholds Modal State
  const [showThresholdsModal, setShowThresholdsModal] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<Record<string, AnomalyThreshold>>({});

  const canExport = user?.role === 'Administrator' || user?.role === 'Security Manager';

  const departments = ['All', 'Engineering', 'Finance', 'Human Resources', 'Sales', 'Executive'];
  const categories = [
    'All',
    'UNUSUAL_LOGIN_TIME',
    'ABNORMAL_DATA_DOWNLOAD',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'EXCESSIVE_FILE_TRANSFERS',
    'SUSPICIOUS_DEVICE_USAGE',
    'INSIDER_RISK_INDICATORS',
  ];

  const fetchAnomalies = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [anomalyData, thresholdsData] = await Promise.all([
        api.getAnomalyReport({
          department: departmentFilter !== 'All' ? departmentFilter : undefined,
          anomaly_category: categoryFilter !== 'All' ? categoryFilter : undefined,
          severity: severityFilter !== 'All' ? severityFilter : undefined,
        }),
        api.getAnomalyThresholds().catch(() => ({})),
      ]);
      setReport(anomalyData);
      if (thresholdsData && Object.keys(thresholdsData).length > 0) {
        setThresholds(thresholdsData);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load anomaly intelligence feed');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [departmentFilter, categoryFilter, severityFilter]);

  // Live 5-Second Polling
  useEffect(() => {
    if (!liveAutoRefresh) return;
    const interval = setInterval(() => {
      fetchAnomalies(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [liveAutoRefresh, departmentFilter, categoryFilter, severityFilter]);

  const handleExportCSV = async () => {
    if (!canExport) {
      setExportMessage('Access Restricted: Anomaly report export is restricted to Security Manager and Administrator roles.');
      setTimeout(() => setExportMessage(null), 5000);
      return;
    }

    setIsExporting(true);
    try {
      const csvData = await api.exportAnomalyReportCsv({
        department: departmentFilter !== 'All' ? departmentFilter : undefined,
        anomaly_category: categoryFilter !== 'All' ? categoryFilter : undefined,
        severity: severityFilter !== 'All' ? severityFilter : undefined,
      });

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ams_anomaly_intelligence_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportMessage(`Export failed: ${err.message || 'Error generating CSV'}`);
      setTimeout(() => setExportMessage(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyIp = (id: number, ip: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ip);
    setCopiedIpId(id);
    setTimeout(() => setCopiedIpId(null), 2000);
  };

  // Client-side search filtering across employee name, ID, category, MITRE technique, and description
  const filteredEvents = useMemo(() => {
    if (!report?.events) return [];
    if (!searchQuery.trim()) return report.events;
    const q = searchQuery.toLowerCase();
    return report.events.filter((ev) => {
      const matchEmp = ev.employee_name?.toLowerCase().includes(q) || ev.employee_id?.toLowerCase().includes(q);
      const matchCat = ev.anomaly_category?.toLowerCase().includes(q);
      const matchMitre = (ev.mitre_technique_id?.toLowerCase().includes(q)) || (ev.mitre_technique_name?.toLowerCase().includes(q));
      const matchDesc = ev.description?.toLowerCase().includes(q);
      const matchIp = ev.source_ip?.toLowerCase().includes(q);
      return matchEmp || matchCat || matchMitre || matchDesc || matchIp;
    });
  }, [report?.events, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldAlert className="text-violet-400" size={28} />
              Anomaly Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
              Fleet-Wide Feed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time behavioral anomalies, threat vectors & MITRE ATT&CK intelligence across all workforce entities
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Thresholds Inspector Modal Button */}
          <button
            type="button"
            onClick={() => setShowThresholdsModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:border-violet-500/30 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Inspect Behavioral Anomaly Thresholds & Detection Rules (modeled after CERT / CMU insider-threat research)"
          >
            <Sliders size={14} className="text-violet-400" />
            <span>Detection Rules</span>
          </button>


          {/* Live Auto-Refresh Toggle */}
          <button
            type="button"
            onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              liveAutoRefresh
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Live 5-Second Anomaly Polling"
          >
            <Radio size={14} className={liveAutoRefresh ? 'animate-pulse text-emerald-400' : ''} />
            <span>{liveAutoRefresh ? 'Live Polling (5s Active)' : 'Live Polling: Off'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              canExport
                ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30 hover:text-white cursor-pointer shadow-sm'
                : 'bg-white/[0.03] border border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-400 cursor-not-allowed'
            }`}
            title={canExport ? 'Export Anomaly Intelligence Report as CSV' : 'Anomaly report export restricted to Security Manager and Admin'}
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin text-violet-400" />
            ) : canExport ? (
              <Download size={14} />
            ) : (
              <Lock size={14} className="text-amber-400" />
            )}
            <span>Export Anomaly Report</span>
            {!canExport && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">
                Admin/Mgr
              </span>
            )}
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Lock size={14} />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Top KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard variant="elevated" className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
              Total Flagged Anomalies
            </span>
            <div className="text-2xl font-black text-white font-mono">
              {report?.total_anomalies || 0}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Fleet-wide detection engine
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            <ShieldAlert size={22} />
          </div>
        </GlassCard>

        <GlassCard variant="elevated" className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
              Critical Severity Anomalies
            </span>
            <div className="text-2xl font-black text-rose-400 font-mono">
              {report?.critical_count || 0}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Immediate triage required
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-600/15 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <AlertTriangle size={22} />
          </div>
        </GlassCard>

        <GlassCard variant="elevated" className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
              Active MITRE Techniques
            </span>
            <div className="text-2xl font-black text-violet-300 font-mono">
              {report?.active_mitre_techniques_count || 0}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Enterprise ATT&CK coverage
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Activity size={22} />
          </div>
        </GlassCard>

        <GlassCard variant="elevated" className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
              Most Affected Department
            </span>
            <div className="text-xl font-black text-amber-400 font-mono truncate max-w-[160px]" title={report?.most_affected_department || 'None'}>
              {report?.most_affected_department || 'None'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Highest anomaly density
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-600/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Filter size={22} />
          </div>
        </GlassCard>
      </div>

      {/* Visual Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Anomaly Category Distribution */}
        <GlassCard variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldAlert size={15} className="text-violet-400" />
              Anomaly Category Breakdown
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {Object.keys(report?.category_counts || {}).length} categories active
            </span>
          </div>

          <div className="space-y-2.5">
            {report?.category_counts && Object.keys(report.category_counts).length > 0 ? (
              Object.entries(report.category_counts)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => {
                  const total = report.filtered_count || report.total_anomalies || 1;
                  const pct = Math.round((count / total) * 100);
                  const isSelected = categoryFilter === category;

                  return (
                    <div
                      key={category}
                      onClick={() => setCategoryFilter(isSelected ? 'All' : category)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600/20 border-violet-500/40 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                          : 'bg-black/30 border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                          {category.replace(/_/g, ' ')}
                          {category === 'INSIDER_RISK_INDICATORS' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              AMS-Extended
                            </span>
                          )}
                        </span>
                        <span className="text-violet-300 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400 transition-all duration-300"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );

                })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No anomaly category distribution available</div>
            )}
          </div>
        </GlassCard>

        {/* Card 2: MITRE ATT&CK Technique Frequency */}
        <GlassCard variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity size={15} className="text-indigo-400" />
              MITRE ATT&CK Technique Frequency
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Mapped threat vectors
            </span>
          </div>

          <div className="space-y-2.5">
            {report?.mitre_technique_counts && Object.keys(report.mitre_technique_counts).length > 0 ? (
              Object.entries(report.mitre_technique_counts)
                .sort((a, b) => b[1] - a[1])
                .map(([techLabel, count]) => {
                  const total = report.filtered_count || report.total_anomalies || 1;
                  const pct = Math.round((count / total) * 100);
                  const techId = techLabel.split(' - ')[0];

                  return (
                    <div key={techLabel} className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {techId}
                          </span>
                          <span className="text-slate-300 font-medium truncate max-w-[220px]">
                            {techLabel.includes(' - ') ? techLabel.split(' - ')[1] : techLabel}
                          </span>
                        </div>
                        <span className="text-indigo-300 font-mono font-bold">{count} hits ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-300"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No active MITRE ATT&CK techniques in current filter</div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Fleet Anomaly Stream Table Section */}
      <GlassCard variant="elevated" className="p-5 space-y-4">
        {/* Table Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search employee, ID, MITRE technique, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Filter Dropdowns & Severity Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Department Dropdown */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-[#12111d] text-white">
                  Dept: {dept}
                </option>
              ))}
            </select>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer max-w-[200px] truncate"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#12111d] text-white">
                  {cat === 'All'
                    ? 'Category: All'
                    : cat === 'INSIDER_RISK_INDICATORS'
                    ? 'Category: Insider Risk (AMS-Extended)'
                    : `Category: ${cat.replace(/_/g, ' ')}`}
                </option>
              ))}
            </select>


            {/* Severity Pills */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
              {['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                const isSelected = severityFilter === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? sev === 'CRITICAL'
                          ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                          : sev === 'HIGH'
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                          : 'bg-violet-600/25 text-violet-300 border border-violet-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev === 'All' ? 'All' : sev.charAt(0) + sev.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results Count Strip */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>Showing <strong className="text-white">{filteredEvents.length}</strong> of <strong className="text-slate-300">{report?.total_anomalies || 0}</strong> anomalies</span>
            {(departmentFilter !== 'All' || categoryFilter !== 'All' || severityFilter !== 'All' || searchQuery.trim().length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setDepartmentFilter('All');
                  setCategoryFilter('All');
                  setSeverityFilter('All');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                title="Clear all active anomaly filters and search query"
              >
                <RotateCcw size={12} className="text-violet-400" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {liveAutoRefresh && (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live synced {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <span>Click row to expand payload inspector</span>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-violet-400" />
            <span className="text-xs">Loading fleet anomaly records...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-center">
            <CheckCircle2 size={36} className="text-emerald-400" />
            <h4 className="text-sm font-bold text-white">No Matching Behavioral Anomalies</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              All events in the current selection fall within normal behavioral baselines.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Anomaly Category</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">MITRE ATT&CK</th>
                  <th className="px-4 py-3">Source IP</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEvents.map((event) => {
                  const isExpanded = expandedAnomalyId === event.id;
                  return (
                    <React.Fragment key={event.id}>
                      <tr
                        onClick={() => setExpandedAnomalyId(isExpanded ? null : event.id)}
                        className={`hover:bg-violet-500/10 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-violet-600/10' : ''
                        }`}
                      >
                        {/* Employee */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-300 font-mono">
                              {event.employee_id.replace('emp_', '')}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{event.employee_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{event.employee_id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {event.department}
                        </td>

                        {/* Anomaly Category */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                            {event.anomaly_category.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Severity */}
                        <td className="px-4 py-3">
                          <RiskBadge severity={event.severity} size="sm" />
                        </td>

                        {/* MITRE ATT&CK */}
                        <td className="px-4 py-3">
                          {event.mitre_technique_id ? (
                            <MitreBadge
                              techniqueId={event.mitre_technique_id}
                              techniqueName={event.mitre_technique_name}
                              size="sm"
                            />
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Source IP */}
                        <td
                          className="px-4 py-3 font-mono text-slate-300 hover:text-violet-300 cursor-pointer"
                          onClick={(e) => handleCopyIp(event.id, event.source_ip, e)}
                          title="Click to copy IP address"
                        >
                          <span className="flex items-center gap-1">
                            {event.source_ip}
                            {copiedIpId === event.id && <Check size={10} className="text-emerald-400" />}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={event.description}>
                          {event.description}
                        </td>

                        {/* Timestamp */}
                        <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(event.timestamp)}
                        </td>

                        {/* Actions: Incident Escalation & Dossier Inspector */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {event.has_incident && event.incident_id ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIncidentIdForModal(event.incident_id || null);
                                  setIsInvestigationModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-[10px] font-mono font-bold inline-flex items-center gap-1 transition-all"
                                title="Open Threat Investigation Dossier for this incident"
                              >
                                <AlertOctagon size={11} />
                                <span>{event.incident_id}</span>
                              </button>
                            ) : (user?.role === 'Administrator' || user?.role === 'Security Manager' || user?.role === 'SOC Engineer') ? (
                              <button
                                type="button"
                                disabled={escalatingLogId === event.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    setEscalatingLogId(event.id);
                                    const inc = await api.escalateAnomalyToIncident(event.id);
                                    await fetchAnomalies(true);
                                    setSelectedIncidentIdForModal(inc.incident_id);
                                    setIsInvestigationModalOpen(true);
                                  } catch (err: any) {
                                    alert(`Escalation failed: ${err.message || 'Error creating incident'}`);
                                  } finally {
                                    setEscalatingLogId(null);
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/40 text-[10px] font-semibold inline-flex items-center gap-1 transition-all shadow-sm"
                                title="Manually escalate anomaly to SOC Incident Queue"
                              >
                                <Flame size={11} className={cn(escalatingLogId === event.id && 'animate-spin')} />
                                <span>{escalatingLogId === event.id ? 'Escalating...' : 'Escalate to SOC'}</span>
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployeeId(event.employee_id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 hover:text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                              title={`Inspect ${event.employee_name}'s behavioral profile drawer`}
                            >
                              <span>Inspect</span>
                              <ArrowRight size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>


                      {/* Expandable Payload Inspector */}
                      {isExpanded && event.payload && (
                        <tr className="bg-black/40 border-b border-violet-500/20">
                          <td colSpan={9} className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-violet-300 flex items-center gap-2">
                                <Info size={14} /> Anomaly Payload & Event Telemetry Context
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">Event Type: {event.event_type}</span>
                            </div>

                            <div className="p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-[11px] space-y-1 text-slate-300">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {Object.entries(event.payload).map(([k, v]) => (
                                  <div key={k} className="p-1.5 rounded bg-white/[0.02] border border-white/5 truncate">
                                    <span className="text-slate-500 font-semibold">{k}: </span>
                                    <span className="text-white">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Profile Drawer Component for Selected Employee */}
      <ProfileDrawer
        employeeId={selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        onUpdate={() => fetchAnomalies(true)}
      />


      {/* Detection Rules & Thresholds Lightbox Modal */}
      {showThresholdsModal && (
        <LightboxModal
          isOpen={showThresholdsModal}
          onClose={() => setShowThresholdsModal(false)}
          title="Behavioral Anomaly Detection Rules & Thresholds"
          subtitle="Inspectable deterministic rules and threshold limits modeled after CERT / CMU insider-threat research categories"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/30 text-xs text-violet-300">
              The detection engine applies deterministic multi-factor rules and statistical variance thresholds modeled after CERT / CMU insider-threat research categories and MITRE ATT&CK enterprise matrices.
            </div>

            <div className="grid grid-cols-1 gap-3">
              {Object.entries(thresholds).map(([catKey, item]) => (
                <div key={catKey} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {item.mitre_id} ({item.mitre_name})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Category Class: {item.cert_taxonomy}
                    </span>
                  </div>


                  <p className="text-xs text-slate-300 font-sans">
                    <strong className="text-slate-400">Trigger Condition: </strong>
                    {item.condition}
                  </p>

                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 font-mono text-[11px] text-slate-400 flex flex-wrap gap-3">
                    {Object.entries(item.metrics).map(([k, v]) => (
                      <span key={k}>
                        <span className="text-slate-500">{k}: </span>
                        <strong className="text-slate-200">{String(v)}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LightboxModal>
      )}

      {/* Threat Investigation Evidence Modal */}
      <ThreatInvestigationModal
        incidentId={selectedIncidentIdForModal}
        isOpen={isInvestigationModalOpen}
        onClose={() => setIsInvestigationModalOpen(false)}
        onStatusChanged={() => fetchAnomalies(true)}
      />
    </div>
  );
}

