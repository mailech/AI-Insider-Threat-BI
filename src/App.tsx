import React, { useEffect } from 'react';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import { TopCommandBar } from './components/layout/TopCommandBar';
import { SecondaryNav } from './components/layout/SecondaryNav';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { BottomStatusBar } from './components/layout/BottomStatusBar';
import { CommandPalette } from './components/layout/CommandPalette';
import { ContainmentModal } from './components/common/ContainmentModal';

// Pages
import { CommandCenter } from './pages/CommandCenter';
import { BehavioralThreatMap } from './pages/BehavioralThreatMap';
import { AIRiskEngine } from './pages/AIRiskEngine';
import { LiveTelemetry } from './pages/LiveTelemetry';
import { EmployeeIntelligence } from './pages/EmployeeIntelligence';
import { AnomalyIntelligence } from './pages/AnomalyIntelligence';
import { InvestigationWorkspace } from './pages/InvestigationWorkspace';
import { AlertCenter } from './pages/AlertCenter';
import { IncidentManagement } from './pages/IncidentManagement';
import { UEBAAnalytics } from './pages/UEBAAnalytics';
import { RiskAnalytics } from './pages/RiskAnalytics';
import { ReportingCenter } from './pages/ReportingCenter';
import { DataSources } from './pages/DataSources';
import { AIModelsPipeline } from './pages/AIModelsPipeline';
import { SecurityMetrics } from './pages/SecurityMetrics';
import { Administration } from './pages/Administration';

const MainLayout: React.FC = () => {
  const { activeNav, setIsCommandPaletteOpen, sidebarWidth } = useSecurity();

  // Keyboard shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen]);

  const renderActiveView = () => {
    switch (activeNav) {
      case 'command-center':
        return <CommandCenter />;
      case 'threat-detection':
      case 'threat-map':
        return <BehavioralThreatMap />;
      case 'risk-intelligence':
      case 'ai-risk-engine':
        return <AIRiskEngine />;
      case 'telemetry':
        return <LiveTelemetry />;
      case 'employees':
        return <EmployeeIntelligence />;
      case 'anomalies':
        return <AnomalyIntelligence />;
      case 'investigation':
        return <InvestigationWorkspace />;
      case 'alerts':
        return <AlertCenter />;
      case 'incidents':
        return <IncidentManagement />;
      case 'ueba':
        return <UEBAAnalytics />;
      case 'risk-analytics':
        return <RiskAnalytics />;
      case 'reports':
        return <ReportingCenter />;
      case 'data-sources':
        return <DataSources />;
      case 'ai-models':
        return <AIModelsPipeline />;
      case 'security-metrics':
        return <SecurityMetrics />;
      case 'admin':
        return <Administration />;
      default:
        return <CommandCenter />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020605] text-[#E8FFF0] font-mono selection:bg-[#18E66A] selection:text-[#020605] overflow-x-hidden">
      
      {/* 1. ADJUSTABLE LEFT SIDEBAR (Fixed Drawer / Icon Rail / Resizable) */}
      <LeftSidebar />

      {/* 2. RIGHT CONTENT WRAPPER: Perfectly aligned with dynamic sidebar width */}
      <div 
        className="flex flex-col min-h-screen transition-[margin-left] duration-200 ease-out"
        style={{
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${sidebarWidth}px` : '0px',
          width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `calc(100% - ${sidebarWidth}px)` : '100%'
        }}
      >
        {/* Sticky Top Headers */}
        <div className="sticky top-0 z-30 bg-[#020605] flex flex-col">
          <TopCommandBar />
          <SecondaryNav />
        </div>

        {/* Dynamic Main Viewport Canvas */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-[1920px] w-full mx-auto pb-16">
          {renderActiveView()}
        </main>
      </div>

      {/* 3. BOTTOM TELEMETRY STATUS BAR */}
      <BottomStatusBar />

      {/* 4. GLOBAL COMMAND PALETTE (Cmd+K) */}
      <CommandPalette />

      {/* 5. QUARANTINE & CONTAINMENT MODAL */}
      <ContainmentModal />

    </div>
  );
};

export function App() {
  return (
    <SecurityProvider>
      <MainLayout />
    </SecurityProvider>
  );
}

export default App;
