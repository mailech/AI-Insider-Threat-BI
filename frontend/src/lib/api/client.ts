import { MOCK_EMPLOYEES } from "../mock-data/employees";
import { MOCK_USERS } from "../mock-data/users";
import { MOCK_ACTIVITY_LOGS, MOCK_LOG_SOURCES } from "../mock-data/activity";
import { MOCK_BEHAVIORAL_BASELINES } from "../mock-data/behavioralBaselines";
import { MOCK_ANOMALIES, generateAnomalyTrend } from "../mock-data/anomalies";
import { Employee, User, ActivityLog, LogSource, BehavioralBaseline, Anomaly, AnomalyStatus } from "../types";

// Helper for simulated network delay (300ms - 800ms)
const simulateLatency = () => {
  const delay = Math.floor(Math.random() * (800 - 300 + 1) + 300);
  return new Promise(resolve => setTimeout(resolve, delay));
};

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
  }
};
