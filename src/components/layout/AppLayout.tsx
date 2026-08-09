import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className={cn(
          'flex flex-col transition-[padding] duration-300 ease-in-out',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        )}
      >
        <Topbar
          onToggleSidebar={() => setCollapsed((c) => !c)}
          collapsed={collapsed}
        />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
