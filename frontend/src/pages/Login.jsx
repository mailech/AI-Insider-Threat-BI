import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('analyst@soc.corp');
  const [password, setPassword] = useState('analyst123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'SOC Engineer') navigate('/soc');
      else if (user.role === 'Security Manager') navigate('/manager');
      else if (user.role === 'Administrator') navigate('/admin-dash');
      else navigate('/analyst');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing cyber grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2e4615_1px,transparent_1px),linear-gradient(to_bottom,#1f2e4615_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0f1726]/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-950/50">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">AI Insider Threat SOC</h2>
          <p className="text-xs text-slate-400 mt-1">Behavioral Intelligence & Risk Operations Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">SOC Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@soc.corp"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-750 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Master Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-750 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/40 disabled:opacity-50"
          >
            {loading ? 'Authenticating SOC Identity...' : 'Access SOC Intelligence Console'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Demo Quick Select Persona Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> Quick Persona Login (Evaluation / Viva)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickSelect('analyst@soc.corp', 'analyst123')}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-cyan-400">Security Analyst</div>
              <div className="text-[10px] text-slate-500 font-mono">analyst@soc.corp</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('soc@soc.corp', 'soc123')}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-purple-400">SOC Engineer</div>
              <div className="text-[10px] text-slate-500 font-mono">soc@soc.corp</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('manager@soc.corp', 'manager123')}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-amber-400">Security Manager</div>
              <div className="text-[10px] text-slate-500 font-mono">manager@soc.corp</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('admin@soc.corp', 'admin123')}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-emerald-400">Administrator</div>
              <div className="text-[10px] text-slate-500 font-mono">admin@soc.corp</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
