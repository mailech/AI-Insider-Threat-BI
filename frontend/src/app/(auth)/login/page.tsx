'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('admin@cyberai.internal');
  const [password, setPassword] = useState('CyberAdmin2026!');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

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

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        backgroundColor: 'rgba(11, 26, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 35px rgba(16, 185, 129, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'fade-in 0.4s ease-out both',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Circular User Badge ── */}
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#11241C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
          marginBottom: '20px',
          border: '1.5px solid #10B981',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: '36px', height: '36px' }}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      {/* ── Title Header ── */}
      <h1
        style={{
          color: '#ECFDF5',
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          textAlign: 'center',
          margin: '0 0 32px 0',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
        }}
      >
        CYBER AI LOGIN
      </h1>

      {/* ── Error Banner ── */}
      {error && (
        <div
          id="login-error-banner"
          role="alert"
          style={{
            width: '100%',
            marginBottom: '20px',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.2)',
            color: '#EF4444',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth={2}
            style={{ width: '16px', height: '16px', flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* ── Form ── */}
      <form
        autoComplete="off"
        onSubmit={(e) => void handleSubmit(e)}
        style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Email ID Field */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1.5px solid #18382B',
            paddingBottom: '8px',
            marginBottom: '28px',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          {/* Envelope Icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10B981"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '18px', height: '18px', marginRight: '12px', flexShrink: 0 }}
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>

          <input
            id="login-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Email ID"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ECFDF5',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.02em',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.style.borderColor = '#10B981';
              }
            }}
            onBlur={(e) => {
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.style.borderColor = '#18382B';
              }
            }}
          />
        </div>

        {/* Password Field */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1.5px solid #18382B',
            paddingBottom: '8px',
            marginBottom: '24px',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          {/* Lock Icon */}
          <svg
            viewBox="0 0 24 24"
            fill="#10B981"
            style={{ width: '18px', height: '18px', marginRight: '12px', flexShrink: 0 }}
          >
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>

          <input
            id="login-password"
            type={showPwd ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ECFDF5',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.02em',
              paddingRight: '28px',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.style.borderColor = '#10B981';
              }
            }}
            onBlur={(e) => {
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.style.borderColor = '#18382B';
              }
            }}
          />

          {/* Show / Hide Toggle */}
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            style={{
              position: 'absolute',
              right: '0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6EE7B7',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
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

        {/* ── Checkbox Row (No Forgot Password) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '32px',
            marginTop: '4px',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: '15px',
                height: '15px',
                accentColor: '#10B981',
                cursor: 'pointer',
              }}
            />
            <span style={{ color: '#A7F3D0', fontSize: '13px', fontWeight: 400 }}>Remember me</span>
          </label>
        </div>

        {/* ── Login Button ── */}
        <button
          id="login-submit"
          type="submit"
          disabled={loading || !username.trim() || !password}
          style={{
            width: '100%',
            padding: '13px',
            background: loading ? '#11241C' : 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
            borderRadius: '10px',
            color: loading ? '#6EE7B7' : '#040D0A',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {loading ? 'LOGGING IN…' : 'LOGIN'}
        </button>
      </form>

      {/* ── Demo Accounts Selection Widget ── */}
      <div
        style={{
          width: '100%',
          marginTop: '32px',
          padding: '14px',
          borderRadius: '12px',
          backgroundColor: '#11241C',
          border: '1px solid #18382B',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#10B981',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px',
            textAlign: 'center',
          }}
        >
          ⚡ CYBER AI Demo Quick-Fill
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setUsername('admin@cyberai.internal');
              setPassword('CyberAdmin2026!');
            }}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              border: '1px solid #10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34D399',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            🛡️ Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setUsername('manager@cyberai.internal');
              setPassword('Manager2026!');
            }}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              border: '1px solid #18382B',
              backgroundColor: '#0B1A14',
              color: '#A7F3D0',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            👔 Manager
          </button>
          <button
            type="button"
            onClick={() => {
              setUsername('soc@cyberai.internal');
              setPassword('SocEng2026!');
            }}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              border: '1px solid #18382B',
              backgroundColor: '#0B1A14',
              color: '#A7F3D0',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            ⚡ SOC Eng
          </button>
          <button
            type="button"
            onClick={() => {
              setUsername('analyst@cyberai.internal');
              setPassword('Analyst2026!');
            }}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              border: '1px solid #18382B',
              backgroundColor: '#0B1A14',
              color: '#A7F3D0',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            🔍 Analyst
          </button>
        </div>
      </div>
    </div>
  );
}

