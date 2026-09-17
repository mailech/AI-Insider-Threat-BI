import type { Metadata } from 'next';
import { IncidentsPageClient } from '@/components/incidents/IncidentsPageClient';

export const metadata: Metadata = {
  title: 'Security Incidents & Alerts | ITBIS',
  description:
    'Real-time insider threat alerts, ML anomaly trigger management, and SOC analyst UEBA investigation workflows.',
};

export default function IncidentsPage() {
  return <IncidentsPageClient />;
}
