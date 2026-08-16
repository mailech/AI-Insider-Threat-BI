'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  error:  Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to monitoring service in production
    console.error('[ITBIS Dashboard Error]', error);
  }, [error]);

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '60vh',
        gap:            '16px',
        textAlign:      'center',
      }}
    >
      {/* Error icon */}
      <div
        style={{
          width:           '56px',
          height:          '56px',
          borderRadius:    '14px',
          backgroundColor: 'rgba(239,68,68,0.12)',
          border:          '1px solid rgba(239,68,68,0.3)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={1.8} style={{ width: '28px', height: '28px' }}>
          <path d="m10.29 3.86-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.71-2.14l-7-12a2 2 0 0 0-3.42 0Z" strokeLinecap="round" />
          <line x1={12} y1={9} x2={12} y2={13} strokeLinecap="round" />
          <circle cx={12} cy={17} r={0.5} fill="#EF4444" />
        </svg>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
          Dashboard Error
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 4px', maxWidth: '400px' }}>
          {error.message || 'An unexpected error occurred loading the dashboard.'}
        </p>
        {error.digest && (
          <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '4px 0 0' }}>
            Digest: {error.digest}
          </p>
        )}
      </div>

      <button
        id="retry-dashboard"
        onClick={reset}
        style={{
          padding:         '9px 20px',
          borderRadius:    '8px',
          border:          '1px solid var(--color-accent-blue)',
          backgroundColor: 'rgba(59,130,246,0.12)',
          color:           'var(--color-accent-blue)',
          fontSize:        '13px',
          fontWeight:      600,
          cursor:          'pointer',
          transition:      'all 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.12)'; }}
      >
        Retry
      </button>
    </div>
  );
}
