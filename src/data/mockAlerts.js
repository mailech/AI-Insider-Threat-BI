// ================= CENTRALIZED MOCK SECURITY ALERTS =================

export const initialAlerts = [
  {
    id: 'ALT-901',
    title: 'Unauthorized Data Export',
    severity: 'Critical',
    status: 'Unresolved',
    time: '10m ago',
    target: 'Priya Nair (ID 104)',
    employeeId: '104',
    department: 'Legal',
    category: 'Data Exfiltration',
    sensor: 'Endpoint DLP & Cloud Storage Broker',
    mitreTechnique: 'T1567 (Exfiltration Over Web Service)',
    riskImpact: 94,
    description:
      'Mass export of 1,420 privileged contract documents to unapproved personal cloud storage detected 3 days prior to planned departure.',
    recommendedRemediation:
      'Initiate immediate credential revocation, isolate local workstation WS-LEG-014, and alert Corporate Legal Compliance.',
    timeline: [
      {
        id: 'EVT-901-1',
        time: '10m ago',
        title: 'Cloud Storage Synchronizer Transfer',
        severity: 'Critical',
        sensor: 'Network DLP Gateway',
        details: '1.2 GB encrypted payload transferred to non-corporate Dropbox endpoint.'
      },
      {
        id: 'EVT-901-2',
        time: '25m ago',
        title: 'Bulk Document Export',
        severity: 'High',
        sensor: 'DocuShare Audit Service',
        details: 'Batch download of 1,420 files with confidentiality flag #LEGAL-RESTRICTED.'
      },
      {
        id: 'EVT-901-3',
        time: '45m ago',
        title: 'Removable USB Storage Mounted',
        severity: 'Medium',
        sensor: 'Host EDR Agent',
        details: 'SanDisk Ultra USB 3.0 flash drive attached to workstation WS-LEG-014.'
      }
    ]
  },
  {
    id: 'ALT-884',
    title: 'Anomalous Time Authentication',
    severity: 'High',
    status: 'Investigating',
    time: '2h ago',
    target: 'John Carter (ID 101)',
    employeeId: '101',
    department: 'Finance',
    category: 'Credential Anomaly',
    sensor: 'Okta Adaptive MFA & VPN Gateway',
    mitreTechnique: 'T1078 (Valid Accounts / Impossible Travel)',
    riskImpact: 87,
    description:
      'Successful authentication to internal financial applications originating from Berlin VPN exit node at 03:14 AM local time after multiple brute-force failures.',
    recommendedRemediation:
      'Trigger MFA step-up authentication, terminate active web sessions, and contact the employee via verified out-of-band channel.',
    timeline: [
      {
        id: 'EVT-884-1',
        time: '2h ago',
        title: 'Session Established from New Geolocation',
        severity: 'High',
        sensor: 'Okta Identity Engine',
        details: 'Authenticated from IP 194.26.29.4 (Berlin, Germany) — user typically connects from Frankfurt.'
      },
      {
        id: 'EVT-884-2',
        time: '2h 15m ago',
        title: 'Consecutive Failed Passcode Attempts',
        severity: 'High',
        sensor: 'Cisco AnyConnect VPN',
        details: '5 failed login attempts in 120 seconds followed by sudden authentication.'
      },
      {
        id: 'EVT-884-3',
        time: '2h 30m ago',
        title: 'Unrecognized Device Fingerprint',
        severity: 'Medium',
        sensor: 'Endpoint Posture Check',
        details: 'Device token mismatch: Chrome 124 on macOS 14.1 (Registered device is Windows 11 Enterprise).'
      }
    ]
  },
  {
    id: 'ALT-872',
    title: 'Bulk File Download',
    severity: 'Medium',
    status: 'Resolved',
    time: '1d ago',
    target: 'David Kim (ID 102)',
    employeeId: '102',
    department: 'DevOps',
    category: 'Data Movement',
    sensor: 'Internal Git Repository Monitor',
    mitreTechnique: 'T1213 (Data from Information Repositories)',
    riskImpact: 62,
    description:
      'Cloned 18 private infrastructure code repositories in under 4 minutes. Analyst verified scheduled CI/CD migration script.',
    recommendedRemediation:
      'Validated authorized migration ticket JIRA-INFRA-4892. Retain audit record for quarterly security review.',
    timeline: [
      {
        id: 'EVT-872-1',
        time: '1d ago',
        title: 'Investigation Closed - Legitimate Action',
        severity: 'Low',
        sensor: 'SOC Triage Console',
        details: 'Analyst verified change request ticket JIRA-INFRA-4892. Alert marked Resolved.'
      },
      {
        id: 'EVT-872-2',
        time: '1d 2h ago',
        title: 'Rapid Repository Cloning Pattern',
        severity: 'Medium',
        sensor: 'GitLab Enterprise Audit',
        details: '18 Git repositories cloned via personal access token within 240 seconds.'
      }
    ]
  },
  {
    id: 'ALT-865',
    title: 'Privilege Scope Escalation',
    severity: 'High',
    status: 'Unresolved',
    time: '1d ago',
    target: 'Sarah Jenkins (ID 105)',
    employeeId: '105',
    department: 'Engineering',
    category: 'Privilege Abuse',
    sensor: 'AWS CloudTrail Event Guard',
    mitreTechnique: 'T1098 (Account Manipulation / IAM)',
    riskImpact: 81,
    description:
      'Attached AdministratorAccess policy to a secondary IAM test role without peer approval or change advisory authorization.',
    recommendedRemediation:
      'Detach AdministratorAccess policy, revert role policy to least-privilege boundary, and audit CloudTrail logs for API executions.',
    timeline: [
      {
        id: 'EVT-865-1',
        time: '1d ago',
        title: 'IAM Policy Attached to Service Role',
        severity: 'High',
        sensor: 'AWS CloudTrail',
        details: 'AttachRolePolicy executed on arn:aws:iam::123456789012:role/DevTestRole.'
      },
      {
        id: 'EVT-865-2',
        time: '1d 1h ago',
        title: 'AWS Console Sign-in from Non-Office Network',
        severity: 'Low',
        sensor: 'AWS SSO',
        details: 'Interactive web console session established from residential broadband IP.'
      }
    ]
  },
  {
    id: 'ALT-854',
    title: 'Off-Hours SSH Session to Production',
    severity: 'Medium',
    status: 'Investigating',
    time: '2d ago',
    target: 'Elena Rostova (ID 109)',
    employeeId: '109',
    department: 'DevOps',
    category: 'Off-Hours Activity',
    sensor: 'Teleport Access Proxy',
    mitreTechnique: 'T1021.004 (Remote Services: SSH)',
    riskImpact: 58,
    description:
      'Direct root shell established to core production database bastion at 02:40 AM outside authorized deployment windows.',
    recommendedRemediation:
      'Review recorded terminal session playback, confirm if related to incident response, and verify key expiration.',
    timeline: [
      {
        id: 'EVT-854-1',
        time: '2d ago',
        title: 'Root Shell Session Initiated',
        severity: 'Medium',
        sensor: 'Teleport SSH Proxy',
        details: 'Interactive terminal session to prod-db-primary (Session ID: tp-8849-ab).'
      },
      {
        id: 'EVT-854-2',
        time: '2d 10m ago',
        title: 'Emergency Bastion Access Claimed',
        severity: 'Low',
        sensor: 'PagerDuty On-Call Sync',
        details: 'User acknowledged critical database latency alert prior to logging in.'
      }
    ]
  },
  {
    id: 'ALT-839',
    title: 'Excessive PII Directory Access',
    severity: 'Medium',
    status: 'Resolved',
    time: '3d ago',
    target: 'Marcus Vance (ID 112)',
    employeeId: '112',
    department: 'HR',
    category: 'Policy Violation',
    sensor: 'Workday Audit Telemetry',
    mitreTechnique: 'T1005 (Data from Local System)',
    riskImpact: 45,
    description:
      'Accessed 240 employee compensation records in single session. Confirmed as scheduled annual compensation review cycle.',
    recommendedRemediation:
      'Logged justification in HR compliance audit register. Verified authorization with Head of People.',
    timeline: [
      {
        id: 'EVT-839-1',
        time: '3d ago',
        title: 'Compensation Review Cycle Validated',
        severity: 'Low',
        sensor: 'SOC Analyst Notes',
        details: 'HR leadership verified scheduled Q3 compensation calibration. Case closed.'
      },
      {
        id: 'EVT-839-2',
        time: '3d 4h ago',
        title: 'Bulk Payroll Record Query',
        severity: 'Medium',
        sensor: 'Workday API Gate',
        details: 'Queried salary and bonus data across all North American personnel.'
      }
    ]
  },
  {
    id: 'ALT-820',
    title: 'Mass Source Repository Cloning',
    severity: 'Low',
    status: 'Resolved',
    time: '5d ago',
    target: 'Alex Chen (ID 108)',
    employeeId: '108',
    department: 'Engineering',
    category: 'Data Movement',
    sensor: 'GitHub Enterprise Audit',
    mitreTechnique: 'T1213 (Data from Information Repositories)',
    riskImpact: 28,
    description:
      'Automated script cloned multiple microservice repositories during local Docker environment initialization.',
    recommendedRemediation:
      'Confirmed developer setup script was configured to mirror team dependencies locally.',
    timeline: [
      {
        id: 'EVT-820-1',
        time: '5d ago',
        title: 'Setup Script Whitelisted',
        severity: 'Low',
        sensor: 'SOC Triage Console',
        details: 'Added local setup script signature to benign developer activity baseline.'
      }
    ]
  }
];
