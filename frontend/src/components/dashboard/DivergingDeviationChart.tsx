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

function normalizeScore(score: number): number {
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

export interface DeviationMetric {
  id: string;
  name: string;
  category: string;
  icon: string;
  zScore: number;         // e.g. -0.4 to +15.8
  deviationPct: number;   // e.g. -21% to +6079%
  observedLabel: string;
  cohortMeanLabel: string;
  severity: RiskCategory;
  description: string;
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
  } else {
    // Normal / Safe Identity
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
}

interface DivergingDeviationChartProps {
  employees: EmployeeRead[];
  loading: boolean;
}

export default function DivergingDeviationChart({
  employees,
  loading,
}: DivergingDeviationChartProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [hoveredMetric, setHoveredMetric] = useState<DeviationMetric | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Default to highest risk employee or first employee
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

  // Diverging Scale Configuration
  // Center is at 30% of bar width (allowing 30% for negative baseline variance, 70% for positive spikes)
  // Max Z-score scale = +16σ
  const MAX_Z = 16;
  const MIN_Z = -2;

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
              Behavioral Baseline & Diverging Deviation Intelligence
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
              Standard baseline centered at <strong style={{ color: '#E2E8F0' }}>0σ</strong> · Abnormal behavioral spikes extend right in <strong style={{ color: '#EF4444' }}>RED</strong>
            </p>
          </div>
        </div>

        {/* Employee Selector & Quick Inspect Button */}
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
            <span>📊 Full Bullet Baseline</span>
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

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
              Max Dimension Deviation
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: metrics[0]?.zScore > 0 ? '#EF4444' : '#10B981', fontFamily: 'var(--font-mono)' }}>
              {metrics[0]?.zScore > 0 ? `+${metrics[0].zScore}σ` : '0σ Normal'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Diverging Deviation Chart Canvas ── */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Axis Scale Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
          <div style={{ width: '260px', flexShrink: 0, fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
            Monitored Behavioral Vector
          </div>
          <div style={{ flex: 1, position: 'relative', height: '18px', display: 'flex', alignItems: 'center' }}>
            {/* Axis Tick Markers */}
            <span style={{ position: 'absolute', left: '0%', transform: 'translateX(-50%)', color: '#10B981' }}>-2σ</span>
            <span style={{ position: 'absolute', left: '12.5%', transform: 'translateX(-50%)', color: '#10B981' }}>-1σ</span>
            <span style={{ position: 'absolute', left: '25%', transform: 'translateX(-50%)', color: '#f7fafc', fontWeight: 800, backgroundColor: '#1E2640', padding: '1px 5px', borderRadius: '4px', border: '1px solid #3B82F6' }}>
              0σ Baseline
            </span>
            <span style={{ position: 'absolute', left: '45%', transform: 'translateX(-50%)' }}>+4σ</span>
            <span style={{ position: 'absolute', left: '65%', transform: 'translateX(-50%)' }}>+8σ</span>
            <span style={{ position: 'absolute', left: '82%', transform: 'translateX(-50%)', color: '#F59E0B' }}>+12σ</span>
            <span style={{ position: 'absolute', left: '98%', transform: 'translateX(-50%)', color: '#EF4444', fontWeight: 700 }}>+16σ Spike</span>
          </div>
          <div style={{ width: '130px', textAlign: 'right', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', flexShrink: 0 }}>
            Z-Score & Delta
          </div>
        </div>

        {/* Metric Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {metrics.map((m) => {
            const isSpike = m.zScore >= 3;
            const isModerate = m.zScore > 0 && m.zScore < 3;
            const isNegativeOrZero = m.zScore <= 0;

            const barColor = isSpike ? '#EF4444' : isModerate ? '#F59E0B' : '#10B981';

            // Center is at 25% (representing 0σ)
            // Left region (0% to 25%) covers -2σ to 0σ (each 12.5% = 1σ)
            // Right region (25% to 100%) covers 0σ to +16σ (each 4.68% = 1σ)
            let barLeftPct = 25;
            let barWidthPct = 0;

            if (isNegativeOrZero) {
              const negZ = Math.max(m.zScore, -2);
              barWidthPct = Math.abs(negZ) * 12.5;
              barLeftPct = 25 - barWidthPct;
            } else {
              const posZ = Math.min(m.zScore, 16);
              barWidthPct = Math.min((posZ / 16) * 73, 73);
              barLeftPct = 25;
            }

            const isHovered = hoveredMetric?.id === m.id;

            return (
              <div
                key={m.id}
                onMouseEnter={() => setHoveredMetric(m)}
                onMouseLeave={() => setHoveredMetric(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: isHovered ? '#1E2640' : 'rgba(30, 38, 64, 0.3)',
                  border: `1px solid ${isHovered ? barColor : '#2A3352'}`,
                  transition: 'all 0.18s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {/* Metric Label & Category */}
                <div style={{ width: '260px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{m.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f7fafc' }}>
                      {m.name}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {m.category}
                    </p>
                  </div>
                </div>

                {/* Diverging Bar Track */}
                <div
                  style={{
                    flex: 1,
                    height: '26px',
                    backgroundColor: '#0B0F19',
                    borderRadius: '6px',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid #2A3352',
                  }}
                >
                  {/* Center 0-Axis Reference Line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: '25%',
                      width: '2px',
                      backgroundColor: '#3B82F6',
                      zIndex: 3,
                      boxShadow: '0 0 6px rgba(59, 130, 246, 0.8)',
                    }}
                  />

                  {/* Normal Variance Zone (-1σ to +1σ) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: '12.5%',
                      width: '17.2%',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderRight: '1px dashed rgba(16, 185, 129, 0.25)',
                      borderLeft: '1px dashed rgba(16, 185, 129, 0.25)',
                      zIndex: 1,
                    }}
                  />

                  {/* The Diverging Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      bottom: '4px',
                      left: `${barLeftPct}%`,
                      width: `${Math.max(barWidthPct, 1.5)}%`,
                      backgroundColor: barColor,
                      borderRadius: isNegativeOrZero ? '4px 0 0 4px' : '0 4px 4px 0',
                      zIndex: 2,
                      boxShadow: isSpike ? `0 0 12px ${barColor}` : 'none',
                      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1), left 0.6s ease',
                    }}
                  />
                </div>

                {/* Right Callout: Z-score & Percentage */}
                <div style={{ width: '130px', textAlign: 'right', flexShrink: 0 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <strong style={{ fontSize: '13px', color: barColor }}>
                      {m.zScore > 0 ? `+${m.zScore}σ` : `${m.zScore}σ`}
                    </strong>
                    <span style={{ fontSize: '10px', color: isSpike ? '#FCA5A5' : '#94A3B8' }}>
                      {m.deviationPct >= 0 ? `+${m.deviationPct}%` : `${m.deviationPct}%`}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Hover Tooltip Box */}
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: hoveredMetric ? (hoveredMetric.zScore >= 3 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)') : '#1E2640',
            border: `1px solid ${hoveredMetric ? (hoveredMetric.zScore >= 3 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)') : '#2A3352'}`,
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
                    {hoveredMetric.name} · <span style={{ color: hoveredMetric.zScore >= 3 ? '#EF4444' : '#10B981' }}>{hoveredMetric.zScore > 0 ? `+${hoveredMetric.zScore}σ` : `${hoveredMetric.zScore}σ`} Z-Score</span>
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#cbd5e1' }}>
                    {hoveredMetric.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Observed</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f7fafc', fontFamily: 'var(--font-mono)' }}>
                    {hoveredMetric.observedLabel}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Cohort Mean</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                    {hoveredMetric.cohortMeanLabel}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', textAlign: 'center', width: '100%' }}>
              💡 Hover over any behavioral dimension bar to inspect standard deviations, observed volume, and peer baseline means
            </p>
          )}
        </div>
      </div>

      {/* ── Baseline Modal Integration ── */}
      <BaselineModal
        employee={activeEmployee}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
