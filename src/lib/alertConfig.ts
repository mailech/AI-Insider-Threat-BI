import type { AlertSeverity, AlertStatus, RiskLevel } from '@/types';

export const severityConfig: Record<
  AlertSeverity,
  { label: string; className: string; dot: string }
> = {
  info: {
    label: 'Info',
    className:
      'border-transparent bg-primary/10 text-primary',
    dot: 'bg-primary',
  },
  low: {
    label: 'Low',
    className:
      'border-transparent bg-success/10 text-success',
    dot: 'bg-success',
  },
  medium: {
    label: 'Medium',
    className:
      'border-transparent bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
  high: {
    label: 'High',
    className:
      'border-transparent bg-orange-500/10 text-orange-400',
    dot: 'bg-orange-500',
  },
  critical: {
    label: 'Critical',
    className:
      'border-transparent bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
};

export const statusConfig: Record<
  AlertStatus,
  { label: string; className: string }
> = {
  open: {
    label: 'Open',
    className: 'border-border text-muted-foreground',
  },
  investigating: {
    label: 'Investigating',
    className: 'border-transparent bg-primary/10 text-primary',
  },
  resolved: {
    label: 'Resolved',
    className: 'border-transparent bg-success/10 text-success',
  },
  false_positive: {
    label: 'False Positive',
    className: 'border-border text-muted-foreground',
  },
};

export const riskLevelConfig: Record<
  RiskLevel,
  { label: string; className: string; bar: string }
> = {
  low: {
    label: 'Low',
    className: 'border-transparent bg-success/10 text-success',
    bar: 'bg-success',
  },
  moderate: {
    label: 'Moderate',
    className: 'border-transparent bg-primary/10 text-primary',
    bar: 'bg-primary',
  },
  elevated: {
    label: 'Elevated',
    className: 'border-transparent bg-warning/10 text-warning',
    bar: 'bg-warning',
  },
  high: {
    label: 'High',
    className: 'border-transparent bg-orange-500/10 text-orange-400',
    bar: 'bg-orange-500',
  },
  critical: {
    label: 'Critical',
    className: 'border-transparent bg-destructive/10 text-destructive',
    bar: 'bg-destructive',
  },
};
