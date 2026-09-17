'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type {
  IncidentRead,
  IncidentStatsResponse,
  IncidentStatus,
  IncidentSeverity,
  UserRead,
} from '@/types/api';
import {
  downloadReport,
  getCurrentUser,
  getIncidentStats,
  listIncidents,
} from '@/services/api';
import { IncidentSeverityBadge, IncidentStatusBadge } from './IncidentStatusBadge';
import { IncidentInvestigationDrawer } from './IncidentInvestigationDrawer';

export function IncidentsPageClient() {
  const [incidents, setIncidents] = useState<IncidentRead[]>([]);
  const [stats, setStats] = useState<IncidentStatsResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected incident for investigation drawer
  const [investigatingIncidentId, setInvestigatingIncidentId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Fetch initial data
  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [statsRes, incidentsRes, userRes] = await Promise.allSettled([
        getIncidentStats(),
        listIncidents({ limit: 100 }),
        getCurrentUser(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (incidentsRes.status === 'fulfilled') setIncidents(incidentsRes.value.items ?? []);
      if (userRes.status === 'fulfilled') setCurrentUser(userRes.value);

      if (incidentsRes.status === 'rejected') {
        setError('Failed to fetch incidents list from API');
      }
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    const timer = window.setInterval(() => {
      void fetchData(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const openInvestigation = (incidentId: number) => {
    setInvestigatingIncidentId(incidentId);
    setIsDrawerOpen(true);
  };

  const closeInvestigation = () => {
    setIsDrawerOpen(false);
    setInvestigatingIncidentId(null);
  };

  const handleIncidentUpdated = (updated: IncidentRead) => {
    setIncidents((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    // Refresh stats in background
    getIncidentStats().then(setStats).catch(() => {});
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (selectedStatus !== 'ALL' && inc.status !== selectedStatus) return false;
      if (selectedSeverity !== 'ALL' && inc.severity !== selectedSeverity) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesEmpId = inc.emp_id.toLowerCase().includes(query);
        const matchesName = inc.employee_name.toLowerCase().includes(query);
        const matchesTitle = inc.title.toLowerCase().includes(query);
        const matchesDept = inc.department.toLowerCase().includes(query);
        if (!matchesEmpId && !matchesName && !matchesTitle && !matchesDept) return false;
      }
      return true;
    });
  }, [incidents, selectedStatus, selectedSeverity, searchQuery]);

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Title & Actions */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '24px',
          flexWrap:       'wrap',
          gap:            '16px',
        }}
      >
        <div>
          <h1
            style={{
              margin:     0,
              fontSize:   '24px',
              fontWeight: 700,
              color:      '#F8FAFC',
              display:    'flex',
              alignItems: 'center',
              gap:        '12px',
            }}
          >
            Security Incidents & Alerts
            <span
              style={{
                fontSize:        '12px',
                fontWeight:      600,
                color:           '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                border:          '1px solid rgba(59, 130, 246, 0.3)',
                padding:         '2px 8px',
                borderRadius:    '9999px',
              }}
            >
              UEBA Module 7
            </span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94A3B8' }}>
            SOC triage workflow: New → In Progress → Resolved / False Positive, with assignment and investigation notes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => void downloadReport('pdf', 'incidents')}
            style={{
              backgroundColor: '#1E2640',
              color: '#E2E8F0',
              border: '1px solid #2A3352',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => void downloadReport('xlsx', 'incidents')}
            style={{
              backgroundColor: '#1E2640',
              color: '#E2E8F0',
              border: '1px solid #2A3352',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export Excel
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              gap:             '6px',
              backgroundColor: '#1E2640',
              color:           '#E2E8F0',
              border:          '1px solid #2A3352',
              borderRadius:    '6px',
              padding:         '8px 14px',
              fontSize:        '12px',
              fontWeight:      600,
              cursor:          loading ? 'not-allowed' : 'pointer',
              transition:      'all 0.15s ease',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap:                 '16px',
          marginBottom:        '24px',
        }}
      >
        {/* Card 1: Total Incidents */}
        <div
          style={{
            backgroundColor: '#161C2E',
            border:          '1px solid #2A3352',
            borderRadius:    '8px',
            padding:         '16px 20px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Incidents Logged
          </div>
          <div
            style={{
              fontSize:   '28px',
              fontWeight: 800,
              color:      '#F8FAFC',
              fontFamily: 'var(--font-mono, monospace)',
              marginTop:  '6px',
            }}
          >
            {stats?.total ?? incidents.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Historical total across cohort
          </div>
        </div>

        {/* Card 2: New Unassigned Alerts */}
        <div
          style={{
            backgroundColor: '#161C2E',
            border:          '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius:    '8px',
            padding:         '16px 20px',
            position:        'relative',
            overflow:        'hidden',
          }}
        >
          <div
            style={{
              position:        'absolute',
              top:             0,
              left:            0,
              right:           0,
              height:          '3px',
              backgroundColor: '#EF4444',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, textTransform: 'uppercase' }}>
              Actionable New Alerts
            </span>
            <span
              style={{
                display:         'inline-block',
                width:           '8px',
                height:          '8px',
                borderRadius:    '50%',
                backgroundColor: '#EF4444',
                boxShadow:       '0 0 8px #EF4444',
              }}
            />
          </div>
          <div
            style={{
              fontSize:   '28px',
              fontWeight: 800,
              color:      '#EF4444',
              fontFamily: 'var(--font-mono, monospace)',
              marginTop:  '6px',
            }}
          >
            {stats?.new ?? incidents.filter((i) => i.status === 'NEW').length}
          </div>
          <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
            Pending SOC initial triage
          </div>
        </div>

        {/* Card 3: Active Investigations */}
        <div
          style={{
            backgroundColor: '#161C2E',
            border:          '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius:    '8px',
            padding:         '16px 20px',
            position:        'relative',
            overflow:        'hidden',
          }}
        >
          <div
            style={{
              position:        'absolute',
              top:             0,
              left:            0,
              right:           0,
              height:          '3px',
              backgroundColor: '#F59E0B',
            }}
          />
          <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600, textTransform: 'uppercase' }}>
            Under Investigation / In Progress
          </div>
          <div
            style={{
              fontSize:   '28px',
              fontWeight: 800,
              color:      '#F59E0B',
              fontFamily: 'var(--font-mono, monospace)',
              marginTop:  '6px',
            }}
          >
            {stats?.under_investigation ??
              incidents.filter((i) => i.status === 'UNDER_INVESTIGATION').length}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            Active analyst investigations
          </div>
        </div>

        {/* Card 4: Resolved / Closed */}
        <div
          style={{
            backgroundColor: '#161C2E',
            border:          '1px solid #2A3352',
            borderRadius:    '8px',
            padding:         '16px 20px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, textTransform: 'uppercase' }}>
            Resolved Cases
          </div>
          <div
            style={{
              fontSize:   '28px',
              fontWeight: 800,
              color:      '#10B981',
              fontFamily: 'var(--font-mono, monospace)',
              marginTop:  '6px',
            }}
          >
            {stats?.resolved ?? incidents.filter((i) => i.status === 'RESOLVED').length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            False positives: {stats?.false_positive ?? incidents.filter((i) => i.status === 'FALSE_POSITIVE').length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#161C2E',
          border:          '1px solid #2A3352',
          borderRadius:    '8px',
          padding:         '14px 20px',
          marginBottom:    '20px',
          display:         'flex',
          flexWrap:        'wrap',
          alignItems:      'center',
          justifyContent:  'space-between',
          gap:             '16px',
        }}
      >
        {/* Search Query Input */}
        <div style={{ flex: '1 1 280px', maxWidth: '400px', position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee, ID, title, or department..."
            style={{
              width:           '100%',
              backgroundColor: '#1E2640',
              border:          '1px solid #2A3352',
              borderRadius:    '6px',
              padding:         '8px 12px 8px 34px',
              fontSize:        '12px',
              color:           '#F8FAFC',
              outline:         'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#2A3352')}
          />
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            stroke="#94A3B8"
            strokeWidth="2"
            fill="none"
            style={{ position: 'absolute', left: '12px', top: '10px' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                backgroundColor: '#1E2640',
                border:          '1px solid #2A3352',
                borderRadius:    '6px',
                color:           '#E2E8F0',
                fontSize:        '12px',
                padding:         '6px 10px',
                outline:         'none',
                cursor:          'pointer',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New Alert</option>
              <option value="UNDER_INVESTIGATION">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="FALSE_POSITIVE">False Positive</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={{
                backgroundColor: '#1E2640',
                border:          '1px solid #2A3352',
                borderRadius:    '6px',
                color:           '#E2E8F0',
                fontSize:        '12px',
                padding:         '6px 10px',
                outline:         'none',
                cursor:          'pointer',
              }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {(selectedStatus !== 'ALL' || selectedSeverity !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedSeverity('ALL');
                setSearchQuery('');
              }}
              style={{
                backgroundColor: 'transparent',
                border:          'none',
                color:           '#3B82F6',
                fontSize:        '11px',
                cursor:          'pointer',
                textDecoration:  'underline',
                padding:         '4px',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Incidents Table */}
      <div
        style={{
          backgroundColor: '#161C2E',
          border:          '1px solid #2A3352',
          borderRadius:    '8px',
          overflow:        'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#111726', borderBottom: '1px solid #2A3352' }}>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Incident ID
                </th>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Target Employee
                </th>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Severity
                </th>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Threat Score
                </th>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Assigned Analyst
                </th>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Trigger Reason
                </th>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Logged Date
                </th>
                <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <div
                      style={{
                        width:           '24px',
                        height:          '24px',
                        border:          '2px solid #2A3352',
                        borderTopColor:  '#3B82F6',
                        borderRadius:    '50%',
                        margin:          '0 auto 12px',
                        animation:       'spin 1s linear infinite',
                      }}
                    />
                    Loading security incident intelligence...
                  </td>
                </tr>
              )}

              {!loading && filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ fontSize: '14px', color: '#E2E8F0', marginBottom: '4px' }}>
                      No Security Incidents Found
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      {searchQuery || selectedStatus !== 'ALL' || selectedSeverity !== 'ALL'
                        ? 'Try loosening your filter criteria.'
                        : 'No employees have triggered ML critical anomaly thresholds.'}
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredIncidents.map((inc) => {
                  const isCritical = inc.threat_score >= 75;
                  return (
                    <tr
                      key={inc.id}
                      onClick={() => openInvestigation(inc.id)}
                      style={{
                        borderBottom:    '1px solid #1E2640',
                        cursor:          'pointer',
                        transition:      'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E2640')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* ID */}
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', color: '#3B82F6' }}>
                        INC-{String(inc.id).padStart(5, '0')}
                      </td>

                      {/* Target Employee */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width:           '28px',
                              height:          '28px',
                              borderRadius:    '50%',
                              backgroundColor: '#1E2640',
                              border:          '1px solid #2A3352',
                              display:         'flex',
                              alignItems:      'center',
                              justifyContent:  'center',
                              fontSize:        '11px',
                              fontWeight:      700,
                              color:           '#F8FAFC',
                            }}
                          >
                            {inc.employee_name ? inc.employee_name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{inc.employee_name}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', gap: '6px' }}>
                              <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{inc.emp_id}</span>
                              {inc.department && <span>• {inc.department}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '12px 16px' }}>
                        <IncidentSeverityBadge severity={inc.severity} size="sm" />
                      </td>

                      {/* Threat Score */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontWeight: 700,
                              fontSize:   '13px',
                              color:      isCritical ? '#EF4444' : inc.threat_score >= 50 ? '#F59E0B' : '#10B981',
                              minWidth:   '26px',
                            }}
                          >
                            {inc.threat_score}
                          </div>
                          <div
                            style={{
                              width:           '48px',
                              height:          '4px',
                              backgroundColor: '#2A3352',
                              borderRadius:    '2px',
                              overflow:        'hidden',
                            }}
                          >
                            <div
                              style={{
                                width:           `${inc.threat_score}%`,
                                height:          '100%',
                                backgroundColor: isCritical ? '#EF4444' : '#F59E0B',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <IncidentStatusBadge status={inc.status} size="sm" />
                      </td>

                      {/* Assigned Analyst */}
                      <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                        {inc.assignee_email ? (
                          <span style={{ color: '#E2E8F0' }}>{inc.assignee_email}</span>
                        ) : (
                          <span style={{ color: '#64748B', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Trigger Reason */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize:        '11px',
                            fontFamily:      'var(--font-mono, monospace)',
                            color:           inc.trigger_reason === 'ML_AUTO_TRIGGER' ? '#F59E0B' : '#94A3B8',
                            backgroundColor: '#1E2640',
                            padding:         '2px 6px',
                            borderRadius:    '4px',
                            border:          '1px solid #2A3352',
                          }}
                        >
                          {inc.trigger_reason}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: '#94A3B8', fontFamily: 'var(--font-mono, monospace)' }}>
                        {new Date(inc.created_at).toLocaleDateString()}
                      </td>

                      {/* Action Button */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInvestigation(inc.id);
                          }}
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color:           '#3B82F6',
                            border:          '1px solid rgba(59, 130, 246, 0.35)',
                            borderRadius:    '4px',
                            padding:         '4px 10px',
                            fontSize:        '11px',
                            fontWeight:      600,
                            cursor:          'pointer',
                            transition:      'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#3B82F6';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                            e.currentTarget.style.color = '#3B82F6';
                          }}
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investigation Drawer Component */}
      <IncidentInvestigationDrawer
        incidentId={investigatingIncidentId}
        isOpen={isDrawerOpen}
        onClose={closeInvestigation}
        onUpdated={handleIncidentUpdated}
        currentUser={currentUser}
      />
    </div>
  );
}
