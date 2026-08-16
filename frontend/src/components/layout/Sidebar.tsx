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
    label: 'Dashboard',
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
    href:  '/employees',
    label: 'Employees',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <circle cx={8} cy={8} r={3.5} />
        <path d="M2 20c0-4 2.7-6 6-6s6 2 6 6" strokeLinecap="round" />
        <circle cx={17} cy={8} r={2.5} />
        <path d="M15 20c0-2.5 1.3-4 4-4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href:  '/telemetry',
    label: 'Telemetry Logs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href:  '/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M3 3v18h18" strokeLinecap="round" />
        <path d="M7 16l4-6 4 4 4-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href:  '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <circle cx={12} cy={12} r={3} />
        <path
          strokeLinecap="round"
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        />
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
                className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isIconOnly ? 'justify-center px-0 h-10 w-full' : 'px-3'
                } ${
                  isActive
                    ? 'bg-blue-500/15 text-[var(--color-accent-blue)] border-l-4 border-[var(--color-accent-blue)] font-semibold shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] border-l-4 border-transparent'
                }`}
                title={isIconOnly ? item.label : undefined}
                aria-label={item.label}
              >
                <span className={`shrink-0 flex items-center justify-center ${isActive ? 'text-[var(--color-accent-blue)]' : 'text-slate-400'}`}>
                  {item.icon}
                </span>

                {/* Text Label (smooth transition on collapse) */}
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
                  className="fixed z-40 px-2.5 py-1.5 rounded-md bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-xs font-semibold shadow-2xl border border-[var(--color-border-subtle)] whitespace-nowrap pointer-events-none transition-opacity duration-150 animate-fade-in"
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
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-[#161C2E] border-r border-[#2A3352] transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* ── Brand Header & Top Toggle ── */}
        <div
          className={`h-14 flex items-center border-b border-[#2A3352] shrink-0 px-3 transition-all duration-300 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Shield Icon / Expand Button in Collapsed Mode */}
            <button
              type="button"
              onClick={isCollapsed ? onToggleCollapse : undefined}
              className={`w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 border-0 ${
                isCollapsed ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'
              }`}
              title={isCollapsed ? 'Click to expand sidebar' : 'ITBIS Platform'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'ITBIS Platform'}
            >
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4Z" />
              </svg>
            </button>

            {/* Brand Title & Subtitle */}
            <div
              className={`flex flex-col transition-all duration-300 overflow-hidden ${
                isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
              }`}
            >
              <span className="text-[var(--color-text-primary)] font-bold text-sm tracking-tight leading-tight">
                ITBIS
              </span>
              <span className="text-[var(--color-text-muted)] text-[9px] font-semibold tracking-widest leading-none">
                THREAT INTEL
              </span>
            </div>
          </div>

          {/* Top Collapse Button (When Expanded) */}
          {!isCollapsed && (
            <button
              id="sidebar-top-collapse-btn"
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-white transition-colors cursor-pointer"
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
            <div className="w-5 h-[1px] bg-[var(--color-border-subtle)] mx-auto" />
          ) : (
            <p className="text-[var(--color-text-muted)] text-[10px] font-bold tracking-widest uppercase m-0">
              Navigation
            </p>
          )}
        </div>

        {/* ── Nav Links ── */}
        {renderNavLinks(false)}

        {/* ── Bottom Expand / Collapse Interactive Toggle Button ── */}
        <div className="p-2.5 border-t border-[#2A3352] shrink-0 bg-[#161C2E]">
          <button
            id="sidebar-collapse-toggle"
            type="button"
            onClick={onToggleCollapse}
            className={`w-full flex items-center justify-center gap-2 py-2 px-2 rounded-lg border border-[#2A3352] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border-subtle)] hover:border-blue-500/50 text-[var(--color-text-secondary)] hover:text-white text-xs font-semibold transition-all duration-150 cursor-pointer shadow-sm`}
            title={isCollapsed ? 'Expand sidebar (w-64)' : 'Collapse sidebar (w-16)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4 text-blue-400" />
            ) : (
              <>
                <ChevronLeftIcon className="w-4 h-4 text-blue-400" />
                <span className="truncate">Collapse Sidebar</span>
              </>
            )}
          </button>

          {!isCollapsed && (
            <div className="mt-2 text-center">
              <p className="text-[var(--color-text-muted)] text-[10px] m-0">
                v1.0.0 • ITBIS Security Platform
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE SLIDE-OVER DRAWER (< 768px)
          ───────────────────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-[#161C2E] border-r border-[#2A3352] flex flex-col md:hidden shadow-2xl transition-transform duration-300 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        {/* Drawer Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#2A3352] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4Z" />
              </svg>
            </div>
            <div>
              <p className="text-[var(--color-text-primary)] font-bold text-sm tracking-tight m-0">
                ITBIS
              </p>
              <p className="text-[var(--color-text-muted)] text-[9px] font-semibold tracking-widest m-0">
                THREAT INTEL
              </p>
            </div>
          </div>

          <button
            id="mobile-drawer-close-btn"
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Section header */}
        <div className="px-4 pt-5 pb-2 shrink-0">
          <p className="text-[var(--color-text-muted)] text-[10px] font-bold tracking-widest uppercase m-0">
            Navigation
          </p>
        </div>

        {/* Nav links */}
        {renderNavLinks(true)}

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#2A3352] shrink-0 bg-[#161C2E]">
          <p className="text-[var(--color-text-muted)] text-[11px] m-0">
            ITBIS v1.0.0 • Insider Threat Platform
          </p>
        </div>
      </div>
    </>
  );
}
