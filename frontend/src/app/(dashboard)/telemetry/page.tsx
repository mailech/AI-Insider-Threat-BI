'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InsiderRiskScoringPage from '../scoring/page';

export default function TelemetryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/scoring');
  }, [router]);

  return <InsiderRiskScoringPage />;
}
