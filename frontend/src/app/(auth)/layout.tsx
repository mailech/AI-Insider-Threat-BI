import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | CYBER AI',
  description: 'Sign in to CYBER AI Insider Threat Behavioral Intelligence System.',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--color-bg-base)',
        backgroundImage:
          'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.15) 0%, rgba(11, 26, 20, 0.8) 50%, #040d0a 100%), radial-gradient(circle at 100% 100%, rgba(5, 150, 105, 0.08) 0%, transparent 40%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft background ambient radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        {children}
      </div>
    </div>
  );
}
