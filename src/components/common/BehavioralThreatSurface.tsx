import React, { useState } from 'react';
import { 
  Share2, 
  ShieldAlert, 
  Users, 
  Laptop, 
  Database, 
  Cloud, 
  HardDrive, 
  Maximize2, 
  Lock,
  Activity,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const BehavioralThreatSurface: React.FC = () => {
  const { 
    threatNodes, 
    threatLinks, 
    selectedEmployee, 
    setSelectedEmployeeId,
    openContainmentModal,
    setActiveNav 
  } = useSecurity();

  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-emp-1042');
  const [filterType, setFilterType] = useState<string>('ALL');

  const selectedNode = threatNodes.find(n => n.id === selectedNodeId) || threatNodes[0];

  const getNodeColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return '#FF334B';
      case 'HIGH': return '#FF7043';
      case 'MEDIUM': return '#F5A623';
      default: return '#18E66A';
    }
  };

  return (
    <div className="cyber-panel rounded-xl p-4 font-mono shadow-2xl flex flex-col justify-between select-none">
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#18E66A]/20 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#18E66A]/15 border border-[#18E66A]/30 text-[#2DFF78]">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
              BEHAVIORAL THREAT SURFACE
            </h2>
            <p className="text-[10px] text-[#8CA798]">
              Interactive Graph: Identities, Endpoints, Cloud Buckets & Exfiltration Vectors
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 text-[10px]">
          {['ALL', 'CRITICAL', 'IDENTITIES', 'RESOURCES'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2 py-1 rounded border transition-colors ${
                filterType === f
                  ? 'bg-[#18E66A]/20 text-[#2DFF78] border-[#18E66A]/50 font-bold shadow-[0_0_6px_rgba(24,230,106,0.3)]'
                  : 'bg-[#0A1C13] text-[#8CA798] border-[#18E66A]/20 hover:text-[#E8FFF0]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Network Graph SVG Canvas */}
      <div className="relative w-full h-80 bg-[#020605] rounded-xl border border-[#18E66A]/25 overflow-hidden flex items-center justify-center">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />

        <svg className="w-full h-full" viewBox="0 0 800 450">
          
          {/* Animated Connecting Links */}
          <g className="links">
            {/* Center Authar Morgan (400, 225) to S3 (620, 120) */}
            <line x1="400" y1="225" x2="620" y2="120" stroke="#FF334B" strokeWidth="2.5" strokeDasharray="6,4" className="animate-pulse" />
            
            {/* Authar Morgan to USB Storage (620, 310) */}
            <line x1="400" y1="225" x2="620" y2="310" stroke="#FF7043" strokeWidth="2" strokeDasharray="4,4" />

            {/* Authar Morgan to Vault KMS (220, 120) */}
            <line x1="400" y1="225" x2="220" y2="120" stroke="#FF7043" strokeWidth="1.8" />

            {/* Jordan Lee (180, 290) to DC-01 (180, 400) */}
            <line x1="180" y1="290" x2="180" y2="390" stroke="#FF334B" strokeWidth="2" strokeDasharray="5,3" />

            {/* Marcus Wilson (500, 390) to CRM DB (660, 400) */}
            <line x1="500" y1="390" x2="660" y2="400" stroke="#FF334B" strokeWidth="2" strokeDasharray="4,4" />

            {/* Elena Rostova (320, 380) to CRM DB (660, 400) */}
            <line x1="320" y1="380" x2="660" y2="400" stroke="#18E66A" strokeWidth="1" opacity="0.4" />
          </g>

          {/* Nodes Rendering */}
          
          {/* CENTER NODE: Authar Morgan (EMP-1042) */}
          <g 
            transform="translate(400, 225)" 
            className="cursor-pointer"
            onClick={() => {
              setSelectedNodeId('node-emp-1042');
              setSelectedEmployeeId('EMP-1042');
            }}
          >
            <circle r="36" fill="#0A1C13" stroke="#FF7043" strokeWidth="3" className="animate-pulse" />
            <circle r="42" fill="none" stroke="#FF7043" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
            <text textAnchor="middle" y="-6" fill="#E8FFF0" fontSize="11" fontWeight="bold" fontFamily="monospace">Authar Morgan</text>
            <text textAnchor="middle" y="8" fill="#FF7043" fontSize="10" fontWeight="bold" fontFamily="monospace">EMP-1042 (78/100)</text>
            <text textAnchor="middle" y="20" fill="#8CA798" fontSize="8" fontFamily="monospace">HIGH RISK</text>
          </g>

          {/* Node: S3 Untrusted Bucket */}
          <g 
            transform="translate(620, 120)" 
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('node-res-s3')}
          >
            <rect x="-65" y="-22" width="130" height="44" rx="8" fill="#07140E" stroke="#FF334B" strokeWidth="2" />
            <text textAnchor="middle" y="-4" fill="#FF334B" fontSize="10" fontWeight="bold" fontFamily="monospace">s3://temp-sync-8841</text>
            <text textAnchor="middle" y="10" fill="#8CA798" fontSize="8" fontFamily="monospace">12.4GB Egress (CRITICAL)</text>
          </g>

          {/* Node: USB Storage */}
          <g 
            transform="translate(620, 310)" 
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('node-res-usb')}
          >
            <rect x="-60" y="-20" width="120" height="40" rx="8" fill="#07140E" stroke="#FF7043" strokeWidth="1.5" />
            <text textAnchor="middle" y="-4" fill="#FF7043" fontSize="10" fontWeight="bold" fontFamily="monospace">SanDisk USB 3.0</text>
            <text textAnchor="middle" y="10" fill="#8CA798" fontSize="8" fontFamily="monospace">4.8GB Hardware Copy</text>
          </g>

          {/* Node: Vault KMS */}
          <g 
            transform="translate(220, 120)" 
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('node-res-vault')}
          >
            <rect x="-60" y="-20" width="120" height="40" rx="8" fill="#07140E" stroke="#FF7043" strokeWidth="1.5" />
            <text textAnchor="middle" y="-4" fill="#FF7043" fontSize="10" fontWeight="bold" fontFamily="monospace">Vault KMS Secrets</text>
            <text textAnchor="middle" y="10" fill="#8CA798" fontSize="8" fontFamily="monospace">Master Key Export</text>
          </g>

          {/* Node: Jordan Lee (EMP-1091) */}
          <g 
            transform="translate(180, 290)" 
            className="cursor-pointer"
            onClick={() => {
              setSelectedNodeId('node-emp-1091');
              setSelectedEmployeeId('EMP-1091');
            }}
          >
            <circle r="26" fill="#0A1C13" stroke="#FF7043" strokeWidth="2" />
            <text textAnchor="middle" y="-2" fill="#E8FFF0" fontSize="9" fontWeight="bold" fontFamily="monospace">Jordan Lee</text>
            <text textAnchor="middle" y="10" fill="#FF7043" fontSize="8" fontWeight="bold" fontFamily="monospace">EMP-1091 (78)</text>
          </g>

          {/* Node: Active Directory DC-01 */}
          <g 
            transform="translate(180, 390)" 
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('node-res-dc01')}
          >
            <rect x="-55" y="-18" width="110" height="36" rx="6" fill="#07140E" stroke="#FF334B" strokeWidth="1.8" />
            <text textAnchor="middle" y="-2" fill="#FF334B" fontSize="9" fontWeight="bold" fontFamily="monospace">DC-01 AD Root</text>
            <text textAnchor="middle" y="10" fill="#8CA798" fontSize="8" fontFamily="monospace">Forged Golden Ticket</text>
          </g>

          {/* Node: Marcus Wilson */}
          <g 
            transform="translate(500, 390)" 
            className="cursor-pointer"
            onClick={() => {
              setSelectedNodeId('node-emp-1033');
              setSelectedEmployeeId('EMP-1033');
            }}
          >
            <circle r="26" fill="#0A1C13" stroke="#FF334B" strokeWidth="2" />
            <text textAnchor="middle" y="-2" fill="#E8FFF0" fontSize="9" fontWeight="bold" fontFamily="monospace">Marcus Wilson</text>
            <text textAnchor="middle" y="10" fill="#FF334B" fontSize="8" fontWeight="bold" fontFamily="monospace">EMP-1033 (82)</text>
          </g>

          {/* Node: Customer CRM DB */}
          <g 
            transform="translate(660, 400)" 
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('node-res-crm')}
          >
            <rect x="-55" y="-18" width="110" height="36" rx="6" fill="#07140E" stroke="#FF334B" strokeWidth="1.8" />
            <text textAnchor="middle" y="-2" fill="#FF334B" fontSize="9" fontWeight="bold" fontFamily="monospace">Customer PII DB</text>
            <text textAnchor="middle" y="10" fill="#8CA798" fontSize="8" fontFamily="monospace">14.2k Dumped Records</text>
          </g>
        </svg>

        {/* Floating Inspector Panel for Authar Morgan / Selected Node */}
        <div className="absolute top-3 left-3 bg-[#0A1C13]/90 border border-[#18E66A]/40 rounded-lg p-2.5 max-w-xs shadow-xl backdrop-blur-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#E8FFF0] text-xs">SELECTED NODE:</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold" style={{ backgroundColor: `${getNodeColor(selectedNode.threatLevel)}25`, color: getNodeColor(selectedNode.threatLevel) }}>
              {selectedNode.threatLevel}
            </span>
          </div>

          <div className="text-[11px] font-bold text-[#2DFF78]">{selectedNode.label}</div>

          <div className="space-y-0.5 text-[10px] text-[#8CA798]">
            <div className="flex justify-between"><span>Risk Score:</span><strong className="text-[#FF7043]">{selectedNode.riskScore} / 100</strong></div>
            <div className="flex justify-between"><span>Deviation:</span><strong className="text-[#E8FFF0]">+{selectedNode.behaviorDeviation}% vs baseline</strong></div>
            <div className="flex justify-between"><span>Last Activity:</span><span>{selectedNode.lastActivity}</span></div>
            {selectedNode.device && <div className="flex justify-between"><span>Host:</span><span className="text-[#73FFA5]">{selectedNode.device}</span></div>}
          </div>

          {selectedNode.anomalyDetails && (
            <p className="text-[9px] text-[#FF7043] bg-[#020605] p-1.5 rounded border border-[#FF7043]/30 leading-tight">
              {selectedNode.anomalyDetails}
            </p>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => openContainmentModal(selectedNode.id, 'ISOLATE')}
              className="w-full py-1 rounded bg-[#FF334B] hover:bg-[#FF334B]/80 text-white font-bold text-[10px] shadow-sm transition-colors text-center"
            >
              QUARANTINE HOST
            </button>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="pt-2 text-[10px] text-[#8CA798] flex items-center justify-between border-t border-[#18E66A]/15 mt-2">
        <span>Target: Authar Morgan (EMP-1042) • DESKTOP-7G8H2</span>
        <span className="text-[#2DFF78]">Real-time Topological Graph Synced</span>
      </div>

    </div>
  );
};
