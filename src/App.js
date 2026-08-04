import React, { useState } from 'react';

// Sample Dataset
const initialEmployees = [
  { id: '101', name: 'John Carter', department: 'Finance', riskLevel: 'High', score: 87, lastActivity: 'Unusual login — 3:14 AM, unrecognized device', seen: '2h ago', avatarBg: '#e8f0fe', avatarColor: '#1a73e8', initial: 'JC', details: 'Attempted 5 failed logins from an unapproved IP in Berlin before successfully authenticating.' },
  { id: '104', name: 'Priya Nair', department: 'Legal', riskLevel: 'High', score: 79, lastActivity: 'Mass download prior to scheduled offboarding', seen: '40m ago', avatarBg: '#fce8e6', avatarColor: '#c5221f', initial: 'PN', details: 'Exported 1,420 confidential contract PDFs to external storage 3 days prior to departure date.' },
  { id: '102', name: 'David Kim', department: 'Engineering', riskLevel: 'Medium', score: 54, lastActivity: 'Large file access — 2.3 GB transferred', seen: '5h ago', avatarBg: '#fef7e0', avatarColor: '#b06000', initial: 'DK', details: 'Downloaded internal source code repositories outside normal working hours.' },
  { id: '105', name: 'Sarah Jenkins', department: 'HR', riskLevel: 'Low', score: 18, lastActivity: 'Routine payroll database query', seen: '1d ago', avatarBg: '#e6f4ea', avatarColor: '#137333', initial: 'SJ', details: 'Normal administrative activity within assigned permissions.' },
  { id: '108', name: 'Alex Rivera', department: 'DevOps', riskLevel: 'Medium', score: 48, lastActivity: 'SSH key modification on production cluster', seen: '12h ago', avatarBg: '#fef7e0', avatarColor: '#b06000', initial: 'AR', details: 'Created new root SSH keys without filing an associated ticket.' },
];

const initialAlerts = [
  { id: 'ALT-901', title: 'Unauthorized Data Export', severity: 'Critical', status: 'Unresolved', time: '10m ago', target: 'Priya Nair (ID 104)' },
  { id: 'ALT-884', title: 'Anomalous Time Authentication', severity: 'High', status: 'Investigating', time: '2h ago', target: 'John Carter (ID 101)' },
  { id: 'ALT-872', title: 'Bulk File Download', severity: 'Medium', status: 'Resolved', time: '1d ago', target: 'David Kim (ID 102)' },
];

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('All');
  const [employees, setEmployees] = useState(initialEmployees);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Advanced Theme System
  const theme = {
    bg: darkMode ? '#0f172a' : '#f8fafc',
    surface: darkMode ? '#1e293b' : '#ffffff',
    surfaceVariant: darkMode ? '#334155' : '#f1f5f9',
    surfaceHover: darkMode ? '#334155' : '#e2e8f0',
    border: darkMode ? '#334155' : '#e2e8f0',
    textPrimary: darkMode ? '#f8fafc' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    primary: darkMode ? '#818cf8' : '#4f46e5',
    primaryContainer: darkMode ? '#312e81' : '#eef2ff',
    shadow: darkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    highBg: darkMode ? '#450a0a' : '#fef2f2',
    highText: darkMode ? '#fca5a5' : '#dc2626',
    medBg: darkMode ? '#431407' : '#fff7ed',
    medText: darkMode ? '#fdba74' : '#ea580c',
    lowBg: darkMode ? '#064e3b' : '#ecfdf5',
    lowText: darkMode ? '#6ee7b7' : '#059669',
  };

  const handleLockAccount = (id) => {
    setEmployees(employees.map(emp => emp.id === id ? { ...emp, riskLevel: 'Low', score: 0, lastActivity: 'Account locked by analyst' } : emp));
    setSelectedEmployee(null);
  };

  const handleDismissFlag = (id) => {
    setEmployees(employees.filter(emp => emp.id !== id));
    setSelectedEmployee(null);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.id.includes(searchTerm);
    const matchesRisk = selectedRiskFilter === 'All' || emp.riskLevel === selectedRiskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      backgroundColor: theme.bg, 
      color: theme.textPrimary, 
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    }}>
      
      {/* Sidebar Navigation */}
      <aside style={{ width: '250px', backgroundColor: theme.surface, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 14px', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', paddingLeft: '8px' }}>
            <div style={{ backgroundColor: theme.primary, color: '#ffffff', fontWeight: '700', fontSize: '16px', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</div>
            <span style={{ fontWeight: '700', fontSize: '19px', color: theme.textPrimary, letterSpacing: '-0.02em' }}>Threat AI</span>
          </div>

          <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', paddingLeft: '8px' }}>Monitor</div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { label: 'Dashboard', badge: null },
              { label: 'Employees', badge: null },
              { label: 'Risk Analysis', badge: null },
              { label: 'Alerts', badge: '3' },
            ].map((tab) => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '9px 14px',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? theme.primary : theme.textSecondary,
                    backgroundColor: isActive ? theme.primaryContainer : 'transparent',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span style={{ 
                      backgroundColor: '#dc2626', 
                      color: '#ffffff', 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      borderRadius: '10px', 
                      padding: '2px 7px' 
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.textSecondary, paddingLeft: '8px', paddingBottom: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
          Live monitoring active
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
        {/* Header Bar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: theme.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>{activeTab}</h1>
            <p style={{ fontSize: '13px', color: theme.textSecondary, marginTop: '2px' }}>Insider Threat Behavioral Intelligence System</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input 
              type="text" 
              placeholder="Search employee or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 14px', backgroundColor: theme.surfaceVariant, fontSize: '13px', borderRadius: '8px', border: `1px solid ${theme.border}`, width: '220px', color: theme.textPrimary, outline: 'none' }}
            />
            
            {/* Top-Right Theme Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
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
                gap: '6px',
                transition: 'all 0.15s ease' 
              }}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: `1px solid ${theme.border}` }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: theme.primaryContainer, color: theme.primary, fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SO</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary }}>Security Ops</div>
                <div style={{ fontSize: '11px', color: theme.textSecondary }}>Analyst</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard View */}
        {activeTab === 'Dashboard' && (
          <>
            <div style={{ backgroundColor: theme.surface, borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: '22px 26px', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '28px' }}>
              <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg style={{ width: '110px', height: '110px', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                  <path strokeWidth="3" stroke={theme.surfaceVariant} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path strokeWidth="3" strokeDasharray="14, 100" strokeLinecap="round" stroke="#10b981" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: '28px', fontWeight: '700', color: theme.textPrimary }}>14</span>
                  <span style={{ display: 'block', fontSize: '11px', color: theme.textSecondary }}>/ 100</span>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: '6px' }}>Composite Risk Score</h3>
                <p style={{ fontSize: '13px', color: theme.textSecondary, maxWidth: '600px', marginBottom: '8px', lineHeight: '1.4' }}>
                  Weighted across login anomalies, data movement, and access-scope violations for all 97 monitored employees.
                </p>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#10b981' }}>▼ Down 4 points vs. last week</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '22px' }}>
              <div style={{ backgroundColor: theme.surface, padding: '20px 22px', borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: theme.textPrimary }}>5</div>
                <div style={{ fontSize: '13px', color: theme.textSecondary, marginTop: '2px' }}>High risk employees</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#ef4444', marginTop: '8px' }}>+2 this week</div>
              </div>

              <div style={{ backgroundColor: theme.surface, padding: '20px 22px', borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: theme.textPrimary }}>12</div>
                <div style={{ fontSize: '13px', color: theme.textSecondary, marginTop: '2px' }}>Medium risk employees</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316', marginTop: '8px' }}>+1 this week</div>
              </div>

              <div style={{ backgroundColor: theme.surface, padding: '20px 22px', borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: theme.textPrimary }}>80</div>
                <div style={{ fontSize: '13px', color: theme.textSecondary, marginTop: '2px' }}>Low risk employees</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#10b981', marginTop: '8px' }}>Stable</div>
              </div>
            </div>

            {/* Table Section */}
            <div style={{ backgroundColor: theme.surface, borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: theme.textSecondary, textTransform: 'uppercase' }}>Highest Priority</h3>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['All', 'High', 'Medium', 'Low'].map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setSelectedRiskFilter(risk)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        backgroundColor: selectedRiskFilter === risk ? theme.primary : theme.surfaceVariant,
                        color: selectedRiskFilter === risk ? '#ffffff' : theme.textSecondary,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              </div>

              <table style={{ width: '100%', textAlign: 'left', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: theme.textSecondary, borderBottom: `1px solid ${theme.border}`, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
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
                        backgroundColor: hoveredRow === emp.id ? theme.surfaceHover : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: emp.avatarBg, color: emp.avatarColor, fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{emp.initial}</div>
                        <div>
                          <div style={{ fontWeight: '600', color: theme.textPrimary }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: theme.textSecondary }}>ID {emp.id}</div>
                        </div>
                      </td>
                      <td style={{ color: theme.textSecondary }}>{emp.department}</td>
                      <td>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          backgroundColor: emp.riskLevel === 'High' ? theme.highBg : emp.riskLevel === 'Medium' ? theme.medBg : theme.lowBg, 
                          color: emp.riskLevel === 'High' ? theme.highText : emp.riskLevel === 'Medium' ? theme.medText : theme.lowText,
                          border: `1px solid ${emp.riskLevel === 'High' ? theme.highText : emp.riskLevel === 'Medium' ? theme.medText : theme.lowText}33`
                        }}>
                          • {emp.riskLevel}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: theme.textPrimary }}>▲ {emp.score}</td>
                      <td style={{ color: theme.textSecondary }}>{emp.lastActivity}</td>
                      <td style={{ textAlign: 'right', color: theme.textSecondary }}>{emp.seen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Employees View */}
        {activeTab === 'Employees' && (
          <div style={{ backgroundColor: theme.surface, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: theme.shadow }}>
            <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>Monitored Personnel Directory (97 Monitored)</h2>
            <table style={{ width: '100%', textAlign: 'left', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: theme.textSecondary, borderBottom: `1px solid ${theme.border}`, textTransform: 'uppercase', fontSize: '11px' }}>
                  <th style={{ paddingBottom: '12px' }}>Employee</th>
                  <th style={{ paddingBottom: '12px' }}>Department</th>
                  <th style={{ paddingBottom: '12px' }}>Current Risk</th>
                  <th style={{ paddingBottom: '12px' }}>Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={{ padding: '12px 0', fontWeight: '600' }}>{emp.name} (ID {emp.id})</td>
                    <td style={{ color: theme.textSecondary }}>{emp.department}</td>
                    <td><span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', backgroundColor: emp.riskLevel === 'High' ? theme.highBg : emp.riskLevel === 'Medium' ? theme.medBg : theme.lowBg, color: emp.riskLevel === 'High' ? theme.highText : emp.riskLevel === 'Medium' ? theme.medText : theme.lowText }}>• {emp.riskLevel}</span></td>
                    <td style={{ fontWeight: '700' }}>{emp.score} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Risk Analysis View */}
        {activeTab === 'Risk Analysis' && (
          <div style={{ backgroundColor: theme.surface, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: theme.shadow }}>
            <h2 style={{ fontSize: '18px', margin: '0 0 12px 0' }}>Behavioral Threat Analytics</h2>
            <p style={{ color: theme.textSecondary, marginBottom: '20px' }}>Breakdown of monitored risk vectors across departments over the last 30 days.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, backgroundColor: theme.surfaceVariant, padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSecondary }}>DATA EXFILTRATION</div>
                <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>42 Incidents</div>
              </div>
              <div style={{ flex: 1, backgroundColor: theme.surfaceVariant, padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSecondary }}>LOGIN ANOMALIES</div>
                <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>18 Incidents</div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts View */}
        {activeTab === 'Alerts' && (
          <div style={{ backgroundColor: theme.surface, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: theme.shadow }}>
            <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>Active System Security Alerts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alerts.map((alt) => (
                <div key={alt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: theme.surfaceVariant, borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: theme.textPrimary }}>{alt.title} — <span style={{ color: theme.highText }}>{alt.severity}</span></div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '4px' }}>Target: {alt.target} · {alt.time}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '6px', backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
                    {alt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Slide-Out Drawer Panel */}
      {selectedEmployee && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '360px', height: '100vh', backgroundColor: theme.surface, borderLeft: `1px solid ${theme.border}`, boxShadow: '-4px 0 20px rgba(0,0,0,0.2)', padding: '28px', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '17px', color: theme.textPrimary }}>Threat Details</h2>
              <button onClick={() => setSelectedEmployee(null)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: theme.textSecondary }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: selectedEmployee.avatarBg, color: selectedEmployee.avatarColor, fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedEmployee.initial}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: theme.textPrimary }}>{selectedEmployee.name}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: theme.textSecondary }}>{selectedEmployee.department} · ID {selectedEmployee.id}</p>
              </div>
            </div>

            <div style={{ backgroundColor: theme.surfaceVariant, padding: '14px', borderRadius: '8px', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>Behavioral Incident</div>
              <div style={{ fontSize: '13px', color: theme.textPrimary, lineHeight: '1.4' }}>{selectedEmployee.details}</div>
            </div>

            <div style={{ fontSize: '13px', color: theme.textSecondary, lineHeight: '1.6' }}>
              <div><strong>Risk Score:</strong> {selectedEmployee.score} / 100</div>
              <div><strong>Status:</strong> {selectedEmployee.riskLevel} Risk</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => handleLockAccount(selectedEmployee.id)}
              style={{ flex: 1, padding: '9px', borderRadius: '6px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              Lock Account
            </button>
            <button 
              onClick={() => handleDismissFlag(selectedEmployee.id)}
              style={{ flex: 1, padding: '9px', borderRadius: '6px', backgroundColor: theme.surfaceVariant, color: theme.textPrimary, border: `1px solid ${theme.border}`, fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              Dismiss Flag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}