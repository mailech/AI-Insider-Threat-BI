import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Flame,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  Clock,
  Send,
  Sliders,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

import Login from './Login';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MetricCard from './components/dashboard/MetricCard';
import ThreatDrawer from './components/dashboard/ThreatDrawer';
import RiskBadge from './components/common/RiskBadge';
import EmptyState from './components/common/EmptyState';
import { useTheme } from './context/ThemeContext';

// ================= SAMPLE EMPLOYEE DATA =================

const initialEmployees = [
  {
    id: '101',
    name: 'John Carter',
    department: 'Finance',
    riskLevel: 'High',
    score: 87,
    lastActivity: 'Unusual login — 3:14 AM, unrecognized device',
    seen: '2h ago',
    avatarBg: '#e8f0fe',
    avatarColor: '#1a73e8',
    initial: 'JC',
    details:
      'Attempted 5 failed logins from an unapproved IP in Berlin before successfully authenticating.'
  },
  {
    id: '104',
    name: 'Priya Nair',
    department: 'Legal',
    riskLevel: 'High',
    score: 79,
    lastActivity: 'Mass download prior to scheduled offboarding',
    seen: '40m ago',
    avatarBg: '#fce8e6',
    avatarColor: '#c5221f',
    initial: 'PN',
    details:
      'Exported 1,420 confidential contract PDFs to external storage 3 days prior to departure date.'
  },
  {
    id: '102',
    name: 'David Kim',
    department: 'Engineering',
    riskLevel: 'Medium',
    score: 54,
    lastActivity: 'Large file access — 2.3 GB transferred',
    seen: '5h ago',
    avatarBg: '#fef7e0',
    avatarColor: '#b06000',
    initial: 'DK',
    details:
      'Downloaded internal source code repositories outside normal working hours.'
  },
  {
    id: '105',
    name: 'Sarah Jenkins',
    department: 'HR',
    riskLevel: 'Low',
    score: 18,
    lastActivity: 'Routine payroll database query',
    seen: '1d ago',
    avatarBg: '#e6f4ea',
    avatarColor: '#137333',
    initial: 'SJ',
    details:
      'Normal administrative activity within assigned permissions.'
  },
  {
    id: '108',
    name: 'Alex Rivera',
    department: 'DevOps',
    riskLevel: 'Medium',
    score: 48,
    lastActivity: 'SSH key modification on production cluster',
    seen: '12h ago',
    avatarBg: '#fef7e0',
    avatarColor: '#b06000',
    initial: 'AR',
    details:
      'Created new root SSH keys without filing an associated ticket.'
  }
];

// ================= ALERT DATA =================

const initialAlerts = [
  {
    id: 'ALT-901',
    title: 'Unauthorized Data Export',
    severity: 'Critical',
    status: 'Unresolved',
    time: '10m ago',
    target: 'Priya Nair (ID 104)'
  },
  {
    id: 'ALT-884',
    title: 'Anomalous Time Authentication',
    severity: 'High',
    status: 'Investigating',
    time: '2h ago',
    target: 'John Carter (ID 101)'
  },
  {
    id: 'ALT-872',
    title: 'Bulk File Download',
    severity: 'Medium',
    status: 'Resolved',
    time: '1d ago',
    target: 'David Kim (ID 102)'
  }
];

// Recharts datasets for Risk Analysis
const departmentIncidentData = [
  { department: 'Legal', incidents: 14, color: '#ef4444' },
  { department: 'Finance', incidents: 8, color: '#f97316' },
  { department: 'DevOps', incidents: 6, color: '#f59e0b' },
  { department: 'Engineering', incidents: 11, color: '#6366f1' },
  { department: 'HR', incidents: 3, color: '#10b981' }
];

const threatVectorData = [
  { vector: 'Data Exfiltration', incidents: 42, baseline: 10 },
  { vector: 'Login Anomalies', incidents: 18, baseline: 5 },
  { vector: 'Privilege Escalation', incidents: 9, baseline: 2 },
  { vector: 'After-Hours Access', incidents: 15, baseline: 4 }
];

// Navigation menu configuration
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', badge: null },
  { label: 'Employees', path: '/employees', badge: null },
  { label: 'Risk Analysis', path: '/risk-analysis', badge: null },
  { label: 'Alerts', path: '/alerts', badge: '3' },
  { label: 'Settings', path: '/settings', badge: null }
];

// ================= MAIN DASHBOARD SHELL =================

function DashboardLayout() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/employees')) return 'Employees';
    if (path.startsWith('/risk-analysis')) return 'Risk Analysis';
    if (path.startsWith('/alerts')) return 'Alerts';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };

  const activeTab = getActiveTab();

  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Mobile sidebar toggle state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('All');

  // Employee & alert states
  const [employees, setEmployees] = useState(initialEmployees);
  const [alerts, setAlerts] = useState(initialAlerts);

  // Drawer state
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Settings states
  const [riskThreshold, setRiskThreshold] = useState(75);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Containment actions
  const handleLockAccount = (id) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              riskLevel: 'Low',
              score: 0,
              lastActivity: 'Account locked by analyst'
            }
          : emp
      )
    );
    setSelectedEmployee(null);
  };

  const handleDismissFlag = (id) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    setSelectedEmployee(null);
  };

  const handleSaveSettings = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  // Toggle Alert Status
  const handleToggleAlertStatus = (alertId) => {
    setAlerts((prev) =>
      prev.map((alt) => {
        if (alt.id !== alertId) return alt;
        const nextStatus =
          alt.status === 'Unresolved'
            ? 'Investigating'
            : alt.status === 'Investigating'
            ? 'Resolved'
            : 'Unresolved';
        return { ...alt, status: nextStatus };
      })
    );
  };

  // Filtered employees calculation
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.includes(searchTerm);

    const matchesRisk =
      selectedRiskFilter === 'All' || emp.riskLevel === selectedRiskFilter;

    return matchesSearch && matchesRisk;
  });

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.bg,
        color: theme.textPrimary,
        transition: 'background-color 0.2s ease, color 0.2s ease'
      }}
    >
      {/* ================= SIDEBAR ================= */}
      <Sidebar
        activeTab={activeTab}
        navItems={NAV_ITEMS}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* ================= MAIN CONTENT AREA ================= */}
      <main
        style={{
          flex: 1,
          padding: '30px 36px',
          overflowY: 'auto',
          minWidth: 0
        }}
      >
        {/* HEADER */}
        <Header
          activeTab={activeTab}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* ================================================= */}
        {/* 1. DASHBOARD VIEW                                */}
        {/* ================================================= */}
        {activeTab === 'Dashboard' && (
          <div className="animate-fade-in">
            {/* Composite Risk Score Banner Card */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '14px',
                border: `1px solid ${theme.border}`,
                padding: '24px 28px',
                boxShadow: theme.shadow,
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Visual Radial Gauge */}
                <div
                  style={{
                    position: 'relative',
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <svg
                    style={{
                      width: '100px',
                      height: '100px',
                      transform: 'rotate(-90deg)'
                    }}
                    viewBox="0 0 36 36"
                  >
                    <path
                      strokeWidth="3.5"
                      stroke={theme.surfaceVariant}
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      strokeWidth="3.5"
                      strokeDasharray="14, 100"
                      strokeLinecap="round"
                      stroke="#10b981"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '26px',
                        fontWeight: '800',
                        color: theme.textPrimary,
                        lineHeight: 1
                      }}
                    >
                      14
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '10.5px',
                        color: theme.textSecondary,
                        fontWeight: '600'
                      }}
                    >
                      / 100
                    </span>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '700',
                        letterSpacing: '0.08em',
                        color: theme.textSecondary,
                        textTransform: 'uppercase',
                        margin: 0
                      }}
                    >
                      Enterprise Composite Risk Score
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      LOW RISK
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '13px',
                      color: theme.textSecondary,
                      maxWidth: '560px',
                      margin: '0 0 8px 0',
                      lineHeight: '1.45'
                    }}
                  >
                    Aggregate threat index synthesized across credential anomalies, mass file
                    exfiltrations, and lateral privilege violations across 97 monitored identities.
                  </p>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#10b981'
                    }}
                  >
                    <TrendingDown size={14} />
                    Down 4 points vs. previous 7-day telemetry
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px'
                }}
              >
                <button
                  onClick={() => navigate('/risk-analysis')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.surfaceVariant,
                    color: theme.textPrimary,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Inspect Vectors
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '18px',
                marginBottom: '24px'
              }}
            >
              <MetricCard
                number={5}
                title="High Risk Employees"
                change="+2 this week"
                color="#ef4444"
                icon={Flame}
              />
              <MetricCard
                number={12}
                title="Medium Risk Employees"
                change="+1 this week"
                color="#f97316"
                icon={AlertTriangle}
              />
              <MetricCard
                number={80}
                title="Low Risk Employees"
                change="Stable baseline"
                color="#10b981"
                icon={ShieldCheck}
              />
            </div>

            {/* Highest Priority Monitored Table */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '14px',
                border: `1px solid ${theme.border}`,
                padding: '24px 26px',
                boxShadow: theme.shadow
              }}
            >
              {/* Table Header Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      letterSpacing: '0.08em',
                      color: theme.textSecondary,
                      textTransform: 'uppercase',
                      margin: 0
                    }}
                  >
                    High Priority Threat Triage
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: theme.textSecondary }}>
                    Select any identity to inspect behavioral telemetry and initiate containment.
                  </p>
                </div>

                {/* Risk Filter Buttons */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {['All', 'High', 'Medium', 'Low'].map((risk) => {
                    const isSelected = selectedRiskFilter === risk;
                    return (
                      <button
                        key={risk}
                        onClick={() => setSelectedRiskFilter(risk)}
                        style={{
                          padding: '6px 13px',
                          borderRadius: '7px',
                          border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                          color: isSelected ? '#ffffff' : theme.textSecondary,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {risk}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table / Empty State */}
              {filteredEmployees.length === 0 ? (
                <EmptyState
                  onReset={() => {
                    setSearchTerm('');
                    setSelectedRiskFilter('All');
                  }}
                />
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
                        <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Identity</th>
                        <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Department</th>
                        <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Risk Assessment</th>
                        <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Score</th>
                        <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Telemetry Flag</th>
                        <th style={{ paddingBottom: '12px', fontWeight: '600', textAlign: 'right' }}>
                          Timestamp
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredEmployees.map((emp) => {
                        const isHovered = hoveredRow === emp.id;
                        return (
                          <tr
                            key={emp.id}
                            onClick={() => setSelectedEmployee(emp)}
                            onMouseEnter={() => setHoveredRow(emp.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            style={{
                              borderBottom: `1px solid ${theme.border}`,
                              cursor: 'pointer',
                              backgroundColor: isHovered ? theme.surfaceHover : 'transparent',
                              transition: 'background-color 0.12s ease'
                            }}
                          >
                            <td
                              style={{
                                padding: '14px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}
                            >
                              <div
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '10px',
                                  backgroundColor: emp.avatarBg,
                                  color: emp.avatarColor,
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11.5px',
                                  flexShrink: 0
                                }}
                              >
                                {emp.initial}
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', color: theme.textPrimary }}>
                                  {emp.name}
                                </div>
                                <div style={{ fontSize: '11px', color: theme.textSecondary }}>
                                  ID #{emp.id}
                                </div>
                              </div>
                            </td>

                            <td style={{ color: theme.textSecondary, fontWeight: '500' }}>
                              {emp.department}
                            </td>

                            <td>
                              <RiskBadge riskLevel={emp.riskLevel} />
                            </td>

                            <td
                              style={{
                                fontWeight: '700',
                                color: theme.textPrimary,
                                fontFeatureSettings: '"tnum"'
                              }}
                            >
                              ▲ {emp.score}
                            </td>

                            <td style={{ color: theme.textSecondary, maxWidth: '280px' }}>
                              {emp.lastActivity}
                            </td>

                            <td
                              style={{
                                textAlign: 'right',
                                color: theme.textSecondary,
                                fontFeatureSettings: '"tnum"'
                              }}
                            >
                              {emp.seen}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 2. EMPLOYEES DIRECTORY VIEW                      */}
        {/* ================================================= */}
        {activeTab === 'Employees' && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: theme.surface,
              borderRadius: '14px',
              border: `1px solid ${theme.border}`,
              padding: '24px 28px',
              boxShadow: theme.shadow
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>
                Monitored Personnel Directory (97 Active Identities)
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: theme.textSecondary }}>
                Continuous behavioral analytics and baseline activity monitoring across enterprise endpoints.
              </p>
            </div>

            <div className="table-responsive">
              <table
                style={{
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '13px',
                  borderCollapse: 'collapse'
                }}
              >
                <thead>
                  <tr
                    style={{
                      color: theme.textSecondary,
                      borderBottom: `1px solid ${theme.border}`,
                      textTransform: 'uppercase',
                      fontSize: '11px',
                      letterSpacing: '0.06em'
                    }}
                  >
                    <th style={{ paddingBottom: '12px' }}>Employee</th>
                    <th style={{ paddingBottom: '12px' }}>Department</th>
                    <th style={{ paddingBottom: '12px' }}>Current Risk Level</th>
                    <th style={{ paddingBottom: '12px' }}>Score</th>
                    <th style={{ paddingBottom: '12px' }}>Latest Telemetry</th>
                    <th style={{ paddingBottom: '12px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      style={{
                        borderBottom: `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.surfaceHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 0', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '8px',
                              backgroundColor: emp.avatarBg,
                              color: emp.avatarColor,
                              fontWeight: '700',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {emp.initial}
                          </div>
                          <div>
                            <div>{emp.name}</div>
                            <div style={{ fontSize: '11px', color: theme.textSecondary }}>
                              ID #{emp.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: theme.textSecondary }}>{emp.department}</td>
                      <td>
                        <RiskBadge riskLevel={emp.riskLevel} />
                      </td>
                      <td style={{ fontWeight: '700' }}>{emp.score} / 100</td>
                      <td style={{ color: theme.textSecondary }}>{emp.lastActivity}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployee(emp);
                          }}
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '6px',
                            border: `1px solid ${theme.border}`,
                            backgroundColor: theme.surfaceVariant,
                            color: theme.textPrimary,
                            cursor: 'pointer'
                          }}
                        >
                          Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 3. RISK ANALYSIS (WITH REAL RECHARTS)             */}
        {/* ================================================= */}
        {activeTab === 'Risk Analysis' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '14px',
                border: `1px solid ${theme.border}`,
                padding: '24px 28px',
                boxShadow: theme.shadow
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>
                Behavioral Threat Vector Analytics
              </h2>
              <p style={{ color: theme.textSecondary, fontSize: '13px', margin: 0 }}>
                Breakdown of monitored risk vectors and anomaly distribution across organizational units.
              </p>
            </div>

            {/* Recharts Analytics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '24px'
              }}
            >
              {/* Department Distribution Chart */}
              <div
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: '14px',
                  border: `1px solid ${theme.border}`,
                  padding: '24px',
                  boxShadow: theme.shadow
                }}
              >
                <h3
                  style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: theme.textSecondary,
                    margin: '0 0 16px 0'
                  }}
                >
                  Incidents by Department
                </h3>

                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentIncidentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.borderSubtle} vertical={false} />
                      <XAxis
                        dataKey="department"
                        stroke={theme.textSecondary}
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: theme.border }}
                      />
                      <YAxis
                        stroke={theme.textSecondary}
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: theme.border }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          borderRadius: '8px',
                          color: theme.textPrimary,
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="incidents" radius={[6, 6, 0, 0]}>
                        {departmentIncidentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Threat Vector Breakdown Chart */}
              <div
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: '14px',
                  border: `1px solid ${theme.border}`,
                  padding: '24px',
                  boxShadow: theme.shadow
                }}
              >
                <h3
                  style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: theme.textSecondary,
                    margin: '0 0 16px 0'
                  }}
                >
                  Observed vs. Baseline Anomalies
                </h3>

                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={threatVectorData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.borderSubtle} horizontal={false} />
                      <XAxis type="number" stroke={theme.textSecondary} fontSize={12} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="vector"
                        stroke={theme.textSecondary}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: theme.border }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          borderRadius: '8px',
                          color: theme.textPrimary,
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="incidents" fill={theme.primary} radius={[0, 6, 6, 0]} name="Observed" />
                      <Bar dataKey="baseline" fill={theme.textSecondary} opacity={0.4} radius={[0, 6, 6, 0]} name="Baseline" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 4. SECURITY ALERTS VIEW                          */}
        {/* ================================================= */}
        {activeTab === 'Alerts' && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: theme.surface,
              borderRadius: '14px',
              border: `1px solid ${theme.border}`,
              padding: '24px 28px',
              boxShadow: theme.shadow
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>
                Active Security Incident Alerts
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: theme.textSecondary }}>
                Real-time threat notifications generated by behavioral anomaly detection rules.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 20px',
                    backgroundColor: theme.surfaceVariant,
                    borderRadius: '10px',
                    border: `1px solid ${theme.borderSubtle}`,
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
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
                      <AlertTriangle size={18} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: theme.textPrimary }}>
                          {alt.title}
                        </span>
                        <RiskBadge riskLevel={alt.severity} size="small" />
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: theme.textSecondary,
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <span>Target: <strong>{alt.target}</strong></span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {alt.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => handleToggleAlertStatus(alt.id)}
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        color: theme.textPrimary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Status: {alt.status}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 5. SETTINGS VIEW                                 */}
        {/* ================================================= */}
        {activeTab === 'Settings' && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: theme.surface,
              borderRadius: '14px',
              border: `1px solid ${theme.border}`,
              padding: '28px 32px',
              boxShadow: theme.shadow,
              maxWidth: '850px'
            }}
          >
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={20} color={theme.primary} />
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                  SOC Configuration & Telemetry Parameters
                </h2>
              </div>
              <p style={{ marginTop: '6px', fontSize: '13px', color: theme.textSecondary }}>
                Manage behavioral risk sensitivity thresholds, alert webhooks, and interface preferences.
              </p>
            </div>

            {/* Threshold Slider */}
            <div
              style={{
                padding: '20px',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                marginBottom: '20px',
                backgroundColor: theme.surfaceVariant
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: '600' }}>
                  High-Risk Anomaly Trigger Threshold
                </label>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: theme.primary,
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '13px'
                  }}
                >
                  {riskThreshold} / 100
                </span>
              </div>

              <input
                type="range"
                min="50"
                max="95"
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: theme.primary, cursor: 'pointer' }}
              />

              <p style={{ fontSize: '12px', color: theme.textSecondary, margin: '8px 0 0 0' }}>
                Identities with composite threat scores exceeding this benchmark will be automatically escalated to Critical priority.
              </p>
            </div>

            {/* Notification Checkbox */}
            <div
              style={{
                padding: '20px',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                marginBottom: '20px',
                backgroundColor: theme.surfaceVariant,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <label style={{ fontSize: '13.5px', fontWeight: '600', display: 'block' }}>
                  Continuous Threat Telemetry Alerts
                </label>
                <p style={{ fontSize: '12px', color: theme.textSecondary, margin: '4px 0 0 0' }}>
                  Push incident events immediately into the SOC notification pipeline.
                </p>
              </div>

              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: theme.primary, cursor: 'pointer' }}
              />
            </div>

            {/* Webhook Input */}
            <div
              style={{
                padding: '20px',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                marginBottom: '26px',
                backgroundColor: theme.surfaceVariant
              }}
            >
              <label style={{ fontSize: '13.5px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                SIEM / Splunk / Slack Webhook Integration
              </label>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.surface,
                    color: theme.textPrimary,
                    outline: 'none',
                    fontSize: '13px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => alert('Test webhook ping dispatched.')}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: theme.surface,
                    color: theme.textPrimary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Test Ping
                </button>
              </div>
            </div>

            {/* Save Controls & Feedback */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={handleSaveSettings}
                style={{
                  padding: '11px 24px',
                  backgroundColor: theme.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Send size={15} />
                Save Security Settings
              </button>

              {savedFeedback && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#10b981',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  <CheckCircle2 size={16} />
                  Settings committed successfully
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= THREAT DETAILS DRAWER ================= */}
      <ThreatDrawer
        selectedEmployee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onLockAccount={handleLockAccount}
        onDismissFlag={handleDismissFlag}
      />
    </div>
  );
}

// ================= TOP-LEVEL ROUTER =================

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
