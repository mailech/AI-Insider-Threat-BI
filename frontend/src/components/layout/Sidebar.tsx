"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Shield, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Target,
  ShieldAlert,
  Search
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Role } from "@/lib/types";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[]; // If undefined, available to all
  tag?: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Activity Monitoring", href: "/activity", icon: Activity },
  { 
    name: "Behavioral Profiling", 
    href: "/behavioral-indicators", 
    icon: LineChart 
  },
  {
    name: "Anomalies",
    href: "/anomalies",
    icon: ShieldAlert
  },
  { 
    name: "Investigations", 
    href: "/investigations", 
    icon: Search
  },
  { 
    name: "Users & Roles", 
    href: "/users", 
    icon: Shield, 
    roles: ["Administrator"] 
  },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <aside
      className={`bg-carbon border-r border-graphite transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-16" : "w-64"
      } hidden md:flex min-h-[calc(100vh-64px)]`}
    >
      <div className="flex items-center justify-end p-2 border-b border-graphite">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-fog hover:text-bone hover:bg-onyx rounded-sm transition-colors outline-none focus:glow-lime"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          // Check RBAC
          if (item.roles && user && !item.roles.includes(user.role)) {
            return null;
          }

          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.disabled ? "#" : item.href}
              className={`
                relative flex items-center px-4 py-3 mx-2 text-[13px] font-sans transition-colors outline-none
                ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${
                  isActive
                    ? "text-signal-lime bg-onyx"
                    : "text-ash hover:text-bone hover:bg-onyx"
                }
              `}
              aria-disabled={item.disabled}
              title={isCollapsed ? item.name : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-signal-lime rounded-r-sm" />
              )}
              
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? "text-signal-lime" : "text-fog group-hover:text-bone"
                } ${isCollapsed ? "mx-auto" : "mr-3"}`}
                strokeWidth={isActive ? 2 : 1.5}
              />
              
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate font-medium">{item.name}</span>
                  {item.tag && (
                    <span className="ml-2 flex-shrink-0 inline-block px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-carbon bg-fog rounded-sm font-semibold">
                      {item.tag}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
