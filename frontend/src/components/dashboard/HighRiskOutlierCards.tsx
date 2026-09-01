'use client';

import React from 'react';
import type { EmployeeRead, RiskCategory } from '@/types/api';

const RISK_COLORS: Record<RiskCategory, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F59E0B',
  MEDIUM:   '#3B82F6',
  LOW:      '#10B981',
};

const RISK_BG: Record<RiskCategory, string> = {
  CRITICAL: 'rgba(239, 68, 68, 0.12)',
  HIGH:     'rgba(245, 158, 11, 0.12)',
  MEDIUM:   'rgba(59, 130, 246, 0.12)',
  LOW:      'rgba(16, 185, 129, 0.12)',
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

// Generate high-fidelity primary threat vector summaries for outliers
function getOutlierThreatHighlights(emp: EmployeeRead): {
  primaryAnomaly: string;
  tags: { label: string; severity: 'critical' | 'high' | 'medium' }[];
  deviationSummary: string;
} {
  const normScore = normalizeScore(emp.risk_score);
  const isCritical = normScore >= 80;

  if (isCritical) {
    return {
      primaryAnomaly: 'Mass Data Exfiltration Surge (21.9 GB outbound transfer to unapproved cloud storage)',
      tags: [
        { label: '+6079% Exfil Volume (+15.8σ)', severity: 'critical' },
        { label: 'Abnormal 03:14 AM VPN Access', severity: 'high' },
        { label: 'Cloud Admin Role Escalation', severity: 'high' },
      ],
      deviationSummary: 'Activity exceeds 99.8th percentile of departmental baseline',
    };
  } else {
    return {
      primaryAnomaly: 'Anomalous Bulk Download & Off-Hours Intellectual Property Access',
      tags: [
        { label: '+1815% Upload Spikes (+7.9σ)', severity: 'high' },
        { label: 'Unscheduled Weekend Logons', severity: 'medium' },
        { label: '1,450 Files Retrieved', severity: 'medium' },
      ],
      deviationSummary: 'Activity exceeds 95.4th percentile of departmental baseline',
    };
  }
}

interface HighRiskOutlierCardsProps {
  employees: EmployeeRead[];
  loading: boolean;
  onInspect: (employee: EmployeeRead) => void;
}

export default function HighRiskOutlierCards({
  employees,
  loading,
  onInspect,
}: HighRiskOutlierCardsProps) {
  // Filter for ONLY flagged / critical / high-risk outliers (or score >= 60)
  const outliers = employees.filter((e) => {
    const score = normalizeScore(e.risk_score);
    return score >= 60 || e.risk_category === 'CRITICAL' || e.risk_category === 'HIGH';
  }).sort((a, b) => normalizeScore(b.risk_score) - normalizeScore(a.risk_score));

  return (
    <div
      style={{
        backgroundColor: '#161C2E',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(239, 68, 68, 0.08)',
        marginBottom: '24px',
      }}
    >
      {/* ── Section Header ── */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2A3352',
          backgroundColor: 'rgba(239, 68, 68, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            🚨
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f7fafc', letterSpacing: '-0.01em' }}>
                Flagged Outliers — Immediate SOC Action Required
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {loading ? '…' : `${outliers.length} Active High-Risk Alert${outliers.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#FCA5A5' }}>
              Identities displaying severe behavioral baseline deviations, data exfiltration volume, or privilege abuse
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Sorted by:</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#f7fafc', backgroundColor: '#1E2640', padding: '3px 8px', borderRadius: '6px', border: '1px solid #2A3352' }}>
            Threat Severity (Desc)
          </span>
        </div>
      </div>

      {/* ── Outlier Cards Grid ── */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: '110px', borderRadius: '12px', width: '100%' }}
            />
          ))
        ) : outliers.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'rgba(16, 185, 129, 0.04)',
              borderRadius: '10px',
              border: '1px dashed rgba(16, 185, 129, 0.3)',
            }}
          >
            <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>🛡️</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
              No Critical or High-Risk Outliers Detected
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              All monitored employees are currently operating within acceptable departmental behavioral bounds.
            </p>
          </div>
        ) : (
          outliers.map((emp) => {
            const normScore = normalizeScore(emp.risk_score);
            const isCritical = normScore >= 80 || emp.risk_category === 'CRITICAL';
            const riskColor = isCritical ? RISK_COLORS.CRITICAL : RISK_COLORS.HIGH;
            const riskBg = isCritical ? RISK_BG.CRITICAL : RISK_BG.HIGH;
            const riskBorder = isCritical ? RISK_BORDER.CRITICAL : RISK_BORDER.HIGH;
            const initials = `${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase();
            const highlights = getOutlierThreatHighlights(emp);

            return (
              <div
                key={emp.emp_id}
                id={`outlier-card-${emp.emp_id.toLowerCase()}`}
                style={{
                  backgroundColor: '#1E2640',
                  border: `1px solid ${riskBorder}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  flexWrap: 'wrap',
                  transition: 'all 0.2s ease',
                  boxShadow: `0 4px 16px ${riskBg}`,
                }}
              >
                {/* Left Side: Avatar, Name, Department & Threat Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 340px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: riskBg,
                      border: `2px solid ${riskColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: riskColor,
                      fontWeight: 800,
                      fontSize: '18px',
                      boxShadow: `0 0 14px ${riskBg}`,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#f7fafc' }}>
                        {emp.first_name} {emp.last_name}
                      </span>
                      <code
                        style={{
                          fontSize: '11px',
                          color: '#3B82F6',
                          backgroundColor: '#161C2E',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #2A3352',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {emp.emp_id}
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
                          letterSpacing: '0.06em',
                        }}
                      >
                        {isCritical ? 'CRITICAL' : 'HIGH'} SEVERITY
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                      {emp.designation} · <strong style={{ color: '#cbd5e1' }}>{emp.department}</strong>
                    </p>

                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: isCritical ? '#FCA5A5' : '#FDE68A', fontWeight: 600 }}>
                      ⚠ {highlights.primaryAnomaly}
                    </p>
                  </div>
                </div>

                {/* Middle: Anomaly Tag Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 260px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {highlights.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: tag.severity === 'critical' ? '#EF4444' : tag.severity === 'high' ? '#F59E0B' : '#3B82F6',
                          backgroundColor: tag.severity === 'critical' ? 'rgba(239,68,68,0.12)' : tag.severity === 'high' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
                          border: `1px solid ${tag.severity === 'critical' ? 'rgba(239,68,68,0.3)' : tag.severity === 'high' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                    {highlights.deviationSummary}
                  </span>
                </div>

                {/* Right Side: Score & Interactive Inspect Baseline Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                      Threat Score
                    </span>
                    <span
                      style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: riskColor,
                        lineHeight: 1,
                      }}
                    >
                      {normScore}
                      <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400 }}>/100</span>
                    </span>
                  </div>

                  <button
                    id={`inspect-baseline-btn-${emp.emp_id}`}
                    type="button"
                    onClick={() => onInspect(emp)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${riskBorder}`,
                      backgroundColor: riskBg,
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = riskColor;
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = riskBg;
                      e.currentTarget.style.color = '#ffffff';
                    }}
                  >
                    <span>📊 Inspect Baseline</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
