import React from 'react';
import { 
  Users, 
  ShieldAlert, 
  Laptop, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Lock, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { SecurityBadge } from '../components/common/SecurityBadge';
import { ScoreGauge } from '../components/common/ScoreGauge';

export const EmployeeIntelligence: React.FC = () => {
  const { 
    employees, 
    selectedEmployeeId, 
    setSelectedEmployeeId, 
    selectedEmployee, 
    openContainmentModal,
    setActiveNav 
  } = useSecurity();

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                EMPLOYEE BEHAVIORAL INTELLIGENCE & FORENSIC PROFILE
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                90-DAY ROLLING UEBA
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Deep individual baseline modeling, peer group deviation tracking, and rapid containment playbooks.
            </p>
          </div>
        </div>

        {/* User Switcher Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmployeeId(emp.id)}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                selectedEmployeeId === emp.id
                  ? 'bg-[#18E66A]/20 text-[#2DFF78] border-[#18E66A]/50 shadow-[0_0_8px_rgba(24,230,106,0.25)]'
                  : 'bg-[#0A1C13] text-[#8CA798] border-[#18E66A]/20 hover:text-[#E8FFF0]'
              }`}
            >
              {emp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Col: Employee Card & Score */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Identity Dossier */}
          <div className="cyber-panel rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#0A1C13] border-2 border-[#18E66A]/50 flex items-center justify-center text-xl font-bold text-[#2DFF78]">
                {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
              </div>

              <div>
                <h2 className="text-base font-bold text-[#E8FFF0]">{selectedEmployee.name}</h2>
                <div className="text-xs text-[#2DFF78] font-bold">{selectedEmployee.id}</div>
                <div className="text-[11px] text-[#8CA798]">{selectedEmployee.designation}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#8CA798] pt-2 border-t border-[#18E66A]/15">
              <div className="flex justify-between"><span>Department:</span><strong className="text-[#E8FFF0]">{selectedEmployee.department}</strong></div>
              <div className="flex justify-between"><span>Managed Host:</span><strong className="text-[#73FFA5]">{selectedEmployee.device}</strong></div>
              <div className="flex justify-between"><span>IP Address:</span><span className="text-[#E8FFF0]">{selectedEmployee.ipAddress}</span></div>
              <div className="flex justify-between"><span>Location:</span><span>{selectedEmployee.location}</span></div>
              <div className="flex justify-between"><span>Direct Manager:</span><span>{selectedEmployee.manager}</span></div>
            </div>

            {/* Score Radial */}
            <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 flex items-center justify-around">
              <ScoreGauge score={selectedEmployee.riskScore} label="RISK INDEX" sublabel={`+${selectedEmployee.trendDelta} pts`} size={100} />
              
              <div className="text-right text-xs space-y-1">
                <div className="text-[10px] text-[#8CA798]">Deviation:</div>
                <div className="text-base font-black text-[#FF7043]">+{selectedEmployee.behaviorDeviation}%</div>
                <SecurityBadge severity={selectedEmployee.riskClassification} size="sm" />
              </div>
            </div>

            {/* Rapid Containment Actions */}
            <div className="pt-2 border-t border-[#18E66A]/15 space-y-2">
              <span className="text-[10px] text-[#8CA798] font-bold uppercase block">
                ONE-CLICK SOC CONTAINMENT PLAYBOOKS
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openContainmentModal(selectedEmployee.id, 'ISOLATE')}
                  className="py-2 px-2 rounded-lg bg-[#FF334B] hover:bg-[#FF334B]/80 text-white font-bold text-[10px] shadow-sm transition-colors"
                >
                  ISOLATE ENDPOINT
                </button>
                <button
                  onClick={() => openContainmentModal(selectedEmployee.id, 'REVOKE_TOKENS')}
                  className="py-2 px-2 rounded-lg bg-[#FF7043] hover:bg-[#FF7043]/80 text-white font-bold text-[10px] shadow-sm transition-colors"
                >
                  REVOKE SESSIONS
                </button>
              </div>

              <button
                onClick={() => openContainmentModal(selectedEmployee.id, 'STEP_UP_MFA')}
                className="w-full py-1.5 rounded-lg bg-[#0A1C13] hover:bg-[#0D261A] text-[#73FFA5] border border-[#18E66A]/30 font-bold text-[10px] transition-colors"
              >
                ENFORCE FIDO2 HARDWARE STEP-UP MFA
              </button>
            </div>
          </div>

        </div>

        {/* Right Col: 90-Day Baseline vs Today & SHAP Explainability */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Baseline vs Current Telemetry Matrix */}
          <div className="cyber-panel rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#18E66A]" />
                <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
                  90-DAY BEHAVIORAL BASELINE VS TODAY
                </h3>
              </div>
              <span className="text-[10px] text-[#2DFF78] font-bold">UEBA Variance Matrix</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 space-y-1">
                <span className="text-[10px] text-[#8CA798]">Daily Egress Volume</span>
                <div className="text-sm font-black text-[#FF334B]">
                  {(selectedEmployee.currentMetrics.todayDataEgressMb / 1024).toFixed(1)} GB
                </div>
                <div className="text-[9px] text-[#8CA798]">
                  Baseline: {selectedEmployee.baseline.avgDailyDataEgressMb} MB/day
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 space-y-1">
                <span className="text-[10px] text-[#8CA798]">Active Toolchains</span>
                <div className="text-sm font-black text-[#FF7043]">
                  {selectedEmployee.currentMetrics.activeAppsCount} Processes
                </div>
                <div className="text-[9px] text-[#8CA798]">
                  Baseline: {selectedEmployee.baseline.avgAppCount} Apps
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 space-y-1">
                <span className="text-[10px] text-[#8CA798]">Failed Auth Attempts</span>
                <div className="text-sm font-black text-[#F5A623]">
                  {selectedEmployee.currentMetrics.failedAuthAttempts}
                </div>
                <div className="text-[9px] text-[#8CA798]">
                  Baseline: 0-1 / day
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 space-y-1">
                <span className="text-[10px] text-[#8CA798]">USB Peripherals</span>
                <div className="text-sm font-black text-[#FF334B]">
                  {selectedEmployee.currentMetrics.usbDevicesConnected} Mounted
                </div>
                <div className="text-[9px] text-[#8CA798]">
                  Baseline: 0 devices
                </div>
              </div>
            </div>
          </div>

          {/* SHAP Feature Contribution Ranking */}
          <div className="cyber-panel rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#18E66A]" />
                <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
                  SHAP RISK FACTOR ATTRIBUTIONS (EXPLAINABLE AI)
                </h3>
              </div>
              <span className="text-[10px] text-[#2DFF78] font-bold">Top Deviation Vectors</span>
            </div>

            <div className="space-y-2.5">
              {selectedEmployee.shapFactors.map((f, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-[#0A1C13]/60 border border-[#18E66A]/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#E8FFF0]">{f.factor}</span>
                    <span className="font-bold text-[#FF7043]">
                      +{(f.contribution * 100).toFixed(0)}% Impact
                    </span>
                  </div>

                  <p className="text-[11px] text-[#8CA798]">{f.description}</p>

                  <div className="w-full h-1.5 rounded-full bg-[#020605] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FF7043]"
                      style={{ width: `${f.contribution * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
