'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TelemetryLog, TelemetrySummary, EmployeeListItem } from '@/lib/types';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import {
  Activity,

  ShieldAlert,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Code,
  FileText,
  Loader2,
  Filter,
  Download,
  Radio,
  RefreshCw,
  RotateCcw,
  Lock,
  AlertOctagon,
  Flame,
} from 'lucide-react';
import { ThreatInvestigationModal } from '@/components/incidents/ThreatInvestigationModal';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function TelemetryPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Milestone 3 Polish: 1-Click Escalation & Threat Investigation Modal
  const [selectedIncidentIdForModal, setSelectedIncidentIdForModal] = useState<string | number | null>(null);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState<boolean>(false);
  const [escalatingLogId, setEscalatingLogId] = useState<number | null>(null);


  const canExport = user?.role === 'Administrator' || user?.role === 'Security Manager' || user?.role === 'SOC Engineer';

  // Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedEventType, setSelectedEventType] = useState<string>('All');
  const [selectedAnomalyCategory, setSelectedAnomalyCategory] = useState<string>('All');
  const [limit, setLimit] = useState<number>(50);

  const isFilterActive =
    selectedEmployeeId !== 'All' ||
    selectedSeverity !== 'All' ||
    selectedEventType !== 'All' ||
    selectedAnomalyCategory !== 'All';

  const handleResetFilters = () => {
    setSelectedEmployeeId('All');
    setSelectedSeverity('All');
    setSelectedEventType('All');
    setSelectedAnomalyCategory('All');
  };

  // Row Expansion & Copy
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [payloadViewMode, setPayloadViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Live Auto-Refresh Ticker
  const [liveAutoRefresh, setLiveAutoRefresh] = useState<boolean>(false);
  const [lastTickTime, setLastTickTime] = useState<Date>(new Date());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch employee list for selector
  useEffect(() => {
    const loadEmps = async () => {
      try {
        const emps = await api.getEmployees();
        setEmployees(emps);
      } catch (e) {
        console.error('Failed to load employees for telemetry selector:', e);
      }
    };
    loadEmps();
  }, []);

  const fetchTelemetry = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [logsData, summaryData] = await Promise.all([
        api.getTelemetryLogs({
          employee_id: selectedEmployeeId !== 'All' ? selectedEmployeeId : undefined,
          severity: selectedSeverity !== 'All' ? selectedSeverity : undefined,
          event_type: selectedEventType !== 'All' ? selectedEventType : undefined,
          anomaly_category: selectedAnomalyCategory !== 'All' ? selectedAnomalyCategory : undefined,
          limit,
        }),
        api.getTelemetrySummary({
          employee_id: selectedEmployeeId !== 'All' ? selectedEmployeeId : undefined,
          severity: selectedSeverity !== 'All' ? selectedSeverity : undefined,
          event_type: selectedEventType !== 'All' ? selectedEventType : undefined,
          anomaly_category: selectedAnomalyCategory !== 'All' ? selectedAnomalyCategory : undefined,
        }),
      ]);
      setLogs(logsData);
      setSummary(summaryData);
      setLastTickTime(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to query telemetry event stream');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [selectedEmployeeId, selectedSeverity, selectedEventType, selectedAnomalyCategory, limit]);

  // Live stream interval ticker
  useEffect(() => {
    if (liveAutoRefresh) {
      timerRef.current = setInterval(() => {
        fetchTelemetry(true);
      }, 5000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [liveAutoRefresh, selectedEmployeeId, selectedSeverity, selectedEventType, selectedAnomalyCategory, limit]);

  const handleCopyPayload = (logId: number, payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(logId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = async () => {
    if (!canExport) {
      setExportMessage('Access Restricted: Raw telemetry bulk export is restricted to SOC Engineer, Manager, and Admin roles.');
      setTimeout(() => setExportMessage(null), 4000);
      return;
    }
    try {
      setIsExporting(true);
      const csvData = await api.exportTelemetryCsv({
        employee_id: selectedEmployeeId !== 'All' ? selectedEmployeeId : undefined,
        severity: selectedSeverity !== 'All' ? selectedSeverity : undefined,
        event_type: selectedEventType !== 'All' ? selectedEventType : undefined,
        anomaly_category: selectedAnomalyCategory !== 'All' ? selectedAnomalyCategory : undefined,
      });

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ams_telemetry_stream_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setExportMessage(err.message || 'Telemetry export failed');
      setTimeout(() => setExportMessage(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedEmployeeObj = employees.find((e) => e.id === selectedEmployeeId);

  const eventTypes = [
    'All',
    'LOGIN',
    'FILE_ACCESS',
    'FILE_DOWNLOAD',
    'FILE_UPLOAD',
    'DATA_TRANSFER',
    'EMAIL_ACTIVITY',
    'PRIVILEGE_CHANGE',
    'REMOTE_ACCESS',
    'APPLICATION_USAGE',
    'USB_DEVICE',
    'NETWORK_ACTIVITY',
  ];


  const anomalyCategories = [
    'All',
    'UNUSUAL_LOGIN_TIME',
    'ABNORMAL_DATA_DOWNLOAD',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'EXCESSIVE_FILE_TRANSFER',
    'SUSPICIOUS_DEVICE_USAGE',
  ];


  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with Export and Live Auto-Ticker Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Telemetry Event Stream</h1>
          <p className="text-xs text-slate-400 mt-1">
            High-throughput immutable activity telemetry log stream, payload introspection, and audit trails
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Telemetry event schema and anomaly categories informed by CERT, CMU, and LANL insider-threat research datasets
            </span>
          </div>
        </div>


        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start sm:self-auto">
          {/* Live Auto-Refresh Toggle */}
          <button
            onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              liveAutoRefresh
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Live 5-Second Polling Stream"
          >
            <Radio size={14} className={liveAutoRefresh ? 'animate-pulse text-emerald-400' : ''} />
            <span>{liveAutoRefresh ? 'Live Polling (5s Active)' : 'Live Polling: Off'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              canExport
                ? 'bg-violet-600/15 border border-violet-500/30 text-violet-300 hover:bg-violet-600/25 hover:text-white cursor-pointer'
                : 'bg-white/[0.03] border border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-400 cursor-not-allowed'
            }`}
            title={canExport ? 'Export Currently Filtered Telemetry Logs as CSV' : 'Raw telemetry export restricted from Security Analyst'}
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin text-violet-400" />
            ) : canExport ? (
              <Download size={14} />
            ) : (
              <Lock size={14} className="text-amber-400" />
            )}
            <span>Export Telemetry (CSV)</span>
            {!canExport && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">
                SOC/Admin Only
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


      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard variant="elevated" className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
                Total Ingested Logs
              </span>
              <div className="text-3xl font-extrabold text-white font-mono">{summary.total_logs}</div>
              <span className="text-[10px] text-emerald-400 font-medium">Continuous audit stream</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-300">
              <Layers size={22} />
            </div>
          </GlassCard>

          <GlassCard variant="elevated" className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
                Filtered View Count
              </span>
              <div className="text-3xl font-extrabold text-violet-300 font-mono">
                {summary.filtered_count}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Matching query filters</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-300">
              <Filter size={22} />
            </div>
          </GlassCard>

          <GlassCard
            variant="elevated"
            className={`p-5 flex items-center justify-between cursor-pointer hover:border-rose-500/50 transition-colors ${
              selectedSeverity === 'CRITICAL' ? 'border-rose-500/60 bg-rose-500/5' : ''
            }`}
            onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? 'All' : 'CRITICAL')}
          >
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-rose-400">
                Critical Events
              </span>
              <div className="text-3xl font-extrabold text-rose-400 font-mono">
                {summary.critical_events}
              </div>
              <span className="text-[10px] text-rose-400/80 font-medium">Click to filter severity</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <ShieldAlert size={22} />
            </div>
          </GlassCard>

          <GlassCard
            variant="elevated"
            className={`p-5 flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-colors ${
              selectedSeverity === 'HIGH' ? 'border-amber-500/60 bg-amber-500/5' : ''
            }`}
            onClick={() => setSelectedSeverity(selectedSeverity === 'HIGH' ? 'All' : 'HIGH')}
          >
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-amber-400">
                High Severity Events
              </span>
              <div className="text-3xl font-extrabold text-amber-400 font-mono">
                {summary.high_events}
              </div>
              <span className="text-[10px] text-amber-400/80 font-medium">Click to filter severity</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <AlertTriangle size={22} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filter Control Panel */}
      <GlassCard variant="elevated" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Telemetry Stream Filters</span>
          </div>
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Clear all active telemetry filters"
            >
              <RotateCcw size={12} className="text-violet-400" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Employee selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="All">All Employees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.id})
                </option>
              ))}
            </select>
          </div>

          {/* Severity selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="All">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
              <option value="INFO">INFO</option>
            </select>
          </div>

          {/* Event type selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Event Type
            </label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
            >
              {eventTypes.map((ev) => (
                <option key={ev} value={ev}>
                  {ev === 'All' ? 'All Event Types' : ev}
                </option>
              ))}
            </select>
          </div>

          {/* Anomaly Category selector (Milestone 2 A2) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Anomaly Category
            </label>
            <select
              value={selectedAnomalyCategory}
              onChange={(e) => setSelectedAnomalyCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
            >
              {anomalyCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Limit selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors font-mono"
            >
              <option value={25}>25 Records</option>
              <option value={50}>50 Records</option>
              <option value={100}>100 Records</option>
              <option value={200}>200 Records</option>
            </select>
          </div>
        </div>

        {/* Selected Employee Summary Card Banner */}
        {selectedEmployeeObj && (
          <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {selectedEmployeeObj.avatar_initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{selectedEmployeeObj.full_name}</span>
                  <RiskBadge tier={selectedEmployeeObj.risk_category} size="sm" />
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedEmployeeObj.id} • {selectedEmployeeObj.department} ({selectedEmployeeObj.designation})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Threat Index</span>
                <span className="text-lg font-black text-white font-mono">{selectedEmployeeObj.threat_score}%</span>
              </div>
              <button
                onClick={() => setSelectedEmployeeId('All')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Clear User Filter
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Activity Logs Table */}
      <GlassCard variant="elevated" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-violet-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Activity Logs ({logs.length} displayed)
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            {liveAutoRefresh && (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live synced {lastTickTime.toLocaleTimeString()}
              </span>
            )}
            <span>Click row to expand payload inspector</span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-violet-400" />
            <span className="text-xs">Streaming telemetry records...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Activity size={32} className="text-slate-600" />
            <span className="text-sm font-semibold text-white">No telemetry events match criteria</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Anomaly Tag</th>
                  <th className="px-4 py-3">Source IP</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-violet-500/10 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-violet-600/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white block">{log.employee_id}</span>
                            {log.source === 'live_windows_listener' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                <Radio size={8} className="animate-pulse text-emerald-400" />
                                LIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{log.employee_name}</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-violet-300">
                          {log.event_type}
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge severity={log.severity} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          {log.anomaly_category ? (
                            <div className="flex flex-col gap-1.5 items-start">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                                <AlertTriangle size={11} className="text-rose-400" />
                                <span>{log.anomaly_category.replace(/_/g, ' ')}</span>
                                <span className="text-slate-500">•</span>
                                <span className="font-mono text-violet-300 font-bold">
                                  {log.mitre_technique_id || (log.anomaly_category === 'UNUSUAL_LOGIN_TIME' ? 'T1078' : log.anomaly_category === 'ABNORMAL_DATA_DOWNLOAD' ? 'T1048' : log.anomaly_category === 'UNAUTHORIZED_ACCESS_ATTEMPT' ? 'T1098' : 'T1052')}
                                </span>
                              </span>

                              {/* Incident badge or 1-click escalation */}
                              {log.has_incident && log.incident_id ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedIncidentIdForModal(log.incident_id || null);
                                    setIsInvestigationModalOpen(true);
                                  }}
                                  className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-[10px] font-mono font-bold inline-flex items-center gap-1 transition-all"
                                  title="Open Threat Investigation Dossier"
                                >
                                  <AlertOctagon size={10} />
                                  <span>{log.incident_id}</span>
                                </button>
                              ) : canExport ? (
                                <button
                                  type="button"
                                  disabled={escalatingLogId === log.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      setEscalatingLogId(log.id);
                                      const inc = await api.escalateAnomalyToIncident(log.id);
                                      await fetchTelemetry(true);
                                      setSelectedIncidentIdForModal(inc.incident_id);
                                      setIsInvestigationModalOpen(true);
                                    } catch (err: any) {
                                      alert(`Escalation failed: ${err.message || 'Error creating incident'}`);
                                    } finally {
                                      setEscalatingLogId(null);
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/40 text-[10px] font-semibold inline-flex items-center gap-1 transition-all shadow-sm"
                                  title="Escalate to formal SOC Incident"
                                >
                                  <Flame size={10} className={cn(escalatingLogId === log.id && 'animate-spin')} />
                                  <span>{escalatingLogId === log.id ? 'Escalating...' : 'Escalate to SOC'}</span>
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>



                        <td
                          className="px-4 py-3 font-mono text-slate-300 hover:text-violet-300 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPayload(log.id, log.source_ip);
                          }}
                          title="Click to copy IP address"
                        >
                          <span className="flex items-center gap-1">
                            {log.source_ip}
                            {copiedId === log.id && <Check size={10} className="text-emerald-400" />}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                          {log.description}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title={isExpanded ? 'Collapse Payload' : 'Expand Payload'}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Payload Details Panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-[#11101C] border-b border-violet-500/20">

                            <div className="space-y-3 animate-in fade-in duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Code size={15} className="text-violet-400" />
                                  <span className="text-xs font-bold text-white">
                                    Payload Details & Telemetry Inspection (Log #{log.id})
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* View Toggle */}
                                  <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPayloadViewMode('formatted');
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                        payloadViewMode === 'formatted'
                                          ? 'bg-violet-600 text-white shadow-sm'
                                          : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      <FileText size={12} /> Formatted
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPayloadViewMode('raw');
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                        payloadViewMode === 'raw'
                                          ? 'bg-violet-600 text-white shadow-sm'
                                          : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      <Code size={12} /> Raw JSON
                                    </button>
                                  </div>

                                  {/* Copy Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyPayload(log.id, log.payload || log);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
                                  >
                                    {copiedId === log.id ? (
                                      <>
                                        <Check size={12} className="text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copy JSON</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Formatted vs Raw View */}
                              {payloadViewMode === 'formatted' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Event Description</span>
                                    <p className="text-slate-200">{log.description}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">ISO Timestamp</span>
                                    <p className="text-violet-300 font-mono">{formatDateTime(log.timestamp)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Source Address</span>
                                    <p className="text-slate-200 font-mono">{log.source_ip}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Ingestion Provenance</span>
                                    <p className={`font-mono font-bold text-xs ${log.source === 'live_windows_listener' ? 'text-emerald-300' : 'text-slate-400'}`}>
                                      {log.source === 'live_windows_listener' ? 'Live Windows Event Log Listener' : 'Curated Seeded Benchmark Dataset'}
                                    </p>
                                  </div>

                                  {/* Structured Payload Fields */}
                                  {log.payload &&
                                    Object.entries(log.payload).map(([k, v]) => (
                                      <div key={k} className="space-y-1">
                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">
                                          {k.replace(/_/g, ' ')}
                                        </span>
                                        <p className="text-amber-300 font-mono font-medium truncate">
                                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <pre className="p-3.5 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-violet-300 overflow-x-auto">
                                  {JSON.stringify(log.payload || log, null, 2)}
                                </pre>
                              )}
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

      {/* Threat Investigation Modal */}
      <ThreatInvestigationModal
        incidentId={selectedIncidentIdForModal}
        isOpen={isInvestigationModalOpen}
        onClose={() => setIsInvestigationModalOpen(false)}
        onStatusChanged={() => fetchTelemetry(true)}
      />
    </div>
  );
}

