import type { Metadata } from 'next';
import { ReportsPageClient } from '@/components/reports/ReportsPageClient';

export const metadata: Metadata = {
  title: 'Executive Reports & Export | ITBIS',
  description: 'Generate CSV and PDF threat summaries for security-manager reporting.',
};

export default function ReportsPage() {
  return <ReportsPageClient />;
}
