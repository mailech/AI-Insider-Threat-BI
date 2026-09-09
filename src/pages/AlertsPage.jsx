import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Search,
  CheckCircle2,
  ExternalLink,
  X,
  Radio,
  ArrowUpDown,
  RotateCcw,
  Check,
  Eye,
  Calendar
} from 'lucide-react';

import { useTheme } from '../context/ThemeContext';
import RiskBadge from '../components/common/RiskBadge';

// Severity rank mapping for sorting
const SEVERITY_RANK = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1
};

export default function AlertsPage({
  alerts = [],
  onUpdateAlertStatus,
  employees = []
}) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'severity' | 'id'

  // Selected alert for deep investigation drawer
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Status transition handler with toast
  const handleStatusChange = (alertId, newStatus) => {
    if (onUpdateAlertStatus) {
      onUpdateAlertStatus(alertId, newStatus);
    }
    showToast(`Incident ${alertId} status updated to "${newStatus}"`);
  };

  // Filtered & Sorted Alerts
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alt) => {
        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchId = alt.id.toLowerCase().includes(term);
          const matchTitle = alt.title.toLowerCase().includes(term);
          const matchTarget = (alt.target || '').toLowerCase().includes(term);
          const matchCategory = (alt.category || '').toLowerCase().includes(term);
          const matchSensor = (alt.sensor || '').toLowerCase().includes(term);
          if (!matchId && !matchTitle && !matchTarget && !matchCategory && !matchSensor) {
            return false;
          }
        }

        // Severity filter
        if (severityFilter !== 'All' && alt.severity !== severityFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'All' && alt.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'severity') {
          return (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
        }
        if (sortBy === 'id') {
          return b.id.localeCompare(a.id);
        }
        // Default: newest (by index in original array or timestamp)
        return 0;
      });
  }, [alerts, searchTerm, severityFilter, statusFilter, sortBy]);

  // Overall KPI counts
  const kpiStats = useMemo(() => {
    const total = alerts.length;
    const criticalHigh = alerts.filter(
      (a) => a.severity === 'Critical' || a.severity === 'High'
    ).length;
    const investigating = alerts.filter((a) => a.status === 'Investigating').length;
    const resolved = alerts.filter((a) => a.status === 'Resolved').length;

    return { total, criticalHigh, investigating, resolved };
  }, [alerts]);

  // Active selected alert object
  const activeAlert = useMemo(() => {
    return alerts.find((a) => a.id === selectedAlertId) || null;
  }, [alerts, selectedAlertId]);

  // Find associated employee for active alert
  const associatedEmployee = useMemo(() => {
    if (!activeAlert || !activeAlert.employeeId) return null;
    return employees.find((e) => e.id === activeAlert.employeeId) || null;
  }, [activeAlert, employees]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ================================================= */}
      {/* 1. TOAST NOTIFICATION                             */}
      {/* ================================================= */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 1000,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            borderRadius: '10px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={16} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary }}>
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              marginLeft: '8px',
              padding: '2px'
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ================================================= */}
      {/* 2. TOP BANNER & INCIDENT KPI STRIP                */}
      {/* ================================================= */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '24px 28px',
          boxShadow: theme.shadow,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={22} color={theme.primary} />
            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: theme.textPrimary }}>
              Security Incident & Alert Telemetry
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSecondary }}>
            Real-time insider risk notifications, triage queues, and forensic audit event pipelines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}
          >
            <Radio size={12} className="animate-pulse" />
            LIVE TELEMETRY STREAM
          </span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px'
        }}
      >
        {/* Total Incidents */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '12px',
            border: `1px solid ${theme.border}`,
            padding: '20px 22px',
            boxShadow: theme.shadow
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
            Total Monitored Incidents
          </span>
          <div style={{ fontSize: '32px', fontWeight: '800', color: theme.textPrimary, marginTop: '8px', lineHeight: 1 }}>
            {kpiStats.total}
          </div>
          <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '6px', display: 'block' }}>
            Across all organizational units
          </span>
        </div>

        {/* Critical & High */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '12px',
            border: `1px solid ${theme.border}`,
            padding: '20px 22px',
            boxShadow: theme.shadow
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
              High & Critical Priority
            </span>
            <Flame size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444', marginTop: '8px', lineHeight: 1 }}>
            {kpiStats.criticalHigh}
          </div>
          <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '6px', display: 'block' }}>
            Requires immediate SOC triage
          </span>
        </div>

        {/* Under Investigation */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '12px',
            border: `1px solid ${theme.border}`,
            padding: '20px 22px',
            boxShadow: theme.shadow
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
              Active Investigations
            </span>
            <AlertTriangle size={18} color="#f97316" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#f97316', marginTop: '8px', lineHeight: 1 }}>
            {kpiStats.investigating}
          </div>
          <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '6px', display: 'block' }}>
            Currently assigned to analysts
          </span>
        </div>

        {/* Resolved */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '12px',
            border: `1px solid ${theme.border}`,
            padding: '20px 22px',
            boxShadow: theme.shadow
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
              Mitigated & Closed
            </span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', marginTop: '8px', lineHeight: 1 }}>
            {kpiStats.resolved}
          </div>
          <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '6px', display: 'block' }}>
            Verified benign or contained
          </span>
        </div>
      </div>

      {/* ================================================= */}
      {/* 3. FILTER & SEARCH CONTROL BAR                    */}
      {/* ================================================= */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '20px 24px',
          boxShadow: theme.shadow,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Top Controls: Search and Sort */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.textSecondary
              }}
            />
            <input
              type="text"
              placeholder="Search alert ID, threat title, target identity, or sensor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 38px 10px 40px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surfaceVariant,
                color: theme.textPrimary,
                fontSize: '13px',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpDown size={14} color={theme.textSecondary} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: theme.textSecondary }}>
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '7px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surfaceVariant,
                color: theme.textPrimary,
                fontSize: '12.5px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="newest">Recent First</option>
              <option value="severity">Severity (High to Low)</option>
              <option value="id">Alert ID</option>
            </select>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            borderTop: `1px solid ${theme.borderSubtle}`,
            paddingTop: '14px'
          }}
        >
          {/* Severity Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '700', color: theme.textSecondary, marginRight: '4px', textTransform: 'uppercase' }}>
              Severity:
            </span>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => {
              const isSelected = severityFilter === sev;
              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '6px',
                    border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                    backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                    color: isSelected ? '#ffffff' : theme.textSecondary,
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {sev}
                </button>
              );
            })}
          </div>

          {/* Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '700', color: theme.textSecondary, marginRight: '4px', textTransform: 'uppercase' }}>
              Status:
            </span>
            {['All', 'Unresolved', 'Investigating', 'Resolved'].map((st) => {
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '6px',
                    border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                    backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                    color: isSelected ? '#ffffff' : theme.textSecondary,
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {st}
                </button>
              );
            })}

            {(severityFilter !== 'All' || statusFilter !== 'All' || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSeverityFilter('All');
                  setStatusFilter('All');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: 'transparent',
                  color: theme.textSecondary,
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginLeft: '6px'
                }}
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* 4. ALERTS QUEUE TABLE / LIST                      */}
      {/* ================================================= */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '24px',
          boxShadow: theme.shadow
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: theme.textPrimary }}>
              Security Incidents Queue
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: theme.textSecondary }}>
              Showing {filteredAlerts.length} of {alerts.length} incident records
            </p>
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: theme.surfaceVariant,
              borderRadius: '10px',
              border: `1px dashed ${theme.border}`
            }}
          >
            <ShieldCheck size={42} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: theme.textPrimary, margin: '0 0 6px 0' }}>
              No Security Alerts Match Filters
            </h3>
            <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '0 0 16px 0' }}>
              Try adjusting your search query, severity, or lifecycle status filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSeverityFilter('All');
                setStatusFilter('All');
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                backgroundColor: theme.primary,
                color: '#ffffff',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '13px'
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${theme.border}`,
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    letterSpacing: '0.06em'
                  }}
                >
                  <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Alert ID & Title</th>
                  <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Severity</th>
                  <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Target Identity</th>
                  <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Detection Sensor</th>
                  <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Status</th>
                  <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Timestamp</th>
                  <th style={{ paddingBottom: '12px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredAlerts.map((alt) => {
                  const isInvestigating = alt.status === 'Investigating';
                  const isResolved = alt.status === 'Resolved';

                  return (
                    <tr
                      key={alt.id}
                      onClick={() => setSelectedAlertId(alt.id)}
                      style={{
                        borderBottom: `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.surfaceHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Alert ID & Title */}
                      <td style={{ padding: '16px 0', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor:
                                alt.severity === 'Critical'
                                  ? 'rgba(220, 38, 38, 0.15)'
                                  : alt.severity === 'High'
                                  ? 'rgba(234, 88, 12, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color:
                                alt.severity === 'Critical'
                                  ? '#ef4444'
                                  : alt.severity === 'High'
                                  ? '#f97316'
                                  : '#f59e0b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <AlertTriangle size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: theme.textPrimary }}>
                              {alt.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: theme.primary,
                                  fontFamily: 'monospace'
                                }}
                              >
                                {alt.id}
                              </span>
                              {alt.category && (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    color: theme.textSecondary,
                                    backgroundColor: theme.surfaceVariant,
                                    padding: '1px 5px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {alt.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Severity Badge */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <RiskBadge riskLevel={alt.severity} size="small" />
                      </td>

                      {/* Target Identity */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '600', color: theme.textPrimary, fontSize: '13px' }}>
                          {alt.target}
                        </div>
                        {alt.department && (
                          <div style={{ fontSize: '11.5px', color: theme.textSecondary }}>
                            {alt.department}
                          </div>
                        )}
                      </td>

                      {/* Detection Sensor */}
                      <td style={{ verticalAlign: 'middle', color: theme.textSecondary, fontSize: '12.5px' }}>
                        {alt.sensor || 'Behavioral Heuristics'}
                      </td>

                      {/* Status Pill */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            backgroundColor: isResolved
                              ? 'rgba(16, 185, 129, 0.12)'
                              : isInvestigating
                              ? 'rgba(249, 115, 22, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                            color: isResolved ? '#10b981' : isInvestigating ? '#f97316' : '#ef4444',
                            border: `1px solid ${
                              isResolved
                                ? 'rgba(16, 185, 129, 0.25)'
                                : isInvestigating
                                ? 'rgba(249, 115, 22, 0.25)'
                                : 'rgba(239, 68, 68, 0.25)'
                            }`
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isResolved
                                ? '#10b981'
                                : isInvestigating
                                ? '#f97316'
                                : '#ef4444'
                            }}
                          />
                          {alt.status}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td
                        style={{
                          verticalAlign: 'middle',
                          color: theme.textSecondary,
                          fontSize: '12px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {alt.time}
                      </td>

                      {/* Actions */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlertId(alt.id);
                            }}
                            title="Open Investigation Dossier"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: theme.surfaceVariant,
                              border: `1px solid ${theme.border}`,
                              color: theme.textPrimary,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: '600'
                            }}
                          >
                            <Eye size={13} />
                            <span>Triage</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const next =
                                alt.status === 'Unresolved'
                                  ? 'Investigating'
                                  : alt.status === 'Investigating'
                                  ? 'Resolved'
                                  : 'Unresolved';
                              handleStatusChange(alt.id, next);
                            }}
                            title="Toggle Quick Status"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: isResolved ? theme.surfaceVariant : theme.primary,
                              border: `1px solid ${isResolved ? theme.border : theme.primary}`,
                              color: isResolved ? theme.textPrimary : '#ffffff',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: '600'
                            }}
                          >
                            {isResolved ? (
                              <>
                                <RotateCcw size={12} />
                                <span>Reopen</span>
                              </>
                            ) : isInvestigating ? (
                              <>
                                <Check size={12} />
                                <span>Resolve</span>
                              </>
                            ) : (
                              <>
                                <Check size={12} />
                                <span>Acknowledge</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* 5. INVESTIGATION DOSSIER SLIDE-OUT PANEL / DRAWER */}
      {/* ================================================= */}
      {activeAlert && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 110,
            display: 'flex',
            justifyContent: 'flex-end',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setSelectedAlertId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              height: '100vh',
              backgroundColor: theme.surface,
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.4)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s ease-out'
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '24px 28px',
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                backgroundColor: theme.surfaceVariant
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: '800',
                      fontSize: '12px',
                      color: theme.primary,
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '5px'
                    }}
                  >
                    {activeAlert.id}
                  </span>
                  <RiskBadge riskLevel={activeAlert.severity} size="small" />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      backgroundColor:
                        activeAlert.status === 'Resolved'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : activeAlert.status === 'Investigating'
                          ? 'rgba(249, 115, 22, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      color:
                        activeAlert.status === 'Resolved'
                          ? '#10b981'
                          : activeAlert.status === 'Investigating'
                          ? '#f97316'
                          : '#ef4444'
                    }}
                  >
                    {activeAlert.status}
                  </span>
                </div>

                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.textPrimary }}>
                  {activeAlert.title}
                </h2>
                <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '4px', display: 'block' }}>
                  Telemetry recorded {activeAlert.time}
                </span>
              </div>

              <button
                onClick={() => setSelectedAlertId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Action Bar */}
            <div
              style={{
                padding: '16px 28px',
                borderBottom: `1px solid ${theme.border}`,
                backgroundColor: theme.surface,
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              {activeAlert.status !== 'Investigating' && (
                <button
                  onClick={() => handleStatusChange(activeAlert.id, 'Investigating')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: theme.primary,
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertTriangle size={14} />
                  Acknowledge & Investigate
                </button>
              )}

              {activeAlert.status !== 'Resolved' && (
                <button
                  onClick={() => handleStatusChange(activeAlert.id, 'Resolved')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={14} />
                  Mark Resolved
                </button>
              )}

              {activeAlert.status === 'Resolved' && (
                <button
                  onClick={() => handleStatusChange(activeAlert.id, 'Unresolved')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: theme.surfaceVariant,
                    color: theme.textPrimary,
                    border: `1px solid ${theme.border}`,
                    fontWeight: '700',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={14} />
                  Re-open Incident
                </button>
              )}
            </div>

            {/* Drawer Body Content */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Associated Employee Identity Card */}
              <div
                style={{
                  backgroundColor: theme.surfaceVariant,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '10px',
                  padding: '16px 18px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary }}>
                    Associated Monitored Identity
                  </span>
                  {activeAlert.employeeId && (
                    <button
                      onClick={() => navigate(`/employees/${activeAlert.employeeId}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: theme.primary,
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0
                      }}
                    >
                      Inspect Dossier <ExternalLink size={12} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: associatedEmployee ? associatedEmployee.avatarBg : theme.primary,
                      color: associatedEmployee ? associatedEmployee.avatarColor : '#ffffff',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      flexShrink: 0
                    }}
                  >
                    {associatedEmployee ? associatedEmployee.initial : 'ID'}
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: theme.textPrimary }}>
                      {activeAlert.target}
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>
                      {associatedEmployee ? `${associatedEmployee.role} • ${associatedEmployee.department}` : activeAlert.department}
                    </div>
                  </div>
                </div>
              </div>

              {/* Forensic Narrative Details */}
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Incident Forensic Narrative
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: theme.textPrimary,
                    backgroundColor: theme.surfaceVariant,
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.borderSubtle}`
                  }}
                >
                  {activeAlert.description || 'Behavioral anomaly detected exceeding risk sensitivity threshold.'}
                </p>
              </div>

              {/* Security Telemetry Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}
              >
                <div style={{ padding: '12px', backgroundColor: theme.surfaceVariant, borderRadius: '8px', border: `1px solid ${theme.borderSubtle}` }}>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                    MITRE ATT&CK
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: theme.textPrimary, marginTop: '4px' }}>
                    {activeAlert.mitreTechnique || 'T1078 (Valid Accounts)'}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: theme.surfaceVariant, borderRadius: '8px', border: `1px solid ${theme.borderSubtle}` }}>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                    Sensor Origin
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: theme.textPrimary, marginTop: '4px' }}>
                    {activeAlert.sensor || 'Internal Audit Telemetry'}
                  </div>
                </div>
              </div>

              {/* Remediation Guidance Alert */}
              {activeAlert.recommendedRemediation && (
                <div
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '8px',
                    padding: '14px 16px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      color: theme.primary,
                      display: 'block',
                      marginBottom: '4px'
                    }}
                  >
                    Recommended SOC Remediation Guidance
                  </span>
                  <p style={{ margin: 0, fontSize: '12.5px', color: theme.textPrimary, lineHeight: 1.5 }}>
                    {activeAlert.recommendedRemediation}
                  </p>
                </div>
              )}

              {/* ================================================= */}
              {/* Chronological Security Event Timeline             */}
              {/* ================================================= */}
              <div>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: theme.textSecondary,
                    display: 'block',
                    marginBottom: '14px'
                  }}
                >
                  Chronological Event Timeline & Telemetry
                </span>

                {activeAlert.timeline && activeAlert.timeline.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
                    {/* Connecting line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '11px',
                        top: '12px',
                        bottom: '24px',
                        width: '2px',
                        backgroundColor: theme.border
                      }}
                    />

                    {activeAlert.timeline.map((evt, idx) => (
                      <div
                        key={evt.id || idx}
                        style={{
                          display: 'flex',
                          gap: '14px',
                          paddingBottom: '20px',
                          position: 'relative'
                        }}
                      >
                        {/* Timeline node */}
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor:
                              evt.severity === 'Critical'
                                ? '#ef4444'
                                : evt.severity === 'High'
                                ? '#f97316'
                                : evt.severity === 'Medium'
                                ? '#f59e0b'
                                : '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            zIndex: 1,
                            marginTop: '2px'
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>

                        {/* Event Content */}
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: theme.surfaceVariant,
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: `1px solid ${theme.borderSubtle}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: '700', color: theme.textPrimary }}>
                              {evt.title}
                            </span>
                            <RiskBadge riskLevel={evt.severity} size="small" />
                          </div>

                          <p style={{ margin: '4px 0 6px 0', fontSize: '12px', color: theme.textSecondary, lineHeight: 1.4 }}>
                            {evt.details}
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: theme.textSecondary }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Calendar size={11} /> {evt.time}
                            </span>
                            <span>•</span>
                            <span style={{ fontFamily: 'monospace' }}>{evt.sensor}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: theme.textSecondary, margin: 0 }}>
                    No supplementary audit events registered for this incident.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
