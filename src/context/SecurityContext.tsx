import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Employee, 
  TelemetryEvent, 
  ThreatNode, 
  ThreatLink, 
  Anomaly, 
  Incident, 
  Alert, 
  ContainmentActionType, 
  UserRole,
  IncidentStatus,
  AlertStatus,
  ThreatActor,
  IOCItem,
  ThreatFeedItem,
  MitreTactic,
  GlobalThreatPoint
} from '../types';
import { 
  mockEmployees, 
  mockTelemetryEvents, 
  mockThreatNodes, 
  mockThreatLinks, 
  mockAnomalies, 
  mockIncidents, 
  mockAlerts,
  mockThreatActors,
  mockIOCs,
  mockThreatFeed,
  mockMitreTactics,
  mockGlobalThreatPoints
} from '../data/mockData';

export type NavSection = 
  | 'command-center'
  | 'behavior'
  | 'risk-intelligence'
  | 'threat-detection'
  | 'investigation'
  | 'ueba'
  | 'threat-intel'
  | 'analytics'
  | 'reports'
  | 'admin'
  | 'telemetry'
  | 'employees'
  | 'incidents'
  | 'alerts'
  | 'devices'
  | 'mitre'
  | 'data-sources'
  | 'compliance'
  | 'policies'
  | 'ai-models'
  | 'security-metrics'
  | 'ai-risk-engine'
  | 'threat-map'
  | 'anomalies'
  | 'risk-analytics';

interface SecurityContextType {
  theme: 'dark';
  setTheme: (theme: 'dark') => void;
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  
  // Adjustable Sidebar State
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Data entities
  employees: Employee[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  selectedEmployee: Employee;
  
  telemetryEvents: TelemetryEvent[];
  isTelemetryLive: boolean;
  setIsTelemetryLive: (live: boolean) => void;
  clearTelemetry: () => void;
  
  threatNodes: ThreatNode[];
  threatLinks: ThreatLink[];
  anomalies: Anomaly[];
  incidents: Incident[];
  selectedIncidentId: string;
  setSelectedIncidentId: (id: string) => void;
  selectedIncident: Incident;
  
  alerts: Alert[];
  threatActors: ThreatActor[];
  iocs: IOCItem[];
  threatFeed: ThreatFeedItem[];
  mitreTactics: MitreTactic[];
  globalThreatPoints: GlobalThreatPoint[];
  
  // Actions & containment modal
  isContainmentModalOpen: boolean;
  containmentTargetId: string | null;
  containmentActionType: ContainmentActionType | null;
  containmentAction: { employeeId: string; actionType: ContainmentActionType } | null;
  openContainmentModal: (targetId: string, type: ContainmentActionType) => void;
  closeContainmentModal: () => void;
  executeContainment: (notesOrEmpId?: string, actionType?: ContainmentActionType) => void;
  
  // Incident & Alert handlers
  updateIncidentStatus: (incidentId: string, status: IncidentStatus) => void;
  toggleMitigationStep: (incidentId: string, stepId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  escalateAlertToIncident: (alertId: string) => void;
  assignAlert: (alertId: string, analyst: string) => void;
  resolveAlert: (alertId: string) => void;
  
  // Attack simulation
  runAttackScenario: (type: 'EXFILTRATION' | 'PRIVILEGE_ESCALATION') => void;
  isAttackScenarioRunning: boolean;

  // Global command palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme] = useState<'dark'>('dark');
  const [activeNav, setActiveNav] = useState<NavSection>('command-center');
  const [currentRole, setCurrentRole] = useState<UserRole>('SOC_ANALYST');
  
  // Adjustable Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(240);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('EMP-1042'); // Authar Morgan default
  
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>(mockTelemetryEvents);
  const [isTelemetryLive, setIsTelemetryLive] = useState<boolean>(true);
  
  const [threatNodes, setThreatNodes] = useState<ThreatNode[]>(mockThreatNodes);
  const [threatLinks, setThreatLinks] = useState<ThreatLink[]>(mockThreatLinks);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(mockAnomalies);
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-2026-0891');
  
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [threatActors] = useState<ThreatActor[]>(mockThreatActors);
  const [iocs] = useState<IOCItem[]>(mockIOCs);
  const [threatFeed, setThreatFeed] = useState<ThreatFeedItem[]>(mockThreatFeed);
  const [mitreTactics] = useState<MitreTactic[]>(mockMitreTactics);
  const [globalThreatPoints] = useState<GlobalThreatPoint[]>(mockGlobalThreatPoints);
  
  const [isContainmentModalOpen, setIsContainmentModalOpen] = useState<boolean>(false);
  const [containmentTargetId, setContainmentTargetId] = useState<string | null>(null);
  const [containmentActionType, setContainmentActionType] = useState<ContainmentActionType | null>(null);
  
  const [isAttackScenarioRunning, setIsAttackScenarioRunning] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

  // Sync collapsed state with width
  useEffect(() => {
    if (isSidebarCollapsed) {
      setSidebarWidth(60);
    } else if (sidebarWidth === 60) {
      setSidebarWidth(240);
    }
  }, [isSidebarCollapsed]);

  // Periodic Telemetry Simulator (runs when isTelemetryLive is true)
  useEffect(() => {
    if (!isTelemetryLive) return;

    const interval = setInterval(() => {
      const randomTypes: TelemetryEvent['type'][] = [
        'FILE_TRANSFER', 
        'PRIVILEGE_CHANGE', 
        'UNUSUAL_LOGIN', 
        'USB_ACTIVITY', 
        'DATABASE_QUERY',
        'EMAIL_EXFILTRATION'
      ];
      const randomType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
      const randomEmp = employees[Math.floor(Math.random() * employees.length)];
      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];

      let details = 'Routine security transaction analyzed against peer baseline';
      let risk: TelemetryEvent['risk'] = 'LOW';
      let volume = undefined;

      if (randomType === 'FILE_TRANSFER') {
        details = `Encrypted payload egress to S3 cloud storage (${(Math.random() * 8 + 1).toFixed(1)} GB)`;
        risk = Math.random() > 0.6 ? 'HIGH' : 'MEDIUM';
        volume = Math.floor(Math.random() * 8000 + 500);
      } else if (randomType === 'PRIVILEGE_CHANGE') {
        details = 'Elevation to local Administrator requested via sudo ticket';
        risk = Math.random() > 0.7 ? 'CRITICAL' : 'MEDIUM';
      } else if (randomType === 'UNUSUAL_LOGIN') {
        details = 'Authentication request from unrecognized ASN / IP address block';
        risk = 'MEDIUM';
      } else if (randomType === 'USB_ACTIVITY') {
        details = 'Removable storage block device attached to endpoint';
        risk = 'HIGH';
      } else if (randomType === 'EMAIL_EXFILTRATION') {
        details = 'Outbound attachment to personal email containing encrypted archive';
        risk = 'HIGH';
        volume = 120;
      }

      const newEvent: TelemetryEvent = {
        id: `EVT-${Math.floor(10000 + Math.random() * 90000)}`,
        timestamp: timeString,
        rawTime: now.toISOString(),
        type: randomType,
        employeeId: randomEmp.id,
        employeeName: randomEmp.name,
        department: randomEmp.department,
        device: randomEmp.device,
        ipAddress: randomEmp.ipAddress,
        details,
        risk,
        volumeMb: volume
      };

      setTelemetryEvents(prev => [newEvent, ...prev.slice(0, 49)]);
    }, 5500);

    return () => clearInterval(interval);
  }, [isTelemetryLive, employees]);

  const clearTelemetry = () => {
    setTelemetryEvents([]);
  };

  const openContainmentModal = (targetId: string, type: ContainmentActionType) => {
    setContainmentTargetId(targetId);
    setContainmentActionType(type);
    setIsContainmentModalOpen(true);
  };

  const closeContainmentModal = () => {
    setIsContainmentModalOpen(false);
    setContainmentTargetId(null);
    setContainmentActionType(null);
  };

  const executeContainment = (notesOrEmpId?: string, actionType?: ContainmentActionType) => {
    const targetId = containmentTargetId || notesOrEmpId;
    if (!targetId) return;

    // Update employee risk or containment flag
    setEmployees(prev => prev.map(emp => {
      if (emp.id === targetId) {
        return {
          ...emp,
          riskScore: Math.max(10, emp.riskScore - 30),
          riskTrend: 'DECREASING',
          trendDelta: -30
        };
      }
      return emp;
    }));

    // Add telemetry log for containment
    const now = new Date();
    const containmentEvent: TelemetryEvent = {
      id: `EVT-CONTAIN-${Date.now()}`,
      timestamp: now.toTimeString().split(' ')[0],
      rawTime: now.toISOString(),
      type: 'PRIVILEGE_CHANGE',
      employeeId: targetId,
      employeeName: selectedEmployee.name,
      department: selectedEmployee.department,
      device: selectedEmployee.device,
      ipAddress: selectedEmployee.ipAddress,
      details: `[CONTAINMENT EXECUTED] Host isolated and active sessions revoked by SOC. Notes: ${notesOrEmpId || 'Immediate threat quarantine'}`,
      risk: 'INFORMATIONAL'
    };

    setTelemetryEvents(prev => [containmentEvent, ...prev]);
    closeContainmentModal();
  };

  const updateIncidentStatus = (incidentId: string, status: IncidentStatus) => {
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status, lastUpdated: 'Just now' } : inc));
  };

  const toggleMitigationStep = (incidentId: string, stepId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          mitigationSteps: inc.mitigationSteps.map(step => 
            step.id === stepId ? { ...step, completed: !step.completed } : step
          )
        };
      }
      return inc;
    }));
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'INVESTIGATING' } : a));
  };

  const escalateAlertToIncident = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'ESCALATED' } : a));
    const targetAlert = alerts.find(a => a.id === alertId);
    if (!targetAlert) return;

    const newIncident: Incident = {
      id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `Escalated: ${targetAlert.title}`,
      severity: targetAlert.severity,
      status: 'DETECTED',
      primaryEmployeeId: targetAlert.employeeId,
      primaryEmployeeName: targetAlert.employeeName,
      affectedDevices: ['DESKTOP-7G8H2'],
      riskScore: 85,
      assignedAnalyst: 'Authar Morgan',
      createdAt: 'Just now',
      lastUpdated: 'Just now',
      description: `Automatically created from high-priority alert ${targetAlert.id}: ${targetAlert.event}`,
      evidenceCount: 4,
      timelineEvents: [
        { time: targetAlert.timestamp, type: 'ALERT', description: targetAlert.event, evidenceId: targetAlert.id, severity: targetAlert.severity }
      ],
      mitigationSteps: [
        { id: 'm-1', step: 'Perform endpoint network isolation', completed: false },
        { id: 'm-2', step: 'Enforce SSO MFA re-authentication', completed: false }
      ],
      aiHypothesis: 'Escalated alert requires immediate SOC containment.'
    };

    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncidentId(newIncident.id);
  };

  const assignAlert = (alertId: string, analyst: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, assignedAnalyst: analyst } : a));
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'RESOLVED' } : a));
  };

  const runAttackScenario = (type: 'EXFILTRATION' | 'PRIVILEGE_ESCALATION') => {
    setIsAttackScenarioRunning(true);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    if (type === 'EXFILTRATION') {
      const burstEvent: TelemetryEvent = {
        id: `EVT-BURST-${Date.now()}`,
        timestamp: timeStr,
        rawTime: now.toISOString(),
        type: 'FILE_TRANSFER',
        employeeId: 'EMP-1042',
        employeeName: 'Authar Morgan',
        department: 'Finance & Cloud Infra',
        device: 'DESKTOP-7G8H2',
        ipAddress: '10.240.14.82',
        details: '[SIMULATION INJECT] 12.4 GB egress burst to unregistered s3://staging-dump-991',
        risk: 'CRITICAL',
        volumeMb: 12697,
        destination: 's3://staging-dump-991',
        anomalyConfidence: 99.4
      };

      setTelemetryEvents(prev => [burstEvent, ...prev]);
      setEmployees(prev => prev.map(e => e.id === 'EMP-1042' ? { ...e, riskScore: 89, behaviorDeviation: 48, riskTrend: 'INCREASING', trendDelta: 31 } : e));
    } else {
      const privEvent: TelemetryEvent = {
        id: `EVT-KERB-${Date.now()}`,
        timestamp: timeStr,
        rawTime: now.toISOString(),
        type: 'PRIVILEGE_CHANGE',
        employeeId: 'EMP-1091',
        employeeName: 'Jordan Lee',
        department: 'Core Infrastructure',
        device: 'SRE-MAC-9912',
        ipAddress: '10.240.18.99',
        details: '[SIMULATION INJECT] Forged Golden Ticket presented to Active Directory DC-01',
        risk: 'CRITICAL',
        anomalyConfidence: 99.8
      };

      setTelemetryEvents(prev => [privEvent, ...prev]);
      setEmployees(prev => prev.map(e => e.id === 'EMP-1091' ? { ...e, riskScore: 92, behaviorDeviation: 52 } : e));
    }

    setTimeout(() => {
      setIsAttackScenarioRunning(false);
    }, 1200);
  };

  const containmentAction = containmentTargetId && containmentActionType ? {
    employeeId: containmentTargetId,
    actionType: containmentActionType
  } : null;

  return (
    <SecurityContext.Provider value={{
      theme: 'dark',
      setTheme: () => {},
      activeNav,
      setActiveNav,
      currentRole,
      setCurrentRole,
      sidebarWidth,
      setSidebarWidth,
      isSidebarCollapsed,
      setIsSidebarCollapsed,
      isMobileSidebarOpen,
      setIsMobileSidebarOpen,
      employees,
      selectedEmployeeId,
      setSelectedEmployeeId,
      selectedEmployee,
      telemetryEvents,
      isTelemetryLive,
      setIsTelemetryLive,
      clearTelemetry,
      threatNodes,
      threatLinks,
      anomalies,
      incidents,
      selectedIncidentId,
      setSelectedIncidentId,
      selectedIncident,
      alerts,
      threatActors,
      iocs,
      threatFeed,
      mitreTactics,
      globalThreatPoints,
      isContainmentModalOpen,
      containmentTargetId,
      containmentActionType,
      containmentAction,
      openContainmentModal,
      closeContainmentModal,
      executeContainment,
      updateIncidentStatus,
      toggleMitigationStep,
      acknowledgeAlert,
      escalateAlertToIncident,
      assignAlert,
      resolveAlert,
      runAttackScenario,
      isAttackScenarioRunning,
      isCommandPaletteOpen,
      setIsCommandPaletteOpen
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
