'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  NotificationSettings,
  ThreatScoringWeights,
  SystemHealthResponse,
  AuditLog,
  MLModelMetadata,
  IdentityMapping,
  UnmappedIngestionLogItem,
  LiveIngestionStatus,
  EmployeeListItem,
} from '@/lib/types';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  Settings as SettingsIcon,
  Bell,
  Sliders,
  Server,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  ExternalLink,
  LogOut,
  Lock,
  Loader2,
  Check,
  ShieldCheck,
  ScrollText,
  Search,
  RefreshCw,
  Eye,
  Download,
  Brain,
  Cpu,
  Sparkles,
  Mail,
  Send,
  MessageSquare,
  Radio,
  XCircle,
  Plus,
  Trash2,
  Terminal,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'Administrator';
  const isManager = user?.role === 'Security Manager';
  const canViewAudit = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState<'notifications' | 'weights' | 'health' | 'audit' | 'ml_model' | 'live_ingestion'>('notifications');

  // Tab 5: ML Model State (Admin only)
  const [mlMeta, setMlMeta] = useState<MLModelMetadata | null>(null);
  const [isLoadingMlMeta, setIsLoadingMlMeta] = useState(false);
  const [isRetrainingMl, setIsRetrainingMl] = useState(false);
  const [mlStatus, setMlStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMlMetadata = async () => {
    if (!isAdmin) return;
    setIsLoadingMlMeta(true);
    try {
      const data = await api.getMLModelMetadata();
      setMlMeta(data);
    } catch (err) {
      console.error('Failed to load ML model metadata:', err);
    } finally {
      setIsLoadingMlMeta(false);
    }
  };

  const handleRetrainMlModel = async () => {
    if (!isAdmin) return;
    setIsRetrainingMl(true);
    setMlStatus(null);
    try {
      const res = await api.retrainMLModel();
      setMlMeta(res);
      setMlStatus({
        type: 'success',
        message: `Isolation Forest retrained successfully across ${res.sample_size} employee-day feature vectors! All 16 employee ML corroboration scores have been synchronized.`,
      });
    } catch (err: any) {
      setMlStatus({
        type: 'error',
        message: err.message || 'Failed to retrain ML model',
      });
    } finally {
      setIsRetrainingMl(false);
    }
  };

  // Tab 6: Live Windows Ingestion State (Scoped Exception Module - Admin only)
  const [liveStatus, setLiveStatus] = useState<LiveIngestionStatus | null>(null);
  const [identityMappings, setIdentityMappings] = useState<IdentityMapping[]>([]);
  const [unmappedLogs, setUnmappedLogs] = useState<UnmappedIngestionLogItem[]>([]);
  const [employeesList, setEmployeesList] = useState<EmployeeListItem[]>([]);
  const [isLoadingLiveIngestion, setIsLoadingLiveIngestion] = useState(false);

  // Mapping Form State
  const [newWinId, setNewWinId] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newMappingDesc, setNewMappingDesc] = useState('');
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSuccess, setMappingSuccess] = useState<string | null>(null);
  const [deletingMappingId, setDeletingMappingId] = useState<number | null>(null);

  // Unmapped Logs Filter
  const [unmappedSearch, setUnmappedSearch] = useState('');
  const [unmappedChannelFilter, setUnmappedChannelFilter] = useState('All');

  const fetchLiveIngestionData = async () => {
    if (!isAdmin) return;
    setIsLoadingLiveIngestion(true);
    try {
      const [statusData, mappingsData, unmappedData, empsData] = await Promise.all([
        api.getLiveIngestionStatus(),
        api.getIdentityMappings(),
        api.getUnmappedIngestionLog({ limit: 50 }),
        api.getEmployees(),
      ]);
      setLiveStatus(statusData);
      setIdentityMappings(mappingsData);
      setUnmappedLogs(unmappedData);
      setEmployeesList(empsData);
      if (empsData.length > 0 && !newEmpId) {
        setNewEmpId(empsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load Live Ingestion data:', err);
    } finally {
      setIsLoadingLiveIngestion(false);
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWinId.trim() || !newEmpId) {
      setMappingError('Please provide a Windows account identifier and select an existing seeded employee.');
      return;
    }
    setIsSavingMapping(true);
    setMappingError(null);
    setMappingSuccess(null);
    try {
      await api.createIdentityMapping({
        windows_identifier: newWinId.trim(),
        employee_id: newEmpId,
        description: newMappingDesc.trim() || undefined,
      });
      setMappingSuccess(`Successfully registered identity mapping for ${newWinId.trim()}`);
      setNewWinId('');
      setNewMappingDesc('');
      await fetchLiveIngestionData();
    } catch (err: any) {
      setMappingError(err.message || 'Failed to create identity mapping.');
    } finally {
      setIsSavingMapping(false);
    }
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm('Are you sure you want to remove this Windows identity mapping?')) return;
    setDeletingMappingId(id);
    try {
      await api.deleteIdentityMapping(id);
      await fetchLiveIngestionData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete identity mapping.');
    } finally {
      setDeletingMappingId(null);
    }
  };

  // Tab 1: Notifications State (Available to ALL roles)
  const [notifications, setNotifications] = useState<NotificationSettings>({
    high_severity_alerts: true,
    critical_severity_urgent: true,
    daily_security_digest: true,
    alert_delivery_email: 'soc-team@ams.internal',
  });
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);
  const [notifsStatus, setNotifsStatus] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<import('@/lib/types').NotificationDeliveryStatus | null>(null);
  const [isTriggeringDigest, setIsTriggeringDigest] = useState(false);
  const [isTriggeringTest, setIsTriggeringTest] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Tab 2: Threat Scoring Weights State (Admin only)
  const [weights, setWeights] = useState<ThreatScoringWeights>({
    behavioral_anomalies: 0.35,
    privilege_misuse: 0.25,
    data_access_violations: 0.20,
    access_pattern_deviations: 0.10,
    historical_security_events: 0.10,
  });
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [weightsStatus, setWeightsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tab 3: System Health State (Admin only)
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);

  // Tab 4: Audit Logs State (Admin & Security Manager & Elevation Feature 5)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const [auditExportMsg, setAuditExportMsg] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('All');
  const [auditUserSearch, setAuditUserSearch] = useState<string>('');
  const [expandedAuditId, setExpandedAuditId] = useState<number | null>(null);

  const fetchAuditLogs = async () => {
    if (!canViewAudit) return;
    setIsLoadingAudit(true);
    try {
      const logs = await api.getAuditLogs({
        action: auditActionFilter !== 'All' ? auditActionFilter : undefined,
        user_email: auditUserSearch || undefined,
        limit: 50,
      });
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleExportAuditTrail = async () => {
    if (!canViewAudit) return;
    setIsExportingAudit(true);
    setAuditExportMsg(null);
    try {
      const csvContent = await api.exportAuditLogsCsv({
        action: auditActionFilter !== 'All' ? auditActionFilter : undefined,
        user_email: auditUserSearch.trim() || undefined,
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ams_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setAuditExportMsg(err.message || 'Audit export failed');
      setTimeout(() => setAuditExportMsg(null), 4000);
    } finally {
      setIsExportingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditActionFilter]);


  // Load settings on mount
  useEffect(() => {
    const loadNotifs = async () => {
      setIsLoadingNotifs(true);
      try {
        const [notifData, statusData] = await Promise.all([
          api.getNotificationSettings(),
          api.getNotificationStatus().catch(() => null),
        ]);
        setNotifications(notifData);
        if (statusData) setDeliveryStatus(statusData);
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      } finally {
        setIsLoadingNotifs(false);
      }
    };

    loadNotifs();

    if (isAdmin) {
      const loadAdminSettings = async () => {
        try {
          const [weightsData, healthData, mlData] = await Promise.all([
            api.getWeights(),
            api.getHealth(),
            api.getMLModelMetadata(),
          ]);
          setWeights(weightsData);
          setHealth(healthData);
          setMlMeta(mlData);
          fetchLiveIngestionData();
        } catch (err) {
          console.error('Failed to load admin settings:', err);
        }
      };
      loadAdminSettings();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'live_ingestion' && isAdmin) {
      fetchLiveIngestionData();
    }
  }, [activeTab, isAdmin]);

  // Handle Notifications Save (Allowed for ALL roles)
  const handleSaveNotifications = async () => {
    setIsSavingNotifs(true);
    setNotifsStatus(null);
    try {
      await api.updateNotificationSettings(notifications);
      setNotifsStatus('Configuration successfully saved and synced across all SOC alerting channels.');
      setTimeout(() => setNotifsStatus(null), 3500);
    } catch (err: any) {
      setNotifsStatus(`Error: ${err.message}`);
    } finally {
      setIsSavingNotifs(false);
    }
  };

  const fetchDeliveryStatus = async () => {
    try {
      const status = await api.getNotificationStatus();
      setDeliveryStatus(status);
    } catch (err) {
      console.error('Failed to load delivery status:', err);
    }
  };

  const handleTriggerDailyDigest = async () => {
    setIsTriggeringDigest(true);
    setActionFeedback(null);
    try {
      const res = await api.triggerDailyDigest();
      setActionFeedback({
        type: 'success',
        message: res.message,
      });
      fetchDeliveryStatus();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to dispatch daily digest',
      });
    } finally {
      setIsTriggeringDigest(false);
    }
  };

  const handleTriggerTestAlert = async (severity: string = 'CRITICAL') => {
    setIsTriggeringTest(true);
    setActionFeedback(null);
    try {
      const res = await api.triggerTestNotification({ channel: 'both', severity });
      setActionFeedback({
        type: res.delivery_success ? 'success' : 'info',
        message: `${res.message} (Audit Action: ${res.audit_action})`,
      });
      fetchDeliveryStatus();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to send test alert',
      });
    } finally {
      setIsTriggeringTest(false);
    }
  };

  // Weight Calculations
  const totalWeight = Math.round(
    (weights.behavioral_anomalies +
      weights.privilege_misuse +
      weights.data_access_violations +
      weights.access_pattern_deviations +
      weights.historical_security_events) *
      100
  );
  const isValidSum = totalWeight === 100;

  // Handle Weight Slider Change
  const handleWeightChange = (key: keyof ThreatScoringWeights, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Math.round(val) / 100,
    }));
  };

  const handleSaveWeights = async () => {
    if (!isValidSum || !isAdmin) return;
    setIsSavingWeights(true);
    setWeightsStatus(null);
    try {
      await api.updateWeights(weights);
      setWeightsStatus({
        type: 'success',
        message: 'Threat scoring weights successfully updated and persisted.',
      });
      setTimeout(() => setWeightsStatus(null), 3500);
    } catch (err: any) {
      setWeightsStatus({ type: 'error', message: err.message });
    } finally {
      setIsSavingWeights(false);
    }
  };

  const handleResetWeights = async () => {
    if (!isAdmin) return;
    setIsSavingWeights(true);
    try {
      const defaults = await api.resetWeights();
      setWeights(defaults);
      setWeightsStatus({
        type: 'success',
        message: 'Default scoring weights restored (35% / 25% / 20% / 10% / 10%).',
      });
      setTimeout(() => setWeightsStatus(null), 3500);
    } catch (err: any) {
      setWeightsStatus({ type: 'error', message: err.message });
    } finally {
      setIsSavingWeights(false);
    }
  };

  // Handle Health Check Re-ping
  const handleRefreshHealth = async () => {
    if (!isAdmin) return;
    setIsLoadingHealth(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const handleCopyApiUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedApi(true);
    setTimeout(() => setCopiedApi(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon size={24} className="text-violet-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & Governance</h1>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-600/20 text-violet-300 border border-violet-500/30">
            {isAdmin ? 'Full Administrator Access' : `${user?.role || 'Standard'} Mode`}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure security alert delivery pipelines, dynamic threat scoring formulas, audit trails, and inspect infrastructure health
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.45)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
          }`}
        >
          <Bell size={15} />
          <span>Notifications & Alerts</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
            All Roles
          </span>
        </button>

        <button
          onClick={() => setActiveTab('weights')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'weights'
              ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.45)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
          }`}
        >
          <Sliders size={15} />
          <span>Threat Scoring Rules</span>
          {!isAdmin && <Lock size={12} className="text-slate-500" />}
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-900/60 text-violet-300 font-mono">
            Admin Only
          </span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'health'
              ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.45)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
          }`}
        >
          <Server size={15} />
          <span>System Health & API</span>
          {!isAdmin && <Lock size={12} className="text-slate-500" />}
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-900/60 text-violet-300 font-mono">
            Admin Only
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.45)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
          }`}
        >
          <ScrollText size={15} />
          <span>Security & Audit Trail</span>
          {!canViewAudit && <Lock size={12} className="text-slate-500" />}
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono">
            Admin / Mgr
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ml_model')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'ml_model'
              ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.45)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
          }`}
        >
          <Brain size={15} className={activeTab === 'ml_model' ? 'text-white' : 'text-cyan-400'} />
          <span>ML Corroboration Model</span>
          {!isAdmin && <Lock size={12} className="text-slate-500" />}
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
            Admin Only
          </span>
        </button>

        <button
          onClick={() => setActiveTab('live_ingestion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'live_ingestion'
              ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.45)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
          }`}
        >
          <Radio size={15} className={activeTab === 'live_ingestion' ? 'text-white' : 'text-emerald-400'} />
          <span>Live Ingestion (Experimental)</span>
          {!isAdmin && <Lock size={12} className="text-slate-500" />}
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono">
            Scoped Module
          </span>
        </button>
      </div>


      {/* TAB 1: Notifications & Alerts (AVAILABLE FOR ALL ROLES) */}
      {activeTab === 'notifications' && (
        <GlassCard variant="elevated" className="p-6 space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-base font-bold text-white tracking-tight">
              Security Notification & Escalation Pipelines
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated delivery policies for behavioral risk thresholds and digest reports (Available to all roles)
            </p>
          </div>

          {isLoadingNotifs ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-violet-400" />
              <span className="text-xs">Loading alert configurations...</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Delivery Channels Status & Testing Controls (Milestone 4) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/25 via-[#131126] to-[#0D0C15] border border-violet-500/20 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Radio size={15} className="text-violet-400 animate-pulse" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Outbound Dispatch Channels & Testing
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Live SMTP email & Slack webhook status. Unconfigured channels remain inert and are logged honestly.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTriggerDailyDigest}
                      disabled={isTriggeringDigest}
                      className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      title="Synthesize 24-hour fleet security posture digest and attempt dispatch"
                    >
                      {isTriggeringDigest ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      <span>Send Digest Now</span>
                    </button>

                    <button
                      onClick={() => handleTriggerTestAlert('CRITICAL')}
                      disabled={isTriggeringTest}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      title="Send test alert across configured channels & verify audit record"
                    >
                      {isTriggeringTest ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                      <span>Send Test Alert</span>
                    </button>
                  </div>
                </div>

                {/* Status Badges Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* SMTP Email */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-violet-400" />
                        <span className="text-xs font-bold text-white">SMTP Email Gateway</span>
                      </div>
                      {deliveryStatus?.email_configured ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          Configured & Active
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Not Configured (Inert)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {deliveryStatus?.email_configured
                        ? `Outbound SMTP host active: ${deliveryStatus.email_host || 'configured'} (${deliveryStatus.email_from || 'soc@internal'})`
                        : 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables to enable live email delivery.'}
                    </p>
                  </div>

                  {/* Slack Webhook */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-violet-400" />
                        <span className="text-xs font-bold text-white">Slack Webhook Channel</span>
                      </div>
                      {deliveryStatus?.slack_configured ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          Configured & Active
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Not Configured (Inert)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {deliveryStatus?.slack_configured
                        ? `Broadcasting real-time security alerts to ${deliveryStatus.slack_webhook_masked || 'configured incoming webhook'}.`
                        : 'Set SLACK_WEBHOOK_URL environment variable to broadcast critical alerts directly into Slack.'}
                    </p>
                  </div>
                </div>

                {/* Action Feedback Banner */}
                {actionFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                      actionFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : actionFeedback.type === 'error'
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {actionFeedback.type === 'success' ? (
                      <CheckCircle2 size={14} className="shrink-0" />
                    ) : (
                      <AlertTriangle size={14} className="shrink-0" />
                    )}
                    <span>{actionFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Toggle 1: High Severity */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      High Severity Alert Delivery
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-600/15 text-violet-300 border border-violet-500/20 font-medium">
                      All Roles Granted
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Broadcast immediate alerts when employee threat scores surpass the 60% high-risk threshold.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.high_severity_alerts}
                  onChange={(e) =>
                    setNotifications({ ...notifications, high_severity_alerts: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Toggle 2: Critical Severity */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Critical Severity Urgent Alerts
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/20 font-medium">
                      Priority Triage
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Instant escalation to SOC Engineering team for privilege escalation bypasses and exfiltrations.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.critical_severity_urgent}
                  onChange={(e) =>
                    setNotifications({ ...notifications, critical_severity_urgent: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Toggle 3: Daily Digest */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Daily Security Digest Report
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20 font-medium">
                      Executive Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Synthesize a 24-hour executive summary of fleet threat velocity and departmental posture.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.daily_security_digest}
                  onChange={(e) =>
                    setNotifications({ ...notifications, daily_security_digest: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-violet-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={15} />
              <span>Notification configuration active for {user?.role || 'User'}</span>
            </div>

            <button
              onClick={handleSaveNotifications}
              disabled={isSavingNotifs || isLoadingNotifs}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-xs shadow-[0_0_15px_rgba(139,92,246,0.35)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingNotifs ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>

          {notifsStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              {notifsStatus}
            </div>
          )}
        </GlassCard>
      )}

      {/* TAB 2: Threat Scoring Rules (ADMINISTRATOR ONLY) */}
      {activeTab === 'weights' && (
        <>
          {!isAdmin ? (
            <GlassCard variant="elevated" className="p-8 text-center flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Lock size={32} />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-white">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Modifying organizational 5-factor risk scoring weights and algorithm thresholds requires Administrator governance privileges.
                  Your current account role is <span className="text-violet-400 font-semibold">{user?.role}</span>.
                </p>
              </div>
            </GlassCard>
          ) : (
            <GlassCard variant="elevated" className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Configurable Threat Scoring Weights
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust organizational weights for the 5-factor deterministic risk calculation engine
                  </p>
                </div>

                <button
                  onClick={handleResetWeights}
                  disabled={isSavingWeights}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:border-violet-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Restore Default Weights</span>
                </button>
              </div>

              {/* Running Total Weight Sum Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isValidSum
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isValidSum ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span className="text-xs font-bold">
                    {isValidSum
                      ? 'Total Weight Sum: Exactly 100% (Formula Balanced)'
                      : `Warning: Total Weight Sum is ${totalWeight}% (Must equal exactly 100%)`}
                  </span>
                </div>
                <span className="text-sm font-black font-mono">{totalWeight}%</span>
              </div>

              {/* 5 Weight Sliders */}
              <div className="space-y-5">
                {/* Slider 1: Behavioral Anomalies (35%) */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">1. Behavioral Anomalies</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-300 font-mono">Signals: Volume, Spikes, After-Hours</span>
                    </div>
                    <span className="font-mono font-black text-violet-300 text-sm">
                      {Math.round(weights.behavioral_anomalies * 100)}% ({weights.behavioral_anomalies})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Off-hour logins, activity frequency deviations, and abnormal daily volume spikes.
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(weights.behavioral_anomalies * 100)}
                    onChange={(e) => handleWeightChange('behavioral_anomalies', Number(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>

                {/* Slider 2: Privilege Misuse (25%) */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">2. Privilege Misuse Indicators</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">Signals: Sudo, Role Escalation, SAM</span>
                    </div>
                    <span className="font-mono font-black text-violet-300 text-sm">
                      {Math.round(weights.privilege_misuse * 100)}% ({weights.privilege_misuse})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    SUDO escalations, unauthorized admin access changes, SAM registry injection attempts.
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(weights.privilege_misuse * 100)}
                    onChange={(e) => handleWeightChange('privilege_misuse', Number(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>

                {/* Slider 3: Data Access Violations (20%) */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">3. Data Access Violations</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Signals: File Dumps, USB, Exfil</span>
                    </div>
                    <span className="font-mono font-black text-violet-300 text-sm">
                      {Math.round(weights.data_access_violations * 100)}% ({weights.data_access_violations})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Massive file downloads, unapproved external cloud uploads, USB storage transfers.
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(weights.data_access_violations * 100)}
                    onChange={(e) => handleWeightChange('data_access_violations', Number(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>

                {/* Slider 4: Access Pattern Deviations (10%) */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">4. Access Pattern Deviations</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">Signals: Unusual IP, VPN, ASN</span>
                    </div>
                    <span className="font-mono font-black text-violet-300 text-sm">
                      {Math.round(weights.access_pattern_deviations * 100)}% ({weights.access_pattern_deviations})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Unrecognized external IP routing, anomalous ASN origins, VPN session deviations.
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(weights.access_pattern_deviations * 100)}
                    onChange={(e) => handleWeightChange('access_pattern_deviations', Number(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>

                {/* Slider 5: Historical Security Events (10%) */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">5. Historical Security Events</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Signals: Past Violations, 30d Baseline</span>
                    </div>
                    <span className="font-mono font-black text-violet-300 text-sm">
                      {Math.round(weights.historical_security_events * 100)}% ({weights.historical_security_events})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Cumulative historical security audit baseline and repeat incident density.
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(weights.historical_security_events * 100)}
                    onChange={(e) => handleWeightChange('historical_security_events', Number(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-end">
                <button
                  onClick={handleSaveWeights}
                  disabled={!isValidSum || isSavingWeights}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-xs shadow-[0_0_15px_rgba(139,92,246,0.35)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {isSavingWeights ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Persisting Scoring Weights...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Scoring Weights</span>
                    </>
                  )}
                </button>
              </div>

              {weightsStatus && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    weightsStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {weightsStatus.message}
                </div>
              )}
            </GlassCard>
          )}
        </>
      )}

      {/* TAB 3: System Health & API (ADMINISTRATOR ONLY) */}
      {activeTab === 'health' && (
        <>
          {!isAdmin ? (
            <GlassCard variant="elevated" className="p-8 text-center flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Lock size={32} />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-white">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time microservice latency telemetry, WAL database diagnostic probes, and low-level API session governance are restricted to Administrator accounts.
                  Your current account role is <span className="text-violet-400 font-semibold">{user?.role}</span>.
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-6">
              {/* Live Service & Database Health Panel */}
              <GlassCard variant="elevated" className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Live Service & Database Health Diagnostics
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time operational availability and latency across backend microservices
                    </p>
                  </div>

                  <button
                    onClick={handleRefreshHealth}
                    disabled={isLoadingHealth}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:border-violet-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} className={isLoadingHealth ? 'animate-spin' : ''} />
                    <span>Re-check Health Status</span>
                  </button>
                </div>

                {health && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {health.services.map((srv) => (
                      <div
                        key={srv.name}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate max-w-[180px]">
                            {srv.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                            {srv.status}
                          </span>
                        </div>
                        <div className="text-lg font-black text-violet-300 font-mono">
                          {srv.latency_ms} ms
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">{srv.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* API Endpoints & Swagger Docs */}
              <GlassCard variant="elevated" className="p-6 space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    API Endpoints & Swagger UI Documentation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    FastAPI OpenAPI 3.1 specification and live telemetry ingest routes
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">API Base URL</span>
                    <div className="flex items-center justify-between bg-white/[0.03] p-2 rounded-lg border border-white/5 font-mono text-violet-300">
                      <span className="truncate">{health?.api_base_url || 'http://127.0.0.1:8000/api'}</span>
                      <button
                        onClick={() => handleCopyApiUrl(health?.api_base_url || 'http://127.0.0.1:8000/api')}
                        className="text-slate-400 hover:text-white transition-colors ml-2 cursor-pointer"
                        title="Copy API Base URL"
                      >
                        {copiedApi ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Interactive API Docs
                    </span>
                    <a
                      href={health?.swagger_url || 'http://127.0.0.1:8000/docs'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between bg-violet-600/15 hover:bg-violet-600/25 p-2 rounded-lg border border-violet-500/30 font-semibold text-violet-300 hover:text-white transition-colors"
                    >
                      <span>Open Swagger UI / OpenAPI Docs</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </GlassCard>

              {/* Current Session & Security Protocols */}
              <GlassCard variant="elevated" className="p-6 space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Current Session & Security Protocol
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Active administrator cryptographic session and token isolation standard
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Auth Standard</span>
                    <div className="font-mono text-white font-bold">{health?.jwt_standard}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Session Status</span>
                    <div className="font-mono text-emerald-400 font-bold">Active • Administrator Verified</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Token Protection</span>
                    <div className="font-mono text-violet-300 font-bold">{health?.token_protection}</div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={logout}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out Active Session</span>
                  </button>
                </div>
              </GlassCard>
            </div>
          )}
        </>
      )}

      {/* TAB 4: Security & Audit Trail (ADMINISTRATOR & SECURITY MANAGER ONLY) */}
      {activeTab === 'audit' && (
        <>
          {!canViewAudit ? (
            <GlassCard variant="elevated" className="p-8 text-center flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Lock size={32} />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-white">Privileged Access Required</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Viewing the system-wide security audit trail and data access history requires Administrator or Security Manager privileges.
                  Your current account role is <span className="text-violet-400 font-semibold">{user?.role}</span>.
                </p>
              </div>
            </GlassCard>
          ) : (
            <GlassCard variant="elevated" className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ScrollText size={18} className="text-violet-400" />
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Security Operations & Access Audit Trail
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    CloudTrail-style immutable record tracking sensitive reads, PII bulk exports, scoring formula updates, and recalculations
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <button
                    onClick={handleExportAuditTrail}
                    disabled={isExportingAudit}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-600/15 border border-violet-500/30 text-violet-300 hover:bg-violet-600/25 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Export all filtered audit logs as CSV"
                  >
                    {isExportingAudit ? (
                      <Loader2 size={13} className="animate-spin text-violet-400" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span>Export Audit Trail (CSV)</span>
                  </button>

                  <button
                    onClick={fetchAuditLogs}
                    disabled={isLoadingAudit}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:border-violet-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} className={isLoadingAudit ? 'animate-spin text-violet-400' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {auditExportMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {auditExportMsg}
                </div>
              )}


              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by actor email..."
                    value={auditUserSearch}
                    onChange={(e) => setAuditUserSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchAuditLogs();
                    }}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#171526] border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="All">All Actions</option>
                  <option value="INCIDENT_CREATED">INCIDENT_CREATED</option>
                  <option value="INCIDENT_STATUS_CHANGED">INCIDENT_STATUS_CHANGED</option>
                  <option value="INCIDENT_ASSIGNED">INCIDENT_ASSIGNED</option>
                  <option value="INCIDENT_RESOLVED">INCIDENT_RESOLVED</option>
                  <option value="EXPORT_INCIDENTS_CSV">EXPORT_INCIDENTS_CSV</option>
                  <option value="EXPORT_DIRECTORY_CSV">EXPORT_DIRECTORY_CSV</option>
                  <option value="EXPORT_DOSSIER_JSON">EXPORT_DOSSIER_JSON</option>
                  <option value="EXPORT_TELEMETRY_CSV">EXPORT_TELEMETRY_CSV</option>
                  <option value="EXPORT_FLEET_CSV">EXPORT_FLEET_CSV</option>
                  <option value="RECALCULATE_RISK_PERSIST">RECALCULATE_RISK_PERSIST</option>
                  <option value="RECALCULATE_RISK_PREVIEW">RECALCULATE_RISK_PREVIEW</option>
                  <option value="VIEW_EMPLOYEE_DOSSIER">VIEW_EMPLOYEE_DOSSIER</option>
                  <option value="UPDATE_WEIGHTS">UPDATE_WEIGHTS</option>
                  <option value="UPDATE_NOTIFICATIONS">UPDATE_NOTIFICATIONS</option>
                  <option value="HEALTH_CHECK_DIAGNOSTICS">HEALTH_CHECK_DIAGNOSTICS</option>
                </select>

              </div>

              {/* Audit Table */}
              {isLoadingAudit ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 size={32} className="animate-spin text-violet-400" />
                  <span className="text-xs">Querying audit records...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <ScrollText size={32} className="text-slate-600" />
                  <span className="text-sm font-semibold text-white">No audit records match the current filter</span>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Actor & Role</th>
                        <th className="px-4 py-3">Action Type</th>
                        <th className="px-4 py-3">Target Resource</th>
                        <th className="px-4 py-3">Source IP</th>
                        <th className="px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {auditLogs.map((log) => {
                        const isExpanded = expandedAuditId === log.id;
                        return (
                          <React.Fragment key={log.id}>
                            <tr
                              onClick={() => setExpandedAuditId(isExpanded ? null : log.id)}
                              className={`hover:bg-violet-500/10 transition-colors cursor-pointer ${
                                isExpanded ? 'bg-violet-600/10' : ''
                              }`}
                            >
                              <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                                <div>{formatDateTime(log.timestamp)}</div>
                                <div className="text-[10px] text-slate-500">{formatRelativeTime(log.timestamp)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-white">{log.user_email}</div>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-violet-300 font-mono">
                                  {log.user_role}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                    log.action.startsWith('EXPORT')
                                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                      : log.action.includes('PERSIST')
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      : log.action.includes('PREVIEW')
                                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                      : log.action.startsWith('UPDATE')
                                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                                      : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                  }`}
                                >
                                  {log.action}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-300">
                                {log.target_resource || '—'}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-400">
                                {log.ip_address || '127.0.0.1'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button className="text-violet-400 hover:text-violet-200 font-mono text-[11px]">
                                  {isExpanded ? 'Collapse' : 'Inspect'}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="px-4 py-3 bg-[#11101C] border-b border-violet-500/20">
                                  <div className="space-y-2">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                      Audit Event Payload & Execution Context (Event #{log.id}):
                                    </span>
                                    <pre className="p-3 rounded-lg bg-black/60 border border-white/5 text-[11px] font-mono text-violet-300 overflow-x-auto">
                                      {JSON.stringify(log.details || {}, null, 2)}
                                    </pre>
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
          )}
        </>
      )}

      {/* TAB 5: ML Anomaly Corroboration Model (Admin only) */}
      {activeTab === 'ml_model' && (
            <div className="space-y-6">
              {!isAdmin ? (
                <GlassCard variant="elevated" className="p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                    <Lock size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Administrator Privileges Required</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Access to the Multi-Feature Isolation Forest model architecture, hyperparameter inspection, and retraining triggers is restricted to administrators.
                  </p>
                </GlassCard>
              ) : (
                <>
                  {/* ML Model Overview & Status Header */}
                  <GlassCard variant="elevated" className="p-6 space-y-6 border-cyan-500/20 bg-gradient-to-br from-[#121b2a] via-[#101420] to-[#151324]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <Brain size={22} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                            ML Anomaly Corroboration Model
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                              Isolation Forest
                            </span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Additive unsupervised ML model providing independent corroborating signals across 5 multi-dimensional telemetry vectors
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {mlMeta?.status || 'Operational & Ready'}
                        </span>
                      </div>
                    </div>

                    {/* Status Feedback Toast / Banner */}
                    {mlStatus && (
                      <div
                        className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                          mlStatus.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {mlStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span className="font-mono">{mlStatus.message}</span>
                      </div>
                    )}

                    {/* 5-Feature Vector Architecture Grid */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono flex items-center gap-1.5">
                          <Cpu size={14} /> 5-Feature Daily Vector Architecture
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Aggregated Per-Employee Per-Calendar-Day
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Vector 1</div>
                          <div className="text-xs font-semibold text-white">Daily Event Volume</div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Total telemetry event count across all security audit sources per day.
                          </p>
                          <div className="text-[10px] font-mono text-slate-500 pt-1">daily_event_volume</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Vector 2</div>
                          <div className="text-xs font-semibold text-white">Off-Hours Activity Ratio</div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Proportion of daily events outside employee's personalized behavioral baseline.
                          </p>
                          <div className="text-[10px] font-mono text-slate-500 pt-1">off_hours_ratio</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Vector 3</div>
                          <div className="text-xs font-semibold text-white">Data Transfer (MB)</div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Aggregated megabytes across downloads, uploads, and USB writes.
                          </p>
                          <div className="text-[10px] font-mono text-slate-500 pt-1">data_transfer_volume_mb</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Vector 4</div>
                          <div className="text-xs font-semibold text-white">Privilege Escalations</div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Daily count of SUDO, domain admin, or permission change attempts.
                          </p>
                          <div className="text-[10px] font-mono text-slate-500 pt-1">privilege_change_count</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Vector 5</div>
                          <div className="text-xs font-semibold text-white">Anomaly Flag Count</div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Daily telemetry events flagged with anomaly categories or HIGH/CRITICAL severity.
                          </p>
                          <div className="text-[10px] font-mono text-slate-500 pt-1">anomaly_tag_count</div>
                        </div>
                      </div>
                    </div>

                    {/* Model Specification & Normalization Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-white/5 pt-5">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                          Training Sample Size
                        </span>
                        <div className="text-lg font-bold text-white font-mono">
                          {mlMeta?.sample_size || 501} <span className="text-xs text-slate-400 font-normal">Employee-Days</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                          Ensemble & Scaling
                        </span>
                        <div className="text-sm font-bold text-cyan-300 font-mono">
                          100 Trees + StandardScaler
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                          Empirical Decision Range
                        </span>
                        <div className="text-xs font-bold text-slate-200 font-mono">
                          [{mlMeta?.observed_min !== undefined && mlMeta?.observed_min !== null ? mlMeta.observed_min.toFixed(4) : '-0.1852'} , {mlMeta?.observed_max !== undefined && mlMeta?.observed_max !== null ? mlMeta.observed_max.toFixed(4) : '0.1218'}]
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                          Last Retrained
                        </span>
                        <div className="text-xs font-bold text-violet-300 font-mono">
                          {mlMeta?.last_trained ? formatDateTime(mlMeta.last_trained) : 'Initial Seeding'}
                        </div>
                      </div>
                    </div>

                    {/* Retrain Action Card */}
                    <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1 text-center sm:text-left">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                          <Sparkles size={14} className="text-cyan-400" />
                          Retrain Isolation Forest Model
                        </div>
                        <p className="text-[11px] text-slate-400 max-w-xl">
                          Re-runs per-employee-per-day feature engineering across current telemetry, fits the Isolation Forest ensemble, updates empirical normalization bounds, recalculates corroboration scores for all 16 employees, and records a <span className="font-mono text-cyan-300">RETRAIN_ML_MODEL</span> audit event.
                        </p>
                      </div>

                      <button
                        onClick={handleRetrainMlModel}
                        disabled={isRetrainingMl}
                        className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                      >
                        {isRetrainingMl ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Retraining Model...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} />
                            Retrain ML Model Now
                          </>
                        )}
                      </button>
                    </div>
                  </GlassCard>
                </>
              )}
            </div>
          )}

          {/* TAB 6: Live Windows Ingestion (Scoped Exception Module - Admin only) */}
          {activeTab === 'live_ingestion' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {!isAdmin ? (
                <GlassCard variant="elevated" className="p-8 text-center space-y-3">
                  <Lock size={36} className="mx-auto text-slate-500" />
                  <h3 className="text-base font-bold text-white">Administrator Access Required</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Live Windows Event Log Ingestion and identity mapping governance can only be accessed and configured by users with the Administrator role.
                  </p>
                </GlassCard>
              ) : (
                <>
                  {/* Scoped Exception Architectural Guardrail Banner */}
                  <div className="p-5 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 space-y-3 shadow-[0_0_25px_rgba(16,185,129,0.1)]">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 shrink-0 mt-0.5">
                        <Radio size={20} className="text-emerald-400 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white tracking-tight">
                            Live Windows Event Log Listener — Scoped Exception Module
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Default OFF (ENABLE_LIVE_WINDOWS_LISTENER={liveStatus?.is_enabled ? 'true' : 'false'})
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          This module is a <strong>deliberate, narrow exception</strong> to AMS's standard rule of running strictly on curated, benchmark seeded data. It listens directly to real OS-level Windows Event Logs (Security & System channels) and normalizes events into AMS's existing telemetry schema.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-emerald-500/20 text-xs">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck size={13} />
                          Guardrail 1: Zero New Employees
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Unmapped Windows accounts are quarantined in the unmapped audit log; no employee records are ever auto-provisioned.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <UserCheck size={13} />
                          Guardrail 2: Pre-Existing Identities
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Live telemetry can only be attributed to existing seeded employees via the validated identity mappings table below.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <Terminal size={13} />
                          Guardrail 3: Standard Telemetry Schema
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Events normalize into standard types (LOGIN, PRIVILEGE_CHANGE, USB_DEVICE) and carry a <span className="font-mono text-emerald-300">LIVE</span> badge.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <Sliders size={13} />
                          Guardrail 4: Scoring Untouched
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Downstream UEBA profiling, Z-scores, and risk scoring pipelines process live rows with zero modifications.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Status & Diagnostics Matrix */}
                  <GlassCard variant="elevated" className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Server size={18} className="text-emerald-400" />
                          <h3 className="text-base font-bold text-white tracking-tight">
                            Listener Operational Diagnostics & Hardware Compatibility
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Real-time status of the OS-level event polling worker and Windows subsystem hooks.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={fetchLiveIngestionData}
                        disabled={isLoadingLiveIngestion}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw size={13} className={isLoadingLiveIngestion ? 'animate-spin text-emerald-400' : ''} />
                        <span>Refresh Diagnostics</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Metric 1: Service Running Status */}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                          Service Status
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            liveStatus?.is_running
                              ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse'
                              : liveStatus?.is_enabled
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                          }`} />
                          <span className="text-sm font-bold text-white font-mono">
                            {liveStatus?.status_summary || 'Checking...'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {liveStatus?.message || 'Inspecting service process...'}
                        </p>
                      </div>

                      {/* Metric 2: Host OS & pywin32 API */}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                          Host Platform & Driver
                        </span>
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${liveStatus?.is_windows ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span>{liveStatus?.is_windows ? 'Windows NT Subsystem' : 'Non-Windows Host OS'}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${liveStatus?.pywin32_available ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span>{liveStatus?.pywin32_available ? 'pywin32 (win32evtlog) Ready' : 'pywin32 Not Installed'}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {liveStatus?.has_event_log_access ? 'Full EventLog read handle granted' : 'EventLog access: Pending or Standby'}
                        </p>
                      </div>

                      {/* Metric 3: Channels & Heartbeat */}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                          Channels & Heartbeat
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(liveStatus?.channels_monitored || ['Security', 'System']).map((ch) => (
                            <span key={ch} className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                              {ch}
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-500 font-mono">
                            @{liveStatus?.poll_interval_seconds || 5.0}s
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <span className="text-slate-500 block">Last Event Processed:</span>
                          <span className="font-mono text-emerald-300">
                            {liveStatus?.last_event_timestamp ? formatDateTime(liveStatus.last_event_timestamp) : 'No events ingested yet'}
                          </span>
                        </div>
                      </div>

                      {/* Metric 4: Ingestion Counters */}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                          Telemetry Ingestion Audit
                        </span>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 block">Mapped & Attributed</span>
                            <span className="text-base font-bold text-emerald-400 font-mono">
                              {liveStatus?.total_mapped_processed || 0}
                            </span>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <span className="text-[10px] text-slate-500 block">Quarantined Unmapped</span>
                            <span className="text-base font-bold text-amber-400 font-mono">
                              {liveStatus?.total_unmapped_processed || unmappedLogs.length || 0}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Tagged with <span className="font-mono text-emerald-400">source="live_windows_listener"</span>
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Identity Mapping Management Card */}
                  <GlassCard variant="elevated" className="p-6 space-y-6">
                    <div className="border-b border-white/5 pb-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <UserCheck size={18} className="text-emerald-400" />
                        <h3 className="text-base font-bold text-white tracking-tight">
                          Windows Account &rarr; Seeded Employee Identity Mappings
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Link real Windows identifiers (e.g. <span className="font-mono text-slate-300">CORP\elena.rostova</span> or workstation user accounts) to pre-existing seeded employees. Events from unmapped accounts will be strictly quarantined.
                      </p>
                    </div>

                    {/* Add Mapping Form (STRICTLY POPULATED FROM SEEDED EMPLOYEES) */}
                    <form onSubmit={handleCreateMapping} className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-4">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Plus size={14} className="text-emerald-400" />
                        <span>Register New Identity Mapping</span>
                      </div>

                      {mappingError && (
                        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>{mappingError}</span>
                        </div>
                      )}

                      {mappingSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle2 size={14} className="shrink-0" />
                          <span>{mappingSuccess}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Windows Account Identifier *
                          </label>
                          <input
                            type="text"
                            value={newWinId}
                            onChange={(e) => setNewWinId(e.target.value)}
                            placeholder="e.g. CORP\elena.rostova or username"
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Target Seeded Employee *
                          </label>
                          <select
                            value={newEmpId}
                            onChange={(e) => setNewEmpId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#171526] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                          >
                            {employeesList.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.full_name} ({emp.id}) — {emp.department}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Description / Workstation (Optional)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newMappingDesc}
                              onChange={(e) => setNewMappingDesc(e.target.value)}
                              placeholder="e.g. Corporate ThinkPad workstation"
                              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                            <button
                              type="submit"
                              disabled={isSavingMapping}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] disabled:opacity-50 cursor-pointer"
                            >
                              {isSavingMapping ? 'Saving...' : 'Add Mapping'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>

                    {/* Mappings Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Active Identity Mappings ({identityMappings.length})</span>
                      </div>

                      {identityMappings.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs border border-white/5 rounded-xl">
                          No identity mappings configured yet. Use the form above to link a Windows account to a seeded employee.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
                              <tr>
                                <th className="px-4 py-3">Windows Identifier</th>
                                <th className="px-4 py-3">Attributed Employee</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Created</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {identityMappings.map((m) => (
                                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3 font-mono font-bold text-emerald-300">
                                    {m.windows_identifier}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-white">{m.employee_name || m.employee_id}</div>
                                    <span className="text-[10px] font-mono text-slate-400">{m.employee_id}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                                      {m.department || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-400">
                                    {m.description || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                                    {formatDateTime(m.created_at)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      disabled={deletingMappingId === m.id}
                                      onClick={() => handleDeleteMapping(m.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                                      title="Remove identity mapping"
                                    >
                                      {deletingMappingId === m.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <Trash2 size={14} />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  {/* Quarantined Unmapped Events Log */}
                  <GlassCard variant="elevated" className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={18} className="text-amber-400" />
                          <h3 className="text-base font-bold text-white tracking-tight">
                            Quarantined Unmapped Telemetry Stream
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Windows events captured from accounts not linked to any seeded employee identity. In accordance with Guardrail 1, no employee was created and no telemetry was attributed.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={unmappedSearch}
                          onChange={(e) => setUnmappedSearch(e.target.value)}
                          placeholder="Filter identifier..."
                          className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        <select
                          value={unmappedChannelFilter}
                          onChange={(e) => setUnmappedChannelFilter(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#171526] border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-amber-500"
                        >
                          <option value="All">All Channels</option>
                          <option value="Security">Security</option>
                          <option value="System">System</option>
                        </select>
                      </div>
                    </div>

                    {unmappedLogs.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs border border-white/5 rounded-xl">
                        No quarantined unmapped events recorded. All ingested events matched registered employee mappings or listener is on standby.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
                            <tr>
                              <th className="px-4 py-3">Timestamp</th>
                              <th className="px-4 py-3">Channel & Event ID</th>
                              <th className="px-4 py-3">Event Type</th>
                              <th className="px-4 py-3">Raw Windows Identifier</th>
                              <th className="px-4 py-3">Quarantine Reason</th>
                              <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {unmappedLogs
                              .filter((log) => {
                                if (unmappedChannelFilter !== 'All' && log.channel.toLowerCase() !== unmappedChannelFilter.toLowerCase()) return false;
                                if (unmappedSearch && !log.raw_identifier.toLowerCase().includes(unmappedSearch.toLowerCase())) return false;
                                return true;
                              })
                              .map((log) => (
                                <tr key={log.id} className="hover:bg-amber-500/5 transition-colors">
                                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                                    {formatDateTime(log.timestamp)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs font-bold text-white block">
                                      {log.channel}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">Event ID: {log.event_id}</span>
                                  </td>
                                  <td className="px-4 py-3 font-mono font-bold text-violet-300">
                                    {log.event_type}
                                  </td>
                                  <td className="px-4 py-3 font-mono font-bold text-amber-300">
                                    {log.raw_identifier}
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                                    {log.reason}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewWinId(log.raw_identifier);
                                        window.scrollTo({ top: 400, behavior: 'smooth' });
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                                      title="Map this Windows account to a seeded employee"
                                    >
                                      <Plus size={11} />
                                      <span>Map to Employee</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </GlassCard>
                </>
              )}
            </div>
          )}
    </div>
  );
}

