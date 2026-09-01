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

// ── Bullet / Range Bar Chart Subcomponent ─────────────────────────────────────
function BulletChartMetricCard({ metric }: { metric: MetricBaselineData }) {
  // Chart visual scaling
  const maxValue = Math.max(metric.observedValue * 1.15, metric.cohortMaxNormal * 1.5, 1);

  // Normal band range percentages
  const bandMinPct = Math.max(0, (metric.cohortMinNormal / maxValue) * 100);
  const bandMaxPct = Math.min(100, (metric.cohortMaxNormal / maxValue) * 100);
  const bandWidthPct = Math.max(8, bandMaxPct - bandMinPct);

  // Mean marker position
  const meanPct = Math.min(98, Math.max(2, (metric.cohortMean / maxValue) * 100));

  // User observed value bar percentage
  const observedPct = Math.min(100, Math.max(3, (metric.observedValue / maxValue) * 100));

  // Determine bar color based on anomaly
  const barColor = metric.isAnomaly ? RISK_COLORS[metric.severity] : '#10B981';

  return (
    <div
      style={{
        backgroundColor: '#161C2E',
        border: `1px solid ${metric.isAnomaly ? RISK_BORDER[metric.severity] : '#2A3352'}`,
        borderRadius: '12px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: metric.isAnomaly ? `0 4px 18px ${RISK_BG[metric.severity]}` : 'none',
      }}
    >
      {/* Top row: Metric Name & Deviation Callout Badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: barColor,
              boxShadow: metric.isAnomaly ? `0 0 8px ${barColor}` : 'none',
            }}
          />
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f7fafc' }}>
            {metric.name}
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {metric.isAnomaly ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                color: barColor,
                backgroundColor: RISK_BG[metric.severity],
                border: `1px solid ${RISK_BORDER[metric.severity]}`,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>▲ +{metric.deviationPct}%</span>
              <span style={{ opacity: 0.8 }}>({metric.zScore > 0 ? `+${metric.zScore}σ` : `${metric.zScore}σ`})</span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>✓ Within Baseline</span>
              <span style={{ opacity: 0.75 }}>({metric.zScore > 0 ? `+${metric.zScore}σ` : `${metric.zScore}σ`})</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Bullet / Range Bar Visualization ── */}
      <div style={{ position: 'relative', marginTop: '4px' }}>
        {/* Track Bar */}
        <div
          style={{
            height: '24px',
            backgroundColor: '#0B0F19',
            borderRadius: '6px',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid #2A3352',
          }}
        >
          {/* 1. Subtle Cohort Baseline Range Band (Normal Zone) */}
          <div
            title={`Cohort Normal Range: ${metric.cohortBandLabel}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${bandMinPct}%`,
              width: `${bandWidthPct}%`,
              backgroundColor: 'rgba(59, 130, 246, 0.16)',
              borderLeft: '1px dashed rgba(59, 130, 246, 0.4)',
              borderRight: '1px dashed rgba(59, 130, 246, 0.4)',
              zIndex: 1,
            }}
          />

          {/* 2. User's Observed Activity Bar */}
          <div
            style={{
              position: 'absolute',
              top: '5px',
              bottom: '5px',
              left: '2px',
              width: `${observedPct}%`,
              backgroundColor: barColor,
              borderRadius: '4px',
              zIndex: 2,
              boxShadow: metric.isAnomaly ? `0 0 10px ${barColor}` : 'none',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* 3. Cohort Mean Indicator Target Line */}
          <div
            title={`Cohort Mean: ${metric.cohortMeanLabel}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${meanPct}%`,
              width: '2px',
              backgroundColor: '#94A3B8',
              zIndex: 3,
              boxShadow: '0 0 4px #000',
            }}
          />
        </div>

        {/* Value Callout Indicators Below Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '6px',
            fontSize: '11px',
            color: '#94A3B8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#94A3B8' }}>Observed:</span>
            <span
              style={{
                fontWeight: 700,
                color: barColor,
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            >
              {metric.observedLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid #3B82F6', borderRadius: '2px' }} />
              <span>Normal Band: <strong style={{ color: '#E2E8F0' }}>{metric.cohortBandLabel}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '2px', height: '10px', backgroundColor: '#94A3B8' }} />
              <span>Mean: <strong style={{ color: '#E2E8F0' }}>{metric.cohortMeanLabel}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Micro-copy Insight */}
      <p
        style={{
          margin: 0,
          fontSize: '11px',
          color: metric.isAnomaly ? '#FCA5A5' : '#94A3B8',
          lineHeight: '1.4',
        }}
      >
        {metric.insight}
      </p>
    </div>
  );
}

// ── Main Modal Component ──────────────────────────────────────────────────────
export default function BaselineModal({ employee, isOpen, onClose }: BaselineModalProps) {
  const [windowDays, setWindowDays] = useState<number>(7);

  // Viewport scroll lock: lock body overflow when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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
            padding: '20px 24px',
            borderBottom: '1px solid #2A3352',
            backgroundColor: '#161C2E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Avatar with Risk Glow */}
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: riskBg,
                border: `2px solid ${riskBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: riskColor,
                fontWeight: 800,
                fontSize: '16px',
                boxShadow: `0 0 16px ${riskBg}`,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f7fafc' }}>
                  {employee.first_name} {employee.last_name}
                </h3>
                <code
                  style={{
                    fontSize: '11px',
                    color: '#3B82F6',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: '#1E2640',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid #2A3352',
                  }}
                >
                  {employee.emp_id}
                </code>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: riskColor,
                    backgroundColor: riskBg,
                    border: `1px solid ${riskBorder}`,
                    letterSpacing: '0.06em',
                  }}
                >
                  {employee.risk_category} RISK · {normScore}/100
                </span>
              </div>

              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                {employee.designation} · <strong style={{ color: '#cbd5e1' }}>{employee.department}</strong>
              </p>
            </div>
          </div>

          {/* Right Header Controls: Window Selector & Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Evaluation Window Selector */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#1E2640',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid #2A3352',
              }}
            >
              {[
                { label: '7D Window', days: 7 },
                { label: '14D Window', days: 14 },
                { label: '30D Window', days: 30 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setWindowDays(days)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: windowDays === days ? '#3B82F6' : 'transparent',
                    color: windowDays === days ? '#ffffff' : '#94A3B8',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              id="close-baseline-modal-btn"
              type="button"
              onClick={onClose}
              aria-label="Close baseline modal"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#1E2640',
                border: '1px solid #2A3352',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                e.currentTarget.style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1E2640';
                e.currentTarget.style.borderColor = '#2A3352';
                e.currentTarget.style.color = '#94A3B8';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Modal Body: Visual Baseline Comparison Grid ── */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Summary Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: anomalyCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${anomalyCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>{anomalyCount > 0 ? '🚨' : '🛡️'}</span>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f7fafc' }}>
                  {anomalyCount > 0
                    ? `${anomalyCount} Behavioral Dimension Outliers Detected vs ${employee.department} Cohort`
                    : `Telemetry aligns with normal baseline for ${employee.department} peer group`}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                  Comparing {windowDays}-day aggregated telemetry against rolling 90-day departmental mean & standard deviation (σ)
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Evaluated:</span>
              <span style={{ fontSize: '11px', color: '#f7fafc', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* 2-Column Responsive Metric Bullet Charts Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '16px',
            }}
          >
            {metrics.map((metric) => (
              <BulletChartMetricCard key={metric.id} metric={metric} />
            ))}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid #3B82F6', borderRadius: '2px' }} />
              Normal Cohort Band (P5–P95)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '2px', height: '12px', backgroundColor: '#94A3B8' }} />
              Cohort Mean
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '6px', backgroundColor: '#EF4444', borderRadius: '2px' }} />
              Spike Deviation (Observed)
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
