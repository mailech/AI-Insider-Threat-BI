export type SeverityLevel = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskClassification = 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRITICAL_RISK';
export type ContainmentActionType = 'ISOLATE' | 'REVOKE_TOKENS' | 'STEP_UP_MFA' | 'LOCK_AD' | 'MONITOR_DEEP';
export type IncidentStatus = 'DETECTED' | 'TRIAGED' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
export type AlertStatus = 'NEW' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED';
export type UserRole = 'SOC_ANALYST' | 'ADMIN' | 'THREAT_HUNTER' | 'COMPLIANCE_OFFICER';

export interface Employee {
  id: string; // e.g. EMP-1042
  name: string; // e.g. Authar Morgan
  department: string;
  designation: string;
  manager: string;
  avatar: string;
  device: string;
  ipAddress: string;
  location: string;
  riskScore: number; // 0 - 100
  riskClassification: SeverityLevel;
  behaviorDeviation: number; // e.g. +34%
  riskTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  trendDelta: number;
  lastActivity: string;
  accessPrivileges: string[];
  baseline: {
    loginHours: string;
    avgDailyDataEgressMb: number;
    avgAppCount: number;
    peerRiskAvg: number;
  };
  currentMetrics: {
    todayDataEgressMb: number;
    activeAppsCount: number;
    failedAuthAttempts: number;
    usbDevicesConnected: number;
  };
  shapFactors: {
    factor: string;
    contribution: number;
    description: string;
  }[];
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  rawTime: string;
  type: 'FILE_TRANSFER' | 'PRIVILEGE_CHANGE' | 'UNUSUAL_LOGIN' | 'USB_ACTIVITY' | 'DATABASE_QUERY' | 'API_KEY_ACCESS' | 'MASS_DOWNLOAD' | 'EMAIL_EXFILTRATION';
  employeeId: string;
  employeeName: string;
  department: string;
  device: string;
  ipAddress: string;
  details: string;
  risk: SeverityLevel;
  volumeMb?: number;
  destination?: string;
  anomalyConfidence?: number;
}

export interface ThreatNode {
  id: string;
  label: string;
  type: 'EMPLOYEE' | 'DEVICE' | 'DATABASE' | 'CLOUD_BUCKET' | 'EXTERNAL_USB' | 'API_GATEWAY' | 'IP_ADDRESS' | 'FILE';
  riskScore: number;
  threatLevel: SeverityLevel;
  lastActivity: string;
  behaviorDeviation: number;
  department?: string;
  device?: string;
  anomalyDetails?: string;
}

export interface ThreatLink {
  source: string;
  target: string;
  relationship: string;
  risk: SeverityLevel;
  volumeMb?: number;
  isSuspicious: boolean;
}

export interface Anomaly {
  id: string;
  title: string;
  category: 'UNUSUAL_LOGIN_TIME' | 'ABNORMAL_DATA_DOWNLOAD' | 'UNAUTHORIZED_ACCESS' | 'EXCESSIVE_FILE_TRANSFER' | 'SUSPICIOUS_DEVICE_USAGE' | 'PRIVILEGE_ABUSE';
  severity: SeverityLevel;
  confidence: number;
  detectedAt: string;
  employeeId: string;
  employeeName: string;
  department: string;
  device: string;
  evidence: string[];
  aiExplanation: string;
  baselineValue: string;
  observedValue: string;
}

export interface Incident {
  id: string; // e.g. INC-2026-0891
  title: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  primaryEmployeeId: string;
  primaryEmployeeName: string;
  affectedDevices: string[];
  riskScore: number;
  assignedAnalyst: string;
  createdAt: string;
  lastUpdated: string;
  description: string;
  evidenceCount: number;
  timelineEvents: {
    time: string;
    type: string;
    description: string;
    evidenceId: string;
    severity: SeverityLevel;
  }[];
  mitigationSteps: {
    id: string;
    step: string;
    completed: boolean;
  }[];
  aiHypothesis: string;
}

export interface Alert {
  id: string;
  title: string;
  employeeId: string;
  employeeName: string;
  department: string;
  event: string;
  severity: SeverityLevel;
  confidence: number;
  timestamp: string;
  status: AlertStatus;
  assignedAnalyst: string;
  threatCategory: string;
}

export interface ThreatActor {
  id: string;
  name: string;
  origin: string;
  targetSectors: string[];
  activeCampaigns: string;
  riskLevel: SeverityLevel;
  cves: string[];
}

export interface IOCItem {
  id: string;
  indicator: string;
  type: 'IP' | 'HASH_SHA256' | 'DOMAIN' | 'URL' | 'FILE_PATH';
  threatName: string;
  confidence: number;
  severity: SeverityLevel;
  firstSeen: string;
}

export interface ThreatFeedItem {
  id: string;
  title: string;
  severity: SeverityLevel;
  source: string;
  time: string;
  description: string;
  cve?: string;
}

export interface MitreTactic {
  id: string;
  tactic: string;
  technique: string;
  subTechnique?: string;
  detectionsCount: number;
  severity: SeverityLevel;
  coveragePercentage: number;
}

export interface GlobalThreatPoint {
  id: string;
  originName: string;
  targetName: string;
  originCoords: [number, number]; // x%, y% on map
  targetCoords: [number, number];
  threatType: string;
  severity: SeverityLevel;
  count: number;
}
