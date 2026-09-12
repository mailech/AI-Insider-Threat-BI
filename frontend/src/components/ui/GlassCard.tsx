import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'elevated' | 'glow';
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  className,
  ...props
}) => {
  const variantStyles = {
    default: 'glass-panel rounded-2xl',
    subtle: 'glass-panel-subtle rounded-xl',
    elevated: 'glass-panel-elevated rounded-2xl',
    glow: 'glass-panel rounded-2xl border-violet-500/30 shadow-[0_0_25px_rgba(139,92,246,0.18)]',
  };

  return (
    <div
      className={cn(
        'transition-all duration-200',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
