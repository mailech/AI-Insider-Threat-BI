export type Role = "Administrator" | "Security Manager" | "Security Analyst" | "SOC Engineer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "Active" | "Invited" | "Disabled";
  lastLogin: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  employeeId: string;
  activityType: "Login" | "File Download" | "File Upload" | "Data Transfer" | "Email" | "Privilege Change" | "Remote Access";
  source: string;
  device: string;
  ip: string;
}

export interface LogSource {
  id: string;
  name: string;
  type: string;
  status: "Connected" | "Not Configured" | "Error" | "Warning";
  lastSync: string | null;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  designation: string;
  manager: string;
  devicesCount: number;
  accessLevel: string;
}

export type AnomalySeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type AnomalyStatus = "New" | "Under Review" | "Dismissed" | "Confirmed";
export type AnomalyCategory = "Unusual Login Time" | "Abnormal Data Download" | "Unauthorized Access Attempts" | "Excessive File Transfers" | "Suspicious Device Usage" | "Insider Risk Indicators";
export type AnomalyType = "Behavioral anomaly" | "Access anomaly" | "Data exfiltration" | "Privilege abuse";

export interface Anomaly {
  id: string;
  timestamp: string;
  employeeId: string;
  category: AnomalyCategory;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  status: AnomalyStatus;
  baselineDeviation: string;
  relatedActivityIds: string[]; // Ties to ActivityLog.id
}

export interface BehavioralBaseline {
  employeeId: string;
  typicalLoginWindow: string; // e.g., "08:00 - 09:30"
  typicalWorkingHours: string; // e.g., "08:30 - 17:30"
  typicalDailyDataVolume: string; // e.g., "450 MB"
  typicalDeviceCount: number;
  typicalApplicationSet: string[];
  workPattern: { day: string; hours: number }[]; // For bar chart
}
