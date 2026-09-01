import { MOCK_EMPLOYEES } from "../mock-data/employees";
import { MOCK_USERS } from "../mock-data/users";
import { MOCK_ACTIVITY_LOGS, MOCK_LOG_SOURCES } from "../mock-data/activity";
import { MOCK_BEHAVIORAL_BASELINES } from "../mock-data/behavioralBaselines";
import { MOCK_ANOMALIES, generateAnomalyTrend } from "../mock-data/anomalies";
import { MOCK_INVESTIGATIONS } from "../mock-data/investigations";
import { Employee, User, ActivityLog, LogSource, BehavioralBaseline, Anomaly, AnomalyStatus, FleetRiskData, RiskScore, RiskBand, Investigation, InvestigationStatus } from "../types";

// ── Configuration ─────────────────────────────────────────────────────

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8001";

// Helper for simulated network delay (300ms - 800ms)
const simulateLatency = () => {
  const delay = Math.floor(Math.random() * (800 - 300 + 1) + 300);
  return new Promise(resolve => setTimeout(resolve, delay));
};

// ── Feature Engineering ───────────────────────────────────────────────

/**
 * Aggregate activity logs for a single employee into the 5 features
 * required by the IsolationForest model.
 */
export function computeEmployeeFeatures(empId: string, lookbackDays: number = 30) {
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const logs = MOCK_ACTIVITY_LOGS.filter(
    log => log.employeeId === empId && new Date(log.timestamp) >= cutoff
  );

  let logonCount = 0;
  let afterHoursLogonCount = 0;
  let usbConnectCount = 0;
  let fileCopyCount = 0;
  let emailCount = 0;

  for (const log of logs) {
    switch (log.activityType) {
      case "Login": {
        logonCount++;
        const hour = new Date(log.timestamp).getHours();
        if (hour < 8 || hour >= 19) afterHoursLogonCount++;
        break;
      }
      case "File Download":
      case "File Upload":
      case "Data Transfer":
        fileCopyCount++;
        break;
      case "Email":
        emailCount++;
        break;
      case "Remote Access":
        // USB/device monitoring events — map Remote Access to USB
        usbConnectCount++;
        break;
      default:
        break;
    }
  }

  // Scale up slightly to give the model more signal (mock data has very few logs)
  // This is a deliberate decision to produce more meaningful feature variation
  const seed = empId.charCodeAt(empId.length - 1);
  const multiplier = 1 + (seed % 5);

  return {
    employee_id: empId,
    logon_count: (logonCount + seed % 10) * multiplier,
    after_hours_logon_count: (afterHoursLogonCount + seed % 3) * multiplier,
    usb_connect_count: (usbConnectCount + seed % 4) * multiplier,
    file_copy_count: (fileCopyCount + seed % 6) * multiplier,
    email_count: (emailCount + seed % 8) * multiplier,
  };
}

// ── ML Service Integration ────────────────────────────────────────────

/**
 * Gather features for all employees and POST to the ML service's
 * /score/batch endpoint. Returns graceful failure state if unreachable.
 */
export async function getFleetRiskScores(lookbackDays: number = 30): Promise<FleetRiskData> {
  const employees = MOCK_EMPLOYEES.map(emp =>
    computeEmployeeFeatures(emp.id, lookbackDays)
  );

  try {
    const response = await fetch(`${ML_SERVICE_URL}/score/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employees, lookback_days: lookbackDays }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`);
    }

    const data = await response.json();

    // Transform snake_case API response to camelCase
    const results: RiskScore[] = data.results.map((r: Record<string, unknown>) => ({
      employeeId: r.employee_id as string,
      decisionFunctionScore: r.decision_function_score as number,
      predictLabel: r.predict_label as number,
      riskBand: r.risk_band as RiskBand,
      riskScore: r.risk_score as number,
    }));

    const avgScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.riskScore, 0) / results.length
      : 0;

    return {
      lookbackDays: data.lookback_days,
      totalScored: data.total_scored,
      results,
      bandDistribution: data.band_distribution,
      fleetAvgScore: Math.round(avgScore * 10) / 10,
      serviceAvailable: true,
    };
  } catch {
    // Graceful degradation: ML service is unreachable
    return {
      lookbackDays,
      totalScored: 0,
      results: [],
      bandDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      fleetAvgScore: 0,
      serviceAvailable: false,
    };
  }
}

// ── Original Mock API Layer ───────────────────────────────────────────

export const api = {
  getEmployees: async (): Promise<Employee[]> => {
    await simulateLatency();
    return MOCK_EMPLOYEES;
  },

  getUsers: async (): Promise<User[]> => {
    await simulateLatency();
    return MOCK_USERS;
  },

  getActivityLogs: async (): Promise<ActivityLog[]> => {
    await simulateLatency();
    return MOCK_ACTIVITY_LOGS;
  },

  getLogSources: async (): Promise<LogSource[]> => {
    await simulateLatency();
    return MOCK_LOG_SOURCES;
  },

  testLogSourceConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
    await simulateLatency();
    const source = MOCK_LOG_SOURCES.find(s => s.id === id);
    if (source && source.status === "Error") {
      return { success: false, message: "Connection timed out. Check firewall settings." };
    }
    return { success: true, message: "Connection successful." };
  },

  getBehavioralBaseline: async (empId: string): Promise<BehavioralBaseline | null> => {
    await simulateLatency();
    return MOCK_BEHAVIORAL_BASELINES.find(b => b.employeeId === empId) || null;
  },

  getAnomalies: async (filters?: { status?: string, severity?: string }): Promise<Anomaly[]> => {
    await simulateLatency();
    let results = [...MOCK_ANOMALIES];
    if (filters?.status) results = results.filter(a => a.status === filters.status);
    if (filters?.severity) results = results.filter(a => a.severity === filters.severity);
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getAnomalyById: async (id: string): Promise<Anomaly | null> => {
    await simulateLatency();
    return MOCK_ANOMALIES.find(a => a.id === id) || null;
  },

  updateAnomalyStatus: async (id: string, status: AnomalyStatus): Promise<boolean> => {
    await simulateLatency();
    const anomaly = MOCK_ANOMALIES.find(a => a.id === id);
    if (anomaly) {
      anomaly.status = status;
      return true;
    }
    return false;
  },

  getDashboardSummary: async () => {
    await simulateLatency();
    return {
      totalMonitored: MOCK_EMPLOYEES.length,
      activeAnomalies: MOCK_ANOMALIES.filter(a => a.severity === "Critical" || a.severity === "High").length,
      usersFlagged: new Set(MOCK_ANOMALIES.map(a => a.employeeId)).size,
      avgAnomalyDensity: 39.3 // Mock percentage for gauge
    };
  },

  getAnomalyTrend: async (days: number = 7) => {
    await simulateLatency();
    return generateAnomalyTrend(days);
  },

  // ── Milestone 3: Investigations ───────────────────────────────────

  getInvestigations: async (): Promise<Investigation[]> => {
    await simulateLatency();
    return [...MOCK_INVESTIGATIONS].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  createInvestigation: async (investigation: Omit<Investigation, "id" | "createdAt" | "updatedAt" | "notes">): Promise<Investigation> => {
    await simulateLatency();
    const newInvestigation: Investigation = {
      ...investigation,
      id: `INV-${String(MOCK_INVESTIGATIONS.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
    };
    MOCK_INVESTIGATIONS.push(newInvestigation);
    return newInvestigation;
  },

  updateInvestigationStatus: async (id: string, status: InvestigationStatus): Promise<boolean> => {
    await simulateLatency();
    const inv = MOCK_INVESTIGATIONS.find(i => i.id === id);
    if (inv) {
      inv.status = status;
      inv.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  },

  addInvestigationNote: async (id: string, author: string, content: string): Promise<boolean> => {
    await simulateLatency();
    const inv = MOCK_INVESTIGATIONS.find(i => i.id === id);
    if (inv) {
      inv.notes.push({
        id: `NOTE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        author,
        content,
      });
      inv.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  },
};
