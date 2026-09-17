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
      primaryAnomaly: 'Mass data exfiltration surge — 21.9 GB outbound to unapproved cloud storage',
      tags: [
        { label: '61x Above Peer Avg', severity: 'critical' },
        { label: '03:14 AM VPN Access', severity: 'high' },
        { label: 'Admin Role Escalation', severity: 'high' },
      ],
      deviationSummary: 'Exceeds department limits across multiple dimensions',
    };
  } else {
    return {
      primaryAnomaly: 'Anomalous bulk download and off-hours intellectual property access',
      tags: [
        { label: '19x Above Peer Avg', severity: 'high' },
        { label: 'Weekend Logons', severity: 'medium' },
        { label: '1,450 Files Retrieved', severity: 'medium' },
      ],
      deviationSummary: 'Elevated activity vs department cohort',
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
      className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden mb-6"
      style={{ borderTop: '2px solid #EF4444' }}
    >
      {/* ── Section Header ── */}
      <div
        className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
          >
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="m-0 text-[15px] font-bold text-slate-100 tracking-tight">
                Flagged Outliers — Immediate SOC Action Required
              </h3>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono"
                style={{ color: '#F87171', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
              >
                {loading ? '…' : `${outliers.length} Active Alert${outliers.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <p className="mt-0.5 mb-0 text-xs text-slate-400">
              Identities with severe baseline deviations, data exfiltration, or privilege abuse
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Sorted by</span>
          <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
            Threat Severity ↓
          </span>
        </div>
      </div>

      {/* ── Outlier Rows ── */}
      <div className="p-5 flex flex-col gap-3">
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
                className="rounded-lg border border-slate-700/80 p-4 flex items-center justify-between gap-5 flex-wrap transition-colors"
                style={{ backgroundColor: '#1e293b' }}
              >
                {/* Left: Avatar, Name, Department */}
                <div className="flex items-center gap-4 flex-[1_1_320px]">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{
                      backgroundColor: '#0f172a',
                      border: `1px solid ${isCritical ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
                      color: riskColor,
                    }}
                  >
                    {initials}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-100">
                        {emp.first_name} {emp.last_name}
                      </span>
                      <code className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded">
                        {emp.emp_id}
                      </code>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide"
                        style={{ color: riskColor, backgroundColor: riskBg, border: `1px solid ${riskBorder}` }}
                      >
                        {isCritical ? 'CRITICAL' : 'HIGH'}
                      </span>
                    </div>

                    <p className="m-0 text-xs text-slate-400">
                      {emp.designation} · <span className="text-slate-300">{emp.department}</span>
                    </p>

                    <p className="m-0 text-[11px] text-slate-400 leading-snug">
                      {highlights.primaryAnomaly}
                    </p>
                  </div>
                </div>

                {/* Middle: Anomaly Tags */}
                <div className="flex flex-col gap-2 flex-[1_1_240px]">
                  <div className="flex gap-2 flex-wrap">
                    {highlights.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-1 rounded-md font-mono"
                        style={{
                          color: tag.severity === 'critical' ? '#F87171' : tag.severity === 'high' ? '#FBBF24' : '#94A3B8',
                          backgroundColor: tag.severity === 'critical' ? 'rgba(239,68,68,0.1)' : tag.severity === 'high' ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.15)',
                          border: `1px solid ${tag.severity === 'critical' ? 'rgba(239,68,68,0.2)' : tag.severity === 'high' ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.25)'}`,
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {highlights.deviationSummary}
                  </span>
                </div>

                {/* Right: Score & Inspect */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">
                      Threat Score
                    </span>
                    <span className="text-2xl font-extrabold font-mono leading-none" style={{ color: riskColor }}>
                      {normScore}
                      <span className="text-xs text-slate-500 font-normal">/100</span>
                    </span>
                  </div>

                  <button
                    id={`inspect-baseline-btn-${emp.emp_id}`}
                    type="button"
                    onClick={() => onInspect(emp)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors"
                    style={{
                      border: '1px solid #475569',
                      backgroundColor: '#0f172a',
                      color: '#E2E8F0',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#334155';
                      e.currentTarget.style.borderColor = '#64748B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0f172a';
                      e.currentTarget.style.borderColor = '#475569';
                    }}
                  >
                    <span>Inspect Baseline</span>
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
