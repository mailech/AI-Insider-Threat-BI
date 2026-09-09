// ================= MOCK NOTIFICATION TELEMETRY =================

export const initialNotifications = [
  {
    id: 'NOTIF-101',
    title: 'Critical Security Incident Triggered',
    message: 'Unauthorized Data Export detected for Priya Nair (ID 104) on WS-LEG-014.',
    time: '12m ago',
    type: 'alert',
    severity: 'Critical',
    read: false,
    targetId: '104',
    link: '/alerts'
  },
  {
    id: 'NOTIF-102',
    title: 'Anomalous Geolocation Authentication',
    message: 'John Carter (ID 101) authenticated via Berlin VPN exit node outside standard hours.',
    time: '2h ago',
    type: 'risk',
    severity: 'High',
    read: false,
    targetId: '101',
    link: '/alerts'
  },
  {
    id: 'NOTIF-103',
    title: 'High-Risk Escalation Benchmark Exceeded',
    message: 'Sarah Jenkins (ID 105) threat score reached 81 after IAM role manipulation.',
    time: '4h ago',
    type: 'risk',
    severity: 'High',
    read: false,
    targetId: '105',
    link: '/employees/105'
  },
  {
    id: 'NOTIF-104',
    title: 'SOC Containment Directive Executed',
    message: 'Credential access suspended for workstation WS-DEV-042 following automated quarantine rule.',
    time: '1d ago',
    type: 'system',
    severity: 'Medium',
    read: true,
    targetId: null,
    link: '/settings'
  },
  {
    id: 'NOTIF-105',
    title: 'Incident Mitigated & Closed',
    message: 'Bulk file download investigation for David Kim (ID 102) marked as legitimate CI/CD action.',
    time: '1d ago',
    type: 'alert',
    severity: 'Low',
    read: true,
    targetId: '102',
    link: '/alerts'
  },
  {
    id: 'NOTIF-106',
    title: 'Behavioral Baseline Calibrated',
    message: 'Weekly UEBA anomaly scoring algorithms updated against 30-day baseline data.',
    time: '2d ago',
    type: 'system',
    severity: 'Low',
    read: true,
    targetId: null,
    link: '/analytics'
  }
];
