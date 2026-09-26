import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Lock, User, Key, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#060913] cyber-grid p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-cyber-cyan">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
            <span className="text-cyan-400">THREAT-BI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            AI-Powered Behavioral Intelligence & SOC Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                Analyst Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, analyst"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono shadow-cyber-cyan transition-all duration-200 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Login Persona Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase tracking-wider text-center">
              Quick Switch Role Demo Accounts
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('admin', 'Password123!')}
                className="px-2.5 py-1.5 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-400 text-left transition truncate"
              >
                Administrator
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('manager', 'Password123!')}
                className="px-2.5 py-1.5 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-indigo-400 text-left transition truncate"
              >
                SOC Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('soc_engineer', 'Password123!')}
                className="px-2.5 py-1.5 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-emerald-400 text-left transition truncate"
              >
                SOC Engineer
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('analyst', 'Password123!')}
                className="px-2.5 py-1.5 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-amber-400 text-left transition truncate"
              >
                Security Analyst
              </button>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <span className="text-xs text-slate-400">Need an account? </span>
            <Link to="/register" className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-semibold underline">
              Register Analyst
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
