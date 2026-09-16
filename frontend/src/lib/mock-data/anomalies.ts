import { Anomaly } from "../types";

export const MOCK_ANOMALIES: Anomaly[] = [
  {
    id: "ANM-9001",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    employeeId: "EMP-001",
    category: "Insider Risk Indicators", // Wait, category should be from AnomalyCategory type
    type: "Privilege abuse", // Correct type
    severity: "Critical",
    description: "Self-escalated privileges outside of approved change window.",
    status: "New",
    baselineDeviation: "User typically does not alter IAM policies directly.",
    relatedActivityIds: ["LOG-0003"]
  },
  {
    id: "ANM-9002",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    employeeId: "EMP-001",
    category: "Excessive File Transfers", // Category
    type: "Data exfiltration", // Type
    severity: "High",
    description: "Massive data transfer to unencrypted USB Mass Storage device.",
    status: "Under Review",
    baselineDeviation: "3.2x normal data transfer volume",
    relatedActivityIds: ["LOG-0006"]
  },
  {
    id: "ANM-9003",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    employeeId: "EMP-045",
    category: "Insider Risk Indicators",
    type: "Privilege abuse",
    severity: "Medium",
    description: "Bulk download of sensitive SharePoint directories and upload to external Google Drive.",
    status: "Confirmed",
    baselineDeviation: "Application set deviation: external drive usage not in baseline.",
    relatedActivityIds: ["LOG-0002", "LOG-0005"]
  },
  {
    id: "ANM-9004",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    employeeId: "EMP-012",
    category: "Unusual Login Time",
    type: "Behavioral anomaly",
    severity: "Low",
    description: "Remote access login via VPN at 3:00 AM.",
    status: "Dismissed",
    baselineDeviation: "Outside typical login window of 07:30 - 08:30.",
    relatedActivityIds: ["LOG-0004"] // Correlated with the Remote Access log
  }
];

// Helper to get historical trend data
export const generateAnomalyTrend = (days: number) => {
  const trend = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    trend.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      anomalies: Math.floor(Math.random() * 8) + 1 // random 1-8 per day
    });
  }
  return trend;
};
