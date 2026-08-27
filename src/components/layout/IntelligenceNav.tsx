import React from 'react';
import { 
  ShieldCheck, 
  Share2, 
  BrainCircuit, 
  Activity, 
  Users, 
  AlertTriangle, 
  Crosshair, 
  BellRing, 
  Flame, 
  LineChart, 
  BarChart3, 
  FileText, 
  Server, 
  Layers, 
  Gauge, 
  Sliders,
  Workflow
} from 'lucide-react';
import { useSecurity, NavSection } from '../../context/SecurityContext';

export const IntelligenceNav: React.FC = () => {
  const { activeNav, setActiveNav, unreadAlertCount, incidents } = useSecurity();

  const activeIncidentsCount = incidents.filter(i => i.status !== 'RESOLVED').length;

  const navGroups = [
    {
      label: 'COMMAND CENTER',
      items: [
        { id: 'command-center' as NavSection, label: 'Overview', icon: ShieldCheck },
        { id: 'threat-map' as NavSection, label: 'Threat Surface', icon: Share2, badge: 'GRAPH' },
        { id: 'ai-risk-engine' as NavSection, label: 'AI Risk Engine', icon: BrainCircuit },
        { id: 'anomalies' as NavSection, label: 'Anomalies', icon: AlertTriangle },
        { id: 'investigation' as NavSection, label: 'Investigation', icon: Crosshair },
        { id: 'ueba' as NavSection, label: 'UEBA Analytics', icon: Workflow },
      ]
    },
    {
      label: 'OPERATIONS',
      items: [
        { id: 'telemetry' as NavSection, label: 'Telemetry Stream', icon: Activity, pulse: true },
        { id: 'employees' as NavSection, label: 'Employees', icon: Users },
        { id: 'alerts' as NavSection, label: 'Alerts', icon: BellRing, count: unreadAlertCount },
        { id: 'incidents' as NavSection, label: 'Incidents', icon: Flame, count: activeIncidentsCount, countColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
      ]
    },
    {
      label: 'AI & METRICS',
      items: [
        { id: 'ml-pipeline' as NavSection, label: 'ML Pipeline', icon: Layers },
        { id: 'analytics' as NavSection, label: 'Risk Analytics', icon: BarChart3 },
        { id: 'security-metrics' as NavSection, label: 'SOC Metrics', icon: Gauge },
      ]
    },
    {
      label: 'MANAGEMENT',
      items: [
        { id: 'reports' as NavSection, label: 'Reports', icon: FileText },
        { id: 'data-sources' as NavSection, label: 'Integrations', icon: Server },
        { id: 'admin' as NavSection, label: 'Admin & RBAC', icon: Sliders },
      ]
    }
  ];

  return (
    <nav className="w-full bg-[#0a0812] border-b border-purple-900/30 px-3 lg:px-6 py-1.5 overflow-x-auto scrollbar-none">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4 min-w-max">
        <div className="flex items-center gap-4 lg:gap-6">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label} className="flex items-center gap-1">
              {groupIdx > 0 && (
                <div className="h-4 w-px bg-purple-900/40 mx-2" />
              )}
              <span className="hidden 2xl:inline-block text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-1 select-none">
                {group.label}
              </span>
              
              <div className="flex items-center gap-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-mono text-xs font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-900/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-purple-950/30 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-purple-300'}`} />
                      <span>{item.label}</span>

                      {item.pulse && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
                      )}

                      {item.badge && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-700/40 uppercase">
                          {item.badge}
                        </span>
                      )}

                      {typeof item.count === 'number' && item.count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ${
                          item.countColor || 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        }`}>
                          {item.count}
                        </span>
                      )}

                      {isActive && (
                        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
};
