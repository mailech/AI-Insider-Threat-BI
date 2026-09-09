// ================= SAMPLE MONITORED EMPLOYEE DATA =================

export const initialEmployees = [
  {
    id: '101',
    name: 'John Carter',
    department: 'Finance',
    role: 'Senior Financial Analyst',
    status: 'Under Review',
    email: 'john.carter@threat.ai',
    workstation: 'WS-FIN-091',
    ipAddress: '192.168.4.112',
    location: 'Frankfurt / Remote',
    riskLevel: 'High',
    score: 87,
    lastActivity: 'Unusual login — 3:14 AM, unrecognized device',
    seen: '2h ago',
    avatarBg: '#e8f0fe',
    avatarColor: '#1a73e8',
    initial: 'JC',
    details:
      'Attempted 5 failed logins from an unapproved IP in Berlin before successfully authenticating.',
    behavioralIndicators: [
      'Off-Hours Authentication',
      'Foreign IP (Berlin)',
      'Brute Force Threshold',
      'Unrecognized Device Token'
    ],
    riskFactors: [
      { name: 'Anomalous Authentication', score: 92, weight: 'High' },
      { name: 'Geographic Deviation', score: 85, weight: 'High' },
      { name: 'Data Movement Velocity', score: 45, weight: 'Medium' },
      { name: 'Privilege Scope Violation', score: 30, weight: 'Low' }
    ],
    securityEvents: [
      {
        id: 'EVT-101-1',
        title: 'Consecutive Failed Login Attempts',
        severity: 'Critical',
        timestamp: 'Today, 03:12 AM',
        source: 'VPN Gateway (Berlin IP: 194.26.29.4)',
        description: '5 consecutive authentication failures followed by MFA bypass alert.'
      },
      {
        id: 'EVT-101-2',
        title: 'New Device Registration without IT Ticket',
        severity: 'High',
        timestamp: 'Today, 03:14 AM',
        source: 'Okta Identity Provider',
        description: 'Unmanaged macOS endpoint registered outside company policy.'
      },
      {
        id: 'EVT-101-3',
        title: 'General Ledger Export',
        severity: 'Medium',
        timestamp: 'Yesterday, 11:40 PM',
        source: 'SAP ERP Server',
        description: 'Large financial ledger query initiated outside standard trading hours.'
      }
    ]
  },
  {
    id: '104',
    name: 'Priya Nair',
    department: 'Legal',
    role: 'Corporate Counsel',
    status: 'Under Review',
    email: 'priya.nair@threat.ai',
    workstation: 'WS-LEG-014',
    ipAddress: '192.168.2.88',
    location: 'New York HQ',
    riskLevel: 'High',
    score: 79,
    lastActivity: 'Mass download prior to scheduled offboarding',
    seen: '40m ago',
    avatarBg: '#fce8e6',
    avatarColor: '#c5221f',
    initial: 'PN',
    details:
      'Exported 1,420 confidential contract PDFs to external storage 3 days prior to departure date.',
    behavioralIndicators: [
      'Mass DLP Exfiltration',
      'Flight Risk Offboarding',
      'Encrypted Archive Created',
      'USB Mount Event'
    ],
    riskFactors: [
      { name: 'Data Movement Velocity', score: 95, weight: 'Critical' },
      { name: 'Offboarding Flight Risk', score: 90, weight: 'High' },
      { name: 'Removable Media Access', score: 80, weight: 'High' },
      { name: 'Anomalous Authentication', score: 20, weight: 'Low' }
    ],
    securityEvents: [
      {
        id: 'EVT-104-1',
        title: 'Mass Document Bulk Export',
        severity: 'Critical',
        timestamp: 'Today, 09:20 AM',
        source: 'Legal DocuShare Repository',
        description: 'Bulk download of 1,420 privileged contract PDFs within 15 minutes.'
      },
      {
        id: 'EVT-104-2',
        title: 'Removable Storage Media Detected',
        severity: 'High',
        timestamp: 'Today, 09:35 AM',
        source: 'CrowdStrike Endpoint Agent',
        description: 'SanDisk Ultra 128GB USB drive connected to local machine.'
      },
      {
        id: 'EVT-104-3',
        title: 'Password Protected ZIP Generated',
        severity: 'High',
        timestamp: 'Today, 09:42 AM',
        source: 'DLP Endpoint Monitor',
        description: 'Archive archive_contracts_2026.zip created with AES-256 encryption.'
      }
    ]
  },
  {
    id: '102',
    name: 'David Kim',
    department: 'Engineering',
    role: 'Lead Backend Engineer',
    status: 'Active',
    email: 'david.kim@threat.ai',
    workstation: 'WS-ENG-204',
    ipAddress: '10.0.14.52',
    location: 'San Francisco Office',
    riskLevel: 'Medium',
    score: 54,
    lastActivity: 'Large file access — 2.3 GB transferred',
    seen: '5h ago',
    avatarBg: '#fef7e0',
    avatarColor: '#b06000',
    initial: 'DK',
    details:
      'Downloaded internal source code repositories outside normal working hours.',
    behavioralIndicators: [
      'Repository Clone Spike',
      'Off-Hours Transfer',
      'Git Credential Usage'
    ],
    riskFactors: [
      { name: 'Data Movement Velocity', score: 65, weight: 'Medium' },
      { name: 'After-Hours Activity', score: 55, weight: 'Medium' },
      { name: 'Privilege Scope Violation', score: 35, weight: 'Low' },
      { name: 'Anomalous Authentication', score: 15, weight: 'Low' }
    ],
    securityEvents: [
      {
        id: 'EVT-102-1',
        title: 'Core Repository Bulk Clone',
        severity: 'Medium',
        timestamp: 'Yesterday, 10:15 PM',
        source: 'GitHub Enterprise Server',
        description: 'Cloned 12 production microservices repositories (total 2.3 GB).'
      },
      {
        id: 'EVT-102-2',
        title: 'Personal Cloud Storage Access',
        severity: 'Medium',
        timestamp: 'Yesterday, 10:45 PM',
        source: 'Palo Alto Next-Gen Firewall',
        description: 'Outbound DNS lookup to dropbox.com from dev workstation.'
      }
    ]
  },
  {
    id: '105',
    name: 'Sarah Jenkins',
    department: 'HR',
    role: 'HR Operations Manager',
    status: 'Active',
    email: 'sarah.jenkins@threat.ai',
    workstation: 'WS-HR-003',
    ipAddress: '192.168.1.45',
    location: 'Chicago Hub',
    riskLevel: 'Low',
    score: 18,
    lastActivity: 'Routine payroll database query',
    seen: '1d ago',
    avatarBg: '#e6f4ea',
    avatarColor: '#137333',
    initial: 'SJ',
    details:
      'Normal administrative activity within assigned permissions.',
    behavioralIndicators: [
      'Expected Peer Activity',
      'Corporate VPN Active',
      'Normal Business Hours'
    ],
    riskFactors: [
      { name: 'Data Movement Velocity', score: 20, weight: 'Low' },
      { name: 'Anomalous Authentication', score: 10, weight: 'Low' },
      { name: 'Privilege Scope Violation', score: 15, weight: 'Low' },
      { name: 'Geographic Deviation', score: 5, weight: 'Low' }
    ],
    securityEvents: [
      {
        id: 'EVT-105-1',
        title: 'Workday HR Report Generation',
        severity: 'Low',
        timestamp: 'Yesterday, 02:30 PM',
        source: 'Workday HCM',
        description: 'Standard bi-weekly payroll reconciliation report generated.'
      }
    ]
  },
  {
    id: '108',
    name: 'Alex Rivera',
    department: 'DevOps',
    role: 'Cloud Infrastructure Engineer',
    status: 'Active',
    email: 'alex.rivera@threat.ai',
    workstation: 'WS-OPS-118',
    ipAddress: '10.0.8.201',
    location: 'Austin Hub',
    riskLevel: 'Medium',
    score: 48,
    lastActivity: 'SSH key modification on production cluster',
    seen: '12h ago',
    avatarBg: '#fef7e0',
    avatarColor: '#b06000',
    initial: 'AR',
    details:
      'Created new root SSH keys without filing an associated ticket.',
    behavioralIndicators: [
      'Unscheduled Root Access',
      'No Change Ticket Found',
      'Bastion Bypass Attempt'
    ],
    riskFactors: [
      { name: 'Privilege Escalation', score: 68, weight: 'Medium' },
      { name: 'Policy Compliance Gap', score: 55, weight: 'Medium' },
      { name: 'Data Movement Velocity', score: 25, weight: 'Low' },
      { name: 'Anomalous Authentication', score: 30, weight: 'Low' }
    ],
    securityEvents: [
      {
        id: 'EVT-108-1',
        title: 'Unauthorized Root SSH Key Injection',
        severity: 'Medium',
        timestamp: 'Today, 01:20 AM',
        source: 'AWS EC2 Production Cluster',
        description: 'Appended custom id_rsa.pub to authorized_keys on prod-bastion-01.'
      }
    ]
  },
  {
    id: '109',
    name: 'Elena Rostova',
    department: 'Engineering',
    role: 'Senior Cryptography Specialist',
    status: 'Active',
    email: 'elena.rostova@threat.ai',
    workstation: 'WS-ENG-402',
    ipAddress: '10.0.14.90',
    location: 'London Office',
    riskLevel: 'Low',
    score: 22,
    lastActivity: 'Key vault rotation routine',
    seen: '3h ago',
    avatarBg: '#e6f4ea',
    avatarColor: '#137333',
    initial: 'ER',
    details:
      'Regular rotation of API master keys in compliance with SOC-2 policies.',
    behavioralIndicators: [
      'Scheduled Cryptographic Cycle',
      'Approved Ticket #SEC-984'
    ],
    riskFactors: [
      { name: 'Privilege Scope Violation', score: 18, weight: 'Low' },
      { name: 'Anomalous Authentication', score: 12, weight: 'Low' },
      { name: 'Data Movement Velocity', score: 15, weight: 'Low' }
    ],
    securityEvents: [
      {
        id: 'EVT-109-1',
        title: 'Key Vault Master Rotation',
        severity: 'Low',
        timestamp: 'Today, 08:00 AM',
        source: 'HashiCorp Vault',
        description: 'Successfully rotated 18 secrets matching ticket #SEC-984.'
      }
    ]
  },
  {
    id: '112',
    name: 'Marcus Vance',
    department: 'Finance',
    role: 'Accounts Payable Specialist',
    status: 'Under Review',
    email: 'marcus.vance@threat.ai',
    workstation: 'WS-FIN-033',
    ipAddress: '192.168.4.89',
    location: 'New York HQ',
    riskLevel: 'Medium',
    score: 62,
    lastActivity: 'Wire transfer limit override attempt',
    seen: '6h ago',
    avatarBg: '#fef7e0',
    avatarColor: '#b06000',
    initial: 'MV',
    details:
      'Attempted to increase authorization ceiling for international wire dispatch.',
    behavioralIndicators: [
      'Financial Threshold Violation',
      'Rapid Retry Sequence',
      'Dual-Control Bypass'
    ],
    riskFactors: [
      { name: 'Privilege Escalation', score: 78, weight: 'High' },
      { name: 'Policy Compliance Gap', score: 65, weight: 'Medium' },
      { name: 'Data Movement Velocity', score: 20, weight: 'Low' }
    ],
    securityEvents: [
      {
        id: 'EVT-112-1',
        title: 'Transfer Ceiling Override Denied',
        severity: 'High',
        timestamp: 'Today, 09:12 AM',
        source: 'Treasury Portal',
        description: 'Attempted $250,000 threshold bypass without secondary controller approval.'
      }
    ]
  },
  {
    id: '115',
    name: 'Chloe Zhang',
    department: 'Legal',
    role: 'Compliance Analyst',
    status: 'Active',
    email: 'chloe.zhang@threat.ai',
    workstation: 'WS-LEG-099',
    ipAddress: '192.168.2.14',
    location: 'San Francisco Office',
    riskLevel: 'Low',
    score: 14,
    lastActivity: 'Audit log export to internal reviewer',
    seen: '8h ago',
    avatarBg: '#e6f4ea',
    avatarColor: '#137333',
    initial: 'CZ',
    details:
      'Standard compliance archive export for external audit preparation.',
    behavioralIndicators: [
      'Normal Business Hours',
      'Designated Auditor Account'
    ],
    riskFactors: [
      { name: 'Data Movement Velocity', score: 18, weight: 'Low' },
      { name: 'Anomalous Authentication', score: 10, weight: 'Low' }
    ],
    securityEvents: [
      {
        id: 'EVT-115-1',
        title: 'Compliance Archive Export',
        severity: 'Low',
        timestamp: 'Today, 07:45 AM',
        source: 'Audit Vault',
        description: 'Exported quarterly SOC compliance logs for audit committee.'
      }
    ]
  }
];
