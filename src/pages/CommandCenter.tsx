import React from 'react';
import { TopKpiRow } from '../components/common/TopKpiRow';
import { BehavioralThreatSurface } from '../components/common/BehavioralThreatSurface';
import { AIRiskEnginePanel } from '../components/common/AIRiskEnginePanel';
import { RiskTrendChart } from '../components/common/RiskTrendChart';
import { LiveActivityPanel } from '../components/common/LiveActivityPanel';
import { GlobalThreatMap } from '../components/common/GlobalThreatMap';
import { ThreatIntelOverview } from '../components/common/ThreatIntelOverview';
import { MitreMatrix } from '../components/common/MitreMatrix';
import { AICodingConsole } from '../components/common/AICodingConsole';
import { SentinelCopilot } from '../components/copilot/SentinelCopilot';
import { RiskAlertsPanel } from '../components/common/RiskAlertsPanel';

export const CommandCenter: React.FC = () => {
  return (
    <div className="space-y-4 pb-12 font-mono">
      
      {/* 1. TOP KPI ROW (Section 9) */}
      <TopKpiRow />

      {/* 2. BEHAVIORAL THREAT SURFACE + AI RISK ENGINE (Section 10 & 11) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <BehavioralThreatSurface />
        </div>
        <div className="lg:col-span-4">
          <AIRiskEnginePanel />
        </div>
      </div>

      {/* 3. RISK TREND + RISK DISTRIBUTION + TOP RISKY USERS (Section 12) */}
      <RiskTrendChart />

      {/* 4. LIVE ACTIVITY STREAM + GLOBAL THREAT MAP (Section 13 & 14) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6">
          <LiveActivityPanel />
        </div>
        <div className="lg:col-span-6">
          <GlobalThreatMap />
        </div>
      </div>

      {/* 5. THREAT INTELLIGENCE OVERVIEW & FEED (Section 15 & 16) */}
      <ThreatIntelOverview />

      {/* 6. MITRE ATT&CK MATRIX (Section 17) */}
      <MitreMatrix />

      {/* 7. SENTINEL COPILOT & AI CODING CONSOLE & MODEL STATUS (Section 18, 19, 20) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <SentinelCopilot />
        </div>
        <div className="lg:col-span-8">
          <AICodingConsole />
        </div>
      </div>

      {/* 8. ACTIVE RISK ALERTS (Section 21) */}
      <RiskAlertsPanel />

    </div>
  );
};
