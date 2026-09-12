'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { EmployeeDetail, InvestigationNote, CaseStatusUpdatePayload, Incident } from '@/lib/types';

import { api } from '@/lib/api';
import { ThreatGauge } from '@/components/ui/ThreatGauge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { MitreBadge } from '@/components/ui/MitreBadge';
import { TrajectoryChart } from '@/components/charts/TrajectoryChart';
import { ThreatInvestigationModal } from '@/components/incidents/ThreatInvestigationModal';
import { EntityGraphVisualizer } from '@/components/charts/EntityGraphVisualizer';
import { EntityGraphExplorerModal } from '@/components/modals/EntityGraphExplorerModal';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';
import { PeerGroupBenchmarkCard } from './PeerGroupBenchmarkCard';

import {
  X,
  Laptop,
  Server,
  Smartphone,
  Shield,
  ShieldAlert,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
  Loader2,
  Download,
  Copy,
  Check,
  Lock,
  Send,
  FileText,
  CheckCircle2,
  Users,
  AlertCircle,
  KeyRound,
  GraduationCap,
  Sparkles,
  Mail,
  Maximize2,
  ZoomIn,
  Cpu,
  Usb,
  Terminal,
  Globe,
  FolderTree,
  Sliders,
  Network,
  Search,
  Printer,
  TrendingUp,
  TrendingDown,
  Compass,
  LineChart,
  CalendarRange,
  AlertOctagon,
  ArrowRight,
  Brain,
  ChevronDown,
  ChevronUp,
  Code,
  Radio,
} from 'lucide-react';



import { LightboxModal } from '@/components/ui/LightboxModal';

import { useAuth } from '@/context/AuthContext';

// Milestone 1 & 2 Round 5 Feature C: Statistical Cohort Z-Score Thresholds
export const STATISTICAL_COHORT_THRESHOLDS = {
  HIGH_OUTLIER_SIGMA: 2.0,      // >= +2.0σ High Outlier (Rose/Red)
  ELEVATED_SIGMA: 1.0,          // >= +1.0σ Elevated Deviation (Amber)
  NORMAL_MAX_SIGMA: 1.0,        // < +1.0σ Normal Cohort Variance (Emerald)
} as const;

function getZScoreBadge(z: number | null | undefined, sampleAdequate: boolean = true) {
  if (!sampleAdequate || z === null || z === undefined) {
    return (
      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10" title="Department cohort has too few employees for standard deviation">
        Cohort too small for σ comparison
      </span>
    );
  }

  const sign = z >= 0 ? '+' : '';
  const formatted = `${sign}${z.toFixed(1)}σ`;

  if (z >= STATISTICAL_COHORT_THRESHOLDS.HIGH_OUTLIER_SIGMA) {
    return (
      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse" title={`Statistical outlier: ${formatted} from department cohort mean`}>
        {formatted} — High Outlier
      </span>
    );
  }
  if (z >= STATISTICAL_COHORT_THRESHOLDS.ELEVATED_SIGMA) {
    return (
      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40" title={`Elevated deviation: ${formatted} from department cohort mean`}>
        {formatted} — Elevated Deviation
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title={`Normal cohort variance: ${formatted} from department cohort mean`}>
      {formatted} — Normal Cohort Variance
    </span>
  );
}

interface ProfileDrawerProps {
  employeeId: string | null;
  targetIncidentId?: string | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ employeeId, targetIncidentId, onClose, onUpdate }) => {


  const { user } = useAuth();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [baseline, setBaseline] = useState<import('@/lib/types').BehavioralBaseline | null>(null);
  const [notes, setNotes] = useState<InvestigationNote[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Milestone 1 & 2 Round 3 & 4: Drawer Tabs & Anomalies Feed with Quick-Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'baseline' | 'anomalies' | 'notes' | 'logs' | 'graph'>('overview');
  const [isGraphModalOpen, setIsGraphModalOpen] = useState<boolean>(false);
  const [employeeAnomalies, setEmployeeAnomalies] = useState<import('@/lib/types').AnomalyEvent[]>([]);
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [anomalySearchQuery, setAnomalySearchQuery] = useState<string>('');

  // Feature P1 & P3 States
  const [employeeLogs, setEmployeeLogs] = useState<import('@/lib/types').TelemetryLog[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logEventTypeFilter, setLogEventTypeFilter] = useState<string>('ALL');
  const [logSeverityFilter, setLogSeverityFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [showInspectFeatureInputs, setShowInspectFeatureInputs] = useState<boolean>(false);

  const filteredAnomalies = useMemo(() => {
    return employeeAnomalies.filter((anom) => {
      if (anomalySeverityFilter !== 'ALL' && anom.severity?.toUpperCase() !== anomalySeverityFilter) {
        return false;
      }
      if (anomalySearchQuery.trim()) {
        const q = anomalySearchQuery.toLowerCase();
        const catMatch = anom.anomaly_category?.toLowerCase().includes(q);
        const mitreMatch = (anom.mitre_technique_name?.toLowerCase().includes(q)) || (anom.mitre_technique_id?.toLowerCase().includes(q));
        const descMatch = anom.description?.toLowerCase().includes(q);
        if (!catMatch && !mitreMatch && !descMatch) {
          return false;
        }
      }
      return true;
    });
  }, [employeeAnomalies, anomalySeverityFilter, anomalySearchQuery]);

  // Feature P1: In-Drawer Activity Log Filtering & Search
  const filteredLogs = useMemo(() => {
    const sourceLogs = employeeLogs.length > 0 ? employeeLogs : (employee?.recent_logs || []);
    return sourceLogs.filter((log) => {
      if (logEventTypeFilter !== 'ALL' && log.event_type !== logEventTypeFilter) {
        return false;
      }
      if (logSeverityFilter !== 'ALL' && log.severity?.toUpperCase() !== logSeverityFilter) {
        return false;
      }
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const typeMatch = log.event_type?.toLowerCase().includes(q);
        const descMatch = log.description?.toLowerCase().includes(q);
        const ipMatch = log.source_ip?.toLowerCase().includes(q);
        const catMatch = log.anomaly_category?.toLowerCase().includes(q);
        const mitreMatch = log.mitre_technique_name?.toLowerCase().includes(q) || log.mitre_technique_id?.toLowerCase().includes(q);
        const payloadMatch = log.payload ? JSON.stringify(log.payload).toLowerCase().includes(q) : false;
        if (!typeMatch && !descMatch && !ipMatch && !catMatch && !mitreMatch && !payloadMatch) {
          return false;
        }
      }
      return true;
    });
  }, [employeeLogs, employee?.recent_logs, logEventTypeFilter, logSeverityFilter, logSearchQuery]);

  // Milestone 3 Feature C: Relative Baseline Deviation calculations (comparing 24h activity vs 30-day baseline)
  const baselineDeviations = useMemo(() => {
    if (!baseline) return null;

    const parseTimeToMins = (t?: string | null) => {
      if (!t) return null;
      const match = t.match(/(\d{1,2}):(\d{2})/);
      if (!match) return null;
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    };

    // 1. Data Transfer Volume Deviation
    const transferBase = baseline.avg_daily_transfer_mb || 0;
    const transferToday = baseline.today_transfer_mb || 0;
    const transferDiff = transferToday - transferBase;
    const transferDevPct = transferBase > 0
      ? Math.round((transferDiff / transferBase) * 100)
      : (transferToday > 0 ? 100 : 0);
    const transferFormattedToday = transferToday >= 1024
      ? `${(transferToday / 1024).toFixed(1)} GB (${transferToday.toLocaleString()} MB)`
      : `${transferToday.toLocaleString()} MB`;
    const transferFormattedBase = transferBase >= 1024
      ? `${(transferBase / 1024).toFixed(1)} GB/day`
      : `${transferBase.toLocaleString()} MB/day`;
    const transferDevText = transferDevPct > 0
      ? `+${transferDevPct}% above baseline`
      : transferDevPct < 0
      ? `${transferDevPct}% below baseline`
      : `0% (baseline match)`;

    // 2. Daily Event Volume Deviation
    const eventBase = baseline.avg_daily_events || 0;
    const eventToday = baseline.today_event_count || 0;
    const eventDiff = eventToday - eventBase;
    const eventDevPct = eventBase > 0
      ? Math.round((eventDiff / eventBase) * 100)
      : (eventToday > 0 ? 100 : 0);
    const eventDevText = eventDevPct > 0
      ? `+${eventDevPct}% above baseline`
      : eventDevPct < 0
      ? `${eventDevPct}% below baseline`
      : `0% (baseline match)`;

    // 3. Login Schedule Deviation
    const todayLoginMins = parseTimeToMins(baseline.today_login_time);
    const medianLoginMins = parseTimeToMins(baseline.typical_login_median) ?? parseTimeToMins(baseline.typical_login_start);
    let loginShiftHours = '0.0';
    let loginDevPct = 0;
    if (todayLoginMins !== null && medianLoginMins !== null) {
      const diffMins = Math.abs(todayLoginMins - medianLoginMins);
      loginShiftHours = (diffMins / 60).toFixed(1);
      loginDevPct = medianLoginMins > 0 ? Math.round((diffMins / medianLoginMins) * 100) : 0;
    }
    const loginDevText = !baseline.today_login_time
      ? 'No activity in 24h'
      : baseline.login_anomaly_flag
      ? `+${loginShiftHours}h shift (+${loginDevPct}% off-schedule)`
      : loginShiftHours === '0.0'
      ? 'On schedule (0% deviation)'
      : `+${loginShiftHours}h shift (within baseline)`;

    // 4. Communication & Email Flow Deviation
    const emailBaseExt = baseline.email_baseline_external_pct ?? 2;
    const emailTodayExt = baseline.email_today_external_pct ?? 0;
    const emailDiffExt = emailTodayExt - emailBaseExt;
    const emailDevPct = emailBaseExt > 0 ? Math.round((emailDiffExt / emailBaseExt) * 100) : 0;
    const emailDevText = emailDevPct > 0
      ? `+${emailDevPct}% external flow spike`
      : emailDevPct < 0
      ? `${emailDevPct}% below baseline`
      : `0% (baseline match)`;

    return {
      transferBase,
      transferToday,
      transferDevPct,
      transferFormattedToday,
      transferFormattedBase,
      transferDevText,
      eventBase,
      eventToday,
      eventDevPct,
      eventDevText,
      loginShiftHours,
      loginDevPct,
      loginDevText,
      emailBaseExt,
      emailTodayExt,
      emailDevPct,
      emailDevText,
    };
  }, [baseline]);

  // SOC Case Actions State
  const [isUpdatingCase, setIsUpdatingCase] = useState<boolean>(false);
  const [caseActionMsg, setCaseActionMsg] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    payload: CaseStatusUpdatePayload;
  } | null>(null);

  // Enlarged Pop-up Visualizer State
  const [enlargedModal, setEnlargedModal] = useState<'timeline' | 'trajectory' | 'gauge' | null>(null);
  const [activeModalHour, setActiveModalHour] = useState<number | null>(null);

  // Milestone 3 Polish: Active Incidents Tracking State
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(targetIncidentId || null);
  const [selectedIncidentModalId, setSelectedIncidentModalId] = useState<string | number | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (targetIncidentId) {
      setHighlightedIncidentId(targetIncidentId);
    }
  }, [targetIncidentId]);

  const canExport = user?.role === 'Administrator' || user?.role === 'Security Manager';
  const canPerformCaseActions = user?.role === 'Administrator' || user?.role === 'Security Manager' || user?.role === 'SOC Engineer';

  // Close drawer or modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (enlargedModal) {
          setEnlargedModal(null);
        } else if (confirmModal) {
          setConfirmModal(null);
        } else {
          onClose();
        }
      }
    };

    if (employeeId) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [employeeId, onClose, confirmModal]);

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null);
      setBaseline(null);
      setNotes([]);
      setEmployeeAnomalies([]);
      setActiveIncidents([]);
      setAllIncidents([]);
      return;
    }

    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [data, baselineData, notesData, anomalyReport, incidentsData, logsData] = await Promise.all([
          api.getEmployeeDetail(employeeId),
          api.getEmployeeBaseline(employeeId),
          api.getEmployeeNotes(employeeId),
          api.getAnomalyReport({ employee_id: employeeId }).catch(() => null),
          api.getIncidents({ employee_id: employeeId }).catch(() => ({ incidents: [] })),
          api.getTelemetryLogs({ employee_id: employeeId, limit: 100 }).catch(() => ({ logs: [] })),
        ]);
        setEmployee(data);
        setBaseline(baselineData);
        setNotes(notesData);
        setEmployeeAnomalies(anomalyReport?.events || []);
        const rawInc = incidentsData?.incidents || [];
        setAllIncidents(rawInc);
        setActiveIncidents(rawInc.filter((i: Incident) => i.status !== 'Resolved'));
        setEmployeeLogs(Array.isArray(logsData) ? logsData : (data.recent_logs || []));

        // If target incident is provided (e.g. from Guided Scenarios modal), filter timeline to its anomalies/telemetry
        if (targetIncidentId) {
          const target = rawInc.find((i: Incident) => i.incident_id === targetIncidentId);
          if (target) {
            setHighlightedIncidentId(target.incident_id);
            if (target.mitre_technique_id) {
              setAnomalySearchQuery(target.mitre_technique_id);
            } else if (target.anomaly_category) {
              setAnomalySearchQuery(target.anomaly_category);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load employee intelligence profile');
      } finally {
        setIsLoading(false);
      }
    };


    fetchDetail();
  }, [employeeId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!employeeId) return null;


  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const getAssetIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'laptop':
        return <Laptop size={15} className="text-violet-400" />;
      case 'cloud bastion':
      case 'workstation':
        return <Server size={15} className="text-purple-400" />;
      case 'mobile':
        return <Smartphone size={15} className="text-sky-400" />;
      default:
        return <Laptop size={15} className="text-violet-400" />;
    }
  };

  const handleExportDossier = async () => {
    if (!employee) return;
    if (!canExport) {
      setExportMessage('Access Restricted: Dossier JSON export is privileged to Administrator and Security Manager roles.');
      setTimeout(() => setExportMessage(null), 4000);
      return;
    }
    try {
      const report = await api.exportEmployeeDossierJson(employee.id);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ams_dossier_${employee.id}_${employee.full_name.toLowerCase().replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportMessage(err.message || 'Dossier export failed');
      setTimeout(() => setExportMessage(null), 4000);
    }
  };

  // Execute SOC Case Action after confirmation
  const handleApplyCaseAction = async () => {
    if (!confirmModal || !employee) return;
    setIsUpdatingCase(true);
    try {
      const updated = await api.updateEmployeeCaseStatus(employee.id, confirmModal.payload);
      setEmployee(updated);
      if (onUpdate) onUpdate();
      setCaseActionMsg(`Case status flag successfully updated: ${confirmModal.title}`);
      setTimeout(() => setCaseActionMsg(null), 4000);
    } catch (err: any) {

      setCaseActionMsg(`Error updating status: ${err.message}`);
      setTimeout(() => setCaseActionMsg(null), 4000);
    } finally {
      setIsUpdatingCase(false);
      setConfirmModal(null);
    }
  };

  // Add Investigation Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !newNoteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const createdNote = await api.addEmployeeNote(employee.id, newNoteText.trim());
      setNotes((prev) => [...prev, createdNote]);
      setNewNoteText('');
    } catch (err: any) {
      setError(err.message || 'Failed to post note');
    } finally {
      setIsSubmittingNote(false);
    }
  };



  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0F0E18] border-l border-violet-500/20 shadow-2xl h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-white/5 bg-[#141222]/80 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center text-white font-bold text-base shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              {employee?.avatar_initials || 'EM'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {employee?.full_name || 'Loading Profile...'}
                </h2>
                {employee && <RiskBadge tier={employee.risk_category} size="sm" />}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {employee?.id} • {employee?.designation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {employee && (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-violet-500/10 transition-colors cursor-pointer"
                  title="Print Dossier Summary / Save as PDF (Ctrl+P)"
                >
                  <Printer size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleExportDossier}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    canExport
                      ? 'text-slate-400 hover:text-white hover:bg-violet-500/10'
                      : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'
                  }`}
                  title={canExport ? 'Export Dossier Summary (JSON)' : 'Dossier JSON export restricted to Admin & Security Manager'}
                >
                  {canExport ? <Download size={18} /> : <Lock size={18} className="text-amber-400" />}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Drawer (Esc)"
            >
              <X size={20} />
            </button>
          </div>

        </div>

        {exportMessage && (
          <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <Lock size={13} />
            <span>{exportMessage}</span>
          </div>
        )}


        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-violet-400" />
              <span className="text-xs">Loading behavioral intelligence dossier...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          ) : employee ? (
            <>
              {/* Guided Scenario Target Incident: Honest Resolved Walkthrough Banner */}
              {(() => {
                const targetInc = allIncidents.find(i => i.incident_id === highlightedIncidentId);
                if (targetInc && targetInc.status === 'Resolved') {
                  return (
                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-2.5 animate-in fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white uppercase tracking-wide">
                                Resolved Incident Case Walkthrough
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold">
                                {targetInc.incident_id}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                                RESOLVED
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-300/80 mt-0.5">
                              Honest case walkthrough: {targetInc.title} — Mitigated & closed per enterprise SOP.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIncidentModalId(targetInc.incident_id);
                            setIsIncidentModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                        >
                          <span>Inspect Case Evidence</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Feature 3: Active Security Incidents Banner */}
              {activeIncidents.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)] space-y-2.5 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <AlertOctagon size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                          {activeIncidents.length} Active Security {activeIncidents.length === 1 ? 'Incident' : 'Incidents'}
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono border border-rose-500/30 font-semibold">
                            {activeIncidents.some(i => i.severity === 'CRITICAL') ? 'CRITICAL RISK' : 'ELEVATED'}
                          </span>
                        </span>
                        <p className="text-[11px] text-rose-300/80 mt-0.5">
                          Formal threat investigation currently undergoing active SOC triage.
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const matchedActive = activeIncidents.find(i => i.incident_id === highlightedIncidentId) || activeIncidents[0];
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIncidentModalId(matchedActive.incident_id);
                            setIsIncidentModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                        >
                          <span>Investigate {matchedActive.incident_id}</span>
                          <ArrowRight size={13} />
                        </button>
                      );
                    })()}
                  </div>

                  {activeIncidents.length > 1 && (
                    <div className="flex items-center gap-2 pt-1.5 border-t border-rose-500/20 text-[11px] font-mono text-slate-300 flex-wrap">
                      <span className="text-slate-400">Other active cases:</span>
                      {activeIncidents.slice(1).map(inc => (
                        <button
                          key={inc.id}
                          type="button"
                          onClick={() => {
                            setSelectedIncidentModalId(inc.incident_id);
                            setIsIncidentModalOpen(true);
                          }}
                          className="text-violet-300 hover:text-white underline cursor-pointer"
                        >
                          {inc.incident_id} ({inc.status})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Threat Score Gauge & Current Assessment */}
              <div className="p-5 rounded-2xl bg-[#151324] border border-violet-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">

                <div className="flex flex-col gap-1.5 text-center sm:text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    Behavioral Risk Assessment
                  </span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-2xl font-black text-white font-mono">
                      {employee.threat_score}%
                    </span>
                    <RiskBadge tier={employee.risk_category} />
                  </div>
                  <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                    {employee.threat_score >= 80
                      ? 'Critical insider threat indicators detected. Immediate security triage required.'
                      : employee.threat_score >= 60
                      ? 'Elevated risk profile with anomalous privilege or data transfer patterns.'
                      : employee.threat_score >= 30
                      ? 'Moderate risk score within typical operational tolerance thresholds.'
                      : 'Low behavioral risk profile with standard authorized activity baselines.'}
                  </p>
                </div>

                <div
                  onClick={() => setEnlargedModal('gauge')}
                  className="cursor-zoom-in group relative"
                  title="Click to enlarge behavioral threat gauge"
                >
                  <ThreatGauge
                    score={employee.threat_score}
                    size={140}
                    strokeWidth={11}
                    showLabel={false}
                  />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-0.5 rounded text-[9px] text-violet-300 border border-violet-500/30 whitespace-nowrap flex items-center gap-1">
                    <ZoomIn size={10} /> Enlarge
                  </div>
                </div>
              </div>

              {/* Feature 3: ML Anomaly Corroboration Score Card with P3 Feature Breakdown Inspection */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-[#101926] to-[#151324] border border-cyan-500/25 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      <Brain size={15} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-cyan-200 tracking-wide uppercase">
                        ML Anomaly Corroboration Score
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">
                        (Multi-Feature Isolation Forest)
                      </span>
                    </div>
                  </div>

                  {/* ML-Corroborated Badge: Surfaces when both Rule-based Risk (>=60) and ML Score (>=60) are elevated */}
                  {employee.threat_score >= 60 && (employee.ml_corroboration_score ?? 0) >= 60 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] flex items-center gap-1 animate-pulse">
                      <Sparkles size={11} className="text-cyan-300" />
                      ML-Corroborated
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-cyan-300">
                      {employee.ml_corroboration_score !== null && employee.ml_corroboration_score !== undefined
                        ? `${employee.ml_corroboration_score}%`
                        : 'Pending'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {employee.ml_corroboration_score !== null && employee.ml_corroboration_score !== undefined
                        ? employee.ml_corroboration_score >= 75
                          ? 'High Anomaly Cluster'
                          : employee.ml_corroboration_score >= 50
                          ? 'Moderate Dispersion'
                          : 'Normal Behavioral Density'
                        : 'Evaluation required'}
                    </span>
                  </div>

                  {/* Mini Score Progress Bar */}
                  <div className="flex-1 max-w-[180px] bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (employee.ml_corroboration_score ?? 0) >= 75
                          ? 'bg-gradient-to-r from-cyan-500 to-rose-500'
                          : (employee.ml_corroboration_score ?? 0) >= 50
                          ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, employee.ml_corroboration_score ?? 0))}%` }}
                    />
                  </div>
                </div>

                {/* Feature P3: Expandable Inspect Feature Inputs Toggle */}
                <div className="pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowInspectFeatureInputs(!showInspectFeatureInputs)}
                    className="w-full flex items-center justify-between text-[11px] text-cyan-300 hover:text-cyan-200 py-1 font-semibold cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sliders size={12} className="text-cyan-400" />
                      Inspect 5-Vector Feature Inputs
                    </span>
                    {showInspectFeatureInputs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showInspectFeatureInputs && employee.ml_feature_vector && (
                    <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-cyan-500/20 space-y-2.5 text-xs animate-in fade-in duration-200">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Computed 5-Vector Feature Inputs for {employee.full_name}:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">Peak Daily Event Volume</span>
                          <div className="font-mono font-bold text-white">{employee.ml_feature_vector.daily_event_volume} events/day</div>
                          <span className="text-[9px] text-slate-500">Max observed daily activity density</span>
                        </div>

                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">Off-Hours Activity Ratio</span>
                          <div className={`font-mono font-bold ${employee.ml_feature_vector.off_hours_ratio > 40 ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {employee.ml_feature_vector.off_hours_ratio}%
                          </div>
                          <span className="text-[9px] text-slate-500">Deviation from personal login window</span>
                        </div>

                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">Peak Data Transfer Volume</span>
                          <div className={`font-mono font-bold ${employee.ml_feature_vector.data_transfer_volume_mb > 500 ? 'text-rose-300' : 'text-white'}`}>
                            {employee.ml_feature_vector.data_transfer_volume_mb.toLocaleString()} MB
                          </div>
                          <span className="text-[9px] text-slate-500">Single-day egress & transfer volume</span>
                        </div>

                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">Privilege-Change Count</span>
                          <div className={`font-mono font-bold ${employee.ml_feature_vector.privilege_change_count > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                            {employee.ml_feature_vector.privilege_change_count} event{employee.ml_feature_vector.privilege_change_count !== 1 ? 's' : ''}
                          </div>
                          <span className="text-[9px] text-slate-500">Elevations & role modifications</span>
                        </div>

                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 block">Anomaly-Tag Count</span>
                          <div className={`font-mono font-bold ${employee.ml_feature_vector.anomaly_tag_count > 5 ? 'text-rose-300' : 'text-white'}`}>
                            {employee.ml_feature_vector.anomaly_tag_count} flagged event{employee.ml_feature_vector.anomaly_tag_count !== 1 ? 's' : ''}
                          </div>
                          <span className="text-[9px] text-slate-500">High/Critical security flags and behavioral anomaly markers</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed border-t border-white/5 pt-2">
                        Raw telemetry inputs extracted for this employee and evaluated by the Isolation Forest model.
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed border-t border-white/5 pt-2">
                  Independent ML-based signal derived from 5-vector daily telemetry (event volume, personalized off-hours ratio, transfer MB, privilege escalations, and anomaly tags) — does not affect the official Risk Score.
                </p>
              </div>

              {/* Profile Drawer Tab Navigation Bar (Milestone 1 & 2 Round 3 Feature 3) */}
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: Activity, count: null },
                  { id: 'graph', label: 'Entity Graph', icon: Network, count: null },
                  { id: 'baseline', label: 'Behavioral Baseline', icon: Sliders, count: null },
                  { id: 'anomalies', label: 'Anomalies', icon: ShieldAlert, count: employeeAnomalies.length, isAlert: employeeAnomalies.length > 0 },
                  { id: 'notes', label: 'Notes', icon: FileText, count: notes.length },
                  { id: 'logs', label: 'Activity Logs', icon: Clock, count: employeeLogs.length || employee.recent_logs?.length || null },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] border border-violet-400'
                          : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.07] border border-transparent'
                      }`}
                    >
                      <Icon size={13} className={isActive ? 'text-white' : tab.isAlert ? 'text-rose-400' : 'text-slate-400'} />
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : tab.isAlert
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-white/10 text-slate-300'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* === TAB 1: OVERVIEW (Part 1) === */}
              {activeTab === 'overview' && (
                <>
                  {/* 30-Day Risk Trajectory Chart */}
                  <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-violet-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                          30-Day Risk Trajectory
                        </h4>
                      </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Baseline: 25%
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnlargedModal('trajectory')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-violet-600/30 text-[10px] text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                      title="Click to enlarge 30-day trajectory chart"
                    >
                      <Maximize2 size={11} />
                      <span>Enlarge</span>
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => setEnlargedModal('trajectory')}
                  className="cursor-zoom-in group relative"
                  title="Click to view enlarged high-resolution trajectory chart"
                >
                  <TrajectoryChart
                    trajectories={employee.trajectories}
                    currentScore={employee.threat_score}
                  />
                </div>
              </div>


              {/* Department & Organization Block */}
              <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Organization & Supervision
                </h4>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                      <Building2 size={12} className="text-violet-400" /> Department
                    </span>
                    <span className="text-white font-medium">{employee.department}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                      <UserCheck size={12} className="text-violet-400" /> Direct Manager
                    </span>
                    <span className="text-white font-medium">{employee.direct_manager}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                      <Calendar size={12} className="text-violet-400" /> Enrolled Date
                    </span>
                    <span className="text-white font-medium">
                      {new Date(employee.enrolled_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                      <Clock size={12} className="text-violet-400" /> Last Active
                    </span>
                    <span className="text-violet-300 font-medium">
                      {formatRelativeTime(employee.last_active)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhancement 4: Peer Group Benchmark Quick Summary Pill (Section 8) */}
              {baseline && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/30 via-indigo-950/20 to-purple-950/30 border border-violet-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                      <Users size={13} className="text-violet-400" /> Peer Group Benchmark ({baseline.dept_name || employee.department})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('baseline')}
                      className="text-[10px] text-violet-400 hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer bg-white/5 hover:bg-violet-600/30 px-2 py-0.5 rounded border border-white/10"
                      title="Open full Behavioral Baseline & Peer Visualizer tab"
                    >
                      <span>Full Visualizer</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                  {baseline.has_sufficient_peer_data && (baseline.dept_member_count ?? 0) >= 3 ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Daily Transfer vs Dept</span>
                        <div className="font-mono font-bold text-white text-xs mt-0.5">
                          {(baseline.employee_daily_transfer_mb ?? baseline.avg_daily_transfer_mb ?? 0).toFixed(1)} MB <span className="text-slate-500 font-normal text-[10px]">vs {(baseline.dept_avg_daily_transfer_mb ?? 0).toFixed(1)} MB avg</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Daily Events vs Dept</span>
                        <div className="font-mono font-bold text-white text-xs mt-0.5">
                          {(baseline.employee_daily_events ?? baseline.avg_daily_events ?? 0).toFixed(1)} ev <span className="text-slate-500 font-normal text-[10px]">vs {(baseline.dept_avg_daily_events ?? 0).toFixed(1)} ev avg</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                      <AlertTriangle size={12} className="shrink-0 text-amber-400" />
                      <span>Insufficient peer data for cohort comparison ({baseline.dept_member_count ?? 1} member{baseline.dept_member_count === 1 ? '' : 's'}).</span>
                    </div>
                  )}
                </div>
              )}

              {/* Assigned Device Assets with One-Click Copy */}
              <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Shield size={14} className="text-violet-400" /> Assigned Device Assets ({employee.device_assets.length})
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Click IP/Asset to copy</span>
                </div>

                <div className="space-y-2.5">
                  {employee.device_assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-600/15 border border-violet-500/20">
                          {getAssetIcon(asset.asset_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              onClick={(e) => handleCopy(asset.asset_id, e)}
                              className="font-semibold text-white font-mono hover:text-violet-300 cursor-pointer flex items-center gap-1"
                              title="Click to copy Asset ID"
                            >
                              {asset.asset_id}
                              {copiedText === asset.asset_id ? (
                                <Check size={11} className="text-emerald-400" />
                              ) : (
                                <Copy size={11} className="text-slate-500" />
                              )}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-medium">
                              {asset.asset_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span
                              onClick={(e) => handleCopy(asset.ip_address, e)}
                              className="hover:text-violet-300 cursor-pointer flex items-center gap-1"
                              title="Click to copy IP Address"
                            >
                              IP: {asset.ip_address}
                              {copiedText === asset.ip_address && <Check size={11} className="text-emerald-400" />}
                            </span>
                            {asset.mac_address && (
                              <span
                                onClick={(e) => handleCopy(asset.mac_address || '', e)}
                                className="hover:text-violet-300 cursor-pointer"
                                title="Click to copy MAC Address"
                              >
                                • MAC: {asset.mac_address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {asset.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* === TAB 2: BEHAVIORAL BASELINE === */}
          {activeTab === 'baseline' && baseline && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Clock size={14} className="text-violet-400" /> Behavioral Baseline (Self & Department Peer Benchmarks)
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {baseline.days_analyzed}d baseline ({baseline.total_historical_events_analyzed} events)
                    </span>
                  </div>

                  {/* Feature C: Relative Baseline Deviation Visualizer Header Strip */}
                  {baselineDeviations && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-950/30 via-indigo-950/20 to-purple-950/30 border border-violet-500/25 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-violet-400" />
                          Relative Baseline Deviation (Last 24h vs 30-Day Historical Norm)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Real-Time UEBA Variance
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                        {/* 1. Data Transfer Deviation */}
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-medium">Data Transfer</span>
                          <div className="text-xs font-mono font-bold text-white truncate">
                            {baselineDeviations.transferFormattedToday}
                          </div>
                          <div className="pt-0.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border truncate",
                              baselineDeviations.transferDevPct >= 100 || baseline.transfer_anomaly_flag
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                                : baselineDeviations.transferDevPct >= 25
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : baselineDeviations.transferDevPct <= -25
                                ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            )}>
                              {baselineDeviations.transferDevPct > 0 ? <TrendingUp size={11} className="shrink-0" /> : baselineDeviations.transferDevPct < 0 ? <TrendingDown size={11} className="shrink-0" /> : <CheckCircle2 size={11} className="shrink-0" />}
                              <span>{baselineDeviations.transferDevText}</span>
                            </span>
                          </div>
                        </div>

                        {/* 2. Daily Event Volume Deviation */}
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-medium">Daily Event Volume</span>
                          <div className="text-xs font-mono font-bold text-white truncate">
                            {baselineDeviations.eventToday.toLocaleString()} events
                          </div>
                          <div className="pt-0.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border truncate",
                              baselineDeviations.eventDevPct >= 100 || baseline.volume_anomaly_flag
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                                : baselineDeviations.eventDevPct >= 30
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : baselineDeviations.eventDevPct <= -30
                                ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            )}>
                              {baselineDeviations.eventDevPct > 0 ? <TrendingUp size={11} className="shrink-0" /> : baselineDeviations.eventDevPct < 0 ? <TrendingDown size={11} className="shrink-0" /> : <CheckCircle2 size={11} className="shrink-0" />}
                              <span>{baselineDeviations.eventDevText}</span>
                            </span>
                          </div>
                        </div>

                        {/* 3. Login Schedule Deviation */}
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-medium">Login Schedule</span>
                          <div className="text-xs font-mono font-bold text-white truncate">
                            {baseline.today_login_time || 'No Login Today'}
                          </div>
                          <div className="pt-0.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border truncate",
                              !baseline.today_login_time
                                ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                                : baseline.login_anomaly_flag
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            )}>
                              {baseline.login_anomaly_flag ? <AlertTriangle size={11} className="shrink-0" /> : <CheckCircle2 size={11} className="shrink-0" />}
                              <span>{baselineDeviations.loginDevText}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual Self Baseline Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. Login Time Window */}
                    <div className={`p-3 rounded-xl border transition-all ${
                      baseline.login_anomaly_flag 
                        ? 'bg-rose-500/10 border-rose-500/30' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">Login Schedule</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          baseline.login_anomaly_flag
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {baseline.login_anomaly_flag ? 'Deviated (Anomaly)' : 'Normal Window'}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white font-mono">
                        {baseline.today_login_time || 'No Login Today'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Typical: <span className="font-mono text-slate-300">{baseline.typical_login_start} - {baseline.typical_login_end}</span> (med. {baseline.typical_login_median})
                      </div>
                      {baselineDeviations && (
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">24h Deviation:</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border truncate",
                            !baseline.today_login_time
                              ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                              : baseline.login_anomaly_flag
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          )}>
                            {!baseline.today_login_time ? (
                              <Clock size={11} className="shrink-0" />
                            ) : baseline.login_anomaly_flag ? (
                              <AlertTriangle size={11} className="shrink-0" />
                            ) : (
                              <CheckCircle2 size={11} className="shrink-0" />
                            )}
                            <span>{baselineDeviations.loginDevText}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. Daily Event Volume */}
                    <div className={`p-3 rounded-xl border transition-all ${
                      baseline.volume_anomaly_flag 
                        ? 'bg-amber-500/10 border-amber-500/30' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">Daily Event Volume</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          baseline.volume_anomaly_flag
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {baseline.volume_anomaly_flag ? 'Volume Spike' : 'Within Bounds'}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white font-mono">
                        {baseline.today_event_count.toLocaleString()} events today
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Historical Avg: <span className="font-mono text-slate-300">{baseline.avg_daily_events.toLocaleString()} ev/day</span>
                      </div>
                      {baselineDeviations && (
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">24h Deviation:</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border truncate",
                            baselineDeviations.eventDevPct >= 100 || baseline.volume_anomaly_flag
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                              : baselineDeviations.eventDevPct >= 30
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : baselineDeviations.eventDevPct <= -30
                              ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          )}>
                            {baselineDeviations.eventDevPct > 0 ? (
                              <TrendingUp size={11} className="shrink-0" />
                            ) : baselineDeviations.eventDevPct < 0 ? (
                              <TrendingDown size={11} className="shrink-0" />
                            ) : (
                              <CheckCircle2 size={11} className="shrink-0" />
                            )}
                            <span>{baselineDeviations.eventDevText}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 3. Data Transfer Volume */}
                    <div className={`p-3 rounded-xl border transition-all ${
                      baseline.transfer_anomaly_flag 
                        ? 'bg-rose-500/10 border-rose-500/30' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">Data Transfer Volume</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          baseline.transfer_anomaly_flag
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {baseline.transfer_anomaly_flag ? 'Mass Exfiltration' : 'Normal Transfer'}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white font-mono">
                        {baselineDeviations ? baselineDeviations.transferFormattedToday : `${baseline.today_transfer_mb.toLocaleString()} MB`}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Historical Avg: <span className="font-mono text-slate-300">{baseline.avg_daily_transfer_mb.toLocaleString()} MB/day</span>
                      </div>
                      {baselineDeviations && (
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">24h Deviation:</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border truncate",
                            baselineDeviations.transferDevPct >= 100 || baseline.transfer_anomaly_flag
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                              : baselineDeviations.transferDevPct >= 25
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : baselineDeviations.transferDevPct <= -25
                              ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          )}>
                            {baselineDeviations.transferDevPct > 0 ? (
                              <TrendingUp size={11} className="shrink-0" />
                            ) : baselineDeviations.transferDevPct < 0 ? (
                              <TrendingDown size={11} className="shrink-0" />
                            ) : (
                              <CheckCircle2 size={11} className="shrink-0" />
                            )}
                            <span>{baselineDeviations.transferDevText}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 4. Primary Device & IP */}
                    <div className={`p-3 rounded-xl border transition-all ${
                      baseline.device_anomaly_flag 
                        ? 'bg-amber-500/10 border-amber-500/30' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">Network & Device</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          baseline.device_anomaly_flag
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {baseline.device_anomaly_flag ? 'Foreign IP/ASN' : 'Corporate Asset'}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white font-mono truncate">
                        {baseline.today_source_ip || baseline.primary_source_ip}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate">
                        Primary: <span className="font-mono text-slate-300">{baseline.primary_device_id} ({baseline.primary_source_ip})</span>
                      </div>
                    </div>

                    {/* 5. Communication & Email Flow Baseline (In-Bounds Feature 3) */}
                    <div className={`col-span-1 sm:col-span-2 p-3 rounded-xl border transition-all ${
                      baseline.email_exfiltration_flag 
                        ? 'bg-rose-500/10 border-rose-500/30' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <Mail size={13} className="text-violet-400" /> Communication & Outbound Email Flow
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          baseline.email_exfiltration_flag
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {baseline.email_exfiltration_flag ? '⚠️ Exfiltration Signal (Elevated External)' : 'Normal Internal Flow'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-0.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">30-Day Historical Baseline</span>
                          <div className="text-xs font-mono font-semibold text-white mt-0.5">
                            {baseline.email_baseline_internal_pct ?? 98}% Internal <span className="text-slate-500">•</span> {baseline.email_baseline_external_pct ?? 2}% External
                          </div>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            {baseline.email_baseline_total ?? 0} total email logs
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 block uppercase font-medium">Recent 24h Activity</span>
                            {baselineDeviations && (
                              <span className={cn(
                                "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border",
                                baseline.email_exfiltration_flag
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              )}>
                                {baselineDeviations.emailDevText}
                              </span>
                            )}
                          </div>
                          <div className={`text-xs font-mono font-bold mt-0.5 ${baseline.email_exfiltration_flag ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {baseline.email_today_internal_pct ?? 100}% Internal <span className="text-slate-500">•</span> {baseline.email_today_external_pct ?? 0}% External
                          </div>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            {baseline.email_today_total ?? 0} emails sent today
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhancement 4 & Elevation Feature 1: Peer Group Benchmark Visualizer Card (Section 8) */}
                  <PeerGroupBenchmarkCard baseline={baseline} employeeName={employee?.full_name || 'Employee'} />


                  {/* In-Bounds Feature 2: 24-Hour Activity / Work Pattern Visual Strip */}
                  {baseline.hourly_activity_distribution && baseline.hourly_activity_distribution.length === 24 && (
                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <Activity size={13} className="text-violet-400" />
                          24-Hour Work Pattern & Activity Timeline
                        </span>
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-2.5 text-[10px] font-mono">
                            <span className="flex items-center gap-1 text-slate-400">
                              <span className="w-2 h-2 rounded bg-violet-500/80" /> Standard Hours
                            </span>
                            <span className="flex items-center gap-1 text-rose-400 font-semibold">
                              <span className="w-2 h-2 rounded bg-rose-500 animate-pulse" /> Off-Hours Spike
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModalHour(baseline.hourly_activity_spikes?.[0] ?? 2);
                              setEnlargedModal('timeline');
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-violet-600/30 text-[10px] text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                            title="Click to enlarge 24-hour timeline in high-resolution view"
                          >
                            <Maximize2 size={11} />
                            <span>Enlarge</span>
                          </button>
                        </div>
                      </div>

                      {/* 24-Hour Strip segments */}
                      <div
                        onClick={() => {
                          setActiveModalHour(baseline.hourly_activity_spikes?.[0] ?? 2);
                          setEnlargedModal('timeline');
                        }}
                        className="space-y-1 cursor-zoom-in group/strip hover:border-violet-500/30 rounded-lg transition-all"
                        title="Click to open enlarged 24-hour interactive visualizer"
                      >
                        <div
                          className="gap-0.5 h-9 items-end bg-white/[0.02] p-1 rounded-lg border border-white/5 group-hover/strip:border-violet-500/30 transition-all"
                          style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                        >
                          {baseline.hourly_activity_distribution.map((count, hour) => {
                            const isOffHours = hour < 6 || hour >= 22;
                            const isSpike = baseline.hourly_activity_spikes?.includes(hour);
                            const maxCount = Math.max(...(baseline.hourly_activity_distribution || [1]), 1);
                            const heightPct = count > 0 ? Math.max(22, Math.round((count / maxCount) * 100)) : 10;

                            return (
                              <div
                                key={`hour-${hour}`}
                                className="relative group flex flex-col justify-end h-full cursor-pointer"
                                title={`${hour.toString().padStart(2, '0')}:00 — ${count} events logged (Click to enlarge)`}
                              >
                                <div
                                  className={`w-full rounded-t-[2px] transition-all duration-150 ${
                                    count === 0
                                      ? 'bg-white/5'
                                      : isSpike
                                      ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                                      : isOffHours
                                      ? 'bg-amber-500/70'
                                      : 'bg-gradient-to-t from-violet-700 to-violet-400 group-hover:brightness-125'
                                  }`}
                                  style={{ height: `${heightPct}%` }}
                                />
                              </div>
                            );
                          })}
                        </div>


                        {/* Hour markers under strip */}
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
                          <span>00:00</span>
                          <span>04:00</span>
                          <span>08:00</span>
                          <span>12:00</span>
                          <span>16:00</span>
                          <span>20:00</span>
                          <span>23:00</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* In-Bounds Feature 1: Access Privileges & Security Entitlements Panel */}
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">


                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <KeyRound size={14} className="text-violet-400" /> Access Privileges & Security Entitlements ({employee.access_privileges?.length || 0})
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Module 2 Identity Inventory</span>
                </div>

                {employee.access_privileges && employee.access_privileges.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {employee.access_privileges.map((priv) => {
                      const isElevated = priv.level === 'Elevated Admin';
                      const isCritical = priv.level === 'Critical';
                      const isHigh = priv.level === 'High Risk';

                      return (
                        <div
                          key={priv.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isElevated
                              ? 'bg-violet-950/25 border-violet-500/30'
                              : isCritical
                              ? 'bg-rose-950/20 border-rose-500/30'
                              : isHigh
                              ? 'bg-amber-950/20 border-amber-500/30'
                              : 'bg-white/[0.02] border-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-white tracking-wide">{priv.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">• {priv.system_resource}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isElevated
                                ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40 shadow-[0_0_8px_rgba(139,92,246,0.3)]'
                                : isCritical
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isHigh
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            }`}>
                              {priv.level}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {priv.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-center text-xs text-slate-500">
                    No custom elevated access privileges assigned to this profile.
                  </div>
                )}
              </div>

              {/* Milestone 2 Round 2: Application & Resource Access Profile */}
              {baseline && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Cpu size={14} className="text-violet-400" />
                      Application & Resource Access Profile
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Module 4 Productivity & Process Tracking</span>
                  </div>

                  {/* Unsanctioned Tools Alert Banner */}
                  {baseline.unsanctioned_tools_detected && baseline.unsanctioned_tools_detected.length > 0 ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                        <AlertTriangle size={14} className="text-rose-400 animate-pulse" />
                        <span>Unsanctioned / Suspicious Tools Detected ({baseline.unsanctioned_tools_detected.length})</span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {baseline.unsanctioned_tools_detected.map((tool, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-black/30 px-3 py-2 rounded-lg border border-rose-500/20">
                            <div className="flex items-center gap-2">
                              <Terminal size={12} className="text-rose-400" />
                              <span className="font-mono font-bold text-white">{tool.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({tool.process_name})</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                              {tool.severity} Anomaly
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>All executed binaries and processes matched approved corporate software whitelist</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300">
                        CLEAN
                      </span>
                    </div>
                  )}

                  {/* Top Authorized Applications */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Top Applications by Usage Frequency
                    </span>
                    <div className="space-y-2">
                      {(baseline.top_applications || []).map((app, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-200 font-medium">{app.name}</span>
                            <span className="text-violet-300 font-bold">{app.percentage}% ({app.count} launches)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400 transition-all duration-300"
                              style={{ width: `${Math.min(100, app.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Milestone 2 Round 2: Hardware & Peripheral Security (USB Monitoring) */}
              {baseline && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Usb size={14} className="text-violet-400" />
                      Hardware & Peripheral Security
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Module 3 USB Monitoring</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">30-Day Peripheral Events</span>
                      <div className="text-xl font-extrabold text-white font-mono">
                        {baseline.usb_total_events_30d || 0}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">USB mass storage & security tokens</span>
                    </div>

                    <div className={`p-3 rounded-xl border space-y-1 ${
                      baseline.usb_unauthorized_detected
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    }`}>
                      <span className="text-[10px] uppercase font-semibold block opacity-80">Peripheral Integrity</span>
                      <div className="text-sm font-bold font-mono">
                        {baseline.usb_unauthorized_detected ? 'UNAUTHORIZED DETECTED' : 'AUTHORIZED ONLY'}
                      </div>
                      <span className="text-[10px] block opacity-80">
                        {baseline.usb_unauthorized_detected ? 'Foreign device serial recorded' : 'All matched to asset inventory'}
                      </span>
                    </div>
                  </div>

                  {baseline.usb_unauthorized_detected && baseline.usb_unauthorized_device_ids && baseline.usb_unauthorized_device_ids.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-1.5">
                      <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-rose-400" />
                        Unapproved Hardware Serial / Peripheral IDs:
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {baseline.usb_unauthorized_device_ids.map((id, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-black/40 border border-rose-500/40 text-rose-300 font-mono text-[11px]">
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Milestone 1 & 2 Round 3 Feature 1: Remote Access & VPN Security */}
              {baseline && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Globe size={14} className="text-violet-400" />
                      Remote Access & VPN Security
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Module 3 VPN Telemetry</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">30-Day VPN Sessions</span>
                      <div className="text-lg font-extrabold text-white font-mono">
                        {baseline.vpn_total_sessions_30d || 0}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Total remote tunnels</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Primary Gateway</span>
                      <div className="text-xs font-bold text-violet-300 font-mono truncate" title={baseline.vpn_primary_gateway || 'None'}>
                        {baseline.vpn_primary_gateway?.split('(')[0]?.trim() || 'WireGuard Enterprise'}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Avg {baseline.vpn_avg_session_duration_mins || 240} min/session
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border space-y-1 col-span-2 sm:col-span-1 ${
                      baseline.vpn_anomalous_sessions_detected
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    }`}>
                      <span className="text-[10px] uppercase font-semibold block opacity-80">Gateway Integrity</span>
                      <div className="text-xs font-bold font-mono">
                        {baseline.vpn_anomalous_sessions_detected ? 'ANOMALOUS TUNNELS' : 'NORMAL TRAFFIC'}
                      </div>
                      <span className="text-[10px] block opacity-80">
                        {baseline.vpn_anomalous_sessions_detected ? 'Impossible travel flagged' : 'Standard authorized IPs'}
                      </span>
                    </div>
                  </div>

                  {/* Anomalous Sessions Banner */}
                  {baseline.vpn_anomalous_sessions_detected && baseline.vpn_anomalies && baseline.vpn_anomalies.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                        <AlertTriangle size={13} className="text-rose-400 animate-pulse" />
                        <span>Flagged Anomalous VPN Connections ({baseline.vpn_anomalies.length}):</span>
                      </div>
                      <div className="space-y-1.5">
                        {baseline.vpn_anomalies.map((anom, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-black/40 border border-rose-500/20 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-rose-200 font-bold">{anom.gateway_name} • {anom.client_ip}</span>
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] uppercase">
                                {anom.anomaly_type?.replace(/_/g, ' ') || 'SUSPICIOUS'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">{anom.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Client IPs */}
                  {baseline.vpn_recent_client_ips && baseline.vpn_recent_client_ips.length > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5 font-mono">
                      <span>Recent Tunnel Client IPs:</span>
                      <div className="flex gap-1.5">
                        {baseline.vpn_recent_client_ips.map((ip, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5 text-slate-300">
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Milestone 2 Round 3 Feature 2: Resource & File Share Access Baseline */}
              {baseline && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <FolderTree size={14} className="text-violet-400" />
                      Resource & File Repository Access Baseline
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Module 4 Access Patterns</span>
                  </div>

                  {/* Out-of-Scope Warning Banner */}
                  {baseline.out_of_scope_access_detected && baseline.out_of_scope_repositories && baseline.out_of_scope_repositories.length > 0 ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                        <AlertTriangle size={14} className="text-rose-400 animate-pulse" />
                        <span>Out-of-Scope Resource Access — {baseline.out_of_scope_access_count || baseline.out_of_scope_repositories.length} Restricted Accesses Detected</span>
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        {baseline.out_of_scope_repositories.map((repo, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-black/30 border border-rose-500/20 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-white text-[11px] truncate max-w-[280px]">
                                {repo.repository_path}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 uppercase">
                                {repo.severity} • {repo.target_department}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">{repo.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>All repository accesses aligned with departmental entitlement scope</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300">
                        IN SCOPE
                      </span>
                    </div>
                  )}

                  {/* Top Accessed File Shares */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Top Accessed Repositories by Frequency
                    </span>
                    <div className="space-y-2">
                      {(baseline.top_repositories || []).map((repo, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-200 font-medium">{repo.repository}</span>
                            <span className="text-violet-300 font-bold">{repo.percentage}% ({repo.access_count} accesses)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400 transition-all duration-300"
                              style={{ width: `${Math.min(100, repo.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Milestone 1 & 2 Round 4 Feature 2: Network Destination Port & Protocol Breakdown */}
              {baseline && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">

                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Network size={14} className="text-violet-400" /> Network Protocol Distribution & Egress Ports
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase tracking-wider ${
                      baseline.network_non_standard_ports_detected
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                    }`}>
                      {baseline.network_non_standard_ports_detected ? 'NON-STANDARD EGRESS' : 'STANDARD TRAFFIC'}
                    </span>
                  </div>

                  {/* Network Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium block">30-Day Network Events</span>
                      <div className="text-sm font-mono font-bold text-white">
                        {baseline.network_total_events_30d?.toLocaleString() || '0'}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Continuous egress audit</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium block">Allow-List Port Adherence</span>
                      <div className={`text-sm font-mono font-bold ${
                        baseline.network_non_standard_ports_detected ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {baseline.network_non_standard_ports_detected ? 'Anomalies Flagged' : '100% Compliant'}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Standard enterprise ports</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-medium block">Flagged Non-Standard Egress</span>
                      <div className={`text-sm font-mono font-bold ${
                        baseline.network_non_standard_ports_detected ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {baseline.network_flagged_connections?.length || 0} connection{(baseline.network_flagged_connections?.length || 0) !== 1 ? 's' : ''}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Suspicious port activity</span>
                    </div>
                  </div>

                  {/* Non-Standard Egress Alert Banner */}
                  {baseline.network_non_standard_ports_detected && baseline.network_flagged_connections && baseline.network_flagged_connections.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                        <AlertTriangle size={13} className="text-rose-400" />
                        <span>Flagged Non-Standard Egress Port Connections Detected ({baseline.network_flagged_connections.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {baseline.network_flagged_connections.map((conn, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-rose-500/20 text-[11px] font-mono flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <span className="text-rose-300 font-bold">Port {conn.destination_port}/{conn.protocol}</span>
                              <span className="text-slate-400 ml-1.5">• Remote: {conn.destination_ip}</span>
                              <span className="text-slate-500 block text-[10px] font-sans mt-0.5">{conn.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">{formatRelativeTime(conn.timestamp)}</span>
                              <RiskBadge severity={conn.severity} size="sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!baseline.network_non_standard_ports_detected && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>All destination ports and egress protocols comply with standard corporate allow-lists (HTTP/S, DNS, SMB, SSH).</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300">
                        COMPLIANT
                      </span>
                    </div>
                  )}

                  {/* Top Destination Ports by Frequency */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Top Destination Ports & Protocols by Traffic Volume
                    </span>
                    <div className="space-y-2">
                      {(baseline.network_top_protocols || []).map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-200 font-medium">Port {item.port} ({item.protocol})</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                item.is_standard
                                  ? 'bg-white/5 text-slate-400'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {item.is_standard ? 'Standard' : 'Non-Standard'}
                              </span>
                            </div>
                            <span className="text-violet-300 font-bold">{item.percentage}% ({item.count} events)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                item.is_standard
                                  ? 'bg-gradient-to-r from-violet-600 to-indigo-400'
                                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, item.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 13. Milestone 3 Feature C: 8-Week Historical Behavioral Trend Analysis */}
              {baseline.weekly_risk_trends && baseline.weekly_risk_trends.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarRange size={14} className="text-violet-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        8-Week Longitudinal Risk Profile (UEBA History)
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {baseline.weekly_risk_trends.length} Aggregated Weekly Windows
                    </span>
                  </div>

                  {/* Visual Weekly Trajectory Bars */}
                  <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/5">
                    <div className="flex items-end justify-between gap-1.5 h-24 pt-2">
                      {baseline.weekly_risk_trends.map((w) => {
                        const scorePct = Math.max(12, Math.min(100, w.avg_risk_score));
                        const isCurrent = w.week_index === 0;
                        const isCritical = w.avg_risk_score >= 80;
                        const isHigh = w.avg_risk_score >= 50;

                        return (
                          <div key={w.week_index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                            <span className="text-[9px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                              {w.avg_risk_score}
                            </span>
                            <div
                              className={cn(
                                'w-full rounded-t transition-all duration-300',
                                isCritical
                                  ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                  : isHigh
                                  ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                                  : isCurrent
                                  ? 'bg-gradient-to-t from-violet-600 to-violet-400'
                                  : 'bg-white/10 group-hover:bg-white/20'
                              )}
                              style={{ height: `${scorePct}%` }}
                            />
                            <span className={cn(
                              'text-[9px] font-mono mt-1',
                              isCurrent ? 'text-violet-300 font-bold' : 'text-slate-500'
                            )}>
                              {isCurrent ? 'Now' : `W${w.week_index}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weekly Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="text-slate-500 border-b border-white/5 uppercase text-[9px]">
                        <tr>
                          <th className="pb-1.5">Period</th>
                          <th className="pb-1.5">Avg Risk</th>
                          <th className="pb-1.5">Anomalies</th>
                          <th className="pb-1.5 text-right">Transfer Vol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {baseline.weekly_risk_trends.slice(-4).map((w) => (
                          <tr key={w.week_index}>
                            <td className="py-1.5 text-slate-400">{w.week_label} ({w.start_date} - {w.end_date})</td>
                            <td className={cn(
                              'py-1.5 font-bold',
                              w.avg_risk_score >= 80 ? 'text-rose-400' :
                              w.avg_risk_score >= 50 ? 'text-amber-400' : 'text-emerald-400'
                            )}>
                              {w.avg_risk_score}/100
                            </td>
                            <td className="py-1.5">{w.anomaly_count} detected</td>
                            <td className="py-1.5 text-right text-slate-400">{w.transfer_volume_gb} GB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 14. Milestone 3 Feature C: 7-14 Day Statistical Linear Trend Extrapolation */}
              {baseline.linear_trend_projection && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass size={14} className="text-amber-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        7-14 Day Statistical Trend Projection
                      </h4>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                      baseline.linear_trend_projection.trend_direction === 'RISING'
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        : baseline.linear_trend_projection.trend_direction === 'DECLINING'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-500/15 border-slate-500/30 text-slate-300'
                    )}>
                      {baseline.linear_trend_projection.trend_direction === 'RISING' ? '↑ RISING TRAJECTORY' :
                       baseline.linear_trend_projection.trend_direction === 'DECLINING' ? '↓ DECLINING TRAJECTORY' : '→ STABLE BASELINE'}
                    </span>
                  </div>

                  {/* Disclaimer Alert */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-bold block">Statistical Linear Extrapolation — Not a Predictive ML Model</span>
                      <span className="text-amber-400/80 text-[10px]">
                        Computed via deterministic linear slope regression (y = mx + b) based on past 30-day velocity. For investigative guidance only.
                      </span>
                    </div>
                  </div>

                  {/* Projections Matrix */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Projected 7-Day Score</span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className={cn(
                          'text-xl font-bold font-mono',
                          baseline.linear_trend_projection.projected_7d_score >= 80 ? 'text-rose-400' :
                          baseline.linear_trend_projection.projected_7d_score >= 50 ? 'text-amber-400' : 'text-emerald-400'
                        )}>
                          {baseline.linear_trend_projection.projected_7d_score}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Estimated day +7</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Projected 14-Day Score</span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className={cn(
                          'text-xl font-bold font-mono',
                          baseline.linear_trend_projection.projected_14d_score >= 80 ? 'text-rose-400' :
                          baseline.linear_trend_projection.projected_14d_score >= 50 ? 'text-amber-400' : 'text-emerald-400'
                        )}>
                          {baseline.linear_trend_projection.projected_14d_score}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Estimated day +14</span>
                    </div>
                  </div>

                  {/* Linear Points Trajectory */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Linear Extrapolation Sequence
                    </span>
                    <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
                      {baseline.linear_trend_projection.projected_points.map((pt, i) => (
                        <div key={i} className="p-2 rounded-lg bg-black/40 border border-dashed border-white/10">
                          <span className="text-[9px] text-slate-500 block">{pt.day_label}</span>
                          <span className={cn(
                            'text-xs font-bold mt-0.5 block',
                            pt.score >= 80 ? 'text-rose-400' :
                            pt.score >= 50 ? 'text-amber-400' : 'text-emerald-400'
                          )}>
                            {pt.score}
                          </span>
                          {pt.is_projection && (
                            <span className="text-[8px] text-amber-400/70 block uppercase">Proj</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}







              {/* Elevation Feature 2: SOC Case Management & Containment Tracking */}
              {activeTab === 'overview' && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <ShieldAlert size={14} className="text-amber-400" />
                      SOC Case Management & Containment Flags
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Internal Incident Tracking</span>
                  </div>

                  {caseActionMsg && (
                    <div className="p-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>{caseActionMsg}</span>
                    </div>
                  )}

                  {/* Current Active Flags Display */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      employee.vpn_revocation_flagged
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-white/[0.02] border-white/5 text-slate-400'
                    }`}>
                      <span className="text-[11px] font-medium">VPN Revocation</span>
                      <span className="font-mono text-[10px] font-bold">
                        {employee.vpn_revocation_flagged ? 'FLAGGED' : 'NORMAL'}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      employee.containment_status === 'isolated'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-white/[0.02] border-white/5 text-slate-400'
                    }`}>
                      <span className="text-[11px] font-medium">Endpoint Status</span>
                      <span className="font-mono text-[10px] font-bold uppercase">
                        {employee.containment_status}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      employee.requires_mfa_reset
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        : 'bg-white/[0.02] border-white/5 text-slate-400'
                    }`}>
                      <span className="text-[11px] font-medium">MFA & Password</span>
                      <span className="font-mono text-[10px] font-bold">
                        {employee.requires_mfa_reset ? 'RESET REQ' : 'STANDARD'}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      employee.training_assigned
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                        : 'bg-white/[0.02] border-white/5 text-slate-400'
                    }`}>
                      <span className="text-[11px] font-medium">Threat Training</span>
                      <span className="font-mono text-[10px] font-bold">
                        {employee.training_assigned ? 'ASSIGNED' : 'STANDARD'}
                      </span>
                    </div>
                  </div>

                  {/* Case Actions Control Buttons */}
                  <div className="pt-2 border-t border-white/5">
                    {canPerformCaseActions ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            setConfirmModal({
                              title: employee.vpn_revocation_flagged ? 'Unflag VPN Revocation' : 'Flag VPN for Revocation',
                              description: `Are you sure you want to ${employee.vpn_revocation_flagged ? 'clear the VPN revocation flag' : 'flag active VPN sessions for administrative revocation'} for ${employee.full_name}? This action is recorded in the security audit trail.`,
                              actionLabel: employee.vpn_revocation_flagged ? 'Clear Flag' : 'Flag VPN Revocation',
                              payload: { vpn_revocation_flagged: !employee.vpn_revocation_flagged },
                            })
                          }
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            employee.vpn_revocation_flagged
                              ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                          }`}
                        >
                          <ShieldAlert size={13} />
                          <span>{employee.vpn_revocation_flagged ? 'Clear VPN Flag' : 'Flag VPN Revocation'}</span>
                        </button>

                        <button
                          onClick={() =>
                            setConfirmModal({
                              title: employee.containment_status === 'isolated' ? 'Set Endpoint Normal' : 'Mark Endpoint Isolated',
                              description: `Are you sure you want to mark ${employee.full_name}'s endpoint containment status as '${employee.containment_status === 'isolated' ? 'normal' : 'isolated'}' in the case management registry?`,
                              actionLabel: employee.containment_status === 'isolated' ? 'Set Normal' : 'Mark Isolated',
                              payload: { containment_status: employee.containment_status === 'isolated' ? 'normal' : 'isolated' },
                            })
                          }
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            employee.containment_status === 'isolated'
                              ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                          }`}
                        >
                          <AlertCircle size={13} />
                          <span>{employee.containment_status === 'isolated' ? 'Set Normal' : 'Mark Isolated'}</span>
                        </button>

                        <button
                          onClick={() =>
                            setConfirmModal({
                              title: employee.requires_mfa_reset ? 'Clear MFA Reset Requirement' : 'Require Step-Up MFA & Reset',
                              description: `Are you sure you want to ${employee.requires_mfa_reset ? 'clear the MFA reset requirement' : 'require mandatory step-up MFA re-authentication and credential reset'} for ${employee.full_name}?`,
                              actionLabel: employee.requires_mfa_reset ? 'Clear Requirement' : 'Require MFA Reset',
                              payload: { requires_mfa_reset: !employee.requires_mfa_reset },
                            })
                          }
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            employee.requires_mfa_reset
                              ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25'
                          }`}
                        >
                          <KeyRound size={13} />
                          <span>{employee.requires_mfa_reset ? 'Clear MFA Reset' : 'Require MFA Reset'}</span>
                        </button>

                        <button
                          onClick={() =>
                            setConfirmModal({
                              title: employee.training_assigned ? 'Unassign Threat Training' : 'Assign Threat Training',
                              description: `Are you sure you want to ${employee.training_assigned ? 'unassign' : 'assign'} mandatory insider threat security retraining for ${employee.full_name}?`,
                              actionLabel: employee.training_assigned ? 'Unassign' : 'Assign Training',
                              payload: { training_assigned: !employee.training_assigned },
                            })
                          }
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            employee.training_assigned
                              ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              : 'bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25'
                          }`}
                        >
                          <GraduationCap size={13} />
                          <span>{employee.training_assigned ? 'Unassign Training' : 'Assign Threat Training'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 flex items-center gap-2">
                        <Lock size={13} className="text-amber-400 flex-shrink-0" />
                        <span>Viewing case containment status in read-only mode (SOC Engineer / Manager / Admin action rights required).</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Activity Audit Logs with MITRE ATT&CK Badges (Elevation Feature 3) */}
              {activeTab === 'overview' && employee.recent_logs && employee.recent_logs.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Activity size={14} className="text-violet-400" /> Recent Activity Audit Trail
                  </h4>

                  <div className="space-y-2">
                    {employee.recent_logs.slice(0, 4).map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex flex-col gap-1"
                      >

                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white font-mono">{log.event_type}</span>
                            {log.source === 'live_windows_listener' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                <Radio size={8} className="animate-pulse text-emerald-400" />
                                LIVE
                              </span>
                            )}
                            {log.anomaly_category && (
                              <MitreBadge
                                techniqueId={log.mitre_technique_id || (log.anomaly_category === 'UNUSUAL_LOGIN_TIME' ? 'T1078' : log.anomaly_category === 'ABNORMAL_DATA_DOWNLOAD' ? 'T1048' : log.anomaly_category === 'UNAUTHORIZED_ACCESS_ATTEMPT' ? 'T1098' : 'T1052')}
                                techniqueName={log.mitre_technique_name}
                                size="sm"
                              />
                            )}
                          </div>
                          <RiskBadge severity={log.severity} size="sm" />
                        </div>
                        <p className="text-slate-300 text-[11px]">{log.description}</p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatRelativeTime(log.timestamp)} • IP: {log.source_ip}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestone 2 Round 3 Feature 3 & Round 4 Feature 1: Flagged Behavioral Anomalies Tab */}
              {activeTab === 'anomalies' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#151324] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <ShieldAlert size={14} className="text-violet-400" />
                        Flagged Behavioral Anomalies ({employeeAnomalies.length})
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Historical telemetry anomalies detected by the rule-based behavioral engine
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 font-mono w-fit">
                      MITRE ATT&CK & CERT
                    </span>
                  </div>

                  {/* Feature 1: Severity Quick-Filter Toggles & Text Search Toolbar */}
                  {employeeAnomalies.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Severity Toggle Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setAnomalySeverityFilter('ALL')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              anomalySeverityFilter === 'ALL'
                                ? 'bg-violet-600/25 border border-violet-500/40 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            All ({employeeAnomalies.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnomalySeverityFilter('CRITICAL')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              anomalySeverityFilter === 'CRITICAL'
                                ? 'bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            Critical ({employeeAnomalies.filter(a => a.severity === 'CRITICAL').length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnomalySeverityFilter('HIGH')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              anomalySeverityFilter === 'HIGH'
                                ? 'bg-amber-500/25 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            High ({employeeAnomalies.filter(a => a.severity === 'HIGH').length})
                          </button>
                        </div>

                        {/* Text Search Input */}
                        <div className="relative flex-1 sm:max-w-[220px]">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Search anomalies..."
                            value={anomalySearchQuery}
                            onChange={(e) => setAnomalySearchQuery(e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                          />
                        </div>
                      </div>

                      {(anomalySeverityFilter !== 'ALL' || anomalySearchQuery.trim() !== '') && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5 font-mono">
                          <span>Showing {filteredAnomalies.length} of {employeeAnomalies.length} anomalies</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAnomalySeverityFilter('ALL');
                              setAnomalySearchQuery('');
                            }}
                            className="text-violet-400 hover:text-violet-300 underline cursor-pointer"
                          >
                            Reset filters
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {employeeAnomalies.length > 0 ? (
                    filteredAnomalies.length > 0 ? (
                      <div className="space-y-3">
                        {filteredAnomalies.map((anom) => (
                          <div
                            key={anom.id}
                            className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-violet-500/30 transition-all space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-white tracking-wide">
                                  {anom.anomaly_category.replace(/_/g, ' ')}
                                </span>
                                <RiskBadge severity={anom.severity} size="sm" />
                              </div>
                              {anom.mitre_technique_id && (
                                <MitreBadge
                                  techniqueId={anom.mitre_technique_id}
                                  techniqueName={anom.mitre_technique_name}
                                  size="sm"
                                />
                              )}
                            </div>

                            <p className="text-xs text-slate-200 leading-relaxed font-sans">
                              {anom.description}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-white/5">
                              <span>Event: <strong className="text-slate-300">{anom.event_type}</strong> • IP: {anom.source_ip}</span>
                              <span>{formatRelativeTime(anom.timestamp)}</span>
                            </div>

                            {anom.payload && Object.keys(anom.payload).length > 0 && (
                              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Payload Metadata:</span>
                                <div className="grid grid-cols-2 gap-1 text-slate-400">
                                  {Object.entries(anom.payload).slice(0, 4).map(([k, v]) => (
                                    <div key={k} className="truncate">
                                      <span className="text-slate-500">{k}: </span>
                                      <span className="text-slate-200">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-[#151324] border border-white/10 text-center space-y-2">
                        <AlertCircle size={24} className="text-slate-400 mx-auto" />
                        <h5 className="text-xs font-bold text-white">No Matching Anomalies</h5>
                        <p className="text-[11px] text-slate-400">
                          No flagged anomalies match &ldquo;{anomalySearchQuery}&rdquo; with severity {anomalySeverityFilter}.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setAnomalySeverityFilter('ALL');
                            setAnomalySearchQuery('');
                          }}
                          className="px-3 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs hover:bg-violet-600/30 transition-all cursor-pointer"
                        >
                          Clear Search & Filters
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="p-8 rounded-2xl bg-[#151324] border border-emerald-500/20 text-center space-y-2">
                      <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                      <h5 className="text-sm font-bold text-white">Clean Behavioral Record</h5>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        No behavioral anomalies have been flagged for {employee.full_name}. All activity falls within expected statistical baselines.
                      </p>
                    </div>
                  )}
                </div>
              )}


              {/* Elevation Feature 4: Analyst Investigation Notes & Case Annotations */}
              {activeTab === 'notes' && (
                <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <FileText size={14} className="text-violet-400" />
                      Investigation Notes & Case Annotations ({notes.length})
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Immutable Case Journal</span>
                  </div>

                  {/* Chronological Notes List */}
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {notes && notes.length > 0 ? (
                      notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{note.author_name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-600/20 text-violet-300 border border-violet-500/30 font-mono">
                                {note.author_role}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {formatDateTime(note.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap">
                            {note.note_text}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-center text-slate-500 text-xs">
                        No investigation annotations recorded yet for this entity.
                      </div>
                    )}
                  </div>

                  {/* Note Submission Form */}
                  <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-white/5">
                    <textarea
                      rows={2}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder={`Add case annotation as ${user?.full_name || 'Investigator'} (${user?.role})...`}
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 transition-colors resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingNote || !newNoteText.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isSubmittingNote ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>Add Note</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* === TAB 5: ACTIVITY LOGS WITH IN-DRAWER FILTERING & SEARCH (Feature P1) === */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  {/* Filter & Search Bar */}
                  <div className="p-4 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Clock size={14} className="text-violet-400" />
                        Employee Telemetry Stream ({filteredLogs.length} / {employeeLogs.length || employee.recent_logs?.length || 0})
                      </h4>
                      {(logSearchQuery || logEventTypeFilter !== 'ALL' || logSeverityFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogSearchQuery('');
                            setLogEventTypeFilter('ALL');
                            setLogSeverityFilter('ALL');
                          }}
                          className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold cursor-pointer transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Search Input */}
                      <div className="sm:col-span-6 relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={logSearchQuery}
                          onChange={(e) => setLogSearchQuery(e.target.value)}
                          placeholder="Search description, IP, event type, or payload..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>

                      {/* Event Type Filter Dropdown */}
                      <div className="sm:col-span-3">
                        <select
                          value={logEventTypeFilter}
                          onChange={(e) => setLogEventTypeFilter(e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-black/40 border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                        >
                          <option value="ALL">All Event Types</option>
                          <option value="LOGIN">LOGIN</option>
                          <option value="FILE_DOWNLOAD">FILE_DOWNLOAD</option>
                          <option value="FILE_UPLOAD">FILE_UPLOAD</option>
                          <option value="DATA_TRANSFER">DATA_TRANSFER</option>
                          <option value="EMAIL_ACTIVITY">EMAIL_ACTIVITY</option>
                          <option value="PRIVILEGE_CHANGE">PRIVILEGE_CHANGE</option>
                          <option value="REMOTE_ACCESS">REMOTE_ACCESS</option>
                          <option value="APPLICATION_USAGE">APPLICATION_USAGE</option>
                          <option value="USB_DEVICE">USB_DEVICE</option>
                          <option value="NETWORK_ACTIVITY">NETWORK_ACTIVITY</option>
                        </select>
                      </div>

                      {/* Severity Filter Dropdown */}
                      <div className="sm:col-span-3">
                        <select
                          value={logSeverityFilter}
                          onChange={(e) => setLogSeverityFilter(e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-black/40 border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                        >
                          <option value="ALL">All Severities</option>
                          <option value="CRITICAL">CRITICAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="LOW">LOW</option>
                          <option value="INFO">INFO</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Log Feed List */}
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => {
                        const isExpanded = expandedLogId === log.id;
                        return (
                          <div
                            key={log.id}
                            className={`p-3.5 rounded-xl border transition-all duration-200 text-xs space-y-2 ${
                              log.severity === 'CRITICAL'
                                ? 'bg-rose-950/15 border-rose-500/30'
                                : log.severity === 'HIGH'
                                ? 'bg-amber-950/15 border-amber-500/30'
                                : 'bg-[#151324] border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                  log.severity === 'CRITICAL'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : log.severity === 'HIGH'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : log.severity === 'MEDIUM'
                                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                    : 'bg-white/5 text-slate-400 border border-white/10'
                                }`}>
                                  {log.severity}
                                </span>
                                <span className="font-mono text-xs font-bold text-violet-300">{log.event_type}</span>
                                {log.source === 'live_windows_listener' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                    <Radio size={8} className="animate-pulse text-emerald-400" />
                                    LIVE
                                  </span>
                                )}
                                {log.anomaly_category && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
                                    {log.anomaly_category.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>

                              <span className="text-[11px] text-slate-500 font-mono shrink-0">
                                {formatDateTime(log.timestamp)}
                              </span>
                            </div>

                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              {log.description}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-500 font-mono">
                              <div className="flex items-center gap-3">
                                <span>IP: {log.source_ip}</span>
                                {log.mitre_technique_id && (
                                  <span className="text-slate-400">MITRE: {log.mitre_technique_id}</span>
                                )}
                              </div>

                              {log.payload && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                  className="text-violet-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Code size={11} />
                                  <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                                </button>
                              )}
                            </div>

                            {isExpanded && log.payload && (
                              <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[10px] text-slate-300 overflow-x-auto">
                                <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 rounded-2xl bg-[#151324] border border-white/5 text-center space-y-2">
                        <AlertCircle size={28} className="text-slate-500 mx-auto" />
                        <h5 className="text-xs font-bold text-white">No Matching Telemetry Events</h5>
                        <p className="text-[11px] text-slate-400">
                          No recorded logs match the active search query and filter criteria.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enhancement 1: Entity Relationship Graph Visualizer (PDF Page 13: Graph Analytics) */}
              {activeTab === 'graph' && employee && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-[#151324] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Network size={14} className="text-violet-400" /> Entity Relationship & Network Topology
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Multi-dimensional node-link graph mapping devices, access endpoints, file repositories, and security flags
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsGraphModalOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs font-semibold border border-violet-500/30 transition-all cursor-pointer"
                        title="Open full-screen graph explorer"
                      >
                        <Maximize2 size={12} />
                        <span>Enlarge Explorer</span>
                      </button>
                    </div>

                    <EntityGraphVisualizer
                      employee={employee}
                      logs={employeeLogs.length > 0 ? employeeLogs : (employee.recent_logs || [])}
                      anomalies={employeeAnomalies}
                      incidents={activeIncidents}
                      onEnlarge={() => setIsGraphModalOpen(true)}
                      height={440}
                    />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>


        {/* Drawer Footer with Export Action */}
        {employee && (
          <div className="p-4 border-t border-white/5 bg-[#0C0B14] flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span>Ref: AMS-{employee.id}</span>
              <span>•</span>
              <span>Updated: {formatDateTime(employee.updated_at)}</span>
            </div>
            <button
              onClick={handleExportDossier}
              className={`font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                canExport ? 'text-violet-400 hover:text-white' : 'text-slate-500 hover:text-amber-300'
              }`}
            >
              {canExport ? <Download size={13} /> : <Lock size={13} className="text-amber-400" />}
              <span>Export Dossier</span>
              {!canExport && <span className="text-[10px] text-amber-400/80">(Admin/Mgr)</span>}
            </button>
          </div>
        )}

        {/* Confirmation Modal Overlay for SOC Case Actions */}
        {confirmModal && (
          <div
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setConfirmModal(null)}
          >
            <div
              className="w-full max-w-md bg-[#161424] border border-violet-500/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{confirmModal.title}</h3>
                  <p className="text-xs text-slate-400">SOC Case Status Modification Confirmation</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {confirmModal.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  disabled={isUpdatingCase}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCaseAction}
                  disabled={isUpdatingCase}
                  className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingCase ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Confirm Action</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Enlarged 24-Hour Timeline Lightbox Modal */}
        {enlargedModal === 'timeline' && baseline && baseline.hourly_activity_distribution && (
          <LightboxModal
            isOpen={true}
            onClose={() => setEnlargedModal(null)}
            title="24-Hour Behavioral Work Pattern & Activity Timeline"
            subtitle={`${employee?.full_name} (${employee?.department}) — High-Resolution Hourly Telemetry Density & Off-Hours Audit`}
            badge={baseline.hourly_activity_spikes?.length ? `${baseline.hourly_activity_spikes.length} Off-Hours Spikes` : 'Standard Rhythm'}
            badgeColor={baseline.hourly_activity_spikes?.length ? 'rose' : 'emerald'}
            maxWidth="4xl"
          >
            <div className="space-y-6">
              {/* Quick KPI stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Analyzed Events</span>
                  <div className="text-base font-bold font-mono text-white">{baseline.total_historical_events_analyzed}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Over {baseline.days_analyzed} days baseline</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Core Hours (08-18h)</span>
                  <div className="text-base font-bold font-mono text-violet-300">
                    {baseline.hourly_activity_distribution.slice(8, 19).reduce((a, b) => a + b, 0)} events
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Standard working baseline</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Off-Hours (19-07h)</span>
                  <div className="text-base font-bold font-mono text-amber-300">
                    {baseline.hourly_activity_distribution.filter((_, i) => i < 8 || i >= 19).reduce((a, b) => a + b, 0)} events
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Night & early shift logs</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-0.5">
                  <span className="text-[10px] text-rose-300 uppercase font-semibold">Anomalous Spike Hours</span>
                  <div className="text-base font-bold font-mono text-rose-400">
                    {baseline.hourly_activity_spikes?.length || 0} intervals
                  </div>
                  <span className="text-[10px] text-rose-400/80 font-mono">
                    {baseline.hourly_activity_spikes?.map(h => `${h.toString().padStart(2, '0')}:00`).join(', ') || 'None'}
                  </span>
                </div>
              </div>

              {/* Enlarged 24-Hour Graph */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} className="text-violet-400" />
                    Hourly Activity Distribution Matrix (00:00 - 23:00 UTC)
                  </span>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded bg-violet-500" /> Core Work Hours
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" /> Off-Hours Spike
                    </span>
                  </div>
                </div>

                {/* The big bars */}
                <div
                  className="gap-1.5 h-48 items-end bg-white/[0.02] p-3 rounded-xl border border-white/5 pt-8"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                >
                  {baseline.hourly_activity_distribution.map((count, hour) => {
                    const isOffHours = hour < 6 || hour >= 22;
                    const isSpike = baseline.hourly_activity_spikes?.includes(hour);
                    const isSelected = activeModalHour === hour;
                    const maxCount = Math.max(...(baseline.hourly_activity_distribution || [1]), 1);
                    const heightPct = count > 0 ? Math.max(18, Math.round((count / maxCount) * 100)) : 8;

                    return (
                      <div
                        key={`modal-hour-${hour}`}
                        onClick={() => setActiveModalHour(hour)}
                        className={`relative group flex flex-col justify-end items-center h-full cursor-pointer transition-all ${
                          isSelected ? 'scale-105' : 'hover:opacity-90'
                        }`}
                        title={`Click to inspect Hour ${hour.toString().padStart(2, '0')}:00 (${count} events)`}
                      >
                        {/* Event count label above bar */}
                        <span className={`text-[10px] font-mono font-bold mb-1 transition-all ${
                          isSelected
                            ? 'text-white scale-110'
                            : isSpike
                            ? 'text-rose-300'
                            : count > 0
                            ? 'text-slate-400'
                            : 'text-transparent'
                        }`}>
                          {count > 0 ? count : ''}
                        </span>

                        <div
                          className={`w-full rounded-t-md transition-all duration-200 ${
                            count === 0
                              ? 'bg-white/5'
                              : isSpike
                              ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.8)]'
                              : isOffHours
                              ? 'bg-amber-500/80'
                              : 'bg-gradient-to-t from-violet-700 to-violet-400'
                          } ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#110e1e]' : ''}`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* 24 Hour labels */}
                <div
                  className="gap-1.5 text-center px-1"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                >
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <button
                      key={`label-${hour}`}
                      type="button"
                      onClick={() => setActiveModalHour(hour)}
                      className={`text-[9px] font-mono transition-all py-0.5 rounded cursor-pointer ${
                        activeModalHour === hour
                          ? 'bg-violet-600 text-white font-bold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {hour.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Inspector Box for Selected Hour */}
              {activeModalHour !== null && (
                <div className="p-4 rounded-xl bg-[#171427] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-violet-400" />
                      <span className="text-sm font-bold text-white font-mono">
                        Hour {activeModalHour.toString().padStart(2, '0')}:00 — {(activeModalHour + 1).toString().padStart(2, '0')}:00 UTC
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({baseline.hourly_activity_distribution[activeModalHour]} total events)
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      baseline.hourly_activity_spikes?.includes(activeModalHour)
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : (activeModalHour < 6 || activeModalHour >= 22)
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {baseline.hourly_activity_spikes?.includes(activeModalHour)
                        ? '⚠️ Critical Off-Hours Activity Spike'
                        : (activeModalHour < 6 || activeModalHour >= 22)
                        ? '🌙 Off-Hours Period'
                        : '💼 Normal Business Hours'}
                    </span>
                  </div>

                  {/* Matching Telemetry Logs for this hour */}
                  {(() => {
                    const hourLogs = (employee?.recent_logs || []).filter(
                      (l) => new Date(l.timestamp).getUTCHours() === activeModalHour
                    );

                    if (hourLogs.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic py-1">
                          No recent 24-hour logs recorded precisely during this hour. Historical baseline aggregate records {baseline.hourly_activity_distribution[activeModalHour]} telemetry occurrences at this time interval.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Recorded Telemetry Events during this hour:
                        </span>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {hourLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs flex items-center justify-between gap-3"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-violet-300">{log.event_type}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">IP: {log.source_ip}</span>
                                </div>
                                <p className="text-[11px] text-slate-300 truncate">{log.description}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                log.severity === 'CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : log.severity === 'HIGH'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-white/5 text-slate-300'
                              }`}>
                                {log.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </LightboxModal>
        )}

        {/* Enlarged 30-Day Trajectory Lightbox Modal */}
        {enlargedModal === 'trajectory' && employee && (
          <LightboxModal
            isOpen={true}
            onClose={() => setEnlargedModal(null)}
            title="30-Day Behavioral Risk Trajectory"
            subtitle={`${employee.full_name} (${employee.department}) — Longitudinal Threat Drift & Baseline Divergence`}
            badge={`Score: ${employee.threat_score}%`}
            badgeColor={employee.threat_score >= 80 ? 'rose' : employee.threat_score >= 60 ? 'amber' : 'violet'}
            maxWidth="4xl"
          >
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                <div className="h-80 w-full outline-none focus:outline-none">
                  <TrajectoryChart
                    trajectories={employee.trajectories}
                    currentScore={employee.threat_score}
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Trajectory Data Points History (Last 10 Days)
                </span>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/5">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Timeline Offset</th>
                        <th className="px-4 py-2.5">Threat Score</th>
                        <th className="px-4 py-2.5">Baseline Reference</th>
                        <th className="px-4 py-2.5">Risk Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {employee.trajectories.slice(0, 10).map((t, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2 text-white">
                            {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {t.day_offset === 0 ? 'Today (Day 0)' : `-${t.day_offset} days`}
                          </td>
                          <td className="px-4 py-2 font-bold text-violet-300">
                            {t.score}%
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {t.baseline_score}%
                          </td>
                          <td className="px-4 py-2">
                            <RiskBadge
                              tier={
                                t.score >= 80
                                  ? 'CRITICAL'
                                  : t.score >= 60
                                  ? 'HIGH'
                                  : t.score >= 30
                                  ? 'MEDIUM'
                                  : 'LOW'
                              }
                            />
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

        {/* Enlarged Threat Gauge Lightbox Modal */}
        {enlargedModal === 'gauge' && employee && (
          <LightboxModal
            isOpen={true}
            onClose={() => setEnlargedModal(null)}
            title="Behavioral Threat Score Decomposition"
            subtitle={`${employee.full_name} (${employee.department}) — Real-Time Multi-Factor Risk Assessment`}
            badge={`Score: ${employee.threat_score}%`}
            badgeColor={employee.threat_score >= 80 ? 'rose' : employee.threat_score >= 60 ? 'amber' : 'violet'}
            maxWidth="2xl"
          >
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
              <ThreatGauge
                score={employee.threat_score}
                size={220}
                strokeWidth={16}
                showLabel={true}
              />
              <div className="w-full grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Classification</span>
                  <div className="font-bold text-white">{employee.risk_category} RISK</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Containment Status</span>
                  <div className="font-mono text-white capitalize">{employee.containment_status || 'Normal'}</div>
                </div>
              </div>
            </div>
          </LightboxModal>
        )}

        {/* Threat Investigation Evidence Modal */}
        <ThreatInvestigationModal
          incidentId={selectedIncidentModalId}
          isOpen={isIncidentModalOpen}
          onClose={() => setIsIncidentModalOpen(false)}
          onStatusChanged={() => {
            if (employeeId) {
              api.getIncidents({ employee_id: employeeId })
                .then(res => setActiveIncidents((res?.incidents || []).filter((i: Incident) => i.status !== 'Resolved')))
                .catch(() => {});
            }
          }}
        />

        {/* Full-Screen Entity Graph Explorer Modal */}
        <EntityGraphExplorerModal
          isOpen={isGraphModalOpen && !!employee}
          onClose={() => setIsGraphModalOpen(false)}
          employee={employee}
          logs={employeeLogs.length > 0 ? employeeLogs : (employee?.recent_logs || [])}
          anomalies={employeeAnomalies}
          incidents={activeIncidents}
        />
      </div>
    </div>
  );
};



