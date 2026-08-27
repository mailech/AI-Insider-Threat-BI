import React from 'react';
import { 
  ShieldCheck, 
  Flame, 
  AlertTriangle, 
  Users, 
  Zap, 
  Activity,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { ScoreGauge } from './ScoreGauge';
import { useSecurity } from '../../context/SecurityContext';

export const TopKpiRow: React.FC = () => {
  const { setActiveNav } = useSecurity();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 font-mono select-none">
      
      {/* 1. SECURITY POSTURE RADIAL GAUGE (Section 9) */}
      <div 
        onClick={() => setActiveNav('command-center')}
        className="cyber-panel rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-[#18E66A]/50 transition-all shadow-xl"
      >
        <ScoreGauge score={87} label="SECURITY POSTURE" sublabel="+4.2% DoD" size={110} />
      </div>

      {/* 2. ACTIVE THREATS */}
      <div 
        onClick={() => setActiveNav('threat-detection')}
        className="cyber-panel rounded-xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-[#18E66A]/50 transition-all shadow-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8CA798] uppercase tracking-wider">
            ACTIVE THREATS
          </span>
          <div className="p-1 rounded bg-[#FF334B]/20 text-[#FF334B] border border-[#FF334B]/30">
            <Flame className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-1">
          <div className="text-2xl font-black text-[#FF334B]">17</div>
          <div className="text-[10px] text-[#FF7043] font-bold flex items-center gap-1">
            <span>▲ +2 Critical active</span>
          </div>
        </div>

        <div className="text-[9px] text-[#8CA798] border-t border-[#18E66A]/15 pt-1.5 flex justify-between items-center">
          <span>Authar Morgan cluster</span>
          <ArrowUpRight className="w-3 h-3 text-[#18E66A]" />
        </div>
      </div>

      {/* 3. CRITICAL INCIDENTS */}
      <div 
        onClick={() => setActiveNav('incidents')}
        className="cyber-panel rounded-xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-[#18E66A]/50 transition-all shadow-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8CA798] uppercase tracking-wider">
            CRITICAL INCIDENTS
          </span>
          <div className="p-1 rounded bg-[#FF7043]/20 text-[#FF7043] border border-[#FF7043]/30">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-1">
          <div className="text-2xl font-black text-[#FF7043]">03</div>
          <div className="text-[10px] text-[#E8FFF0] font-bold">
            1 Investigating • 2 Triaged
          </div>
        </div>

        <div className="text-[9px] text-[#8CA798] border-t border-[#18E66A]/15 pt-1.5 flex justify-between items-center">
          <span>INC-2026-0891 Root</span>
          <ArrowUpRight className="w-3 h-3 text-[#18E66A]" />
        </div>
      </div>

      {/* 4. HIGH RISK USERS */}
      <div 
        onClick={() => setActiveNav('employees')}
        className="cyber-panel rounded-xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-[#18E66A]/50 transition-all shadow-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8CA798] uppercase tracking-wider">
            HIGH RISK USERS
          </span>
          <div className="p-1 rounded bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-1">
          <div className="text-2xl font-black text-[#F5A623]">08</div>
          <div className="text-[10px] text-[#FF334B] font-bold">
            +3 today (Authar #1)
          </div>
        </div>

        <div className="text-[9px] text-[#8CA798] border-t border-[#18E66A]/15 pt-1.5 flex justify-between items-center">
          <span>1,420 Total Monitored</span>
          <ArrowUpRight className="w-3 h-3 text-[#18E66A]" />
        </div>
      </div>

      {/* 5. ANOMALIES / HR */}
      <div 
        onClick={() => setActiveNav('threat-detection')}
        className="cyber-panel rounded-xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-[#18E66A]/50 transition-all shadow-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8CA798] uppercase tracking-wider">
            ANOMALIES / HR
          </span>
          <div className="p-1 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/30">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-1">
          <div className="text-2xl font-black text-[#2DFF78]">12.4K</div>
          <div className="text-[10px] text-[#73FFA5] font-bold">
            96.4% AI Precision
          </div>
        </div>

        <div className="text-[9px] text-[#8CA798] border-t border-[#18E66A]/15 pt-1.5 flex justify-between items-center">
          <span>Isolation Forest Model</span>
          <ArrowUpRight className="w-3 h-3 text-[#18E66A]" />
        </div>
      </div>

      {/* 6. LIVE ACTIVITY STREAM */}
      <div 
        onClick={() => setActiveNav('telemetry')}
        className="cyber-panel rounded-xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-[#18E66A]/50 transition-all shadow-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8CA798] uppercase tracking-wider">
            LIVE TELEMETRY
          </span>
          <div className="p-1 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/30">
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-1">
          <div className="text-2xl font-black text-[#E8FFF0]">12.8K</div>
          <div className="text-[10px] text-[#2DFF78] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#18E66A] animate-ping" />
            <span>Streaming EPS</span>
          </div>
        </div>

        <div className="text-[9px] text-[#8CA798] border-t border-[#18E66A]/15 pt-1.5 flex justify-between items-center">
          <span>14 Data Pipelines</span>
          <ArrowUpRight className="w-3 h-3 text-[#18E66A]" />
        </div>
      </div>

    </div>
  );
};
