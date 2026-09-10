import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useMatch } from 'react-router-dom';
import {
  Flame,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  ExternalLink
} from 'lucide-react';
import Login from './Login';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MetricCard from './components/dashboard/MetricCard';
import ThreatDrawer from './components/dashboard/ThreatDrawer';
import RiskBadge from './components/common/RiskBadge';
import EmptyState from './components/common/EmptyState';
import { useTheme } from './context/ThemeContext';

import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailsPage from './pages/EmployeeDetailsPage';
import RiskAnalysisPage from './pages/RiskAnalysisPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationDrawer from './components/notifications/NotificationDrawer';
import { initialEmployees } from './data/mockEmployees';
import { initialAlerts } from './data/mockAlerts';
import { initialNotifications } from './data/mockNotifications';
import { api } from './services/api';

// Navigation menu configuration
const NAV_ITEMS = [
  { label: 'Overview', path: '/dashboard', badge: null },
  { label: 'Employees', path: '/employees', badge: null },
  { label: 'Risk Analysis', path: '/risk-analysis', badge: null },
  { label: 'Alerts', path: '/alerts', badge: null },
  { label: 'Analytics', path: '/analytics', badge: null },
  { label: 'Notifications', path: null, badge: null },
  { label: 'Settings', path: '/settings', badge: null },
  { label: 'Profile', path: '/profile', badge: null }
];

// ================= MAIN DASHBOARD SHELL =================

function DashboardLayout() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const employeeDetailsMatch = useMatch('/employees/:id');

  // Determine active tab from URL path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/employees')) return 'Employees';
    if (path.startsWith('/risk-analysis')) return 'Risk Analysis';
    if (path.startsWith('/alerts')) return 'Alerts';
    if (path.startsWith('/analytics') || path.startsWith('/reports')) return 'Analytics';
    if (path.startsWith('/profile')) return 'Profile';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Overview';
  };

  const activeTab = getActiveTab();

  // Keyboard shortcut: Ctrl+K / Cmd+K focuses global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);

  // Backend connectivity & live workforce synchronization (Phase 9.3)
  useEffect(() => {
    let isMounted = true;

    const checkAndSyncWorkforce = async () => {
      const health = await api.checkHealth();
      if (!isMounted) return;
      setIsBackendConnected(health.isOnline);

      if (health.isOnline) {
        setIsLoadingEmployees(true);
        try {
          const res = await api.getEmployees({ page_size: 100 });
          if (isMounted && res.items && res.items.length > 0) {
            setEmployees(res.items);
            setEmployeesError(null);
          }
        } catch (err) {
          console.warn('FastAPI employees fetch failed, retaining baseline data:', err);
          if (isMounted) setEmployeesError(err.message || 'Failed to sync live workforce');
        } finally {
          if (isMounted) setIsLoadingEmployees(false);
        }
      }
    };

    checkAndSyncWorkforce();

    // Periodic check every 30 seconds
    const intervalId = setInterval(checkAndSyncWorkforce, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Drawer state
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Notifications state
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  const handleMarkNotificationRead = (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Containment actions (Optimistic UI + Live Backend Persistence)
  const handleLockAccount = (id) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              status: 'Locked',
              riskLevel: 'Low',
              score: 0,
              lastActivity: 'Account locked by analyst'
            }
          : emp
      )
    );
    setSelectedEmployee(null);

    if (isBackendConnected) {
      api.lockEmployee(id).catch((err) => console.error('Failed to lock account on backend', err));
    }
  };

  const handleResetScore = (id) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              status: 'Active',
              riskLevel: 'Low',
              score: 15,
              lastActivity: 'Risk score reset to baseline'
            }
          : emp
      )
    );

    if (isBackendConnected) {
      api.resetEmployeeScore(id).catch((err) => console.error('Failed to reset score on backend', err));
    }
  };

  const handleDismissFlag = (id) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              status: 'Active',
              riskLevel: 'Low',
              score: Math.min(emp.score, 20),
              lastActivity: 'Security flag cleared by analyst'
            }
          : emp
      )
    );
    setSelectedEmployee(null);

    if (isBackendConnected) {
      api.dismissEmployeeFlag(id).catch((err) => console.error('Failed to dismiss flag on backend', err));
    }
  };

  // Update Alert Status (Mock state)
  const handleUpdateAlertStatus = (alertId, newStatus) => {
    setAlerts((prev) =>
      prev.map((alt) => (alt.id === alertId ? { ...alt, status: newStatus } : alt))
    );
  };

  // Dynamic navigation items with active alert count and notification badges
  const unresolvedAlertsCount = alerts.filter((a) => a.status !== 'Resolved').length;
  const navItems = NAV_ITEMS.map((item) => {
    if (item.label === 'Alerts') {
      return { ...item, badge: unresolvedAlertsCount > 0 ? String(unresolvedAlertsCount) : null };
    }
    if (item.label === 'Notifications') {
      return {
        ...item,
        badge: unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : null,
        onClick: () => setIsNotificationDrawerOpen(true)
      };
    }
    return item;
  });

  // Dynamic workforce threat metrics
  const highRiskEmployees = employees.filter(
    (e) => e.riskLevel === 'High' || e.riskLevel === 'Critical'
  );
  const medRiskEmployees = employees.filter((e) => e.riskLevel === 'Medium');
  const lowRiskEmployees = employees.filter((e) => e.riskLevel === 'Low');

  const compositeRiskScore = Math.round(
    employees.reduce((acc, emp) => acc + (emp.score || 0), 0) / (employees.length || 1)
  );

  const riskTierLabel =
    compositeRiskScore >= 70 ? 'CRITICAL RISK' : compositeRiskScore >= 40 ? 'ELEVATED RISK' : 'LOW RISK';
  const riskTierColor =
    compositeRiskScore >= 70 ? '#ef4444' : compositeRiskScore >= 40 ? '#f97316' : '#10b981';
  const riskTierBg =
    compositeRiskScore >= 70
      ? 'rgba(239, 68, 68, 0.12)'
      : compositeRiskScore >= 40
      ? 'rgba(249, 115, 22, 0.12)'
      : 'rgba(16, 185, 129, 0.12)';

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
        navItems={navItems}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        backendConnected={isBackendConnected}
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
          unreadNotificationsCount={unreadNotificationsCount}
          onToggleNotifications={() => setIsNotificationDrawerOpen(!isNotificationDrawerOpen)}
        />

        {/* ================================================= */}
        {/* 1. SECURITY OVERVIEW VIEW                        */}
        {/* ================================================= */}
        {(activeTab === 'Overview' || activeTab === 'Dashboard') && (
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
                      strokeDasharray={`${compositeRiskScore}, 100`}
                      strokeLinecap="round"
                      stroke={riskTierColor}
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
                      {compositeRiskScore}
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
                        color: riskTierColor,
                        backgroundColor: riskTierBg,
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {riskTierLabel}
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
                    exfiltrations, and lateral privilege violations across {employees.length} monitored identities.
                  </p>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: riskTierColor
                    }}
                  >
                    <TrendingDown size={14} />
                    Live telemetry calculated across workforce baseline
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
                number={highRiskEmployees.length}
                title="High Risk Identities"
                change={`${highRiskEmployees.length} requiring triage`}
                color="#ef4444"
                icon={Flame}
              />
              <MetricCard
                number={medRiskEmployees.length}
                title="Medium Risk Identities"
                change={`${medRiskEmployees.length} under surveillance`}
                color="#f97316"
                icon={AlertTriangle}
              />
              <MetricCard
                number={lowRiskEmployees.length}
                title="Low Risk Identities"
                change={`${lowRiskEmployees.length} baseline verified`}
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
        {employeeDetailsMatch ? (
          <EmployeeDetailsPage
            id={employeeDetailsMatch.params.id}
            employees={employees}
            onLockAccount={handleLockAccount}
            onResetScore={handleResetScore}
            onDismissFlag={handleDismissFlag}
          />
        ) : (
          activeTab === 'Employees' && (
            <EmployeesPage
              employees={employees}
              isLoading={isLoadingEmployees}
              error={employeesError}
            />
          )
        )}

        {/* ================================================= */}
        {/* 3. RISK ANALYSIS VIEW                             */}
        {/* ================================================= */}
        {activeTab === 'Risk Analysis' && (
          <RiskAnalysisPage employees={employees} alerts={alerts} />
        )}

        {/* ================================================= */}
        {/* 4. SECURITY ALERTS VIEW                          */}
        {/* ================================================= */}
        {activeTab === 'Alerts' && (
          <AlertsPage
            alerts={alerts}
            onUpdateAlertStatus={handleUpdateAlertStatus}
            employees={employees}
          />
        )}

        {/* ================================================= */}
        {/* 5. ANALYTICS & REPORTS VIEW                      */}
        {/* ================================================= */}
        {activeTab === 'Analytics' && (
          <AnalyticsPage employees={employees} alerts={alerts} />
        )}

        {/* ================================================= */}
        {/* 6. SETTINGS VIEW                                 */}
        {/* ================================================= */}
        {activeTab === 'Settings' && <SettingsPage />}

        {/* ================================================= */}
        {/* 7. ANALYST PROFILE VIEW                          */}
        {/* ================================================= */}
        {activeTab === 'Profile' && <ProfilePage />}
      </main>

      {/* ================= THREAT DETAILS DRAWER ================= */}
      <ThreatDrawer
        selectedEmployee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onLockAccount={handleLockAccount}
        onDismissFlag={handleDismissFlag}
      />

      {/* ================= NOTIFICATION CENTER DRAWER ================= */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onClearAll={handleClearNotifications}
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
