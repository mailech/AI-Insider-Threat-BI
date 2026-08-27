import { 
  Employee, 
  TelemetryEvent, 
  ThreatNode, 
  ThreatLink, 
  Anomaly, 
  Incident, 
  Alert,
  ThreatActor,
  IOCItem,
  ThreatFeedItem,
  MitreTactic,
  GlobalThreatPoint
} from '../types';

export const mockEmployees: Employee[] = [
  {
    id: 'EMP-1042',
    name: 'Authar Morgan',
    department: 'Finance & Cloud Infra',
    designation: 'Senior Cloud Systems Architect',
    manager: 'Sarah Lin (VP Engineering)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    device: 'DESKTOP-7G8H2',
    ipAddress: '10.240.14.82',
    location: 'Zurich Office / VPN (Simultaneous)',
    riskScore: 78,
    riskClassification: 'HIGH',
    behaviorDeviation: 34,
    riskTrend: 'INCREASING',
    trendDelta: 31,
    lastActivity: '2 mins ago',
    accessPrivileges: [
      'AWS-Production-Root-AssumeRole',
      'Finance-DB-ReadOnly',
      'Kubernetes-Cluster-Admin',
      'HashiCorp-Vault-KMS-Access',
      'Corporate-VPN-Bypass-Whitelisted'
    ],
    baseline: {
      loginHours: '09:00 - 18:00 UTC',
      avgDailyDataEgressMb: 450,
      avgAppCount: 8,
      peerRiskAvg: 24,
    },
    currentMetrics: {
      todayDataEgressMb: 12697, // 12.4GB+
      activeAppsCount: 26,
      failedAuthAttempts: 6,
      usbDevicesConnected: 1,
    },
    shapFactors: [
      {
        factor: 'Bulk Data Egress to Unregistered Staging Bucket',
        contribution: 0.38,
        description: 'Transferred 12.4 GB of compressed archives via CLI outside standard 90-day baseline'
      },
      {
        factor: 'Unsanctioned External USB Mass Storage Mount',
        contribution: 0.28,
        description: 'SanDisk Ultra 128GB mounted on managed host DESKTOP-7G8H2 with direct file copies'
      },
      {
        factor: 'Off-Hours Authentication & Privilege Elevation',
        contribution: 0.22,
        description: 'Observed Kerberos ticket request at 02:14 UTC with Domain Admin privilege elevation'
      },
      {
        factor: 'Anomalous Database Query Volume',
        contribution: 0.12,
        description: 'Dumped 84,000 corporate records from Finance Customer DB in under 4 minutes'
      }
    ]
  },
  {
    id: 'EMP-1091',
    name: 'Jordan Lee',
    department: 'Core Infrastructure & DevOps',
    designation: 'Staff Site Reliability Engineer',
    manager: 'David Chen (Director IT)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    device: 'SRE-MAC-9912',
    ipAddress: '10.240.18.99',
    location: 'San Francisco HQ',
    riskScore: 78,
    riskClassification: 'HIGH',
    behaviorDeviation: 29,
    riskTrend: 'INCREASING',
    trendDelta: 18,
    lastActivity: '4 mins ago',
    accessPrivileges: [
      'GCP-Organization-Owner',
      'GitHub-Enterprise-Admin',
      'Vault-Master-Keys'
    ],
    baseline: {
      loginHours: '08:30 - 17:30 PST',
      avgDailyDataEgressMb: 620,
      avgAppCount: 12,
      peerRiskAvg: 30,
    },
    currentMetrics: {
      todayDataEgressMb: 4200,
      activeAppsCount: 22,
      failedAuthAttempts: 4,
      usbDevicesConnected: 0,
    },
    shapFactors: [
      {
        factor: 'Unauthorized KMS Master Key Access',
        contribution: 0.45,
        description: 'Queried production master secrets engine at unusual velocity'
      },
      {
        factor: 'Unapproved Sudo Privilege Execution',
        contribution: 0.35,
        description: 'Executed raw root shell commands bypassing PAM audit wrapper'
      },
      {
        factor: 'Concurrent Tor Exit Node Traffic',
        contribution: 0.20,
        description: 'Correlated background outbound TCP connections to anonymizing proxy'
      }
    ]
  },
  {
    id: 'EMP-1033',
    name: 'Marcus Wilson',
    department: 'Customer Support & Success',
    designation: 'Senior Tier-3 Support Specialist',
    manager: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    device: 'WIN-LPT-4421',
    ipAddress: '10.120.4.11',
    location: 'London Office',
    riskScore: 82,
    riskClassification: 'CRITICAL',
    behaviorDeviation: 41,
    riskTrend: 'INCREASING',
    trendDelta: 26,
    lastActivity: '8 mins ago',
    accessPrivileges: [
      'Zendesk-Super-User',
      'Salesforce-CRM-Full',
      'Customer-PII-Lookup'
    ],
    baseline: {
      loginHours: '09:00 - 17:30 GMT',
      avgDailyDataEgressMb: 120,
      avgAppCount: 5,
      peerRiskAvg: 18,
    },
    currentMetrics: {
      todayDataEgressMb: 3800,
      activeAppsCount: 9,
      failedAuthAttempts: 2,
      usbDevicesConnected: 1,
    },
    shapFactors: [
      {
        factor: 'Bulk Customer PII & SSN Export',
        contribution: 0.52,
        description: 'Exported 14,200 plaintext customer records via unauthorized web script'
      },
      {
        factor: 'Personal Cloud Sync Service Traffic',
        contribution: 0.30,
        description: 'Outbound sync to personal Mega.nz account from managed endpoint'
      },
      {
        factor: 'DLP Classifier Alarm Trigger',
        contribution: 0.18,
        description: 'Matched credit card pattern signature across unencrypted CSV buffers'
      }
    ]
  },
  {
    id: 'EMP-1007',
    name: 'Elena Rostova',
    department: 'Customer Support',
    designation: 'Support Operations Manager',
    manager: 'David Chen',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    device: 'MAC-OPS-1007',
    ipAddress: '10.120.4.1',
    location: 'London Office',
    riskScore: 32,
    riskClassification: 'LOW',
    behaviorDeviation: 6,
    riskTrend: 'DECREASING',
    trendDelta: -4,
    lastActivity: '12 mins ago',
    accessPrivileges: ['Zendesk-Admin', 'Salesforce-Manager'],
    baseline: {
      loginHours: '08:00 - 17:00 GMT',
      avgDailyDataEgressMb: 180,
      avgAppCount: 7,
      peerRiskAvg: 22,
    },
    currentMetrics: {
      todayDataEgressMb: 190,
      activeAppsCount: 6,
      failedAuthAttempts: 0,
      usbDevicesConnected: 0,
    },
    shapFactors: [
      {
        factor: 'Routine Shift Turnover Data Review',
        contribution: 0.70,
        description: 'Expected operational shift handover metrics'
      },
      {
        factor: 'Standard Peer Alignment',
        contribution: 0.30,
        description: 'All metrics fall strictly within 95% confidence interval'
      }
    ]
  },
  {
    id: 'EMP-1120',
    name: 'Devon Vance',
    department: 'Sales & Business Development',
    designation: 'Enterprise Account Executive',
    manager: 'Rachel Zane',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    device: 'WIN-SLS-8821',
    ipAddress: '192.168.1.104',
    location: 'Remote / Austin, TX',
    riskScore: 68,
    riskClassification: 'HIGH',
    behaviorDeviation: 22,
    riskTrend: 'INCREASING',
    trendDelta: 15,
    lastActivity: '15 mins ago',
    accessPrivileges: ['Salesforce-Export-Contacts', 'HubSpot-Admin'],
    baseline: {
      loginHours: '08:00 - 18:00 CST',
      avgDailyDataEgressMb: 80,
      avgAppCount: 6,
      peerRiskAvg: 19,
    },
    currentMetrics: {
      todayDataEgressMb: 1400,
      activeAppsCount: 11,
      failedAuthAttempts: 1,
      usbDevicesConnected: 0,
    },
    shapFactors: [
      {
        factor: 'Competitor Domain Access & Mass CRM Export',
        contribution: 0.60,
        description: 'Downloaded full corporate lead database 3 days before announced resignation'
      },
      {
        factor: 'Personal Gmail Webmail Uploads',
        contribution: 0.40,
        description: 'Attached zip archives to non-corporate webmail session'
      }
    ]
  }
];

export const mockTelemetryEvents: TelemetryEvent[] = [
  {
    id: 'EVT-90412',
    timestamp: '09:41:23',
    rawTime: '2026-08-19T09:41:23Z',
    type: 'FILE_TRANSFER',
    employeeId: 'EMP-1042',
    employeeName: 'Authar Morgan',
    department: 'Finance & Cloud Infra',
    device: 'DESKTOP-7G8H2',
    ipAddress: '10.240.14.82',
    details: '12.4 GB transferred to unverified staging S3 bucket [s3://temp-sync-8841]',
    risk: 'HIGH',
    volumeMb: 12697,
    destination: 's3://temp-sync-8841',
    anomalyConfidence: 96.4
  },
  {
    id: 'EVT-90411',
    timestamp: '09:42:11',
    rawTime: '2026-08-19T09:42:11Z',
    type: 'PRIVILEGE_CHANGE',
    employeeId: 'EMP-1091',
    employeeName: 'Jordan Lee',
    department: 'Core Infrastructure',
    device: 'SRE-MAC-9912',
    ipAddress: '10.240.18.99',
    details: 'Admin privilege requested via Kerberos forged ticket on DC-01.corp.internal',
    risk: 'CRITICAL',
    anomalyConfidence: 99.2
  },
  {
    id: 'EVT-90405',
    timestamp: '09:43:05',
    rawTime: '2026-08-19T09:43:05Z',
    type: 'UNUSUAL_LOGIN',
    employeeId: 'EMP-1007',
    employeeName: 'Elena Rostova',
    department: 'Customer Support',
    device: 'MAC-OPS-1007',
    ipAddress: '185.220.101.4',
    details: 'Login detected from impossible travel velocity: Zurich (VPN) & London',
    risk: 'MEDIUM',
    anomalyConfidence: 84.1
  },
  {
    id: 'EVT-90418',
    timestamp: '09:44:18',
    rawTime: '2026-08-19T09:44:18Z',
    type: 'USB_ACTIVITY',
    employeeId: 'EMP-1042',
    employeeName: 'Authar Morgan',
    department: 'Finance & Cloud Infra',
    device: 'DESKTOP-7G8H2',
    ipAddress: '10.240.14.82',
    details: 'External storage device [SanDisk Ultra USB 3.0] connected; 4.8GB written',
    risk: 'HIGH',
    volumeMb: 4800,
    anomalyConfidence: 94.7
  },
  {
    id: 'EVT-90422',
    timestamp: '09:45:02',
    rawTime: '2026-08-19T09:45:02Z',
    type: 'EMAIL_EXFILTRATION',
    employeeId: 'EMP-1120',
    employeeName: 'Devon Vance',
    department: 'Sales',
    device: 'WIN-SLS-8821',
    ipAddress: '192.168.1.104',
    details: 'Encrypted zip archive with 1,840 customer lead records emailed to personal mailbox',
    risk: 'HIGH',
    volumeMb: 340,
    anomalyConfidence: 91.8
  },
  {
    id: 'EVT-90430',
    timestamp: '09:46:15',
    rawTime: '2026-08-19T09:46:15Z',
    type: 'DATABASE_QUERY',
    employeeId: 'EMP-1033',
    employeeName: 'Marcus Wilson',
    department: 'Customer Support',
    device: 'WIN-LPT-4421',
    ipAddress: '10.120.4.11',
    details: 'Bulk SQL Dump: SELECT * FROM customer_pii_vault WHERE country IN ("US","EU")',
    risk: 'CRITICAL',
    volumeMb: 820,
    anomalyConfidence: 98.6
  }
];

export const mockThreatNodes: ThreatNode[] = [
  {
    id: 'node-emp-1042',
    label: 'Authar Morgan (EMP-1042)',
    type: 'EMPLOYEE',
    riskScore: 78,
    threatLevel: 'HIGH',
    lastActivity: '2 mins ago',
    behaviorDeviation: 34,
    department: 'Finance & Cloud Infra',
    device: 'DESKTOP-7G8H2',
    anomalyDetails: 'Exfiltrating 12.4GB data archive to untrusted S3 bucket and USB peripheral'
  },
  {
    id: 'node-emp-1091',
    label: 'Jordan Lee (EMP-1091)',
    type: 'EMPLOYEE',
    riskScore: 78,
    threatLevel: 'HIGH',
    lastActivity: '4 mins ago',
    behaviorDeviation: 29,
    department: 'Core Infrastructure',
    device: 'SRE-MAC-9912',
    anomalyDetails: 'Forged Kerberos Ticket on Domain Controller DC-01'
  },
  {
    id: 'node-emp-1033',
    label: 'Marcus Wilson (EMP-1033)',
    type: 'EMPLOYEE',
    riskScore: 82,
    threatLevel: 'CRITICAL',
    lastActivity: '8 mins ago',
    behaviorDeviation: 41,
    department: 'Customer Support',
    device: 'WIN-LPT-4421',
    anomalyDetails: 'Bulk PII Database Dump to personal cloud storage'
  },
  {
    id: 'node-emp-1007',
    label: 'Elena Rostova (EMP-1007)',
    type: 'EMPLOYEE',
    riskScore: 32,
    threatLevel: 'LOW',
    lastActivity: '12 mins ago',
    behaviorDeviation: 6,
    department: 'Customer Support',
    device: 'MAC-OPS-1007'
  },
  {
    id: 'node-emp-1120',
    label: 'Devon Vance (EMP-1120)',
    type: 'EMPLOYEE',
    riskScore: 68,
    threatLevel: 'HIGH',
    lastActivity: '15 mins ago',
    behaviorDeviation: 22,
    department: 'Sales',
    device: 'WIN-SLS-8821',
    anomalyDetails: 'Exfiltrating CRM sales leads before departure'
  },
  {
    id: 'node-res-vault',
    label: 'Vault KMS Master Secrets',
    type: 'DATABASE',
    riskScore: 85,
    threatLevel: 'CRITICAL',
    lastActivity: '3 mins ago',
    behaviorDeviation: 48,
    anomalyDetails: 'High-frequency key export requests observed'
  },
  {
    id: 'node-res-s3',
    label: 's3://temp-sync-8841 (Untrusted)',
    type: 'CLOUD_BUCKET',
    riskScore: 92,
    threatLevel: 'CRITICAL',
    lastActivity: '2 mins ago',
    behaviorDeviation: 75,
    anomalyDetails: 'External destination endpoint with non-corporate ACL'
  },
  {
    id: 'node-res-usb',
    label: 'SanDisk Ultra USB 3.0',
    type: 'EXTERNAL_USB',
    riskScore: 88,
    threatLevel: 'HIGH',
    lastActivity: '5 mins ago',
    behaviorDeviation: 60,
    anomalyDetails: 'Direct hardware write of sensitive source archives'
  },
  {
    id: 'node-res-dc01',
    label: 'DC-01 Active Directory',
    type: 'API_GATEWAY',
    riskScore: 84,
    threatLevel: 'HIGH',
    lastActivity: '4 mins ago',
    behaviorDeviation: 32,
    anomalyDetails: 'Pass-the-ticket Kerberos anomalies'
  },
  {
    id: 'node-res-crm',
    label: 'Customer PII Production DB',
    type: 'DATABASE',
    riskScore: 80,
    threatLevel: 'CRITICAL',
    lastActivity: '7 mins ago',
    behaviorDeviation: 55,
    anomalyDetails: '14.2k records dumped in single query'
  }
];

export const mockThreatLinks: ThreatLink[] = [
  { source: 'node-emp-1042', target: 'node-res-s3', relationship: '12.4GB Outbound Egress', risk: 'CRITICAL', volumeMb: 12697, isSuspicious: true },
  { source: 'node-emp-1042', target: 'node-res-usb', relationship: '4.8GB File Copy', risk: 'HIGH', volumeMb: 4800, isSuspicious: true },
  { source: 'node-emp-1042', target: 'node-res-vault', relationship: 'KMS Key Extraction', risk: 'HIGH', isSuspicious: true },
  { source: 'node-emp-1091', target: 'node-res-dc01', relationship: 'Pass-the-Ticket Kerberos', risk: 'CRITICAL', isSuspicious: true },
  { source: 'node-emp-1033', target: 'node-res-crm', relationship: 'SELECT * PII Bulk Scrape', risk: 'CRITICAL', volumeMb: 820, isSuspicious: true },
  { source: 'node-emp-1007', target: 'node-res-crm', relationship: 'Normal Shift Lookup', risk: 'LOW', isSuspicious: false },
  { source: 'node-emp-1120', target: 'node-res-crm', relationship: 'Mass Contact Export', risk: 'HIGH', isSuspicious: true },
];

export const mockAnomalies: Anomaly[] = [
  {
    id: 'ANM-2026-081',
    title: 'Massive Off-Hours Data Transfer to Non-Standard S3 Staging',
    category: 'EXCESSIVE_FILE_TRANSFER',
    severity: 'CRITICAL',
    confidence: 96.4,
    detectedAt: '09:41 UTC Today',
    employeeId: 'EMP-1042',
    employeeName: 'Authar Morgan',
    department: 'Finance & Cloud Infra',
    device: 'DESKTOP-7G8H2',
    evidence: [
      '12.4 GB archive transfer via AWS CLI',
      'Target endpoint: s3://temp-sync-8841 (Not in corporate cloud terraform registry)',
      'Execution occurred during off-hours window with no Jira change ticket'
    ],
    aiExplanation: 'The user Authar Morgan transferred 12.4 GB of data outside established normal working baseline (avg: 450 MB/day). Destination bucket possesses public write ACLs.',
    baselineValue: '450 MB / day (Mean)',
    observedValue: '12,697 MB (2,720% deviation)'
  },
  {
    id: 'ANM-2026-082',
    title: 'Kerberos Pass-the-Ticket & Domain Controller Elevation',
    category: 'PRIVILEGE_ABUSE',
    severity: 'CRITICAL',
    confidence: 99.2,
    detectedAt: '09:42 UTC Today',
    employeeId: 'EMP-1091',
    employeeName: 'Jordan Lee',
    department: 'Core Infrastructure',
    device: 'SRE-MAC-9912',
    evidence: [
      'Event ID 4624 (Successful Logon) with anomalous Ticket Granting Ticket (TGT)',
      'Direct RPC bind to Domain Controller DC-01 bypassing bastion jump host',
      'LSASS memory injection detected by EDR agent'
    ],
    aiExplanation: 'Pass-the-ticket artifact detected originating from macOS workstation towards Active Directory root infrastructure.',
    baselineValue: 'Standard Bastion SSO Sessions',
    observedValue: 'Raw Kerberos Ticket Injection (0.01% rarity)'
  },
  {
    id: 'ANM-2026-083',
    title: 'Bulk Customer PII Extraction & Local Storage Encryption',
    category: 'ABNORMAL_DATA_DOWNLOAD',
    severity: 'HIGH',
    confidence: 94.7,
    detectedAt: '09:46 UTC Today',
    employeeId: 'EMP-1033',
    employeeName: 'Marcus Wilson',
    department: 'Customer Support',
    device: 'WIN-LPT-4421',
    evidence: [
      'Queried 14,200 rows of sensitive SSN / Credit Card vault in 210 seconds',
      'Saved payload to encrypted 7z archive with password protection',
      'Initiated outbound sync to external web storage'
    ],
    aiExplanation: 'Tier-3 support agent executed direct SQL query exceeding standard single-ticket lookup quotas by 4,700%.',
    baselineValue: '3-5 record queries / hour',
    observedValue: '14,200 record dump'
  }
];

export const mockIncidents: Incident[] = [
  {
    id: 'INC-2026-0891',
    title: 'Targeted Core IP & Financial Data Exfiltration Attempt',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    primaryEmployeeId: 'EMP-1042',
    primaryEmployeeName: 'Authar Morgan',
    affectedDevices: ['DESKTOP-7G8H2', 'AWS-PROD-CLUSTER-04', 'STORAGE-SAN-01'],
    riskScore: 78,
    assignedAnalyst: 'Authar Morgan (SOC Lead)',
    createdAt: '09:41 UTC Today',
    lastUpdated: '2 mins ago',
    description: 'Multi-stage insider threat sequence involving KMS secret access, bulk 12.4GB archive compression, and staging to personal S3 bucket and unmanaged USB drive.',
    evidenceCount: 14,
    timelineEvents: [
      { time: '09:37:12', type: 'SECRETS', description: 'Vault KMS export token requested by Authar Morgan', evidenceId: 'EVT-90371', severity: 'MEDIUM' },
      { time: '09:41:23', type: 'EGRESS', description: '12.4 GB transferred to s3://temp-sync-8841', evidenceId: 'EVT-90412', severity: 'CRITICAL' },
      { time: '09:44:18', type: 'HARDWARE', description: 'SanDisk USB mass storage mounted; 4.8GB copied', evidenceId: 'EVT-90418', severity: 'HIGH' },
      { time: '09:45:00', type: 'AUTH', description: 'Simultaneous login attempt from Zurich VPN IP', evidenceId: 'EVT-90425', severity: 'MEDIUM' },
    ],
    mitigationSteps: [
      { id: 'step-1', step: 'Perform Endpoint Host Network Isolation on DESKTOP-7G8H2', completed: false },
      { id: 'step-2', step: 'Revoke active AWS AssumeRole sessions and STS temporary tokens', completed: true },
      { id: 'step-3', step: 'Block destination IP & S3 bucket via Zscaler CASB boundary', completed: true },
      { id: 'step-4', step: 'Enforce Step-Up FIDO2 Hardware MFA and lock Active Directory identity', completed: false },
      { id: 'step-5', step: 'Preserve forensic memory capture for incident post-mortem', completed: false }
    ],
    aiHypothesis: 'High-confidence intentional data exfiltration. The actor staged confidential financial telemetry, utilized an unmanaged USB drive, and uploaded archives to an external cloud bucket.'
  },
  {
    id: 'INC-2026-0892',
    title: 'Domain Controller Privilege Escalation via Kerberos Ticket Injection',
    severity: 'HIGH',
    status: 'TRIAGED',
    primaryEmployeeId: 'EMP-1091',
    primaryEmployeeName: 'Jordan Lee',
    affectedDevices: ['SRE-MAC-9912', 'DC-01.corp.internal'],
    riskScore: 78,
    assignedAnalyst: 'Alex Chen',
    createdAt: '09:42 UTC Today',
    lastUpdated: '10 mins ago',
    description: 'Anomalous Ticket Granting Service (TGS) request forged on Domain Controller DC-01 originating from SRE workstation.',
    evidenceCount: 8,
    timelineEvents: [
      { time: '09:39:00', type: 'AUTH', description: 'LSASS process memory scraped via mimikatz variant', evidenceId: 'EVT-90390', severity: 'CRITICAL' },
      { time: '09:42:11', type: 'EXPLOIT', description: 'Forged Golden Ticket presented to DC-01', evidenceId: 'EVT-90411', severity: 'CRITICAL' },
    ],
    mitigationSteps: [
      { id: 'step-1', step: 'Reset KRBTGT account password twice across all Domain Controllers', completed: false },
      { id: 'step-2', step: 'Isolate SRE-MAC-9912 via CrowdStrike Falcon agent', completed: false },
    ],
    aiHypothesis: 'Likely credential compromise or rogue administrative elevation testing in production environment.'
  }
];

export const mockAlerts: Alert[] = [
  {
    id: 'ALT-8841',
    title: 'Massive Exfiltration to External S3 Bucket',
    employeeId: 'EMP-1042',
    employeeName: 'Authar Morgan',
    department: 'Finance & Cloud Infra',
    event: '12.4 GB transferred via AWS CLI to s3://temp-sync-8841',
    severity: 'CRITICAL',
    confidence: 96.4,
    timestamp: '09:41:23 UTC',
    status: 'NEW',
    assignedAnalyst: 'Authar Morgan',
    threatCategory: 'Data Exfiltration'
  },
  {
    id: 'ALT-8842',
    title: 'Domain Controller Kerberos Pass-the-Ticket',
    employeeId: 'EMP-1091',
    employeeName: 'Jordan Lee',
    department: 'Core Infrastructure',
    event: 'Forged TGT presented to DC-01.corp.internal',
    severity: 'CRITICAL',
    confidence: 99.2,
    timestamp: '09:42:11 UTC',
    status: 'INVESTIGATING',
    assignedAnalyst: 'Alex Chen',
    threatCategory: 'Privilege Abuse'
  },
  {
    id: 'ALT-8843',
    title: 'Unregistered USB Storage Mount',
    employeeId: 'EMP-1042',
    employeeName: 'Authar Morgan',
    department: 'Finance & Cloud Infra',
    event: 'SanDisk Ultra 128GB mounted; 4.8GB write burst',
    severity: 'HIGH',
    confidence: 94.7,
    timestamp: '09:44:18 UTC',
    status: 'NEW',
    assignedAnalyst: 'Authar Morgan',
    threatCategory: 'Hardware Anomaly'
  },
  {
    id: 'ALT-8844',
    title: 'Bulk Customer PII & SSN Database Dump',
    employeeId: 'EMP-1033',
    employeeName: 'Marcus Wilson',
    department: 'Customer Support',
    event: '14,200 records queried and saved to encrypted archive',
    severity: 'HIGH',
    confidence: 94.7,
    timestamp: '09:46:15 UTC',
    status: 'NEW',
    assignedAnalyst: 'Sarah Lin',
    threatCategory: 'Data Theft'
  },
  {
    id: 'ALT-8845',
    title: 'CRM Lead List Exfiltration Before Resignation',
    employeeId: 'EMP-1120',
    employeeName: 'Devon Vance',
    department: 'Sales',
    event: '1,840 customer records emailed to personal webmail',
    severity: 'MEDIUM',
    confidence: 91.8,
    timestamp: '09:45:02 UTC',
    status: 'NEW',
    assignedAnalyst: 'Authar Morgan',
    threatCategory: 'Policy Violation'
  }
];

export const mockThreatActors: ThreatActor[] = [
  {
    id: 'ACT-01',
    name: 'DragonForce Ransomware Group',
    origin: 'Eastern Europe / Cybercrime Syndicate',
    targetSectors: ['Financial Services', 'Critical Infra', 'Healthcare'],
    activeCampaigns: 'Operation DeepLock - Insider Recruitment via Telegram',
    riskLevel: 'CRITICAL',
    cves: ['CVE-2024-3094', 'CVE-2023-48795']
  },
  {
    id: 'ACT-02',
    name: 'Volt Typhoon (APT43 Sub-cluster)',
    origin: 'Asia-Pacific / State-Sponsored',
    targetSectors: ['Telecom', 'Cloud Providers', 'Defense'],
    activeCampaigns: 'Living-Off-The-Land WMI & Kerberos Forgery',
    riskLevel: 'CRITICAL',
    cves: ['CVE-2024-21762', 'CVE-2023-38606']
  },
  {
    id: 'ACT-03',
    name: 'Scattered Spider (UNC3944)',
    origin: 'Global / Social Engineering Ring',
    targetSectors: ['SaaS', 'Identity Providers', 'Crypto Exchanges'],
    activeCampaigns: 'Helpdesk Vishing & SIM Swapping MFA Bypasses',
    riskLevel: 'HIGH',
    cves: ['CVE-2024-1709', 'CVE-2023-3519']
  },
  {
    id: 'ACT-04',
    name: 'Lazarus Group (Andariel Cell)',
    origin: 'East Asia / State-Sponsored',
    targetSectors: ['Fintech', 'Defense', 'Cryptocurrency'],
    activeCampaigns: 'Job Applicant Trojanized Coding Assessments',
    riskLevel: 'HIGH',
    cves: ['CVE-2024-27198', 'CVE-2023-4966']
  }
];

export const mockIOCs: IOCItem[] = [
  { id: 'IOC-01', indicator: '185.220.101.4', type: 'IP', threatName: 'Tor Exit Node / Command Relay', confidence: 99, severity: 'HIGH', firstSeen: '2026-08-18' },
  { id: 'IOC-02', indicator: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', type: 'HASH_SHA256', threatName: 'Mimikatz Pass-The-Hash Injector', confidence: 100, severity: 'CRITICAL', firstSeen: '2026-08-19' },
  { id: 'IOC-03', indicator: 's3://temp-sync-8841', type: 'URL', threatName: 'Rogue Exfiltration Dropzone', confidence: 98, severity: 'CRITICAL', firstSeen: '2026-08-19' },
  { id: 'IOC-04', indicator: 'auth-gateway.internal-sync.cc', type: 'DOMAIN', threatName: 'C2 Reverse Proxy Beacon', confidence: 95, severity: 'HIGH', firstSeen: '2026-08-17' },
  { id: 'IOC-05', indicator: '194.26.29.112', type: 'IP', threatName: 'Scattered Spider Vishing Proxy', confidence: 92, severity: 'MEDIUM', firstSeen: '2026-08-15' },
];

export const mockThreatFeed: ThreatFeedItem[] = [
  {
    id: 'FEED-01',
    title: 'DragonForce Ransomware Campaign Targeting Corporate Insiders',
    severity: 'CRITICAL',
    source: 'Cyber Threat Alliance / Sentinel Labs',
    time: '4 mins ago',
    description: 'Adversaries offering $500K bounties on dark web forums for Active Directory domain credentials.',
    cve: 'CVE-2024-3094'
  },
  {
    id: 'FEED-02',
    title: 'New Phishing Kit Bypassing FIDO2 Hardware Tokens via Reverse Proxy',
    severity: 'HIGH',
    source: 'CISA Alert AA26-231A',
    time: '18 mins ago',
    description: 'Adversary-in-the-middle (AiTM) frameworks capturing real-time session tokens.'
  },
  {
    id: 'FEED-03',
    title: 'CVE-2024-3094 XZ Utils Backdoor Signatures Exploited in Wild',
    severity: 'CRITICAL',
    source: 'NVD / MITRE CVE Feed',
    time: '32 mins ago',
    description: 'Remote SSH authentication bypass exploited via tainted OpenSSH binaries.',
    cve: 'CVE-2024-3094'
  },
  {
    id: 'FEED-04',
    title: 'Dark Web Credential Dump: 1.2M Enterprise Corporate Emails',
    severity: 'MEDIUM',
    source: 'HaveIBeenPwned Commercial Feed',
    time: '1 hr ago',
    description: 'Correlated 14 corporate internal domain credentials matching current password policies.'
  }
];

export const mockMitreTactics: MitreTactic[] = [
  { id: 'TA0001', tactic: 'Initial Access', technique: 'Valid Accounts (T1078.004)', detectionsCount: 14, severity: 'HIGH', coveragePercentage: 94 },
  { id: 'TA0002', tactic: 'Execution', technique: 'Command & Scripting (T1059.001)', detectionsCount: 28, severity: 'HIGH', coveragePercentage: 98 },
  { id: 'TA0003', tactic: 'Persistence', technique: 'Account Manipulation (T1098)', detectionsCount: 8, severity: 'MEDIUM', coveragePercentage: 91 },
  { id: 'TA0004', tactic: 'Privilege Escalation', technique: 'Kerberos Pass-the-Ticket (T1558.001)', detectionsCount: 19, severity: 'CRITICAL', coveragePercentage: 99 },
  { id: 'TA0005', tactic: 'Defense Evasion', technique: 'Indicator Removal (T1070.004)', detectionsCount: 12, severity: 'HIGH', coveragePercentage: 93 },
  { id: 'TA0006', tactic: 'Credential Access', technique: 'OS Credential Dumping (T1003.001)', detectionsCount: 16, severity: 'CRITICAL', coveragePercentage: 97 },
  { id: 'TA0007', tactic: 'Discovery', technique: 'Account Discovery (T1087.002)', detectionsCount: 34, severity: 'MEDIUM', coveragePercentage: 95 },
  { id: 'TA0008', tactic: 'Lateral Movement', technique: 'Remote Services: SSH/WMI (T1021)', detectionsCount: 22, severity: 'HIGH', coveragePercentage: 96 },
  { id: 'TA0009', tactic: 'Collection', technique: 'Data from Local System (T1005)', detectionsCount: 42, severity: 'CRITICAL', coveragePercentage: 99 },
  { id: 'TA0010', tactic: 'Exfiltration', technique: 'Exfiltration to Cloud Storage (T1567.002)', detectionsCount: 31, severity: 'CRITICAL', coveragePercentage: 100 },
];

export const mockGlobalThreatPoints: GlobalThreatPoint[] = [
  { id: 'GP-01', originName: 'Eastern Europe (Bucharest)', targetName: 'Zurich Financial DC', originCoords: [55, 30], targetCoords: [48, 34], threatType: 'Ransomware C2', severity: 'CRITICAL', count: 142 },
  { id: 'GP-02', originName: 'East Asia (Shenyang)', targetName: 'San Francisco HQ', originCoords: [78, 38], targetCoords: [20, 36], threatType: 'APT43 WMI Beacon', severity: 'HIGH', count: 88 },
  { id: 'GP-03', originName: 'London VPN Relay', targetName: 'AWS us-east-1 Cloud', originCoords: [46, 28], targetCoords: [28, 35], threatType: '12.4GB Data Egress', severity: 'CRITICAL', count: 320 },
  { id: 'GP-04', originName: 'Singapore Proxy', targetName: 'Tokyo Finance Gateway', originCoords: [74, 58], targetCoords: [82, 38], threatType: 'PII Scraping Bot', severity: 'HIGH', count: 95 },
];
