'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { UserRead, EmployeeRead, RiskCategory } from '@/types/api';
import { clearToken, getCurrentUser, listEmployees } from '@/services/api';
import { hasPermission, getActiveRole, setActiveRole } from '@/lib/rbac';

// ── Horizontal Navigation Items ───────────────────────────────────────────────

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href:  '/dashboard',
    label: 'Overview',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <rect x={3} y={3} width={7} height={7} rx={1.5} />
        <rect x={14} y={3} width={7} height={7} rx={1.5} />
        <rect x={3} y={14} width={7} height={7} rx={1.5} />
        <rect x={14} y={14} width={7} height={7} rx={1.5} />
      </svg>
    ),
  },
  {
    href:  '/profile',
    label: 'CYBER Employee Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx={12} cy={7} r={4} />
      </svg>
    ),
  },
  {
    href:  '/scoring',
    label: 'Insider Risk Scoring Engine',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v4" strokeLinecap="round" />
        <circle cx="12" cy="15" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href:  '/ueba',
    label: 'UEBA Intelligence',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href:  '/reports',
    label: 'Reports & Exports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const ROLE_LABELS: Record<string, string> = {
  SECURITY_ANALYST:  'Analyst',
  SOC_ENGINEER:      'SOC Eng',
  SECURITY_MANAGER:  'Manager',
  ADMINISTRATOR:     'Administrator',
};

const RISK_COLORS: Record<RiskCategory, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F59E0B',
  MEDIUM:   '#34D399',
  LOW:      '#10B981',
};

// ── Notification Popover ──────────────────────────────────────────────────────

function NotificationPopover({ alerts, loading, onClose }: { alerts: EmployeeRead[]; loading: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="animate-fade-in absolute top-[calc(100%+12px)] right-0 w-80 bg-[#0B1A14] border border-[#18382B] rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="p-3.5 border-b border-[#18382B] flex items-center justify-between bg-[#11241C]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse-green" />
          <p className="m-0 text-xs font-bold text-[#ECFDF5]">CYBER Threat Alerts</p>
        </div>
        <span className="text-[10px] text-[#A7F3D0] font-semibold bg-[#040D0A] border border-[#10B981]/30 px-2 py-0.5 rounded-full">
          {loading ? '…' : `${alerts.length} active`}
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto p-2 space-y-1.5">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="m-0 text-xl">🛡️</p>
            <p className="mt-2 text-xs text-[#A7F3D0]">No critical alerts</p>
          </div>
        ) : (
          alerts.map((emp) => {
            const color = RISK_COLORS[emp.risk_category] ?? '#10B981';
            const score = Math.round(emp.risk_score * 100);
            return (
              <div
                key={emp.emp_id}
                className="flex items-center gap-2.5 p-2 rounded-xl transition-colors cursor-default"
                style={{ borderLeft: `3px solid ${color}`, backgroundColor: `${color}0D` }}
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: `${color}22`, color }}>
                  {emp.first_name[0]}{emp.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-xs font-semibold text-[#ECFDF5] truncate">{emp.first_name} {emp.last_name}</p>
                  <p className="m-0 text-[10px] text-[#A7F3D0] truncate">{emp.department}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full block mb-0.5" style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}44` }}>
                    {emp.risk_category}
                  </span>
                  <span className="text-[10px] font-bold font-mono" style={{ color }}>{score}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2.5 px-4 border-t border-[#18382B] flex justify-between items-center bg-[#11241C]">
        <p className="m-0 text-[10px] text-[#A7F3D0]">Monitored identities</p>
        <a href="/profile" onClick={onClose} className="text-[11px] text-[#10B981] font-semibold hover:underline">
          View all →
        </a>
      </div>
    </div>
  );
}

// ── User Dropdown ─────────────────────────────────────────────────────────────

function UserDropdown({
  user,
  activeRole,
  onRoleChange,
  onLogout,
  onClose
}: {
  user: UserRead | null;
  activeRole: string;
  onRoleChange: (role: string) => void;
  onLogout: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initials = user ? user.email.slice(0, 2).toUpperCase() : 'A';

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  const ROLES_LIST = [
    { key: 'SECURITY_ANALYST', label: 'Security Analyst', badge: 'ANALYST', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    { key: 'SOC_ENGINEER', label: 'SOC Engineer', badge: 'SOC ENG', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
    { key: 'SECURITY_MANAGER', label: 'Security Manager', badge: 'MANAGER', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { key: 'ADMINISTRATOR', label: 'Administrator', badge: 'ADMIN', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
  ];

  return (
    <div
      ref={ref}
      className="animate-fade-in absolute top-[calc(100%+12px)] right-0 w-72 bg-[#0B1A14] border border-[#18382B] rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="p-3.5 border-b border-[#18382B] flex items-center gap-3 bg-[#11241C]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-xs font-bold text-[#040D0A] shrink-0 shadow-md">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-bold text-[#ECFDF5] truncate">{user?.email ?? 'cyber.analyst@cyberai.local'}</p>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full mt-1 text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/30">
            {ROLE_LABELS[activeRole] ?? activeRole}
          </span>
        </div>
      </div>

      {/* Role Switcher Section */}
      <div className="p-3 border-b border-[#18382B] bg-[#040D0A]/40 space-y-2">
        <p className="m-0 text-[10px] font-bold text-[#6EE7B7] uppercase tracking-wider">
          Switch Website Role View:
        </p>
        <div className="grid grid-cols-1 gap-1">
          {ROLES_LIST.map((r) => {
            const isCurrent = activeRole === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  onRoleChange(r.key);
                }}
                className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50 font-bold'
                    : 'text-[#A7F3D0] hover:text-[#ECFDF5] hover:bg-[#11241C] border border-transparent'
                }`}
              >
                <span>{r.label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${r.color}`}>
                  {r.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-1.5 space-y-0.5">
        {activeRole === 'ADMINISTRATOR' && (
          <a href="/settings" onClick={onClose} className="flex items-center gap-2.5 p-2 rounded-xl text-xs text-[#A7F3D0] hover:text-[#ECFDF5] hover:bg-[#11241C] transition-colors">
            Platform Settings & Health
          </a>
        )}
        {(activeRole === 'ADMINISTRATOR' || activeRole === 'SOC_ENGINEER') && (
          <a href="http://127.0.0.1:8000/api/docs" target="_blank" rel="noreferrer" onClick={onClose} className="flex items-center gap-2.5 p-2 rounded-xl text-xs text-[#A7F3D0] hover:text-[#ECFDF5] hover:bg-[#11241C] transition-colors">
            API OpenAPI Docs ↗
          </a>
        )}
      </div>

      <div className="p-1.5 border-t border-[#18382B]">
        <button type="button" onClick={onLogout} className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer">
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Main Top-Centered Functional Navbar ───────────────────────────────────────

export default function TopBar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [user,          setUser]          = useState<UserRead | null>(null);
  const [activeRole,    setActiveRoleState] = useState<string>('ADMINISTRATOR');
  const [alerts,        setAlerts]        = useState<EmployeeRead[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [showBell,      setShowBell]      = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      if (u?.role) {
        const stored = getActiveRole(u.role);
        setActiveRoleState(stored);
      }
    }).catch(() => {
      setActiveRoleState(getActiveRole('ADMINISTRATOR'));
    });

    const handleRoleChanged = (e: any) => {
      if (e.detail) setActiveRoleState(e.detail);
    };
    window.addEventListener('cyber-role-changed', handleRoleChanged);
    return () => window.removeEventListener('cyber-role-changed', handleRoleChanged);
  }, []);

  const handleRoleChange = (newRole: string) => {
    setActiveRoleState(newRole);
    setActiveRole(newRole);
    setShowProfile(false);
  };

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const all = await listEmployees({ limit: 200 });
      setAlerts(all.filter((e) => e.risk_category === 'CRITICAL' || e.risk_category === 'HIGH'));
    } catch {}
    finally { setAlertsLoading(false); }
  }, []);

  function handleBellClick() {
    const opening = !showBell;
    setShowBell(opening);
    setShowProfile(false);
    if (opening) void fetchAlerts();
  }

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  const initials = user ? user.email.slice(0, 2).toUpperCase() : 'A';

  return (
    <header className="fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl h-16 z-50 glass-floating rounded-2xl border border-[#10B981]/30 flex items-center justify-between px-4 sm:px-6 transition-all duration-300">
      
      {/* ── Left: Brand Logo & Title ── */}
      <Link href="/dashboard" className="flex items-center gap-3 no-underline shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/25 border-0">
          <svg viewBox="0 0 24 24" fill="#040D0A" className="w-5 h-5">
            <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4Z" />
          </svg>
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="text-[#ECFDF5] font-extrabold text-base tracking-tight leading-tight">
            CYBER AI
          </span>
          <span className="text-[#10B981] text-[9px] font-bold tracking-widest leading-none uppercase">
            THREAT INTELLIGENCE
          </span>
        </div>
      </Link>

      {/* ── Center: Top Horizontal Navigation Links (Desktop) ── */}
      <nav className="hidden md:flex items-center gap-1.5 bg-[#040D0A]/70 p-1.5 rounded-xl border border-[#18382B]">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 no-underline ${
                isActive
                  ? 'bg-[#10B981] text-[#040D0A] shadow-md shadow-[#10B981]/30 font-extrabold scale-[1.02]'
                  : 'text-[#A7F3D0] hover:text-[#ECFDF5] hover:bg-[#11241C]'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Right: Live Pill, Bell, Profile, Mobile Menu ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        
        {/* Live Status Indicator & Role Badge */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse-green" />
          <span className="text-[10px] text-[#10B981] font-extrabold tracking-wider uppercase font-mono">
            {ROLE_LABELS[activeRole] ?? activeRole}
          </span>
        </div>

        {/* Bell Button */}
        <div className="relative">
          <button
            type="button"
            onClick={handleBellClick}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              showBell ? 'border-[#10B981] bg-[#10B981]/20 text-[#10B981]' : 'border-[#18382B] bg-[#0B1A14] text-[#A7F3D0] hover:bg-[#11241C]'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-[#10B981]">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-4-5.659V4a2 2 0 1 0-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {alerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#10B981] ring-2 ring-[#040D0A]" />}
          </button>
          {showBell && <NotificationPopover alerts={alerts} loading={alertsLoading} onClose={() => setShowBell(false)} />}
        </div>

        {/* Settings Quick Action Button */}
        {activeRole === 'ADMINISTRATOR' && (
          <Link
            href="/settings"
            className="w-9 h-9 rounded-xl border border-[#18382B] bg-[#0B1A14] text-[#A7F3D0] hover:bg-[#11241C] hover:border-[#10B981]/50 flex items-center justify-center transition-all no-underline shrink-0"
            title="Platform Settings & Health"
            aria-label="Platform Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-[#10B981]">
              <circle cx={12} cy={12} r={3} />
              <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </Link>
        )}

        {/* Profile Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowProfile((v) => !v); setShowBell(false); }}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-[#18382B] bg-[#0B1A14] hover:border-[#10B981]/40 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-xs font-extrabold text-[#040D0A] shrink-0">
              {initials}
            </div>
            <span className="hidden sm:inline text-xs font-bold text-[#ECFDF5] max-w-[100px] truncate">
              {ROLE_LABELS[activeRole] ?? 'Admin'}
            </span>
          </button>
          {showProfile && (
            <UserDropdown
              user={user}
              activeRole={activeRole}
              onRoleChange={handleRoleChange}
              onLogout={handleLogout}
              onClose={() => setShowProfile(false)}
            />
          )}
        </div>

        {/* Mobile Nav Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-xl md:hidden border border-[#18382B] bg-[#0B1A14] text-[#A7F3D0] hover:text-[#ECFDF5]"
          aria-label="Toggle navigation menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <line x1={3} y1={12} x2={21} y2={12} strokeLinecap="round" />
            <line x1={3} y1={6} x2={21} y2={6} strokeLinecap="round" />
            <line x1={3} y1={18} x2={21} y2={18} strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0B1A14] border border-[#18382B] rounded-2xl p-3 shadow-2xl md:hidden flex flex-col gap-1.5 animate-fade-in">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-[#10B981] text-[#040D0A]' : 'text-[#A7F3D0] hover:bg-[#11241C]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
