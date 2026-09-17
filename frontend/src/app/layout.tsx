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
    template: '%s | CYBER AI',
    default:  'CYBER AI — Insider Threat Behavioral Intelligence System',
  },
  description:
    'CYBER AI — AI-powered Insider Threat Behavioral Intelligence System — real-time security monitoring and risk analytics.',
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
