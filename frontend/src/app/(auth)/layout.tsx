import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | ITBIS',
  description: 'Sign in to the ITBIS Insider Threat Behavioral Intelligence System.',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight:       '100vh',
        backgroundColor: 'var(--color-bg-base)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '24px',
        // Subtle grid pattern
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(42,51,82,0.6) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }}
    >
      {children}
    </div>
  );
}
