import { MOCK_EMPLOYEES } from "../mock-data/employees";
import { MOCK_USERS } from "../mock-data/users";
import { MOCK_ACTIVITY_LOGS, MOCK_LOG_SOURCES } from "../mock-data/activity";
import { Employee, User, ActivityLog, LogSource } from "../types";

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
    // Simulate some logic: if it's the "Error" status source, it fails.
    const source = MOCK_LOG_SOURCES.find(s => s.id === id);
    if (source && source.status === "Error") {
      return { success: false, message: "Connection timed out. Check firewall settings." };
    }
    return { success: true, message: "Connection successful." };
  }
};
