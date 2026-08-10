import React, { useState } from 'react';
import './styles.css';

export default function App() {
  // Role-Based Access State
  const [activeRole, setActiveRole] = useState('Security Analyst'); // User roles: Security Analyst, SOC Engineer, Security Manager, Administrator[cite: 1]
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Security Operations System Performance Metrics[cite: 1]
  const metrics = {
    mttd: '14 mins', // Mean Time To Detect[cite: 1]
    mtti: '42 mins', // Mean Time To Investigate[cite: 1]
    mttr: '1.2 hrs', // Mean Time To Respond[cite: 1]
    activeAlerts: 18,
    highRiskUsers: 5,
    monitoredEntities: 1240,
  };

  // Employee Database based on Weighted Scoring Model Factors[cite: 1]
  const [users] = useState([
    {
      id: 'EMP-8842',
      name: 'Alex Mercer',
      dept: 'Engineering & DevOps',
      designation: 'Senior System Admin',
      riskScore: 88,
      riskCategory: 'Critical Risk', // Categories: Low Risk, Medium Risk, High Risk, Critical Risk[cite: 1]
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
      riskCategory: 'High Risk',[cite: 1]
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
      riskCategory: 'Medium Risk',[cite: 1]
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
      riskCategory: 'Low Risk',[cite: 1]
      anomalies: 8,
      privilegeMisuse: 5,
      dataAccessViolations: 4,
      accessDeviations: 3,
      historicalEvents: 2,
      lastActive: 'Just now',
      flaggedAction: 'Normal CRM activity',
    },
  ]);

  // Alert Feed based on Alert Severity Levels[cite: 1]
  const alerts = [
    {
      id: 'ALT-1092',
      timestamp: '2026-08-10 15:22:01',
      user: 'Alex Mercer (EMP-8842)',
      severity: 'Critical',[cite: 1]
      category: 'Data Exfiltration',
      description: 'Abnormal data download (14.2 GB via SFTP to external IP)',
      status: 'Open',
    },
    {
      id: 'ALT-1091',
      timestamp: '2026-08-10 14:58:33',
      user: 'Elena Rostova (EMP-3109)',
      severity: 'High',[cite: 1]
      category: 'Privilege Abuse',
      description: 'Unauthorized privilege elevation request on Finance Server',
      status: 'Under Investigation',
    },
    {
      id: 'ALT-1090',
      timestamp: '2026-08-10 13:12:09',
      user: 'Marcus Vance (EMP-1142)',
      severity: 'Medium',[cite: 1]
      category: 'Unusual Login Time',
      description: 'Interactive console login at 02:14 AM IST',
      status: 'Investigated',
    },
  ];

  // Utility to obtain proper CSS badge class
  const getBadgeClass = (category) => {
    switch (category) {
      case 'Critical Risk':
      case 'Critical':
        return 'badge-critical';
      case 'High Risk':
      case 'High':
        return 'badge-high';
      case 'Medium Risk':
      case 'Medium':
        return 'badge-medium';
      default:
        return 'badge-low';
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
    <div className="dashboard-container">
      {/* Navigation Header */}
      <header className="header">
        <div className="brand-group">
          <div className="logo-badge">🛡️ IBIS</div>
          <div>
            <h1 className="title">Insider Threat Behavioral Intelligence System</h1>
            <p className="subtitle">
              Continuous Monitoring • UEBA Risk Engine • Real-time Threat Detection
            </p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="role-selector">
          <label className="role-label">Active Role:</label>
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value)}
            className="select-input"
          >
            <option value="Security Analyst">Security Analyst</option>
            <option value="SOC Engineer">SOC Engineer</option>
            <option value="Security Manager">Security Manager</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>
      </header>

      {/* Main Tab Controls */}
      <nav className="nav-bar">
        <button
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Executive & SOC Overview
        </button>
        <button
          className={`nav-btn ${activeTab === 'riskScoring' ? 'active' : ''}`}
          onClick={() => setActiveTab('riskScoring')}
        >
          🎯 Risk Scoring & Profiling
        </button>
        <button
          className={`nav-btn ${activeTab === 'investigations' ? 'active' : ''}`}
          onClick={() => setActiveTab('investigations')}
        >
          🔍 Threat Investigations
        </button>
      </nav>

      {/* Dashboard Body */}
      <main className="main-content">
        {/* Security Metric Cards */}
        <section className="metric-grid">
          <div className="metric-card">
            <span className="metric-title">High / Critical Risk Users</span>
            <div className="metric-value">{metrics.highRiskUsers}</div>
            <span style={{ color: '#dc2626', fontSize: '12px' }}>⚠️ Requires Immediate Action</span>
          </div>

          <div className="metric-card">
            <span className="metric-title">Active Security Alerts</span>
            <div className="metric-value">{metrics.activeAlerts}</div>
            <span style={{ color: '#ea580c', fontSize: '12px' }}>⚡ 3 Unassigned</span>
          </div>

          <div className="metric-card">
            <span className="metric-title">Mean Time To Detect (MTTD)</span>
            <div className="metric-value">{metrics.mttd}</div>
            <span style={{ color: '#16a34a', fontSize: '12px' }}>📉 12% faster than baseline</span>
          </div>

          <div className="metric-card">
            <span className="metric-title">Mean Time To Investigate (MTTI)</span>
            <div className="metric-value">{metrics.mtti}</div>
            <span style={{ color: '#2563eb', fontSize: '12px' }}>⏱️ Target: &lt; 45 mins</span>
          </div>
        </section>

        {/* TAB 1: EXECUTIVE & SOC OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid-two-column">
            <div className="panel">
              <h3 className="panelTitle">⚡ Live Anomaly & Threat Feed</h3>
              <div className="alert-feed">
                {alerts.map((a) => (
                  <div key={a.id} className="alert-card">
                    <div className="alert-header">
                      <span className={`pill ${getBadgeClass(a.severity)}`}>{a.severity}</span>
                      <span className="alert-time">{a.timestamp}</span>
                    </div>
                    <div className="alert-user">{a.user}</div>
                    <div className="alert-desc">{a.description}</div>
                    <div className="alert-footer">
                      <span>Category: {a.category}</span>
                      <span>Status: <strong>{a.status}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h3 className="panelTitle">⚙️ Weighted Risk Scoring Model Breakdown</h3>
              <p style={{ fontSize: '13px', color: '#475569' }}>
                Formula: $Risk = 35\% \text{Anomalies} + 25\% \text{Privilege} + 20\% \text{Data} + 10\% \text{Access} + 10\% \text{History}$
              </p>

              <div className="formula-bar">
                <div className="formula-seg-35">Anomalies (35%)</div>
                <div className="formula-seg-25">Privilege (25%)</div>
                <div className="formula-seg-20">Data (20%)</div>
                <div className="formula-seg-10a">Access (10%)</div>
                <div className="formula-seg-10b">Hist (10%)</div>
              </div>

              <div className="role-note">
                Logged in as: <strong>{activeRole}</strong>
                <p style={{ fontSize: '12px', marginTop: '4px', color: '#475569' }}>
                  {activeRole === 'Security Analyst' && 'Focus: Triage alerts, review anomaly feeds, and investigate suspicious activities.'}
                  {activeRole === 'SOC Engineer' && 'Focus: Monitor infrastructure logs, system performance, and threat feeds.'}
                  {activeRole === 'Security Manager' && 'Focus: Executive risk posture, compliance metrics, and team workflow management.'}
                  {activeRole === 'Administrator' && 'Focus: User management, platform analytics, system logs, and RBAC policies.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RISK SCORING & PROFILING */}
        {activeTab === 'riskScoring' && (
          <div className="panel">
            <div className="table-header-group">
              <h3 className="panelTitle">👥 Employee Risk Directory & Behavioral Profiling</h3>
              <div className="table-controls">
                <input
                  type="text"
                  placeholder="Search employee or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-input"
                />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="select-input"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="CRITICAL">Critical Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="LOW">Low Risk</option>
                </select>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID / Name</th>
                  <th>Department</th>
                  <th>Risk Score</th>
                  <th>Category</th>
                  <th>Primary Behavioral Flag</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <div className="sub-text">{u.id} • {u.designation}</div>
                    </td>
                    <td>{u.dept}</td>
                    <td>
                      <span className="score-display">{u.riskScore}</span> / 100
                    </td>
                    <td>
                      <span className={`pill ${getBadgeClass(u.riskCategory)}`}>{u.riskCategory}</span>
                    </td>
                    <td>{u.flaggedAction}</td>
                    <td>
                      <button
                        className="action-btn"
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
          <div className="panel">
            <h3 className="panelTitle">🔍 Case Investigation Workflow</h3>
            {selectedUser ? (
              <div>
                <div className="user-banner">
                  <div>
                    <h2>{selectedUser.name} ({selectedUser.id})</h2>
                    <p className="sub-text">{selectedUser.designation} | {selectedUser.dept}</p>
                  </div>
                  <div>
                    <span className={`pill ${getBadgeClass(selectedUser.riskCategory)}`}>
                      {selectedUser.riskCategory} ({selectedUser.riskScore}/100)
                    </span>
                  </div>
                </div>

                <h4 style={{ marginTop: '20px' }}>Weighted Risk Factor Breakdown:</h4>
                <div className="score-grid">
                  <div className="score-box">
                    <span>Behavioral Anomalies (35%)</span>
                    <strong>{selectedUser.anomalies} pts</strong>
                  </div>
                  <div className="score-box">
                    <span>Privilege Misuse (25%)</span>
                    <strong>{selectedUser.privilegeMisuse} pts</strong>
                  </div>
                  <div className="score-box">
                    <span>Data Access Violations (20%)</span>
                    <strong>{selectedUser.dataAccessViolations} pts</strong>
                  </div>
                  <div className="score-box">
                    <span>Access Deviations (10%)</span>
                    <strong>{selectedUser.accessDeviations} pts</strong>
                  </div>
                  <div className="score-box">
                    <span>Historical Events (10%)</span>
                    <strong>{selectedUser.historicalEvents} pts</strong>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4>Threat Investigation Timeline & Audit Events:</h4>
                  <ul className="timeline-list">
                    <li><strong>02:14 AM:</strong> Non-standard hours login detected from IP 192.168.1.104</li>
                    <li><strong>02:18 AM:</strong> Escalated privileges to admin group on Database Host #2</li>
                    <li><strong>02:25 AM:</strong> Initiated 14GB bulk export of customer table records</li>
                    <li><strong>02:31 AM:</strong> Automatic UEBA Risk Score recalculated to {selectedUser.riskScore} (Critical)</li>
                  </ul>
                </div>

                <div className="button-group">
                  <button className="primary-action-btn">Isolate User Account</button>
                  <button className="secondary-btn">Export PDF Report</button>
                  <button className="secondary-btn" onClick={() => setSelectedUser(null)}>
                    Back to Case Selection
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                👈 Select a user from the <strong>Risk Scoring & Profiling</strong> tab to launch an active threat investigation case.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}