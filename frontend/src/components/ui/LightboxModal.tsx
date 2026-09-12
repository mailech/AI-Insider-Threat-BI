'use client';

import React, { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'violet' | 'rose' | 'amber' | 'emerald';
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  badgeColor = 'violet',
  children,
  maxWidth = '3xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth] || 'max-w-3xl';

  const badgeStyles = {
    violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  }[badgeColor];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthClass} bg-[#110e1e] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-5 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400">
                <ZoomIn size={16} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {title}
              </h3>
              {badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeStyles}`}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 pl-8">
                {subtitle}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Enlarged Visual Content */}
        <div className="max-h-[80vh] overflow-y-auto pr-1">
          {children}
        </div>

        {/* Footer info note */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-white/5">
          <span>High-Resolution Behavioral Visualizer</span>
          <span>Press ESC or click anywhere outside to close</span>
        </div>
      </div>
    </div>
  );
};
