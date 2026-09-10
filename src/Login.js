import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Terminal
} from 'lucide-react';
import { useAuth } from './context/AuthContext';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@threat.ai');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    setError('');
    setIsLoading(true);

    const result = login(email, password);
    setIsLoading(false);
    if (result.success) {
      if (onLogin) onLogin();
      navigate(redirectPath, { replace: true });
    } else {
      setError(result.message || 'Invalid email or password. Use demo credentials below.');
    }
  };

  const handleQuickFill = () => {
    setEmail('admin@threat.ai');
    setPassword('admin123');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090d16',
        backgroundImage:
          'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 65%)',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
        color: '#f8fafc'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
          padding: '36px 32px',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* Brand Shield & Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '26px'
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(79, 70, 229, 0.45)',
              marginBottom: '16px',
              color: '#ffffff'
            }}
          >
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#f8fafc',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em'
            }}
          >
            Threat AI Command Portal
          </h1>

          <p
            style={{
              fontSize: '13px',
              color: '#94a3b8',
              margin: 0,
              lineHeight: 1.4
            }}
          >
            Insider Threat Behavioral Intelligence System
          </p>
        </div>

        {/* Security Warning Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '11.5px',
            color: '#cbd5e1',
            marginBottom: '22px',
            lineHeight: 1.4
          }}
        >
          <Terminal size={14} color="#818cf8" style={{ marginTop: '2px', flexShrink: 0 }} />
          <span>
            <strong>RESTRICTED ACCESS:</strong> Authorized SOC analyst login with TLS 1.3 encryption.
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(69, 10, 10, 0.6)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '11px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#cbd5e1',
                marginBottom: '6px'
              }}
            >
              Analyst Email
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <Mail
                size={16}
                color="#64748b"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@threat.ai"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  fontSize: '13px',
                  color: '#f8fafc',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#818cf8')}
                onBlur={(e) => (e.target.style.borderColor = '#334155')}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#cbd5e1',
                marginBottom: '6px'
              }}
            >
              Security Password
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <Lock
                size={16}
                color="#64748b"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 42px 10px 38px',
                  fontSize: '13px',
                  color: '#f8fafc',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#818cf8')}
                onBlur={(e) => (e.target.style.borderColor = '#334155')}
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
                  color: '#94a3b8'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '6px',
              padding: '12px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: isLoading ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
              transition: 'background-color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#4338ca';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#4f46e5';
            }}
          >
            <KeyRound size={16} />
            {isLoading ? 'Authenticating...' : 'Authenticate Analyst'}
          </button>
        </form>

        {/* Demo Credentials Quick Fill Button */}
        <div
          style={{
            marginTop: '22px',
            textAlign: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #1e293b'
          }}
        >
          <button
            type="button"
            onClick={handleQuickFill}
            style={{
              background: 'transparent',
              border: '1px dashed #475569',
              color: '#94a3b8',
              fontSize: '11.5px',
              fontWeight: '500',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#818cf8';
              e.currentTarget.style.color = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#475569';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            Fill Demo Credentials (admin@threat.ai)
          </button>
        </div>
      </div>
    </div>
  );
}