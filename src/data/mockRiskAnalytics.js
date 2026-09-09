// ================= MOCK RISK & BEHAVIORAL ANALYTICS DATA =================

export const trajectory7d = [
  { date: 'Sep 03', compositeScore: 18, anomalies: 8, mitigated: 2 },
  { date: 'Sep 04', compositeScore: 17, anomalies: 6, mitigated: 3 },
  { date: 'Sep 05', compositeScore: 19, anomalies: 11, mitigated: 4 },
  { date: 'Sep 06', compositeScore: 16, anomalies: 7, mitigated: 2 },
  { date: 'Sep 07', compositeScore: 15, anomalies: 5, mitigated: 3 },
  { date: 'Sep 08', compositeScore: 16, anomalies: 9, mitigated: 5 },
  { date: 'Sep 09', compositeScore: 14, anomalies: 4, mitigated: 4 }
];

export const trajectory30d = [
  { date: 'Aug 11', compositeScore: 24, anomalies: 14, mitigated: 6 },
  { date: 'Aug 13', compositeScore: 22, anomalies: 12, mitigated: 5 },
  { date: 'Aug 15', compositeScore: 25, anomalies: 18, mitigated: 8 },
  { date: 'Aug 17', compositeScore: 21, anomalies: 10, mitigated: 4 },
  { date: 'Aug 19', compositeScore: 23, anomalies: 15, mitigated: 7 },
  { date: 'Aug 21', compositeScore: 20, anomalies: 9, mitigated: 5 },
  { date: 'Aug 23', compositeScore: 22, anomalies: 13, mitigated: 6 },
  { date: 'Aug 25', compositeScore: 19, anomalies: 8, mitigated: 4 },
  { date: 'Aug 27', compositeScore: 21, anomalies: 11, mitigated: 5 },
  { date: 'Aug 29', compositeScore: 18, anomalies: 7, mitigated: 3 },
  { date: 'Aug 31', compositeScore: 19, anomalies: 10, mitigated: 6 },
  { date: 'Sep 02', compositeScore: 17, anomalies: 6, mitigated: 4 },
  { date: 'Sep 04', compositeScore: 16, anomalies: 8, mitigated: 5 },
  { date: 'Sep 06', compositeScore: 15, anomalies: 5, mitigated: 3 },
  { date: 'Sep 09', compositeScore: 14, anomalies: 4, mitigated: 4 }
];

export const trajectory90d = [
  { date: 'Week 1', compositeScore: 28, anomalies: 42, mitigated: 18 },
  { date: 'Week 2', compositeScore: 26, anomalies: 38, mitigated: 15 },
  { date: 'Week 3', compositeScore: 29, anomalies: 48, mitigated: 22 },
  { date: 'Week 4', compositeScore: 25, anomalies: 35, mitigated: 14 },
  { date: 'Week 5', compositeScore: 24, anomalies: 32, mitigated: 16 },
  { date: 'Week 6', compositeScore: 22, anomalies: 28, mitigated: 12 },
  { date: 'Week 7', compositeScore: 23, anomalies: 31, mitigated: 15 },
  { date: 'Week 8', compositeScore: 20, anomalies: 24, mitigated: 11 },
  { date: 'Week 9', compositeScore: 19, anomalies: 22, mitigated: 10 },
  { date: 'Week 10', compositeScore: 18, anomalies: 20, mitigated: 9 },
  { date: 'Week 11', compositeScore: 16, anomalies: 17, mitigated: 8 },
  { date: 'Week 12', compositeScore: 14, anomalies: 14, mitigated: 7 }
];

export const threatVectorsBenchmark = [
  { vector: 'Data Exfiltration', observed: 42, baseline: 12, riskImpact: 'Critical' },
  { vector: 'Anomalous Auth', observed: 18, baseline: 6, riskImpact: 'High' },
  { vector: 'Privilege Escalation', observed: 9, baseline: 3, riskImpact: 'Medium' },
  { vector: 'Off-Hours Access', observed: 15, baseline: 5, riskImpact: 'Medium' },
  { vector: 'Removable Storage', observed: 7, baseline: 2, riskImpact: 'Low' }
];

export const threatSeverityStats = {
  activeThreatVectors: 5,
  mitigatedThisMonth: 84,
  meanTimeToDetect: '14 min',
  meanTimeToContain: '42 min'
};
