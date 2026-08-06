import { useState } from "react";
import { X, Shield, Lock, User, Mail, Key, Globe, LogIn, CheckCircle2 } from "lucide-react";
import { palette } from "../../styles/theme.js";
import { api } from "../../services/api.js";

export default function LoginModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState("login"); // "login" or "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Security Analyst");
  const [department, setDepartment] = useState("SOC Operations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username || "analyst", password || "password123");
      setSuccessMsg(`Authenticated via JWT! Welcome ${res.name}`);
      setTimeout(() => {
        onAuthSuccess(res);
        onClose();
      }, 800);
    } catch (err) {
      setError("Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        username: username || `user_${Date.now()}`,
        password: password || "password123",
        name: name || "New Security Member",
        email: email || "user@aegis-security.io",
        role,
        department
      });
      setSuccessMsg(`User Registered successfully with JWT access token!`);
      setTimeout(() => {
        onAuthSuccess(res);
        onClose();
      }, 1000);
    } catch (err) {
      setError("Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth2 = async (providerName) => {
    setLoading(true);
    try {
      const res = await api.oauth2Login(providerName);
      setSuccessMsg(`Authenticated via ${providerName}!`);
      setTimeout(() => {
        onAuthSuccess(res);
        onClose();
      }, 800);
    } catch (err) {
      setError(`${providerName} authentication failed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div
        style={{ background: palette.surface, border: `1px solid ${palette.line}` }}
        className="max-w-md w-full rounded-2xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ background: palette.accent }} className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield size={20} color={palette.void} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">AEGIS Security Auth Portal</h2>
            <p style={{ color: palette.textMuted }} className="text-xs">
              JWT Authentication & Role-Based Access Control
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 mb-5">
          <button
            onClick={() => setTab("login")}
            style={{
              color: tab === "login" ? palette.accent : palette.textMuted,
              borderBottom: tab === "login" ? `2px solid ${palette.accent}` : "2px solid transparent"
            }}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center"
          >
            JWT Login
          </button>
          <button
            onClick={() => setTab("register")}
            style={{
              color: tab === "register" ? palette.accent : palette.textMuted,
              borderBottom: tab === "register" ? `2px solid ${palette.accent}` : "2px solid transparent"
            }}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center"
          >
            User Registration
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} />
            {successMsg}
          </div>
        )}

        {/* Form Body */}
        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Username / ID</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst, soc_eng, manager, admin"
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <Key size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: palette.accent, color: palette.void }}
              className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-cyan-500/20"
            >
              <LogIn size={15} />
              {loading ? "Authenticating JWT..." : "Sign In with JWT"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="j_doe"
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Corporate Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="j.doe@company.io"
                style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="Security Analyst">Security Analyst</option>
                  <option value="SOC Engineer">SOC Engineer</option>
                  <option value="Security Manager">Security Manager</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="SOC Operations"
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: palette.accent, color: palette.void }}
              className="w-full py-2.5 rounded-lg text-xs font-bold hover:brightness-110 mt-2"
            >
              {loading ? "Creating Account..." : "Register User & Issue JWT"}
            </button>
          </form>
        )}

        {/* OAuth2 Single Sign-On Dividers */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2">
            Or Sign In with OAuth2 SSO
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleOAuth2("Google SSO")}
            style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
            className="py-2 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
          >
            <Globe size={13} className="text-red-400" />
            Google
          </button>

          <button
            onClick={() => handleOAuth2("Azure AD OAuth2")}
            style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
            className="py-2 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
          >
            <Globe size={13} className="text-cyan-400" />
            Azure AD
          </button>

          <button
            onClick={() => handleOAuth2("Okta OAuth2")}
            style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
            className="py-2 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
          >
            <Globe size={13} className="text-emerald-400" />
            Okta
          </button>
        </div>
      </div>
    </div>
  );
}
