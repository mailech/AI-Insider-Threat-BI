import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Printer,
  Flame,
  ShieldCheck,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

import { useTheme } from '../context/ThemeContext';
import RiskBadge from '../components/common/RiskBadge';
import {
  trajectory7d,
  trajectory30d,
  trajectory90d,
  threatVectorsBenchmark
} from '../data/mockRiskAnalytics';

const DEPT_COLORS = {
  Legal: '#ef4444',
  Finance: '#f97316',
  Engineering: '#6366f1',
  DevOps: '#f59e0b',
  HR: '#10b981'
};

const SEVERITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981'
};

export default function AnalyticsPage({ employees = [], alerts = [] }) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Active view mode: 'analytics' | 'report'
  const [viewMode, setViewMode] = useState('analytics');

  // Timeframe selector state ('7d' | '30d' | '90d')
  const [timeframe, setTimeframe] = useState('30d');

  // Selected trajectory dataset based on timeframe
  const trajectoryData = useMemo(() => {
    if (timeframe === '7d') return trajectory7d;
    if (timeframe === '90d') return trajectory90d;
    return trajectory30d;
  }, [timeframe]);

  // Derived employee risk metrics
  const employeeMetrics = useMemo(() => {
    const total = employees.length || 1;
    const high = employees.filter((e) => e.riskLevel === 'High');
    const medium = employees.filter((e) => e.riskLevel === 'Medium');
    const low = employees.filter((e) => e.riskLevel === 'Low');
    const totalScore = employees.reduce((sum, e) => sum + (e.score || 0), 0);
    const avgScore = Math.round(totalScore / total);

    return {
      total,
      highCount: high.length,
      mediumCount: medium.length,
      lowCount: low.length,
      highPct: Math.round((high.length / total) * 100),
      mediumPct: Math.round((medium.length / total) * 100),
      lowPct: Math.round((low.length / total) * 100),
      avgScore
    };
  }, [employees]);

  // Derived alert metrics
  const alertMetrics = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((a) => a.severity === 'Critical').length;
    const high = alerts.filter((a) => a.severity === 'High').length;
    const medium = alerts.filter((a) => a.severity === 'Medium').length;
    const low = alerts.filter((a) => a.severity === 'Low').length;

    const unresolved = alerts.filter((a) => a.status === 'Unresolved').length;
    const investigating = alerts.filter((a) => a.status === 'Investigating').length;
    const resolved = alerts.filter((a) => a.status === 'Resolved').length;

    // Severity dataset for BarChart
    const severityData = [
      { severity: 'Critical', count: critical, color: SEVERITY_COLORS.Critical },
      { severity: 'High', count: high, color: SEVERITY_COLORS.High },
      { severity: 'Medium', count: medium, color: SEVERITY_COLORS.Medium },
      { severity: 'Low', count: low, color: SEVERITY_COLORS.Low }
    ];

    // Status dataset
    const statusData = [
      { status: 'Unresolved', count: unresolved, color: '#ef4444' },
      { status: 'Investigating', count: investigating, color: '#f97316' },
      { status: 'Resolved', count: resolved, color: '#10b981' }
    ];

    // Category breakdown
    const categoryMap = {};
    alerts.forEach((alt) => {
      const cat = alt.category || 'Behavioral Anomaly';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const categoryData = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      count: categoryMap[cat]
    }));

    return {
      total,
      critical,
      high,
      medium,
      low,
      unresolved,
      investigating,
      resolved,
      severityData,
      statusData,
      categoryData
    };
  }, [alerts]);

  // Derived Department Analytics
  const departmentData = useMemo(() => {
    const deptMap = {};
    employees.forEach((emp) => {
      const dept = emp.department || 'Other';
      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, count: 0, totalScore: 0, highCount: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].totalScore += emp.score || 0;
      if (emp.riskLevel === 'High') deptMap[dept].highCount += 1;
    });

    // Cross-reference alerts per department
    alerts.forEach((alt) => {
      const dept = alt.department;
      if (dept && deptMap[dept]) {
        deptMap[dept].alertCount = (deptMap[dept].alertCount || 0) + 1;
      }
    });

    return Object.values(deptMap).map((d) => ({
      department: d.department,
      avgScore: Math.round(d.totalScore / d.count),
      identities: d.count,
      highRisk: d.highCount,
      alerts: d.alertCount || 0,
      color: DEPT_COLORS[d.department] || '#818cf8'
    }));
  }, [employees, alerts]);

  // Top high-risk employees
  const topHighRiskEmployees = useMemo(() => {
    return [...employees]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
  }, [employees]);

  // Risk tier donut dataset
  const riskTierData = useMemo(() => {
    return [
      { name: 'High Risk', value: employeeMetrics.highCount, color: '#ef4444' },
      { name: 'Medium Risk', value: employeeMetrics.mediumCount, color: '#f97316' },
      { name: 'Low Risk', value: employeeMetrics.lowCount, color: '#10b981' }
    ];
  }, [employeeMetrics]);

  // Theme-aware tooltip style
  const tooltipStyle = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: '8px',
    color: theme.textPrimary,
    fontSize: '12px',
    boxShadow: theme.shadow
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ================================================= */}
      {/* 1. TOP HEADER & VIEW MODE CONTROLS                */}
      {/* ================================================= */}
      <div
        className="no-print"
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '22px 28px',
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
            {viewMode === 'analytics' ? (
              <BarChart3 size={22} color={theme.primary} />
            ) : (
              <FileText size={22} color={theme.primary} />
            )}
            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: theme.textPrimary }}>
              {viewMode === 'analytics'
                ? 'Enterprise Cybersecurity Analytics'
                : 'Executive Security Audit & Threat Intelligence Report'}
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSecondary }}>
            {viewMode === 'analytics'
              ? 'Multi-vector telemetry aggregation, longitudinal threat models, and incident distribution trends.'
              : 'Formal CISO insider risk dossier with executive summaries, findings matrix, and risk mitigation directives.'}
          </p>
        </div>

        {/* View Switcher & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: theme.surfaceVariant,
              borderRadius: '8px',
              padding: '3px',
              border: `1px solid ${theme.border}`
            }}
          >
            <button
              onClick={() => setViewMode('analytics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'analytics' ? theme.primary : 'transparent',
                color: viewMode === 'analytics' ? '#ffffff' : theme.textSecondary,
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <BarChart3 size={14} />
              Interactive Analytics
            </button>

            <button
              onClick={() => setViewMode('report')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'report' ? theme.primary : 'transparent',
                color: viewMode === 'report' ? '#ffffff' : theme.textSecondary,
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <FileText size={14} />
              Executive Report
            </button>
          </div>

          {/* Contextual Actions */}
          {viewMode === 'analytics' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {['7d', '30d', '90d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '7px',
                    border: `1px solid ${timeframe === tf ? theme.primary : theme.border}`,
                    backgroundColor: timeframe === tf ? theme.primary : theme.surfaceVariant,
                    color: timeframe === tf ? '#ffffff' : theme.textSecondary,
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: theme.primary,
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} />
              Print / Export PDF
            </button>
          )}
        </div>
      </div>

      {/* ================================================= */}
      {/* 2. MODE A: INTERACTIVE ANALYTICS CONSOLE          */}
      {/* ================================================= */}
      {viewMode === 'analytics' && (
        <>
          {/* Executive KPI Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px'
            }}
          >
            {/* Monitored Identities */}
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
                  Monitored Identities
                </span>
                <ShieldCheck size={18} color={theme.primary} />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: theme.textPrimary, marginTop: '8px', lineHeight: 1 }}>
                {employeeMetrics.total}
              </div>
              <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '6px', display: 'block' }}>
                100% telemetry coverage active
              </span>
            </div>

            {/* Enterprise Threat Index */}
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
                  Composite Threat Index
                </span>
                <RiskBadge riskLevel={employeeMetrics.avgScore > 50 ? 'High' : employeeMetrics.avgScore > 30 ? 'Medium' : 'Low'} size="small" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: theme.textPrimary, marginTop: '8px', lineHeight: 1 }}>
                {employeeMetrics.avgScore}
                <span style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: '500' }}> / 100</span>
              </div>
              <span style={{ fontSize: '12px', color: '#10b981', marginTop: '6px', display: 'block', fontWeight: '600' }}>
                Healthy organizational baseline
              </span>
            </div>

            {/* Active Security Incidents */}
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
                  Open Security Alerts
                </span>
                <Flame size={18} color="#ef4444" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444', marginTop: '8px', lineHeight: 1 }}>
                {alertMetrics.unresolved + alertMetrics.investigating}
              </div>
              <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '6px', display: 'block' }}>
                {alertMetrics.critical} Critical • {alertMetrics.high} High Priority
              </span>
            </div>

            {/* Mean Time to Contain */}
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
                  Mean Time to Contain (MTTC)
                </span>
                <Clock size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', marginTop: '8px', lineHeight: 1 }}>
                42 min
              </div>
              <span style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '6px', display: 'block' }}>
                64% faster than benchmark
              </span>
            </div>
          </div>

          {/* Row 1: Longitudinal Trajectory & Workforce Tier Donut */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '24px'
            }}
          >
            {/* Trajectory AreaChart */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '14px',
                border: `1px solid ${theme.border}`,
                padding: '24px',
                boxShadow: theme.shadow
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, margin: 0 }}>
                    Threat Score & Anomaly Volume Over Time
                  </h3>
                  <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                    Telemetry trend over selected {timeframe.toUpperCase()} period
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', height: '270px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsScoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="analyticsAnomalyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.borderSubtle} vertical={false} />
                    <XAxis dataKey="date" stroke={theme.textSecondary} fontSize={11} tickLine={false} />
                    <YAxis stroke={theme.textSecondary} fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11.5px', paddingTop: '8px' }} />
                    <Area
                      type="monotone"
                      dataKey="compositeScore"
                      name="Composite Score"
                      stroke={theme.primary}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#analyticsScoreGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="anomalies"
                      name="Detected Anomalies"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#analyticsAnomalyGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Workforce Tier Donut */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '14px',
                border: `1px solid ${theme.border}`,
                padding: '24px',
                boxShadow: theme.shadow
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, margin: '0 0 16px 0' }}>
                Workforce Risk Tier Distribution
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '210px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskTierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {riskTierData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend row */}
              <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: `1px solid ${theme.borderSubtle}`, paddingTop: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700' }}>● High Risk</span>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: theme.textPrimary, marginTop: '2px' }}>
                    {employeeMetrics.highCount} ({employeeMetrics.highPct}%)
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#f97316', fontWeight: '700' }}>● Medium Risk</span>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: theme.textPrimary, marginTop: '2px' }}>
                    {employeeMetrics.mediumCount} ({employeeMetrics.mediumPct}%)
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>● Low Risk</span>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: theme.textPrimary, marginTop: '2px' }}>
                    {employeeMetrics.lowCount} ({employeeMetrics.lowPct}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Department Index & Alert Severity Breakdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '24px'
            }}
          >
            {/* Department Comparison */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '14px',
                border: `1px solid ${theme.border}`,
                padding: '24px',
                boxShadow: theme.shadow
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, margin: '0 0 16px 0' }}>
                Department Threat Index & Alert Density
              </h3>

              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.borderSubtle} vertical={false} />
                    <XAxis dataKey="department" stroke={theme.textSecondary} fontSize={11} tickLine={false} />
                    <YAxis stroke={theme.textSecondary} fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11.5px', paddingTop: '8px' }} />
                    <Bar dataKey="avgScore" name="Avg Threat Score" radius={[6, 6, 0, 0]}>
                      {departmentData.map((entry, index) => (
                        <Cell key={`dept-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                    <Bar dataKey="alerts" name="Incident Count" fill={theme.textSecondary} opacity={0.3} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alert Severity Breakdown */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: '14px',
                border: `1px solid ${theme.border}`,
                padding: '24px',
                boxShadow: theme.shadow
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, margin: '0 0 16px 0' }}>
                Incident Distribution by Severity
              </h3>

              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertMetrics.severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.borderSubtle} vertical={false} />
                    <XAxis dataKey="severity" stroke={theme.textSecondary} fontSize={11} tickLine={false} />
                    <YAxis stroke={theme.textSecondary} fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Incident Count" radius={[6, 6, 0, 0]}>
                      {alertMetrics.severityData.map((entry, index) => (
                        <Cell key={`sev-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: Threat Vector Benchmarks */}
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: '14px',
              border: `1px solid ${theme.border}`,
              padding: '24px',
              boxShadow: theme.shadow
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, margin: '0 0 16px 0' }}>
              Threat Vector Analysis: Observed Anomalies vs. Enterprise Baseline
            </h3>

            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={threatVectorsBenchmark} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.borderSubtle} vertical={false} />
                  <XAxis dataKey="vector" stroke={theme.textSecondary} fontSize={11} tickLine={false} />
                  <YAxis stroke={theme.textSecondary} fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11.5px', paddingTop: '8px' }} />
                  <Bar dataKey="observed" name="Observed Activity" fill={theme.primary} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="baseline" name="Established Baseline" fill={theme.textSecondary} opacity={0.3} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 4: Top High-Risk Identity Watchlist */}
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
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: theme.textPrimary }}>
                  Priority Containment Watchlist
                </h3>
                <span style={{ fontSize: '12.5px', color: theme.textSecondary }}>
                  Top monitored identities exhibiting acute risk indicators
                </span>
              </div>
              <button
                onClick={() => navigate('/employees')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.primary,
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Full Workforce Directory <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textSecondary, textTransform: 'uppercase', fontSize: '11px' }}>
                    <th style={{ paddingBottom: '10px', textAlign: 'left' }}>Identity</th>
                    <th style={{ paddingBottom: '10px', textAlign: 'left' }}>Department</th>
                    <th style={{ paddingBottom: '10px', textAlign: 'left' }}>Risk Level</th>
                    <th style={{ paddingBottom: '10px', textAlign: 'left' }}>Threat Score</th>
                    <th style={{ paddingBottom: '10px', textAlign: 'left' }}>Primary Anomaly Indicator</th>
                    <th style={{ paddingBottom: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topHighRiskEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'background-color 0.12s ease' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.surfaceHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: emp.avatarBg,
                              color: emp.avatarColor,
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px'
                            }}
                          >
                            {emp.initial}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: theme.textPrimary }}>{emp.name}</div>
                            <div style={{ fontSize: '11px', color: theme.textSecondary }}>ID #{emp.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: theme.textSecondary }}>{emp.department}</td>
                      <td>
                        <RiskBadge riskLevel={emp.riskLevel} size="small" />
                      </td>
                      <td style={{ fontWeight: '800', color: emp.score > 70 ? '#ef4444' : '#f97316' }}>
                        {emp.score} / 100
                      </td>
                      <td style={{ color: theme.textSecondary, maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp.details}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: theme.primary, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          Dossier <ExternalLink size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================================================= */}
      {/* 3. MODE B: EXECUTIVE SECURITY AUDIT REPORT        */}
      {/* ================================================= */}
      {viewMode === 'report' && (
        <div
          id="printable-report"
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '36px 42px',
            boxShadow: theme.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: '30px'
          }}
        >
          {/* Report Metadata Header */}
          <div style={{ borderBottom: `2px solid ${theme.border}`, paddingBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.08em',
                    color: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}
                >
                  CONFIDENTIAL // SOC EXECUTIVE AUDIT
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: theme.textPrimary, margin: '10px 0 4px 0' }}>
                  Insider Threat Behavioral Intelligence Report
                </h2>
                <span style={{ fontSize: '13px', color: theme.textSecondary }}>
                  Enterprise Security Operations Center (SOC) • Behavioral Analytics Division
                </span>
              </div>

              <div style={{ textAlign: 'right', fontSize: '12px', color: theme.textSecondary }}>
                <div><strong>Report ID:</strong> SOC-RPT-2026-Q3</div>
                <div><strong>Reporting Window:</strong> Past 30 Days</div>
                <div><strong>Classification:</strong> RESTRICTED // INTERNAL</div>
                <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          {/* Executive Summary Narrative */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', color: theme.textPrimary, margin: '0 0 12px 0' }}>
              1. Executive Summary & Strategic Assessment
            </h3>
            <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: theme.textPrimary, margin: '0 0 12px 0' }}>
              During the audited 30-day reporting cycle, the insider threat telemetry pipeline monitored{' '}
              <strong>{employeeMetrics.total} corporate identities</strong> across all operational units.
              The enterprise composite risk index stands at <strong>{employeeMetrics.avgScore} / 100</strong>, indicating a controlled security posture with isolated clusters of elevated behavioral anomalies.
            </p>
            <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: theme.textPrimary, margin: 0 }}>
              A total of <strong>{alertMetrics.total} security alerts</strong> were recorded, with{' '}
              <strong>{alertMetrics.critical} classified as Critical</strong> and{' '}
              <strong>{alertMetrics.high} as High priority</strong>. To date, {alertMetrics.resolved} incidents have been verified and mitigated, while {alertMetrics.investigating + alertMetrics.unresolved} cases remain in active triage.
            </p>
          </div>

          {/* Key Findings Bullet Grid */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', color: theme.textPrimary, margin: '0 0 14px 0' }}>
              2. Critical Security Findings & Exposure Vectors
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: theme.surfaceVariant, padding: '16px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ShieldAlert size={16} color="#ef4444" />
                  <strong style={{ fontSize: '13px', color: theme.textPrimary }}>Data Movement Velocity</strong>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: theme.textSecondary, lineHeight: 1.5 }}>
                  Data exfiltration remains the highest-impact threat vector, highlighted by unauthorized bulk contract archives in Legal.
                </p>
              </div>

              <div style={{ backgroundColor: theme.surfaceVariant, padding: '16px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Flame size={16} color="#f97316" />
                  <strong style={{ fontSize: '13px', color: theme.textPrimary }}>Geographic Credential Anomalies</strong>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: theme.textSecondary, lineHeight: 1.5 }}>
                  Multiple impossible-travel and off-hours VPN authentications were detected and contained in the Finance division.
                </p>
              </div>

              <div style={{ backgroundColor: theme.surfaceVariant, padding: '16px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <strong style={{ fontSize: '13px', color: theme.textPrimary }}>Rapid Mitigation Efficacy</strong>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: theme.textSecondary, lineHeight: 1.5 }}>
                  Mean time to contain (MTTC) clocked in at 42 minutes, representing top-quartile containment performance.
                </p>
              </div>
            </div>
          </div>

          {/* Department Posture Matrix Table */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', color: theme.textPrimary, margin: '0 0 14px 0' }}>
              3. Departmental Risk Exposure Matrix
            </h3>
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textSecondary, textTransform: 'uppercase', fontSize: '11px' }}>
                    <th style={{ padding: '10px 0', textAlign: 'left' }}>Department</th>
                    <th style={{ padding: '10px 0', textAlign: 'left' }}>Monitored Personnel</th>
                    <th style={{ padding: '10px 0', textAlign: 'left' }}>High-Risk Count</th>
                    <th style={{ padding: '10px 0', textAlign: 'left' }}>Composite Threat Score</th>
                    <th style={{ padding: '10px 0', textAlign: 'left' }}>Recorded Alerts</th>
                    <th style={{ padding: '10px 0', textAlign: 'right' }}>Security Status</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentData.map((d) => (
                    <tr key={d.department} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px 0', fontWeight: '700', color: theme.textPrimary }}>{d.department}</td>
                      <td style={{ color: theme.textSecondary }}>{d.identities}</td>
                      <td style={{ fontWeight: '700', color: d.highRisk > 0 ? '#ef4444' : theme.textPrimary }}>{d.highRisk}</td>
                      <td style={{ fontWeight: '700', color: d.avgScore > 50 ? '#ef4444' : d.avgScore > 30 ? '#f97316' : '#10b981' }}>
                        {d.avgScore} / 100
                      </td>
                      <td style={{ color: theme.textSecondary }}>{d.alerts}</td>
                      <td style={{ textAlign: 'right' }}>
                        <RiskBadge riskLevel={d.avgScore > 50 ? 'High' : d.avgScore > 30 ? 'Medium' : 'Low'} size="small" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategic Security Directives */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', color: theme.textPrimary, margin: '0 0 12px 0' }}>
              4. Recommended Mitigation Directives
            </h3>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.8, color: theme.textPrimary }}>
              <li><strong>Enforce Automated USB Quarantine:</strong> Restrict external mass storage write capabilities on all endpoints in Legal and Finance.</li>
              <li><strong>Step-Up Adaptive MFA:</strong> Trigger hardware-key FIDO2 challenge for any authentication originating outside home geofences.</li>
              <li><strong>Privilege Role Boundary Audit:</strong> Audit secondary IAM role creation and attach preventive service control policies (SCPs) to development accounts.</li>
              <li><strong>HR Offboarding Telemetry Sync:</strong> Institute automated 14-day flight risk watchlists when departure notices are submitted.</li>
            </ol>
          </div>

          {/* Report Footer & Sign-off */}
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: theme.textSecondary }}>
            <div>
              <span>Sign-off: <strong>Cybersecurity Threat Intelligence Lead</strong></span>
            </div>
            <div>
              <span>Generated by Threat AI Automated Reporting Engine</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
