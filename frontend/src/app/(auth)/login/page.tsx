'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/services/api';
import type { Metadata } from 'next';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showPwd,  setShowPwd]  = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const resp = await login({ username: username.trim(), password });
      setToken(resp.access_token);
      router.push('/dashboard');
    } catch {
      setError('Invalid credentials or unauthorized access');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    padding:         '10px 14px',
    backgroundColor: 'var(--color-bg-elevated)',
    border:          '1px solid var(--color-border-subtle)',
    borderRadius:    '8px',
    color:           'var(--color-text-primary)',
    fontSize:        '14px',
    outline:         'none',
    transition:      'border-color 0.15s ease',
    boxSizing:       'border-box',
    fontFamily:      'var(--font-sans)',
  };

  return (
    <div
      style={{
        width:           '100%',
        maxWidth:        '380px',
        backgroundColor: 'var(--color-bg-card)',
        border:          '1px solid var(--color-border-subtle)',
        borderRadius:    '16px',
        padding:         '36px',
        boxShadow:       '0 24px 64px rgba(0,0,0,0.5)',
        animation:       'fade-in 0.4s ease-out both',
      }}
    >
      {/* ── Logo ── */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{
            width:           '52px',
            height:          '52px',
            background:      'linear-gradient(135deg, #3B82F6, #6366F1)',
            borderRadius:    '14px',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            margin:          '0 auto 14px',
            boxShadow:       '0 8px 24px rgba(59,130,246,0.3)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="white" style={{ width: '28px', height: '28px' }}>
            <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4Z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          ITBIS
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0, letterSpacing: '0.05em' }}>
          INSIDER THREAT INTELLIGENCE
        </p>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          id="login-error-banner"
          role="alert"
          style={{
            marginBottom:    '18px',
            padding:         '12px 14px',
            borderRadius:    '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border:          '1px solid #EF4444',
            boxShadow:       '0 0 12px rgba(239, 68, 68, 0.2)',
            color:           '#EF4444',
            fontSize:        '13px',
            fontWeight:      500,
            display:         'flex',
            gap:             '10px',
            alignItems:      'center',
            animation:       'fade-in 0.25s ease-out',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth={2}
            style={{ width: '18px', height: '18px', flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ lineHeight: 1.4 }}>{error}</span>
        </div>
      )}

      {/* ── Form ── */}
      <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Username */}
        <div>
          <label
            htmlFor="login-username"
            style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', marginBottom: '6px', textTransform: 'uppercase' }}
          >
            Username
          </label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="analyst@itbis.com"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border-subtle)'; }}
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="login-password"
            style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', marginBottom: '6px', textTransform: 'uppercase' }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: '42px' }}
              onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border-subtle)'; }}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              style={{
                position:        'absolute',
                right:           '12px',
                top:             '50%',
                transform:       'translateY(-50%)',
                background:      'none',
                border:          'none',
                cursor:          'pointer',
                color:           'var(--color-text-muted)',
                padding:         '2px',
                display:         'flex',
                alignItems:      'center',
              }}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '16px', height: '16px' }}>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" />
                  <line x1={1} y1={1} x2={23} y2={23} strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: '16px', height: '16px' }}>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                  <circle cx={12} cy={12} r={3} />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          type="submit"
          disabled={loading || !username.trim() || !password}
          style={{
            padding:         '11px',
            borderRadius:    '8px',
            border:          'none',
            background:      loading ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
            color:           loading ? 'var(--color-text-muted)' : 'white',
            fontSize:        '14px',
            fontWeight:      600,
            cursor:          loading ? 'not-allowed' : 'pointer',
            transition:      'all 0.15s ease',
            boxShadow:       loading ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             '8px',
          }}
        >
          {loading ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
              </svg>
              Authenticating…
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* ── Footer ── */}
      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', margin: '20px 0 0' }}>
        ITBIS v1.0 • Restricted Access Only
      </p>
    </div>
  );
}
