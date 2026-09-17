'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { EmployeeRead, RiskCategory } from '@/types/api';

// ── Color Theme Tokens ────────────────────────────────────────────────────────
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

export interface MetricBaselineData {
  id:               string;
  name:             string;
  category:         'EXFILTRATION' | 'ACCESS' | 'DOWNLOAD' | 'PRIVILEGE' | 'MEDIA' | 'AUTH';
  observedValue:    number;
  observedLabel:    string;
  cohortMean:       number;
  cohortMeanLabel:  string;
  cohortMaxNormal:  number;
  cohortMinNormal:  number;
  cohortBandLabel:  string;
  unit:             string;
  zScore:           number; // e.g. +15.8
  deviationPct:     number; // e.g. +6079%
  isAnomaly:        boolean;
  severity:         RiskCategory;
  insight:          string;
}

interface BaselineModalProps {
  employee: EmployeeRead | null;
  isOpen:   boolean;
  onClose:  () => void;
}

// Generate realistic, deterministic baseline comparison metrics for a given employee & lookback window
function getBaselineMetrics(employee: EmployeeRead, windowDays: number): MetricBaselineData[] {
  const normScore = employee.risk_score <= 1 ? Math.round(employee.risk_score * 100) : Math.round(employee.risk_score);
  const isHighRisk = normScore >= 60;
  const isCritical = normScore >= 80;
  const multiplier = windowDays / 7;

  if (isCritical) {
    return [
      {
        id: 'file_upload',
        name: 'File Uploads & Data Exfiltration',
        category: 'EXFILTRATION',
        observedValue: 21.9 * multiplier,
        observedLabel: `${(21.9 * multiplier).toFixed(1)} GB`,
        cohortMean: 0.355 * multiplier,
        cohortMeanLabel: `${(355 * multiplier).toFixed(0)} MB`,
        cohortMinNormal: 0.05 * multiplier,
        cohortMaxNormal: 0.8 * multiplier,
        cohortBandLabel: `50 MB – ${(800 * multiplier).toFixed(0)} MB`,
        unit: 'GB',
        zScore: 15.8,
        deviationPct: 6079,
        isAnomaly: true,
        severity: 'CRITICAL',
        insight: 'Massive outbound transfer to unauthorized external cloud storage endpoint.',
      },
      {
        id: 'off_hours_login',
        name: 'Off-Hours & Weekend Logons',
        category: 'ACCESS',
        observedValue: Math.round(14 * multiplier),
        observedLabel: `${Math.round(14 * multiplier)} sessions`,
        cohortMean: 0.8 * multiplier,
        cohortMeanLabel: `${(0.8 * multiplier).toFixed(1)} sessions`,
        cohortMinNormal: 0,
        cohortMaxNormal: 2 * multiplier,
        cohortBandLabel: `0 – ${Math.round(2 * multiplier)} sessions`,
        unit: 'sessions',
        zScore: 8.4,
        deviationPct: 1650,
        isAnomaly: true,
        severity: 'HIGH',
        insight: 'Repeated late-night VPN sessions originating from unfamiliar geographic IP range (03:14 AM).',
      },
      {
        id: 'bulk_downloads',
        name: 'Bulk File Downloads',
        category: 'DOWNLOAD',
        observedValue: Math.round(4820 * multiplier),
        observedLabel: `${Math.round(4820 * multiplier).toLocaleString()} files`,
        cohortMean: 120 * multiplier,
        cohortMeanLabel: `${Math.round(120 * multiplier)} files`,
        cohortMinNormal: 20 * multiplier,
        cohortMaxNormal: 300 * multiplier,
        cohortBandLabel: `${Math.round(20 * multiplier)} – ${Math.round(300 * multiplier)} files`,
        unit: 'files',
        zScore: 12.1,
        deviationPct: 3916,
        isAnomaly: true,
        severity: 'CRITICAL',
        insight: 'High-speed automated download of sensitive intellectual property repositories.',
      },
      {
        id: 'privilege_ops',
        name: 'Privileged Admin & Policy Ops',
        category: 'PRIVILEGE',
        observedValue: Math.round(8 * multiplier),
        observedLabel: `${Math.round(8 * multiplier)} ops`,
        cohortMean: 0.2 * multiplier,
        cohortMeanLabel: `${(0.2 * multiplier).toFixed(1)} ops`,
        cohortMinNormal: 0,
        cohortMaxNormal: 1 * multiplier,
        cohortBandLabel: `0 – ${Math.max(1, Math.round(1 * multiplier))} ops`,
        unit: 'ops',
        zScore: 9.2,
        deviationPct: 3900,
        isAnomaly: true,
        severity: 'HIGH',
        insight: 'Attempted role permission modification and cloud IAM access key regeneration.',
      },
      {
        id: 'removable_media',
        name: 'Removable Media / USB Activity',
        category: 'MEDIA',
        observedValue: 3.2 * multiplier,
        observedLabel: `${(3.2 * multiplier).toFixed(1)} GB`,
        cohortMean: 0,
        cohortMeanLabel: '0 MB',
        cohortMinNormal: 0,
        cohortMaxNormal: 0.05 * multiplier,
        cohortBandLabel: `0 – ${(50 * multiplier).toFixed(0)} MB`,
        unit: 'GB',
        zScore: 14.0,
        deviationPct: 6300,
        isAnomaly: true,
        severity: 'CRITICAL',
        insight: 'Direct write operations to unencrypted USB Mass Storage Device.',
      },
      {
        id: 'failed_auth',
        name: 'Failed Authentication Attempts',
        category: 'AUTH',
        observedValue: Math.round(28 * multiplier),
        observedLabel: `${Math.round(28 * multiplier)} attempts`,
        cohortMean: 2 * multiplier,
        cohortMeanLabel: `${Math.round(2 * multiplier)} attempts`,
        cohortMinNormal: 0,
        cohortMaxNormal: 4 * multiplier,
        cohortBandLabel: `0 – ${Math.round(4 * multiplier)} attempts`,
        unit: 'attempts',
        zScore: 6.5,
        deviationPct: 1300,
        isAnomaly: true,
        severity: 'MEDIUM',
        insight: 'Multiple failed Kerberos & SSO attempts followed by service token escalation.',
      },
    ];
  } else if (isHighRisk) {
    return [
      {
        id: 'file_upload',
        name: 'File Uploads & Data Exfiltration',
        category: 'EXFILTRATION',
        observedValue: 6.8 * multiplier,
        observedLabel: `${(6.8 * multiplier).toFixed(1)} GB`,
        cohortMean: 0.355 * multiplier,
        cohortMeanLabel: `${(355 * multiplier).toFixed(0)} MB`,
        cohortMinNormal: 0.05 * multiplier,
        cohortMaxNormal: 0.8 * multiplier,
        cohortBandLabel: `50 MB – ${(800 * multiplier).toFixed(0)} MB`,
        unit: 'GB',
        zScore: 7.9,
        deviationPct: 1815,
        isAnomaly: true,
        severity: 'HIGH',
        insight: 'Elevated external data sync via personal web storage services.',
      },
      {
        id: 'off_hours_login',
        name: 'Off-Hours & Weekend Logons',
        category: 'ACCESS',
        observedValue: Math.round(7 * multiplier),
        observedLabel: `${Math.round(7 * multiplier)} sessions`,
        cohortMean: 0.8 * multiplier,
        cohortMeanLabel: `${(0.8 * multiplier).toFixed(1)} sessions`,
        cohortMinNormal: 0,
        cohortMaxNormal: 2 * multiplier,
        cohortBandLabel: `0 – ${Math.round(2 * multiplier)} sessions`,
        unit: 'sessions',
        zScore: 4.8,
        deviationPct: 775,
        isAnomaly: true,
        severity: 'HIGH',
        insight: 'Unscheduled remote logins outside regular business hours.',
      },
      {
        id: 'bulk_downloads',
        name: 'Bulk File Downloads',
        category: 'DOWNLOAD',
        observedValue: Math.round(1450 * multiplier),
        observedLabel: `${Math.round(1450 * multiplier).toLocaleString()} files`,
        cohortMean: 120 * multiplier,
        cohortMeanLabel: `${Math.round(120 * multiplier)} files`,
        cohortMinNormal: 20 * multiplier,
        cohortMaxNormal: 300 * multiplier,
        cohortBandLabel: `${Math.round(20 * multiplier)} – ${Math.round(300 * multiplier)} files`,
        unit: 'files',
        zScore: 5.6,
        deviationPct: 1108,
        isAnomaly: true,
        severity: 'HIGH',
        insight: 'Elevated document retrieval volume from team sharepoint.',
      },
      {
        id: 'privilege_ops',
        name: 'Privileged Admin & Policy Ops',
        category: 'PRIVILEGE',
        observedValue: Math.round(3 * multiplier),
        observedLabel: `${Math.round(3 * multiplier)} ops`,
        cohortMean: 0.2 * multiplier,
        cohortMeanLabel: `${(0.2 * multiplier).toFixed(1)} ops`,
        cohortMinNormal: 0,
        cohortMaxNormal: 1 * multiplier,
        cohortBandLabel: `0 – ${Math.max(1, Math.round(1 * multiplier))} ops`,
        unit: 'ops',
        zScore: 4.1,
        deviationPct: 1400,
        isAnomaly: true,
        severity: 'MEDIUM',
        insight: 'Execution of sudo commands outside standard development tasks.',
      },
      {
        id: 'removable_media',
        name: 'Removable Media / USB Activity',
        category: 'MEDIA',
        observedValue: 0.15 * multiplier,
        observedLabel: `${(150 * multiplier).toFixed(0)} MB`,
        cohortMean: 0,
        cohortMeanLabel: '0 MB',
        cohortMinNormal: 0,
        cohortMaxNormal: 0.05 * multiplier,
        cohortBandLabel: `0 – ${(50 * multiplier).toFixed(0)} MB`,
        unit: 'MB',
        zScore: 3.2,
        deviationPct: 200,
        isAnomaly: true,
        severity: 'MEDIUM',
        insight: 'Minor file transfer detected to external removable drive.',
      },
      {
        id: 'failed_auth',
        name: 'Failed Authentication Attempts',
        category: 'AUTH',
        observedValue: Math.round(9 * multiplier),
        observedLabel: `${Math.round(9 * multiplier)} attempts`,
        cohortMean: 2 * multiplier,
        cohortMeanLabel: `${Math.round(2 * multiplier)} attempts`,
        cohortMinNormal: 0,
        cohortMaxNormal: 4 * multiplier,
        cohortBandLabel: `0 – ${Math.round(4 * multiplier)} attempts`,
        unit: 'attempts',
        zScore: 2.8,
        deviationPct: 350,
        isAnomaly: false,
        severity: 'LOW',
        insight: 'Slightly elevated password re-entries; within secondary variance threshold.',
      },
    ];
  } else {
    // Normal / Low Risk User
    return [
      {
        id: 'file_upload',
        name: 'File Uploads & Data Exfiltration',
        category: 'EXFILTRATION',
        observedValue: 0.28 * multiplier,
        observedLabel: `${(280 * multiplier).toFixed(0)} MB`,
        cohortMean: 0.355 * multiplier,
        cohortMeanLabel: `${(355 * multiplier).toFixed(0)} MB`,
        cohortMinNormal: 0.05 * multiplier,
        cohortMaxNormal: 0.8 * multiplier,
        cohortBandLabel: `50 MB – ${(800 * multiplier).toFixed(0)} MB`,
        unit: 'MB',
        zScore: -0.4,
        deviationPct: -21,
        isAnomaly: false,
        severity: 'LOW',
        insight: 'Normal outbound traffic consistent with role baseline.',
      },
      {
        id: 'off_hours_login',
        name: 'Off-Hours & Weekend Logons',
        category: 'ACCESS',
        observedValue: 0,
        observedLabel: '0 sessions',
        cohortMean: 0.8 * multiplier,
        cohortMeanLabel: `${(0.8 * multiplier).toFixed(1)} sessions`,
        cohortMinNormal: 0,
        cohortMaxNormal: 2 * multiplier,
        cohortBandLabel: `0 – ${Math.round(2 * multiplier)} sessions`,
        unit: 'sessions',
        zScore: -0.9,
        deviationPct: -100,
        isAnomaly: false,
        severity: 'LOW',
        insight: 'All logins occurred strictly within normal operating business hours (09:00 - 18:00).',
      },
      {
        id: 'bulk_downloads',
        name: 'Bulk File Downloads',
        category: 'DOWNLOAD',
        observedValue: Math.round(95 * multiplier),
        observedLabel: `${Math.round(95 * multiplier)} files`,
        cohortMean: 120 * multiplier,
        cohortMeanLabel: `${Math.round(120 * multiplier)} files`,
        cohortMinNormal: 20 * multiplier,
        cohortMaxNormal: 300 * multiplier,
        cohortBandLabel: `${Math.round(20 * multiplier)} – ${Math.round(300 * multiplier)} files`,
        unit: 'files',
        zScore: -0.3,
        deviationPct: -20,
        isAnomaly: false,
        severity: 'LOW',
        insight: 'Daily file access aligns with standard project scope.',
      },
      {
        id: 'privilege_ops',
        name: 'Privileged Admin & Policy Ops',
        category: 'PRIVILEGE',
        observedValue: 0,
        observedLabel: '0 ops',
        cohortMean: 0.2 * multiplier,
        cohortMeanLabel: `${(0.2 * multiplier).toFixed(1)} ops`,
        cohortMinNormal: 0,
        cohortMaxNormal: 1 * multiplier,
        cohortBandLabel: `0 – ${Math.max(1, Math.round(1 * multiplier))} ops`,
        unit: 'ops',
        zScore: -0.5,
        deviationPct: -100,
        isAnomaly: false,
        severity: 'LOW',
        insight: 'No unprivileged escalation or administrative rule overrides logged.',
      },
      {
        id: 'removable_media',
        name: 'Removable Media / USB Activity',
        category: 'MEDIA',
        observedValue: 0,
        observedLabel: '0 MB',
        cohortMean: 0,
        cohortMeanLabel: '0 MB',
        cohortMinNormal: 0,
        cohortMaxNormal: 0.05 * multiplier,
        cohortBandLabel: `0 – ${(50 * multiplier).toFixed(0)} MB`,
        unit: 'MB',
        zScore: 0,
        deviationPct: 0,
        isAnomaly: false,
        severity: 'LOW',
        insight: 'No external storage or USB device connections detected.',
      },
      {
        id: 'failed_auth',
        name: 'Failed Authentication Attempts',
        category: 'AUTH',
        observedValue: Math.round(1 * multiplier),
        observedLabel: `${Math.round(1 * multiplier)} attempt`,
        cohortMean: 2 * multiplier,
        cohortMeanLabel: `${Math.round(2 * multiplier)} attempts`,
        cohortMinNormal: 0,
        cohortMaxNormal: 4 * multiplier,
        cohortBandLabel: `0 – ${Math.round(4 * multiplier)} attempts`,
        unit: 'attempts',
        zScore: -0.6,
        deviationPct: -50,
        isAnomaly: false,
        severity: 'LOW',
        insight: 'Standard single login attempt; zero brute-force indications.',
      },
    ];
  }
}

function getAllowedMaxLabel(metric: MetricBaselineData): string {
  const parts = metric.cohortBandLabel.split(' – ');
  if (parts.length >= 2) return parts[parts.length - 1];
  return metric.cohortBandLabel;
}

const SEVERITY_RANK: Record<RiskCategory, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function getStatusBadge(metric: MetricBaselineData): string {
  if (!metric.isAnomaly) return 'Within Baseline';
  if (metric.severity === 'CRITICAL') return 'Critical Spike';
  if (metric.severity === 'HIGH') return 'Above Baseline';
  if (metric.severity === 'MEDIUM') return 'Elevated';
  return 'Within Baseline';
}

interface HighlightCard {
  label:  string;
  value:  string;
  severity: RiskCategory;
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

function generateDailyTrend(
  metric: MetricBaselineData,
  windowDays: number,
  empId: string,
): { values: number[]; labels: string[] } {
  const seed = hashMetricSeed(metric.id, empId);
  const labels: string[] = [];
  const weights: number[] = [];
  const today = new Date();

  for (let d = 0; d < windowDays; d++) {
    const progress = windowDays > 1 ? d / (windowDays - 1) : 1;
    const jitter = ((seed * (d + 3)) % 20) / 100;
    const w = metric.isAnomaly
      ? 0.25 + 0.75 * Math.pow(progress, 1.4) + jitter
      : 0.85 + jitter * 0.3;
    weights.push(w);

    const date = new Date(today);
    date.setDate(today.getDate() - (windowDays - 1 - d));
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const values = weights.map((w) => (metric.observedValue * w) / weightSum);
  return { values, labels };
}

function getHighlightCards(metrics: MetricBaselineData[]): HighlightCard[] {
  const exfil = metrics.find((m) => m.id === 'file_upload');
  const access = metrics.find((m) => m.id === 'off_hours_login');
  const highest = metrics
    .filter((m) => m.isAnomaly)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])[0];

  return [
    {
      label: 'Peak Exfiltration Volume',
      value: exfil?.observedLabel ?? '—',
      severity: exfil?.isAnomaly ? exfil.severity : 'LOW',
    },
    {
      label: 'Off-Hours Spike Count',
      value: access?.observedLabel ?? '—',
      severity: access?.isAnomaly ? access.severity : 'LOW',
    },
    {
      label: 'Highest Risk Indicator',
      value: highest?.observedLabel ?? 'Within Limits',
      severity: highest?.severity ?? 'LOW',
    },
  ];
}

function getBreachColor(severity: RiskCategory, isBreach: boolean): string {
  if (!isBreach) return '#94A3B8';
  return severity === 'CRITICAL' ? '#EF4444' : severity === 'HIGH' ? '#F59E0B' : '#94A3B8';
}

interface ChartPoint {
  x: number;
  y: number;
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

function buildBreachAreaPaths(
  values: number[],
  threshold: number,
  toX: (i: number) => number,
  toY: (v: number) => number,
): string[] {
  const paths: string[] = [];
  const thresholdY = toY(threshold);
  let i = 0;

  while (i < values.length) {
    while (i < values.length && values[i] <= threshold) i += 1;
    if (i >= values.length) break;

    const start = i;
    while (i < values.length && values[i] > threshold) i += 1;
    const end = i - 1;

    let path = `M ${toX(start).toFixed(1)} ${toY(values[start]).toFixed(1)}`;
    for (let j = start + 1; j <= end; j += 1) {
      path += ` L ${toX(j).toFixed(1)} ${toY(values[j]).toFixed(1)}`;
    }
    path += ` L ${toX(end).toFixed(1)} ${thresholdY.toFixed(1)}`;
    for (let j = end - 1; j >= start; j -= 1) {
      path += ` L ${toX(j).toFixed(1)} ${thresholdY.toFixed(1)}`;
    }
    path += ' Z';
    paths.push(path);
  }

  return paths;
}

// ── Top summary highlight card ──────────────────────────────────────────────────
function HighlightMetricCard({ card }: { card: HighlightCard }) {
  const isAlert = card.severity === 'CRITICAL' || card.severity === 'HIGH';
  const accent = getBreachColor(card.severity, isAlert);

  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: '160px',
        padding: '14px 16px',
        borderRadius: '8px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderTop: isAlert ? `2px solid ${accent}` : '2px solid #475569',
      }}
    >
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
        {card.label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isAlert ? accent : '#E2E8F0', lineHeight: 1.2 }}>
        {card.value}
      </div>
    </div>
  );
}

// ── 7-day line chart with baseline threshold + breach shading ─────────────────
function DimensionLineChart({
  metric,
  windowDays,
  empId,
}: {
  metric:     MetricBaselineData;
  windowDays: number;
  empId:      string;
}) {
  const { values, labels } = useMemo(
    () => generateDailyTrend(metric, windowDays, empId),
    [metric, windowDays, empId],
  );

  const dailyThreshold = metric.cohortMaxNormal / Math.max(windowDays, 1);
  const maxY = Math.max(...values, dailyThreshold, 0.001) * 1.15;
  const isBreach = metric.isAnomaly && metric.observedValue > metric.cohortMaxNormal;
  const lineColor = isBreach ? getBreachColor(metric.severity, true) : '#3B82F6';

  const W = 640;
  const H = 108;
  const padLeft = 8;
  const padRight = 8;
  const padTop = 10;
  const padBottom = 22;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const toX = (i: number): number => padLeft + (i / Math.max(values.length - 1, 1)) * plotW;
  const toY = (v: number): number => padTop + plotH - (v / maxY) * plotH;

  const observedPoints: ChartPoint[] = values.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const observedPath = buildSmoothLinePath(observedPoints);
  const breachPaths = buildBreachAreaPaths(values, dailyThreshold, toX, toY);
  const thresholdY = toY(dailyThreshold);
  const labelStep = windowDays <= 7 ? 1 : Math.ceil(windowDays / 7);

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      role="img"
      aria-label={`${metric.name} ${windowDays}-day activity trend`}
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => (
        <line
          key={pct}
          x1={padLeft}
          y1={padTop + plotH * pct}
          x2={W - padRight}
          y2={padTop + plotH * pct}
          stroke="#1e293b"
          strokeWidth="1"
        />
      ))}

      {/* Breach shading between observed line and baseline */}
      {breachPaths.map((d, idx) => (
        <path key={idx} d={d} fill="rgba(239, 68, 68, 0.18)" />
      ))}

      {/* Department baseline / allowed threshold */}
      <line
        x1={padLeft}
        y1={thresholdY}
        x2={W - padRight}
        y2={thresholdY}
        stroke="#64748B"
        strokeWidth="1.25"
        strokeDasharray="5 4"
      />

      {/* Employee observed activity */}
      <path
        d={observedPath}
        fill="none"
        stroke={lineColor}
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Day markers on observed line */}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(v)}
          r="2.5"
          fill={lineColor}
          stroke="#0B0F19"
          strokeWidth="1"
        />
      ))}

      {/* X-axis day labels */}
      {labels.map((label, i) => (
        (i % labelStep === 0 || i === labels.length - 1) ? (
          <text
            key={label + i}
            x={toX(i)}
            y={H - 4}
            textAnchor="middle"
            fill="#475569"
            fontSize="9"
            fontFamily="var(--font-mono)"
          >
            {label}
          </text>
        ) : null
      ))}
    </svg>
  );
}

// ── Dimension row with line chart + single-line caption ───────────────────────
function MetricVisualizationRow({
  metric,
  windowDays,
  empId,
}: {
  metric:     MetricBaselineData;
  windowDays: number;
  empId:      string;
}) {
  const allowedMaxLabel = getAllowedMaxLabel(metric);
  const isBreach = metric.isAnomaly && metric.observedValue > metric.cohortMaxNormal;
  const accent = getBreachColor(metric.severity, isBreach);
  const badgeLabel = getStatusBadge(metric);
  const badgeColor = metric.isAnomaly ? RISK_COLORS[metric.severity] : '#10B981';

  return (
    <div
      style={{
        padding: '16px 0',
        borderBottom: '1px solid #1e293b',
      }}
    >
      {/* Header: dimension name + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#E2E8F0', letterSpacing: '-0.01em' }}>
          {metric.name}
        </h4>
        <span
          style={{
            flexShrink: 0,
            padding: '2px 9px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 600,
            color: badgeColor,
            backgroundColor: metric.isAnomaly ? RISK_BG[metric.severity] : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${metric.isAnomaly ? RISK_BORDER[metric.severity] : 'rgba(16, 185, 129, 0.3)'}`,
            whiteSpace: 'nowrap',
          }}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Metric legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px 0',
          fontSize: '11px',
          color: '#64748B',
          marginBottom: '10px',
          lineHeight: 1.5,
        }}
      >
        <span>
          Observed:{' '}
          <strong style={{ fontFamily: 'var(--font-mono)', color: isBreach ? accent : '#E2E8F0', fontWeight: 700 }}>
            {metric.observedLabel}
          </strong>
        </span>
        <span style={{ margin: '0 8px', color: '#334155' }}>|</span>
        <span>
          Department Avg:{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>{metric.cohortMeanLabel}</span>
        </span>
        <span style={{ margin: '0 8px', color: '#334155' }}>|</span>
        <span>
          Max Allowed:{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>{allowedMaxLabel}</span>
        </span>
      </div>

      {/* 7-day line chart */}
      <div
        style={{
          backgroundColor: '#0B0F19',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          padding: '8px 10px 4px',
        }}
      >
        <DimensionLineChart metric={metric} windowDays={windowDays} empId={empId} />
      </div>

      {/* Single-line incident caption */}
      <p
        style={{
          margin: '8px 0 0',
          fontSize: '11px',
          color: isBreach ? '#94A3B8' : '#64748B',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={metric.insight}
      >
        {isBreach ? '⚠ ' : ''}{metric.insight}
      </p>
    </div>
  );
}

// ── Main Modal Component ──────────────────────────────────────────────────────
export default function BaselineModal({ employee, isOpen, onClose }: BaselineModalProps) {
  const [windowDays, setWindowDays] = useState<number>(7);

  // No body scroll lock — the modal overlay itself is fixed-position and
  // captures pointer events. Locking body overflow would prevent the modal's
  // own inner scroll container from receiving wheel/touch scroll events.
  // (scroll-lock removed intentionally to fix in-modal scrollability)

  // ESC key listener for accessibility
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const metrics = useMemo(() => {
    if (!employee) return [];
    return getBaselineMetrics(employee, windowDays);
  }, [employee, windowDays]);

  if (!isOpen || !employee) return null;

  const normScore = employee.risk_score <= 1 ? Math.round(employee.risk_score * 100) : Math.round(employee.risk_score);
  const riskColor = RISK_COLORS[employee.risk_category] ?? '#94A3B8';
  const riskBg = RISK_BG[employee.risk_category] ?? 'rgba(148,163,184,0.1)';
  const riskBorder = RISK_BORDER[employee.risk_category] ?? 'rgba(148,163,184,0.3)';

  const initials = `${employee.first_name[0] ?? ''}${employee.last_name[0] ?? ''}`.toUpperCase();
  const anomalyCount = metrics.filter((m) => m.isAnomaly).length;
  const highlightCards = getHighlightCards(metrics);

  return (
    <div
      id="baseline-inspection-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Modal Dialog Window Container */}
      <div
        id="baseline-inspection-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          backgroundColor: '#111726',
          border: '1px solid #2A3352',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            borderBottom: '1px solid #2A3352',
            backgroundColor: '#161C2E',
          }}
        >
          {/* Title row with time filters and close */}
          <div
            style={{
              padding: '16px 24px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
              Employee Behavioral Profile vs Department Cohort
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#1E2640',
                  borderRadius: '6px',
                  padding: '2px',
                  border: '1px solid #2A3352',
                }}
              >
                {[
                  { label: '7D', days: 7 },
                  { label: '14D', days: 14 },
                  { label: '30D', days: 30 },
                ].map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setWindowDays(days)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: windowDays === days ? '#3B82F6' : 'transparent',
                      color: windowDays === days ? '#ffffff' : '#94A3B8',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                id="close-baseline-modal-btn"
                type="button"
                onClick={onClose}
                aria-label="Close baseline modal"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: '1px solid #2A3352',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  e.currentTarget.style.color = '#EF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#2A3352';
                  e.currentTarget.style.color = '#94A3B8';
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Employee identity strip */}
          <div
            style={{
              padding: '0 24px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: riskBg,
                border: `1px solid ${riskBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: riskColor,
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>
                  {employee.first_name} {employee.last_name}
                </span>
                <code
                  style={{
                    fontSize: '10px',
                    color: '#64748B',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: '#1E2640',
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}
                >
                  {employee.emp_id}
                </code>
                <span
                  style={{
                    padding: '1px 7px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: riskColor,
                    backgroundColor: riskBg,
                    border: `1px solid ${riskBorder}`,
                  }}
                >
                  {employee.risk_category} · {normScore}/100
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>
                {employee.designation} · {employee.department}
              </p>
            </div>
          </div>
        </div>

        {/* ── Modal Body: Summary Cards + Slim Breakdown ── */}
        <div
          id="baseline-modal-scrollable-body"
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Status strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#E2E8F0' }}>
              {anomalyCount > 0
                ? `${anomalyCount} of ${metrics.length} dimensions exceed department limits`
                : `All ${metrics.length} dimensions within department limits`}
            </p>
            <span style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
              {windowDays}-day window · {employee.department}
            </span>
          </div>

          {/* Top summary banner — 3 highlight metric cards */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {highlightCards.map((card) => (
                <HighlightMetricCard key={card.label} card={card} />
              ))}
            </div>
          </div>

          {/* Dimension breakdown with charts */}
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dimension Breakdown
            </h3>
            <div>
              {metrics.map((metric) => (
                <MetricVisualizationRow
                  key={metric.id}
                  metric={metric}
                  windowDays={windowDays}
                  empId={employee.emp_id}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #2A3352',
            backgroundColor: '#161C2E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#94A3B8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '14px', height: '2px', backgroundColor: '#3B82F6', borderRadius: '1px' }} />
              Observed activity
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '14px', height: '0', borderTop: '1.5px dashed #64748B' }} />
              Dept baseline / max allowed
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '1px' }} />
              Threshold breach
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid #2A3352',
              backgroundColor: '#1E2640',
              color: '#f7fafc',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2A3352'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E2640'; }}
          >
            Close Baseline
          </button>
        </div>
      </div>
    </div>
  );
}
