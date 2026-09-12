'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/overview');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#09090E] flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 size={36} className="animate-spin text-violet-500" />
      <span className="text-sm font-medium tracking-wide">Initializing AMS Behavioral Intelligence...</span>
    </div>
  );
}
