import React from 'react';
import { 
  ShieldCheck, 
  Database, 
  Activity, 
  Clock, 
  Zap, 
  Radio,
  Server
} from 'lucide-react';

export const BottomStatusBar: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-7 bg-[#020605] border-t border-[#18E66A]/20 px-4 flex items-center justify-between font-mono text-[10px] text-[#8CA798] z-30 select-none">
      
      {/* Left: System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[#E8FFF0]">
          <span className="w-2 h-2 rounded-full bg-[#18E66A] animate-pulse" />
          <span className="font-bold text-[#2DFF78]">SYSTEM STATUS:</span>
          <span>All systems operational</span>
        </div>

        <span className="text-[#4C7D60] hidden sm:inline">•</span>

        <div className="hidden sm:flex items-center gap-1.5">
          <Database className="w-3 h-3 text-[#18E66A]" />
          <span>DATA SOURCES:</span>
          <strong className="text-[#E8FFF0]">14 Connected</strong>
        </div>
      </div>

      {/* Right: Events Today & Ingestion speed */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-[#18E66A]" />
          <span>EVENTS TODAY:</span>
          <strong className="text-[#2DFF78]">1.2M</strong>
        </div>

        <span className="text-[#4C7D60] hidden md:inline">•</span>

        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#18E66A]" />
          <span>LAST INGESTION:</span>
          <strong className="text-[#E8FFF0]">2 secs ago</strong>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#07140E] border border-[#18E66A]/30 text-[#73FFA5]">
          <span>UEBA v4.2 PROD</span>
        </div>
      </div>

    </footer>
  );
};
