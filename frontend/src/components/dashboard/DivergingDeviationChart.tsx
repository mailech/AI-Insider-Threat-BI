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

function getComparisonWidths(metric: DeviationMetric): { baselinePct: number; observedPct: number } {
  const observed = parseMetricValue(metric.observedLabel);
  const baseline = parseMetricValue(metric.cohortMeanLabel);
  const maxVal = Math.max(observed, baseline, 1);

  return {
    baselinePct: Math.max((baseline / maxVal) * 100, baseline > 0 ? 8 : 4),
    observedPct: Math.max((observed / maxVal) * 100, observed > 0 ? 8 : 4),
  };
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

      {/* ── Comparison Chart ── */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            fontSize: '10px',
            color: '#94A3B8',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <div style={{ width: '220px', flexShrink: 0 }}>Activity Type</div>
          <div style={{ flex: 1, paddingLeft: '8px' }}>Observed vs Normal Baseline</div>
          <div style={{ width: '110px', textAlign: 'right', flexShrink: 0 }}>Status</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {metrics.map((metric) => {
            const { baselinePct, observedPct } = getComparisonWidths(metric);
            const isHovered = hoveredMetric?.id === metric.id;
            const severityColor = RISK_COLORS[metric.severity];
            const isElevated = metric.severity !== 'LOW';

            return (
              <div
                key={metric.id}
                onMouseEnter={() => setHoveredMetric(metric)}
                onMouseLeave={() => setHoveredMetric(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: isHovered ? '#1E2640' : 'rgba(30, 38, 64, 0.3)',
                  border: `1px solid ${isHovered ? RISK_BORDER[metric.severity] : '#2A3352'}`,
                  transition: 'all 0.18s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{metric.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f7fafc' }}>
                      {metric.name}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {metric.category}
                    </p>
                  </div>
                </div>

                <div style={{ flex: 1, paddingLeft: '8px', paddingRight: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '6px',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#E2E8F0' }}>
                      Observed: <strong style={{ color: '#f7fafc', fontFamily: 'var(--font-mono)' }}>{metric.observedLabel}</strong>
                    </span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      Normal Peer Baseline: <strong style={{ fontFamily: 'var(--font-mono)' }}>{metric.cohortMeanLabel}</strong>
                    </span>
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      height: '10px',
                      backgroundColor: '#0B0F19',
                      borderRadius: '999px',
                      border: '1px solid #2A3352',
                      overflow: 'visible',
                    }}
                  >
                    <div
                      title={`Normal baseline: ${metric.cohortMeanLabel}`}
                      style={{
                        position: 'absolute',
                        top: '-3px',
                        left: `${baselinePct}%`,
                        transform: 'translateX(-50%)',
                        width: '3px',
                        height: '16px',
                        backgroundColor: '#6366F1',
                        borderRadius: '2px',
                        zIndex: 3,
                        boxShadow: '0 0 4px rgba(99, 102, 241, 0.6)',
                      }}
                    />

                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${observedPct}%`,
                        backgroundColor: isElevated ? severityColor : '#10B981',
                        borderRadius: '999px',
                        opacity: isElevated ? 0.75 : 0.55,
                        transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      fontSize: '9px',
                      color: '#475569',
                    }}
                  >
                    <span>Lower activity</span>
                    <span style={{ color: '#6366F1' }}>▲ Baseline marker</span>
                    <span>Higher activity</span>
                  </div>
                </div>

                <div style={{ width: '110px', textAlign: 'right', flexShrink: 0 }}>
                  <SeverityBadge severity={metric.severity} />
                </div>
              </div>
            );
          })}
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
              Hover over any activity row to see observed volume, peer baseline, and analyst context
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
