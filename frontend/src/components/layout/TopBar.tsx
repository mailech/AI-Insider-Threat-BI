'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { UserRead, EmployeeRead, RiskCategory } from '@/types/api';
import { clearToken, getCurrentUser, listEmployees } from '@/services/api';
import { hasPermission } from '@/lib/rbac';

// ── Breadcrumb map ────────────────────────────────────────────────────────────

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':  'Security Dashboard',
  '/employees':  'Employee Profiles',
  '/telemetry':  'Telemetry Logs',
  '/analytics':  'Risk Analytics',
  '/settings':   'Settings',
};

// ── Role display helpers ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SECURITY_ANALYST:  'Security Analyst',
  SOC_ENGINEER:      'SOC Engineer',
  SECURITY_MANAGER:  'Security Manager',
  ADMINISTRATOR:     'Administrator',
};

const ROLE_COLORS: Record<string, string> = {
  SECURITY_ANALYST:  '#3B82F6',
  SOC_ENGINEER:      '#6366F1',
  SECURITY_MANAGER:  '#F59E0B',
  ADMINISTRATOR:     '#EF4444',
};

// ── Risk colors ───────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskCategory, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F59E0B',
  MEDIUM:   '#3B82F6',
  LOW:      '#10B981',
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function MenuIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <line x1={3} y1={12} x2={21} y2={12} strokeLinecap="round" />
      <line x1={3} y1={6} x2={21} y2={6} strokeLinecap="round" />
      <line x1={3} y1={18} x2={21} y2={18} strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-4-5.659V4a2 2 0 1 0-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}
      style={{ width: '12px', height: '12px', transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" />
      <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={21} y1={12} x2={9} y2={12} strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
      <path d="M12 2L3 5v6c0 5.25 3.75 10.15 9 11.25C16.25 21.15 21 16.25 21 11V5l-9-4Z"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Notification Popover ──────────────────────────────────────────────────────

interface NotificationPopoverProps {
  alerts: EmployeeRead[];
  loading: boolean;
  onClose: () => void;
}

function NotificationPopover({ alerts, loading, onClose }: NotificationPopoverProps) {
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
      className="animate-fade-in absolute top-[calc(100%+8px)] right-0 w-[calc(100vw-32px)] sm:w-80 max-w-sm bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <p className="m-0 text-xs font-bold text-[var(--color-text-primary)]">Threat Alerts</p>
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)] font-semibold bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-full">
          {loading ? '…' : `${alerts.length} active`}
        </span>
      </div>

      {/* Alert list */}
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="m-0 text-xl">✅</p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">No critical alerts</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {alerts.map((emp) => {
              const color = RISK_COLORS[emp.risk_category] ?? '#94A3B8';
              const score = Math.round(emp.risk_score * 100);
              return (
                <div
                  key={emp.emp_id}
                  className="flex items-center gap-2.5 p-2 rounded-lg transition-colors cursor-default"
                  style={{
                    borderLeft: `3px solid ${color}`,
                    backgroundColor: `${color}0D`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${color}44, ${color}88)`,
                      color,
                    }}
                  >
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-xs font-semibold text-[var(--color-text-primary)] truncate">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="m-0 text-[10px] text-[var(--color-text-muted)] truncate">
                      {emp.department}
                    </p>
                  </div>
                  {/* Badge */}
                  <div className="text-right shrink-0">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full block mb-0.5"
                      style={{
                        color,
                        backgroundColor: `${color}22`,
                        border: `1px solid ${color}44`,
                      }}
                    >
                      {emp.risk_category}
                    </span>
                    <span className="text-[10px] font-bold font-mono" style={{ color }}>{score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 px-4 border-t border-[var(--color-border-subtle)] flex justify-between items-center bg-[var(--color-bg-elevated)]">
        <p className="m-0 text-[10px] text-[var(--color-text-muted)]">HIGH + CRITICAL identities</p>
        <a href="/employees" onClick={onClose} className="text-[11px] text-[var(--color-accent-blue)] font-semibold hover:underline">
          View all →
        </a>
      </div>
    </div>
  );
}

// ── User Profile Dropdown ─────────────────────────────────────────────────────

interface UserDropdownProps {
  user: UserRead | null;
  onLogout: () => void;
  onClose: () => void;
}

function UserDropdown({ user, onLogout, onClose }: UserDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? '#94A3B8';
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? (user?.role ?? 'Unknown');
  const initials   = user ? user.email.slice(0, 2).toUpperCase() : '?';

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
      className="animate-fade-in absolute top-[calc(100%+8px)] right-0 w-64 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Profile header */}
      <div className="p-3.5 border-b border-[var(--color-border-subtle)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-bold text-[var(--color-text-primary)] truncate">
            {user?.email ?? 'Loading…'}
          </p>
          <span
            className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full mt-1"
            style={{
              color: roleColor,
              backgroundColor: `${roleColor}18`,
              border: `1px solid ${roleColor}33`,
            }}
          >
            <ShieldIcon />
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Menu items */}
      <div className="p-1.5 space-y-0.5">
        <a
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 p-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 shrink-0 text-slate-400">
            <circle cx={12} cy={12} r={3} />
            <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
          Platform Settings
        </a>

        {hasPermission(user?.role, 'view:api_docs') && (
          <a
            href="http://127.0.0.1:8000/api/docs"
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex items-center gap-2.5 p-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 shrink-0 text-slate-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" strokeLinejoin="round" />
              <line x1={16} y1={13} x2={8} y2={13} strokeLinecap="round" />
              <line x1={16} y1={17} x2={8} y2={17} strokeLinecap="round" />
              <polyline points="10 9 9 9 8 9" strokeLinecap="round" />
            </svg>
            API Documentation ↗
          </a>
        )}
      </div>

      {/* Divider + logout */}
      <div className="p-1.5 border-t border-[var(--color-border-subtle)]">
        <button
          id="topbar-logout-btn"
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
        >
          <LogoutIcon />
          Sign Out
        </button>
      </div>

      {/* Footer */}
      <div className="px-3.5 py-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
        <p className="m-0 text-[10px] text-[var(--color-text-muted)]">
          ITBIS v1.0.0 · Milestone 1
        </p>
      </div>
    </div>
  );
}

// ── Main TopBar ───────────────────────────────────────────────────────────────

interface TopBarProps {
  isCollapsed?: boolean;
  onToggleMobile?: () => void;
}

export default function TopBar({ isCollapsed = false, onToggleMobile }: TopBarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const [user,          setUser]          = useState<UserRead | null>(null);
  const [alerts,        setAlerts]        = useState<EmployeeRead[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [showBell,      setShowBell]      = useState(false);

  const pageLabel = PAGE_LABELS[pathname] ?? 'ITBIS';

  // ── Fetch current user ───────────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => { /* silently ignore — user may not be logged in yet */ });
  }, []);

  // ── Fetch alert employees (HIGH + CRITICAL) ──────────────────────────────
  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const all = await listEmployees({ limit: 200 });
      setAlerts(all.filter((e) => e.risk_category === 'CRITICAL' || e.risk_category === 'HIGH'));
    } catch { /* ignore */ }
    finally { setAlertsLoading(false); }
  }, []);

  function handleBellClick() {
    const opening = !showBell;
    setShowBell(opening);
    setShowProfile(false);
    if (opening) void fetchAlerts();
  }

  function handleProfileClick() {
    setShowProfile((v) => !v);
    setShowBell(false);
  }

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  const initials = user ? user.email.slice(0, 2).toUpperCase() : 'A';
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? 'Security Manager';
  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? '#94A3B8';

  // Unread badge count: HIGH + CRITICAL alerts
  const unreadCount = alerts.length;

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-14 bg-[var(--color-bg-base)]/95 backdrop-blur-md border-b border-[var(--color-border-subtle)] flex items-center justify-between px-4 sm:px-6 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'md:left-16' : 'md:left-64'
      } left-0`}
    >
      {/* ── Left: Mobile Hamburger + page title + live badge ── */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          id="mobile-menu-toggle-btn"
          type="button"
          onClick={onToggleMobile}
          className="p-1.5 rounded-lg md:hidden border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
          aria-label="Open mobile menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        {/* Page Title */}
        <h1 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] m-0 tracking-tight truncate">
          {pageLabel}
        </h1>

        {/* Live Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-bold tracking-wider">LIVE</span>
        </div>
      </div>

      {/* ── Right: bell + profile ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {/* ── Notification Bell ── */}
        <div className="relative">
          <button
            id="topbar-bell-btn"
            type="button"
            aria-label="Notifications"
            onClick={handleBellClick}
            className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
              showBell
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-[var(--color-border-subtle)] bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <BellIcon />
            {/* Unread dot */}
            {(unreadCount > 0 || !showBell) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--color-bg-base)]" />
            )}
          </button>

          {showBell && (
            <NotificationPopover
              alerts={alerts}
              loading={alertsLoading}
              onClose={() => setShowBell(false)}
            />
          )}
        </div>

        {/* ── User Profile Chip ── */}
        <div className="relative">
          <button
            id="topbar-profile-btn"
            type="button"
            onClick={handleProfileClick}
            className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border transition-all cursor-pointer ${
              showProfile
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:border-blue-500/40 hover:bg-[var(--color-bg-card)]'
            }`}
          >
            {/* Avatar circle */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
              {initials}
            </div>

            {/* Text (hidden on small mobile screens for neatness) */}
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-xs font-semibold text-[var(--color-text-primary)] leading-tight max-w-[110px] truncate">
                {user?.email?.split('@')[0] ?? 'Admin'}
              </span>
              <span className="text-[9px] font-semibold tracking-wider leading-none" style={{ color: roleColor }}>
                {roleLabel}
              </span>
            </div>

            {/* Chevron */}
            <span className="text-[var(--color-text-muted)] ml-0.5">
              <ChevronIcon open={showProfile} />
            </span>
          </button>

          {showProfile && (
            <UserDropdown
              user={user}
              onLogout={handleLogout}
              onClose={() => setShowProfile(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
