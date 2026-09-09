import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@threat.ai');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleAuth = (e) => {
    e.preventDefault();
    const result = login(email, password);
    if (result.success) {
      if (onLogin) onLogin();
      navigate(redirectPath, { replace: true });
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        padding: '32px'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '15px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            S
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '17px', color: '#0f172a' }}>
              Threat AI
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>
            Sign in to your account
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Enter your analyst credentials to continue
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#dc2626',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@threat.ai"
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '9px 40px 9px 12px',
                  fontSize: '13px',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '4px',
              padding: '10px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}