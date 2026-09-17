'use client';

import TopBar from '@/components/layout/TopBar';

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="w-full min-h-screen bg-[#040D0A] text-[#ECFDF5] flex flex-col items-center">
      {/* Top-Centered Functional Horizontal Navbar */}
      <TopBar />

      {/* Main Full-Width Content Container with top floating navbar offset */}
      <main
        className="w-full max-w-7xl pt-24 pb-8 px-4 sm:px-6 lg:px-8 overflow-y-auto flex-1 flex flex-col min-h-screen"
        role="main"
      >
        <div className="w-full flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
