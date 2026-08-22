import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-sans',
  display:  'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | ITBIS',
    default:  'ITBIS — Insider Threat Behavioral Intelligence System',
  },
  description:
    'AI-powered Insider Threat Behavioral Intelligence System — real-time security monitoring, risk analytics, and behavioral intelligence.',
  metadataBase: new URL('http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
