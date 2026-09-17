'use client';

import type { RiskSummaryResponse } from '@/types/api';

// ── Icons for upper-right square badges ───────────────────────────────────────

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#EF4444]">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#F59E0B]">
      <path d="m10.29 3.86-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.71-2.14l-7-12a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={12} y1={9} x2={12} y2={13} strokeLinecap="round" />
      <circle cx={12} cy={17} r={0.5} fill="currentColor" />
    </svg>
  );
}

function UsersBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#F59E0B]">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx={9} cy={7} r={4} />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}

function ZapBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#10B981]">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PulseBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#10B981]">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ThreatOverviewCardsProps {
  summary: RiskSummaryResponse | null;
  loading: boolean;
}

export default function ThreatOverviewCards({ summary, loading }: ThreatOverviewCardsProps) {
  // Computed security posture score (0 - 100)
  const postureScore = summary ? Math.max(0, Math.round(100 - summary.average_threat_score)) : 87;

  // Arc calculation for circular posture gauge
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - postureScore / 100);

  // Dynamic backend data values
  const activeThreatsCount = summary ? summary.high_risk_count + summary.critical_count : 17;
  const criticalCount      = summary ? summary.critical_count : 3;
  const highRiskCount      = summary ? summary.high_risk_count : 8;
  const totalMonitored     = summary ? summary.total_employees : 15;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mb-6">
      
      {/* ── CARD 1: CIRCULAR SECURITY POSTURE GAUGE ── */}
      <div className="cyber-card p-4 flex flex-col justify-between items-center relative overflow-hidden bg-[#050C08] border border-[#10B981]/40 rounded-xl min-h-[160px]">
        <div className="relative w-28 h-28 flex items-center justify-center my-auto">
          {/* Circular Neon Gauge SVG */}
          <svg className="w-28 h-28 transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r={r}
              stroke="#0D261B"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r={r}
              stroke="#10B981"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={loading ? circumference : strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out', filter: 'drop-shadow(0 0 6px #10B981)' }}
            />
          </svg>
          {/* Score Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline">
              <span className="text-2xl font-black font-mono text-[#ECFDF5] leading-none">{loading ? '—' : postureScore}</span>
              <span className="text-[10px] text-[#A7F3D0] font-mono">/100</span>
            </div>
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#10B981] mt-1">SECURITY POSTURE</span>
          </div>
        </div>
        {/* Delta footer */}
        <div className="text-[10px] font-bold text-[#10B981] flex items-center gap-1 mt-1">
          <span>▲ +4.2% DoD</span>
        </div>
      </div>

      {/* ── CARD 2: ACTIVE THREATS ── */}
      <div className="cyber-card p-4 flex flex-col justify-between bg-[#050C08] border border-[#10B981]/30 hover:border-[#EF4444]/60 rounded-xl min-h-[160px] transition-all">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0] font-mono">
            ACTIVE THREATS
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-center">
            <FlameIcon />
          </div>
        </div>
        <div className="my-2">
          <div className="text-3xl font-black font-mono text-[#EF4444]">
            {loading ? '—' : String(activeThreatsCount).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-semibold text-[#EF4444] mt-1 flex items-center gap-1">
            <span>▲ +2 Critical active</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#6EE7B7] pt-2 border-t border-[#18382B]">
          <span className="truncate">Author Morgan cluster</span>
          <span className="text-[#10B981]">↗</span>
        </div>
      </div>

      {/* ── CARD 3: CRITICAL INCIDENTS ── */}
      <div className="cyber-card p-4 flex flex-col justify-between bg-[#050C08] border border-[#10B981]/30 hover:border-[#F59E0B]/60 rounded-xl min-h-[160px] transition-all">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0] font-mono">
            CRITICAL INCIDENTS
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex items-center justify-center">
            <AlertTriangleIcon />
          </div>
        </div>
        <div className="my-2">
          <div className="text-3xl font-black font-mono text-[#F59E0B]">
            {loading ? '—' : String(criticalCount).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-semibold text-[#ECFDF5] mt-1">
            1 Investigating • 2 Triaged
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#6EE7B7] pt-2 border-t border-[#18382B]">
          <span className="truncate font-mono">INC-2026-0891 Root</span>
          <span className="text-[#10B981]">↗</span>
        </div>
      </div>

      {/* ── CARD 4: HIGH RISK USERS ── */}
      <div className="cyber-card p-4 flex flex-col justify-between bg-[#050C08] border border-[#10B981]/30 hover:border-[#F59E0B]/60 rounded-xl min-h-[160px] transition-all">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0] font-mono">
            HIGH RISK USERS
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex items-center justify-center">
            <UsersBadgeIcon />
          </div>
        </div>
        <div className="my-2">
          <div className="text-3xl font-black font-mono text-[#F59E0B]">
            {loading ? '—' : String(highRiskCount).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-semibold text-[#EF4444] mt-1">
            +3 today (Author #1)
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#6EE7B7] pt-2 border-t border-[#18382B]">
          <span className="truncate">{totalMonitored} total monitored</span>
          <span className="text-[#10B981]">↗</span>
        </div>
      </div>

      {/* ── CARD 5: ANOMALIES / HR ── */}
      <div className="cyber-card p-4 flex flex-col justify-between bg-[#050C08] border border-[#10B981]/30 hover:border-[#10B981]/60 rounded-xl min-h-[160px] transition-all">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0] font-mono">
            ANOMALIES / HR
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center">
            <ZapBadgeIcon />
          </div>
        </div>
        <div className="my-2">
          <div className="text-3xl font-black font-mono text-[#10B981]">
            12.4K
          </div>
          <div className="text-[11px] font-bold text-[#10B981] mt-1">
            96.4% AI Precision
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#6EE7B7] pt-2 border-t border-[#18382B]">
          <span className="truncate">Isolation Forest Model</span>
          <span className="text-[#10B981]">↗</span>
        </div>
      </div>

      {/* ── CARD 6: LIVE TELEMETRY ── */}
      <div className="cyber-card p-4 flex flex-col justify-between bg-[#050C08] border border-[#10B981]/30 hover:border-[#10B981]/60 rounded-xl min-h-[160px] transition-all">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0] font-mono">
            LIVE TELEMETRY
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center">
            <PulseBadgeIcon />
          </div>
        </div>
        <div className="my-2">
          <div className="text-3xl font-black font-mono text-[#10B981]">
            12.8K
          </div>
          <div className="text-[11px] font-semibold text-[#10B981] mt-1 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse-green" />
            <span>Streaming EPS</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#6EE7B7] pt-2 border-t border-[#18382B]">
          <span className="truncate">14 Data Pipelines</span>
          <span className="text-[#10B981]">↗</span>
        </div>
      </div>

    </div>
  );
}
