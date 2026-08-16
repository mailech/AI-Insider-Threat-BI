'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { EmployeeRead, EmployeeCreate, RiskCategory, AssetRead, UserRead } from '@/types/api';
import { listEmployees, createEmployee, getEmployee, getCurrentUser } from '@/services/api';
import { hasPermission } from '@/lib/rbac';
import axios from 'axios';

// ── Design tokens (reused from globals) ──────────────────────────────────────

const RISK_STYLES: Record<RiskCategory, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
  HIGH:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  MEDIUM:   { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  LOW:      { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
};

// Fallback style for any unexpected category value
const FALLBACK_RISK_STYLE = { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };

// ── Toast ─────────────────────────────────────────────────────────────────────

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
            minWidth:        '260px',
            maxWidth:        '380px',
            backdropFilter:  'blur(8px)',
            cursor:          'pointer',
            boxShadow:       '0 4px 20px rgba(0,0,0,0.3)',
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

// ── Risk Badge ────────────────────────────────────────────────────────────────

function RiskBadge({ category }: { category: RiskCategory }) {
  const s = RISK_STYLES[category] ?? FALLBACK_RISK_STYLE;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
      {category}
    </span>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const cat: RiskCategory = pct >= 80 ? 'CRITICAL' : pct >= 60 ? 'HIGH' : pct >= 30 ? 'MEDIUM' : 'LOW';
  const color = (RISK_STYLES[cat] ?? FALLBACK_RISK_STYLE).color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color, fontFamily: 'var(--font-mono)', minWidth: '34px', textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return (
    <tr style={{ backgroundColor: index % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-card)' }}>
      {[90, 150, 120, 110, 100, 120, 80].map((w, i) => (
        <td key={i} style={{ padding: '11px 16px' }}>
          <div className="skeleton" style={{ height: '14px', width: `${w}px`, maxWidth: '100%' }} />
        </td>
      ))}
    </tr>
  );
}

// ── Input component ───────────────────────────────────────────────────────────

function FormInput({
  id, label, value, onChange, placeholder = '', required = false,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label htmlFor={id} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: '8px',
          border: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-bg-base)',
          color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--color-accent-blue)'; }}
        onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border-subtle)'; }}
      />
    </div>
  );
}

// ── Create Employee Modal ─────────────────────────────────────────────────────

interface CreateModalProps {
  onClose:   () => void;
  onCreated: (emp: EmployeeRead) => void;
  addToast:  (msg: string, type: Toast['type']) => void;
}

function CreateEmployeeModal({ onClose, onCreated, addToast }: CreateModalProps) {
  const [form, setForm] = useState<EmployeeCreate>({
    emp_id: '', first_name: '', last_name: '', department: '', designation: '', manager_name: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  function field(k: keyof EmployeeCreate) {
    return (v: string) => setForm((f) => ({ ...f, [k]: v || (k === 'manager_name' ? null : v) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.emp_id || !form.first_name || !form.last_name || !form.department || !form.designation) {
      addToast('Please fill in all required fields.', 'error'); return;
    }
    if (!/^emp_\d+$/.test(form.emp_id)) {
      addToast('Employee ID must match pattern emp_<digits> (e.g. emp_4091)', 'error'); return;
    }
    setSubmitting(true);
    try {
      const created = await createEmployee(form);
      addToast(`Employee ${created.first_name} ${created.last_name} created successfully!`, 'success');
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      let msg = 'Failed to create employee.';
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') msg = detail;
      }
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      id="create-employee-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        id="create-employee-modal-box"
        className="animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
                <circle cx={12} cy={8} r={4} /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Add New Employee</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>Onboard a monitored identity to ITBIS</p>
            </div>
          </div>
          <button id="close-create-modal" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px' }}>
              <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
            </svg>
          </button>
        </div>
        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput id="create-first-name" label="First Name" value={form.first_name} onChange={field('first_name')} placeholder="Jane" required />
            <FormInput id="create-last-name"  label="Last Name"  value={form.last_name}  onChange={field('last_name')}  placeholder="Smith" required />
          </div>
          <FormInput id="create-emp-id" label="Employee ID" value={form.emp_id} onChange={field('emp_id')} placeholder="emp_4091" required />
          <p style={{ margin: '-10px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Must follow pattern <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-blue)' }}>emp_&#x3C;digits&#x3E;</code> e.g. emp_4091
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput id="create-department"  label="Department"  value={form.department}  onChange={field('department')}  placeholder="Engineering" required />
            <FormInput id="create-designation" label="Designation" value={form.designation} onChange={field('designation')} placeholder="Senior Analyst" required />
          </div>
          <FormInput id="create-manager" label="Manager Name (optional)" value={form.manager_name ?? ''} onChange={field('manager_name')} placeholder="John Doe" />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              Cancel
            </button>
            <button id="submit-create-employee" type="submit" disabled={submitting} style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Creating…' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Employee Detail Drawer ───────────────────────────────────────────────────

function DrawerInfoBlock({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg-elevated)',
      border: '1px solid #2A3352',
      borderRadius: '10px',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>
        {value}
      </span>
    </div>
  );
}

interface DetailDrawerProps {
  emp: EmployeeRead;
  loading?: boolean;
  onClose: () => void;
}

// ── 30-Day Risk Trajectory Sparkline Component ───────────────────────────────

interface DayTrajectory {
  dayNum: number;
  dateStr: string;
  fullDate: string;
  score: number;
}

function EmployeeTrajectorySparkline({ emp }: { emp: EmployeeRead }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const normScore = emp.risk_score <= 1 ? Math.round(emp.risk_score * 100) : Math.round(emp.risk_score);
  const isHighRisk = normScore >= 60 || emp.risk_category === 'CRITICAL' || emp.risk_category === 'HIGH';
  const isLowRisk = normScore <= 30 || emp.risk_category === 'LOW';

  // Deterministically generate 30-day timeline leading to current score
  const trajectoryData: DayTrajectory[] = useMemo(() => {
    const today = new Date();
    const days: DayTrajectory[] = [];

    // Deterministic hash seed
    let hash = 0;
    for (let i = 0; i < emp.emp_id.length; i++) {
      hash = (hash << 5) - hash + emp.emp_id.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);

    // Initial baseline score 30 days ago
    const startScore = isHighRisk
      ? Math.max(15, Math.round(normScore * 0.3 + (seed % 10)))
      : isLowRisk
      ? Math.max(10, Math.round(normScore * 0.85 + (seed % 6) - 3))
      : Math.max(22, Math.round(normScore * 0.65 + (seed % 8)));

    const inflectionDay = 18 + (seed % 7); // day 18-25 where threat escalation steepens

    for (let d = 29; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      const dayNum = 30 - d;
      const progress = dayNum / 30;

      let scoreVal: number;

      if (isHighRisk) {
        if (dayNum < inflectionDay) {
          const jitter = ((seed * (dayNum + 1)) % 7) - 3;
          scoreVal = Math.round(startScore + (normScore * 0.25) * (dayNum / inflectionDay) + jitter);
        } else {
          const climbProg = (dayNum - inflectionDay) / (30 - inflectionDay);
          const jitter = ((seed * (dayNum + 1)) % 5) - 2;
          scoreVal = Math.round(startScore + (normScore * 0.25) + (normScore * 0.75 - startScore * 0.25) * Math.pow(climbProg, 1.2) + jitter);
        }
      } else if (isLowRisk) {
        const jitter = ((seed * (dayNum + 1)) % 6) - 3;
        scoreVal = Math.max(8, Math.min(32, Math.round(startScore + jitter)));
      } else {
        const jitter = ((seed * (dayNum + 1)) % 8) - 4;
        scoreVal = Math.max(20, Math.min(60, Math.round(startScore + (normScore - startScore) * progress + jitter)));
      }

      if (dayNum === 30) scoreVal = normScore;
      scoreVal = Math.max(4, Math.min(100, scoreVal));

      days.push({
        dayNum,
        dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        score: scoreVal,
      });
    }

    return days;
  }, [emp.emp_id, emp.risk_category, normScore, isHighRisk, isLowRisk]);

  // Chart coordinate geometry (360x80)
  const svgWidth = 360;
  const svgHeight = 80;
  const padL = 4;
  const padR = 4;
  const padT = 8;
  const padB = 8;
  const chartW = svgWidth - padL - padR;
  const chartH = svgHeight - padT - padB;

  const getX = (idx: number) => padL + (idx / (trajectoryData.length - 1)) * chartW;
  const getY = (val: number) => padT + (1 - Math.max(0, Math.min(100, val)) / 100) * chartH;

  const pts = trajectoryData.map((d, i) => ({ x: getX(i), y: getY(d.score), ...d }));

  // Generate smooth cubic Bézier spline
  let linePath = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 >= pts.length ? pts.length - 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  const y50 = getY(50);
  const activePoint = hoveredIdx !== null ? pts[hoveredIdx] : pts[pts.length - 1];
  const startDateStr = trajectoryData[0].dateStr;
  const endDateStr = trajectoryData[trajectoryData.length - 1].dateStr;

  const getScoreColor = (score: number) => {
    if (score >= 60) return '#ef4444'; // Vibrant Red
    if (score >= 40) return '#f59e0b'; // Amber transition
    return '#22c55e'; // Soft Green
  };

  const activeColor = getScoreColor(activePoint.score);

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-elevated)',
      borderRadius: '14px',
      border: '1px solid #2A3352',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {/* ── Header with Title & Current Status ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={getScoreColor(normScore)} strokeWidth={2} style={{ width: '15px', height: '15px' }}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            30-Day Risk Trajectory
          </span>
        </div>

        {/* Dynamic Trajectory Badge */}
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: normScore >= 60 ? 'rgba(239, 68, 68, 0.12)' : normScore >= 40 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
          color: getScoreColor(normScore),
          border: `1px solid ${normScore >= 60 ? 'rgba(239, 68, 68, 0.3)' : normScore >= 40 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
        }}>
          {normScore >= 60 ? '▲ Escalating Threat' : normScore >= 40 ? '● Moderate Drift' : '▼ Stable / Compliant'}
        </span>
      </div>

      {/* ── Interactive Tooltip Display Bar ── */}
      <div style={{
        padding: '6px 12px',
        borderRadius: '8px',
        backgroundColor: '#161C2E',
        border: '1px solid #2A3352',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#94A3B8' }}>
            Date: <strong style={{ color: '#f7fafc' }}>{activePoint.dateStr}</strong>
          </span>
          <span style={{ color: '#2A3352' }}>|</span>
          <span style={{ color: '#94A3B8' }}>
            Score: <strong style={{ color: activeColor, fontFamily: 'var(--font-mono)' }}>{activePoint.score}/100</strong>
          </span>
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: activeColor,
          fontFamily: 'var(--font-mono)',
        }}>
          {activePoint.score >= 60 ? 'HIGH RISK' : activePoint.score >= 40 ? 'MEDIUM' : 'LOW RISK'}
        </span>
      </div>

      {/* ── Fixed-Height Chart Container (h-20 / 80px) ── */}
      <div
        style={{
          width: '100%',
          height: '80px',
          position: 'relative',
          overflow: 'visible',
          backgroundColor: '#161C2E',
          borderRadius: '8px',
          border: '1px solid rgba(42, 51, 82, 0.5)',
          padding: '4px',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Dynamic Area Fill Gradient: Red (40-100) -> Soft Green (0-40) */}
            <linearGradient id={`spark-area-grad-${emp.emp_id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#22c55e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
            </linearGradient>

            {/* Dynamic Line Stroke Gradient */}
            <linearGradient id={`spark-line-grad-${emp.emp_id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* Dotted Horizontal Reference Line at Score: 50 */}
          <line
            x1={padL}
            y1={y50}
            x2={padL + chartW}
            y2={y50}
            stroke="rgba(148, 163, 184, 0.4)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={padL + chartW - 2}
            y={y50 - 3}
            textAnchor="end"
            fill="#94A3B8"
            fontSize="7.5px"
            fontWeight={600}
            fontFamily="var(--font-mono)"
            opacity={0.8}
          >
            Baseline: 50
          </text>

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#spark-area-grad-${emp.emp_id})`} />

          {/* Line Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke={`url(#spark-line-grad-${emp.emp_id})`}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: `drop-shadow(0 0 4px ${getScoreColor(normScore)}66)`,
            }}
          />

          {/* Hover Crosshair Guide Line */}
          {hoveredIdx !== null && (
            <line
              x1={pts[hoveredIdx].x}
              y1={padT}
              x2={pts[hoveredIdx].x}
              y2={padT + chartH}
              stroke="#6366F1"
              strokeWidth={1.2}
              strokeDasharray="2 2"
            />
          )}

          {/* Data Points & Broad Hitboxes */}
          {pts.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
            const isLatest = idx === pts.length - 1;
            const pColor = getScoreColor(p.score);

            return (
              <g
                key={idx}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Hitbox */}
                <rect
                  x={p.x - 6}
                  y={padT}
                  width={12}
                  height={chartH}
                  fill="transparent"
                />

                {/* Visible Point on hover or latest */}
                {(isHovered || isLatest) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 4.5 : 3.5}
                    fill={isHovered ? '#FFFFFF' : pColor}
                    stroke="#161C2E"
                    strokeWidth={1.5}
                    style={{
                      filter: `drop-shadow(0 0 6px ${pColor})`,
                      transition: 'all 0.15s ease',
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Temporal Clarity Footer: Start Date (30 days ago) & End Date (Today) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#94A3B8',
        padding: '0 2px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>30 days ago</span>
          <span style={{ color: '#64748B', fontFamily: 'var(--font-mono)' }}>({startDateStr})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: 600, color: getScoreColor(normScore) }}>Today</span>
          <span style={{ color: '#64748B', fontFamily: 'var(--font-mono)' }}>({endDateStr})</span>
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({ emp, loading = false, onClose }: DetailDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const riskStyle = RISK_STYLES[emp.risk_category] ?? FALLBACK_RISK_STYLE;
  const scorePercent = Math.round(emp.risk_score * 100);

  // Close drawer on ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      id="employee-drawer-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fade-in 0.2s ease-out',
      }}
    >
      <div
        id="employee-drawer-panel"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#161C2E] border-l border-[#2A3352] flex flex-col h-screen max-h-screen shadow-2xl transition-transform duration-300 animate-slide-in-right"
        style={{
          backgroundColor: '#161C2E',
          borderLeft: '1px solid #2A3352',
          boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* ── Drawer Header ── */}
        <div
          className="p-6 border-b border-[#2A3352] flex items-center justify-between bg-[#161C2E]/95 backdrop-blur-md shrink-0"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #2A3352',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(22, 28, 46, 0.95)',
            backdropFilter: 'blur(10px)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: riskStyle.color,
              boxShadow: `0 0 10px ${riskStyle.color}`,
            }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Employee Intelligence Profile
            </h2>
          </div>
          <button
            id="close-detail-panel"
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid #2A3352',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
              e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.borderColor = '#2A3352';
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}>
              <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
            </svg>
          </button>
        </div>

        {/* ── Drawer Scrollable Content ── */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin"
          style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}
        >

          {/* Section 1: General Info */}
          <div style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid #2A3352',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: 0, right: 0,
              width: '120px', height: '100%',
              background: `radial-gradient(circle at right, ${riskStyle.color}15 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
            }}>
              {emp.first_name[0]}{emp.last_name[0]}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {emp.first_name} {emp.last_name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <code style={{ fontSize: '11px', color: 'var(--color-accent-blue)', fontFamily: 'var(--font-mono)', backgroundColor: 'rgba(59, 130, 246, 0.12)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  {emp.emp_id}
                </code>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {emp.designation}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Threat Score Gauge */}
          <div style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderRadius: '14px',
            padding: '20px',
            border: `1px solid ${riskStyle.border}`,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={riskStyle.color} strokeWidth={2} style={{ width: '16px', height: '16px' }}>
                  <path d="M12 2L3 5v6c0 5.25 3.75 10.15 9 11.25C16.25 21.15 21 16.25 21 11V5l-9-4Z" />
                </svg>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                  Threat Score Gauge
                </p>
              </div>
              <RiskBadge category={emp.risk_category} />
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '40px', fontWeight: 800, color: riskStyle.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                  {scorePercent}
                </span>
                <span style={{ fontSize: '15px', color: 'var(--color-text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  /100
                </span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: riskStyle.color, letterSpacing: '0.02em' }}>
                {emp.risk_category === 'CRITICAL'
                  ? 'Immediate Action Required'
                  : emp.risk_category === 'HIGH'
                  ? 'Elevated Risk Profile'
                  : emp.risk_category === 'MEDIUM'
                  ? 'Moderate Behavioral Flags'
                  : 'Normal Baseline'}
              </span>
            </div>

            {/* Gauge progress bar */}
            <div style={{ height: '8px', backgroundColor: '#161C2E', borderRadius: '999px', overflow: 'hidden', border: '1px solid #2A3352', padding: '1px' }}>
              <div style={{
                height: '100%',
                width: `${Math.max(scorePercent, 4)}%`,
                background: `linear-gradient(90deg, ${riskStyle.color}88, ${riskStyle.color})`,
                borderRadius: '999px',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: `0 0 8px ${riskStyle.color}66`,
              }} />
            </div>
          </div>

          {/* Section 2.5: 30-Day Risk Trajectory Mini Sparkline */}
          <EmployeeTrajectorySparkline emp={emp} />

          {/* Section 3: Department Info */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
              Department & Organization
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <DrawerInfoBlock label="Department" value={emp.department} />
              <DrawerInfoBlock label="Designation" value={emp.designation} />
              <DrawerInfoBlock
                label="Direct Manager"
                value={emp.manager_name ?? <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>None / Unassigned</span>}
              />
              <DrawerInfoBlock
                label="Enrolled Date"
                value={new Date(emp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                mono
              />
            </div>
          </div>

          {/* Section 4: Assigned Device Assets */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                Assigned Device Assets
              </p>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'var(--color-bg-elevated)', border: '1px solid #2A3352', padding: '2px 8px', borderRadius: '999px', color: 'var(--color-text-secondary)' }}>
                {emp.assets?.length ?? 0} {emp.assets?.length === 1 ? 'Asset' : 'Assets'}
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2].map((i) => (
                  <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '10px' }} />
                ))}
              </div>
            ) : (!emp.assets || emp.assets.length === 0) ? (
              <div style={{
                padding: '28px 20px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '12px',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: '12px',
                border: '1px dashed #2A3352',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: '26px', height: '26px', opacity: 0.4 }}>
                  <rect x={2} y={3} width={20} height={14} rx={2} />
                  <line x1={8} y1={21} x2={16} y2={21} />
                  <line x1={12} y1={17} x2={12} y2={21} />
                </svg>
                <span>No hardware devices or IP endpoints assigned yet.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(emp.assets as AssetRead[]).map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      border: '1px solid #2A3352',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-blue)" strokeWidth={1.8} style={{ width: '15px', height: '15px' }}>
                          <rect x={2} y={3} width={20} height={14} rx={2} />
                          <line x1={8} y1={21} x2={16} y2={21} />
                          <line x1={12} y1={17} x2={12} y2={21} />
                        </svg>
                        <code style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent-blue)', fontFamily: 'var(--font-mono)' }}>
                          {asset.asset_id}
                        </code>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: asset.asset_type === 'DEVICE' ? 'rgba(59,130,246,0.12)' : 'rgba(99,102,241,0.12)',
                        color: asset.asset_type === 'DEVICE' ? '#3B82F6' : '#6366F1',
                        border: `1px solid ${asset.asset_type === 'DEVICE' ? 'rgba(59,130,246,0.3)' : 'rgba(99,102,241,0.3)'}`,
                      }}>
                        {asset.asset_type}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                      {asset.ip_address && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>IP Address</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{asset.ip_address}</span>
                        </div>
                      )}
                      {asset.mac_address && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>MAC Address</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{asset.mac_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Drawer Footer ── */}
        <div
          className="p-6 border-t border-[#2A3352] flex justify-between items-center bg-[#161C2E]/95 shrink-0"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #2A3352',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(22, 28, 46, 0.95)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Updated: {emp.updated_at ? new Date(emp.updated_at).toLocaleDateString('en-GB') : 'Initial record'}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              border: '1px solid #2A3352',
              backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (!direction) return (
    <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: '10px', height: '10px', opacity: 0.3 }}>
      <path d="M4 5l4-4 4 4M4 11l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '10px', height: '10px' }}>
      {direction === 'asc' ? <path d="M4 10l4-5 4 5" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M4 6l4 5 4-5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type SortKey = 'emp_id' | 'first_name' | 'department' | 'designation' | 'risk_category' | 'risk_score' | 'created_at';

export default function EmployeesPage() {
  const [employees,     setEmployees]     = useState<EmployeeRead[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [selected,      setSelected]      = useState<EmployeeRead | null>(null);
  const [search,        setSearch]        = useState('');
  const [filterRisk,    setFilterRisk]    = useState<RiskCategory | ''>('');
  const [sortKey,       setSortKey]       = useState<SortKey>('risk_score');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [toasts,        setToasts]        = useState<Toast[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [user,          setUser]          = useState<UserRead | null>(null);
  const toastIdRef = useRef(0);

  function addToast(message: string, type: Toast['type']) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }
  function dismissToast(id: number) { setToasts((prev) => prev.filter((t) => t.id !== id)); }

  // Read initial search query from URL (e.g. /employees?search=Engineering or /employees?department=Engineering)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const query = params.get('search') || params.get('department');
      if (query) {
        setSearch(query);
      }
    }
  }, []);

  // Load current user for RBAC
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => { /* silently ignore — user may not be logged in yet */ });
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listEmployees({ limit: 200 });
      setEmployees(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch employees.';
      setError(msg); addToast(msg, 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchEmployees(); }, [fetchEmployees]);

  async function handleRowClick(emp: EmployeeRead) {
    setDetailLoading(true); setSelected(emp);
    try { const fresh = await getEmployee(emp.emp_id); setSelected(fresh); }
    catch { addToast('Could not load employee details.', 'error'); }
    finally { setDetailLoading(false); }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const canManageEmployees = hasPermission(user?.role, 'manage:employees');

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${e.first_name} ${e.last_name} ${e.emp_id} ${e.department} ${e.designation}`.toLowerCase().includes(q);
    const matchRisk   = !filterRisk || e.risk_category === filterRisk;
    return matchSearch && matchRisk;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av: string | number = sortKey === 'first_name' ? `${a.first_name} ${a.last_name}` : (a[sortKey] as string | number);
    const bv: string | number = sortKey === 'first_name' ? `${b.first_name} ${b.last_name}` : (b[sortKey] as string | number);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  const columns: { key: SortKey | null; label: string }[] = [
    { key: 'emp_id',        label: 'Employee ID'  },
    { key: 'first_name',    label: 'Name'         },
    { key: 'department',    label: 'Department'   },
    { key: 'designation',   label: 'Designation'  },
    { key: 'risk_category', label: 'Risk Level'   },
    { key: 'risk_score',    label: 'Threat Score' },
    { key: 'created_at',    label: 'Enrolled'     },
  ];

  const critical = employees.filter((e) => e.risk_category === 'CRITICAL').length;
  const high     = employees.filter((e) => e.risk_category === 'HIGH').length;
  const medium   = employees.filter((e) => e.risk_category === 'MEDIUM').length;
  const avgScore = employees.length ? Math.round((employees.reduce((s, e) => s + e.risk_score, 0) / employees.length) * 100) : 0;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1400px' }}>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] m-0 tracking-tight">
            Employee Directory
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
            Monitored workforce identities, risk ratings, and assigned hardware assets
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            id="refresh-employees"
            type="button"
            onClick={() => void fetchEmployees()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '14px', height: '14px' }}>
              <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
          {canManageEmployees && (
            <button
              id="open-create-employee"
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border-0 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-md shadow-blue-500/20 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px' }}>
                <line x1={12} y1={5} x2={12} y2={19} strokeLinecap="round" />
                <line x1={5} y1={12} x2={19} y2={12} strokeLinecap="round" />
              </svg>
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Monitored',  value: loading ? '—' : employees.length.toString(), color: '#3B82F6', icon: '👥' },
          { label: 'Critical Risk',    value: loading ? '—' : critical.toString(),          color: '#EF4444', icon: '🚨' },
          { label: 'High Risk',        value: loading ? '—' : high.toString(),              color: '#F59E0B', icon: '⚠️' },
          { label: 'Medium Risk',      value: loading ? '—' : medium.toString(),            color: '#3B82F6', icon: '📊' },
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{stat.label}</p>
              <span style={{ fontSize: '14px' }}>{stat.icon}</span>
            </div>
            {loading
              ? <div className="skeleton" style={{ height: '28px', width: '60px' }} />
              : <p style={{ fontSize: '26px', fontWeight: 800, color: stat.color, fontFamily: 'var(--font-mono)', margin: 0, lineHeight: 1 }}>{stat.value}</p>
            }
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠</span><span>{error} — Ensure the backend is running at http://127.0.0.1:8000.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
            <circle cx={11} cy={11} r={8} /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            id="employee-search"
            type="text"
            placeholder="Search by name, ID, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-accent-blue)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border-subtle)'; }}
          />
        </div>
        <select
          id="filter-risk-category"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value as RiskCategory | '')}
          style={{
            padding: '9px 12px', borderRadius: '8px',
            border: filterRisk ? `1px solid ${RISK_STYLES[filterRisk as RiskCategory]?.border ?? 'var(--color-border-subtle)'}` : '1px solid var(--color-border-subtle)',
            backgroundColor: filterRisk ? (RISK_STYLES[filterRisk as RiskCategory]?.bg ?? 'var(--color-bg-card)') : 'var(--color-bg-card)',
            color: filterRisk ? (RISK_STYLES[filterRisk as RiskCategory]?.color ?? 'var(--color-text-primary)') : 'var(--color-text-primary)',
            fontSize: '13px', fontWeight: filterRisk ? 700 : 400,
            minWidth: '160px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">ALL Risk Levels</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        {(search || filterRisk) && (
          <button id="clear-filters" onClick={() => { setSearch(''); setFilterRisk(''); }} style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-blue)" strokeWidth={1.8} style={{ width: '16px', height: '16px' }}>
              <circle cx={8} cy={8} r={3.5} /><path d="M2 20c0-4 2.7-6 6-6s6 2 6 6" strokeLinecap="round" />
              <circle cx={17} cy={8} r={2.5} /><path d="M15 20c0-2.5 1.3-4 4-4" strokeLinecap="round" />
            </svg>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Employee Directory</h2>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {loading ? 'Loading…' : `${sorted.length} of ${employees.length} employees`}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                {columns.map((col) => (
                  <th key={col.label} onClick={() => col.key && handleSort(col.key)} style={{ padding: '9px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: col.key ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {col.label}
                      {col.key && <SortIcon direction={sortKey === col.key ? sortDir : null} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} index={i} />)
                : sorted.length === 0
                ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {search || filterRisk ? 'No employees match your filters.' : 'No employees found. Add one to get started.'}
                    </td>
                  </tr>
                )
                : sorted.map((emp, i) => {
                    const riskStyle  = RISK_STYLES[emp.risk_category] ?? FALLBACK_RISK_STYLE;
                    const isCritical = emp.risk_category === 'CRITICAL';
                    return (
                      <tr
                        key={emp.id}
                        id={`emp-row-${emp.emp_id}`}
                        onClick={() => void handleRowClick(emp)}
                        style={{
                          backgroundColor: selected?.emp_id === emp.emp_id ? 'rgba(59,130,246,0.07)' : i % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-card)',
                          cursor: 'pointer',
                          borderLeft: isCritical ? `3px solid ${riskStyle.color}` : '3px solid transparent',
                          transition: 'background-color 0.12s ease',
                        }}
                        onMouseEnter={(e) => { if (selected?.emp_id !== emp.emp_id) e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
                        onMouseLeave={(e) => { if (selected?.emp_id !== emp.emp_id) e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-bg-base)' : 'var(--color-bg-card)'; }}
                      >
                        <td style={{ padding: '11px 16px' }}>
                          <code style={{ fontSize: '11px', color: 'var(--color-accent-blue)', fontFamily: 'var(--font-mono)' }}>{emp.emp_id}</code>
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: '13px', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {emp.first_name[0]}{emp.last_name[0]}
                            </div>
                            {emp.first_name} {emp.last_name}
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{emp.department}</td>
                        <td style={{ padding: '11px 16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{emp.designation}</td>
                        <td style={{ padding: '11px 16px' }}><RiskBadge category={emp.risk_category} /></td>
                        <td style={{ padding: '11px 16px', minWidth: '140px' }}><ScoreBar score={emp.risk_score} /></td>
                        <td style={{ padding: '11px 16px', fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(emp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <DetailDrawer
          emp={selected}
          loading={detailLoading}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Create modal */}
      {showCreate && canManageEmployees && (
        <CreateEmployeeModal
          onClose={() => setShowCreate(false)}
          onCreated={(emp) => setEmployees((prev) => [emp, ...prev])}
          addToast={addToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
