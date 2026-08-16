'use client';

interface RiskScoreGaugeProps {
  score:   number;  // 0 – 100
  loading: boolean;
}

export default function RiskScoreGauge({ score, loading }: RiskScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  // Arc parameters
  const r           = 56;
  const cx          = 80;
  const cy          = 80;
  const strokeW     = 10;
  const circumference = Math.PI * r;                   // half-circle
  const dashOffset    = circumference * (1 - clampedScore / 100);

  // Color based on score
  const color =
    clampedScore >= 80 ? '#EF4444'
    : clampedScore >= 60 ? '#F59E0B'
    : clampedScore >= 40 ? '#3B82F6'
    : '#10B981';

  const label =
    clampedScore >= 80 ? 'CRITICAL'
    : clampedScore >= 60 ? 'HIGH'
    : clampedScore >= 40 ? 'MEDIUM'
    : 'LOW';

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border:          '1px solid var(--color-border-subtle)',
        borderRadius:    '12px',
        padding:         '20px',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
      }}
    >
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', margin: '0 0 16px', textTransform: 'uppercase' }}>
        Fleet Avg Threat Score
      </p>

      {loading ? (
        <div className="skeleton" style={{ width: '160px', height: '100px', borderRadius: '80px 80px 0 0' }} />
      ) : (
        <svg
          viewBox="0 0 160 90"
          style={{ width: '160px', height: '90px', overflow: 'visible' }}
        >
          {/* Track */}
          <path
            d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
          {/* Progress */}
          <path
            d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
          />
          {/* Score text */}
          <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
            style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {clampedScore}
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--color-text-muted)"
            style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', fontFamily: 'var(--font-sans)' }}>
            {label}
          </text>

          {/* Scale labels */}
          <text x={cx - r - 4} y={cy + 14} textAnchor="end" fill="var(--color-text-muted)"
            style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}>0</text>
          <text x={cx + r + 4} y={cy + 14} textAnchor="start" fill="var(--color-text-muted)"
            style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}>100</text>
        </svg>
      )}

      <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '8px 0 0', textAlign: 'center' }}>
        Averaged across all monitored employees
      </p>
    </div>
  );
}
