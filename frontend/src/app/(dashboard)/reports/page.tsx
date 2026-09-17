import type { Metadata } from 'next';
import { ReportsPageClient } from '@/components/reports/ReportsPageClient';

export const metadata: Metadata = {
  title: 'Executive Reports & Export | ITBIS',
  description: 'Generate PDF and Excel incident and anomaly reports for security-manager review.',
};

export default function ReportsPage() {
  return <ReportsPageClient />;
}
