import React from 'react';
import { BrainCircuit, ShieldAlert, Sliders, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const AIRiskEnginePanel: React.FC = () => {
  const { selectedEmployee, setActiveNav } = useSecurity();

  const factors = [
    { name: 'Behavioral Anomalies', weight: '35%', score: 88, color: '#FF334B', desc: '12.4GB S3 Egress & USB Mount' },
    { name: 'Privilege Misuse Indicators', weight: '25%', score: 76, color: '#FF7043', desc: 'Off-hours Kerberos ticket request' },
    { name: 'Data Access Violations', weight: '20%', score: 82, color: '#FF7043', desc: 'Customer DB query anomaly' },
    { name: 'Access Pattern Deviations', weight: '10%', score: 65, color: '#F5A623', desc: 'Zurich VPN vs London office login' },
    { name: 'Historical Security Events', weight: '10%', score: 40, color: '#18E66A', desc: 'Past 90-day incident record' },
  ];

  return (
    <div className="cyber-panel rounded-xl p-4 font-mono shadow-2xl flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#18E66A]/15 border border-[#18E66A]/30 text-[#2DFF78]">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
              AI RISK ENGINE
            </h2>
            <p className="text-[10px] text-[#8CA798]">
              Target: {selectedEmployee.name} ({selectedEmployee.id})
            </p>
          </div>
        </div>

        <button 
          onClick={() => setActiveNav('risk-intelligence')}
          className="text-[10px] text-[#2DFF78] hover:text-[#73FFA5] flex items-center gap-1 font-bold"
        >
          <span>CALIBRATE</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main Score & Risk Tier */}
      <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/25 flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-[#FF7043]">78</span>
          <span className="text-xs text-[#8CA798]">/ 100</span>
          <span className="ml-2 px-2 py-0.5 rounded bg-[#FF7043]/20 text-[#FF7043] border border-[#FF7043]/40 text-[10px] font-bold">
            HIGH RISK
          </span>
        </div>

        <div className="text-right text-[10px]">
          <div className="text-[#2DFF78] font-bold">+31 pts (24h)</div>
          <div className="text-[#8CA798]">Algorithm Confidence: 96.4%</div>
        </div>
      </div>

      {/* Factors & Weights */}
      <div className="space-y-2.5">
        {factors.map((f) => (
          <div key={f.name} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#E8FFF0]">{f.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#8CA798] text-[10px]">Weight: {f.weight}</span>
                <span className="font-bold" style={{ color: f.color }}>{f.score}/100</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-[#020605] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${f.score}%`, backgroundColor: f.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Footer */}
      <div className="pt-3 mt-2 border-t border-[#18E66A]/15 flex items-center justify-between text-[10px] text-[#8CA798]">
        <span>Ensemble Model: Isolation Forest + XGBoost</span>
        <span className="text-[#2DFF78]">Active Scoring</span>
      </div>
    </div>
  );
};
