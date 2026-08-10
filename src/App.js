import React, { useState } from 'react';

// Insider Threat Behavioral Intelligence System - React Dashboard
export default function InsiderThreatDashboard() {
  // State for user role switcher
  const [activeRole, setActiveRole] = useState('Security Analyst');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Key performance & security metrics
  const metrics = {
    mttd: '14 mins',
    mtti: '42 mins',
    mttr: '1.2 hrs',
    activeAlerts: 18,
    highRiskUsers: 5,
    monitoredEntities: 1240,
  };

  // User Risk Database matching the Weighted Scoring Model:
  // Behavioral Anomalies (35%), Privilege Misuse (25%), Data Access Violations (20%), 
  // Access Pattern Deviations (10%), Historical Security Events (10%)
  const [users, setUsers] = useState([
    {
      id: 'EMP-8842',
      name: 'Alex Mercer',
      dept: 'Engineering & DevOps',
      designation: 'Senior System Admin',
      riskScore: 88,
      riskCategory: 'Critical Risk',
      anomalies: 38,
      privilegeMisuse: 28,
      dataAccessViolations: 12,
      accessDeviations: 5,
      historicalEvents: 5,
      lastActive: '10 mins ago',
      flaggedAction: 'Bulk download of prod DB dumps & unusual 2 AM VPN login',
    },
    {
      id: 'EMP-3109',
      name: 'Elena Rostova',
      dept: 'Finance',
      designation: 'Financial Analyst',
      riskScore: 74,
      riskCategory: 'High Risk',
      anomalies: 28,
      privilegeMisuse: 20,
      dataAccessViolations: 16,
      accessDeviations: 6,
      historicalEvents: 4,
      lastActive: '25 mins ago',
      flaggedAction: 'Unauthorized access attempt to M&A folder + USB Inserted',
    },
    {
      id: 'EMP-1142',
      name: 'Marcus Vance',
      dept: 'Human Resources',
      designation: 'HR Lead',
      riskScore: 52,
      riskCategory: 'Medium Risk',
      anomalies: 18,
      privilegeMisuse: 12,
      dataAccessViolations: 10,
      accessDeviations: 7,
      historicalEvents: 5,
      lastActive: '1 hr ago',
      flaggedAction: 'Excessive personnel file downloads outside shift hours',
    },
    {
      id: 'EMP-9021',
      name: 'Sarah Chen',
      dept: 'Sales & Marketing',
      designation: 'Account Executive',
      riskScore: 22,
      riskCategory: 'Low Risk',
      anomalies: 8,
      privilegeMisuse: 5,
      dataAccessViolations: 4,
      accessDeviations: 3,
      historicalEvents: 2,
      lastActive: 'Just now',
      flaggedAction: 'Normal CRM activity',
    },
  ]);

  // Real-time security alert feeds
  const alerts = [
    {
      id: 'ALT-1092',
      timestamp: '2026-08-10 15:22:01',
      user: 'Alex Mercer (EMP-8842)',
      severity: 'Critical',
      category: 'Data Exfiltration',
      description: 'Abnormal data download (14.2 GB via SFTP to external IP)',
      status: 'Open',
    },
    {
      id: 'ALT-1091',
      timestamp: '2026-08-10 14:58:33',
      user: 'Elena Rostova (EMP-3109)',
      severity: 'High',
      category: 'Privilege Abuse',
      description: 'Unauthorized privilege elevation request on Finance Server',
      status: 'Under Investigation',
    },
    {
      id: 'ALT-1090',
      timestamp: '2026-08-10 13:12:09',
      user: 'Marcus Vance (EMP-1142)',
      severity: 'Medium',
      category: 'Unusual Login Time',
      description: 'Interactive console login at 02:14 AM IST',
      status: 'Investigated',
    },
  ];

  // Helper function to colorize risk categories
  const getBadgeColor = (category) => {
    switch (category) {
      case 'Critical Risk':
      case 'Critical':
        return '#dc2626'; // Red
      case 'High Risk':
      case 'High':
        return '#ea580c'; // Orange
      case 'Medium Risk':
      case 'Medium':
        return '#d97706'; // Amber
      default:
        return '#16a34a'; // Green
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.dept.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk =
      riskFilter === 'ALL' || u.riskCategory.toUpperCase().includes(riskFilter);
    return matchesSearch && matchesRisk;
  });

  return (
    <div style={styles.container}>
      {/* Top Header Bar */}
      <header style={styles.header}>
        <div style={styles.brandGroup}>
          <div style={styles.logoBadge}>🛡️ IBIS</div>
          <div>
            <h1 style={styles.title}>Insider Threat Behavioral Intelligence System</h1>
            <p style={styles.subtitle}>
              Continuous Monitoring • UEBA Risk Engine • Real-time Threat Detection
            </p>
          </div>
        </div>

        {/* Role & User Selector */}
        <div style={styles.roleSelector}>
          <label style={styles.roleLabel}>Active Role:</label>
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value)}
            style={styles.selectInput}
          >
            <option value="Security Analyst">Security Analyst</option>
            <option value="SOC Engineer">SOC Engineer</option>
            <option value="Security Manager">Security Manager</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={styles.navBar}>
        <button
          style={activeTab === 'overview' ? styles.activeNavBtn : styles.navBtn}
          onClick={() => setActiveTab('overview')}
        >
          📊 Executive & SOC Overview
        </button>
        <button
          style={activeTab === 'riskScoring' ? styles.activeNavBtn : styles.navBtn}
          onClick={() => setActiveTab('riskScoring')}
        >
          🎯 Risk Scoring & Profiling
        </button>
        <button
          style={activeTab === 'investigations' ? styles.activeNavBtn : styles.navBtn}
          onClick={() => setActiveTab('investigations')}
        >
          🔍 Threat Investigations
        </button>
      </nav>

      {/* Main Content Area */}
      <main style={styles.main}>
        {/* TOP METRIC CARDS */}
        <section style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricTitle}>High / Critical Risk Users</span>
            <div style={styles.metricVal}>{metrics.highRiskUsers}</div>
            <span style={{ color: '#dc2626', fontSize: '12px' }}>⚠️ Requires Immediate Action</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricTitle}>Active Security Alerts</span>
            <div style={styles.metricVal}>{metrics.activeAlerts}</div>
            <span style={{ color: '#ea580c', fontSize: '12px' }}>⚡ 3 Unassigned</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricTitle}>Mean Time To Detect (MTTD)</span>
            <div style={styles.metricVal}>{metrics.mttd}</div>
            <span style={{ color: '#16a34a', fontSize: '12px' }}>📉 12% faster than baseline</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricTitle}>Mean Time To Investigate</span>
            <div style={styles.metricVal}>{metrics.mtti}</div>
            <span style={{ color: '#2563eb', fontSize: '12px' }}>⏱️ Target: &lt; 45 mins</span>
          </div>
        </section>

        {/* TAB 1: OVERVIEW & ALERTS */}
        {activeTab === 'overview' && (
          <div style={styles.gridTwoColumn}>
            {/* Real-Time Alerts Panel */}
            <div style={styles.panel}>
              <h3 style={styles.panelTitle}>⚡ Live Anomaly & Threat Feed</h3>
              <div style={styles.listContainer}>
                {alerts.map((a) => (
                  <div key={a.id} style={styles.alertCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          backgroundColor: getBadgeColor(a.severity),
                          ...styles.pill,
                        }}
                      >
                        {a.severity}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{a.timestamp}</span>
                    </div>
                    <div style={{ margin: '8px 0', fontWeight: 'bold' }}>{a.user}</div>
                    <div style={{ fontSize: '13px', color: '#334155' }}>{a.description}</div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#475569',
                        marginTop: '6px',
                        display: 'flex',
                        justify: 'space-between',
                      }}
                    >
                      <span>Category: {a.category}</span>
                      <span>Status: <strong>{a.status}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weighted Risk Engine Concept Display */}
            <div style={styles.panel}>
              <h3 style={styles.panelTitle}>⚙️ Weighted Risk Scoring Model Breakdown</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                Insider Risk Score is dynamically evaluated using multi-factor UEBA metrics:
              </p>

              <div style={styles.formulaBar}>
                <div style={{ width: '35%', backgroundColor: '#dc2626', padding: '6px', color: '#fff', fontSize: '11px', textAlign: 'center' }}>
                  Anomalies (35%)
                </div>
                <div style={{ width: '25%', backgroundColor: '#ea580c', padding: '6px', color: '#fff', fontSize: '11px', textAlign: 'center' }}>
                  Privilege Misuse (25%)
                </div>
                <div style={{ width: '20%', backgroundColor: '#d97706', padding: '6px', color: '#fff', fontSize: '11px', textAlign: 'center' }}>
                  Data Violations (20%)
                </div>
                <div style={{ width: '10%', backgroundColor: '#2563eb', padding: '6px', color: '#fff', fontSize: '10px', textAlign: 'center' }}>
                  Access (10%)
                </div>
                <div style={{ width: '10%', backgroundColor: '#475569', padding: '6px', color: '#fff', fontSize: '10px', textAlign: 'center' }}>
                  Hist (10%)
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Security Role Context:</h4>
                <div style={styles.roleNote}>
                  Logged in as: <strong>{activeRole}</strong>
                  <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#475569' }}>
                    {activeRole === 'Security Analyst' && 'Focus: Triage alerts, review anomaly feeds, and investigate suspicious activities.'}
                    {activeRole === 'SOC Engineer' && 'Focus: Monitor infrastructure logs, system performance, and threat feeds.'}
                    {activeRole === 'Security Manager' && 'Focus: Executive risk posture, compliance metrics, and team workflow management.'}
                    {activeRole === 'Administrator' && 'Focus: User management, platform analytics, system logs, and RBAC policies.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RISK SCORING & PROFILING */}
        {activeTab === 'riskScoring' && (
          <div style={styles.panel}>
            <div style={styles.tableHeaderGroup}>
              <h3 style={styles.panelTitle}>👥 Employee Risk Directory & Behavioral Profiling</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search employee or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.textInput}
                />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="CRITICAL">Critical Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="LOW">Low Risk</option>
                </select>
              </div>
            </div>

            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Employee ID / Name</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Risk Score</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Primary Behavioral Flag</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{u.name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{u.id} • {u.designation}</div>
                    </td>
                    <td style={styles.td}>{u.dept}</td>
                    <td style={styles.td}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{u.riskScore}</span> / 100
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          backgroundColor: getBadgeColor(u.riskCategory),
                          ...styles.pill,
                        }}
                      >
                        {u.riskCategory}
                      </span>
                    </td>
                    <td style={styles.td}>{u.flaggedAction}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => {
                          setSelectedUser(u);
                          setActiveTab('investigations');
                        }}
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: THREAT INVESTIGATIONS */}
        {activeTab === 'investigations' && (
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>🔍 Case Investigation Workflow</h3>
            {selectedUser ? (
              <div>
                <div style={styles.userBanner}>
                  <div>
                    <h2 style={{ margin: 0 }}>{selectedUser.name} ({selectedUser.id})</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
                      {selectedUser.designation} | {selectedUser.dept}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        backgroundColor: getBadgeColor(selectedUser.riskCategory),
                        ...styles.pill,
                        fontSize: '13px',
                      }}
                    >
                      {selectedUser.riskCategory} ({selectedUser.riskScore}/100)
                    </span>
                  </div>
                </div>

                <h4 style={{ marginTop: '20px' }}>Weighted Risk Breakdown:</h4>
                <div style={styles.scoreGrid}>
                  <div style={styles.scoreBox}>
                    <span>Behavioral Anomalies (35%)</span>
                    <strong>{selectedUser.anomalies} pts</strong>
                  </div>
                  <div style={styles.scoreBox}>
                    <span>Privilege Misuse (25%)</span>
                    <strong>{selectedUser.privilegeMisuse} pts</strong>
                  </div>
                  <div style={styles.scoreBox}>
                    <span>Data Access Violations (20%)</span>
                    <strong>{selectedUser.dataAccessViolations} pts</strong>
                  </div>
                  <div style={styles.scoreBox}>
                    <span>Access Deviations (10%)</span>
                    <strong>{selectedUser.accessDeviations} pts</strong>
                  </div>
                  <div style={styles.scoreBox}>
                    <span>Historical Events (10%)</span>
                    <strong>{selectedUser.historicalEvents} pts</strong>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4>Threat Investigation Timeline & Actions:</h4>
                  <ul style={styles.timelineList}>
                    <li><strong>02:14 AM:</strong> Non-standard hours login detected from IP 192.168.1.104</li>
                    <li><strong>02:18 AM:</strong> Escalated privileges to admin group on Database Host #2</li>
                    <li><strong>02:25 AM:</strong> Initiated 14GB bulk export of customer table records</li>
                    <li><strong>02:31 AM:</strong> Automatic UEBA Risk Score recalculated to {selectedUser.riskScore} (Critical)</li>
                  </ul>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button style={styles.primaryActionBtn}>Isolate User Account</button>
                  <button style={styles.secondaryBtn}>Export PDF Report</button>
                  <button style={styles.secondaryBtn} onClick={() => setSelectedUser(null)}>
                    Back to Case Selection
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                👈 Select a user from the <strong>Risk Scoring & Profiling</strong> tab to launch an active threat investigation case.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Inline CSS Stylesheet
const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    color: '#0f172a',
  },
  header: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '16px 24px',
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBadge: {
    backgroundColor: '#2563eb',
    padding: '8px 12px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
  },
  subtitle: {
    margin: 0,
    fontSize: '12px',
    color: '#94a3b8',
  },
  roleSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleLabel: {
    fontSize: '13px',
    color: '#cbd5e1',
  },
  selectInput: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '13px',
  },
  textInput: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
  },
  navBar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 24px',
    display: 'flex',
    gap: '8px',
  },
  navBtn: {
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  activeNavBtn: {
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#2563eb',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderBottom: '2px solid #2563eb',
  },
  main: {
    padding: '24px',
    maxWidth: '1300px',
    margin: '0 auto',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricTitle: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  metricVal: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  gridTwoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  panelTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '12px',
  },
  pill: {
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'inline-block',
  },
  formulaBar: {
    display: 'flex',
    borderRadius: '6px',
    overflow: 'hidden',
    marginTop: '12px',
  },
  roleNote: {
    backgroundColor: '#f1f5f9',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  tableHeaderGroup: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    backgroundColor: '#f1f5f9',
  },
  th: {
    padding: '10px',
    fontSize: '12px',
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px 10px',
    fontSize: '13px',
  },
  actionBtn: {
    padding: '6px 12px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  userBanner: {
    backgroundColor: '#f1f5f9',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
  },
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  scoreBox: {
    backgroundColor: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '12px',
  },
  timelineList: {
    backgroundColor: '#f8fafc',
    padding: '16px 24px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    lineHeight: '1.8',
  },
  primaryActionBtn: {
    padding: '10px 18px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    padding: '10px 18px',
    backgroundColor: '#e2e8f0',
    color: '#334155',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};