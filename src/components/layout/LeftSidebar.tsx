import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Users, 
  Laptop, 
  Flame, 
  Bell, 
  BrainCircuit, 
  Share2, 
  Workflow, 
  BarChart3, 
  FileText, 
  ShieldCheck, 
  Sliders, 
  Radio, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Crosshair,
  Lock,
  Globe,
  Bug,
  Compass,
  Search,
  GripVertical,
  X,
  LucideIcon
} from 'lucide-react';
import { useSecurity, NavSection } from '../../context/SecurityContext';

interface SidebarItem {
  id: NavSection;
  label: string;
  icon: LucideIcon;
  badge?: string;
  live?: boolean;
  count?: number;
  countColor?: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export const LeftSidebar: React.FC = () => {
  const { 
    activeNav, 
    setActiveNav, 
    sidebarWidth, 
    setSidebarWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    alerts,
    incidents
  } = useSecurity();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const newAlertsCount = alerts.filter(a => a.status === 'NEW' || a.status === 'ESCALATED').length;
  const activeIncidentsCount = incidents.filter(i => i.status !== 'RESOLVED').length;

  const sections: SidebarSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'command-center', label: 'Command Center', icon: ShieldAlert, badge: 'MAIN' },
        { id: 'threat-map', label: 'Behavioral Threat Map', icon: Share2 },
        { id: 'risk-intelligence', label: 'Risk Intelligence', icon: BrainCircuit },
        { id: 'threat-detection', label: 'Threat Detection', icon: Flame },
        { id: 'ueba', label: 'UEBA Analytics', icon: Workflow },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'telemetry', label: 'Live Telemetry Feed', icon: Activity, live: true },
        { id: 'employees', label: 'Employee Profiles', icon: Users },
        { id: 'investigation', label: 'Investigation Workspace', icon: Crosshair },
        { id: 'incidents', label: 'Incidents Queue', icon: Flame, count: activeIncidentsCount, countColor: '#FF7043' },
        { id: 'alerts', label: 'Alert Center', icon: Bell, count: newAlertsCount, countColor: '#FF334B' },
      ]
    },
    {
      title: 'THREAT INTELLIGENCE',
      items: [
        { id: 'threat-intel', label: 'Intel Overview & IOCs', icon: Globe },
        { id: 'threat-detection', label: 'Threat Actors & Feed', icon: Radio },
        { id: 'anomalies', label: 'Anomaly Clustering', icon: Bug },
        { id: 'mitre', label: 'MITRE ATT&CK Matrix', icon: Compass },
      ]
    },
    {
      title: 'MANAGEMENT & SOC',
      items: [
        { id: 'reports', label: 'Reports & Audits', icon: FileText },
        { id: 'security-metrics', label: 'Security Metrics & SLA', icon: ShieldCheck },
        { id: 'data-sources', label: 'Ingestion Pipelines', icon: Database, badge: '14' },
        { id: 'ai-models', label: 'AI Models Pipeline', icon: BrainCircuit },
        { id: 'admin', label: 'Administration & Policy', icon: Sliders },
      ]
    }
  ];

  // Drag to resize functionality
  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsDragging(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isDragging) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth >= 56 && newWidth <= 380) {
        setSidebarWidth(newWidth);
        if (newWidth <= 80 && !isSidebarCollapsed) {
          setIsSidebarCollapsed(true);
        } else if (newWidth > 80 && isSidebarCollapsed) {
          setIsSidebarCollapsed(false);
        }
      }
    }
  }, [isDragging, isSidebarCollapsed, setIsSidebarCollapsed, setSidebarWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Double click handler on resize bar to quickly toggle width
  const handleDoubleClickResize = () => {
    if (isSidebarCollapsed || sidebarWidth <= 80) {
      setIsSidebarCollapsed(false);
      setSidebarWidth(240);
    } else {
      setIsSidebarCollapsed(true);
      setSidebarWidth(60);
    }
  };

  const isNarrow = sidebarWidth <= 80 || isSidebarCollapsed;

  // Filter sections by search query
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      !searchQuery.trim() || 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#040B08] border-r border-[#18E66A]/20 flex flex-col justify-between select-none font-mono text-xs transition-transform duration-200 ease-out shadow-[4px_0_24px_rgba(0,0,0,0.6)] ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isDragging ? 'transition-none select-none pointer-events-auto' : ''}`}
      >
        {/* Top Header inside Sidebar */}
        <div className="p-3 border-b border-[#18E66A]/20 flex items-center justify-between bg-[#020605] h-14 shrink-0">
          {!isNarrow ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded bg-[#18E66A]/20 border border-[#18E66A]/40 flex items-center justify-center text-[#2DFF78] shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-black text-xs text-[#E8FFF0] tracking-wider truncate">
                  SENTINEL SOC
                </span>
                <span className="text-[9px] text-[#4C7D60] font-bold truncate">
                  BEHAVIORAL AI v4.2
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="w-7 h-7 rounded bg-[#18E66A]/20 border border-[#18E66A]/40 flex items-center justify-center text-[#2DFF78]">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Mobile Close Button / Desktop Quick Collapse Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (isNarrow) {
                  setIsSidebarCollapsed(false);
                  setSidebarWidth(240);
                } else {
                  setIsSidebarCollapsed(true);
                  setSidebarWidth(60);
                }
              }}
              className="hidden md:flex p-1.5 rounded bg-[#07140E] hover:bg-[#0A1C13] text-[#8CA798] hover:text-[#2DFF78] border border-[#18E66A]/20 transition-colors"
              title={isNarrow ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isNarrow ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded bg-[#07140E] text-[#8CA798] hover:text-[#FF334B] border border-[#18E66A]/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Search inside Sidebar (only shown when expanded) */}
        {!isNarrow && (
          <div className="p-2 border-b border-[#18E66A]/15 bg-[#020605]/40 shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#07140E] border border-[#18E66A]/20 focus-within:border-[#18E66A]/50 transition-colors">
              <Search className="w-3.5 h-3.5 text-[#18E66A]" />
              <input
                type="text"
                placeholder="Filter tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-[11px] text-[#E8FFF0] placeholder-[#4C7D60] w-full focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[#8CA798] hover:text-[#FF334B] text-[10px]">
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-4 custom-scrollbar">
          {filteredSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isNarrow && (
                <div className="px-2 py-1 text-[9px] font-bold tracking-wider text-[#4C7D60] uppercase flex items-center justify-between">
                  <span>{section.title}</span>
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isActive = 
                    activeNav === item.id || 
                    (item.id === 'threat-map' && activeNav === 'threat-map') ||
                    (item.id === 'risk-intelligence' && activeNav === 'ai-risk-engine') ||
                    (item.id === 'telemetry' && activeNav === 'telemetry');

                  return (
                    <div 
                      key={`${sIdx}-${iIdx}`} 
                      className="relative"
                      onMouseEnter={() => setHoveredItem(item.label)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <button
                        onClick={() => {
                          setActiveNav(item.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all text-left group ${
                          isActive
                            ? 'bg-[#18E66A]/15 text-[#2DFF78] font-bold border border-[#18E66A]/40 shadow-[0_0_10px_rgba(24,230,106,0.15)]'
                            : 'text-[#8CA798] hover:text-[#E8FFF0] hover:bg-[#07140E] border border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-[#2DFF78]' : 'text-[#4C7D60]'}`} />

                        {!isNarrow && (
                          <div className="flex items-center justify-between w-full overflow-hidden">
                            <span className="truncate text-[11px] font-medium tracking-wide">
                              {item.label}
                            </span>

                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {item.live && (
                                <span className="w-2 h-2 rounded-full bg-[#18E66A] animate-ping" />
                              )}
                              {item.badge && (
                                <span className="px-1.5 py-0.2 rounded bg-[#07140E] border border-[#18E66A]/30 text-[9px] text-[#73FFA5] font-bold">
                                  {item.badge}
                                </span>
                              )}
                              {item.count !== undefined && item.count > 0 && (
                                <span 
                                  className="px-1.5 py-0.2 rounded font-bold text-[9px] border"
                                  style={{ 
                                    backgroundColor: `${item.countColor || '#18E66A'}20`, 
                                    color: item.countColor || '#18E66A',
                                    borderColor: `${item.countColor || '#18E66A'}40`
                                  }}
                                >
                                  {item.count}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </button>

                      {/* Floating Tooltip for Compact Rail */}
                      {isNarrow && hoveredItem === item.label && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded bg-[#020605] border border-[#18E66A]/50 text-[#2DFF78] text-[11px] font-bold whitespace-nowrap shadow-[0_0_12px_rgba(24,230,106,0.3)] z-50 pointer-events-none">
                          <div className="flex items-center gap-1.5">
                            <span>{item.label}</span>
                            {item.count !== undefined && item.count > 0 && (
                              <span className="px-1 rounded bg-[#FF334B]/20 text-[#FF334B] text-[9px]">
                                {item.count}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Status & Resize Hint */}
        <div className="p-2 border-t border-[#18E66A]/20 bg-[#020605] shrink-0">
          {!isNarrow ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-[#8CA798]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#18E66A] animate-pulse" />
                  <span>Sentinel SOC Engine</span>
                </span>
                <span className="text-[#2DFF78] font-bold">148 Features</span>
              </div>
              <button
                onClick={() => {
                  setIsSidebarCollapsed(true);
                  setSidebarWidth(60);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-[#07140E] hover:bg-[#0A1C13] text-[#73FFA5] hover:text-[#2DFF78] border border-[#18E66A]/25 text-[10px] font-bold transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Collapse to Icon Rail</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsSidebarCollapsed(false);
                setSidebarWidth(240);
              }}
              className="w-full flex items-center justify-center p-2 rounded bg-[#07140E] hover:bg-[#0A1C13] text-[#2DFF78] border border-[#18E66A]/25 transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Interactive Resize Handle on Right Edge */}
        <div
          onMouseDown={startResizing}
          onDoubleClick={handleDoubleClickResize}
          title="Drag to resize sidebar • Double click to toggle collapse"
          className={`absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-[#18E66A]/40 transition-colors z-50 group flex items-center justify-center ${
            isDragging ? 'bg-[#18E66A] shadow-[0_0_12px_#18E66A]' : ''
          }`}
        >
          <div className="w-0.5 h-8 rounded-full bg-[#18E66A]/30 group-hover:bg-[#18E66A] group-hover:h-16 transition-all" />
        </div>
      </aside>
    </>
  );
};
