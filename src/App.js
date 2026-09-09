import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
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
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode, theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from current URL path
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

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('All');

  // Employee & alert data states
  const [employees, setEmployees] = useState(initialEmployees);
  const [alerts] = useState(initialAlerts);

  // Drawer & hover states
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Settings states
  const [riskThreshold, setRiskThreshold] = useState(75);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');

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
    alert('Settings saved successfully!');
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
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'all 0.2s ease'
      }}
    >
      {/* ================= SIDEBAR ================= */}
      <aside
        style={{
          width: '250px',
          minHeight: '100vh',
          backgroundColor: theme.surface,
          borderRight: `1px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 14px',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        <div>
          {/* LOGO */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '28px',
              paddingLeft: '8px',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/dashboard')}
          >
            <div
              style={{
                backgroundColor: theme.primary,
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '16px',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              S
            </div>
            <span
              style={{
                fontWeight: '700',
                fontSize: '19px',
                letterSpacing: '-0.02em'
              }}
            >
              Threat AI
            </span>
          </div>

          {/* MONITOR LABEL */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: theme.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
              paddingLeft: '8px'
            }}
          >
            Monitor
          </div>

          {/* NAVIGATION */}
          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? theme.primary : theme.textSecondary,
                    backgroundColor: isActive
                      ? theme.primaryContainer
                      : 'transparent',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '10px',
                        padding: '2px 7px'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* LIVE STATUS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: theme.textSecondary,
            paddingLeft: '8px',
            paddingBottom: '8px'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }}
          />
          Live monitoring active
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main
        style={{
          flex: 1,
          padding: '28px 36px',
          overflowY: 'auto'
        }}
      >
        {/* HEADER */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: 0,
                letterSpacing: '-0.02em'
              }}
            >
              {activeTab}
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: theme.textSecondary,
                marginTop: '4px'
              }}
            >
              Insider Threat Behavioral Intelligence System
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            {/* SEARCH */}
            <input
              type="text"
              placeholder="Search employee or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '9px 14px',
                backgroundColor: theme.surfaceVariant,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                width: '220px',
                color: theme.textPrimary,
                outline: 'none',
                fontSize: '13px'
              }}
            />

            {/* DARK MODE TOGGLE */}
            <button
              onClick={toggleDarkMode}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surfaceVariant,
                color: theme.textPrimary,
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>

            {/* USER INFO & LOGOUT */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingLeft: '8px',
                borderLeft: `1px solid ${theme.border}`
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: theme.primaryContainer,
                  color: theme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                {user?.initials || 'SO'}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: theme.textPrimary
                  }}
                >
                  {user?.name || 'Security Ops'}
                </div>
                <div style={{ fontSize: '11px', color: theme.textSecondary }}>
                  {user?.role || 'Analyst'}
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                style={{
                  marginLeft: '8px',
                  padding: '6px 12px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surfaceVariant,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: theme.textPrimary,
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* ================= TAB CONTENT ================= */}

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'Dashboard' && (
          <>
            {/* SCORE GAUGE */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                padding: '24px',
                boxShadow: theme.shadow,
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                gap: '28px'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '110px',
                  height: '110px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <svg
                  style={{
                    width: '110px',
                    height: '110px',
                    transform: 'rotate(-90deg)'
                  }}
                  viewBox="0 0 36 36"
                >
                  <path
                    strokeWidth="3"
                    stroke={theme.surfaceVariant}
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    strokeWidth="3"
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
                      fontSize: '28px',
                      fontWeight: '700',
                      color: theme.textPrimary
                    }}
                  >
                    14
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: theme.textSecondary
                    }}
                  >
                    /100
                  </span>
                </div>
              </div>

              <div>
                <h3
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.08em',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}
                >
                  Composite Risk Score
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: theme.textSecondary,
                    maxWidth: '600px',
                    marginBottom: '8px',
                    lineHeight: '1.4'
                  }}
                >
                  Weighted across login anomalies, data movement and access
                  violations for all 97 monitored employees.
                </p>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#10b981'
                  }}
                >
                  ▼ Down 4 points vs. last week
                </span>
              </div>
            </div>

            {/* RISK CARDS */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '18px',
                marginBottom: '22px'
              }}
            >
              {[
                {
                  number: 5,
                  title: 'High risk employees',
                  change: '+2 this week',
                  color: '#ef4444'
                },
                {
                  number: 12,
                  title: 'Medium risk employees',
                  change: '+1 this week',
                  color: '#f97316'
                },
                {
                  number: 80,
                  title: 'Low risk employees',
                  change: 'Stable',
                  color: '#10b981'
                }
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '12px',
                    padding: '20px 22px',
                    boxShadow: theme.shadow
                  }}
                >
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: theme.textPrimary
                    }}
                  >
                    {card.number}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: theme.textSecondary,
                      marginTop: '2px'
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      color: card.color,
                      fontSize: '12px',
                      fontWeight: '600',
                      marginTop: '8px'
                    }}
                  >
                    {card.change}
                  </div>
                </div>
              ))}
            </div>

            {/* EMPLOYEE TABLE */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                padding: '22px 26px',
                boxShadow: theme.shadow
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '18px'
                }}
              >
                <h3
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.08em',
                    color: theme.textSecondary,
                    textTransform: 'uppercase'
                  }}
                >
                  Highest Priority
                </h3>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {['All', 'High', 'Medium', 'Low'].map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setSelectedRiskFilter(risk)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor:
                          selectedRiskFilter === risk
                            ? theme.primary
                            : theme.surfaceVariant,
                        color:
                          selectedRiskFilter === risk
                            ? '#ffffff'
                            : theme.textSecondary
                      }}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              </div>

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
                      letterSpacing: '0.05em'
                    }}
                  >
                    <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Name</th>
                    <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Department</th>
                    <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Risk Level</th>
                    <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Score</th>
                    <th style={{ paddingBottom: '12px', fontWeight: '600' }}>Last Activity</th>
                    <th style={{ paddingBottom: '12px', fontWeight: '600', textAlign: 'right' }}>Seen</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      onMouseEnter={() => setHoveredRow(emp.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        backgroundColor:
                          hoveredRow === emp.id
                            ? theme.surfaceHover
                            : 'transparent'
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
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: emp.avatarBg,
                            color: emp.avatarColor,
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px'
                          }}
                        >
                          {emp.initial}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: '600',
                              color: theme.textPrimary
                            }}
                          >
                            {emp.name}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: theme.textSecondary
                            }}
                          >
                            ID {emp.id}
                          </div>
                        </div>
                      </td>

                      <td style={{ color: theme.textSecondary }}>
                        {emp.department}
                      </td>

                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor:
                              emp.riskLevel === 'High'
                                ? theme.highBg
                                : emp.riskLevel === 'Medium'
                                ? theme.medBg
                                : theme.lowBg,
                            color:
                              emp.riskLevel === 'High'
                                ? theme.highText
                                : emp.riskLevel === 'Medium'
                                ? theme.medText
                                : theme.lowText,
                            border: `1px solid ${
                              emp.riskLevel === 'High'
                                ? theme.highText
                                : emp.riskLevel === 'Medium'
                                ? theme.medText
                                : theme.lowText
                            }33`
                          }}
                        >
                          • {emp.riskLevel}
                        </span>
                      </td>

                      <td
                        style={{
                          fontWeight: '700',
                          color: theme.textPrimary
                        }}
                      >
                        ▲ {emp.score}
                      </td>

                      <td style={{ color: theme.textSecondary }}>
                        {emp.lastActivity}
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          color: theme.textSecondary
                        }}
                      >
                        {emp.seen}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 2. EMPLOYEES TAB */}
        {activeTab === 'Employees' && (
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              padding: '24px',
              boxShadow: theme.shadow
            }}
          >
            <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>
              Monitored Personnel Directory (97 Monitored)
            </h2>
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
                    fontSize: '11px'
                  }}
                >
                  <th style={{ paddingBottom: '12px' }}>Employee</th>
                  <th style={{ paddingBottom: '12px' }}>Department</th>
                  <th style={{ paddingBottom: '12px' }}>Current Risk</th>
                  <th style={{ paddingBottom: '12px' }}>Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    style={{
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{ padding: '12px 0', fontWeight: '600' }}>
                      {emp.name} (ID {emp.id})
                    </td>
                    <td style={{ color: theme.textSecondary }}>
                      {emp.department}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor:
                            emp.riskLevel === 'High'
                              ? theme.highBg
                              : emp.riskLevel === 'Medium'
                              ? theme.medBg
                              : theme.lowBg,
                          color:
                            emp.riskLevel === 'High'
                              ? theme.highText
                              : emp.riskLevel === 'Medium'
                              ? theme.medText
                              : theme.lowText
                        }}
                      >
                        • {emp.riskLevel}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700' }}>{emp.score} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. RISK ANALYSIS TAB */}
        {activeTab === 'Risk Analysis' && (
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              padding: '24px',
              boxShadow: theme.shadow
            }}
          >
            <h2 style={{ fontSize: '18px', margin: '0 0 12px 0' }}>
              Behavioral Threat Analytics
            </h2>
            <p style={{ color: theme.textSecondary, marginBottom: '20px' }}>
              Breakdown of monitored risk vectors across departments over the
              last 30 days.
            </p>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div
                style={{
                  flex: 1,
                  backgroundColor: theme.surfaceVariant,
                  padding: '16px',
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: theme.textSecondary
                  }}
                >
                  DATA EXFILTRATION
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginTop: '4px'
                  }}
                >
                  42 Incidents
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: theme.surfaceVariant,
                  padding: '16px',
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: theme.textSecondary
                  }}
                >
                  LOGIN ANOMALIES
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginTop: '4px'
                  }}
                >
                  18 Incidents
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ALERTS TAB */}
        {activeTab === 'Alerts' && (
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              padding: '24px',
              boxShadow: theme.shadow
            }}
          >
            <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>
              Active System Security Alerts
            </h2>
            <p style={{ color: theme.textSecondary, marginBottom: '20px' }}>
              Active security alerts detected by the system.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: theme.surfaceVariant,
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: '600',
                        color: theme.textPrimary
                      }}
                    >
                      {alt.title} —{' '}
                      <span style={{ color: theme.highText }}>
                        {alt.severity}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: theme.textSecondary,
                        marginTop: '4px'
                      }}
                    >
                      Target: {alt.target} · {alt.time}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: theme.surface,
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    {alt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. SETTINGS TAB */}
        {activeTab === 'Settings' && (
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              padding: '28px',
              boxShadow: theme.shadow,
              maxWidth: '850px'
            }}
          >
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Settings</h2>
              <p
                style={{
                  marginTop: '6px',
                  color: theme.textSecondary
                }}
              >
                Configure security monitoring and dashboard preferences.
              </p>
            </div>

            {/* RISK THRESHOLD */}
            <div
              style={{
                padding: '20px',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                marginBottom: '18px'
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '10px'
                }}
              >
                High Risk Anomaly Threshold
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}
              >
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={riskThreshold}
                  onChange={(e) => setRiskThreshold(Number(e.target.value))}
                  style={{ flex: 1, accentColor: theme.primary }}
                />
                <span
                  style={{
                    minWidth: '45px',
                    textAlign: 'center',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    backgroundColor: theme.primaryContainer,
                    color: theme.primary,
                    fontWeight: '700'
                  }}
                >
                  {riskThreshold}
                </span>
              </div>

              <p
                style={{
                  fontSize: '12px',
                  color: theme.textSecondary,
                  marginBottom: 0,
                  marginTop: '8px'
                }}
              >
                Employees with a risk score above this value will be classified
                as High Risk.
              </p>
            </div>

            {/* NOTIFICATIONS */}
            <div
              style={{
                padding: '20px',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                marginBottom: '18px'
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}
              >
                Alert Notifications
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  style={{
                    width: '17px',
                    height: '17px',
                    accentColor: theme.primary
                  }}
                />
                <span style={{ color: theme.textSecondary }}>
                  Enable security alert notifications
                </span>
              </div>
            </div>

            {/* WEBHOOK */}
            <div
              style={{
                padding: '20px',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                marginBottom: '18px'
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '10px'
                }}
              >
                SIEM / Slack Webhook URL
              </label>

              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="Enter webhook URL"
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  boxSizing: 'border-box',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surfaceVariant,
                  color: theme.textPrimary,
                  outline: 'none'
                }}
              />

              <p
                style={{
                  fontSize: '12px',
                  color: theme.textSecondary,
                  marginBottom: 0,
                  marginTop: '8px'
                }}
              >
                Connect your security monitoring and alerting system.
              </p>
            </div>

            {/* APPEARANCE */}
            <div
              style={{
                padding: '20px',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                marginBottom: '22px'
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}
              >
                Appearance
              </label>

              <button
                onClick={toggleDarkMode}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surfaceVariant,
                  color: theme.textPrimary,
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {darkMode ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
              </button>
            </div>

            {/* SAVE BUTTON */}
            <button
              onClick={handleSaveSettings}
              style={{
                padding: '11px 22px',
                backgroundColor: theme.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Save Settings
            </button>
          </div>
        )}
      </main>

      {/* ================= THREAT DETAILS DRAWER ================= */}
      {selectedEmployee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '360px',
            height: '100vh',
            backgroundColor: theme.surface,
            borderLeft: `1px solid ${theme.border}`,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
            padding: '28px',
            boxSizing: 'border-box',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '22px'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '18px' }}>Threat Details</h2>
              <button
                onClick={() => setSelectedEmployee(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: theme.textSecondary
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '18px'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: selectedEmployee.avatarBg,
                  color: selectedEmployee.avatarColor,
                  fontWeight: '700',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {selectedEmployee.initial}
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    color: theme.textPrimary
                  }}
                >
                  {selectedEmployee.name}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: theme.textSecondary
                  }}
                >
                  {selectedEmployee.department} · ID {selectedEmployee.id}
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: theme.surfaceVariant,
                padding: '14px',
                borderRadius: '8px',
                marginBottom: '18px'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: theme.textSecondary,
                  textTransform: 'uppercase',
                  marginBottom: '4px'
                }}
              >
                Behavioral Incident
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: theme.textPrimary,
                  lineHeight: '1.4'
                }}
              >
                {selectedEmployee.details}
              </div>
            </div>

            <div
              style={{
                fontSize: '13px',
                color: theme.textSecondary,
                lineHeight: '1.6'
              }}
            >
              <div>
                <strong>Risk Score:</strong> {selectedEmployee.score} / 100
              </div>
              <div>
                <strong>Status:</strong> {selectedEmployee.riskLevel} Risk
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleLockAccount(selectedEmployee.id)}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Lock Account
            </button>

            <button
              onClick={() => handleDismissFlag(selectedEmployee.id)}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: theme.surfaceVariant,
                color: theme.textPrimary,
                border: `1px solid ${theme.border}`,
                borderRadius: '7px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
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
