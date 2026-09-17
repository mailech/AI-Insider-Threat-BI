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

function getDeviationBadge(metric: MetricBaselineData): string {
  if (!metric.isAnomaly) return 'Within Baseline';
  if (metric.severity === 'CRITICAL') return 'Critical Spike';
  if (metric.cohortMean > 0) {
    const multiplier = metric.observedValue / metric.cohortMean;
    return `${multiplier.toFixed(1)}x Above Peer Avg`;
  }
  return metric.severity === 'HIGH' ? 'High Spike' : 'Above Peer Avg';
}

// ── Vertical List Metric Row ──────────────────────────────────────────────────
function MetricListRow({ metric }: { metric: MetricBaselineData }) {
  const accentColor = metric.isAnomaly ? RISK_COLORS[metric.severity] : '#10B981';
  const allowedMaxLabel = getAllowedMaxLabel(metric);
  const badgeLabel = getDeviationBadge(metric);

  const scaleMax = Math.max(metric.observedValue, metric.cohortMaxNormal, 0.001);
  const allowedMaxPct = Math.min(100, (metric.cohortMaxNormal / scaleMax) * 100);
  const observedPct = Math.min(100, (metric.observedValue / scaleMax) * 100);
  const hasExcess = metric.observedValue > metric.cohortMaxNormal;
  const excessPct = hasExcess ? observedPct - allowedMaxPct : 0;
  const withinNormalPct = hasExcess ? allowedMaxPct : observedPct;
  const excessColor = metric.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B';

  return (
    <div
      style={{
        backgroundColor: '#161C2E',
        border: `1px solid ${metric.isAnomaly ? RISK_BORDER[metric.severity] : '#2A3352'}`,
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Row header: dimension name + actionable badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#E2E8F0', letterSpacing: '-0.01em' }}>
          {metric.name}
        </h4>
        <span
          style={{
            flexShrink: 0,
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 600,
            color: metric.isAnomaly ? accentColor : '#10B981',
            backgroundColor: metric.isAnomaly ? RISK_BG[metric.severity] : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${metric.isAnomaly ? RISK_BORDER[metric.severity] : 'rgba(16, 185, 129, 0.3)'}`,
            whiteSpace: 'nowrap',
          }}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Comparison metrics — single readable line */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px 0',
          fontSize: '12px',
          color: '#94A3B8',
          lineHeight: 1.5,
        }}
      >
        <span>
          Observed:{' '}
          <strong style={{ color: metric.isAnomaly ? accentColor : '#E2E8F0', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {metric.observedLabel}
          </strong>
        </span>
        <span style={{ color: '#475569', margin: '0 10px' }}>|</span>
        <span>
          Department Avg:{' '}
          <span style={{ color: '#CBD5E1', fontFamily: 'var(--font-mono)' }}>{metric.cohortMeanLabel}</span>
        </span>
        <span style={{ color: '#475569', margin: '0 10px' }}>|</span>
        <span>
          Allowed Max:{' '}
          <span style={{ color: '#CBD5E1', fontFamily: 'var(--font-mono)' }}>{allowedMaxLabel}</span>
        </span>
      </div>

      {/* Dual-color bar: muted normal band + red/orange excess */}
      <div style={{ position: 'relative', paddingTop: '2px' }}>
        <div
          style={{
            position: 'relative',
            height: '10px',
            backgroundColor: '#0B0F19',
            borderRadius: '5px',
            border: '1px solid #2A3352',
            overflow: 'hidden',
          }}
        >
          {/* Normal band zone (0 → Allowed Max) */}
          {allowedMaxPct > 0 && (
            <div
              title={`Normal band: 0 – ${allowedMaxLabel}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${allowedMaxPct}%`,
                backgroundColor: '#2A3352',
                borderRadius: hasExcess ? '0' : '4px',
              }}
            />
          )}
          {/* Observed fill within normal band */}
          {!hasExcess && withinNormalPct > 0 && (
            <div
              title={`Observed: ${metric.observedLabel}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${withinNormalPct}%`,
                backgroundColor: metric.isAnomaly ? '#475569' : '#3D4F6F',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }}
            />
          )}
          {/* Excess / spike beyond allowed max */}
          {hasExcess && excessPct > 0 && (
            <div
              title={`Excess above allowed max (${allowedMaxLabel})`}
              style={{
                position: 'absolute',
                top: 0,
                left: `${allowedMaxPct}%`,
                height: '100%',
                width: `${excessPct}%`,
                backgroundColor: excessColor,
                transition: 'width 0.4s ease',
              }}
            />
          )}
        </div>

        {/* Scale anchors */}
        <div style={{ position: 'relative', marginTop: '4px', height: '14px', fontSize: '10px', color: '#475569' }}>
          <span style={{ position: 'absolute', left: 0 }}>0</span>
          {hasExcess && (
            <span style={{ position: 'absolute', left: `${allowedMaxPct}%`, transform: 'translateX(-50%)' }}>
              Max {allowedMaxLabel}
            </span>
          )}
          <span
            style={{
              position: 'absolute',
              right: 0,
              fontFamily: 'var(--font-mono)',
              color: metric.isAnomaly ? accentColor : '#94A3B8',
            }}
          >
            {metric.observedLabel}
          </span>
        </div>
      </div>

      {/* Risk reason summary */}
      <div
        style={{
          marginTop: '2px',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: metric.isAnomaly ? RISK_BG[metric.severity] : 'rgba(30, 38, 64, 0.6)',
          borderLeft: `3px solid ${metric.isAnomaly ? accentColor : '#475569'}`,
        }}
      >
        <p style={{ margin: 0, fontSize: '12px', color: metric.isAnomaly ? '#E2E8F0' : '#94A3B8', lineHeight: 1.5 }}>
          {metric.insight}
        </p>
      </div>
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

        {/* ── Modal Body: Vertical Metric List ── */}
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
            gap: '16px',
          }}
        >
          {/* Summary strip */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: anomalyCount > 0 ? 'rgba(239, 68, 68, 0.07)' : 'rgba(16, 185, 129, 0.07)',
              border: `1px solid ${anomalyCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
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

          {/* Vertical list of behavioral dimensions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics.map((metric) => (
              <MetricListRow key={metric.id} metric={metric} />
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
              <span style={{ width: '16px', height: '6px', backgroundColor: '#3D4F6F', borderRadius: '2px' }} />
              Normal Band (0 – Allowed Max)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '16px', height: '6px', backgroundColor: '#EF4444', borderRadius: '2px' }} />
              Excess / Spike Volume
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
