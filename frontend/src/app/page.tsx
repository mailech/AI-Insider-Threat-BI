"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Activity } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking auth
  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center">
      <div className="flex items-center gap-3 text-ash">
        <Activity className="w-6 h-6 animate-spin text-signal-lime" />
        <span className="font-sans">Loading INSIDER/IQ...</span>
      </div>
    </div>
  );
}
