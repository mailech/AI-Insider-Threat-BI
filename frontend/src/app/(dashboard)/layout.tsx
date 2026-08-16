import type { Metadata } from 'next';
import DashboardShell from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: {
    template: '%s | ITBIS',
    default:  'ITBIS — Insider Threat Behavioral Intelligence System',
  },
  description:
    'AI-powered Insider Threat Behavioral Intelligence System — real-time security monitoring and risk analytics.',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardShell>{children}</DashboardShell>;
}
