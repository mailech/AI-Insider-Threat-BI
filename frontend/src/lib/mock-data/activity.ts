import { ActivityLog, LogSource } from "@/lib/types";

export const MOCK_LOG_SOURCES: LogSource[] = [
  { id: "SRC-001", name: "Active Directory", type: "Identity", status: "Connected", lastSync: new Date().toISOString() },
  { id: "SRC-002", name: "Windows Event Logs", type: "Endpoint", status: "Error", lastSync: new Date(Date.now() - 3600000).toISOString() },
  { id: "SRC-003", name: "Linux Audit", type: "Server", status: "Not Configured", lastSync: null },
  { id: "SRC-004", name: "Corporate VPN", type: "Network", status: "Connected", lastSync: new Date().toISOString() },
];

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: "LOG-0001",
    timestamp: new Date().toISOString(),
    employeeId: "EMP-001",
    activityType: "Login",
    source: "Active Directory",
    device: "DESKTOP-X1",
    ip: "192.168.1.45"
  },
  {
    id: "LOG-0002",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    employeeId: "EMP-045",
    activityType: "File Download",
    source: "SharePoint",
    device: "MAC-DEV-02",
    ip: "10.0.0.12"
  },
  {
    id: "LOG-0003",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    employeeId: "EMP-001",
    activityType: "Privilege Change",
    source: "Active Directory",
    device: "DESKTOP-X1",
    ip: "192.168.1.45"
  },
  {
    id: "LOG-0004",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    employeeId: "EMP-012",
    activityType: "Remote Access",
    source: "Corporate VPN",
    device: "LAPTOP-REMOTE",
    ip: "203.0.113.42"
  }
];
