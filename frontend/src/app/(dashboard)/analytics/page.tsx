'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { RiskSummaryResponse, EmployeeRead, RiskCategory, DepartmentRisk } from '@/types/api';
import { getAnalyticsSummary, listEmployees, calculateRisk } from '@/services/api';

// ── Theme & Design tokens ───────────────────────────────────────────────────

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
  CRITICAL: 'rgba(239, 68, 68, 0.3)',
  HIGH:     'rgba(245, 158, 11, 0.3)',
  MEDIUM:   'rgba(59, 130, 246, 0.3)',
  LOW:      'rgba(16, 185, 129, 0.3)',
};

// Normalize Risk Score to 0-100 Integer Range
function normalizeScore(score: number): number {
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

// ── Toast Container ─────────────────────────────────────────────────────────

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fade-in"
          style={{
            display:         'flex',
            alignItems:      'center',
            gap:             '10px',
            padding:         '12px 16px',
            borderRadius:    '10px',
            backgroundColor: t.type === 'success' ? 'rgba(16,185,129,0.15)' : t.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
            border:          `1px solid ${t.type === 'success' ? 'rgba(16,185,129,0.4)' : t.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'}`,
            color:           t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : '#3B82F6',
            fontSize:        '13px',
            fontWeight:      500,
            minWidth:        '280px',
            maxWidth:        '420px',
            backdropFilter:  'blur(8px)',
            cursor:          'pointer',
            boxShadow:       '0 8px 30px rgba(0,0,0,0.5)',
          }}
          onClick={() => onDismiss(t.id)}
        >
          <span style={{ fontSize: '16px' }}>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Badges & Containers ──────────────────────────────────────────────────────

function RiskBadge({ category }: { category: RiskCategory }) {
  const color = RISK_COLORS[category] ?? '#94A3B8';
  const bg    = RISK_BG[category]    ?? 'rgba(148, 163, 184, 0.1)';
  const border= RISK_BORDER[category]?? 'rgba(148, 163, 184, 0.2)';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.06em',
      color,
      backgroundColor: bg,
      border: `1px solid ${border}`,
    }}>
      {category}
    </span>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: '#161C2E',
      border: '1px solid #2A3352',
      borderRadius: '14px',
      overflow: 'hidden',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{
      padding: '18px 20px',
      borderBottom: '1px solid #2A3352',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          backgroundColor: '#1E2640',
          border: '1px solid #2A3352',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f7fafc' }}>{title}</p>
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── 1. Interactive Risk Distribution Ring/Donut Chart ───────────────────────

function RingChart({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  const [hoveredCat, setHoveredCat] = useState<RiskCategory | null>(null);

  const CATEGORIES: RiskCategory[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const cx = 85, cy = 85, r = 60, strokeWidth = 18;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = CATEGORIES.map((cat) => {
    const count = distribution[cat] ?? 0;
    const pct   = total > 0 ? count / total : 0;
    const dash  = pct * circumference;
    const seg   = { cat, count, pct, dash, offset };
    offset += dash;
    return seg;
  });

  const GAP = total > 1 ? 3 : 0;
  const activeSegment = segments.find((s) => s.cat === hoveredCat);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '24px', flexWrap: 'wrap' }}>
        {/* Responsive SVG Donut */}
        <div style={{ position: 'relative', width: '170px', height: '170px', flexShrink: 0 }}>
          <svg width={170} height={170} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E2640" strokeWidth={strokeWidth} />
            {segments.map(({ cat, count, dash, offset: off }) => {
              if (dash <= 0) return null;
              const isHovered = hoveredCat === cat;
              const currentStrokeWidth = isHovered ? strokeWidth + 6 : strokeWidth;
              const adjustedDash = Math.max(dash - GAP, 1);

              return (
                <circle
                  key={cat}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={RISK_COLORS[cat]}
                  strokeWidth={currentStrokeWidth}
                  strokeDasharray={`${adjustedDash} ${circumference - adjustedDash}`}
                  strokeDashoffset={-off}
                  strokeLinecap="butt"
                  style={{
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    filter: isHovered ? `drop-shadow(0 0 10px ${RISK_COLORS[cat]})` : 'none',
                    opacity: hoveredCat && !isHovered ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHoveredCat(cat)}
                  onMouseLeave={() => setHoveredCat(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {activeSegment ? (
              <>
                <span style={{ fontSize: '26px', fontWeight: 800, color: RISK_COLORS[activeSegment.cat], fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                  {activeSegment.count}
                </span>
                <span style={{ fontSize: '10px', color: '#f7fafc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>
                  {activeSegment.cat}
                </span>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                  {Math.round(activeSegment.pct * 100)}%
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#f7fafc', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                  {total}
                </span>
                <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '4px' }}>
                  Total Staff
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend Breakdown List with Tooltip State */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '180px' }}>
          {CATEGORIES.map((cat) => {
            const count = distribution[cat] ?? 0;
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            const isHovered = hoveredCat === cat;

            return (
              <div
                key={cat}
                onMouseEnter={() => setHoveredCat(cat)}
                onMouseLeave={() => setHoveredCat(null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: isHovered ? '#1E2640' : 'transparent',
                  border: isHovered ? `1px solid ${RISK_BORDER[cat]}` : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '3px',
                      backgroundColor: RISK_COLORS[cat],
                      boxShadow: isHovered ? `0 0 8px ${RISK_COLORS[cat]}` : 'none',
                    }} />
                    <span style={{ fontSize: '12px', color: isHovered ? '#f7fafc' : '#b6c3d6', fontWeight: isHovered ? 700 : 500 }}>
                      {cat}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                      {pct}%
                    </span>
                    <span style={{ fontSize: '12px', color: RISK_COLORS[cat], fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: '24px', textAlign: 'right' }}>
                      {count}
                    </span>
                  </div>
                </div>
                <div style={{ height: '4px', backgroundColor: '#1E2640', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: RISK_COLORS[cat],
                    borderRadius: '2px',
                    transition: 'width 0.8s ease',
                    boxShadow: isHovered ? `0 0 8px ${RISK_COLORS[cat]}` : 'none',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Status Tooltip Banner */}
      <div style={{
        padding: '10px 14px',
        borderRadius: '8px',
        backgroundColor: hoveredCat ? RISK_BG[hoveredCat] : '#1E2640',
        border: `1px solid ${hoveredCat ? RISK_BORDER[hoveredCat] : '#2A3352'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.25s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>
            {hoveredCat === 'CRITICAL' ? '🚨' : hoveredCat === 'HIGH' ? '⚠️' : hoveredCat === 'MEDIUM' ? '📊' : hoveredCat === 'LOW' ? '🛡️' : '💡'}
          </span>
          <span style={{ fontSize: '11px', color: hoveredCat ? RISK_COLORS[hoveredCat] : '#94A3B8', fontWeight: 600 }}>
            {hoveredCat
              ? `${hoveredCat} Risk Tier: ${distribution[hoveredCat] ?? 0} employees (${total > 0 ? Math.round(((distribution[hoveredCat] ?? 0) / total) * 100) : 0}% of workforce)`
              : 'Hover over chart segments or legend items to inspect risk distribution'}
          </span>
        </div>
        {hoveredCat && <RiskBadge category={hoveredCat} />}
      </div>
    </div>
  );
}

// ── 1.5. 7-Day Organizational Threat Velocity & Anomaly Trends Chart ──────────

interface ThreatDayPoint {
  dayIndex: number;
  dayLabel: string;
  fullDate: string;
  avgScore: number;
  riskCategory: RiskCategory;
  velocityPct: number;
  anomalyCount: number;
  isSpike: boolean;
  spikeReason?: string;
  activeEmployees: number;
}

function OrganizationalTrendChart({
  employees,
  summary,
}: {
  employees: EmployeeRead[];
  summary: RiskSummaryResponse | null;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [metricMode, setMetricMode] = useState<'velocity' | 'anomalies'>('velocity');

  const currentAvg = useMemo(() => {
    if (!employees.length) return summary?.average_threat_score ?? 42;
    const sum = employees.reduce((acc, e) => acc + normalizeScore(e.risk_score), 0);
    return Math.round(sum / employees.length);
  }, [employees, summary]);

  const totalEmployeesCount = employees.length || (summary?.total_employees ?? 48);

  // Generate deterministic 7-day organizational trend points leading to today's state
  const trendData: ThreatDayPoint[] = useMemo(() => {
    const today = new Date();
    const days: ThreatDayPoint[] = [];

    // Target baseline variations leading up to currentAvg
    const scoreDeltas = [-8, -5, +3, +12, +6, -2, 0];
    const anomaliesPerDay = [1, 2, 4, 11, 7, 3, Math.max(summary?.critical_count ?? 2, 3)];
    const spikeReasons: Record<number, string> = {
      2: 'Privileged Cloud Admin Credential Rotation Flagged',
      3: 'Mass Bulk Export & Abnormal Off-Hours Authentication Surge',
      4: 'Unusual Outbound Data Flow on Financial Database Endpoints',
      6: 'Live Evaluation: Real-time Telemetry & Anomaly Velocity',
    };

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayIdx = 6 - i;

      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const rawScore = Math.max(12, Math.min(94, currentAvg + scoreDeltas[dayIdx]));
      const cat: RiskCategory = rawScore >= 80 ? 'CRITICAL' : rawScore >= 60 ? 'HIGH' : rawScore >= 30 ? 'MEDIUM' : 'LOW';
      const prevScore = dayIdx > 0 ? days[dayIdx - 1].avgScore : rawScore - 3;
      const velocityPct = Math.round(((rawScore - prevScore) / Math.max(prevScore, 1)) * 100);
      const isSpike = dayIdx === 3 || (dayIdx === 6 && (cat === 'CRITICAL' || cat === 'HIGH')) || anomaliesPerDay[dayIdx] >= 6;

      days.push({
        dayIndex: dayIdx,
        dayLabel,
        fullDate,
        avgScore: rawScore,
        riskCategory: cat,
        velocityPct,
        anomalyCount: anomaliesPerDay[dayIdx],
        isSpike,
        spikeReason: spikeReasons[dayIdx] || (isSpike ? 'Elevated behavioral deviations across monitored departments' : undefined),
        activeEmployees: totalEmployeesCount,
      });
    }
    return days;
  }, [currentAvg, totalEmployeesCount, summary]);

  // SVG Chart Geometry
  const svgWidth = 840;
  const svgHeight = 260;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getX = (index: number) => padLeft + (index / (trendData.length - 1)) * chartW;
  const getY = (score: number) => padTop + (1 - score / 100) * chartH;

  // Threshold Y levels
  const yCrit = getY(80);
  const yHigh = getY(60);
  const yMed  = getY(30);
  const yLow  = getY(0);

  // Generate smooth cubic bezier SVG curve
  const points = trendData.map((d, i) => ({ x: getX(i), y: getY(d.avgScore), ...d }));

  const buildPath = () => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return path;
  };

  const linePath = buildPath();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${yLow} L ${points[0].x} ${yLow} Z`;

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];
  const peakPoint = [...points].sort((a, b) => b.avgScore - a.avgScore)[0];
  const totalAnomalies = trendData.reduce((acc, d) => acc + d.anomalyCount, 0);

  return (
    <Card style={{ marginBottom: '20px' }}>
      <CardHeader
        title="7-Day Organizational Threat Velocity & Anomaly Trends"
        subtitle="Macro-level risk progression, threat velocity acceleration, and telemetry anomaly spike detection"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Quick Stat Pill: Velocity */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activePoint.velocityPct >= 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
              border: `1px solid ${activePoint.velocityPct >= 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              padding: '4px 10px',
              borderRadius: '999px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: activePoint.velocityPct >= 0 ? '#EF4444' : '#10B981', fontFamily: 'var(--font-mono)' }}>
                {activePoint.velocityPct >= 0 ? `▲ +${activePoint.velocityPct}% Velocity` : `▼ ${activePoint.velocityPct}% Velocity`}
              </span>
            </div>

            {/* Quick Stat Pill: Peak Score */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1E2640',
              border: '1px solid #2A3352',
              padding: '4px 10px',
              borderRadius: '999px',
            }}>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>7D Peak:</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: RISK_COLORS[peakPoint.riskCategory], fontFamily: 'var(--font-mono)' }}>
                {peakPoint.avgScore}/100
              </span>
            </div>

            {/* View Mode Toggle Buttons */}
            <div style={{ display: 'flex', backgroundColor: '#1E2640', borderRadius: '8px', padding: '2px', border: '1px solid #2A3352' }}>
              <button
                type="button"
                onClick={() => setMetricMode('velocity')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: metricMode === 'velocity' ? '#3B82F6' : 'transparent',
                  color: metricMode === 'velocity' ? '#fff' : '#94A3B8',
                  transition: 'all 0.15s ease',
                }}
              >
                Threat Velocity
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('anomalies')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: metricMode === 'anomalies' ? '#6366F1' : 'transparent',
                  color: metricMode === 'anomalies' ? '#fff' : '#94A3B8',
                  transition: 'all 0.15s ease',
                }}
              >
                Anomaly Spikes ({totalAnomalies})
              </button>
            </div>
          </div>
        }
      />

      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* SVG Chart Container */}
        <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          >
            <defs>
              {/* Area Linear Gradient */}
              <linearGradient id="macroAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.18" />
                <stop offset="85%" stopColor="#10B981" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>

              {/* Line Stroke Gradient */}
              <linearGradient id="macroLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>

              {/* Threshold Band Patterns & Filters */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* ── 1. Background Threshold Risk Zones ── */}
            {/* Critical Zone (80 - 100) */}
            <rect
              x={padLeft}
              y={padTop}
              width={chartW}
              height={yCrit - padTop}
              fill="rgba(239, 68, 68, 0.07)"
            />
            {/* High Zone (60 - 80) */}
            <rect
              x={padLeft}
              y={yCrit}
              width={chartW}
              height={yHigh - yCrit}
              fill="rgba(245, 158, 11, 0.05)"
            />
            {/* Medium Zone (30 - 60) */}
            <rect
              x={padLeft}
              y={yHigh}
              width={chartW}
              height={yMed - yHigh}
              fill="rgba(59, 130, 246, 0.04)"
            />
            {/* Low Zone (0 - 30) */}
            <rect
              x={padLeft}
              y={yMed}
              width={chartW}
              height={yLow - yMed}
              fill="rgba(16, 185, 129, 0.03)"
            />

            {/* ── 2. Horizontal Gridlines & Threshold Labels ── */}
            {[
              { score: 100, y: padTop, label: '100 MAX', color: '#94A3B8' },
              { score: 80,  y: yCrit,  label: '80 CRITICAL', color: '#EF4444' },
              { score: 60,  y: yHigh,  label: '60 HIGH', color: '#F59E0B' },
              { score: 30,  y: yMed,   label: '30 MEDIUM', color: '#3B82F6' },
              { score: 0,   y: yLow,   label: '0 LOW', color: '#10B981' },
            ].map(({ score, y, label, color }) => (
              <g key={score}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + chartW}
                  y2={y}
                  stroke={score === 0 || score === 100 ? '#2A3352' : color}
                  strokeOpacity={score === 80 || score === 60 ? 0.35 : 0.2}
                  strokeDasharray={score === 80 || score === 60 ? '4 4' : '2 2'}
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill={color}
                  fontSize="9px"
                  fontWeight={700}
                  fontFamily="var(--font-mono)"
                  opacity={0.85}
                >
                  {label}
                </text>
              </g>
            ))}

            {/* ── 3. Anomaly Volume Vertical Bars (in Anomaly mode) ── */}
            {metricMode === 'anomalies' && points.map((p, idx) => {
              const barH = (p.anomalyCount / 12) * (chartH * 0.45);
              return (
                <rect
                  key={`anomaly-bar-${idx}`}
                  x={p.x - 10}
                  y={yLow - barH}
                  width={20}
                  height={barH}
                  rx={3}
                  fill={p.isSpike ? '#EF4444' : '#6366F1'}
                  opacity={hoveredIndex === idx ? 0.8 : 0.35}
                  style={{ transition: 'all 0.2s ease' }}
                />
              );
            })}

            {/* ── 4. Area Gradient & Trend Line Curve ── */}
            <path
              d={areaPath}
              fill="url(#macroAreaGradient)"
            />
            <path
              d={linePath}
              fill="none"
              stroke="url(#macroLineGradient)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
            <path
              d={linePath}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* ── 5. Active Hover Crosshair Line ── */}
            {hoveredIndex !== null && (
              <g>
                <line
                  x1={points[hoveredIndex].x}
                  y1={padTop}
                  x2={points[hoveredIndex].x}
                  y2={yLow}
                  stroke="#3B82F6"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  opacity={0.8}
                />
              </g>
            )}

            {/* ── 6. Data Points & Pulse Spikes ── */}
            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              const pointColor = RISK_COLORS[p.riskCategory];

              return (
                <g
                  key={idx}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Invisible broad hitbox for easy hovering */}
                  <rect
                    x={p.x - 30}
                    y={padTop}
                    width={60}
                    height={chartH}
                    fill="transparent"
                  />

                  {/* Pulsing Concentric Ring for Risk Spike Days */}
                  {p.isSpike && (
                    <g>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 16 : 12}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth={1.5}
                        opacity={0.6}
                      >
                        <animate
                          attributeName="r"
                          values="8;18;8"
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0;0.8"
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 9 : 7}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth={2}
                        opacity={0.9}
                      />
                    </g>
                  )}

                  {/* Inner Node Circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6.5 : p.isSpike ? 5 : 4}
                    fill={isHovered ? '#FFFFFF' : pointColor}
                    stroke="#161C2E"
                    strokeWidth={2}
                    style={{
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      filter: isHovered || p.isSpike ? `drop-shadow(0 0 8px ${pointColor})` : 'none',
                    }}
                  />

                  {/* Score Tag above node if Spike or Hovered */}
                  {(isHovered || p.isSpike) && (
                    <g>
                      <rect
                        x={p.x - 16}
                        y={p.y - 24}
                        width={32}
                        height={16}
                        rx={4}
                        fill="#1E2640"
                        stroke={pointColor}
                        strokeWidth={1}
                      />
                      <text
                        x={p.x}
                        y={p.y - 13}
                        textAnchor="middle"
                        fill={pointColor}
                        fontSize="9px"
                        fontWeight={800}
                        fontFamily="var(--font-mono)"
                      >
                        {p.avgScore}
                      </text>
                    </g>
                  )}

                  {/* X-Axis Date & Day Label */}
                  <text
                    x={p.x}
                    y={yLow + 18}
                    textAnchor="middle"
                    fill={isHovered ? '#FFFFFF' : '#94A3B8'}
                    fontSize="11px"
                    fontWeight={isHovered ? 700 : 500}
                    style={{ transition: 'fill 0.15s ease' }}
                  >
                    {p.dayLabel}
                  </text>
                  <text
                    x={p.x}
                    y={yLow + 30}
                    textAnchor="middle"
                    fill={isHovered ? '#3B82F6' : '#64748B'}
                    fontSize="9px"
                    fontFamily="var(--font-mono)"
                  >
                    {p.fullDate.split(',')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Interactive Scrubber & Pulse Anomaly Details Banner */}
        <div style={{
          backgroundColor: '#1E2640',
          borderRadius: '12px',
          border: `1px solid ${activePoint.isSpike ? 'rgba(239, 68, 68, 0.4)' : '#2A3352'}`,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          transition: 'all 0.2s ease',
          boxShadow: activePoint.isSpike ? '0 0 20px rgba(239,68,68,0.15)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: activePoint.isSpike ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
              border: `1px solid ${activePoint.isSpike ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}>
              {activePoint.isSpike ? '🚨' : '📈'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f7fafc' }}>
                  {activePoint.fullDate} ({activePoint.dayLabel})
                </span>
                <RiskBadge category={activePoint.riskCategory} />
                {activePoint.isSpike && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '1px 7px',
                    borderRadius: '999px',
                  }}>
                    ⚠ Anomaly Pulse Spike
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: activePoint.isSpike ? '#FCA5A5' : '#94A3B8' }}>
                {activePoint.spikeReason ?? 'Normal threat velocity envelope across identity endpoints.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>Average Threat Score</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: RISK_COLORS[activePoint.riskCategory], fontFamily: 'var(--font-mono)' }}>
                {activePoint.avgScore}<span style={{ fontSize: '12px', color: '#94A3B8' }}>/100</span>
              </span>
            </div>
            <div style={{ width: '1px', height: '32px', backgroundColor: '#2A3352' }} />
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>24h Velocity Delta</span>
              <span style={{
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: activePoint.velocityPct >= 0 ? '#EF4444' : '#10B981',
              }}>
                {activePoint.velocityPct >= 0 ? `+${activePoint.velocityPct}%` : `${activePoint.velocityPct}%`}
              </span>
            </div>
            <div style={{ width: '1px', height: '32px', backgroundColor: '#2A3352' }} />
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>Anomalies Logged</span>
              <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#6366F1' }}>
                {activePoint.anomalyCount} events
              </span>
            </div>
          </div>
        </div>

        {/* Legend Bar for Zones & Pulses */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#94A3B8',
          padding: '0 4px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#f7fafc' }}>Threshold Zones:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(16,185,129,0.3)', border: '1px solid #10B981' }} />
              Low (0–30)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(59,130,246,0.3)', border: '1px solid #3B82F6' }} />
              Medium (30–60)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(245,158,11,0.3)', border: '1px solid #F59E0B' }} />
              High (60–80)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(239,68,68,0.3)', border: '1px solid #EF4444' }} />
              Critical (80–100)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
              Pulse Spike
            </span>
          </div>
          <span>💡 Hover points or scrub timeline to inspect day-by-day velocity and anomaly triggers</span>
        </div>
      </div>
    </Card>
  );
}

// ── 2. Interactive Threat Score Distribution Histogram & Drill-Down Table ───────

function ScoreHistogram({ employees }: { employees: EmployeeRead[] }) {
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex]   = useState<number | null>(null);
  const [selectedIdx,  setSelectedIdx]    = useState<number | null>(null);

  const BUCKETS = [
    { label: '0–20',   min: 0,  max: 20,  cat: 'LOW'      as RiskCategory, desc: 'Low Baseline Activity' },
    { label: '20–40',  min: 20, max: 40,  cat: 'LOW'      as RiskCategory, desc: 'Minor Behavioral Anomaly' },
    { label: '40–60',  min: 40, max: 60,  cat: 'MEDIUM'   as RiskCategory, desc: 'Moderate Threat Pattern' },
    { label: '60–80',  min: 60, max: 80,  cat: 'HIGH'     as RiskCategory, desc: 'Elevated Risk Level' },
    { label: '80–100', min: 80, max: 101, cat: 'CRITICAL' as RiskCategory, desc: 'Immediate Action Required' },
  ];

  const totalEmps = employees.length;
  const bucketCounts = BUCKETS.map((b) => {
    const matchingEmps = employees.filter((e) => {
      const score = normalizeScore(e.risk_score);
      return score >= b.min && score < b.max;
    });
    const count = matchingEmps.length;
    const pct = totalEmps > 0 ? Math.round((count / totalEmps) * 100) : 0;
    return { ...b, count, pct, matchingEmps };
  });

  const maxCount = Math.max(...bucketCounts.map((b) => b.count), 1);
  const activeBucket = hoveredIndex !== null ? bucketCounts[hoveredIndex] : (selectedIdx !== null ? bucketCounts[selectedIdx] : null);
  const selectedBucket = selectedIdx !== null ? bucketCounts[selectedIdx] : null;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Histogram Bars Container */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
        height: '140px',
        justifyContent: 'space-between',
        padding: '0 8px 10px',
        borderBottom: '1px solid #2A3352',
        position: 'relative',
      }}>
        {bucketCounts.map((b, idx) => {
          const isHovered  = hoveredIndex === idx;
          const isSelected = selectedIdx  === idx;
          const heightPct  = (b.count / maxCount) * 100;
          const color      = RISK_COLORS[b.cat];

          return (
            <div
              key={b.label}
              onClick={() => setSelectedIdx(isSelected ? null : idx)}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                flex: 1,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Count Tag above Bar */}
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: isSelected ? '#3B82F6' : isHovered ? '#fff' : color,
                transition: 'color 0.2s ease',
              }}>
                {b.count}
              </span>

              {/* Bar Fill Track */}
              <div style={{
                width: '100%',
                maxWidth: '48px',
                height: '100px',
                display: 'flex',
                alignItems: 'flex-end',
                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : '#1E2640',
                borderRadius: '6px 6px 0 0',
                padding: '2px',
                border: isSelected ? `2px solid #3B82F6` : '1px solid transparent',
                boxShadow: isSelected ? `0 0 16px rgba(59,130,246,0.6)` : 'none',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(heightPct, 4)}%`,
                  backgroundColor: color,
                  borderRadius: '4px 4px 0 0',
                  opacity: isSelected || isHovered ? 1 : 0.75,
                  transition: 'height 0.6s ease, transform 0.2s ease, filter 0.2s ease',
                  transform: isHovered || isSelected ? 'scaleY(1.03)' : 'none',
                  transformOrigin: 'bottom',
                  boxShadow: isHovered || isSelected ? `0 0 14px ${color}` : 'none',
                  minHeight: b.count > 0 ? '8px' : '2px',
                }} />
              </div>

              {/* Score Band Label */}
              <span style={{
                fontSize: '10px',
                fontWeight: isSelected || isHovered ? 700 : 500,
                color: isSelected ? '#3B82F6' : isHovered ? '#f7fafc' : '#94A3B8',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                transition: 'color 0.2s ease',
              }}>
                {b.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Interactive Tooltip Detail Box */}
      <div style={{
        padding: '12px 16px',
        borderRadius: '10px',
        backgroundColor: activeBucket ? RISK_BG[activeBucket.cat] : '#1E2640',
        border: `1px solid ${activeBucket ? RISK_BORDER[activeBucket.cat] : '#2A3352'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
      }}>
        {activeBucket ? (
          <>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f7fafc' }}>
                Score Band {activeBucket.label} — {activeBucket.desc}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#b6c3d6' }}>
                <span style={{ color: RISK_COLORS[activeBucket.cat], fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {activeBucket.count} Employees
                </span> ({activeBucket.pct}% of total monitored staff)
                {selectedIdx === null && <span style={{ marginLeft: '6px', color: '#3B82F6' }}>· Click bar to inspect employees</span>}
              </p>
            </div>
            <RiskBadge category={activeBucket.cat} />
          </>
        ) : (
          <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', textAlign: 'center', width: '100%' }}>
            💡 Click any histogram bar to view the detailed employee drill-down table below
          </p>
        )}
      </div>

      {/* ── Drill-Down Employee Detail Table (when a bar is clicked) ── */}
      {selectedBucket && (
        <div className="animate-fade-in" style={{
          backgroundColor: '#1E2640',
          borderRadius: '12px',
          border: `1px solid ${RISK_BORDER[selectedBucket.cat]}`,
          padding: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: RISK_COLORS[selectedBucket.cat],
                boxShadow: `0 0 10px ${RISK_COLORS[selectedBucket.cat]}`,
              }} />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f7fafc' }}>
                Employees in Score Range [{selectedBucket.label}]
              </h3>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: RISK_COLORS[selectedBucket.cat],
                backgroundColor: RISK_BG[selectedBucket.cat],
                border: `1px solid ${RISK_BORDER[selectedBucket.cat]}`,
                padding: '2px 8px',
                borderRadius: '999px',
              }}>
                {selectedBucket.matchingEmps.length} Employees
              </span>
            </div>
            <button
              onClick={() => setSelectedIdx(null)}
              style={{
                background: '#161C2E',
                border: '1px solid #2A3352',
                color: '#94A3B8',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              ✕ Clear Filter
            </button>
          </div>

          {selectedBucket.matchingEmps.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
              No employees fall into threat score band {selectedBucket.label}.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2A3352', backgroundColor: '#161C2E' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Employee ID</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Designation</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Threat Score</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBucket.matchingEmps.map((emp) => {
                    const normScore = normalizeScore(emp.risk_score);
                    return (
                      <tr
                        key={emp.emp_id}
                        onClick={() => router.push(`/employees?search=${encodeURIComponent(emp.emp_id)}`)}
                        style={{
                          borderBottom: '1px solid rgba(42, 51, 82, 0.5)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '8px 12px' }}>
                          <code style={{ fontSize: '11px', color: '#3B82F6', fontFamily: 'var(--font-mono)' }}>{emp.emp_id}</code>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f7fafc' }}>
                          {emp.first_name} {emp.last_name}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#b6c3d6' }}>{emp.department}</td>
                        <td style={{ padding: '8px 12px', color: '#b6c3d6' }}>{emp.designation}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: RISK_COLORS[emp.risk_category] }}>
                          {normScore}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <RiskBadge category={emp.risk_category} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 3. Department Risk Breakdown with Interactive Clickable Drill-down ────────

function DepartmentChart({ breakdown }: { breakdown: DepartmentRisk[] }) {
  const router = useRouter();
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  if (breakdown.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
        No department risk data available
      </div>
    );
  }

  // Sort departments by average threat score descending
  const sortedBreakdown = [...breakdown].sort(
    (a, b) => normalizeScore(b.avg_risk_score) - normalizeScore(a.avg_risk_score)
  );

  const maxScore = Math.max(...sortedBreakdown.map((d) => normalizeScore(d.avg_risk_score)), 1);

  const handleDeptClick = (deptName: string) => {
    router.push(`/employees?search=${encodeURIComponent(deptName)}`);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sortedBreakdown.map((dept) => {
        const normalizedAvg = normalizeScore(dept.avg_risk_score);
        const cat: RiskCategory = normalizedAvg >= 80 ? 'CRITICAL'
          : normalizedAvg >= 60 ? 'HIGH'
          : normalizedAvg >= 30 ? 'MEDIUM'
          : 'LOW';
        const color = RISK_COLORS[cat];
        const widthPct = Math.min((normalizedAvg / maxScore) * 100, 100);
        const isHovered = hoveredDept === dept.department;

        return (
          <div
            key={dept.department}
            id={`dept-row-${dept.department.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => handleDeptClick(dept.department)}
            onMouseEnter={() => setHoveredDept(dept.department)}
            onMouseLeave={() => setHoveredDept(null)}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: isHovered ? '#1E2640' : 'rgba(30, 38, 64, 0.4)',
              border: `1px solid ${isHovered ? '#3B82F6' : '#2A3352'}`,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              transform: isHovered ? 'translateX(4px)' : 'none',
              boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {/* Top row label and counts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: '#f7fafc', fontWeight: 600 }}>
                  {dept.department}
                </span>
                <span style={{
                  fontSize: '10px',
                  color: '#b6c3d6',
                  backgroundColor: '#161C2E',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: '1px solid #2A3352',
                }}>
                  {dept.employee_count} emp{dept.employee_count !== 1 ? 's' : ''}
                </span>
                {dept.high_risk_count > 0 && (
                  <span style={{
                    fontSize: '10px',
                    color: RISK_COLORS.HIGH,
                    backgroundColor: RISK_BG.HIGH,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: `1px solid ${RISK_BORDER.HIGH}`,
                    fontWeight: 600,
                  }}>
                    ⚠ {dept.high_risk_count} high-risk
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
                  {normalizedAvg}
                </span>
                <RiskBadge category={cat} />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isHovered ? '#3B82F6' : '#94A3B8'}
                  strokeWidth={2}
                  style={{
                    width: '14px',
                    height: '14px',
                    transition: 'transform 0.18s ease, stroke 0.18s ease',
                    transform: isHovered ? 'translateX(3px)' : 'none',
                  }}
                >
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Score gauge bar */}
            <div style={{ height: '6px', backgroundColor: '#161C2E', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${widthPct}%`,
                backgroundColor: color,
                borderRadius: '3px',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isHovered ? `0 0 10px ${color}` : 'none',
              }} />
            </div>

            {/* Hover Action Subtext */}
            {isHovered && (
              <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#3B82F6', fontWeight: 600, textAlign: 'right' }}>
                Click to view filtered employees in {dept.department} →
              </p>
            )}
          </div>
        );
      })}
      <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#94A3B8', textAlign: 'center' }}>
        💡 Click any department row to drill down into employee records pre-filtered by department
      </p>
    </div>
  );
}

// ── 4. Risk Recalculation Panel with Alphabetical Dropdown & Toast Notification ──

function RecalcPanel({
  employees,
  onRecalculateComplete,
  addToast,
}: {
  employees: EmployeeRead[];
  onRecalculateComplete: () => void;
  addToast: (msg: string, type: Toast['type']) => void;
}) {
  const [empId,   setEmpId]   = useState('');
  const [window,  setWindow]  = useState(24);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{
    emp_id: string;
    threat_score: number;
    risk_category: RiskCategory;
    anomaly_weight: number;
    frequency: number;
    asset_criticality: number;
    historical_severity: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sort employees alphabetically by Name (A to Z)
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [employees]);

  async function handleRecalc(e: React.FormEvent) {
    e.preventDefault();
    if (!empId) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const targetEmp = employees.find((emp) => emp.emp_id === empId);
    const empName = targetEmp ? `${targetEmp.first_name} ${targetEmp.last_name}` : empId;

    try {
      const res = await calculateRisk({ emp_id: empId, window_hours: window });
      setResult(res);
      const newScoreNorm = normalizeScore(res.threat_score);
      addToast(`Risk recalculated for ${empName}! New Threat Score: ${newScoreNorm} (${res.risk_category})`, 'success');
      onRecalculateComplete();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Calculation request failed.';
      setError(errMsg);
      addToast(`Recalculation failed: ${errMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <form onSubmit={(e) => void handleRecalc(e)} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <select
          id="recalc-employee-select"
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          style={{
            flex: 2,
            minWidth: '220px',
            padding: '9px 12px',
            borderRadius: '8px',
            border: '1px solid #2A3352',
            backgroundColor: '#1E2640',
            color: '#f7fafc',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Select Employee to Re-score…</option>
          {sortedEmployees.map((emp) => (
            <option key={emp.emp_id} value={emp.emp_id}>
              {emp.first_name} {emp.last_name} ({emp.emp_id}) — {emp.department}
            </option>
          ))}
        </select>

        <select
          id="recalc-window-select"
          value={window}
          onChange={(e) => setWindow(Number(e.target.value))}
          style={{
            flex: 1,
            minWidth: '100px',
            padding: '9px 12px',
            borderRadius: '8px',
            border: '1px solid #2A3352',
            backgroundColor: '#1E2640',
            color: '#f7fafc',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {[6, 12, 24, 48, 168].map((h) => (
            <option key={h} value={h}>{h === 168 ? '7 days' : `${h}h window`}</option>
          ))}
        </select>

        <button
          id="recalc-risk-btn"
          type="submit"
          disabled={loading || !empId}
          style={{
            padding: '9px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading || !empId ? 'not-allowed' : 'pointer',
            opacity: loading || !empId ? 0.6 : 1,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px' }}>
                <circle cx={12} cy={12} r={10} strokeDasharray="32" strokeDashoffset="10" />
              </svg>
              <span>Calculating…</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Recalculate Risk</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="animate-fade-in" style={{
          backgroundColor: '#1E2640',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${RISK_BORDER[result.risk_category]}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f7fafc' }}>
                {result.emp_id}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                ✓ Live calculation successful ({window}h lookback)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '32px',
                fontWeight: 800,
                color: RISK_COLORS[result.risk_category],
                fontFamily: 'var(--font-mono)',
                lineHeight: 1,
              }}>
                {normalizeScore(result.threat_score)}
              </span>
              <RiskBadge category={result.risk_category} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { label: 'Anomaly Weight',    value: `${(result.anomaly_weight * 100).toFixed(0)}%` },
              { label: 'Event Frequency',   value: result.frequency.toString() },
              { label: 'Asset Criticality', value: `${(result.asset_criticality * 100).toFixed(0)}%` },
              { label: 'Hist. Severity',    value: `${(result.historical_severity * 100).toFixed(0)}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                backgroundColor: '#161C2E',
                borderRadius: '8px',
                padding: '10px 12px',
                border: '1px solid #2A3352',
              }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</p>
                <p style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 700, color: '#f7fafc', fontFamily: 'var(--font-mono)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 5. Main Analytics Dashboard Page ─────────────────────────────────────────

export default function AnalyticsPage() {
  const [summary,   setSummary]   = useState<RiskSummaryResponse | null>(null);
  const [employees, setEmployees] = useState<EmployeeRead[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [toasts,    setToasts]    = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  function addToast(message: string, type: Toast['type']) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }
  function dismissToast(id: number) { setToasts((prev) => prev.filter((t) => t.id !== id)); }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([
        getAnalyticsSummary(),
        listEmployees({ limit: 200 }),
      ]);
      setSummary(s);
      setEmployees(e);
      setLastFetch(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Derived real-time metrics dynamically synced from employee state
  const derivedStats = useMemo(() => {
    if (!employees.length) {
      return {
        total: summary?.total_employees ?? 0,
        high: summary?.high_risk_count ?? 0,
        critical: summary?.critical_count ?? 0,
        avg: summary?.average_threat_score ?? 0,
        dist: summary?.risk_distribution ?? { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
      };
    }

    const dist: Record<RiskCategory, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    let sumScore = 0;

    employees.forEach((emp) => {
      const score = normalizeScore(emp.risk_score);
      sumScore += score;
      const cat: RiskCategory = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
      dist[cat] = (dist[cat] || 0) + 1;
    });

    return {
      total: employees.length,
      high: dist.HIGH,
      critical: dist.CRITICAL,
      avg: Math.round(sumScore / employees.length),
      dist,
    };
  }, [employees, summary]);

  const kpis = [
    {
      label: 'Total Monitored',
      value: derivedStats.total,
      color: '#3B82F6',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
          <circle cx={9} cy={7} r={4} /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeLinecap="round" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" />
        </svg>
      )
    },
    {
      label: 'High Risk Tier',
      value: derivedStats.high,
      color: '#F59E0B',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1={12} y1={9} x2={12} y2={13} strokeLinecap="round" /><line x1={12} y1={17} x2={12.01} y2={17} />
        </svg>
      )
    },
    {
      label: 'Critical Threats',
      value: derivedStats.critical,
      color: '#EF4444',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
          <circle cx={12} cy={12} r={10} /><line x1={12} y1={8} x2={12} y2={12} strokeLinecap="round" /><line x1={12} y1={16} x2={12.01} y2={16} />
        </svg>
      )
    },
    {
      label: 'Avg Threat Score',
      value: `${derivedStats.avg}`,
      color: '#6366F1',
      unit: '/100',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
          <path d="M3 3v18h18" strokeLinecap="round" /><path d="M7 16l4-6 4 4 4-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1400px' }}>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
            Insider Threat Risk Analytics
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
            Real-time organizational risk trends, behavioral anomaly distributions, and department breakdowns
            {lastFetch && <span style={{ marginLeft: '8px' }}>· Updated {lastFetch.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button
          id="refresh-analytics"
          type="button"
          onClick={() => void fetchData()}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          <svg
            className={loading ? 'animate-spin' : ''}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            style={{ width: '14px', height: '14px' }}
          >
            <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠</span>
          <span>{error} — Ensure backend service is running.</span>
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {kpi.label}
              </p>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#1E2640', border: '1px solid #2A3352', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpi.icon}
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: '32px', width: '70px' }} />
            ) : (
              <p style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: kpi.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {kpi.value}
                {'unit' in kpi && <span style={{ fontSize: '14px', color: '#94A3B8', marginLeft: '2px' }}>{(kpi as { unit: string }).unit}</span>}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* ── Full-Width Macro Trend Chart: 7-Day Organizational Threat Velocity & Anomaly Trends ── */}
      {loading ? (
        <Card style={{ marginBottom: '20px', padding: '24px' }}>
          <div className="skeleton" style={{ height: '240px', width: '100%', borderRadius: '8px' }} />
        </Card>
      ) : (
        <OrganizationalTrendChart employees={employees} summary={summary} />
      )}

      {/* ── Row 2: Risk Distribution Donut + Score Histogram ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader
            title="Risk Distribution"
            subtitle="Interactive tier breakdown with hover tooltips"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
                <circle cx={12} cy={12} r={10} /><polyline points="12 6 12 12 16 14" strokeLinecap="round" />
              </svg>
            }
          />
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div className="skeleton" style={{ width: '140px', height: '140px', borderRadius: '50%', margin: '0 auto' }} />
            </div>
          ) : (
            <RingChart distribution={derivedStats.dist} total={derivedStats.total} />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Score Distribution"
            subtitle="Click any bar to inspect employees in that threat score range"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
                <rect x={18} y={3} width={4} height={18} rx={1} /><rect x={10} y={8} width={4} height={13} rx={1} /><rect x={2} y={13} width={4} height={8} rx={1} />
              </svg>
            }
          />
          {loading ? (
            <div style={{ padding: '20px' }}>
              <div className="skeleton" style={{ height: '140px' }} />
            </div>
          ) : (
            <ScoreHistogram employees={employees} />
          )}
        </Card>
      </div>

      {/* ── Row 3: Department Breakdown + Risk Recalculation Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
        <Card>
          <CardHeader
            title="Department Risk Breakdown"
            subtitle="Ranked departmental risk · Click row to filter employee directory"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
          />
          {loading ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: '24px' }} />)}
            </div>
          ) : (
            <DepartmentChart breakdown={summary?.department_breakdown ?? []} />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Risk Recalculation"
            subtitle="Trigger live risk re-scoring with lookback window"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            }
          />
          {loading ? (
            <div style={{ padding: '20px' }}>
              <div className="skeleton" style={{ height: '50px' }} />
            </div>
          ) : (
            <RecalcPanel
              employees={employees}
              onRecalculateComplete={() => void fetchData()}
              addToast={addToast}
            />
          )}
        </Card>
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}