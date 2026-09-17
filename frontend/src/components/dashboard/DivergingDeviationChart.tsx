'use client';

import React, { useState, useMemo } from 'react';
import type { EmployeeRead, RiskCategory } from '@/types/api';
import BaselineModal from './BaselineModal';

const RISK_COLORS: Record<RiskCategory, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F59E0B',
  MEDIUM:   '#3B82F6',
  LOW:      '#10B981',
};

const RISK_BG: Record<RiskCategory, string> = {
  CRITICAL: 'rgba(239, 68, 68, 0.14)',
  HIGH:     'rgba(245, 158, 11, 0.14)',
  MEDIUM:   'rgba(59, 130, 246, 0.14)',
  LOW:      'rgba(16, 185, 129, 0.14)',
};

const RISK_BORDER: Record<RiskCategory, string> = {
  CRITICAL: 'rgba(239, 68, 68, 0.35)',
  HIGH:     'rgba(245, 158, 11, 0.35)',
  MEDIUM:   'rgba(59, 130, 246, 0.35)',
  LOW:      'rgba(16, 185, 129, 0.35)',
};

const SEVERITY_LABELS: Record<RiskCategory, string> = {
  CRITICAL: 'Critical Spike',
  HIGH:     'High',
  MEDIUM:   'Moderate',
  LOW:      'Normal',
};

function normalizeScore(score: number): number {
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

export interface DeviationMetric {
  id: string;
  name: string;
  category: string;
  icon: string;
  zScore: number;
  deviationPct: number;
  observedLabel: string;
  cohortMeanLabel: string;
  severity: RiskCategory;
  description: string;
}

function parseMetricValue(label: string): number {
  const cleaned = label.replace(/,/g, '').trim().toLowerCase();
  const match = cleaned.match(/^([\d.]+)\s*(gb|mb|kb|files|file|sessions|session|ops|op|attempts|attempt)?/);
  if (!match) return 0;

  let value = parseFloat(match[1]);
  const unit = match[2] ?? '';

  if (unit === 'gb') return value * 1024;
  if (unit === 'mb') return value;
  if (unit === 'kb') return value / 1024;
  return value;
}

const WINDOW_DAYS = 7;

interface ChartPoint {
  x: number;
  y: number;
}

function hashMetricSeed(id: string, empId: string): number {
  let hash = 0;
  const str = `${empId}-${id}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface DailyTrendData {
  values: number[];
  labels: string[];
  fullDates: string[];
}

function generateMetricDailyTrend(
  metric: DeviationMetric,
  empId: string,
): DailyTrendData {
  const seed = hashMetricSeed(metric.id, empId);
  const labels: string[] = [];
  const fullDates: string[] = [];
  const weights: number[] = [];
  const today = new Date();
  const isElevated = metric.severity !== 'LOW';

  for (let d = 0; d < WINDOW_DAYS; d++) {
    const progress = WINDOW_DAYS > 1 ? d / (WINDOW_DAYS - 1) : 1;
    const jitter = ((seed * (d + 3)) % 20) / 100;
    const w = isElevated
      ? 0.25 + 0.75 * Math.pow(progress, 1.4) + jitter
      : 0.85 + jitter * 0.3;
    weights.push(w);

    const date = new Date(today);
    date.setDate(today.getDate() - (WINDOW_DAYS - 1 - d));
    fullDates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    labels.push(
      d === WINDOW_DAYS - 1
        ? 'Today'
        : date.toLocaleDateString('en-US', { weekday: 'short' }),
    );
  }

  const observed = parseMetricValue(metric.observedLabel);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const values = weights.map((w) => (observed * w) / weightSum);
  return { values, labels, fullDates };
}

function getDailyBaseline(metric: DeviationMetric): number {
  return parseMetricValue(metric.cohortMeanLabel) / WINDOW_DAYS;
}

function buildSmoothLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

const BASELINE_LINE_COLOR = '#38BDF8';

function getObservedLineColor(metric: DeviationMetric): string {
  if (metric.severity === 'CRITICAL') return RISK_COLORS.CRITICAL;
  if (metric.severity === 'HIGH') return RISK_COLORS.HIGH;
  if (metric.severity === 'MEDIUM') return RISK_COLORS.MEDIUM;
  return '#10B981';
}

function isStorageMetric(metric: DeviationMetric): boolean {
  return metric.id === 'exfil' || metric.id === 'media';
}

function formatChartValue(value: number, metric: DeviationMetric): string {
  if (isStorageMetric(metric)) {
    if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
    if (value >= 1) return `${value.toFixed(1)} MB`;
    return `${(value * 1024).toFixed(0)} KB`;
  }

  const unit = metric.observedLabel.replace(/^[\d,.]+\s*/, '').trim() || 'units';
  if (value < 1 && value > 0) return `${value.toFixed(1)} ${unit}`;
  return `${Math.round(value)} ${unit}`;
}

function computeDeviationPct(employee: number, baseline: number): string {
  if (baseline <= 0) return employee > 0 ? '+100%' : '0%';
  const pct = ((employee - baseline) / baseline) * 100;
  const rounded = Math.round(pct);
  return rounded >= 0 ? `+${rounded}%` : `${rounded}%`;
}

interface YAxisConfig {
  minY: number;
  maxY: number;
  useLog: boolean;
  ticks: number[];
}

function buildLinearTicks(maxY: number, baseline: number, tickCount = 4): number[] {
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    ticks.push((maxY / (tickCount - 1)) * i);
  }
  if (baseline > 0) {
    const hasBaselineTick = ticks.some((t) => Math.abs(t - baseline) / maxY < 0.04);
    if (!hasBaselineTick) ticks.push(baseline);
  }
  return [...new Set(ticks.map((t) => Math.round(t * 1000) / 1000))].sort((a, b) => a - b);
}

function buildLogTicks(minY: number, maxY: number, baseline: number): number[] {
  const ticks: number[] = [];
  const startExp = Math.floor(Math.log10(Math.max(minY, 0.1)));
  const endExp = Math.ceil(Math.log10(Math.max(maxY, 0.1)));
  for (let e = startExp; e <= endExp; e++) {
    ticks.push(Math.pow(10, e));
  }
  if (baseline > 0 && !ticks.some((t) => Math.abs(t - baseline) / baseline < 0.15)) {
    ticks.push(baseline);
  }
  return [...new Set(ticks)].sort((a, b) => a - b);
}

function computeYAxisConfig(peakObserved: number, baselineValue: number): YAxisConfig {
  const peak = Math.max(peakObserved, 0.001);
  const baseline = Math.max(baselineValue, 0);
  const ratio = baseline > 0 ? peak / baseline : Infinity;
  const useLog = baseline > 0 && ratio > 8;

  if (useLog) {
    const minY = Math.max(baseline * 0.4, peak * 0.008, 0.1);
    const minBound = Math.pow(10, Math.floor(Math.log10(minY)));
    const maxBound = Math.pow(10, Math.ceil(Math.log10(peak * 1.12)));
    return {
      minY: minBound,
      maxY: maxBound,
      useLog: true,
      ticks: buildLogTicks(minBound, maxBound, baseline),
    };
  }

  const dataMax = Math.max(peak, baseline, 0.001);
  let maxY = dataMax * 1.15;
  if (baseline > 0 && baseline < dataMax * 0.35) {
    maxY = Math.max(peak * 1.1, baseline / 0.35);
  }

  return {
    minY: 0,
    maxY,
    useLog: false,
    ticks: buildLinearTicks(maxY, baseline),
  };
}

function valueToPlotY(
  value: number,
  yConfig: YAxisConfig,
  padTop: number,
  plotH: number,
): number {
  if (yConfig.useLog) {
    const logMin = Math.log10(Math.max(yConfig.minY, 0.1));
    const logMax = Math.log10(Math.max(yConfig.maxY, 0.1));
    const logV = Math.log10(Math.max(value, yConfig.minY, 0.1));
    const ratio = (logV - logMin) / Math.max(logMax - logMin, 0.001);
    return padTop + plotH - ratio * plotH;
  }
  return padTop + plotH - (value / yConfig.maxY) * plotH;
}

function BaselineReferenceLine({
  y,
  plotLeft,
  plotRight,
  label,
}: {
  y: number;
  plotLeft: number;
  plotRight: number;
  label: string;
}): React.ReactElement {
  return (
    <g aria-label={`Baseline Threshold: ${label}`}>
      <line
        x1={plotLeft}
        y1={y}
        x2={plotRight}
        y2={y}
        stroke={BASELINE_LINE_COLOR}
        strokeWidth="2"
        strokeDasharray="5 5"
        style={{ filter: 'drop-shadow(0 0 3px rgba(56, 189, 248, 0.55))' }}
      />
      <text
        x={plotRight - 2}
        y={Math.max(y - 7, 12)}
        textAnchor="end"
        fill={BASELINE_LINE_COLOR}
        fontSize="8"
        fontWeight="700"
        fontFamily="var(--font-mono)"
      >
        Baseline Threshold: {label}
      </text>
    </g>
  );
}

function getEmployeeDeviationMetrics(emp: EmployeeRead): DeviationMetric[] {
  const normScore = normalizeScore(emp.risk_score);
  const isCritical = normScore >= 80;
  const isHighRisk = normScore >= 60;

  if (isCritical) {
    return [
      {
        id: 'exfil',
        name: 'File Uploads & Exfiltration',
        category: 'DATA TRANSFERS',
        icon: '📤',
        zScore: 15.8,
        deviationPct: 6079,
        observedLabel: '21.9 GB',
        cohortMeanLabel: '355 MB',
        severity: 'CRITICAL',
        description: 'Exceeds 99.8th percentile of departmental baseline. Outbound external cloud transfer spike.',
      },
      {
        id: 'media',
        name: 'Removable USB / Local Media',
        category: 'ENDPOINT ACTIVITY',
        icon: '💾',
        zScore: 14.0,
        deviationPct: 6300,
        observedLabel: '3.2 GB',
        cohortMeanLabel: '0 MB',
        severity: 'CRITICAL',
        description: 'Direct mass copy to unencrypted USB flash drive.',
      },
      {
        id: 'downloads',
        name: 'Bulk Intellectual Property Downloads',
        category: 'DOCUMENT ACCESS',
        icon: '📥',
        zScore: 12.1,
        deviationPct: 3916,
        observedLabel: '4,820 files',
        cohortMeanLabel: '120 files',
        severity: 'CRITICAL',
        description: 'Automated retrieval from central Git & Sharepoint document repositories.',
      },
      {
        id: 'privilege',
        name: 'Privileged Admin & Policy Ops',
        category: 'IAM & AUTH',
        icon: '🔑',
        zScore: 9.2,
        deviationPct: 3900,
        observedLabel: '8 ops',
        cohortMeanLabel: '0.2 ops',
        severity: 'HIGH',
        description: 'Cloud IAM security policy modifications and credential rotation requests.',
      },
      {
        id: 'off_hours',
        name: 'Off-Hours & Weekend Logons',
        category: 'AUTHENTICATION',
        icon: '🌙',
        zScore: 8.4,
        deviationPct: 1650,
        observedLabel: '14 sessions',
        cohortMeanLabel: '0.8 sessions',
        severity: 'HIGH',
        description: 'Recurring VPN logins logged between 01:00 AM and 04:00 AM.',
      },
      {
        id: 'auth_fail',
        name: 'Failed Authentication & SSO Errors',
        category: 'IDENTITY',
        icon: '⚠️',
        zScore: 6.5,
        deviationPct: 1300,
        observedLabel: '28 attempts',
        cohortMeanLabel: '2 attempts',
        severity: 'MEDIUM',
        description: 'Multiple failed Kerberos & SSO password re-entries before elevated privilege token grant.',
      },
    ];
  } else if (isHighRisk) {
    return [
      {
        id: 'exfil',
        name: 'File Uploads & Exfiltration',
        category: 'DATA TRANSFERS',
        icon: '📤',
        zScore: 7.9,
        deviationPct: 1815,
        observedLabel: '6.8 GB',
        cohortMeanLabel: '355 MB',
        severity: 'HIGH',
        description: 'Elevated outbound traffic to external file sharing services.',
      },
      {
        id: 'downloads',
        name: 'Bulk Intellectual Property Downloads',
        category: 'DOCUMENT ACCESS',
        icon: '📥',
        zScore: 5.6,
        deviationPct: 1108,
        observedLabel: '1,450 files',
        cohortMeanLabel: '120 files',
        severity: 'HIGH',
        description: 'Elevated document retrieval from department shared drives.',
      },
      {
        id: 'off_hours',
        name: 'Off-Hours & Weekend Logons',
        category: 'AUTHENTICATION',
        icon: '🌙',
        zScore: 4.8,
        deviationPct: 775,
        observedLabel: '7 sessions',
        cohortMeanLabel: '0.8 sessions',
        severity: 'HIGH',
        description: 'Unscheduled remote access sessions on non-business days.',
      },
      {
        id: 'privilege',
        name: 'Privileged Admin & Policy Ops',
        category: 'IAM & AUTH',
        icon: '🔑',
        zScore: 4.1,
        deviationPct: 1400,
        observedLabel: '3 ops',
        cohortMeanLabel: '0.2 ops',
        severity: 'MEDIUM',
        description: 'Sudo operations outside standard engineering maintenance windows.',
      },
      {
        id: 'media',
        name: 'Removable USB / Local Media',
        category: 'ENDPOINT ACTIVITY',
        icon: '💾',
        zScore: 3.2,
        deviationPct: 200,
        observedLabel: '150 MB',
        cohortMeanLabel: '0 MB',
        severity: 'MEDIUM',
        description: 'Minor external storage activity detected.',
      },
      {
        id: 'auth_fail',
        name: 'Failed Authentication & SSO Errors',
        category: 'IDENTITY',
        icon: '⚠️',
        zScore: 2.8,
        deviationPct: 350,
        observedLabel: '9 attempts',
        cohortMeanLabel: '2 attempts',
        severity: 'LOW',
        description: 'Within secondary baseline variance; no brute force signatures.',
      },
    ];
  }

  return [
    {
      id: 'exfil',
      name: 'File Uploads & Exfiltration',
      category: 'DATA TRANSFERS',
      icon: '📤',
      zScore: -0.4,
      deviationPct: -21,
      observedLabel: '280 MB',
      cohortMeanLabel: '355 MB',
      severity: 'LOW',
      description: 'Standard daily file sync within expected role envelope.',
    },
    {
      id: 'downloads',
      name: 'Bulk Intellectual Property Downloads',
      category: 'DOCUMENT ACCESS',
      icon: '📥',
      zScore: -0.3,
      deviationPct: -20,
      observedLabel: '95 files',
      cohortMeanLabel: '120 files',
      severity: 'LOW',
      description: 'Normal project-related code and document checkouts.',
    },
    {
      id: 'off_hours',
      name: 'Off-Hours & Weekend Logons',
      category: 'AUTHENTICATION',
      icon: '🌙',
      zScore: -0.9,
      deviationPct: -100,
      observedLabel: '0 sessions',
      cohortMeanLabel: '0.8 sessions',
      severity: 'LOW',
      description: 'Zero after-hours sessions; perfectly aligned with standard 9-5 schedule.',
    },
    {
      id: 'privilege',
      name: 'Privileged Admin & Policy Ops',
      category: 'IAM & AUTH',
      icon: '🔑',
      zScore: -0.5,
      deviationPct: -100,
      observedLabel: '0 ops',
      cohortMeanLabel: '0.2 ops',
      severity: 'LOW',
      description: 'No unprivileged administrative actions or policy changes.',
    },
    {
      id: 'media',
      name: 'Removable USB / Local Media',
      category: 'ENDPOINT ACTIVITY',
      icon: '💾',
      zScore: 0,
      deviationPct: 0,
      observedLabel: '0 MB',
      cohortMeanLabel: '0 MB',
      severity: 'LOW',
      description: 'No USB Mass Storage devices mounted.',
    },
    {
      id: 'auth_fail',
      name: 'Failed Authentication & SSO Errors',
      category: 'IDENTITY',
      icon: '⚠️',
      zScore: -0.6,
      deviationPct: -50,
      observedLabel: '1 attempt',
      cohortMeanLabel: '2 attempts',
      severity: 'LOW',
      description: 'Single isolated typo, immediately resolved.',
    },
  ];
}

function BehavioralDimensionLineChart({
  metric,
  empId,
}: {
  metric: DeviationMetric;
  empId: string;
}): React.ReactElement {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { values, labels, fullDates } = useMemo(
    () => generateMetricDailyTrend(metric, empId),
    [metric, empId],
  );

  const dailyBaseline = getDailyBaseline(metric);
  const baselineLabel = formatChartValue(dailyBaseline, metric);
  const peakObserved = Math.max(...values, 0);
  const yConfig = computeYAxisConfig(peakObserved, dailyBaseline);
  const lineColor = getObservedLineColor(metric);

  const W = 520;
  const H = 168;
  const padLeft = 44;
  const padRight = 12;
  const padTop = 20;
  const padBottom = 26;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const toX = (i: number): number => padLeft + (i / Math.max(values.length - 1, 1)) * plotW;
  const toY = (v: number): number => valueToPlotY(v, yConfig, padTop, plotH);

  const observedPoints: ChartPoint[] = values.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const observedPath = buildSmoothLinePath(observedPoints);
  const baselineY = toY(dailyBaseline);

  const hoveredValue = hoveredIndex !== null ? values[hoveredIndex] : null;
  const tooltipLeftPct = hoveredIndex !== null
    ? (toX(hoveredIndex) / W) * 100
    : 0;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {hoveredIndex !== null && hoveredValue !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipLeftPct}%`,
            top: '2px',
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'none',
            backgroundColor: '#1E2640',
            border: '1px solid #2A3352',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '10px',
            color: '#E2E8F0',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: '#94A3B8' }}>Date:</span> {fullDates[hoveredIndex]}
          {' | '}
          <span style={{ color: '#94A3B8' }}>Employee Activity:</span>{' '}
          <strong style={{ color: lineColor }}>{formatChartValue(hoveredValue, metric)}</strong>
          {' | '}
          <span style={{ color: '#94A3B8' }}>Peer Baseline:</span>{' '}
          <strong style={{ color: BASELINE_LINE_COLOR }}>{formatChartValue(dailyBaseline, metric)}</strong>
          {' | '}
          <span style={{ color: '#94A3B8' }}>Deviation:</span>{' '}
          <strong style={{ color: lineColor }}>
            {computeDeviationPct(hoveredValue, dailyBaseline)}
          </strong>
        </div>
      )}

      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
        role="img"
        aria-label={`${metric.name} 7-day activity trend`}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Y-axis gridlines & labels (baseline forced into tick set) */}
        {yConfig.ticks.map((tick) => {
          const y = toY(tick);
          const isBaselineTick = dailyBaseline > 0 && Math.abs(tick - dailyBaseline) / Math.max(dailyBaseline, 0.001) < 0.12;
          return (
            <g key={`tick-${tick}`}>
              <line
                x1={padLeft}
                y1={y}
                x2={W - padRight}
                y2={y}
                stroke={isBaselineTick ? 'rgba(56, 189, 248, 0.18)' : '#1E2640'}
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                fill={isBaselineTick ? BASELINE_LINE_COLOR : '#64748B'}
                fontSize="8"
                fontFamily="var(--font-mono)"
                fontWeight={isBaselineTick ? 700 : 400}
              >
                {formatChartValue(tick, metric)}
              </text>
            </g>
          );
        })}

        {/* Y-axis spine */}
        <line
          x1={padLeft}
          y1={padTop}
          x2={padLeft}
          y2={padTop + plotH}
          stroke="#2A3352"
          strokeWidth="1"
        />

        {/* Employee observed activity line */}
        <path
          d={observedPath}
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Interactive data points */}
        {values.map((v, i) => {
          const isActive = hoveredIndex === i;
          return (
            <g key={i}>
              <circle
                cx={toX(i)}
                cy={toY(v)}
                r="10"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
              />
              <circle
                cx={toX(i)}
                cy={toY(v)}
                r={isActive ? 4.5 : 3}
                fill={lineColor}
                stroke="#0B0F19"
                strokeWidth={isActive ? 1.5 : 1.25}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        })}

        {/* Peer baseline reference line — explicit overlay, rendered on top */}
        <BaselineReferenceLine
          y={baselineY}
          plotLeft={padLeft}
          plotRight={W - padRight}
          label={baselineLabel}
        />

        {/* X-axis day labels */}
        {labels.map((label, i) => (
          <text
            key={`${label}-${i}`}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fill={hoveredIndex === i ? '#94A3B8' : '#475569'}
            fontSize="9"
            fontFamily="var(--font-mono)"
            fontWeight={hoveredIndex === i ? 700 : 400}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function BehavioralDimensionChartCard({
  metric,
  empId,
  isHovered,
  onHover,
}: {
  metric: DeviationMetric;
  empId: string;
  isHovered: boolean;
  onHover: (metric: DeviationMetric | null) => void;
}): React.ReactElement {
  const isElevated = metric.severity !== 'LOW';
  const dailyBaseline = getDailyBaseline(metric);
  const baselineLegendLabel = formatChartValue(dailyBaseline, metric);

  return (
    <div
      onMouseEnter={() => onHover(metric)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        border: `1px solid ${isHovered ? RISK_BORDER[metric.severity] : '#2A3352'}`,
        backgroundColor: isHovered ? '#1E2640' : 'rgba(30, 38, 64, 0.35)',
        padding: '14px 16px',
        transition: 'all 0.18s ease',
        cursor: 'pointer',
        minHeight: '220px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
          <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{metric.icon}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f7fafc', lineHeight: 1.3 }}>
              {metric.name}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '10px',
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {metric.category}
            </p>
          </div>
        </div>
        <SeverityBadge severity={metric.severity} />
      </div>

      <p
        style={{
          margin: '0 0 10px',
          fontSize: '11px',
          color: '#94A3B8',
          lineHeight: 1.5,
        }}
      >
        Observed:{' '}
        <strong
          style={{
            color: isElevated ? RISK_COLORS[metric.severity] : '#E2E8F0',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {metric.observedLabel}
        </strong>
        {' | '}
        Peer Baseline:{' '}
        <strong style={{ color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
          {metric.cohortMeanLabel}
        </strong>
      </p>

      <div
        style={{
          flex: 1,
          backgroundColor: '#0B0F19',
          borderRadius: '8px',
          border: '1px solid #2A3352',
          padding: '8px 8px 4px',
          minHeight: '180px',
        }}
      >
        <BehavioralDimensionLineChart metric={metric} empId={empId} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginTop: '8px',
          fontSize: '9px',
          color: '#475569',
          fontWeight: 600,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '18px',
              height: '0',
              borderTop: `2px dashed ${BASELINE_LINE_COLOR}`,
            }}
          />
          Peer Normal Baseline ({baselineLegendLabel})
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '18px',
              height: '2px',
              backgroundColor: isElevated ? RISK_COLORS[metric.severity] : '#10B981',
              borderRadius: '1px',
            }}
          />
          Employee Observed Activity
        </span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: RiskCategory }): React.ReactElement {
  const color = RISK_COLORS[severity];
  const bg = RISK_BG[severity];
  const border = RISK_BORDER[severity];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '10px',
        fontWeight: 700,
        color,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        padding: '3px 8px',
        borderRadius: '999px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

interface DivergingDeviationChartProps {
  employees: EmployeeRead[];
  loading: boolean;
}

export default function DivergingDeviationChart({
  employees,
  loading,
}: DivergingDeviationChartProps): React.ReactElement {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [hoveredMetric, setHoveredMetric] = useState<DeviationMetric | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => normalizeScore(b.risk_score) - normalizeScore(a.risk_score));
  }, [employees]);

  const activeEmployee = useMemo(() => {
    if (selectedEmpId) {
      const found = employees.find((e) => e.emp_id === selectedEmpId);
      if (found) return found;
    }
    return sortedEmployees[0] || null;
  }, [employees, selectedEmpId, sortedEmployees]);

  const metrics = useMemo(() => {
    if (!activeEmployee) return [];
    return getEmployeeDeviationMetrics(activeEmployee);
  }, [activeEmployee]);

  const topMetric = useMemo(() => {
    return [...metrics].sort((a, b) => b.zScore - a.zScore)[0] ?? null;
  }, [metrics]);

  if (loading || !activeEmployee) {
    return (
      <div
        style={{
          backgroundColor: '#161C2E',
          border: '1px solid #2A3352',
          borderRadius: '14px',
          padding: '24px',
          marginBottom: '20px',
        }}
      >
        <div className="skeleton" style={{ height: '280px', width: '100%', borderRadius: '8px' }} />
      </div>
    );
  }

  const normScore = normalizeScore(activeEmployee.risk_score);
  const riskColor = RISK_COLORS[activeEmployee.risk_category] ?? '#94A3B8';
  const riskBg = RISK_BG[activeEmployee.risk_category] ?? 'rgba(148,163,184,0.1)';
  const riskBorder = RISK_BORDER[activeEmployee.risk_category] ?? 'rgba(148,163,184,0.3)';

  return (
    <div
      style={{
        backgroundColor: '#161C2E',
        border: '1px solid #2A3352',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        marginBottom: '24px',
      }}
    >
      {/* ── Section Header & User Selector ── */}
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid #2A3352',
          backgroundColor: '#1E2640',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            ⚖️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f7fafc' }}>
              Behavioral Breakdown & Deviations
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
              Compares employee&apos;s current activity against their 30-day department baseline
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            id="diverging-chart-emp-select"
            value={activeEmployee.emp_id}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            style={{
              backgroundColor: '#161C2E',
              border: '1px solid #2A3352',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '12px',
              color: '#f7fafc',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              minWidth: '240px',
            }}
          >
            {sortedEmployees.map((emp) => {
              const score = normalizeScore(emp.risk_score);
              return (
                <option key={emp.emp_id} value={emp.emp_id}>
                  {emp.first_name} {emp.last_name} ({emp.emp_id}) — Score {score} ({emp.risk_category})
                </option>
              );
            })}
          </select>

          <button
            id="open-baseline-modal-btn"
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              backgroundColor: riskBg,
              border: `1px solid ${riskBorder}`,
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = riskColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = riskBg;
            }}
          >
            <span>📊 Full Baseline Report</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* ── Active User Profile Bar ── */}
      <div
        style={{
          padding: '14px 22px',
          borderBottom: '1px solid #2A3352',
          backgroundColor: 'rgba(30, 38, 64, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: riskBg,
              border: `1.5px solid ${riskBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: riskColor,
              fontWeight: 800,
              fontSize: '14px',
            }}
          >
            {`${activeEmployee.first_name[0] ?? ''}${activeEmployee.last_name[0] ?? ''}`.toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f7fafc' }}>
                {activeEmployee.first_name} {activeEmployee.last_name}
              </span>
              <code style={{ fontSize: '11px', color: '#3B82F6', fontFamily: 'var(--font-mono)' }}>
                {activeEmployee.emp_id}
              </code>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: riskColor,
                  backgroundColor: riskBg,
                  border: `1px solid ${riskBorder}`,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {activeEmployee.risk_category}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
              {activeEmployee.designation} · Department: <strong style={{ color: '#E2E8F0' }}>{activeEmployee.department}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
              Threat Score
            </span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: riskColor, fontFamily: 'var(--font-mono)' }}>
              {normScore}<span style={{ fontSize: '12px', color: '#94A3B8' }}>/100</span>
            </span>
          </div>

          <div style={{ width: '1px', height: '32px', backgroundColor: '#2A3352' }} />

          <div style={{ textAlign: 'right', maxWidth: '280px' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
              Top Activity Concern
            </span>
            {topMetric ? (
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0', lineHeight: 1.4 }}>
                {topMetric.name.split(' ')[0]} — Observed: <strong style={{ color: '#f7fafc' }}>{topMetric.observedLabel}</strong>
                {' · '}Baseline: <strong style={{ color: '#94A3B8' }}>{topMetric.cohortMeanLabel}</strong>
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>All activity within normal range</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 7-Day Behavioral Dimension Line Charts (2×3 grid) ── */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '0 2px',
          }}
        >
          <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>
            7-day daily activity vs department peer baseline — hover points for daily comparison
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '9px',
              color: '#475569',
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '20px', borderTop: `2px dashed ${BASELINE_LINE_COLOR}` }} />
              Peer Normal Baseline
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '20px', height: '2px', backgroundColor: '#3B82F6', borderRadius: '1px' }} />
              Employee Observed Activity
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '16px',
          }}
        >
          {metrics.map((metric) => (
            <BehavioralDimensionChartCard
              key={metric.id}
              metric={metric}
              empId={activeEmployee.emp_id}
              isHovered={hoveredMetric?.id === metric.id}
              onHover={setHoveredMetric}
            />
          ))}
        </div>

        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: hoveredMetric ? RISK_BG[hoveredMetric.severity] : '#1E2640',
            border: `1px solid ${hoveredMetric ? RISK_BORDER[hoveredMetric.severity] : '#2A3352'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            transition: 'all 0.2s ease',
          }}
        >
          {hoveredMetric ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{hoveredMetric.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f7fafc' }}>
                    {hoveredMetric.name}
                    {' · '}
                    <SeverityBadge severity={hoveredMetric.severity} />
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#cbd5e1' }}>
                    {hoveredMetric.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Observed</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f7fafc', fontFamily: 'var(--font-mono)' }}>
                    {hoveredMetric.observedLabel}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Normal Peer Baseline</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                    {hoveredMetric.cohortMeanLabel}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', textAlign: 'center', width: '100%' }}>
              Hover over any dimension chart to see observed volume, peer baseline, and analyst context
            </p>
          )}
        </div>
      </div>

      <BaselineModal
        employee={activeEmployee}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
