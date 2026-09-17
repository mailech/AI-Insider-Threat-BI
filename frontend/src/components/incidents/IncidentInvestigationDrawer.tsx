'use client';

import React, { useEffect, useState } from 'react';
import type {
  IncidentCommentRead,
  IncidentRead,
  IncidentStatus,
  IncidentTimelineEvent,
  RiskFactorRead,
  UserRead,
} from '@/types/api';
import {
  addIncidentComment,
  assignIncident,
  getIncident,
  getIncidentComments,
  getIncidentRiskFactors,
  getIncidentTimeline,
  isolateIncidentUser,
  updateIncidentStatus,
} from '@/services/api';
import { IncidentSeverityBadge, IncidentStatusBadge } from './IncidentStatusBadge';

interface IncidentInvestigationDrawerProps {
  incidentId:   number | null;
  isOpen:       boolean;
  onClose:      () => void;
  onUpdated?:   (updated: IncidentRead) => void;
  currentUser?: UserRead | null;
}

export function IncidentInvestigationDrawer({
  incidentId,
  isOpen,
  onClose,
  onUpdated,
  currentUser,
}: IncidentInvestigationDrawerProps) {
  const [incident, setIncident] = useState<IncidentRead | null>(null);
  const [loadingIncident, setLoadingIncident] = useState<boolean>(false);
  const [errorIncident, setErrorIncident] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'forensics'>('timeline');

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<IncidentTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);
  const [timelineFilter, setTimelineFilter] = useState<string>('ALL');
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});

  // Comments state
  const [comments, setComments] = useState<IncidentCommentRead[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // Status transition state
  const [statusNote, setStatusNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState<IncidentStatus | null>(null);

  // Assignment state
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [isIsolating, setIsIsolating] = useState<boolean>(false);
  const [riskFactors, setRiskFactors] = useState<RiskFactorRead[]>([]);
  const [anomalyScore, setAnomalyScore] = useState<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load incident details when drawer opens
  useEffect(() => {
    if (!isOpen || incidentId === null) {
      setIncident(null);
      setTimelineEvents([]);
      setComments([]);
      return;
    }

    let isMounted = true;
    setLoadingIncident(true);
    setErrorIncident(null);

    getIncident(incidentId)
      .then((data) => {
        if (isMounted) {
          setIncident(data);
          setLoadingIncident(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorIncident(err?.response?.data?.detail ?? 'Failed to load incident details');
          setLoadingIncident(false);
        }
      });

    // Load timeline
    setLoadingTimeline(true);
    getIncidentTimeline(incidentId, 50)
      .then((res) => {
        if (isMounted) {
          setTimelineEvents(res.events ?? []);
          setLoadingTimeline(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingTimeline(false);
      });

    // Load comments
    setLoadingComments(true);
    getIncidentComments(incidentId)
      .then((data) => {
        if (isMounted) {
          setComments(data ?? []);
          setLoadingComments(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingComments(false);
      });

    getIncidentRiskFactors(incidentId)
      .then((res) => {
        if (isMounted) {
          setRiskFactors(res.factors ?? []);
          setAnomalyScore(res.anomaly_score);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRiskFactors([]);
          setAnomalyScore(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [incidentId, isOpen]);

  if (!isOpen) return null;

  // Handle status update
  const handleExecuteStatusChange = async (targetStatus: IncidentStatus) => {
    if (!incident) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateIncidentStatus(incident.id, targetStatus, statusNote.trim() || undefined);
      setIncident(updated);
      setShowStatusModal(null);
      setStatusNote('');
      onUpdated?.(updated);

      // Refresh comments to reflect status note
      const freshComments = await getIncidentComments(incident.id);
      setComments(freshComments);
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to update status';
      alert(errMsg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle quick assign
  const handleAssignToMe = async () => {
    if (!incident || !currentUser) return;
    setIsAssigning(true);
    try {
      const updated = await assignIncident(incident.id, currentUser.id);
      setIncident(updated);
      onUpdated?.(updated);
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to assign incident';
      alert(errMsg);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleEscalate = async (): Promise<void> => {
    if (!incident) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateIncidentStatus(
        incident.id,
        'UNDER_INVESTIGATION',
        'Escalated by analyst — case moved into active investigation.',
      );
      setIncident(updated);
      onUpdated?.(updated);
      const freshComments = await getIncidentComments(incident.id);
      setComments(freshComments);
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to escalate';
      alert(errMsg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleIsolate = async (): Promise<void> => {
    if (!incident) return;
    setIsIsolating(true);
    try {
      const result = await isolateIncidentUser(incident.id);
      setIncident(result.incident);
      onUpdated?.(result.incident);
      const freshComments = await getIncidentComments(incident.id);
      setComments(freshComments);
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to isolate access';
      alert(errMsg);
    } finally {
      setIsIsolating(false);
    }
  };

  // Handle new comment submission
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !newCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const created = await addIncidentComment(incident.id, newCommentText.trim());
      setComments((prev) => [...prev, created]);
      setNewCommentText('');
      setIncident((prev) => (prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev));
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to post comment';
      alert(errMsg);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const togglePayload = (id: string) => {
    setExpandedPayloads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTimeline = timelineEvents.filter((ev) => {
    if (timelineFilter === 'ALL') return true;
    if (timelineFilter === 'CRITICAL_HIGH') return ev.severity === 'CRITICAL' || ev.severity === 'HIGH';
    return ev.event_type === timelineFilter;
  });

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          999,
        display:         'flex',
        justifyContent:  'flex-end',
        backgroundColor: 'rgba(11, 15, 25, 0.75)',
        backdropFilter:  'blur(6px)',
        transition:      'all 0.3s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Slide-out Drawer Panel */}
      <div
        style={{
          width:           '100%',
          maxWidth:        '820px',
          height:          '100%',
          backgroundColor: '#161C2E',
          borderLeft:      '1px solid #2A3352',
          display:         'flex',
          flexDirection:   'column',
          boxShadow:       '-10px 0 35px rgba(0,0,0,0.6)',
          animation:       'slideInRight 0.25s ease-out forwards',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding:         '16px 24px',
            backgroundColor: '#111726',
            borderBottom:    '1px solid #2A3352',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontFamily:      'var(--font-mono, monospace)',
                fontSize:        '12px',
                fontWeight:      700,
                color:           '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                padding:         '3px 8px',
                borderRadius:    '4px',
                border:          '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              INC-{incident?.id ? String(incident.id).padStart(5, '0') : '...'}
            </span>
            <h2
              style={{
                margin:     0,
                fontSize:   '17px',
                fontWeight: 600,
                color:      '#F8FAFC',
                display:    'flex',
                alignItems: 'center',
                gap:        '8px',
              }}
            >
              Security Incident Investigation
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              title="Close drawer (Esc)"
              style={{
                background:    'transparent',
                border:        '1px solid #2A3352',
                borderRadius:  '6px',
                padding:       '6px 10px',
                color:         '#94A3B8',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                transition:    'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingIncident && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
            <div
              style={{
                width:           '32px',
                height:          '32px',
                border:          '3px solid #2A3352',
                borderTopColor:  '#3B82F6',
                borderRadius:    '50%',
                margin:          '0 auto 16px',
                animation:       'spin 1s linear infinite',
              }}
            />
            <p style={{ margin: 0, fontSize: '13px' }}>Loading incident intelligence record...</p>
          </div>
        )}

        {/* Error State */}
        {!loadingIncident && errorIncident && (
          <div style={{ padding: '24px', margin: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444' }}>
            <strong>Investigation Error:</strong> {errorIncident}
          </div>
        )}

        {/* Main Incident Body */}
        {!loadingIncident && incident && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            {/* Top Identity & Threat Score Banner */}
            <div
              style={{
                padding:         '18px 24px',
                backgroundColor: '#1E2640',
                borderBottom:    '1px solid #2A3352',
                display:         'flex',
                flexWrap:        'wrap',
                alignItems:      'center',
                justifyContent:  'space-between',
                gap:             '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#F8FAFC' }}>
                    {incident.title}
                  </span>
                  <IncidentSeverityBadge severity={incident.severity} size="sm" />
                  <IncidentStatusBadge status={incident.status} size="sm" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94A3B8' }}>
                  <span>
                    Target: <strong style={{ color: '#E2E8F0' }}>{incident.employee_name}</strong>
                  </span>
                  <span style={{ color: '#475569' }}>•</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', color: '#3B82F6' }}>
                    {incident.emp_id}
                  </span>
                  <span style={{ color: '#475569' }}>•</span>
                  <span>Dept: <strong style={{ color: '#E2E8F0' }}>{incident.department || 'N/A'}</strong></span>
                  <span style={{ color: '#475569' }}>•</span>
                  <span>Trigger: <strong style={{ color: '#F59E0B' }}>{incident.trigger_reason}</strong></span>
                </div>
              </div>

              {/* Threat Score Pill */}
              <div
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '12px',
                  backgroundColor: '#161C2E',
                  padding:         '8px 16px',
                  borderRadius:    '8px',
                  border:          '1px solid #2A3352',
                }}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Threat Score
                  </div>
                  <div
                    style={{
                      fontSize:   '22px',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono, monospace)',
                      color:      incident.threat_score >= 75 ? '#EF4444' : incident.threat_score >= 50 ? '#F59E0B' : '#10B981',
                    }}
                  >
                    {incident.threat_score}
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>/100</span>
                  </div>
                </div>
                <div
                  style={{
                    width:           '8px',
                    height:          '36px',
                    backgroundColor: '#2A3352',
                    borderRadius:    '4px',
                    overflow:        'hidden',
                    display:         'flex',
                    flexDirection:   'column',
                    justifyContent:  'flex-end',
                  }}
                >
                  <div
                    style={{
                      width:           '100%',
                      height:          `${incident.threat_score}%`,
                      backgroundColor: incident.threat_score >= 75 ? '#EF4444' : '#F59E0B',
                      borderRadius:    '4px',
                      transition:      'height 0.4s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Analyst Quick Action Bar */}
            <div
              style={{
                padding:         '12px 24px',
                backgroundColor: '#111726',
                borderBottom:    '1px solid #2A3352',
                display:         'flex',
                flexWrap:        'wrap',
                alignItems:      'center',
                justifyContent:  'space-between',
                gap:             '12px',
              }}
            >
              {/* Status Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                  Status:
                </span>
                {(['NEW', 'UNDER_INVESTIGATION', 'RESOLVED', 'FALSE_POSITIVE'] as IncidentStatus[]).map((st) => {
                  const isCurrent = incident.status === st;
                  return (
                    <button
                      key={st}
                      disabled={isCurrent || isUpdatingStatus}
                      onClick={() => setShowStatusModal(st)}
                      style={{
                        padding:         '4px 10px',
                        borderRadius:    '4px',
                        fontSize:        '11px',
                        fontWeight:      600,
                        fontFamily:      'var(--font-mono, monospace)',
                        cursor:          isCurrent ? 'default' : 'pointer',
                        opacity:         isCurrent ? 1 : 0.65,
                        backgroundColor: isCurrent ? '#2A3352' : '#161C2E',
                        color:           isCurrent ? '#F8FAFC' : '#94A3B8',
                        border:          isCurrent ? '1px solid #3B82F6' : '1px solid #2A3352',
                        transition:      'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.borderColor = '#6366F1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.opacity = '0.65';
                          e.currentTarget.style.borderColor = '#2A3352';
                        }
                      }}
                    >
                      {st === 'UNDER_INVESTIGATION' ? 'INVESTIGATING' : st}
                    </button>
                  );
                })}
              </div>

              {/* Assignment Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Assignee:
                </span>
                <span
                  style={{
                    fontSize:        '11px',
                    fontWeight:      600,
                    color:           incident.assignee_email ? '#10B981' : '#F59E0B',
                    backgroundColor: '#161C2E',
                    padding:         '3px 8px',
                    borderRadius:    '4px',
                    border:          '1px solid #2A3352',
                  }}
                >
                  {incident.assignee_email ?? 'Unassigned'}
                </span>
                {currentUser && incident.assignee_email !== currentUser.email && (
                  <button
                    onClick={handleAssignToMe}
                    disabled={isAssigning}
                    style={{
                      padding:         '4px 10px',
                      borderRadius:    '4px',
                      fontSize:        '11px',
                      fontWeight:      600,
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color:           '#3B82F6',
                      border:          '1px solid rgba(59, 130, 246, 0.4)',
                      cursor:          'pointer',
                      transition:      'all 0.15s ease',
                    }}
                  >
                    {isAssigning ? 'Assigning...' : 'Claim Case'}
                  </button>
                )}
              </div>
            </div>

            {/* Analyst containment actions */}
            <div
              style={{
                padding: '10px 24px',
                backgroundColor: '#0B0F19',
                borderBottom: '1px solid #2A3352',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => void handleEscalate()}
                disabled={isUpdatingStatus || incident.status === 'UNDER_INVESTIGATION' || incident.status === 'RESOLVED'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                Escalate
              </button>
              <button
                type="button"
                onClick={() => setShowStatusModal('FALSE_POSITIVE')}
                disabled={isUpdatingStatus || incident.status === 'FALSE_POSITIVE'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(148, 163, 184, 0.12)',
                  color: '#94A3B8',
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                }}
              >
                Mark False Positive
              </button>
              <button
                type="button"
                onClick={() => void handleIsolate()}
                disabled={isIsolating}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: isIsolating ? 'not-allowed' : 'pointer',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                {isIsolating ? 'Isolating…' : 'Isolate User Access'}
              </button>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display:         'flex',
                backgroundColor: '#161C2E',
                borderBottom:    '1px solid #2A3352',
                padding:         '0 24px',
              }}
            >
              <button
                onClick={() => setActiveTab('timeline')}
                style={{
                  padding:         '12px 16px',
                  fontSize:        '13px',
                  fontWeight:      600,
                  cursor:          'pointer',
                  backgroundColor: 'transparent',
                  border:          'none',
                  borderBottom:    activeTab === 'timeline' ? '2px solid #3B82F6' : '2px solid transparent',
                  color:           activeTab === 'timeline' ? '#3B82F6' : '#94A3B8',
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '8px',
                }}
              >
                <span>Telemetry Timeline</span>
                <span
                  style={{
                    fontSize:        '10px',
                    padding:         '1px 6px',
                    borderRadius:    '10px',
                    backgroundColor: activeTab === 'timeline' ? 'rgba(59, 130, 246, 0.2)' : '#1E2640',
                    color:           activeTab === 'timeline' ? '#60A5FA' : '#64748B',
                  }}
                >
                  {timelineEvents.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                style={{
                  padding:         '12px 16px',
                  fontSize:        '13px',
                  fontWeight:      600,
                  cursor:          'pointer',
                  backgroundColor: 'transparent',
                  border:          'none',
                  borderBottom:    activeTab === 'notes' ? '2px solid #3B82F6' : '2px solid transparent',
                  color:           activeTab === 'notes' ? '#3B82F6' : '#94A3B8',
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '8px',
                }}
              >
                <span>Analyst Notes</span>
                <span
                  style={{
                    fontSize:        '10px',
                    padding:         '1px 6px',
                    borderRadius:    '10px',
                    backgroundColor: activeTab === 'notes' ? 'rgba(59, 130, 246, 0.2)' : '#1E2640',
                    color:           activeTab === 'notes' ? '#60A5FA' : '#64748B',
                  }}
                >
                  {comments.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('forensics')}
                style={{
                  padding:         '12px 16px',
                  fontSize:        '13px',
                  fontWeight:      600,
                  cursor:          'pointer',
                  backgroundColor: 'transparent',
                  border:          'none',
                  borderBottom:    activeTab === 'forensics' ? '2px solid #3B82F6' : '2px solid transparent',
                  color:           activeTab === 'forensics' ? '#3B82F6' : '#94A3B8',
                }}
              >
                <span>Risk Forensics</span>
              </button>
            </div>

            {/* Tab Contents Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {/* TAB 1: TELEMETRY TIMELINE */}
              {activeTab === 'timeline' && (
                <div>
                  {/* Timeline Filter Header */}
                  <div
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      marginBottom:   '20px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                      Showing chronological events leading up to this incident:
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={timelineFilter}
                        onChange={(e) => setTimelineFilter(e.target.value)}
                        style={{
                          backgroundColor: '#1E2640',
                          border:          '1px solid #2A3352',
                          borderRadius:    '4px',
                          color:           '#E2E8F0',
                          fontSize:        '11px',
                          padding:         '4px 8px',
                          cursor:          'pointer',
                        }}
                      >
                        <option value="ALL">All Events ({timelineEvents.length})</option>
                        <option value="CRITICAL_HIGH">Critical & High Only</option>
                        <option value="FILE_DOWNLOAD">File Downloads</option>
                        <option value="FILE_UPLOAD">File Uploads</option>
                        <option value="LOGIN">Logins</option>
                        <option value="PRIVILEGE_CHANGE">Privilege Changes</option>
                        <option value="DATA_TRANSFER">Data Transfers</option>
                      </select>
                    </div>
                  </div>

                  {loadingTimeline && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                      Loading telemetry timeline stream...
                    </div>
                  )}

                  {!loadingTimeline && filteredTimeline.length === 0 && (
                    <div
                      style={{
                        padding:         '40px',
                        textAlign:       'center',
                        backgroundColor: '#1E2640',
                        borderRadius:    '8px',
                        border:          '1px dashed #2A3352',
                        color:           '#94A3B8',
                      }}
                    >
                      No telemetry events recorded for this employee in the specified window.
                    </div>
                  )}

                  {/* Vertical Timeline Stream */}
                  {!loadingTimeline && filteredTimeline.length > 0 && (
                    <div style={{ position: 'relative', paddingLeft: '28px' }}>
                      {/* Vertical line connecting events */}
                      <div
                        style={{
                          position:        'absolute',
                          top:             '10px',
                          bottom:          '10px',
                          left:            '11px',
                          width:           '2px',
                          backgroundColor: '#2A3352',
                        }}
                      />

                      {filteredTimeline.map((ev, idx) => {
                        const isExpanded = !!expandedPayloads[ev.id];
                        const dateFormatted = new Date(ev.timestamp).toLocaleString();
                        const dotBg =
                          ev.severity === 'CRITICAL'
                            ? '#EF4444'
                            : ev.severity === 'HIGH'
                            ? '#F59E0B'
                            : ev.severity === 'MEDIUM'
                            ? '#3B82F6'
                            : '#10B981';

                        return (
                          <div
                            key={ev.id || idx}
                            style={{
                              position:     'relative',
                              marginBottom: '20px',
                            }}
                          >
                            {/* Node circle on the vertical line */}
                            <div
                              style={{
                                position:        'absolute',
                                left:            '-22px',
                                top:             '12px',
                                width:           '12px',
                                height:          '12px',
                                borderRadius:    '50%',
                                backgroundColor: dotBg,
                                border:          '2px solid #161C2E',
                                boxShadow:       `0 0 8px ${dotBg}88`,
                              }}
                            />

                            {/* Event Card */}
                            <div
                              style={{
                                backgroundColor: '#1E2640',
                                border:          '1px solid #2A3352',
                                borderRadius:    '6px',
                                padding:         '12px 16px',
                                transition:      'border-color 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  display:        'flex',
                                  alignItems:     'center',
                                  justifyContent: 'space-between',
                                  marginBottom:   '6px',
                                  flexWrap:       'wrap',
                                  gap:            '8px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    style={{
                                      fontSize:        '11px',
                                      fontWeight:      700,
                                      fontFamily:      'var(--font-mono, monospace)',
                                      color:           '#F8FAFC',
                                      backgroundColor: '#161C2E',
                                      padding:         '2px 6px',
                                      borderRadius:    '4px',
                                      border:          '1px solid #2A3352',
                                    }}
                                  >
                                    {ev.event_type}
                                  </span>
                                  <IncidentSeverityBadge severity={ev.severity} size="sm" />
                                </div>
                                <div
                                  style={{
                                    fontSize:   '11px',
                                    fontFamily: 'var(--font-mono, monospace)',
                                    color:      '#94A3B8',
                                  }}
                                >
                                  {dateFormatted}
                                </div>
                              </div>

                              <div style={{ fontSize: '13px', color: '#E2E8F0', marginBottom: '8px' }}>
                                {ev.description}
                              </div>

                              {/* IP & Device tag pills */}
                              <div
                                style={{
                                  display:     'flex',
                                  alignItems:  'center',
                                  gap:         '12px',
                                  fontSize:    '11px',
                                  color:       '#94A3B8',
                                  fontFamily:  'var(--font-mono, monospace)',
                                }}
                              >
                                {ev.ip_address && (
                                  <span>
                                    IP: <span style={{ color: '#60A5FA' }}>{ev.ip_address}</span>
                                  </span>
                                )}
                                {ev.device_id && (
                                  <span>
                                    Device: <span style={{ color: '#FCD34D' }}>{ev.device_id}</span>
                                  </span>
                                )}

                                {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                                  <button
                                    onClick={() => togglePayload(ev.id)}
                                    style={{
                                      marginLeft:      'auto',
                                      background:      'none',
                                      border:          '1px solid #2A3352',
                                      borderRadius:    '4px',
                                      padding:         '2px 8px',
                                      fontSize:        '10px',
                                      color:           '#3B82F6',
                                      cursor:          'pointer',
                                    }}
                                  >
                                    {isExpanded ? 'Hide Payload' : 'View Payload'}
                                  </button>
                                )}
                              </div>

                              {/* Expandable JSON Metadata */}
                              {isExpanded && ev.metadata && (
                                <pre
                                  style={{
                                    marginTop:       '10px',
                                    padding:         '10px',
                                    backgroundColor: '#0B0F19',
                                    borderRadius:    '4px',
                                    border:          '1px solid #2A3352',
                                    color:           '#A7F3D0',
                                    fontSize:        '11px',
                                    fontFamily:      'var(--font-mono, monospace)',
                                    overflowX:       'auto',
                                    margin:          '10px 0 0',
                                  }}
                                >
                                  {JSON.stringify(ev.metadata, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ANALYST CASE NOTES */}
              {activeTab === 'notes' && (
                <div>
                  {/* Notes Feed */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>
                      Case Notes & Audit History
                    </h3>

                    {loadingComments && (
                      <div style={{ color: '#94A3B8', fontSize: '13px' }}>Loading case notes...</div>
                    )}

                    {!loadingComments && comments.length === 0 && (
                      <div
                        style={{
                          padding:         '32px',
                          textAlign:       'center',
                          backgroundColor: '#1E2640',
                          borderRadius:    '8px',
                          border:          '1px dashed #2A3352',
                          color:           '#94A3B8',
                        }}
                      >
                        No case notes added yet. Use the form below to document your findings.
                      </div>
                    )}

                    {!loadingComments &&
                      comments.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            backgroundColor: '#1E2640',
                            border:          '1px solid #2A3352',
                            borderRadius:    '6px',
                            padding:         '14px 18px',
                            marginBottom:    '12px',
                          }}
                        >
                          <div
                            style={{
                              display:        'flex',
                              alignItems:     'center',
                              justifyContent: 'space-between',
                              marginBottom:   '8px',
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#3B82F6' }}>
                              {c.author_email ?? 'System / Analyst'}
                            </span>
                            <span
                              style={{
                                fontSize:   '11px',
                                color:      '#64748B',
                                fontFamily: 'var(--font-mono, monospace)',
                              }}
                            >
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                            {c.content}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Add Note Form */}
                  <form
                    onSubmit={handleSubmitComment}
                    style={{
                      backgroundColor: '#1E2640',
                      border:          '1px solid #2A3352',
                      borderRadius:    '8px',
                      padding:         '16px',
                    }}
                  >
                    <label
                      style={{
                        display:       'block',
                        fontSize:      '12px',
                        fontWeight:    600,
                        color:         '#94A3B8',
                        marginBottom:  '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Add Investigation Case Note
                    </label>
                    <textarea
                      rows={4}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Document observed anomalies, interviewed managers, containment actions, or justification for status change..."
                      style={{
                        width:           '100%',
                        backgroundColor: '#111726',
                        border:          '1px solid #2A3352',
                        borderRadius:    '6px',
                        padding:         '10px 12px',
                        color:           '#F8FAFC',
                        fontSize:        '13px',
                        fontFamily:      'var(--font-sans, sans-serif)',
                        resize:          'vertical',
                        outline:         'none',
                        marginBottom:    '12px',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2A3352')}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !newCommentText.trim()}
                        style={{
                          backgroundColor: '#3B82F6',
                          color:           '#FFFFFF',
                          border:          'none',
                          borderRadius:    '6px',
                          padding:         '8px 18px',
                          fontSize:        '12px',
                          fontWeight:      600,
                          cursor:          isSubmittingComment || !newCommentText.trim() ? 'not-allowed' : 'pointer',
                          opacity:         isSubmittingComment || !newCommentText.trim() ? 0.6 : 1,
                          transition:      'background-color 0.15s ease',
                        }}
                      >
                        {isSubmittingComment ? 'Saving Note...' : 'Post Case Note'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: RISK FORENSICS */}
              {activeTab === 'forensics' && (
                <div>
                  <div
                    style={{
                      display:             'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap:                 '16px',
                      marginBottom:        '24px',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#1E2640',
                        border:          '1px solid #2A3352',
                        borderRadius:    '8px',
                        padding:         '16px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>
                        Trigger Anomaly Score
                      </div>
                      <div
                        style={{
                          fontSize:   '26px',
                          fontWeight: 800,
                          color:      '#EF4444',
                          fontFamily: 'var(--font-mono, monospace)',
                          marginTop:  '6px',
                        }}
                      >
                        {incident.threat_score} / 100
                      </div>
                      <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                        Exceeded Critical Threshold (75)
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#1E2640',
                        border:          '1px solid #2A3352',
                        borderRadius:    '8px',
                        padding:         '16px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>
                        Automated Trigger Policy
                      </div>
                      <div
                        style={{
                          fontSize:   '16px',
                          fontWeight: 700,
                          color:      '#F8FAFC',
                          marginTop:  '6px',
                        }}
                      >
                        {incident.trigger_reason}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                        Triggered at {new Date(incident.triggered_at).toLocaleString()}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#1E2640',
                        border:          '1px solid #2A3352',
                        borderRadius:    '8px',
                        padding:         '16px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>
                        Investigation Age
                      </div>
                      <div
                        style={{
                          fontSize:   '16px',
                          fontWeight: 700,
                          color:      '#60A5FA',
                          fontFamily: 'var(--font-mono, monospace)',
                          marginTop:  '6px',
                        }}
                      >
                        {new Date(incident.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                        Last updated {new Date(incident.updated_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Forensic Description */}
                  <div
                    style={{
                      backgroundColor: '#1E2640',
                      border:          '1px solid #2A3352',
                      borderRadius:    '8px',
                      padding:         '18px',
                    }}
                  >
                    <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#F8FAFC' }}>
                      Context & Incident Narrative
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: 1.6 }}>
                      {incident.description ||
                        'This incident was systematically initiated following an automated ML evaluation indicating high-risk deviation from peer baselines.'}
                    </p>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#F8FAFC' }}>
                      Risk score Z-score factors
                    </h4>
                    {anomalyScore !== null && (
                      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94A3B8' }}>
                        Isolation Forest anomaly score: <strong style={{ color: '#F59E0B' }}>{anomalyScore.toFixed(1)}</strong>
                      </p>
                    )}
                    {riskFactors.length === 0 ? (
                      <div
                        style={{
                          padding: '24px',
                          textAlign: 'center',
                          backgroundColor: '#1E2640',
                          borderRadius: '8px',
                          border: '1px dashed #2A3352',
                          color: '#94A3B8',
                          fontSize: '13px',
                        }}
                      >
                        No Z-score attribution yet. Recalculate risk or ingest telemetry for this identity.
                      </div>
                    ) : (
                      riskFactors.map((factor) => (
                        <div
                          key={factor.feature_name}
                          style={{
                            backgroundColor: '#1E2640',
                            border: '1px solid #2A3352',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            marginBottom: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>
                              {factor.feature_label}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: Math.abs(factor.z_score) >= 3 ? '#EF4444' : '#F59E0B',
                              }}
                            >
                              z = {factor.z_score.toFixed(2)}σ
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                            Observed {factor.value.toFixed(2)} vs baseline {factor.baseline_mean.toFixed(2)} · {factor.risk_level}
                          </div>
                          {factor.description && (
                            <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '6px' }}>
                              {factor.description}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Prompt for Transition Note when changing Status */}
        {showStatusModal && (
          <div
            style={{
              position:        'fixed',
              inset:           0,
              zIndex:          1001,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                width:           '100%',
                maxWidth:        '480px',
                backgroundColor: '#1E2640',
                border:          '1px solid #2A3352',
                borderRadius:    '8px',
                padding:         '24px',
                boxShadow:       '0 10px 25px rgba(0,0,0,0.5)',
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#F8FAFC' }}>
                Transition Status to: <span style={{ color: '#3B82F6' }}>{showStatusModal}</span>
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#94A3B8' }}>
                Optionally add an analyst note justifying this lifecycle transition:
              </p>
              <textarea
                rows={3}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="E.g., Verified authorized administrative data export with manager..."
                style={{
                  width:           '100%',
                  backgroundColor: '#111726',
                  border:          '1px solid #2A3352',
                  borderRadius:    '6px',
                  padding:         '8px 12px',
                  color:           '#F8FAFC',
                  fontSize:        '12px',
                  marginBottom:    '16px',
                  outline:         'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(null);
                    setStatusNote('');
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border:          '1px solid #2A3352',
                    borderRadius:    '6px',
                    padding:         '6px 14px',
                    color:           '#94A3B8',
                    cursor:          'pointer',
                    fontSize:        '12px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleExecuteStatusChange(showStatusModal)}
                  style={{
                    backgroundColor: '#3B82F6',
                    border:          'none',
                    borderRadius:    '6px',
                    padding:         '6px 16px',
                    color:           '#FFFFFF',
                    cursor:          isUpdatingStatus ? 'not-allowed' : 'pointer',
                    fontSize:        '12px',
                    fontWeight:      600,
                  }}
                >
                  {isUpdatingStatus ? 'Updating...' : 'Confirm Transition'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
