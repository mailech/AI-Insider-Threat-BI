'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Activity,
  ShieldAlert,
  LineChart,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  Laptop,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const navItems = [
    {
      name: 'Security Overview',
      href: '/overview',
      icon: LayoutDashboard,
    },
    {
      name: 'Incident Management',
      href: '/incidents',
      icon: AlertOctagon,
    },
    {
      name: 'Employee Directory',
      href: '/employees',
      icon: Users,
    },
    {
      name: 'Device Fleet',
      href: '/devices',
      icon: Laptop,
    },
    {
      name: 'Telemetry Logs',
      href: '/telemetry',
      icon: Activity,
    },
    {
      name: 'Anomaly Intelligence',
      href: '/anomalies',
      icon: ShieldAlert,
    },
    {
      name: 'Risk Analytics',
      href: '/analytics',
      icon: LineChart,
    },
    {
      name: 'Executive Posture',
      href: '/executive',
      icon: ShieldCheck,
      restrictedRoles: ['Administrator', 'Security Manager'],
    },
    {
      name: 'Settings & Alerts',
      href: '/settings',
      icon: SettingsIcon,
    },
  ];



  return (
    <aside
      className={cn(
        'relative h-screen flex flex-col justify-between border-r border-violet-500/15 bg-[#0D0C15]/95 backdrop-blur-xl transition-all duration-300 z-30',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Top Header & Logo */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
          <Logo collapsed={collapsed} size={collapsed ? 'sm' : 'md'} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-violet-500/10 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems
            .filter((item) => !item.restrictedRoles || (user?.role && item.restrictedRoles.includes(user.role)))
            .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-violet-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.45)]'
                    : 'text-slate-400 hover:text-white hover:bg-violet-500/10'
                )}
                title={item.name}
              >
                <div
                  className={cn(
                    'flex items-center justify-center rounded-lg p-1 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-violet-300'
                  )}
                >
                  <Icon size={19} />
                </div>

                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 overflow-hidden">
                    <span className="truncate">{item.name}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-3 border-t border-white/5 bg-[#0B0A12]/60">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(139,92,246,0.3)]">
              {user?.full_name?.split(' ').map((n) => n[0]).join('') || 'AM'}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.full_name || 'AMS User'}
                </span>
                <span className="text-[10px] font-medium text-violet-400 truncate">
                  {user?.role || 'Guest'}
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
