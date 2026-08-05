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
  status: "Connected" | "Not Configured" | "Error";
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
