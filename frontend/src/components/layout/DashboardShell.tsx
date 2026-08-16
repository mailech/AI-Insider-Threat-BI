'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Initialize from localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem('itbis_sidebar_collapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('itbis_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const toggleMobile = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col md:flex-row text-[var(--color-text-primary)]">
      {/* Sidebar (Desktop Collapsible & Mobile Slide-Over Drawer) */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onToggleCollapse={toggleCollapse}
        onCloseMobile={closeMobile}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-16' : 'md:ml-64'
        } ml-0`}
      >
        {/* TopBar with dynamic positioning and mobile hamburger trigger */}
        <TopBar
          isCollapsed={isCollapsed}
          onToggleMobile={toggleMobile}
        />

        {/* Page Content */}
        <main
          className="flex-1 mt-14 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-[calc(100vh-3.5rem)]"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
