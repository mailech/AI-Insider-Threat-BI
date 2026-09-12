'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/common/Logo';
import { GlassCard } from '@/components/ui/GlassCard';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { UserRole } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const { login, ssoLogin } = useAuth();

  const [email, setEmail] = useState('admin@ams.internal');
  const [password, setPassword] = useState('Admin1234!');
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts: { role: UserRole; email: string; pass: string; color: string }[] = [
    { role: 'Administrator', email: 'admin@ams.internal', pass: 'Admin1234!', color: 'border-violet-500/40 text-violet-300 hover:bg-violet-500/10' },
    { role: 'Security Manager', email: 'manager@ams.internal', pass: 'Manager123!', color: 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10' },
    { role: 'SOC Engineer', email: 'soc@ams.internal', pass: 'SocEng123!', color: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10' },
    { role: 'Security Analyst', email: 'analyst@ams.internal', pass: 'Analyst123!', color: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      router.push('/overview');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSsoAuthenticate = async (role: UserRole) => {
    setIsSsoLoading(true);
    setError(null);
    try {
      await ssoLogin(role);
      setShowSsoModal(false);
      router.push('/overview');
    } catch (err: any) {
      setError(err.message || 'SSO authentication grant failed.');
    } finally {
      setIsSsoLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <main className="min-h-screen w-full bg-ambient-glow flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Main Card */}
        <GlassCard variant="elevated" className="p-8 backdrop-blur-2xl">
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center space-y-3 mb-8">
            <Logo size="lg" />
            <p className="text-xs text-slate-400 max-w-xs">
              Enterprise Behavioral Threat Intelligence & Activity Telemetry Gateway
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={17} className="flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@ams.internal"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                  Password
                </label>
                <span className="text-[11px] text-violet-400 font-mono">JWT Auth (HS256)</span>
              </div>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isSsoLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:from-violet-500 hover:to-purple-500 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Enhancement 4: Simulated Corporate SSO Fast-Path Button */}
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            <button
              type="button"
              onClick={() => setShowSsoModal(true)}
              disabled={isLoading || isSsoLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-violet-500/40 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <div className="w-4 h-4 rounded bg-violet-600/30 border border-violet-400/30 flex items-center justify-center text-violet-300">
                <Lock size={10} />
              </div>
              <span>Sign in with Corporate SSO</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                (Simulated Demo)
              </span>
            </button>
          </div>

          {/* Quick Demo Credentials Switcher */}
          <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={12} className="text-violet-400" /> One-Click Demo Accounts
              </span>
              <span className="text-[10px] text-slate-500">Click to fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => handleQuickFill(account.email, account.pass)}
                  className={`p-2 rounded-xl bg-white/[0.02] border text-left text-xs transition-all flex flex-col ${account.color}`}
                >
                  <span className="font-semibold text-white truncate">{account.role}</span>
                  <span className="text-[10px] opacity-75 font-mono truncate">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Footer Security Badge */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
          <ShieldCheck size={14} className="text-violet-400" />
          <span>Activity Management System • Enterprise SOC Tier-1</span>
        </div>
      </div>

      {/* Enhancement 4: Corporate SSO Identity Provider Modal */}
      {showSsoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowSsoModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#131122] border border-violet-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Lock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Corporate SSO Identity Provider
                  </h3>
                  <span className="text-[10px] text-violet-400 font-mono">
                    Simulated Demo for SOC Defense
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSsoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Select an enterprise persona to execute an authentic OAuth2 bearer token grant exchange against the AMS backend:
            </p>

            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  disabled={isSsoLoading}
                  onClick={() => handleSsoAuthenticate(account.role)}
                  className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/40 text-left transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white font-bold text-xs font-mono">
                      {account.role.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs group-hover:text-violet-300 transition-colors">
                        {account.role}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {account.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-violet-400 font-medium">
                    <span>OAuth2 Grant</span>
                    <ArrowRight size={12} />
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 text-[10px] text-slate-400 leading-relaxed font-mono">
              <strong className="text-slate-300">Identity Provider Notice:</strong> Simulated corporate IdP fast-path (PDF Page 2). Issues real signed JWT bearer tokens mapped strictly to verified evaluation accounts.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
