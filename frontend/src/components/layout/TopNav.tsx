"use client";

import React from "react";
import { Search, Bell, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Pill } from "../ui/Pill";
import Link from "next/link";

export function TopNav() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between bg-void-black border-b border-graphite px-6">
      {/* Left: Wordmark */}
      <div className="flex items-center">
        <Link href="/" className="font-serif text-[22px] tracking-tight text-chalk">
          INSIDER<span className="text-signal-lime italic">/IQ</span>
        </Link>
      </div>

      {/* Middle: Global Search (mocked) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-fog" />
          </div>
          <input
            type="text"
            placeholder="Search employees, IPs, or logs..."
            className="w-full bg-onyx text-bone text-[13px] font-sans rounded-sm pl-10 pr-4 py-2 border border-slate focus:border-signal-lime focus:glow-lime outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: User Menu & Actions */}
      <div className="flex items-center gap-4">
        <button className="relative text-fog hover:text-bone transition-colors outline-none focus:glow-lime p-1 rounded-sm hidden md:block">
          <Bell className="w-5 h-5" />
          {/* Unread dot in lime */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-signal-lime rounded-full border border-void-black" />
        </button>

        <div className="h-6 w-px bg-graphite hidden md:block mx-2" />

        {user && (
          <div className="relative group inline-block">
            <button className="flex items-center gap-3 outline-none focus:glow-lime rounded-sm py-1">
              {/* Avatar initials tile in lime */}
              <div className="flex items-center justify-center w-8 h-8 bg-signal-lime text-void-black font-medium text-[13px] rounded-sm">
                {user.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
              </div>
              
              <div className="hidden md:flex flex-col items-start">
                <span className="text-[13px] font-sans font-medium text-bone leading-none mb-1">
                  {user.name}
                </span>
                <Pill variant="neutral" className="!py-0 !px-1.5 !text-[9px]">
                  {user.role}
                </Pill>
              </div>
            </button>
            
            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-onyx border border-graphite hidden group-hover:block z-50 shadow-lg">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-graphite md:hidden">
                  <p className="text-[13px] font-medium text-bone">{user.name}</p>
                  <p className="text-[11px] text-ash">{user.role}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-[13px] text-bone hover:bg-graphite transition-colors flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-fog" />
                  Profile
                </button>
                <Link href="/settings" className="w-full text-left px-4 py-2 text-[13px] text-bone hover:bg-graphite transition-colors flex items-center gap-2">
                  <Settings className="w-4 h-4 text-fog" />
                  Settings
                </Link>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-[13px] text-bone font-medium hover:bg-graphite transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
