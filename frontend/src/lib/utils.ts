import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RiskTier, SeverityLevel } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskTierColor(tier: RiskTier | string) {
  switch (tier?.toLowerCase()) {
    case 'critical':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
        bar: 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]',
        glow: 'rgba(239, 68, 68, 0.6)',
        hex: '#EF4444'
      };
    case 'high':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
        bar: 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
        glow: 'rgba(245, 158, 11, 0.6)',
        hex: '#F59E0B'
      };
    case 'medium':
      return {
        bg: 'bg-sky-500/10',
        text: 'text-sky-400',
        border: 'border-sky-500/30',
        badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]',
        bar: 'bg-gradient-to-r from-sky-600 to-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.4)]',
        glow: 'rgba(56, 189, 248, 0.6)',
        hex: '#38BDF8'
      };
    case 'low':
    default:
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
        bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]',
        glow: 'rgba(16, 185, 129, 0.6)',
        hex: '#10B981'
      };
  }
}

export function getSeverityColor(sev: SeverityLevel | string) {
  switch (sev?.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
    case 'HIGH':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'MEDIUM':
      return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
    case 'LOW':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'INFO':
    default:
      return 'bg-slate-500/15 text-slate-300 border border-slate-500/30';
  }
}

export function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export const formatTimestamp = formatDateTime;

