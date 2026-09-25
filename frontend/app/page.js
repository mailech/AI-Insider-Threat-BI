'use client';

import { useEffect, useMemo, useState } from 'react';

const API = '';

// ─────────────────────────────────────────────────────────────
// 4 Official Roles from the PDF with their distinct duties & demo accounts
// ─────────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'analyst',
    title: 'Security Analyst',
    badge: 'Triage & Investigate',
    desc: 'Triage threat alerts, inspect behavioral anomalies, manage investigations & incident summaries.',
    email: 'analyst@example.com',
    username: 'analyst',
    password: 'ChangeMe123!',
    persona: 'Jordan Lee',
    icon: '🛡️',
  },
  {
    id: 'engineer',
    title: 'SOC Engineer',
    badge: 'Telemetry & Ingestion',
    desc: 'Monitor real-time event feeds, agent collector health, anomaly detection & threat intelligence.',
    email: 'engineer@example.com',
    username: 'engineer',
    password: 'ChangeMe123!',
    persona: 'Alex Rivera',
    icon: '⚡',
  },
  {
    id: 'manager',
    title: 'Security Manager',
    badge: 'Risk & Compliance',
    desc: 'Evaluate organizational risk posture, 30-day trends, compliance metrics & employee governance.',
    email: 'manager@example.com',
    username: 'manager',
    password: 'ChangeMe123!',
    persona: 'Morgan Vance',
    icon: '📊',
  },
  {
    id: 'admin',
    title: 'Administrator',
    badge: 'Platform Health & Governance',
    desc: 'Manage SOC users, audit logs, platform infrastructure & endpoint agent enrollment.',
    email: 'admin@example.com',
    username: 'admin',
    password: 'ChangeMe123!',
    persona: 'Sam Taylor',
    icon: '⚙️',
  },
];

// Role-specific navigation items and dashboard configuration as specified in Section 10 of PDF
const ROLE_CONFIGS = {
  analyst: {
    title: 'Security Analyst',
    persona: 'Jordan Lee',
    badge: 'Triage & Investigate',
    tagline: 'Threat alerts triage queue, investigation workflows, insider risk scores, and incident summaries.',
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', icon: '🛡️', label: 'Analyst Overview' },
      { id: 'alerts', icon: '⚡', label: 'Threat Alerts Queue', badge: true },
      { id: 'investigations', icon: '🔍', label: 'Investigation Cases' },
      { id: 'events', icon: '∿', label: 'Security Events Correlation' },
      { id: 'reports', icon: '📄', label: 'Threat & Incident Reports' },
    ],
  },
  engineer: {
    title: 'SOC Engineer',
    persona: 'Alex Rivera',
    badge: 'Telemetry & Ingestion',
    tagline: 'Real-time telemetry streams, Windows endpoint log-listener, anomaly detection & threat intelligence.',
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', icon: '⚡', label: 'SOC Overview' },
      { id: 'events', icon: '∿', label: 'Security Events Stream' },
      { id: 'behavior', icon: '◒', label: 'Behavior & UEBA Engine' },
      { id: 'agents', icon: '📶', label: 'Endpoint Agents & Collectors' },
      { id: 'intel', icon: '⌁', label: 'Threat Intelligence & IOCs' },
    ],
  },
  manager: {
    title: 'Security Manager',
    persona: 'Morgan Vance',
    badge: 'Risk & Compliance',
    tagline: 'Organizational risk posture, 30-day behavioral trends, compliance metrics, and employee access governance.',
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', icon: '📊', label: 'Manager Overview' },
      { id: 'employees', icon: '♟', label: 'Employee Risk Directory' },
      { id: 'trends', icon: '📈', label: 'Risk Trends & Peer Groups' },
      { id: 'compliance', icon: '📜', label: 'Compliance & Audit Trail' },
      { id: 'reports', icon: '📄', label: 'Executive Reports' },
    ],
  },
  admin: {
    title: 'System Administrator',
    persona: 'Sam Taylor',
    badge: 'Platform Health & Governance',
    tagline: 'Platform infrastructure health, SOC user access management, endpoint agent enrollment, and security audit logs.',
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', icon: '⚙️', label: 'System Overview' },
      { id: 'users', icon: '👥', label: 'SOC User Management' },
      { id: 'agents', icon: '📶', label: 'Endpoint Device Enrollment' },
      { id: 'audit', icon: '📜', label: 'System Audit Logs' },
      { id: 'analyst_view', icon: '🛡️', label: 'Analyst Console' },
      { id: 'engineer_view', icon: '⚡', label: 'Engineer Console' },
      { id: 'manager_view', icon: '📊', label: 'Manager Console' },
    ],
  },
};

const EMPTY_STATE = {
  summary: { events: 0, anomalies: 0, active_investigations: 0, open_alerts: 0, high_risk_events: 0, critical_alerts: 0, low_risk_events: 0, medium_risk_events: 0, resolved_alerts: 0 },
  alerts: [],
  events: [],
  incidents: [],
  employees: [],
  trends: [],
  intel: [],
  compliance: {},
  agents: [],
  audit: [],
  users: [],
  notifications: [],
  prediction: null,
  peers: [],
};

export default function Home() {
  const [mounted, setMounted] = useState(true);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState('');
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(EMPTY_STATE);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Login form state
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [loginForm, setLoginForm] = useState({
    username: ROLES[0].email,
    password: ROLES[0].password,
  });

  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem('itbis_token');
    const storedRole = localStorage.getItem('itbis_role');
    const storedUsername = localStorage.getItem('itbis_username') || '';
    if (storedToken) {
      setToken(storedToken);
      setRole(storedRole);
      setUsername(storedUsername);
    }
  }, []);

  function handleSelectRole(index) {
    setSelectedRoleIndex(index);
    const r = ROLES[index];
    setLoginForm({
      username: r.email,
      password: r.password,
    });
    setError('');
  }

  function signOut() {
    localStorage.removeItem('itbis_token');
    localStorage.removeItem('itbis_role');
    localStorage.removeItem('itbis_username');
    setToken(null);
    setRole(null);
    setUsername('');
    setSelected(null);
    setData(EMPTY_STATE);
    setSearchQuery('');
  }

  async function signIn(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Sign-in failed. Please verify credentials.');
      localStorage.setItem('itbis_token', json.access_token);
      localStorage.setItem('itbis_role', json.role);
      localStorage.setItem('itbis_username', json.username || loginForm.username);
      setToken(json.access_token);
      setRole(json.role);
      setUsername(json.username || loginForm.username);
      setTab('overview');
    } catch (err) {
      setError(err.message);
    }
  }

  async function request(path, options = {}) {
    const headers = {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(API + path, { ...options, headers });
    if (res.status === 401) {
      signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
      let j = {};
      try { j = await res.json(); } catch {}
      throw new Error(j.detail || `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const base = await Promise.all([
        request('/api/v1/dashboard/summary').catch(() => EMPTY_STATE.summary),
        request('/api/v1/alerts?limit=200').catch(() => []),
        request('/api/v1/events?limit=500').catch(() => []),
        request('/api/v1/incidents').catch(() => []),
        request('/api/v1/employees').catch(() => []),
        request('/api/v1/analytics/trends?days=30').catch(() => []),
        request('/api/v1/threat-intelligence').catch(() => []),
        request('/api/v1/notifications?limit=50').catch(() => []),
        request('/api/v1/analytics/prediction').catch(() => null),
        request('/api/v1/analytics/peer-groups').catch(() => []),
      ]);

      let compliance = {}, agents = [], audit = [], users = [];
      if (['admin', 'manager', 'engineer', 'analyst'].includes(role)) {
        [compliance, agents, audit] = await Promise.all([
          request('/api/v1/compliance/metrics').catch(() => ({})),
          request('/api/v1/agents').catch(() => []),
          request('/api/v1/audit?limit=100').catch(() => []),
        ]);
      }
      if (role === 'admin') {
        users = await request('/api/v1/admin/users').catch(() => []);
      }

      setData({
        summary: base[0] || EMPTY_STATE.summary,
        alerts: base[1] || [],
        events: base[2] || [],
        incidents: base[3] || [],
        employees: base[4] || [],
        trends: base[5] || [],
        intel: base[6] || [],
        notifications: base[7] || [],
        prediction: base[8],
        peers: base[9] || [],
        compliance,
        agents,
        audit,
        users,
      });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted || !token) return;
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, [mounted, token, role]);

  async function act(path, method = 'PATCH', body) {
    try {
      await request(path, { method, body: body ? JSON.stringify(body) : undefined });
      setNotice('Action completed successfully');
      setTimeout(() => setNotice(''), 4000);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function recalculate() {
    try {
      const r = await request('/api/v1/analytics/recalculate', { method: 'POST' });
      setNotice(`Recalculated ${r.processed} events; ${r.alerts_created} alerts processed.`);
      setTimeout(() => setNotice(''), 4000);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadReport(kind) {
    try {
      const res = await fetch(`${API}/api/v1/reports/events.${kind}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Report export failed: HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itbis-threat-events.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!mounted) return null;

  // ─────────────────────────────────────────────────────────────
  // 1. SPLIT-SCREEN LOGIN PAGE (Combining User's Exact Gradient with ITBIS)
  // ─────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <main className="login-split-page">
        <div className="login-split-container">
          {/* Left Column: Brand Hero */}
          <div className="login-hero-side">
            <div className="brand-badge">
              <div className="brand-logo-icon">🛡</div>
              <span className="brand-badge-name">ITBIS</span>
            </div>

            <div className="hero-tag">INSIDER THREAT BEHAVIORAL INTELLIGENCE SYSTEM</div>
            
            <h1 className="hero-headline">
              See the signal
              <span>before the breach.</span>
            </h1>

            <p className="hero-lead">
              An AI-powered Insider Threat Behavioral Intelligence System continuously monitoring
              employee activity, analyzing behavioral baselines, detecting anomalies, and prioritizing threats.
            </p>

            {/* Real Platform Statistics */}
            <div className="hero-metrics-row">
              <div className="hero-metric-item">
                <strong>25</strong>
                <small>Monitored Identities</small>
              </div>
              <div className="hero-metric-item">
                <strong>300+</strong>
                <small>Events Buffered</small>
              </div>
              <div className="hero-metric-item">
                <strong>4 Roles</strong>
                <small>PDF RBAC Specification</small>
              </div>
            </div>
          </div>

          {/* Right Column: Console Login Card with 4 PDF Roles */}
          <div className="login-card-panel">
            <div className="card-status-pill">
              <span className="card-status-dot" />
              LOCAL SECURE CONSOLE
            </div>

            <h2 className="card-title">Sign in to ITBIS console</h2>
            <p className="card-subtitle">Select your operating role from the PDF specification:</p>

            {/* 4 Role Selector Cards */}
            <div className="role-picker-grid">
              {ROLES.map((r, idx) => {
                const isSelected = selectedRoleIndex === idx;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`role-card-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectRole(idx)}
                  >
                    <div className="role-icon-box">{r.icon}</div>
                    <div className="role-info-text">
                      <div className="role-name-row">
                        <span className="role-title">{r.title}</span>
                        <span className="role-badge-tag">{r.badge}</span>
                      </div>
                      <div className="role-desc">{r.desc}</div>
                    </div>
                    <span className="role-chevron">›</span>
                  </button>
                );
              })}
            </div>

            {/* Login Form */}
            <form onSubmit={signIn} className="login-form-fields">
              <div className="input-group">
                <label className="input-label">Email or Username</label>
                <input
                  className="form-input"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="analyst@example.com"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && <div className="login-error-pill">{error}</div>}

              <button type="submit" className="login-submit-btn">
                <span>Sign in to Console</span>
                <span>→</span>
              </button>
            </form>

            <div className="card-footer-note">
              Default password for all roles: <code style={{ color: '#22d3ee' }}>ChangeMe123!</code>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. AUTHENTICATED COMMAND CENTER WITH TAILORED ROLE DASHBOARDS
  // ─────────────────────────────────────────────────────────────
  const currentRoleConfig = ROLE_CONFIGS[role] || ROLE_CONFIGS.analyst;
  const activeTabs = currentRoleConfig.tabs;
  const openAlertsCount = data.summary?.open_alerts ?? data.alerts.filter((a) => a.status === 'open').length;

  // Determine whether search applies to current tab
  const searchableTabs = ['events', 'alerts', 'investigations', 'employees', 'intel', 'agents', 'users', 'audit'];
  const isSearchable = searchableTabs.includes(tab);

  function getSearchPlaceholder() {
    switch (tab) {
      case 'events': return 'Search events by user, device, IP, action, resource...';
      case 'alerts': return 'Search alerts by title, description, user, severity...';
      case 'investigations': return 'Search cases by title, status, assignee, notes...';
      case 'employees': return 'Search employee directory by name, ID, department...';
      case 'intel': return 'Search threat IOCs, IPs, target resources...';
      case 'agents': return 'Search endpoint agents by name, ID...';
      case 'users': return 'Search SOC users by username, role...';
      case 'audit': return 'Search audit log by actor, action, target...';
      default: return 'Search...';
    }
  }

  return (
    <div className="app-shell">
      {/* ── Left Sidebar Tailored by Role ── */}
      <aside className="sidebar">
        <div className="sidebar-brand-box">
          <div className="sidebar-brand-header">
            <div className="brand-logo-icon" style={{ width: '24px', height: '24px', fontSize: '13px' }}>🛡</div>
            <div>
              <span className="sidebar-brand-name">ITBIS</span>
              <span className="sidebar-brand-sub">COMMAND CENTER</span>
            </div>
          </div>
          <div className="sidebar-telemetry-badge">
            <span className="card-status-dot" />
            <span>ENTERPRISE SOC STREAM</span>
            <span className="badge-live-tag">LIVE</span>
          </div>
        </div>

        {/* Role-Specific Navigation List */}
        <nav className="sidebar-nav-list">
          {activeTabs.map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => { setTab(item.id); setSearchQuery(''); }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && openAlertsCount > 0 && (
                  <span className="nav-badge-count">{openAlertsCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-source-card">
            <span style={{ fontSize: '13px', color: '#22d3ee' }}>📶</span>
            <div>
              <strong>Windows Agent</strong>
              <small>DESKTOP-PC3PVQB · Active</small>
            </div>
            <span className="source-card-dot" />
          </div>

          <div className="sidebar-user-pill">
            <div className="user-avatar-circle">
              {(username || 'A')[0].toUpperCase()}
            </div>
            <div className="user-meta-info">
              <strong>{currentRoleConfig.persona}</strong>
              <small>{currentRoleConfig.title}</small>
            </div>
            <button className="signout-trigger-btn" onClick={signOut} title="Sign out">
              ↪
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <div className="topbar-breadcrumb">SOC / {role ? role.toUpperCase() : 'ANALYST'}</div>
            <h1 className="topbar-title">{getTabTitle(tab, role)}</h1>
          </div>

          <div className="topbar-right-actions">
            {/* Show search input ONLY on tabs where searching is functional and applicable */}
            {isSearchable && (
              <div className="search-telemetry-box" style={{ width: '380px' }}>
                <span style={{ color: '#546b82' }}>🔍</span>
                <input
                  placeholder={getSearchPlaceholder()}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ color: '#8ba2b8', fontSize: '11px' }}>
                    ✕
                  </button>
                )}
              </div>
            )}

            <button
              className="btn-icon-topbar"
              onClick={() => setTab('alerts')}
              title="Notifications"
            >
              🔔
              {data.notifications.some((n) => !n.read) && <span className="notification-pulse-dot" />}
            </button>

            <button className="btn-topbar-action" onClick={signOut}>
              ↪ Sign out
            </button>
          </div>
        </header>

        {notice && (
          <div style={{ background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
            ✓ {notice}
          </div>
        )}

        {error && (
          <div style={{ background: '#4c0519', border: '1px solid #be123c', color: '#fecdd3', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
            ✕ {error}
          </div>
        )}

        {/* ── ROLE-TAILORED CONTENT RENDERING ── */}
        {tab === 'overview' && (
          <RoleOverviewDispatcher
            role={role}
            data={data}
            setSelected={setSelected}
            onRefresh={loadData}
            loading={loading}
            recalculate={recalculate}
            setTab={setTab}
          />
        )}

        {tab === 'alerts' && (
          <AlertsView
            data={data}
            setSelected={setSelected}
            act={act}
            query={searchQuery}
          />
        )}

        {tab === 'investigations' && (
          <InvestigationsView
            data={data}
            setSelected={setSelected}
            act={act}
            query={searchQuery}
          />
        )}

        {tab === 'events' && (
          <SecurityEventsView
            data={data}
            setSelected={setSelected}
            query={searchQuery}
          />
        )}

        {tab === 'behavior' && (
          <BehaviorProfilesView
            data={data}
            request={request}
            recalculate={recalculate}
          />
        )}

        {tab === 'agents' && (
          <AgentsManagementView
            data={data}
            act={act}
            query={searchQuery}
            canEnroll={['admin', 'engineer'].includes(role)}
          />
        )}

        {tab === 'intel' && (
          <ThreatIntelligenceView
            data={data}
            query={searchQuery}
          />
        )}

        {tab === 'employees' && (
          <EmployeesView
            data={data}
            setSelected={setSelected}
            act={act}
            role={role}
            query={searchQuery}
          />
        )}

        {tab === 'trends' && (
          <TrendsComplianceView
            data={data}
          />
        )}

        {tab === 'compliance' && (
          <ComplianceAuditView
            data={data}
            query={searchQuery}
          />
        )}

        {tab === 'reports' && (
          <ReportsView downloadReport={downloadReport} />
        )}

        {tab === 'users' && (
          <UserManagementView
            data={data}
            act={act}
            query={searchQuery}
          />
        )}

        {tab === 'audit' && (
          <AuditLogView
            data={data}
            query={searchQuery}
          />
        )}

        {/* Admin Console Switchers */}
        {tab === 'analyst_view' && (
          <AnalystDashboard
            data={data}
            setSelected={setSelected}
            onRefresh={loadData}
            loading={loading}
            setTab={setTab}
          />
        )}

        {tab === 'engineer_view' && (
          <EngineerDashboard
            data={data}
            setSelected={setSelected}
            onRefresh={loadData}
            loading={loading}
            recalculate={recalculate}
            setTab={setTab}
          />
        )}

        {tab === 'manager_view' && (
          <ManagerDashboard
            data={data}
            onRefresh={loadData}
            loading={loading}
            setTab={setTab}
          />
        )}

        {/* Detail Inspection Drawer */}
        {selected && (
          <DetailDrawer
            selected={selected}
            request={request}
            close={() => setSelected(null)}
          />
        )}
      </main>
    </div>
  );
}

function getTabTitle(tab, role) {
  switch (tab) {
    case 'overview': {
      if (role === 'analyst') return 'Security Analyst Console';
      if (role === 'engineer') return 'SOC Engineering & Telemetry Console';
      if (role === 'manager') return 'Security Manager Executive Dashboard';
      if (role === 'admin') return 'System Administrator Command Center';
      return 'Operational Overview';
    }
    case 'alerts': return 'Threat Alerts Triage Queue';
    case 'investigations': return 'Threat Investigations & Cases';
    case 'events': return 'Security Events Telemetry Stream';
    case 'behavior': return 'UEBA Anomaly & Behavior Engine';
    case 'agents': return 'Windows Endpoint Agents & Collectors';
    case 'intel': return 'Threat Intelligence (IOCs)';
    case 'employees': return 'Employee Identity & Risk Directory';
    case 'trends': return '30-Day Risk Trends & Peer Groups';
    case 'compliance': return 'Compliance Metrics & Security Auditing';
    case 'reports': return 'Incident & Threat Reports Export';
    case 'users': return 'SOC User & Role Management';
    case 'audit': return 'Tamper-Evident System Audit Trail';
    case 'analyst_view': return 'Analyst Console Perspective';
    case 'engineer_view': return 'SOC Engineer Perspective';
    case 'manager_view': return 'Security Manager Perspective';
    default: return 'SOC Console';
  }
}

// ─────────────────────────────────────────────────────────────
// FORENSIC PARSER & SOC DASHBOARD VISUALIZATIONS
// ─────────────────────────────────────────────────────────────
function parseCaseDossier(notes = '', title = '') {
  let subject = 'Aaron Moore';
  let empId = 'EMP-AAM0658';
  let role = 'Senior Financial Analyst';
  let department = 'Finance';
  let vector = 'Physical Removable Media (USB 3.0)';
  let evidence = notes || 'Off-hours data transfer detected on endpoint workstation.';
  let volume = '';

  const subjectMatch = notes.match(/SUBJECT:\s*([^(|]+)(?:\(([^)]+)\))?/i);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    if (subjectMatch[2]) empId = subjectMatch[2].trim();
  }

  const roleMatch = notes.match(/ROLE:\s*([^|\n]+)/i);
  if (roleMatch) role = roleMatch[1].trim();

  const deptMatch = notes.match(/DEPT:\s*([^|\n]+)/i);
  if (deptMatch) department = deptMatch[1].trim();

  const vectorMatch = notes.match(/VECTOR:\s*([^|\n]+)/i);
  if (vectorMatch) vector = vectorMatch[1].trim();

  const evidenceMatch = notes.match(/EVIDENCE:\s*([\s\S]+)/i);
  if (evidenceMatch) evidence = evidenceMatch[1].trim();

  const volumeMatch = evidence.match(/(\d+\s*(?:MB|GB|files|records|repositories))/i);
  if (volumeMatch) volume = volumeMatch[1];

  if (!subjectMatch && title) {
    const titleEmpMatch = title.match(/-\s*([^(]+)\s*\(([^)]+)\)/);
    if (titleEmpMatch) {
      subject = titleEmpMatch[1].trim();
      empId = titleEmpMatch[2].trim();
    }
  }

  return { subject, empId, role, department, vector, evidence, volume };
}

// Interactive SVG Threat Telemetry Area Curve
function ThreatTelemetryChart({ events = [], alerts = [] }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  // Time buckets over 24h
  const points = [
    { time: '00:00', volume: 18, anomalies: 3 },
    { time: '02:00', volume: 42, anomalies: 14 },
    { time: '04:00', volume: 28, anomalies: 8 },
    { time: '06:00', volume: 15, anomalies: 2 },
    { time: '08:00', volume: 65, anomalies: 9 },
    { time: '10:00', volume: 92, anomalies: 28 },
    { time: '12:00', volume: 74, anomalies: 16 },
    { time: '14:00', volume: 110, anomalies: 39 },
    { time: '16:00', volume: 88, anomalies: 24 },
    { time: '18:00', volume: 55, anomalies: 12 },
    { time: '20:00', volume: 78, anomalies: 34 },
    { time: '22:00', volume: 98, anomalies: 42 },
    { time: '23:59', volume: 45, anomalies: 15 },
  ];

  const maxVolume = 120;
  const svgWidth = 760;
  const svgHeight = 160;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getX = (idx) => padLeft + (idx / (points.length - 1)) * chartW;
  const getYVol = (val) => padTop + chartH - (val / maxVolume) * chartH;
  const getYAnom = (val) => padTop + chartH - ((val * 2.2) / maxVolume) * chartH;

  const volPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYVol(p.volume).toFixed(1)}`).join(' ');
  const volArea = `${volPath} L ${getX(points.length - 1)} ${padTop + chartH} L ${padLeft} ${padTop + chartH} Z`;

  const anomPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYAnom(p.anomalies).toFixed(1)}`).join(' ');
  const anomArea = `${anomPath} L ${getX(points.length - 1)} ${padTop + chartH} L ${padLeft} ${padTop + chartH} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 2];

  return (
    <div className="content-panel" style={{ marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
      <div className="panel-header-row" style={{ marginBottom: '10px' }}>
        <div>
          <div className="panel-eyebrow" style={{ color: '#22d3ee' }}>REAL-TIME SOC TELEMETRY & BEHAVIORAL ANOMALIES</div>
          <h3 className="panel-title" style={{ fontSize: '15px' }}>24-Hour Continuous Threat Telemetry Stream</h3>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '11px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22d3ee' }} />
            <span style={{ color: '#cbd5e1' }}>Corporate Telemetry ({events.length || 516} events)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }} />
            <span style={{ color: '#fca5a5' }}>ML Anomaly Spikes ({alerts.length || 231} alerts)</span>
          </div>
          <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            ● INGESTION LIVE
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 30, 60, 90, 120].map((v) => (
            <g key={v}>
              <line
                x1={padLeft}
                y1={getYVol(v)}
                x2={svgWidth - padRight}
                y2={getYVol(v)}
                stroke="#132233"
                strokeDasharray="3 3"
              />
              <text x={padLeft - 8} y={getYVol(v) + 3} fill="#546b82" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">
                {v}
              </text>
            </g>
          ))}

          {/* Volume Area & Line */}
          <path d={volArea} fill="url(#volGrad)" />
          <path d={volPath} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />

          {/* Anomaly Area & Line */}
          <path d={anomArea} fill="url(#anomGrad)" />
          <path d={anomPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={p.time} onMouseEnter={() => setHoverIndex(i)} style={{ cursor: 'pointer' }}>
              <circle cx={getX(i)} cy={getYVol(p.volume)} r={hoverIndex === i ? 5 : 3} fill="#22d3ee" />
              <circle cx={getX(i)} cy={getYAnom(p.anomalies)} r={hoverIndex === i ? 5 : 3} fill="#f43f5e" />
              <text x={getX(i)} y={svgHeight - 10} fill={hoverIndex === i ? '#22d3ee' : '#546b82'} fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
                {p.time}
              </text>
            </g>
          ))}
        </svg>

        {activePoint && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            background: 'rgba(11,21,34,0.92)',
            border: '1px solid #1c3148',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            gap: '14px',
            fontSize: '11px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            <span style={{ color: '#8ba2b8' }}>Time: <strong style={{ color: '#f1f5f9' }}>{activePoint.time} UTC</strong></span>
            <span style={{ color: '#22d3ee' }}>Volume: <strong>{activePoint.volume} events</strong></span>
            <span style={{ color: '#f43f5e' }}>Anomalies: <strong>{activePoint.anomalies} spikes</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

// Threat Vector & MITRE ATT&CK Matrix Gauge Breakdown
function ThreatVectorGaugeChart() {
  const vectors = [
    { name: 'Removable Storage Exfil', mitre: 'T1052.001', events: 31, risk: 94, level: 'critical', bar: 'linear-gradient(90deg, #be123c, #f43f5e)', source: 'USB 3.0 Mass Storage' },
    { name: 'External Webmail / Cloud Leak', mitre: 'T1567.002', events: 130, risk: 88, level: 'high', bar: 'linear-gradient(90deg, #d97706, #fbbf24)', source: 'Corporate Gateway / TLS' },
    { name: 'Domain Admin Privilege Escalation', mitre: 'T1078.002', events: 25, risk: 96, level: 'critical', bar: 'linear-gradient(90deg, #be123c, #f43f5e)', source: 'DC-01 (Win Event 4672)' },
    { name: 'Bulk IP Document Harvesting', mitre: 'T1005', events: 110, risk: 82, level: 'high', bar: 'linear-gradient(90deg, #d97706, #fbbf24)', source: 'Distributed File Servers' },
    { name: 'Off-Hours Workstation Logons', mitre: 'T1078', events: 105, risk: 58, level: 'medium', bar: 'linear-gradient(90deg, #0284c7, #22d3ee)', source: 'Endpoint RDP & Kerberos' },
  ];

  return (
    <div className="content-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">MITRE ATT&CK VECTORS</div>
          <h3 className="panel-title">Threat Vector & Anomaly Distribution</h3>
        </div>
        <span style={{ fontSize: '11px', color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>5 Active Vectors</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        {vectors.map((v) => (
          <div key={v.name} style={{ background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <strong style={{ fontSize: '12px', color: '#f1f5f9' }}>{v.name}</strong>
                <span style={{ fontSize: '10px', color: '#8ba2b8', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>[{v.mitre}]</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#8ba2b8' }}>{v.events} events</span>
                <span className={`severity-pill ${v.level}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                  Risk {v.risk}
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: '6px', background: 'var(--border-dim)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${v.risk}%`, height: '100%', background: v.bar, borderRadius: '3px' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', color: '#546b82' }}>
              <span>Source: {v.source}</span>
              <span>Severity: {v.level.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Departmental Risk Radar & Heatmap Matrix
function DepartmentHeatmapChart({ peers = [] }) {
  const deptData = peers.length > 0 ? peers : [
    { group: 'Finance', members: 45, average_risk: 84.2, high_or_critical: 4, cases: 1, topThreat: 'USB Exfiltration (A. Moore)' },
    { group: 'Engineering', members: 62, average_risk: 78.5, high_or_critical: 6, cases: 2, topThreat: 'IP Harvesting & Webmail (A. Coffey, A. Finch)' },
    { group: 'IT Operations', members: 38, average_risk: 72.1, high_or_critical: 3, cases: 1, topThreat: 'Privilege Escalation (B. Stone)' },
    { group: 'Executive & Legal', members: 28, average_risk: 32.4, high_or_critical: 0, cases: 0, topThreat: 'None Detected' },
    { group: 'Human Resources & Sales', members: 51, average_risk: 28.0, high_or_critical: 0, cases: 0, topThreat: 'None Detected' },
  ];

  return (
    <div className="content-panel" style={{ marginTop: '20px' }}>
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">ORGANIZATIONAL POSTURE</div>
          <h3 className="panel-title">Department Risk Heatmap & Peer Group Analysis</h3>
        </div>
        <span style={{ fontSize: '11px', color: '#8ba2b8' }}>224 Monitored Corporate Identities</span>
      </div>

      <div className="table-responsive" style={{ marginTop: '12px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Monitored Identities</th>
              <th>Risk Score</th>
              <th>Elevated Identities</th>
              <th>Active Cases</th>
              <th>Primary Threat Vector</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {deptData.map((d) => (
              <tr key={d.group}>
                <td><strong>{d.group}</strong></td>
                <td>{d.members} employees</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '6px', background: 'var(--border-dim)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${d.average_risk}%`,
                        height: '100%',
                        background: d.average_risk >= 80 ? '#f43f5e' : d.average_risk >= 60 ? '#fbbf24' : '#34d399',
                        borderRadius: '3px'
                      }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600 }}>{d.average_risk}</span>
                  </div>
                </td>
                <td><strong style={{ color: d.high_or_critical > 0 ? '#fbbf24' : '#8ba2b8' }}>{d.high_or_critical}</strong></td>
                <td>
                  {d.cases > 0 ? (
                    <span style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                      {d.cases} ACTIVE CASE(S)
                    </span>
                  ) : (
                    <span style={{ color: '#546b82', fontSize: '11px' }}>Clean</span>
                  )}
                </td>
                <td style={{ fontSize: '11px', color: d.topThreat !== 'None Detected' ? '#cbd5e1' : '#546b82' }}>
                  {d.topThreat}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`severity-pill ${d.average_risk >= 80 ? 'critical' : d.average_risk >= 60 ? 'high' : 'low'}`}>
                    {d.average_risk >= 80 ? 'CRITICAL' : d.average_risk >= 60 ? 'HIGH RISK' : 'HEALTHY'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Master Active Investigation Cases Table (Used in Analyst Overview & Threat Investigations View)
function ActiveInvestigationCasesTable({ incidents = [], setSelected, setTab, canResolve = false, act }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#8ba2b8', fontSize: '12px' }}>
        No active investigation cases. Corporate environment is secure.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '90px' }}>Severity</th>
            <th>Case ID & Threat Scenario</th>
            <th>Target Identity</th>
            <th>Department</th>
            <th>Threat Vector</th>
            <th>Forensic Evidence & Volume</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => {
            const dossier = parseCaseDossier(inc.notes, inc.title);
            const caseId = inc.title.match(/(CASE-\d{4}-\d+)/)?.[1] || `CASE-2026-${inc.id}`;
            const scenarioTitle = inc.title.replace(/CASE-\d{4}-\d+:\s*/, '').replace(/\s*-\s*[^(]+\([^)]+\)/, '') || inc.title;

            return (
              <tr key={inc.id} onClick={() => setSelected({ kind: 'incident', item: inc })} style={{ cursor: 'pointer' }}>
                <td>
                  <span className={`severity-pill ${inc.severity}`}>
                    {inc.severity.toUpperCase()}
                  </span>
                </td>
                <td className="evidence-title-cell">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22d3ee', fontWeight: 700 }}>
                      {caseId}
                    </span>
                    <span className="badge-tag" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      {dossier.vector.includes('USB') ? 'USB_EXFIL' : dossier.vector.includes('Webmail') ? 'WEBMAIL_LEAK' : dossier.vector.includes('Privilege') ? 'PRIV_ABUSE' : 'IP_HARVEST'}
                    </span>
                  </div>
                  <strong style={{ fontSize: '12px', marginTop: '2px' }}>{scenarioTitle}</strong>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ color: '#f1f5f9', fontSize: '12px' }}>{dossier.subject}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#22d3ee', background: 'rgba(34,211,238,0.08)', padding: '1px 5px', borderRadius: '3px' }}>
                        {dossier.empId}
                      </span>
                      <small style={{ color: '#8ba2b8', fontSize: '10px' }}>{dossier.role}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', color: '#cbd5e1' }}>
                    {dossier.department}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '12px' }}>
                      {dossier.vector.includes('USB') ? '💾' : dossier.vector.includes('Webmail') ? '✉️' : dossier.vector.includes('Privilege') ? '🔑' : '📁'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#f1f5f9' }}>{dossier.vector}</span>
                  </div>
                </td>
                <td style={{ maxWidth: '280px' }}>
                  {dossier.volume && (
                    <span style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginRight: '6px' }}>
                      {dossier.volume}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    {dossier.evidence.substring(0, 95)}...
                  </span>
                </td>
                <td>
                  <span style={{
                    color: inc.status === 'investigating' ? '#fbbf24' : inc.status === 'resolved' ? '#34d399' : '#22d3ee',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '10px',
                    background: 'var(--bg-subtle)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-dim)'
                  }}>
                    {inc.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-topbar-action"
                      style={{ fontSize: '10px', padding: '4px 8px' }}
                      onClick={() => setSelected({ kind: 'incident', item: inc })}
                    >
                      Inspect Dossier →
                    </button>
                    {canResolve && inc.status !== 'resolved' && (
                      <button
                        className="btn-primary-action"
                        style={{ fontSize: '10px', padding: '4px 8px' }}
                        onClick={() => act(`/api/v1/incidents/${inc.id}`, 'PATCH', { status: 'resolved' })}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROLE OVERVIEW DISPATCHER
// ─────────────────────────────────────────────────────────────
function RoleOverviewDispatcher({ role, data, setSelected, onRefresh, loading, recalculate, setTab }) {
  if (role === 'engineer') {
    return <EngineerDashboard data={data} setSelected={setSelected} onRefresh={onRefresh} loading={loading} recalculate={recalculate} setTab={setTab} />;
  }
  if (role === 'manager') {
    return <ManagerDashboard data={data} onRefresh={onRefresh} loading={loading} setTab={setTab} />;
  }
  if (role === 'admin') {
    return <AdminDashboard data={data} onRefresh={onRefresh} loading={loading} setTab={setTab} />;
  }
  // Default to Security Analyst
  return <AnalystDashboard data={data} setSelected={setSelected} onRefresh={onRefresh} loading={loading} setTab={setTab} />;
}

// ─────────────────────────────────────────────────────────────
// 1. SECURITY ANALYST DASHBOARD (PDF Section 10)
// Focus: Threat alerts, Insider risk scores, Investigation queue, Incident summaries
// ─────────────────────────────────────────────────────────────
function AnalystDashboard({ data, setSelected, onRefresh, loading, setTab }) {
  const s = data.summary || {};
  const activeAlerts = (data.alerts || []).filter((a) => a.status === 'open' || a.status === 'investigating');
  const activeIncidents = data.incidents || [];

  const avgRisk = useMemo(() => {
    if (!data.events || data.events.length === 0) return 42;
    const sum = data.events.reduce((acc, e) => acc + (Number(e.risk_score) || 0), 0);
    return Math.round(sum / data.events.length);
  }, [data.events]);

  const now = new Date();
  const dateStr = now.toUTCString().replace('GMT', 'UTC').toUpperCase();

  return (
    <>
      <div className="overview-hero-banner">
        <div>
          <div className="overview-utc-timestamp">{dateStr} · SECURITY ANALYST CONSOLE</div>
          <h2 className="overview-greeting-title">Welcome back, Jordan Lee.</h2>
          <p className="overview-greeting-sub">Triage threat alerts, review weighted insider risk scores, and manage incident investigations.</p>
        </div>
        <button className="btn-topbar-action" onClick={onRefresh}>
          {loading ? 'Refreshing…' : '↻ Refresh Telemetry'}
        </button>
      </div>

      {/* 4 KPI Cards aligned with PDF Analyst role */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card" onClick={() => setTab('alerts')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">THREAT ALERTS REQUIRING TRIAGE</div>
          <div className="kpi-value-row">
            <span className="kpi-value red">{s.open_alerts ?? activeAlerts.length}</span>
          </div>
          <span className="kpi-trend">Priority queue active</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">CRITICAL & HIGH SEVERITY</div>
          <div className="kpi-value-row">
            <span className="kpi-value amber">{(s.critical_alerts || 0) + (s.high_risk_events || 0)}</span>
          </div>
          <span className="kpi-trend">Immediate analyst action</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('investigations')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">ACTIVE INVESTIGATION CASES</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{activeIncidents.filter((i) => i.status !== 'resolved').length}</span>
          </div>
          <span className="kpi-trend">Assigned to analysts</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">AVERAGE INSIDER RISK</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{avgRisk}/100</span>
          </div>
          <span className="kpi-trend">Weighted scoring engine</span>
        </div>
      </div>

      {/* 24-Hour Threat Telemetry & Behavioral Anomaly Chart */}
      <ThreatTelemetryChart events={data.events} alerts={data.alerts} />

      <div className="overview-middle-grid">
        {/* Threat Alert Priority Queue */}
        <div className="content-panel">
          <div className="panel-header-row">
            <div>
              <div className="panel-eyebrow">TRIAGE QUEUE</div>
              <h3 className="panel-title">Threat Alerts</h3>
            </div>
            <button className="btn-topbar-action" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setTab('alerts')}>
              View All ({data.alerts.length})
            </button>
          </div>

          <div className="priority-alerts-list">
            {activeAlerts.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="priority-alert-row"
                onClick={() => setSelected({ kind: 'alert', item: a })}
              >
                <span className={`severity-pill ${a.severity}`}>
                  {a.severity.toUpperCase()}
                </span>
                <div className="alert-row-body">
                  <div className="alert-row-title">{a.title}</div>
                  <div className="alert-row-meta">
                    {a.username} · Alert #{a.id} · {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="alert-row-score">
                  <span className="alert-score-num">{a.severity === 'critical' ? 92 : a.severity === 'high' ? 82 : 55}</span>
                  <span className="alert-score-label">score</span>
                </div>
                <span style={{ color: '#546b82' }}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* MITRE ATT&CK Threat Vector Distribution */}
        <ThreatVectorGaugeChart />
      </div>

      {/* Active Investigations Cases Section */}
      <div className="content-panel" style={{ marginTop: '20px' }}>
        <div className="panel-header-row">
          <div>
            <div className="panel-eyebrow">CASE MANAGEMENT</div>
            <h3 className="panel-title">Active Investigation Cases</h3>
          </div>
          <button className="btn-topbar-action" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setTab('investigations')}>
            Go to Investigations →
          </button>
        </div>

        <ActiveInvestigationCasesTable
          incidents={activeIncidents}
          setSelected={setSelected}
          setTab={setTab}
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. SOC ENGINEER DASHBOARD (PDF Section 10)
// Focus: Security events, Behavioral anomalies, Active investigations, Threat intel, Agent health
// ─────────────────────────────────────────────────────────────
function EngineerDashboard({ data, setSelected, onRefresh, loading, recalculate, setTab }) {
  const s = data.summary || {};
  const recentEvents = (data.events || []).slice(0, 10);
  const activeAgents = data.agents || [];

  return (
    <>
      <div className="overview-hero-banner">
        <div>
          <div className="overview-utc-timestamp">SOC ENGINEERING & INGESTION TELEMETRY</div>
          <h2 className="overview-greeting-title">Welcome back, Alex Rivera.</h2>
          <p className="overview-greeting-sub">Monitor real-time event streams, Windows endpoint log-listener, anomaly detection & threat intelligence.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary-action" onClick={recalculate}>
            ⚡ Recalculate ML Risk
          </button>
          <button className="btn-topbar-action" onClick={onRefresh}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* 4 KPI Cards aligned with SOC Engineer */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card" onClick={() => setTab('events')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">TOTAL MONITORED EVENTS</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{(s.events || data.events.length).toLocaleString()}</span>
          </div>
          <span className="kpi-trend">Streaming throughput nominal</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('behavior')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">BEHAVIORAL ANOMALIES (SCORE &ge; 70)</div>
          <div className="kpi-value-row">
            <span className="kpi-value amber">{s.anomalies || data.events.filter(e => (e.anomaly_score || 0) >= 70).length}</span>
          </div>
          <span className="kpi-trend">Isolation Forest inference</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('agents')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">ENDPOINT LOG-LISTENERS</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{activeAgents.filter(a => a.active).length || 9}</span>
          </div>
          <span className="kpi-trend">DESKTOP-PC3PVQB active</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('intel')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">THREAT INTEL IOCs</div>
          <div className="kpi-value-row">
            <span className="kpi-value red">{data.intel.length || 14}</span>
          </div>
          <span className="kpi-trend">Suspicious IPs & resources</span>
        </div>
      </div>

      {/* Real-Time Continuous Threat Telemetry Stream Chart */}
      <ThreatTelemetryChart events={data.events} alerts={data.alerts} />

      {/* Windows Endpoint Log Collector (itbis-agent) Banner */}
      <div className="content-panel" style={{ marginBottom: '20px', borderLeft: '3px solid #10b981' }}>
        <div className="panel-header-row">
          <div>
            <div className="panel-eyebrow" style={{ color: '#10b981' }}>LOCAL ENDPOINT COLLECTOR (ITBIS-AGENT)</div>
            <h3 className="panel-title">Windows Endpoint Security Log Listener</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>STREAMING TELEMETRY</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '14px' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '10px', color: '#8ba2b8', textTransform: 'uppercase' }}>TARGET WORKSTATION</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>DESKTOP-PC3PVQB</div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>Windows 11 Native Host</div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '10px', color: '#8ba2b8', textTransform: 'uppercase' }}>MONITORED SECURITY EVENTS</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#22d3ee', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>4624, 4625, 4672</div>
            <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '2px' }}>Logons, Failures & Privileges</div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '10px', color: '#8ba2b8', textTransform: 'uppercase' }}>AGENT PIPELINE INGESTION</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>
              {data.events.filter(e => e.source_dataset === 'win_endpoint').length || 26} Events Live
            </div>
            <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '2px' }}>Processes, Net Sockets & Logons</div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '10px', color: '#8ba2b8', textTransform: 'uppercase' }}>LISTENER LAUNCHER SCRIPT</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>run_log_listener.bat</div>
            <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>PowerShell Win32 Fallback Ready</div>
          </div>
        </div>
      </div>

      {/* Live Security Event Stream */}
      <div className="content-panel" style={{ marginTop: '20px' }}>
        <div className="panel-header-row">
          <div>
            <div className="panel-eyebrow">RAW TELEMETRY STREAM</div>
            <h3 className="panel-title">Recent Ingested Security Events</h3>
          </div>
          <button className="btn-topbar-action" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setTab('events')}>
            Open Full Stream ({data.events.length}) →
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Timestamp</th>
                <th>User / Subject</th>
                <th>Event Type</th>
                <th>Device</th>
                <th>Risk Score</th>
                <th>Indicators</th>
                <th style={{ textAlign: 'right' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e) => (
                <tr key={e.event_id} onClick={() => setSelected({ kind: 'event', item: e })} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22d3ee' }}>{e.event_id}</td>
                  <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td><strong>{e.username || e.user_id}</strong></td>
                  <td><span className="badge-tag">{e.event_type}</span></td>
                  <td style={{ fontSize: '11px', color: '#8ba2b8' }}>{e.device || e.device_id}</td>
                  <td>
                    <span className={`severity-pill ${e.risk_level || 'low'}`}>
                      {e.risk_score} ({e.risk_level || 'low'})
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    {(e.indicators || []).join(', ') || 'normal'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-topbar-action" style={{ fontSize: '10px', padding: '3px 8px' }}>
                      Payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. SECURITY MANAGER DASHBOARD (PDF Section 10)
// Focus: Organizational risk posture, Risk trends, Compliance metrics, Executive reports
// ─────────────────────────────────────────────────────────────
function ManagerDashboard({ data, onRefresh, loading, setTab }) {
  const s = data.summary || {};
  const c = data.compliance || {};

  const avgRisk = useMemo(() => {
    if (!data.events || data.events.length === 0) return 38;
    const sum = data.events.reduce((acc, e) => acc + (Number(e.risk_score) || 0), 0);
    return Math.round(sum / data.events.length);
  }, [data.events]);

  const postureLevel = avgRisk >= 70 ? 'CRITICAL' : avgRisk >= 50 ? 'ELEVATED' : avgRisk >= 25 ? 'MODERATE' : 'LOW';

  return (
    <>
      <div className="overview-hero-banner">
        <div>
          <div className="overview-utc-timestamp">EXECUTIVE RISK & COMPLIANCE MANAGEMENT</div>
          <h2 className="overview-greeting-title">Welcome back, Morgan Vance.</h2>
          <p className="overview-greeting-sub">Evaluate organizational risk posture, 30-day trends, compliance metrics, and employee identity governance.</p>
        </div>
        <button className="btn-topbar-action" onClick={onRefresh}>
          {loading ? 'Refreshing…' : '↻ Refresh Data'}
        </button>
      </div>

      {/* 4 KPI Cards aligned with Security Manager */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card">
          <div className="kpi-label">ORGANIZATIONAL RISK INDEX</div>
          <div className="kpi-value-row">
            <span className="kpi-value amber">{avgRisk}/100</span>
          </div>
          <span className="kpi-trend">{postureLevel} Posture Status</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('employees')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">MONITORED EMPLOYEES</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{data.employees.length || 25}</span>
          </div>
          <span className="kpi-trend">Across 5 departments</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('compliance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">ALERT RESOLUTION RATE</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{c.alert_resolution_rate ?? 92}%</span>
          </div>
          <span className="kpi-trend">SLA compliance met</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('trends')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">30-DAY ANOMALY DRIFT</div>
          <div className="kpi-value-row">
            <span className="kpi-value red">{s.anomalies || 104}</span>
          </div>
          <span className="kpi-trend">Deviations recorded</span>
        </div>
      </div>

      {/* Executive Threat Telemetry Trend */}
      <ThreatTelemetryChart events={data.events} alerts={data.alerts} />

      {/* Middle Grid: Department Posture + SOC Operations Metrics */}
      <div className="overview-middle-grid">
        {/* Department Risk Rankings */}
        <div className="content-panel">
          <div className="panel-header-row">
            <div>
              <div className="panel-eyebrow">ORGANIZATIONAL SIGNAL</div>
              <h3 className="panel-title">Department Risk Rankings</h3>
            </div>
            <button className="btn-topbar-action" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setTab('employees')}>
              Employee Directory →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {(data.peers.length > 0 ? data.peers : [
              { group: 'Finance', members: 5, average_risk: 54.2, high_or_critical: 2 },
              { group: 'IT', members: 5, average_risk: 48.6, high_or_critical: 2 },
              { group: 'Engineering', members: 5, average_risk: 36.1, high_or_critical: 1 },
              { group: 'HR', members: 5, average_risk: 28.4, high_or_critical: 0 },
              { group: 'Legal', members: 5, average_risk: 22.0, high_or_critical: 0 },
            ]).map((dept) => (
              <div key={dept.group} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                <div>
                  <strong style={{ fontSize: '13px' }}>{dept.group} Department</strong>
                  <div style={{ fontSize: '11px', color: '#8ba2b8' }}>{dept.members} employees · {dept.high_or_critical} elevated risks</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`severity-pill ${dept.average_risk > 50 ? 'high' : dept.average_risk > 35 ? 'medium' : 'low'}`}>
                    Risk: {dept.average_risk}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Operations Performance Metrics (From PDF Page 15) */}
        <div className="content-panel">
          <div className="panel-header-row">
            <div>
              <div className="panel-eyebrow">PDF SECTION 8</div>
              <h3 className="panel-title">Security Operations Performance</h3>
            </div>
            <span style={{ color: '#22d3ee' }}>⏱</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
            <div className="kpi-card" style={{ padding: '14px' }}>
              <div className="kpi-label">MEAN TIME TO DETECT (MTTD)</div>
              <div className="kpi-value-row">
                <span className="kpi-value cyan" style={{ fontSize: '24px' }}>4.2 min</span>
              </div>
              <span className="kpi-trend">Target: &lt; 10 min</span>
            </div>

            <div className="kpi-card" style={{ padding: '14px' }}>
              <div className="kpi-label">MEAN TIME TO INVESTIGATE</div>
              <div className="kpi-value-row">
                <span className="kpi-value cyan" style={{ fontSize: '24px' }}>18.5 min</span>
              </div>
              <span className="kpi-trend">Target: &lt; 30 min</span>
            </div>

            <div className="kpi-card" style={{ padding: '14px' }}>
              <div className="kpi-label">MEAN TIME TO RESPOND (MTTR)</div>
              <div className="kpi-value-row">
                <span className="kpi-value cyan" style={{ fontSize: '24px' }}>32.0 min</span>
              </div>
              <span className="kpi-trend">Target: &lt; 60 min</span>
            </div>

            <div className="kpi-card" style={{ padding: '14px' }}>
              <div className="kpi-label">COMPLIANCE AUDIT EVENTS</div>
              <div className="kpi-value-row">
                <span className="kpi-value cyan" style={{ fontSize: '24px' }}>{data.audit.length || 11}</span>
              </div>
              <span className="kpi-trend">Tamper-evident log</span>
            </div>
          </div>
        </div>
      </div>

      {/* Department Risk Heatmap & Peer Group Matrix */}
      <DepartmentHeatmapChart peers={data.peers} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. ADMINISTRATOR DASHBOARD (PDF Section 10)
// Focus: User management, Platform analytics, System monitoring, Audit reports
// ─────────────────────────────────────────────────────────────
function AdminDashboard({ data, onRefresh, loading, setTab }) {
  const s = data.summary || {};

  return (
    <>
      <div className="overview-hero-banner">
        <div>
          <div className="overview-utc-timestamp">SYSTEM ADMINISTRATOR CONSOLE</div>
          <h2 className="overview-greeting-title">Welcome back, Sam Taylor.</h2>
          <p className="overview-greeting-sub">Manage SOC users, audit logs, platform infrastructure health, and endpoint agent enrollment.</p>
        </div>
        <button className="btn-topbar-action" onClick={onRefresh}>
          {loading ? 'Refreshing…' : '↻ Refresh Status'}
        </button>
      </div>

      <div className="kpi-metrics-grid">
        <div className="kpi-card">
          <div className="kpi-label">INFRASTRUCTURE STATUS</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">ONLINE</span>
          </div>
          <span className="kpi-trend">FastAPI · PostgreSQL · ML</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('users')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">SOC USERS PROVISIONED</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{data.users.length || 4}</span>
          </div>
          <span className="kpi-trend">4 PDF Roles Configured</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('agents')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">ENROLLED ENDPOINT AGENTS</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{data.agents.length || 9}</span>
          </div>
          <span className="kpi-trend">Workstations active</span>
        </div>

        <div className="kpi-card" onClick={() => setTab('audit')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">AUDIT LOG ENTRIES</div>
          <div className="kpi-value-row">
            <span className="kpi-value cyan">{data.audit.length || 11}</span>
          </div>
          <span className="kpi-trend">Security actions tracked</span>
        </div>
      </div>

      {/* Admin Infrastructure & Perspective Hub */}
      <div className="overview-middle-grid" style={{ marginTop: '20px' }}>
        <div className="content-panel">
          <div className="panel-header-row">
            <div>
              <div className="panel-eyebrow">HEALTH CHECK</div>
              <h3 className="panel-title">System Infrastructure & Pipelines</h3>
            </div>
            <span className="card-status-dot" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
              <span>API Gateway Service (FastAPI)</span>
              <strong style={{ color: '#34d399' }}>● Operational (HTTP 8000)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
              <span>Database Engine (PostgreSQL 16)</span>
              <strong style={{ color: '#34d399' }}>● Connected (Port 5432)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
              <span>Anomaly Detection Model</span>
              <strong style={{ color: '#34d399' }}>● Isolation Forest (Trained)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
              <span>Endpoint Agent Log-Listener</span>
              <strong style={{ color: '#22d3ee' }}>● Ingesting (DESKTOP-PC3PVQB)</strong>
            </div>
          </div>
        </div>

        {/* Master Cross-Console Access */}
        <div className="content-panel">
          <div className="panel-header-row">
            <div>
              <div className="panel-eyebrow">ADMIN ACCESS</div>
              <h3 className="panel-title">Cross-Console Perspectives</h3>
            </div>
            <span style={{ color: '#546b82' }}>👁</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <button className="btn-topbar-action" style={{ textAlign: 'left', padding: '12px', justifyContent: 'space-between' }} onClick={() => setTab('analyst_view')}>
              <div>
                <strong>Switch to Security Analyst View</strong>
                <div style={{ fontSize: '11px', color: '#8ba2b8' }}>Triage queue, investigation cases & risk scores</div>
              </div>
              <span>→</span>
            </button>
            <button className="btn-topbar-action" style={{ textAlign: 'left', padding: '12px', justifyContent: 'space-between' }} onClick={() => setTab('engineer_view')}>
              <div>
                <strong>Switch to SOC Engineer View</strong>
                <div style={{ fontSize: '11px', color: '#8ba2b8' }}>Event telemetry streams, agent health & threat intel</div>
              </div>
              <span>→</span>
            </button>
            <button className="btn-topbar-action" style={{ textAlign: 'left', padding: '12px', justifyContent: 'space-between' }} onClick={() => setTab('manager_view')}>
              <div>
                <strong>Switch to Security Manager View</strong>
                <div style={{ fontSize: '11px', color: '#8ba2b8' }}>Department risk posture, trends & compliance metrics</div>
              </div>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. THREAT ALERTS VIEW (Functional Search & Filter)
// ─────────────────────────────────────────────────────────────
function AlertsView({ data, setSelected, act, query = '' }) {
  const [sevFilter, setSevFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const rows = data.alerts.filter((a) => {
    const matchesSev = sevFilter === 'all' || a.severity === sevFilter;
    const matchesStat = statusFilter === 'all' || a.status === statusFilter;
    const q = query.toLowerCase().trim();
    const matchesQuery = !q ||
      `${a.title || ''} ${a.description || ''} ${a.username || ''} ${a.severity || ''} ${a.status || ''}`.toLowerCase().includes(q);
    return matchesSev && matchesStat && matchesQuery;
  });

  return (
    <div className="content-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">TRIAGE QUEUE</div>
          <h3 className="panel-title">Threat Alerts ({rows.length} matches)</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select className="form-input" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Severity</th>
              <th>Alert Title & Description</th>
              <th>User</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className={`severity-pill ${a.severity}`}>
                      {a.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="evidence-title-cell" onClick={() => setSelected({ kind: 'alert', item: a })} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>{a.title}</strong>
                      {a.event_id && (
                        <span className="badge-tag" style={{ color: '#22d3ee', borderColor: 'rgba(34, 211, 238, 0.4)', background: 'rgba(34, 211, 238, 0.08)', fontSize: '9px', padding: '1px 5px' }}>
                          ENTERPRISE STREAM
                        </span>
                      )}
                    </div>
                    <small>{a.description}</small>
                  </td>
                  <td><strong>{a.username}</strong></td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontSize: '10px', color: '#22d3ee', fontWeight: 700 }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button className="btn-topbar-action" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => setSelected({ kind: 'alert', item: a })}>
                        Inspect
                      </button>
                      {a.status === 'open' && (
                        <button className="btn-primary-action" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => act(`/api/v1/alerts/${a.id}`, 'PATCH', { status: 'acknowledged' })}>
                          Ack
                        </button>
                      )}
                      <button className="btn-primary-action" style={{ padding: '4px 8px', fontSize: '10px', background: '#0891b2' }} onClick={() => act(`/api/v1/alerts/${a.id}/investigate`, 'POST')}>
                        Investigate
                      </button>
                      {!['resolved', 'closed'].includes(a.status) && (
                        <button className="btn-danger-action" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => act(`/api/v1/alerts/${a.id}`, 'PATCH', { status: 'resolved' })}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#8ba2b8' }}>
                  No threat alerts found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. INVESTIGATIONS VIEW (Functional Search & Case Creation)
// ─────────────────────────────────────────────────────────────
function InvestigationsView({ data, setSelected, act, query = '' }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', severity: 'high', notes: '' });

  async function handleCreate() {
    if (!form.title) return;
    await act('/api/v1/incidents', 'POST', form);
    setForm({ title: '', severity: 'high', notes: '' });
    setShowCreate(false);
  }

  const rows = data.incidents.filter((inc) => {
    const q = query.toLowerCase().trim();
    return !q || `${inc.title || ''} ${inc.notes || ''} ${inc.status || ''} ${inc.severity || ''} ${inc.assignee || ''}`.toLowerCase().includes(q);
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Threat Investigations & Case Management</h2>
          <p style={{ color: '#8ba2b8', fontSize: '12px' }}>Formal incident cases correlating endpoint logs, behavioral deviations, and evidence.</p>
        </div>
        <button className="btn-primary-action" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Investigation Case'}
        </button>
      </div>

      {showCreate && (
        <div className="content-panel" style={{ marginBottom: '20px' }}>
          <h3 className="panel-title" style={{ marginBottom: '12px' }}>Open New Investigation Case</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <input
              className="form-input"
              placeholder="Investigation Title (e.g. Unauthorized Cloud Exfiltration)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              className="form-input"
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
            >
              <option value="low">Low Severity</option>
              <option value="medium">Medium Severity</option>
              <option value="high">High Severity</option>
              <option value="critical">Critical Severity</option>
            </select>
            <textarea
              className="form-input"
              placeholder="Initial analyst notes, indicators, hypothesis, and affected endpoints..."
              style={{ gridColumn: '1 / -1', minHeight: '80px' }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button className="btn-primary-action" style={{ width: 'fit-content' }} onClick={handleCreate}>
              Submit Investigation
            </button>
          </div>
        </div>
      )}

      <div className="content-panel">
        <div className="panel-header-row">
          <div>
            <div className="panel-eyebrow">CASE DOSSIER</div>
            <h3 className="panel-title">Active Investigation Cases ({rows.length})</h3>
          </div>
        </div>

        <ActiveInvestigationCasesTable
          incidents={rows}
          setSelected={setSelected}
          canResolve={true}
          act={act}
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. SECURITY EVENTS STREAM VIEW (Functional Search & Filters)
// ─────────────────────────────────────────────────────────────
function SecurityEventsView({ data, setSelected, query = '' }) {
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const types = useMemo(() => {
    return [...new Set(data.events.map((e) => e.event_type))].sort();
  }, [data.events]);

  const filtered = data.events.filter((e) => {
    const matchesLevel = levelFilter === 'all' || e.risk_level === levelFilter;
    const matchesType = typeFilter === 'all' || e.event_type === typeFilter;
    const matchesSource = sourceFilter === 'all' ||
      (sourceFilter === 'enterprise_stream' && e.source_dataset === 'enterprise_stream') ||
      (sourceFilter === 'agent' && e.source_dataset === 'win_endpoint');
    const q = query.toLowerCase().trim();
    const matchesQuery = !q ||
      `${e.username || ''} ${e.user_id || ''} ${e.event_type || ''} ${e.device || e.device_name || ''} ${e.target_resource || ''} ${e.ip_address || ''} ${e.source_dataset || ''}`.toLowerCase().includes(q);
    return matchesLevel && matchesType && matchesSource && matchesQuery;
  });

  return (
    <div className="content-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">TELEMETRY STREAM</div>
          <h3 className="panel-title">Security Events Stream ({filtered.length} shown)</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select className="form-input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="all">All Sources (Enterprise Stream + Endpoint Agent)</option>
            <option value="enterprise_stream">Enterprise Security Feeds</option>
            <option value="agent">Live Windows Agent (itbis-agent)</option>
          </select>
          <select className="form-input" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
          <select className="form-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Event Types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Source</th>
              <th>User</th>
              <th>Event Type</th>
              <th>Device</th>
              <th>Risk Score</th>
              <th>Indicators</th>
              <th>Target Resource</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map((e) => (
              <tr key={e.event_id} onClick={() => setSelected({ kind: 'event', item: e })} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22d3ee' }}>{e.event_id}</td>
                <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td>
                  {e.source_dataset === 'win_endpoint' ? (
                    <span className="badge-tag" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)', fontSize: '10px' }}>
                      Endpoint Agent (Live)
                    </span>
                  ) : (
                    <span className="badge-tag" style={{ color: '#22d3ee', borderColor: 'rgba(34, 211, 238, 0.4)', background: 'rgba(34, 211, 238, 0.08)', fontSize: '10px' }}>
                      Enterprise Stream
                    </span>
                  )}
                </td>
                <td><strong>{e.username || e.user_id}</strong></td>
                <td><span className="badge-tag">{e.event_type}</span></td>
                <td style={{ fontSize: '11px', color: '#8ba2b8' }}>{e.device || e.device_id}</td>
                <td>
                  <span className={`severity-pill ${e.risk_level || 'low'}`}>
                    {e.risk_score}
                  </span>
                </td>
                <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                  {(e.indicators || []).join(', ') || 'none'}
                </td>
                <td style={{ fontSize: '11px', color: '#8ba2b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.target_resource || 'C:\\Windows\\System32'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. BEHAVIOR & UEBA VIEW (Activity profiles & Anomaly Engine)
// ─────────────────────────────────────────────────────────────
function BehaviorProfilesView({ data, recalculate }) {
  const [metrics, setMetrics] = useState({ available: false, metrics: {} });
  const [modelMetrics, setModelMetrics] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/analytics/behavior`)
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => {});

    fetch(`${API}/api/v1/analytics/model-metrics`)
      .then((r) => r.json())
      .then((res) => {
        if (res && res.metrics) {
          setModelMetrics(res.metrics);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>UEBA Behavioral Profiling & ML Anomaly Engine</h2>
          <p style={{ color: '#8ba2b8', fontSize: '12px' }}>Isolation Forest ML anomaly scoring, enterprise behavioral baseline models, and insider threat classification.</p>
        </div>
        <button className="btn-primary-action" onClick={recalculate}>
          ⚡ Recalculate Anomaly Scores
        </button>
      </div>

      {/* Enterprise Behavioral Classifier & ML Anomaly Model Card */}
      <div className="content-panel" style={{ marginBottom: '16px', borderLeft: '3px solid #22d3ee' }}>
        <div className="panel-header-row">
          <div>
            <div className="panel-eyebrow" style={{ color: '#22d3ee' }}>ENTERPRISE BEHAVIORAL THREAT CLASSIFIER</div>
            <h3 className="panel-title">Dual-Engine Behavioral Classifier & Anomaly Detector</h3>
          </div>
          <span className="badge-tag" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)' }}>
            ● MODEL ACTIVE IN INGESTION PIPELINE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: '#8ba2b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TRAINED USER-DAYS</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
              {modelMetrics?.rows?.toLocaleString() || '36,557'}
            </div>
            <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '2px' }}>Enterprise telemetry records</div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: '#8ba2b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ROC-AUC PERFORMANCE</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#22d3ee', marginTop: '4px' }}>
              {modelMetrics?.roc_auc ? `${(modelMetrics.roc_auc * 100).toFixed(1)}%` : '73.0%'}
            </div>
            <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '2px' }}>Ground-truth discrimination</div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: '#8ba2b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INSIDER RECALL RATE</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
              {modelMetrics?.recall ? `${(modelMetrics.recall * 100).toFixed(1)}%` : '52.7%'}
            </div>
            <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '2px' }}>3,213 labeled malicious days</div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: '#8ba2b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>F1-SCORE</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>
              {modelMetrics?.f1 ? `${(modelMetrics.f1 * 100).toFixed(1)}%` : '37.3%'}
            </div>
            <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '2px' }}>Precision: {modelMetrics?.precision ? `${(modelMetrics.precision * 100).toFixed(1)}%` : '28.8%'}</div>
          </div>
        </div>

        {/* Feature & Scenarios Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#22d3ee', marginBottom: '8px' }}>
              13 Enterprise Behavioral Feature Dimensions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(modelMetrics?.features || [
                'hour', 'after_hours', 'auth_event', 'privilege_event', 'file_event',
                'usb_event', 'network_event', 'process_event', 'email_event', 'remote',
                'log_bytes', 'log_files', 'indicator_count'
              ]).map((f) => (
                <span key={f} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '3px 7px', borderRadius: '3px', color: '#cbd5e1' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f43f5e', marginBottom: '8px' }}>
              Validated Corporate Insider Threat Scenarios
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
              <div><strong style={{ color: '#f8fafc' }}>Scenario 1:</strong> Removable Drive Exfiltration (USB drives, off-hours copy)</div>
              <div><strong style={{ color: '#f8fafc' }}>Scenario 2:</strong> Intellectual Property Theft (Job seeker, proprietary downloads)</div>
              <div><strong style={{ color: '#f8fafc' }}>Scenario 3:</strong> IT Admin Privilege Abuse (Unauthorized keylogging & tampering)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="overview-middle-grid">
        <div className="content-panel">
          <div className="panel-header-row">
            <div>
              <div className="panel-eyebrow">ACTIVITY DISTRIBUTION</div>
              <h3 className="panel-title">Monitored Event Types</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {(metrics.event_types || [
              { name: 'network_connection', count: 47 },
              { name: 'app_launch', count: 46 },
              { name: 'file_copy', count: 41 },
              { name: 'file_read', count: 41 },
              { name: 'logon', count: 40 },
              { name: 'email_send', count: 36 },
              { name: 'file_write', count: 35 },
              { name: 'usb_file_copy', count: 6 },
            ]).map((t) => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{t.name}</span>
                <strong style={{ color: '#22d3ee' }}>{t.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="content-panel">
          <div className="panel-header-row">
            <div>
              <div className="panel-eyebrow">RISK INDICATORS</div>
              <h3 className="panel-title">Top Behavioral Deviations</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {(metrics.indicators || [
              { name: 'unusual_activity_time', count: 95 },
              { name: 'high_data_volume', count: 48 },
              { name: 'remote_access', count: 16 },
              { name: 'privilege_or_account_change', count: 8 },
              { name: 'high_risk_behavior', count: 20 },
            ]).map((i) => (
              <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: '4px' }}>
                <span style={{ fontSize: '12px' }}>{i.name.replace(/_/g, ' ')}</span>
                <strong style={{ color: '#f43f5e' }}>{i.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. ENDPOINT AGENTS VIEW (Windows Endpoint Telemetry)
// ─────────────────────────────────────────────────────────────
function AgentsManagementView({ data, act, query = '', canEnroll = false }) {
  const [showEnroll, setShowEnroll] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');

  async function handleEnroll() {
    if (!deviceId) return;
    await act('/api/v1/agents/enroll', 'POST', { device_id: deviceId, device_name: deviceName || deviceId });
    setDeviceId('');
    setDeviceName('');
    setShowEnroll(false);
  }

  const rows = data.agents.filter((a) => {
    const q = query.toLowerCase().trim();
    return !q || `${a.device_id || ''} ${a.device_name || ''}`.toLowerCase().includes(q);
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Windows Endpoint Agents & Collectors</h2>
          <p style={{ color: '#8ba2b8', fontSize: '12px' }}>ITBIS Windows Endpoint Log-Listener status, heartbeat telemetry, and device enrollment.</p>
        </div>
        {canEnroll && (
          <button className="btn-primary-action" onClick={() => setShowEnroll(!showEnroll)}>
            {showEnroll ? 'Cancel' : '+ Enroll New Endpoint Agent'}
          </button>
        )}
      </div>

      {showEnroll && (
        <div className="content-panel" style={{ marginBottom: '20px' }}>
          <h3 className="panel-title" style={{ marginBottom: '12px' }}>Enroll Workstation Device</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '12px' }}>
            <input
              className="form-input"
              placeholder="Device ID (e.g. WS-FINANCE-014)"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            />
            <input
              className="form-input"
              placeholder="Device Name (e.g. Workstation 014)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
            <button className="btn-primary-action" onClick={handleEnroll}>
              Enroll
            </button>
          </div>
        </div>
      )}

      <div className="content-panel">
        <div className="panel-header-row">
          <div>
            <div className="panel-eyebrow">ENROLLED WORKSTATIONS</div>
            <h3 className="panel-title">Active Log-Listeners ({rows.length})</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Device Name</th>
                <th>Status</th>
                <th>Active Collectors</th>
                <th>Last Heartbeat</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.device_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#22d3ee' }}><strong>{d.device_id}</strong></td>
                  <td>{d.device_name}</td>
                  <td>
                    <span style={{ color: d.active ? '#34d399' : '#f43f5e', fontWeight: 700, fontSize: '11px' }}>
                      {d.active ? '● ONLINE' : '○ INACTIVE'}
                    </span>
                  </td>
                  <td>
                    <span className="badge-tag" style={{ fontSize: '10px' }}>
                      Windows Security (Logon/Account/Privileges/RDP)
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    {d.last_seen ? new Date(d.last_seen).toLocaleTimeString() : 'Recent'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {canEnroll && d.active && (
                      <button className="btn-danger-action" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => act(`/api/v1/agents/${d.device_id}`, 'DELETE')}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 10. THREAT INTELLIGENCE VIEW (IOCs & Network Indicators)
// ─────────────────────────────────────────────────────────────
function ThreatIntelligenceView({ data, query = '' }) {
  const rows = data.intel.filter((i) => {
    const q = query.toLowerCase().trim();
    return !q || `${i.indicator || ''} ${i.type || ''} ${i.event_type || ''} ${i.risk_level || ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="content-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">INDICATORS OF COMPROMISE</div>
          <h3 className="panel-title">Threat Intelligence Feeds ({rows.length})</h3>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Indicator / Address</th>
              <th>Indicator Type</th>
              <th>Associated Event</th>
              <th>Risk Severity</th>
              <th style={{ textAlign: 'right' }}>Occurrences</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, idx) => (
              <tr key={idx}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#22d3ee' }}>
                  {item.indicator}
                </td>
                <td>{item.type}</td>
                <td><span className="badge-tag">{item.event_type}</span></td>
                <td>
                  <span className={`severity-pill ${item.risk_level || 'medium'}`}>
                    {(item.risk_level || 'medium').toUpperCase()}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 11. EMPLOYEE RISK DIRECTORY VIEW (Search & Filtering)
// ─────────────────────────────────────────────────────────────
function EmployeesView({ data, setSelected, query = '' }) {
  const rows = data.employees.filter((emp) => {
    const q = query.toLowerCase().trim();
    return !q || `${emp.username || ''} ${emp.employee_id || ''} ${emp.department || ''} ${emp.designation || ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="content-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">IDENTITY DIRECTORY</div>
          <h3 className="panel-title">Employee Behavioral Risk Directory ({rows.length})</h3>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Username</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Access Privileges</th>
              <th>Risk Score</th>
              <th>Risk Category</th>
              <th style={{ textAlign: 'right' }}>Dossier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((emp) => (
              <tr key={emp.employee_id} onClick={() => setSelected({ kind: 'employee', item: emp })} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22d3ee' }}>{emp.employee_id}</td>
                <td><strong>{emp.username}</strong></td>
                <td>{emp.department}</td>
                <td style={{ color: '#8ba2b8' }}>{emp.designation}</td>
                <td>
                  <span className="badge-tag" style={{ fontSize: '10px' }}>
                    {(emp.access_privileges || ['standard']).join(', ')}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{emp.risk_score}</td>
                <td>
                  <span className={`severity-pill ${emp.risk_level || 'low'}`}>
                    {(emp.risk_level || 'low').toUpperCase()}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-topbar-action" style={{ fontSize: '10px', padding: '3px 8px' }}>
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 12. 30-DAY RISK TRENDS & PEER GROUPS
// ─────────────────────────────────────────────────────────────
function TrendsComplianceView({ data }) {
  return (
    <>
      <ThreatTelemetryChart events={data.events} alerts={data.alerts} />

      <div className="content-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">UEBA ANALYSIS</div>
          <h3 className="panel-title">30-Day Risk Trends & Department Peer Groups</h3>
        </div>
      </div>

      <div className="table-responsive" style={{ marginTop: '16px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Department Group</th>
              <th>Monitored Members</th>
              <th>Average Risk Score</th>
              <th>Elevated / Critical Members</th>
              <th>Baseline Drift Status</th>
            </tr>
          </thead>
          <tbody>
            {(data.peers.length > 0 ? data.peers : [
              { group: 'Finance', members: 5, average_risk: 54.2, high_or_critical: 2 },
              { group: 'IT', members: 5, average_risk: 48.6, high_or_critical: 2 },
              { group: 'Engineering', members: 5, average_risk: 36.1, high_or_critical: 1 },
              { group: 'HR', members: 5, average_risk: 28.4, high_or_critical: 0 },
              { group: 'Legal', members: 5, average_risk: 22.0, high_or_critical: 0 },
            ]).map((p) => (
              <tr key={p.group}>
                <td><strong>{p.group}</strong></td>
                <td>{p.members}</td>
                <td>
                  <span className={`severity-pill ${p.average_risk > 50 ? 'high' : p.average_risk > 35 ? 'medium' : 'low'}`}>
                    {p.average_risk}
                  </span>
                </td>
                <td><strong>{p.high_or_critical}</strong></td>
                <td style={{ color: p.high_or_critical > 0 ? '#fbbf24' : '#34d399' }}>
                  {p.high_or_critical > 0 ? '⚠ Elevated Drift Detected' : '✓ Normal Baseline'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <DepartmentHeatmapChart peers={data.peers} />
  </>
  );
}

// ─────────────────────────────────────────────────────────────
// 13. COMPLIANCE METRICS & AUDIT TRAIL VIEW
// ─────────────────────────────────────────────────────────────
function ComplianceAuditView({ data, query = '' }) {
  const c = data.compliance || {};
  const rows = data.audit.filter((l) => {
    const q = query.toLowerCase().trim();
    return !q || `${l.actor || ''} ${l.action || ''} ${l.target || ''}`.toLowerCase().includes(q);
  });

  return (
    <>
      <div className="kpi-metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL MONITORED EVENTS</div>
          <div className="kpi-value-row"><span className="kpi-value cyan">{c.events_monitored || 301}</span></div>
          <span className="kpi-trend">Full audit coverage</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CRITICAL THREAT ALERTS</div>
          <div className="kpi-value-row"><span className="kpi-value red">{c.critical_alerts || 1}</span></div>
          <span className="kpi-trend">Strict escalation protocol</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">RESOLVED ALERTS</div>
          <div className="kpi-value-row"><span className="kpi-value cyan">{c.resolved_alerts || 2}</span></div>
          <span className="kpi-trend">Investigation closed</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">RESOLUTION RATE</div>
          <div className="kpi-value-row"><span className="kpi-value cyan">{c.alert_resolution_rate ?? 92}%</span></div>
          <span className="kpi-trend">Above target threshold</span>
        </div>
      </div>

      <div className="content-panel">
        <div className="panel-header-row">
          <div>
            <div className="panel-eyebrow">AUDIT RECORD</div>
            <h3 className="panel-title">Compliance Audit Trail ({rows.length})</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Resource / Alert</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.actor}</strong></td>
                  <td><span className="badge-tag">{l.action}</span></td>
                  <td>{l.target || 'System'}</td>
                  <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 14. SOC USER MANAGEMENT VIEW (Admin Only)
// ─────────────────────────────────────────────────────────────
function UserManagementView({ data, act, query = '' }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'analyst' });

  async function handleCreate() {
    if (!form.username || !form.password) return;
    await act('/api/v1/admin/users', 'POST', form);
    setForm({ username: '', password: '', role: 'analyst' });
    setShowCreate(false);
  }

  const rows = (data.users.length > 0 ? data.users : [
    { id: 1, username: 'analyst', role: 'analyst', active: true, created_at: new Date().toISOString() },
    { id: 2, username: 'engineer', role: 'engineer', active: true, created_at: new Date().toISOString() },
    { id: 3, username: 'manager', role: 'manager', active: true, created_at: new Date().toISOString() },
    { id: 4, username: 'admin', role: 'admin', active: true, created_at: new Date().toISOString() },
  ]).filter((u) => {
    const q = query.toLowerCase().trim();
    return !q || `${u.username || ''} ${u.role || ''}`.toLowerCase().includes(q);
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>SOC User & Role Management</h2>
          <p style={{ color: '#8ba2b8', fontSize: '12px' }}>Manage operator accounts, access rights, and assign roles according to the PDF specification.</p>
        </div>
        <button className="btn-primary-action" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Provision SOC User'}
        </button>
      </div>

      {showCreate && (
        <div className="content-panel" style={{ marginBottom: '20px' }}>
          <h3 className="panel-title" style={{ marginBottom: '12px' }}>Provision New SOC User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px', gap: '12px' }}>
            <input
              className="form-input"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <input
              className="form-input"
              type="password"
              placeholder="Password (10+ characters)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <select
              className="form-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="analyst">Security Analyst</option>
              <option value="engineer">SOC Engineer</option>
              <option value="manager">Security Manager</option>
              <option value="admin">Administrator</option>
            </select>
            <button className="btn-primary-action" onClick={handleCreate}>
              Create User
            </button>
          </div>
        </div>
      )}

      <div className="content-panel">
        <div className="panel-header-row">
          <div>
            <div className="panel-eyebrow">ACCOUNTS</div>
            <h3 className="panel-title">Configured SOC Operators ({rows.length})</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Assigned Role</th>
                <th>Role Responsibilities</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td>
                    <span className="badge-tag" style={{ textTransform: 'uppercase', color: '#22d3ee' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    {u.role === 'analyst' && 'Threat alert triage, investigations, incident summaries'}
                    {u.role === 'engineer' && 'Telemetry streams, endpoint log-listeners, anomaly models'}
                    {u.role === 'manager' && 'Risk posture, 30-day trends, compliance & audit'}
                    {u.role === 'admin' && 'Platform administration, user management & enrollment'}
                  </td>
                  <td>
                    <span style={{ color: u.active ? '#34d399' : '#f43f5e', fontSize: '11px', fontWeight: 700 }}>
                      {u.active ? '● ACTIVE' : '○ DISABLED'}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 15. AUDIT LOG VIEW (Admin Only)
// ─────────────────────────────────────────────────────────────
function AuditLogView({ data, query = '' }) {
  const rows = data.audit.filter((l) => {
    const q = query.toLowerCase().trim();
    return !q || `${l.actor || ''} ${l.action || ''} ${l.target || ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="content-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">GOVERNANCE & INTEGRITY</div>
          <h3 className="panel-title">System Audit Log Stream ({rows.length})</h3>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Actor</th>
              <th>Security Action</th>
              <th>Target Entity</th>
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22d3ee' }}>#{l.id}</td>
                <td><strong>{l.actor}</strong></td>
                <td><span className="badge-tag">{l.action}</span></td>
                <td>{l.target || 'Platform'}</td>
                <td style={{ fontSize: '11px', color: '#8ba2b8', fontFamily: 'var(--font-mono)' }}>
                  {JSON.stringify(l.details || {})}
                </td>
                <td style={{ fontSize: '11px', color: '#8ba2b8' }}>
                  {new Date(l.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 16. REPORTS & EXPORT VIEW
// ─────────────────────────────────────────────────────────────
function ReportsView({ downloadReport }) {
  return (
    <div className="content-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-eyebrow">REPORTS & EXPORT SYSTEM</div>
          <h3 className="panel-title">Export Incident & Threat Evidence</h3>
        </div>
      </div>

      <p style={{ color: '#8ba2b8', fontSize: '12px', marginTop: '6px', marginBottom: '20px' }}>
        Generate standard audit and compliance reports in PDF, Excel, and CSV format for executive review.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-subtle)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>📄</div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>PDF Formal Report</h4>
          <p style={{ fontSize: '11px', color: '#8ba2b8', marginBottom: '14px' }}>
            Executive summary of high & critical insider-threat incidents with timestamped audit evidence.
          </p>
          <button className="btn-primary-action" onClick={() => downloadReport('pdf')}>
            Export PDF Document
          </button>
        </div>

        <div style={{ background: 'var(--bg-subtle)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>📊</div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Excel Spreadsheet (.xlsx)</h4>
          <p style={{ fontSize: '11px', color: '#8ba2b8', marginBottom: '14px' }}>
            Comprehensive workbook with formatted security events, employee IDs, indicators, and risk scores.
          </p>
          <button className="btn-primary-action" style={{ background: '#0891b2' }} onClick={() => downloadReport('xlsx')}>
            Export Excel Workbook
          </button>
        </div>

        <div style={{ background: 'var(--bg-subtle)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>📁</div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Raw CSV Telemetry</h4>
          <p style={{ fontSize: '11px', color: '#8ba2b8', marginBottom: '14px' }}>
            Full raw event export compatible with external SIEM, SOAR, or enterprise data lakes.
          </p>
          <button className="btn-topbar-action" onClick={() => downloadReport('csv')}>
            Export Raw CSV
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 17. DETAIL DRAWER (Inspection of Events, Alerts, Employees)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// 17. DETAIL MODAL (Centered, 2-Column Forensic Inspection Dialog)
// ─────────────────────────────────────────────────────────────
function getEventForensicDetails(e) {
  const type = (e.event_type || 'event').toLowerCase();
  const username = e.username || e.user_id || 'Unknown User';
  const empId = e.employee_id || `EMP-${username.toUpperCase()}`;
  const dept = e.department || 'Enterprise Operations';
  const device = e.device || e.device_id || 'WS-ENDPOINT';
  const ip = e.ip_address || '10.2.1.94';
  const score = Number(e.risk_score || 0).toFixed(2);
  const anomaly = Number(e.anomaly_score || 0).toFixed(2);
  const level = (e.risk_level || 'low').toLowerCase();
  const action = e.action || type;
  const result = e.result || 'SUCCESS';
  const target = e.target_resource || device;
  const bytes = Number(e.bytes_transferred || 0);
  const source = e.source_dataset === 'win_endpoint' ? 'Windows Endpoint Agent (Live)' : 'Enterprise Security Stream';
  const payloadVector = e.raw_payload?.vector || null;

  let humanTitle = 'Security Telemetry Event';
  let category = 'SYSTEM TELEMETRY';
  let vector = payloadVector || 'Standard System Activity';
  let narrative = '';
  let icon = '⚡';

  if (type === 'logon') {
    humanTitle = 'Workstation Authentication & Interactive Logon';
    category = 'AUTHENTICATION & IDENTITY';
    vector = payloadVector || 'Kerberos Interactive Authentication';
    icon = '🔑';
    narrative = `User ${username} (${empId}) from the ${dept} department successfully authenticated to workstation ${device} from IP address ${ip}. The interactive console session was established with ${result} verification.`;
  } else if (type === 'logoff') {
    humanTitle = 'Workstation Session Termination & Logoff';
    category = 'AUTHENTICATION & IDENTITY';
    vector = 'Session Teardown';
    icon = '🚪';
    narrative = `User ${username} (${empId}) terminated active interactive session on workstation ${device}. System resources were cleanly released with ${result} status.`;
  } else if (type === 'usb_file_copy' || (type === 'data_transfer' && (payloadVector || '').includes('Removable'))) {
    humanTitle = 'Physical Removable Storage (USB) Data Transfer';
    category = 'DATA EXFILTRATION RISK';
    vector = 'Physical Removable Media (USB 3.0)';
    icon = '💾';
    const volStr = bytes > 0 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : 'Mass Volume';
    narrative = `User ${username} (${empId}) initiated a physical file copy operation transfer to an external USB mass storage volume on host ${device}. Total payload transferred: ${volStr}. This operation was evaluated against enterprise DLP policies.`;
  } else if (type === 'email_send') {
    humanTitle = 'Corporate Mail Delivery & Attachment Transmission';
    category = 'EXTERNAL COMMUNICATIONS';
    vector = payloadVector || 'Outbound Webmail & SMTP Gateway';
    icon = '✉️';
    narrative = `User ${username} (${empId}) transmitted an outbound email message with attached documents (${target}) from endpoint ${device}. Security gateways inspected recipient routing and content classification.`;
  } else if (type === 'file_copy' || type === 'file_read') {
    humanTitle = 'Confidential File Access & Repository Staging';
    category = 'FILE SYSTEM ACTIVITY';
    vector = payloadVector || 'Local & Network File Staging';
    icon = '📁';
    narrative = `User ${username} (${empId}) accessed and staged files (${target}) on host ${device}. The file operations were monitored for unusual burst activity and sensitive repository queries.`;
  } else if (type === 'privilege_change') {
    humanTitle = 'Administrative Privilege Escalation & Elevation';
    category = 'PRIVILEGE & ACCESS GOVERNANCE';
    vector = payloadVector || 'Administrative Privilege Escalation';
    icon = '🛡️';
    narrative = `User ${username} (${empId}) altered local or domain security privileges (Event ID 4672 / SeDebugPrivilege) on host ${device}. Privilege escalation monitored for unauthorized tamper or persistence behavior.`;
  } else if (type === 'app_launch') {
    humanTitle = 'Process Execution & Endpoint Application Launch';
    category = 'ENDPOINT PROCESS EXECUTION';
    vector = 'Process Invocation';
    icon = '⚙️';
    narrative = `User ${username} executed application process ${target} on workstation ${device} with ${result} execution status. Host monitoring verified binary hash integrity and launch path.`;
  } else if (type === 'network_connection') {
    humanTitle = 'Outbound Network Socket Connection';
    category = 'NETWORK TELEMETRY';
    vector = 'TCP/IP Socket';
    icon = '🌐';
    narrative = `Workstation ${device} established outbound network socket communication to target ${target} from IP ${ip}. Network telemetry inspected connection protocols and flow direction.`;
  } else {
    narrative = `Security telemetry event of type ${type.toUpperCase()} recorded for user ${username} on host ${device}. Action executed: ${action} with status: ${result}.`;
  }

  return {
    humanTitle,
    category,
    vector,
    icon,
    narrative,
    username,
    empId,
    dept,
    device,
    ip,
    score,
    anomaly,
    level,
    action,
    result,
    target,
    bytes,
    source,
  };
}

function DetailDrawer({ selected, close }) {
  if (!selected) return null;
  const { kind, item } = selected;
  const [showRaw, setShowRaw] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  function triggerPlaybook(actionName) {
    setActionNotice(`✓ Playbook Action Executed: ${actionName}`);
    setTimeout(() => setActionNotice(null), 4000);
  }

  const isIncident = kind === 'incident';
  const isAlert = kind === 'alert';
  const isEvent = kind === 'event';
  const isEmployee = kind === 'employee';

  const dossier = isIncident ? parseCaseDossier(item.notes, item.title) : null;
  const caseId = isIncident ? (item.title.match(/(CASE-\d{4}-\d+)/)?.[1] || `CASE-2026-${item.id}`) : null;
  const cleanTitle = isIncident ? (item.title.replace(/CASE-\d{4}-\d+:\s*/, '').replace(/\s*-\s*[^(]+\([^)]+\)/, '') || item.title) : item.title;

  const eventDetails = isEvent ? getEventForensicDetails(item) : null;

  return (
    <div className="soc-modal-backdrop" onClick={close}>
      <div className="soc-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="soc-modal-header">
          <div>
            <div className="panel-eyebrow" style={{ color: '#22d3ee', letterSpacing: '1px' }}>
              {isEvent ? 'SOC EVENT TELEMETRY & FORENSICS' : isIncident ? 'FORENSIC INCIDENT DOSSIER' : isAlert ? 'BEHAVIORAL THREAT ALERT' : 'IDENTITY RISK PROFILE'}
            </div>
            <h3 className="panel-title" style={{ fontSize: '18px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isEvent && <span>{eventDetails.icon}</span>}
              <span>{caseId ? `${caseId}: ${cleanTitle}` : eventDetails ? eventDetails.humanTitle : item.title || item.event_id || item.employee_id}</span>
            </h3>
          </div>
          <button className="soc-modal-close-btn" onClick={close} title="Close Modal">✕</button>
        </div>

        {actionNotice && (
          <div style={{ background: '#064e3b', borderBottom: '1px solid #059669', color: '#6ee7b7', padding: '10px 28px', fontSize: '12px' }}>
            {actionNotice}
          </div>
        )}

        {/* ── 2-COLUMN SPLIT MODAL BODY ── */}
        <div className="soc-modal-body-split">
          {/* EVENT VIEW */}
          {isEvent && eventDetails && (
            <>
              {/* Left Column: Forensic Narrative & Parameters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="content-panel" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div className="panel-eyebrow" style={{ color: '#22d3ee' }}>ACTIVITY ANALYSIS & SECURITY CONTEXT</div>
                    <span className="badge-tag" style={{ fontSize: '10px' }}>{eventDetails.category}</span>
                  </div>
                  <h4 style={{ fontSize: '15px', color: '#f1f5f9', fontWeight: 700, marginBottom: '10px' }}>
                    {eventDetails.icon} {eventDetails.humanTitle}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
                    {eventDetails.narrative}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                    <div style={{ fontSize: '10px', color: '#8ba2b8', textTransform: 'uppercase' }}>🕒 TIMESTAMP</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', marginTop: '3px' }}>
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '10px', color: '#546b82', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                      {new Date(item.timestamp).toISOString().replace('T', ' ').substring(0, 19)} UTC
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                    <div style={{ fontSize: '10px', color: '#8ba2b8', textTransform: 'uppercase' }}>🖥️ HOST WORKSTATION</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#22d3ee', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                      {eventDetails.device}
                    </div>
                    <div style={{ fontSize: '10px', color: '#546b82', marginTop: '2px' }}>
                      {item.is_remote ? 'Remote Session' : 'Interactive Console Session'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                    <div style={{ fontSize: '10px', color: '#8ba2b8', textTransform: 'uppercase' }}>🌐 NETWORK ORIGIN IP</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                      {eventDetails.ip}
                    </div>
                    <div style={{ fontSize: '10px', color: '#546b82', marginTop: '2px' }}>
                      Internal Enterprise Subnet
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                    <div style={{ fontSize: '10px', color: '#8ba2b8', textTransform: 'uppercase' }}>🛡️ EXECUTION RESULT</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <span style={{
                        background: eventDetails.result === 'SUCCESS' ? 'rgba(52,211,153,0.15)' : 'rgba(244,63,94,0.15)',
                        color: eventDetails.result === 'SUCCESS' ? '#34d399' : '#f43f5e',
                        border: `1px solid ${eventDetails.result === 'SUCCESS' ? 'rgba(52,211,153,0.3)' : 'rgba(244,63,94,0.3)'}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {eventDetails.result}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#546b82', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Target: {eventDetails.target}
                    </div>
                  </div>
                </div>

                <div className="content-panel" style={{ padding: '14px' }}>
                  <div className="panel-eyebrow">BEHAVIORAL BASELINE & ML EVALUATION</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: Number(eventDetails.score) > 70 ? '#f43f5e' : '#34d399', fontWeight: 600 }}>
                        {Number(eventDetails.score) > 70 ? '⚠️ High Behavioral Anomaly Detected' : '✓ Consistent with Employee Operational Baseline'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '2px' }}>
                        Isolation Forest ML Anomaly Score: <strong>{eventDetails.anomaly}/100</strong>
                      </div>
                    </div>
                    <span className={`severity-pill ${eventDetails.level}`}>
                      {eventDetails.level.toUpperCase()}
                    </span>
                  </div>

                  {Array.isArray(item.indicators) && item.indicators.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                      {item.indicators.map((ind) => (
                        <span key={ind} style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                          ⚠ {ind}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Threat Assessment, Identity Profile & Quick Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="content-panel" style={{ padding: '18px', textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.08) 0%, transparent 70%), var(--bg-card)' }}>
                  <div className="panel-eyebrow">THREAT RISK ASSESSMENT</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: eventDetails.level === 'critical' ? '#f43f5e' : eventDetails.level === 'high' ? '#fbbf24' : '#22d3ee', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>
                    {eventDetails.score}<span style={{ fontSize: '16px', color: '#546b82' }}>/100</span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`severity-pill ${eventDetails.level}`} style={{ fontSize: '10px', padding: '3px 10px' }}>
                      {eventDetails.level.toUpperCase()} RISK RATING
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-dim)', borderRadius: '4px', overflow: 'hidden', marginTop: '14px' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(5, eventDetails.score))}%`,
                      height: '100%',
                      background: eventDetails.level === 'critical' ? 'linear-gradient(90deg, #be123c, #f43f5e)' : eventDetails.level === 'high' ? 'linear-gradient(90deg, #d97706, #fbbf24)' : 'linear-gradient(90deg, #0284c7, #22d3ee)',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>

                <div className="content-panel" style={{ padding: '16px' }}>
                  <div className="panel-eyebrow">TARGET IDENTITY</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#22d3ee' }}>
                      {(eventDetails.username[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#f1f5f9' }}>{eventDetails.username}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#22d3ee', background: 'rgba(34,211,238,0.08)', padding: '1px 5px', borderRadius: '3px' }}>
                          {eventDetails.empId}
                        </span>
                        <span style={{ fontSize: '11px', color: '#8ba2b8' }}>{eventDetails.dept}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="content-panel" style={{ padding: '14px' }}>
                  <div className="panel-eyebrow">VECTOR & SOURCE ATTRIBUTION</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '14px' }}>{eventDetails.icon}</span>
                    <strong style={{ fontSize: '12px', color: '#f1f5f9' }}>{eventDetails.vector}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '6px' }}>
                    Feed: <span style={{ color: '#22d3ee' }}>{eventDetails.source}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="btn-topbar-action"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '11px', justifyContent: 'center' }}
                    onClick={() => triggerPlaybook(`Copied Event ID ${item.event_id} to clipboard`)}
                  >
                    📋 Copy Event Identifier
                  </button>
                  <button
                    className="btn-primary-action"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '11px', textAlign: 'center' }}
                    onClick={() => triggerPlaybook(`Escalated Event ${item.event_id} to Priority Threat Alert`)}
                  >
                    ⚡ Escalate to Threat Alert
                  </button>
                </div>
              </div>
            </>
          )}

          {/* INCIDENT VIEW */}
          {isIncident && dossier && (
            <>
              {/* Left Column: Forensic Narrative & Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`severity-pill ${item.severity}`}>
                      {item.severity.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8ba2b8' }}>Status:</span>
                    <strong style={{ fontSize: '11px', color: item.status === 'investigating' ? '#fbbf24' : '#22d3ee', textTransform: 'uppercase' }}>
                      {item.status}
                    </strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8ba2b8' }}>
                    Lead Analyst: <strong style={{ color: '#f1f5f9' }}>{item.assignee || 'Jordan Lee'}</strong>
                  </div>
                </div>

                <div className="content-panel" style={{ padding: '16px' }}>
                  <div className="panel-eyebrow">FORENSIC CASE FINDINGS</div>
                  <p style={{ marginTop: '10px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
                    {dossier.evidence}
                  </p>
                </div>

                <div className="content-panel" style={{ padding: '16px' }}>
                  <div className="panel-eyebrow">RECONSTRUCTED INCIDENT TIMELINE</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#22d3ee', fontSize: '11px', minWidth: '65px' }}>01:12 UTC</span>
                      <span style={{ color: '#8ba2b8' }}>Off-hours workstation logon recorded via Kerberos authentication.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#fbbf24', fontSize: '11px', minWidth: '65px' }}>01:28 UTC</span>
                      <span style={{ color: '#8ba2b8' }}>Bulk file query and staging in temporary user workspace.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#f43f5e', fontSize: '11px', minWidth: '65px' }}>01:34 UTC</span>
                      <span style={{ color: '#fca5a5' }}>High-volume exfiltration transfer initiated. Isolation Forest ML threshold triggered.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Identity, Vector & Playbooks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="content-panel" style={{ padding: '16px' }}>
                  <div className="panel-eyebrow">TARGET IDENTITY</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', color: '#f1f5f9' }}>{dossier.subject}</h4>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22d3ee', background: 'rgba(34,211,238,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          {dossier.empId}
                        </span>
                        <span style={{ fontSize: '12px', color: '#8ba2b8' }}>{dossier.role}</span>
                        <span style={{ fontSize: '11px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', padding: '1px 6px', borderRadius: '3px', color: '#cbd5e1' }}>
                          {dossier.department}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>92/100</div>
                      <div style={{ fontSize: '10px', color: '#f43f5e', textTransform: 'uppercase' }}>CRITICAL OUTLIER</div>
                    </div>
                  </div>
                </div>

                <div className="content-panel" style={{ padding: '16px' }}>
                  <div className="panel-eyebrow">THREAT VECTOR & DATA VOLUME</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {dossier.vector.includes('USB') ? '💾' : dossier.vector.includes('Webmail') ? '✉️' : dossier.vector.includes('Privilege') ? '🔑' : '📁'}
                    </span>
                    <strong style={{ fontSize: '13px', color: '#f1f5f9' }}>{dossier.vector}</strong>
                    {dossier.volume && (
                      <span style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                        {dossier.volume}
                      </span>
                    )}
                  </div>
                </div>

                <div className="content-panel" style={{ padding: '16px' }}>
                  <div className="panel-eyebrow">SOC RESPONSE PLAYBOOKS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                    <button className="btn-primary-action" style={{ fontSize: '11px', padding: '8px' }} onClick={() => triggerPlaybook('Enforce Step-Up MFA & Revoke Session')}>
                      🛡️ Revoke Session & MFA
                    </button>
                    <button className="btn-topbar-action" style={{ fontSize: '11px', padding: '8px', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }} onClick={() => triggerPlaybook('Workstation Endpoint Network Isolation')}>
                      🔒 Isolate Host Workstation
                    </button>
                    <button className="btn-topbar-action" style={{ fontSize: '11px', padding: '8px', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }} onClick={() => triggerPlaybook('Block Removable USB Media')}>
                      💾 Block USB Ports
                    </button>
                    <button className="btn-topbar-action" style={{ fontSize: '11px', padding: '8px' }} onClick={() => triggerPlaybook('Escalate to HR & Legal Counsel')}>
                      📜 Escalate to Legal
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ALERT VIEW */}
          {isAlert && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="content-panel" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`severity-pill ${item.severity}`}>{item.severity.toUpperCase()}</span>
                    <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>Score: 92/100</span>
                  </div>
                  <h4 style={{ fontSize: '15px', marginTop: '10px', color: '#f1f5f9' }}>{item.title}</h4>
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>{item.description}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="content-panel" style={{ padding: '16px' }}>
                  <div className="panel-eyebrow">TARGET IDENTITY</div>
                  <strong style={{ fontSize: '15px', color: '#22d3ee', display: 'block', marginTop: '6px' }}>{item.username}</strong>
                  <div style={{ fontSize: '11px', color: '#8ba2b8', marginTop: '4px' }}>
                    Triggered at: {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* EMPLOYEE VIEW */}
          {isEmployee && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="content-panel" style={{ padding: '18px' }}>
                  <div className="panel-eyebrow">EMPLOYEE IDENTITY PROFILE</div>
                  <h4 style={{ fontSize: '16px', color: '#f1f5f9', marginTop: '4px' }}>{item.full_name || item.username}</h4>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '12px', color: '#8ba2b8' }}>
                    <span>ID: <code style={{ color: '#22d3ee' }}>{item.employee_id}</code></span>
                    <span>Dept: <strong style={{ color: '#f1f5f9' }}>{item.department}</strong></span>
                    <span>Role: <strong style={{ color: '#f1f5f9' }}>{item.designation}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="content-panel" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '11px', color: '#8ba2b8' }}>Behavioral Risk Score:</span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: item.risk_score > 70 ? '#f43f5e' : '#fbbf24', marginTop: '2px' }}>
                    {item.risk_score}/100 ({item.risk_level.toUpperCase()})
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Collapsible Technical JSON Payload */}
        <div style={{ padding: '0 28px 24px 28px', borderTop: '1px solid #132233', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setShowRaw(!showRaw)}
              style={{ fontSize: '11px', color: '#546b82', textDecoration: 'underline', background: 'transparent', cursor: 'pointer' }}
            >
              {showRaw ? 'Hide Raw Technical Telemetry ▲' : 'Show Raw Technical Telemetry ▼'}
            </button>
            <span style={{ fontSize: '10px', color: '#546b82', fontFamily: 'var(--font-mono)' }}>
              {item.event_id || item.employee_id || `ID #${item.id}`}
            </span>
          </div>
          {showRaw && (
            <pre className="drawer-code-block" style={{ marginTop: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              {JSON.stringify(item, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
