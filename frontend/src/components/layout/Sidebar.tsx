'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  href:  string;
  label: string;
  badge?: string;
  icon:  React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href:  '/dashboard',
    label: 'Overview',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx={12} cy={7} r={4} />
      </svg>
    ),
  },
  {
    href:  '/scoring',
    label: 'Insider Risk Scoring Engine',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href:  '/reports',
    label: 'Reports & Exports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeftIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <line x1={18} y1={6} x2={6} y2={18} strokeLinecap="round" strokeLinejoin="round" />
      <line x1={6} y1={6} x2={18} y2={18} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export default function Sidebar({
  isCollapsed,
  isMobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [activeRole, setActiveRoleState] = useState<string>('ADMINISTRATOR');

  useEffect(() => {
    setActiveRoleState(getActiveRole('ADMINISTRATOR'));
    const handleRoleChanged = (e: any) => {
      if (e.detail) setActiveRoleState(e.detail);
    };
    window.addEventListener('cyber-role-changed', handleRoleChanged);
    return () => window.removeEventListener('cyber-role-changed', handleRoleChanged);
  }, []);

  // Common Nav Link Item renderer
  const renderNavLinks = (isDrawer = false) => {
    const isIconOnly = isCollapsed && !isDrawer;

    return (
      <nav className={`flex-1 py-3 ${isIconOnly ? 'px-2' : 'px-3'} space-y-1 overflow-y-auto overflow-x-hidden`}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <div
              key={item.href}
              className="relative"
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link
                href={item.href}
                onClick={() => {
                  if (isDrawer) onCloseMobile();
                }}
                className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isIconOnly ? 'justify-center px-0 h-10 w-full' : 'px-3'
                } ${
                  isActive
                    ? 'bg-[#10B981]/15 text-[#10B981] border-l-4 border-[#10B981] font-semibold shadow-sm'
                    : 'text-[#A7F3D0] hover:text-[#ECFDF5] hover:bg-[#11241C] border-l-4 border-transparent'
                }`}
                title={isIconOnly ? item.label : undefined}
                aria-label={item.label}
              >
                <span className={`shrink-0 flex items-center justify-center ${isActive ? 'text-[#10B981]' : 'text-[#6EE7B7]'}`}>
                  {item.icon}
                </span>

                {/* Text Label */}
                <span
                  className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
                    isIconOnly ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </Link>

              {/* Floating Tooltip in collapsed icon-only desktop mode */}
              {isIconOnly && hoveredItem === item.href && (
                <div
                  className="fixed z-50 px-3 py-1.5 rounded-lg bg-[#11241C] text-[#ECFDF5] text-xs font-semibold shadow-2xl border border-[#10B981]/30 whitespace-nowrap pointer-events-none transition-opacity duration-150 animate-fade-in"
                  style={{
                    left: '72px',
                    transform: 'translateY(-2px)',
                  }}
                >
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP SIDEBAR (>= 768px)
          ───────────────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-[#0B1A14] border-r border-[#18382B] transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* ── Brand Header & Top Toggle ── */}
        <div
          className={`h-16 flex items-center border-b border-[#18382B] shrink-0 px-3.5 transition-all duration-300 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Shield Icon */}
            <button
              type="button"
              onClick={isCollapsed ? onToggleCollapse : undefined}
              className={`w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/25 shrink-0 border-0 ${
                isCollapsed ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'
              }`}
              title={isCollapsed ? 'Click to expand sidebar' : 'CYBER AI Security Platform'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'CYBER AI Security Platform'}
            >
              <svg viewBox="0 0 24 24" fill="#040D0A" className="w-5 h-5">
                <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4Z" />
              </svg>
            </button>

            {/* Brand Title */}
            <div
              className={`flex flex-col transition-all duration-300 overflow-hidden ${
                isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
              }`}
            >
              <span className="text-[#ECFDF5] font-extrabold text-base tracking-tight leading-tight">
                CYBER AI
              </span>
              <span className="text-[#10B981] text-[9px] font-bold tracking-widest leading-none uppercase">
                THREAT INTELLIGENCE
              </span>
            </div>
          </div>

          {/* Top Collapse Button */}
          {!isCollapsed && (
            <button
              id="sidebar-top-collapse-btn"
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl border border-[#18382B] bg-[#11241C] hover:bg-[#18382B] text-[#A7F3D0] hover:text-[#ECFDF5] transition-colors cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Section Label ── */}
        <div
          className={`pt-4 pb-1.5 transition-all duration-300 shrink-0 ${
            isCollapsed ? 'px-2 text-center' : 'px-4'
          }`}
        >
          {isCollapsed ? (
            <div className="w-5 h-[1px] bg-[#18382B] mx-auto" />
          ) : (
            <p className="text-[#6EE7B7] text-[10px] font-bold tracking-widest uppercase m-0">
              CYBER Modules
            </p>
          )}
        </div>

        {/* ── Nav Links ── */}
        {renderNavLinks(false)}

        {/* ── Bottom Settings & Collapse Interactive Bar ── */}
        <div className="p-3 border-t border-[#18382B] shrink-0 bg-[#0B1A14] space-y-2">
          {activeRole === 'ADMINISTRATOR' && (
            <Link
              href="/settings"
              className={`w-full flex items-center gap-2.5 py-2 px-2.5 rounded-xl border border-[#18382B] bg-[#11241C] hover:bg-[#18382B] hover:border-[#10B981]/50 text-[#A7F3D0] hover:text-[#ECFDF5] text-xs font-semibold transition-all duration-150 no-underline ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title="Platform Settings & Health"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-[#10B981] shrink-0">
                <circle cx={12} cy={12} r={3} />
                <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
              {!isCollapsed && <span className="truncate">Settings & Health</span>}
            </Link>
          )}

          <button
            id="sidebar-collapse-toggle"
            type="button"
            onClick={onToggleCollapse}
            className={`w-full flex items-center justify-center gap-2 py-2 px-2 rounded-xl border border-[#18382B] bg-[#11241C] hover:bg-[#18382B] hover:border-[#10B981]/50 text-[#A7F3D0] hover:text-[#ECFDF5] text-xs font-semibold transition-all duration-150 cursor-pointer shadow-sm`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4 text-[#10B981]" />
            ) : (
              <>
                <ChevronLeftIcon className="w-4 h-4 text-[#10B981]" />
                <span className="truncate">Collapse Menu</span>
              </>
            )}
          </button>

          {!isCollapsed && (
            <div className="mt-2 text-center">
              <p className="text-[#6EE7B7] text-[10px] m-0">
                CYBER AI v1.0 • Enterprise Security
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE SLIDE-OVER DRAWER (< 768px)
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-md z-50 md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0B1A14] border-r border-[#18382B] flex flex-col md:hidden shadow-2xl transition-transform duration-300 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#18382B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-md shrink-0">
              <svg viewBox="0 0 24 24" fill="#040D0A" className="w-4 h-4">
                <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4Z" />
              </svg>
            </div>
            <div>
              <p className="text-[#ECFDF5] font-bold text-sm tracking-tight m-0">
                CYBER AI
              </p>
              <p className="text-[#10B981] text-[9px] font-bold tracking-widest m-0">
                SECURITY PLATFORM
              </p>
            </div>
          </div>

          <button
            id="mobile-drawer-close-btn"
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl border border-[#18382B] text-[#A7F3D0] hover:text-[#ECFDF5] hover:bg-[#11241C] transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-5 pb-2 shrink-0">
          <p className="text-[#6EE7B7] text-[10px] font-bold tracking-widest uppercase m-0">
            Navigation
          </p>
        </div>

        {renderNavLinks(true)}

        <div className="p-4 border-t border-[#18382B] shrink-0 bg-[#0B1A14]">
          <p className="text-[#6EE7B7] text-[11px] m-0">
            CYBER AI v1.0 • Behavioral Intelligence
          </p>
        </div>
      </div>
    </>
  );
}
