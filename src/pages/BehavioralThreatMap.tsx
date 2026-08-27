import React, { useState } from 'react';
import { 
  Share2, 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  ShieldAlert, 
  Lock, 
  Users, 
  Database, 
  Cloud, 
  HardDrive,
  CheckCircle2,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { BehavioralThreatSurface } from '../components/common/BehavioralThreatSurface';
import { AIRiskEnginePanel } from '../components/common/AIRiskEnginePanel';

export const BehavioralThreatMap: React.FC = () => {
  return (
    <div className="space-y-4 pb-12 font-mono">
      {/* Top Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                BEHAVIORAL THREAT SURFACE & ENTITY GRAPH
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                TOPOLOGICAL RESOLVER
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Graph neural network mapping identities to cloud storage, KMS secrets, active directory, and peripheral hardware.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <BehavioralThreatSurface />
        </div>
        <div className="lg:col-span-4">
          <AIRiskEnginePanel />
        </div>
      </div>
    </div>
  );
};
