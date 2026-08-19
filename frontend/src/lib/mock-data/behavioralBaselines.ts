import { BehavioralBaseline } from "../types";

export const MOCK_BEHAVIORAL_BASELINES: BehavioralBaseline[] = [
  {
    employeeId: "EMP-001",
    typicalLoginWindow: "08:00 - 09:30",
    typicalWorkingHours: "08:30 - 17:30",
    typicalDailyDataVolume: "1.2 GB",
    typicalDeviceCount: 2,
    typicalApplicationSet: ["Active Directory", "Exchange Server", "GitHub", "AWS Console"],
    workPattern: [
      { day: "Mon", hours: 8.5 },
      { day: "Tue", hours: 9.0 },
      { day: "Wed", hours: 8.0 },
      { day: "Thu", hours: 8.5 },
      { day: "Fri", hours: 7.5 },
      { day: "Sat", hours: 0 },
      { day: "Sun", hours: 1.0 }
    ]
  },
  {
    employeeId: "EMP-045",
    typicalLoginWindow: "09:00 - 10:00",
    typicalWorkingHours: "09:00 - 18:00",
    typicalDailyDataVolume: "350 MB",
    typicalDeviceCount: 1,
    typicalApplicationSet: ["SharePoint", "Google Drive", "Slack"],
    workPattern: [
      { day: "Mon", hours: 7.5 },
      { day: "Tue", hours: 8.0 },
      { day: "Wed", hours: 8.0 },
      { day: "Thu", hours: 8.0 },
      { day: "Fri", hours: 7.5 },
      { day: "Sat", hours: 0 },
      { day: "Sun", hours: 0 }
    ]
  },
  {
    employeeId: "EMP-012",
    typicalLoginWindow: "07:30 - 08:30",
    typicalWorkingHours: "08:00 - 17:00",
    typicalDailyDataVolume: "850 MB",
    typicalDeviceCount: 3,
    typicalApplicationSet: ["Corporate VPN", "Salesforce", "Exchange Server"],
    workPattern: [
      { day: "Mon", hours: 9.5 },
      { day: "Tue", hours: 9.0 },
      { day: "Wed", hours: 9.0 },
      { day: "Thu", hours: 8.5 },
      { day: "Fri", hours: 8.0 },
      { day: "Sat", hours: 2.5 },
      { day: "Sun", hours: 0 }
    ]
  }
];
