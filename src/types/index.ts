export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'false_positive';

export type IncidentStatus = 'open' | 'contained' | 'closed';

export interface KpiStat {
  id: string;
  label: string;
  value: number;
  delta: number;
  trend: 'up' | 'down';
  trendIsGood: boolean;
  description: string;
}

export interface RiskTrendPoint {
  date: string;
  riskScore: number;
  baseline: number;
  threshold: number;
}

export interface DepartmentActivityPoint {
  department: string;
  logins: number;
  dataTransfers: number;
  offHours: number;
}

export interface SecurityAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: AlertStatus;
  employee: string;
  department: string;
  detectedAt: string;
  category: string;
}

export interface RiskEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  riskScore: number;
  riskLevel: RiskLevel;
  trend: 'up' | 'down' | 'flat';
  lastFlagged: string;
  openAlerts: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: string;
  read: boolean;
}

export interface NavItem {
  label: string;
  to: string;
  icon: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  initials: string;
}
