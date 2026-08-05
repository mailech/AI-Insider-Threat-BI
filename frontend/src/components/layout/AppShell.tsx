"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { Skeleton } from "../ui/Skeleton";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Public routes that don't need auth
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-carbon flex flex-col">
        <header className="h-16 border-b border-graphite bg-void-black flex items-center px-6">
          <Skeleton className="h-6 w-32" />
        </header>
        <div className="flex flex-1">
          <div className="w-64 border-r border-graphite p-4 hidden md:flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <main className="flex-1 p-8">
            <Skeleton className="h-64 w-full max-w-4xl" />
          </main>
        </div>
      </div>
    );
  }

  // If on a public route, just render children (e.g. login form takes full screen)
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // If not authenticated and not public, we shouldn't render the shell content 
  // (the useEffect will redirect, but we avoid flash of content)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-carbon flex flex-col overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
