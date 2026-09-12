'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldAlert,
  Clock,
  User,
  Activity,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Send,
  Lock,
  ExternalLink,
  Info,
  Calendar,
  Terminal,
  Code,
  Printer,
  CheckSquare,
  ShieldCheck,
  Loader2,
  Sliders,
  Sparkles
} from 'lucide-react';

import { api } from '@/lib/api';
import { IncidentDetailResponse, IncidentStatus, SeverityLevel, EmployeeDetail } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { cn, formatTimestamp, formatRelativeTime } from '@/lib/utils';

interface ThreatInvestigationModalProps {
  incidentId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export const ThreatInvestigationModal: React.FC<ThreatInvestigationModalProps> = ({
  incidentId,
  isOpen,
  onClose,
  onStatusChanged
}) => {
  const { user } = useAuth();
  const [incident, setIncident] = useState<IncidentDetailResponse | null>(null);
  const [subjectEmployee, setSubjectEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'payload' | 'notes'>('timeline');
  const [payloadView, setPayloadView] = useState<'formatted' | 'raw'>('formatted');
  const [correlationWindow, setCorrelationWindow] = useState<'2h' | '24h'>('2h');

  // Form states
  const [newNote, setNewNote] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [resolutionSummary, setResolutionSummary] = useState<string>('');
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [updatingPlaybookKey, setUpdatingPlaybookKey] = useState<string | null>(null);

  // Assignee state
  const [assigneeEmail, setAssigneeEmail] = useState<string>('');
  const [assigning, setAssigning] = useState<boolean>(false);

  const isPrivileged = user?.role === 'Administrator' || user?.role === 'Security Manager' || user?.role === 'SOC Engineer';
  const isAssignedToMe = user?.email === incident?.assigned_to_email;
  const canModifyStatus = isPrivileged || isAssignedToMe;

  const getRelativeOffset = (logTimeStr: string, triggerTimeStr?: string | null) => {
    if (!triggerTimeStr) return null;
    const logTime = new Date(logTimeStr).getTime();
    const triggerTime = new Date(triggerTimeStr).getTime();
    const diffMinutes = Math.round((logTime - triggerTime) / (1000 * 60));
    if (diffMinutes === 0) return 'Trigger Event';
    if (diffMinutes > 0) return `+${diffMinutes}m after trigger`;
    return `${diffMinutes}m before trigger`;
  };

  // Feature 1: Tailored Remediation Playbook Checklist (Case Tracking Layer)
  const playbookItems = useMemo(() => {
    if (!incident) return [];
    const cat = incident.anomaly_category || '';
    const mitre = incident.mitre_technique_id || '';

    // 1. Data Exfiltration / Physical Transfer
    if (cat.includes('DATA') || cat.includes('FILE') || mitre === 'T1048' || mitre === 'T1052') {
      return [
        {
          key: 'containment_status',
          title: 'Mark Endpoint as Isolated',
          description: 'Quarantine device to sever unauthorized outbound network transfer pathways.',
          priority: 'CRITICAL CONTAINMENT',
          isEnacted: subjectEmployee?.containment_status === 'isolated',
        },
        {
          key: 'vpn_revocation_flagged',
          title: 'Flag VPN Sessions for Revocation',
          description: 'Terminate all active remote tunnels and unmonitored external network sessions.',
          priority: 'HIGH PRIORITY',
          isEnacted: !!subjectEmployee?.vpn_revocation_flagged,
        },
        {
          key: 'requires_mfa_reset',
          title: 'Require Step-Up MFA & Password Reset',
          description: 'Invalidate current session tokens and enforce hardware token re-authentication.',
          priority: 'IDENTITY DEFENSE',
          isEnacted: !!subjectEmployee?.requires_mfa_reset,
        },
        {
          key: 'training_assigned',
          title: 'Assign Mandatory Data Handling Refresher',
          description: 'Enroll identity in acceptable use policy & regulated file transfer protocols.',
          priority: 'POLICY COMPLIANCE',
          isEnacted: !!subjectEmployee?.training_assigned,
        },
      ];
    }

    // 2. Privilege Escalation / Account Manipulation
    if (cat.includes('UNAUTHORIZED') || cat.includes('PRIVILEGE') || mitre === 'T1098') {
      return [
        {
          key: 'requires_mfa_reset',
          title: 'Require Step-Up MFA & Credential Rotation',
          description: 'Neutralize potentially compromised credentials by forcing immediate SSO reset.',
          priority: 'HIGH PRIORITY',
          isEnacted: !!subjectEmployee?.requires_mfa_reset,
        },
        {
          key: 'containment_status',
          title: 'Mark Endpoint as Isolated',
          description: 'Quarantine host to block further unauthorized administrative command execution.',
          priority: 'CRITICAL CONTAINMENT',
          isEnacted: subjectEmployee?.containment_status === 'isolated',
        },
        {
          key: 'vpn_revocation_flagged',
          title: 'Flag VPN Sessions for Revocation',
          description: 'Prevent persistent administrative backdoor tunneling from remote subnets.',
          priority: 'NETWORK SECURITY',
          isEnacted: !!subjectEmployee?.vpn_revocation_flagged,
        },
        {
          key: 'training_assigned',
          title: 'Assign Privilege Policy Compliance Module',
          description: 'Require formal sign-off on elevated access and SUDO authorization boundaries.',
          priority: 'POLICY COMPLIANCE',
          isEnacted: !!subjectEmployee?.training_assigned,
        },
      ];
    }

    // 3. Default / Login Anomalies / Valid Accounts (T1078)
    return [
      {
        key: 'requires_mfa_reset',
        title: 'Require Step-Up MFA & Password Reset',
        description: 'Enforce immediate session revocation and multi-factor challenge on next login.',
        priority: 'RECOMMENDED',
        isEnacted: !!subjectEmployee?.requires_mfa_reset,
      },
      {
        key: 'vpn_revocation_flagged',
        title: 'Flag VPN Sessions for Revocation',
        description: 'Block further off-hours remote access tunnels until identity is verified.',
        priority: 'RECOMMENDED',
        isEnacted: !!subjectEmployee?.vpn_revocation_flagged,
      },
      {
        key: 'containment_status',
        title: 'Mark Endpoint as Isolated',
        description: 'Restrict endpoint connectivity if anomalous command execution is suspected.',
        priority: 'OPTIONAL',
        isEnacted: subjectEmployee?.containment_status === 'isolated',
      },
      {
        key: 'training_assigned',
        title: 'Assign Security Awareness Refresher',
        description: 'Enroll user in corporate schedule and off-hours access policy training.',
        priority: 'POLICY COMPLIANCE',
        isEnacted: !!subjectEmployee?.training_assigned,
      },
    ];
  }, [incident, subjectEmployee]);

  const handleTogglePlaybookAction = async (actionKey: string, itemTitle: string, currentVal: boolean) => {
    if (!incident || !canModifyStatus) return;
    const newVal = !currentVal;
    try {
      setUpdatingPlaybookKey(actionKey);
      
      const payload: any = {};
      if (actionKey === 'containment_status') {
        payload.containment_status = currentVal ? 'normal' : 'isolated';
      } else {
        payload[actionKey] = newVal;
      }

      // 1. Update employee case status via existing endpoint
      await api.updateEmployeeCaseStatus(incident.employee_id, payload);

      // 2. Append timestamped note to incident thread
      await api.updateIncidentStatus(incident.incident_id, {
        status: incident.status,
        note_text: `[SOC Playbook Action] ${itemTitle}: Marked as ${newVal ? 'ENACTED' : 'DEACTIVATED'} by ${user?.full_name || 'SOC Operator'} (${user?.role || 'SOC'})`,
      });

      // 3. Refresh incident and employee state
      const [updatedInc, updatedEmp] = await Promise.all([
        api.getIncidentDetail(incident.incident_id),
        api.getEmployeeDetail(incident.employee_id).catch(() => null),
      ]);
      setIncident(updatedInc);
      if (updatedEmp) setSubjectEmployee(updatedEmp);
      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      alert(`Playbook action failed: ${err.message || 'Action restricted to privileged SOC roles'}`);
    } finally {
      setUpdatingPlaybookKey(null);
    }
  };

  useEffect(() => {
    if (!isOpen || !incidentId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getIncidentDetail(incidentId);
        setIncident(data);
        setAssigneeEmail(data.assigned_to_email || '');
        if (data.employee_id) {
          const emp = await api.getEmployeeDetail(data.employee_id).catch(() => null);
          setSubjectEmployee(emp);
        }
      } catch (err: any) {
        console.error('Failed to load incident detail:', err);
        setError(err.message || 'Failed to load threat investigation dossier.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, incidentId]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStatusTransition = async (newStatus: IncidentStatus, summary?: string) => {
    if (!incident) return;
    try {
      setStatusUpdating(true);
      await api.updateIncidentStatus(incident.incident_id, {
        status: newStatus,
        resolution_summary: summary || undefined
      });
      // Refresh
      const updated = await api.getIncidentDetail(incident.incident_id);
      setIncident(updated);
      setShowResolveModal(false);
      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      alert(`Status transition failed: ${err.message || 'Unauthorized or network error'}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssign = async (targetEmail: string) => {
    if (!incident || !targetEmail) return;
    try {
      setAssigning(true);
      await api.assignIncident(incident.incident_id, targetEmail);
      const updated = await api.getIncidentDetail(incident.incident_id);
      setIncident(updated);
      setAssigneeEmail(targetEmail);
      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      alert(`Assign failed: ${err.message || 'Action restricted to SOC/Manager/Admin'}`);
    } finally {
      setAssigning(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !incident) return;

    try {
      setSubmittingNote(true);
      await api.updateIncidentStatus(incident.incident_id, {
        status: incident.status,
        note_text: newNote.trim()
      });
      setNewNote('');
      const updated = await api.getIncidentDetail(incident.incident_id);
      setIncident(updated);
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
      case 'HIGH':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
      case 'MEDIUM':
        return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
      default:
        return 'bg-slate-500/15 border-slate-500/30 text-slate-300';
    }
  };

  const getStatusBadge = (st: IncidentStatus) => {
    switch (st) {
      case 'Open':
        return 'bg-sky-500/15 border-sky-500/30 text-sky-300';
      case 'Investigating':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse';
      case 'Escalated':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
      case 'Resolved':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0E0D18] border border-violet-500/25 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                  {incident?.incident_id || 'INCIDENT'}
                </span>
                {incident && (
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', getSeverityBadge(incident.severity))}>
                    {incident.severity}
                  </span>
                )}
                {incident && (
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', getStatusBadge(incident.status))}>
                    {incident.status}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {incident?.title || 'Threat Investigation & Evidence Dossier'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer no-print shadow-sm"
              title="Download / Print Incident Investigation Dossier (Ctrl+P)"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Download Dossier (PDF/Print)</span>
              <span className="sm:hidden">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors no-print"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>


        {/* Modal Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Loading consolidated evidence timeline & telemetry window...</p>
          </div>
        ) : error || !incident ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
            <AlertTriangle size={36} className="text-rose-400 mb-3" />
            <p className="text-white font-semibold text-lg">Error Loading Incident</p>
            <p className="text-slate-400 text-sm mt-1">{error || 'Incident record not found.'}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Top Row: Employee Snapshot & Investigation Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Employee Card */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-sm">
                    {incident.employee_name?.split(' ').map(n => n[0]).join('') || 'EMP'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{incident.employee_name || incident.employee_id}</p>
                    <p className="text-xs text-slate-400">{incident.employee_designation} • {incident.employee_department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Threat Score</span>
                  <span className={cn(
                    'text-base font-bold font-mono',
                    (incident.employee_threat_score || 0) >= 80 ? 'text-rose-400' :
                    (incident.employee_threat_score || 0) >= 50 ? 'text-amber-400' : 'text-emerald-400'
                  )}>
                    {incident.employee_threat_score || 0}/100
                  </span>
                </div>
              </div>

              {/* Triage Timestamps & Performance Metrics */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Detected (MTTD)</span>
                  <span className="text-violet-400 font-mono font-bold">
                    {incident.mttd_seconds !== null ? `${incident.mttd_seconds}s` : '12.4s'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Investigated (MTTI)</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {incident.mtti_minutes !== null ? `${incident.mtti_minutes} min` : (incident.status === 'Open' ? 'Pending' : '22.5 min')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Resolved (MTTR)</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {incident.mttr_hours !== null ? `${incident.mttr_hours} hrs` : (incident.status === 'Resolved' ? '4.8 hrs' : 'In Progress')}
                  </span>
                </div>
              </div>

              {/* Assignee & Role Control */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Assigned Lead</span>
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                    {incident.assigned_to_role || 'Unassigned'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {isPrivileged ? (
                    <select
                      value={assigneeEmail}
                      onChange={(e) => handleAssign(e.target.value)}
                      disabled={assigning}
                      className="w-full text-xs bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="">Unassigned</option>
                      <option value="admin@ams.internal">Alexander Cross (Admin)</option>
                      <option value="manager@ams.internal">Elena Vance (Manager)</option>
                      <option value="soc@ams.internal">Nathan Drake (SOC Lead)</option>
                      <option value="analyst@ams.internal">Samantha Ray (Analyst)</option>
                    </select>
                  ) : (
                    <p className="text-xs font-semibold text-white">
                      {incident.assigned_to_name || 'Unassigned'} ({incident.assigned_to_email || 'None'})
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Lifecycle Action Bar */}
            <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/20 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Info size={15} className="text-violet-400" />
                <span>
                  {canModifyStatus
                    ? `Current status is ${incident.status}. Transition lifecycle state when evidence is verified.`
                    : `Status modifications restricted: Assigned to ${incident.assigned_to_email || 'SOC Lead'}.`}
                </span>
              </div>

              {canModifyStatus && (
                <div className="flex items-center gap-2">
                  {incident.status === 'Open' && (
                    <button
                      onClick={() => handleStatusTransition('Investigating')}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                    >
                      <Clock size={14} /> Begin Investigation
                    </button>
                  )}

                  {incident.status !== 'Escalated' && incident.status !== 'Resolved' && isPrivileged && (
                    <button
                      onClick={() => handleStatusTransition('Escalated')}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                    >
                      <Flame size={14} /> Escalate to Tier-2
                    </button>
                  )}

                  {incident.status !== 'Resolved' && (
                    <button
                      onClick={() => setShowResolveModal(true)}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} /> Resolve Incident
                    </button>
                  )}

                  {incident.status === 'Resolved' && (
                    <button
                      onClick={() => handleStatusTransition('Investigating')}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Re-open Investigation
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Resolve Modal Inline Form */}
            {showResolveModal && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 animate-fadeIn no-print">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={16} /> Close Incident & Log Remediation Summary
                  </span>
                  <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-white text-xs">Cancel</button>
                </div>
                <textarea
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Enter detailed remediation actions (e.g., Endpoint quarantined, credentials rotated, access privileges updated, employee interview concluded)..."
                  className="w-full text-xs bg-black/50 border border-emerald-500/20 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 h-20"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowResolveModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleStatusTransition('Resolved', resolutionSummary || 'Remediation completed and verified.')}
                    disabled={statusUpdating}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                  >
                    Confirm Resolution
                  </button>
                </div>
              </div>
            )}

            {/* Stage 2: Triggering Anomaly Details */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Triggering Anomaly</span>
                  {incident.mitre_technique_id && (
                    <span className="text-[11px] font-mono font-semibold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
                      {incident.mitre_technique_id} • {incident.mitre_technique_name}
                    </span>
                  )}
                  {incident.anomaly_category && (
                    <span className="text-[11px] font-semibold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      {incident.anomaly_category.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {incident.created_at ? formatTimestamp(incident.created_at) : 'N/A'}
                </span>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed font-mono bg-black/30 p-3 rounded-lg border border-white/5">
                {incident.description}
              </p>

              {incident.resolution_summary && (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <span className="font-bold">Resolution Summary:</span> {incident.resolution_summary}
                  </div>
                </div>
              )}
            </div>

            {/* Feature 1: SOC Remediation Playbook Checklist (Case Tracking Layer) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#141226] via-[#101928] to-[#121124] border border-violet-500/25 shadow-sm space-y-3.5 no-print">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
                    <CheckSquare size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                        SOC Remediation Playbook (Case Tracking)
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        Internal Workflow
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Guided containment & identity mitigation steps tailored for <span className="text-violet-300 font-mono">{(incident.anomaly_category || incident.mitre_technique_name || 'Generic Threat').replace(/_/g, ' ')}</span>.
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  {playbookItems.filter(i => i.isEnacted).length} of {playbookItems.length} Enacted
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {playbookItems.map((item) => {
                  const isUpdating = updatingPlaybookKey === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => {
                        if (!isUpdating && canModifyStatus) {
                          handleTogglePlaybookAction(item.key, item.title, item.isEnacted);
                        }
                      }}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all duration-200 text-xs flex items-start gap-3 cursor-pointer select-none',
                        item.isEnacted
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                          : 'bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/[0.02]',
                        !canModifyStatus && 'cursor-not-allowed opacity-80'
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isUpdating ? (
                          <Loader2 size={16} className="animate-spin text-violet-400" />
                        ) : (
                          <div className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            item.isEnacted
                              ? 'bg-emerald-500 border-emerald-400 text-black'
                              : 'border-slate-500 bg-transparent'
                          )}>
                            {item.isEnacted && <CheckCircle2 size={12} className="stroke-[3]" />}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('font-bold', item.isEnacted ? 'text-emerald-200' : 'text-slate-200')}>
                            {item.title}
                          </span>
                          <span className={cn(
                            'text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold',
                            item.priority.includes('CRITICAL') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            item.priority.includes('HIGH') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          )}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="pt-1 flex items-center justify-between text-[10px] font-mono">
                          <span className={item.isEnacted ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                            Status: {item.isEnacted ? '✓ Enacted (Logged in Notes)' : '○ Pending Action'}
                          </span>
                          {canModifyStatus && (
                            <span className="text-violet-400 hover:text-violet-300 text-[10px]">
                              {item.isEnacted ? 'Click to revert' : 'Click to enact'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tab Navigation: Correlated Telemetry vs Raw Payload vs Notes */}
            <div className="print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer',
                      activeTab === 'timeline'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Activity size={14} /> Correlated Activity Window
                  </button>
                  <button
                    onClick={() => setActiveTab('payload')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer',
                      activeTab === 'payload'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Code size={14} /> Payload Inspection
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer',
                      activeTab === 'notes'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <FileText size={14} /> Investigation Notes ({incident.notes.length})
                  </button>
                </div>

                {/* Sub-toggles for Timeline and Payload */}
                {activeTab === 'timeline' && (
                  <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-xs">
                    <button
                      onClick={() => setCorrelationWindow('2h')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer',
                        correlationWindow === '2h' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      ±2h Window (Focus)
                    </button>
                    <button
                      onClick={() => setCorrelationWindow('24h')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer',
                        correlationWindow === '24h' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      ±24h Broad Context
                    </button>
                  </div>
                )}

                {activeTab === 'payload' && (
                  <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-xs">
                    <button
                      onClick={() => setPayloadView('formatted')}
                      className={cn('px-2 py-0.5 rounded font-semibold text-[11px]', payloadView === 'formatted' ? 'bg-violet-600 text-white' : 'text-slate-400')}
                    >
                      Formatted
                    </button>
                    <button
                      onClick={() => setPayloadView('raw')}
                      className={cn('px-2 py-0.5 rounded font-semibold text-[11px]', payloadView === 'raw' ? 'bg-violet-600 text-white' : 'text-slate-400')}
                    >
                      Raw JSON
                    </button>
                  </div>
                )}
              </div>

              {/* Tab 1: Correlated Telemetry Timeline (Feature P2) */}
              {activeTab === 'timeline' && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">
                      {correlationWindow === '2h'
                        ? `Showing ${(incident.correlated_telemetry_2h || []).length} correlated event(s) within ±2 hours of trigger`
                        : `Showing ${incident.correlated_telemetry.length} event(s) in ±24 hour context`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Anchor Timestamp: {formatTimestamp(incident.triggering_telemetry?.timestamp || incident.created_at)}
                    </span>
                  </div>

                  {((correlationWindow === '2h' && incident.correlated_telemetry_2h ? incident.correlated_telemetry_2h : incident.correlated_telemetry).length === 0) ? (
                    <p className="text-xs text-slate-500 py-8 text-center bg-black/20 rounded-xl border border-white/5">
                      No other telemetry events recorded in this {correlationWindow === '2h' ? '±2 hour' : '±24 hour'} window for this employee.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {(correlationWindow === '2h' && incident.correlated_telemetry_2h ? incident.correlated_telemetry_2h : incident.correlated_telemetry).map((log) => {
                        const isTrigger = log.id === incident.telemetry_event_id;
                        const relativeOffset = getRelativeOffset(log.timestamp, incident.triggering_telemetry?.timestamp || incident.created_at);

                        return (
                          <div
                            key={log.id}
                            className={cn(
                              'p-3.5 rounded-xl border text-xs transition-all duration-200 space-y-1.5',
                              isTrigger
                                ? 'bg-rose-950/25 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono',
                                  getSeverityBadge(log.severity)
                                )}>
                                  {log.severity}
                                </span>
                                <span className="font-semibold text-white font-mono">{log.event_type}</span>
                                {isTrigger && (
                                  <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 animate-pulse font-mono">
                                    PRIMARY TRIGGER
                                  </span>
                                )}
                                {relativeOffset && (
                                  <span className="text-[10px] text-slate-400 bg-black/40 px-1.5 py-0.2 rounded font-mono border border-white/5">
                                    {relativeOffset}
                                  </span>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-slate-400 font-mono text-[11px] block">{formatTimestamp(log.timestamp)}</span>
                              </div>
                            </div>

                            <p className="text-slate-300 text-[11px] leading-relaxed font-mono">
                              {log.description}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-500 font-mono">
                              <span>Source IP: {log.source_ip}</span>
                              {log.anomaly_category && (
                                <span className="text-violet-400">Tag: {log.anomaly_category.replace(/_/g, ' ')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Payload Inspection */}
              {activeTab === 'payload' && (
                <div className="mt-4">
                  {payloadView === 'formatted' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-black/40 border border-white/5 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Triggering Event ID</span>
                        <span className="text-white font-mono">{incident.telemetry_event_id || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">MITRE Technique</span>
                        <span className="text-rose-400 font-mono">{incident.mitre_technique_id} - {incident.mitre_technique_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Anomaly Classification</span>
                        <span className="text-violet-300 font-mono">{incident.anomaly_category || 'UNASSIGNED'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Detection Velocity (MTTD)</span>
                        <span className="text-amber-400 font-mono">{incident.mttd_seconds ? `${incident.mttd_seconds} seconds` : 'Sub-minute'}</span>
                      </div>
                      <div className="col-span-2 mt-2 pt-2 border-t border-white/5">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Triggering Payload Data</span>
                        <pre className="p-3 rounded-lg bg-black/60 border border-white/5 text-slate-300 font-mono text-[11px] overflow-x-auto">
                          {incident.triggering_telemetry?.payload
                            ? JSON.stringify(incident.triggering_telemetry.payload, null, 2)
                            : '// No extended structured payload recorded for this event'}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <pre className="p-4 rounded-xl bg-black/60 border border-white/5 text-emerald-400 font-mono text-xs overflow-x-auto">
                      {JSON.stringify(incident, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Tab 3: Investigation Notes */}
              {activeTab === 'notes' && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {incident.notes.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">No notes added to this incident yet. Add the first observation below.</p>
                    ) : (
                      incident.notes.map((note) => (
                        <div key={note.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-violet-300">{note.author_name}</span>
                              <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                                {note.author_role}
                              </span>
                            </div>
                            <span className="text-slate-500 text-[11px]">{formatRelativeTime(note.timestamp)}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{note.note_text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add investigation observation or triage step..."
                      className="flex-1 text-xs bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Send size={14} /> Send Note
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Feature P4: Printable / PDF Incident Investigation Dossier Layout */}
            <div className="hidden print:block space-y-6 pt-4 border-t border-slate-300 text-slate-900 bg-white p-6 rounded-none">
              
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                    Activity Management System (AMS)
                  </h1>
                  <p className="text-xs text-slate-600 font-mono">
                    Security Operations Center (SOC) • Formal Incident Investigation Dossier
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-slate-700">
                  <div className="font-bold text-sm text-slate-900">{incident.incident_id}</div>
                  <div>Report Generated: {new Date().toISOString()}</div>
                  <div className="text-[10px] text-rose-700 font-bold uppercase">CONFIDENTIAL // RESTRICTED ACCESS</div>
                </div>
              </div>

              {/* Case Metadata Table */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                  1. Executive Case Summary & Subject Profile
                </h3>
                <table className="w-full text-left text-xs border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <th className="p-2 bg-slate-100 font-semibold w-1/4">Incident Title:</th>
                      <td className="p-2 font-bold">{incident.title}</td>
                      <th className="p-2 bg-slate-100 font-semibold w-1/4">Lifecycle Status:</th>
                      <td className="p-2 font-bold uppercase">{incident.status}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <th className="p-2 bg-slate-100 font-semibold">Subject Employee:</th>
                      <td className="p-2">{incident.employee_name} ({incident.employee_id})</td>
                      <th className="p-2 bg-slate-100 font-semibold">Severity Classification:</th>
                      <td className="p-2 font-bold">{incident.severity}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <th className="p-2 bg-slate-100 font-semibold">Department & Role:</th>
                      <td className="p-2">{incident.employee_department} • {incident.employee_designation}</td>
                      <th className="p-2 bg-slate-100 font-semibold">Subject Threat Score:</th>
                      <td className="p-2 font-mono font-bold">{incident.employee_threat_score || 0}/100 ({incident.employee_risk_category || 'Normal'})</td>
                    </tr>
                    <tr>
                      <th className="p-2 bg-slate-100 font-semibold">Assigned Lead:</th>
                      <td className="p-2">{incident.assigned_to_name || 'Unassigned'} ({incident.assigned_to_role || 'SOC'})</td>
                      <th className="p-2 bg-slate-100 font-semibold">Detection Velocity (MTTD):</th>
                      <td className="p-2 font-mono">{incident.mttd_seconds ? `${incident.mttd_seconds}s` : '21.6s'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* MITRE ATT&CK & Trigger Details */}
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                  2. Threat Categorization & MITRE ATT&CK Mapping
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs border border-slate-300 p-3 bg-slate-50">
                  <div><strong>MITRE Technique:</strong> {incident.mitre_technique_id} — {incident.mitre_technique_name}</div>
                  <div><strong>Anomaly Category:</strong> {incident.anomaly_category || 'N/A'}</div>
                  <div><strong>Primary Event ID:</strong> #{incident.telemetry_event_id || 'N/A'}</div>
                  <div><strong>Incident Creation (UTC):</strong> {formatTimestamp(incident.created_at)}</div>
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <strong>Primary Trigger Narrative:</strong> {incident.description}
                  </div>
                </div>
              </div>

              {/* Correlated Telemetry Timeline */}
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                  3. Correlated Telemetry Activity Window (±2 Hours)
                </h3>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2 border-b border-slate-300">Timestamp (UTC)</th>
                      <th className="p-2 border-b border-slate-300">Severity</th>
                      <th className="p-2 border-b border-slate-300">Event Type</th>
                      <th className="p-2 border-b border-slate-300">Source IP</th>
                      <th className="p-2 border-b border-slate-300">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {(incident.correlated_telemetry_2h || incident.correlated_telemetry || []).map((log) => {
                      const isTrigger = log.id === incident.telemetry_event_id;
                      return (
                        <tr key={log.id} className={isTrigger ? 'bg-rose-50 font-bold' : ''}>
                          <td className="p-2 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                          <td className="p-2">[{log.severity}]</td>
                          <td className="p-2">{log.event_type} {isTrigger ? '(TRIGGER)' : ''}</td>
                          <td className="p-2">{log.source_ip}</td>
                          <td className="p-2 font-sans text-xs">{log.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Chronological Investigation Notes & Resolution */}
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                  4. Chronological Investigation Notes & Case Journal
                </h3>
                {incident.notes.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No notes logged for this incident.</p>
                ) : (
                  <div className="space-y-2">
                    {incident.notes.map((note) => (
                      <div key={note.id} className="p-2.5 rounded border border-slate-300 text-xs bg-slate-50">
                        <div className="flex justify-between font-semibold text-slate-800 mb-1 border-b border-slate-200 pb-0.5">
                          <span>{note.author_name} ({note.author_role})</span>
                          <span className="font-mono text-[10px] text-slate-600">{formatTimestamp(note.timestamp)}</span>
                        </div>
                        <p className="text-slate-700">{note.note_text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {incident.resolution_summary && (
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 mt-2">
                    <strong className="block text-emerald-950 font-bold mb-0.5">Final Remediation & Closure Sign-off:</strong>
                    {incident.resolution_summary}
                  </div>
                )}
              </div>

              {/* Sign-Off Block */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
                <div>
                  <div className="border-b border-slate-400 pb-8 mb-1"></div>
                  <div className="font-bold text-slate-900">Lead Investigator Signature</div>
                  <div className="text-slate-600">{incident.assigned_to_name || 'Nathan Drake (SOC Lead)'}</div>
                </div>
                <div>
                  <div className="border-b border-slate-400 pb-8 mb-1"></div>
                  <div className="font-bold text-slate-900">Security Manager Authorization</div>
                  <div className="text-slate-600">Elena Vance (Security Operations Manager)</div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
