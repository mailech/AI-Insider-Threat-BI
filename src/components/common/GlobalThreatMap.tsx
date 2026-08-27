import React, { useState } from 'react';
import { Globe, ShieldAlert, Crosshair, Radio } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const GlobalThreatMap: React.FC = () => {
  const { globalThreatPoints } = useSecurity();
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  return (
    <div className="cyber-panel rounded-xl p-4 flex flex-col justify-between font-mono shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <Globe className="w-4 h-4 text-[#18E66A]" />
          <span className="font-bold tracking-wider uppercase text-[#E8FFF0]">
            GLOBAL THREAT MAP
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#2DFF78]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#18E66A] animate-ping" />
          <span>4 ACTIVE EGRESS VECTORS</span>
        </div>
      </div>

      {/* Stylized Dark SVG Map Visualization */}
      <div className="relative w-full h-48 bg-[#020605] rounded-lg border border-[#18E66A]/20 p-2 overflow-hidden flex items-center justify-center">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

        <svg className="w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
          {/* Stylized continent outlines */}
          <path
            d="M 12,15 Q 22,12 30,18 Q 28,32 18,35 Q 10,28 12,15 Z"
            fill="#07140E"
            stroke="#18E66A20"
            strokeWidth="0.5"
          />
          <path
            d="M 22,36 Q 28,35 32,45 Q 26,55 20,48 Z"
            fill="#07140E"
            stroke="#18E66A20"
            strokeWidth="0.5"
          />
          <path
            d="M 44,14 Q 56,12 58,22 Q 50,30 42,24 Z"
            fill="#07140E"
            stroke="#18E66A20"
            strokeWidth="0.5"
          />
          <path
            d="M 46,30 Q 56,32 54,48 Q 44,45 42,35 Z"
            fill="#07140E"
            stroke="#18E66A20"
            strokeWidth="0.5"
          />
          <path
            d="M 60,12 Q 86,10 88,28 Q 74,40 62,25 Z"
            fill="#07140E"
            stroke="#18E66A20"
            strokeWidth="0.5"
          />
          <path
            d="M 78,44 Q 88,42 86,54 Q 76,55 74,48 Z"
            fill="#07140E"
            stroke="#18E66A20"
            strokeWidth="0.5"
          />

          {/* Render Attack Vectors & Arcs */}
          {globalThreatPoints.map((gp) => {
            const [ox, oy] = gp.originCoords;
            const [tx, ty] = gp.targetCoords;
            const strokeColor = gp.severity === 'CRITICAL' ? '#FF334B' : '#FF7043';

            return (
              <g key={gp.id}>
                {/* Arc line */}
                <path
                  d={`M ${ox},${oy} Q ${(ox + tx) / 2},${Math.min(oy, ty) - 8} ${tx},${ty}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                  opacity="0.8"
                />
                
                {/* Origin point */}
                <circle
                  cx={ox}
                  cy={oy}
                  r="1.8"
                  fill={strokeColor}
                  className="animate-pulse"
                />
                {/* Target point (Zurich/SF/AWS) */}
                <circle
                  cx={tx}
                  cy={ty}
                  r="2.2"
                  fill="#18E66A"
                  stroke="#020605"
                  strokeWidth="0.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Overlay Badges */}
        <div className="absolute top-2 left-2 text-[9px] text-[#8CA798] bg-[#0A1C13]/80 px-2 py-0.5 rounded border border-[#18E66A]/20">
          Source: Zurich VPN Relay (10.240.14.82)
        </div>

        <div className="absolute bottom-2 right-2 text-[9px] text-[#FF334B] bg-[#0A1C13]/80 px-2 py-0.5 rounded border border-[#FF334B]/30 font-bold">
          Egress: s3://temp-sync-8841 (12.4GB)
        </div>
      </div>

      {/* Bottom Summary Info */}
      <div className="pt-2 text-[10px] text-[#8CA798] flex items-center justify-between border-t border-[#18E66A]/15 mt-2">
        <span>Target: Financial S3 Staging</span>
        <span className="text-[#FF334B] font-bold">Mitigation: CASB Intercept Armed</span>
      </div>
    </div>
  );
};
