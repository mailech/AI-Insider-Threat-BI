import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  TrendingDown,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Calendar,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight
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

export default function RiskAnalysisPage({ employees = [], alerts = [] }) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Timeframe selector state ('7d' | '30d' | '90d')
  const [timeframe, setTimeframe] = useState('30d');

  // Selected trajectory dataset based on timeframe
  const trajectoryData = useMemo(() => {
    if (timeframe === '7d') return trajectory7d;
    if (timeframe === '90d') return trajectory90d;
    return trajectory30d;
  }, [timeframe]);

  // Derived metrics from active employees state
  const metrics = useMemo(() => {
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

  // Derived department analytics
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

    const colors = {
      Legal: '#ef4444',
      Finance: '#f97316',
      Engineering: '#6366f1',
      DevOps: '#f59e0b',
      HR: '#10b981'
    };

    return Object.values(deptMap).map((d) => ({
      department: d.department,
      avgScore: Math.round(d.totalScore / d.count),
      identities: d.count,
      highRisk: d.highCount,
      color: colors[d.department] || '#818cf8'
    }));
  }, [employees]);

  // Top high-risk employees (sorted by score descending)
  const topHighRiskEmployees = useMemo(() => {
    return [...employees]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 4);
  }, [employees]);

  // Donut chart dataset for risk tier distribution
  const riskTierData = useMemo(() => {
    return [
      { name: 'High Risk', value: metrics.highCount, color: '#ef4444' },
      { name: 'Medium Risk', value: metrics.mediumCount, color: '#f97316' },
      { name: 'Low Risk', value: metrics.lowCount, color: '#10b981' }
    ];
  }, [metrics]);

  // Theme-aware tooltip style
  const tooltipStyle = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: '8px',
    color: theme.textPrimary,
    fontSize: '12px',
    boxShadow: theme.shadow
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ================================================= */}
      {/* 1. TOP POSTURE BANNER & CONTROLS                  */}
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
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} color={theme.primary} />
            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: theme.textPrimary }}>
              Enterprise Risk & Behavioral Analytics
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSecondary }}>
            Longitudinal threat modeling, anomaly cluster distribution, and behavioral vector baselines.
          </p>
        </div>

        {/* Timeframe Selector Pill Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: theme.textSecondary, marginRight: '4px' }}>
            Range:
          </span>
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' }
          ].map((tf) => {
            const isSelected = timeframe === tf.key;
            return (
              <button
                key={tf.key}
                onClick={() => setTimeframe(tf.key)}
                style={{
                  padding: '6px 13px',
                  borderRadius: '7px',
                  border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                  backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                  color: isSelected ? '#ffffff' : theme.textSecondary,
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================= */}
      {/* 2. OVERALL RISK POSTURE KPI METRICS               */}
      {/* ================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px'
        }}
      >
        {/* Composite Risk Score Card */}
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
              Composite Risk Index
            </span>
            <RiskBadge riskLevel={metrics.avgScore > 50 ? 'High' : metrics.avgScore > 30 ? 'Medium' : 'Low'} size="small" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: theme.textPrimary, marginTop: '8px', lineHeight: 1 }}>
            {metrics.avgScore}
            <span style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: '500' }}> / 100</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#10b981', marginTop: '8px', fontWeight: '600' }}>
            <TrendingDown size={14} />
            Down 4 pts vs prior period
          </div>
        </div>

        {/* High Risk Tier Count */}
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
              Critical & High Threats
            </span>
            <Flame size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444', marginTop: '8px', lineHeight: 1 }}>
            {metrics.highCount}
            <span style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: '500' }}> ({metrics.highPct}%)</span>
          </div>
          <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '8px' }}>
            Requiring immediate containment
          </div>
        </div>

        {/* Medium Risk Tier Count */}
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
              Elevated Watchlist
            </span>
            <AlertTriangle size={18} color="#f97316" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#f97316', marginTop: '8px', lineHeight: 1 }}>
            {metrics.mediumCount}
            <span style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: '500' }}> ({metrics.mediumPct}%)</span>
          </div>
          <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '8px' }}>
            Flagged for behavioral inspection
          </div>
        </div>

        {/* Baseline / Low Risk Tier Count */}
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
              Standard Baselines
            </span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', marginTop: '8px', lineHeight: 1 }}>
            {metrics.lowCount}
            <span style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: '500' }}> ({metrics.lowPct}%)</span>
          </div>
          <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '8px' }}>
            Operating within normal scope
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* 3. ROW 1 CHARTS: TRAJECTORY & DISTRIBUTION        */}
      {/* ================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '24px'
        }}
      >
        {/* Longitudinal Risk Score Trajectory (AreaChart) */}
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
              <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textSecondary, margin: 0 }}>
                Organizational Risk Trajectory ({timeframe.toUpperCase()})
              </h3>
              <p style={{ fontSize: '12px', color: theme.textSecondary, margin: '2px 0 0 0' }}>
                Daily composite score and anomaly event velocity trendline.
              </p>
            </div>
            <span style={{ fontSize: '11.5px', fontWeight: '600', color: theme.primary, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> {timeframe === '7d' ? 'Past 7 Days' : timeframe === '90d' ? 'Past Quarter' : 'Past Month'}
            </span>
          </div>

          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.primary} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={theme.primary} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="anomaliesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.borderSubtle} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={theme.textSecondary}
                  fontSize={11.5}
                  tickLine={false}
                  axisLine={{ stroke: theme.border }}
                />
                <YAxis
                  stroke={theme.textSecondary}
                  fontSize={11.5}
                  tickLine={false}
                  axisLine={{ stroke: theme.border }}
                  domain={[0, 'dataMax + 5']}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value) => (value === 'compositeScore' ? 'Composite Score' : 'Flagged Anomalies')}
                />
                <Area
                  type="monotone"
                  dataKey="compositeScore"
                  stroke={theme.primary}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#scoreGradient)"
                  name="compositeScore"
                />
                <Area
                  type="monotone"
                  dataKey="anomalies"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#anomaliesGradient)"
                  name="anomalies"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workforce Risk Tier Distribution (Donut Chart) */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '24px',
            boxShadow: theme.shadow,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textSecondary, margin: '0 0 4px 0' }}>
              Workforce Risk Tier Breakdown
            </h3>
            <p style={{ fontSize: '12px', color: theme.textSecondary, margin: 0 }}>
              Distribution of all {metrics.total} monitored endpoint identities by threat level.
            </p>
          </div>

          <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskTierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskTierData.map((entry, index) => (
                    <Cell key={`tier-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Tier Legend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingTop: '12px', borderTop: `1px solid ${theme.border}` }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#ef4444', fontWeight: '700' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                High
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '2px' }}>{metrics.highCount} ({metrics.highPct}%)</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#f97316', fontWeight: '700' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                Medium
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '2px' }}>{metrics.mediumCount} ({metrics.mediumPct}%)</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#10b981', fontWeight: '700' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Low
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '2px' }}>{metrics.lowCount} ({metrics.lowPct}%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* 4. ROW 2 CHARTS: DEPARTMENT BREAKDOWN & VECTORS   */}
      {/* ================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '24px'
        }}
      >
        {/* Department Average Risk Comparison (BarChart) */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '24px',
            boxShadow: theme.shadow
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textSecondary, margin: '0 0 4px 0' }}>
              Department Risk Index Comparison
            </h3>
            <p style={{ fontSize: '12px', color: theme.textSecondary, margin: 0 }}>
              Average composite risk score per organizational business unit.
            </p>
          </div>

          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  domain={[0, 100]}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avgScore" radius={[6, 6, 0, 0]} name="Average Score">
                  {departmentData.map((entry, index) => (
                    <Cell key={`dept-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Vector Observed vs Baseline Comparison */}
        <div
          style={{
            backgroundColor: theme.surface,
            borderRadius: '14px',
            border: `1px solid ${theme.border}`,
            padding: '24px',
            boxShadow: theme.shadow
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textSecondary, margin: '0 0 4px 0' }}>
              Observed Vector Velocity vs. Baseline
            </h3>
            <p style={{ fontSize: '12px', color: theme.textSecondary, margin: 0 }}>
              Comparison of active endpoint incident rates against enterprise policy thresholds.
            </p>
          </div>

          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={threatVectorsBenchmark}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.borderSubtle} horizontal={false} />
                <XAxis type="number" stroke={theme.textSecondary} fontSize={11.5} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="vector"
                  stroke={theme.textSecondary}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: theme.border }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11.5px', paddingTop: '8px' }} />
                <Bar dataKey="observed" fill={theme.primary} radius={[0, 6, 6, 0]} name="Observed Incidents" />
                <Bar dataKey="baseline" fill={theme.textSecondary} opacity={0.35} radius={[0, 6, 6, 0]} name="Baseline Threshold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* 5. TOP HIGH-RISK IDENTITIES TRIAGE PANEL          */}
      {/* ================================================= */}
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '24px 28px',
          boxShadow: theme.shadow
        }}
      >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#ef4444" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: theme.textPrimary }}>
                High-Priority Threat Entities
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: theme.textSecondary }}>
              Identities currently exhibiting the most severe behavioral risk deviations. Click to inspect full dossier.
            </p>
          </div>

          <button
            onClick={() => navigate('/employees')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surfaceVariant,
              color: theme.textPrimary,
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <span>View All Monitored Identities</span>
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Identity Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}
        >
          {topHighRiskEmployees.map((emp, index) => (
            <div
              key={emp.id}
              onClick={() => navigate(`/employees/${emp.id}`)}
              style={{
                backgroundColor: theme.surfaceVariant,
                border: `1px solid ${theme.borderSubtle}`,
                borderRadius: '12px',
                padding: '18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.primary;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.borderSubtle;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                {/* Header: Rank + Avatar + RiskBadge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: theme.textSecondary,
                        width: '18px'
                      }}
                    >
                      #{index + 1}
                    </span>
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
                        fontSize: '11.5px'
                      }}
                    >
                      {emp.initial}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13.5px', color: theme.textPrimary }}>
                        {emp.name}
                      </div>
                      <div style={{ fontSize: '11px', color: theme.textSecondary }}>
                        ID #{emp.id} · {emp.department}
                      </div>
                    </div>
                  </div>

                  <RiskBadge riskLevel={emp.riskLevel} size="small" />
                </div>

                {/* Score Progress Bar */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                    <span style={{ color: theme.textSecondary }}>Threat Index:</span>
                    <span style={{ fontWeight: '800', color: emp.score > 70 ? '#ef4444' : '#f97316' }}>
                      {emp.score} / 100
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '5px',
                      borderRadius: '3px',
                      backgroundColor: theme.border,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${emp.score}%`,
                        height: '100%',
                        backgroundColor: emp.score > 70 ? '#ef4444' : '#f97316'
                      }}
                    />
                  </div>
                </div>

                {/* Primary Trigger Note */}
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: theme.textSecondary,
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {emp.details}
                </p>
              </div>

              {/* Card Footer Link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: `1px solid ${theme.borderSubtle}`,
                  fontSize: '11.5px',
                  fontWeight: '600',
                  color: theme.primary
                }}
              >
                <span>Inspect Dossier</span>
                <ArrowUpRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
