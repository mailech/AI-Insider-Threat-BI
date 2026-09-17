import type { Metadata } from 'next';
import DashboardShell from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: {
    template: '%s | CYBER AI',
    default:  'CYBER AI — Insider Threat Behavioral Intelligence System',
  },
  description:
    'CYBER AI — AI-powered Insider Threat Behavioral Intelligence System — real-time security monitoring and risk analytics.',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardShell>{children}</DashboardShell>;
}
