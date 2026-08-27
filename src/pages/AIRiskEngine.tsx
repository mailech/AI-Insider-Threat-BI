import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sliders, 
  RotateCcw, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Layers, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { AICodingConsole } from '../components/common/AICodingConsole';

export const AIRiskEngine: React.FC = () => {
  const { selectedEmployee } = useSecurity();

  const [weights, setWeights] = useState({
    behavioralAnomalies: 35,
    privilegeMisuse: 25,
    dataAccessViolations: 20,
    accessPatternDeviations: 10,
    historicalSecurityEvents: 10,
  });

  const [selectedFactor, setSelectedFactor] = useState<string>('behavioralAnomalies');

  const totalWeight = Object.values(weights).reduce<number>((a, b) => a + Number(b), 0);

  const resetWeights = () => {
    setWeights({
      behavioralAnomalies: 35,
      privilegeMisuse: 25,
      dataAccessViolations: 20,
      accessPatternDeviations: 10,
      historicalSecurityEvents: 10,
    });
  };

  const handleSliderChange = (key: keyof typeof weights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  const factorDetails: Record<string, { title: string; desc: string; mathFormula: string; deployedModel: string }> = {
    behavioralAnomalies: {
      title: 'Behavioral Anomalies Factor (Weight: 35%)',
      desc: 'Evaluates volumetric data transfers, unusual CLI execution commands, and hardware storage connections against the 90-day individual rolling baseline.',
      mathFormula: 'Score = ∑ (w_i * (Observed_i - Baseline_μ) / Baseline_σ)',
      deployedModel: 'Isolation Forest v2.4 + Autoencoder Reconstruction Error Net'
    },
    privilegeMisuse: {
      title: 'Privilege Misuse Indicators (Weight: 25%)',
      desc: 'Monitors Kerberos Ticket Granting Service (TGS) anomalies, unauthorized sudo attempts, and Windows Event ID 4624/4672 privilege elevations.',
      mathFormula: 'Score = XGBoost_Probability(Event_Vectors, Role_Entitlement_Matrix)',
      deployedModel: 'XGBoost Supervised Multi-Class Classifier'
    },
    dataAccessViolations: {
      title: 'Data Access Violations (Weight: 20%)',
      desc: 'Detects bulk SQL dumps, queries across sensitive customer tables, and unapproved bucket access requests.',
      mathFormula: 'Score = log10(Total_Records_Dumped) * Sensitivity_Weight',
      deployedModel: 'Graph Neural Network (GNN) Entity-Resource Resolver'
    },
    accessPatternDeviations: {
      title: 'Access Pattern Deviations (Weight: 10%)',
      desc: 'Analyzes impossible travel velocities, concurrent VPN and on-premise sessions, and geographic IP ASN deviations.',
      mathFormula: 'Score = Distance_Km(Loc_A, Loc_B) / Delta_Time_Hours',
      deployedModel: 'Geospatial Velocity & Anomaly Engine'
    },
    historicalSecurityEvents: {
      title: 'Historical Security Events (Weight: 10%)',
      desc: 'Calculates the trailing 90-day compliance violations, prior incident associations, and repeated DLP alerts.',
      mathFormula: 'Score = Exponential_Decay(Prior_Incidents, λ = 0.05)',
      deployedModel: 'Time-Weighted Bayesian Prior Estimator'
    }
  };

  const currentFactorInfo = factorDetails[selectedFactor];

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                AI RISK ENGINE & ALGORITHM CALIBRATION
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                BAYESIAN ENSEMBLE
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Calibrate multi-factor behavioral weighting formulas and inspect underlying explainable AI (SHAP) attributions.
            </p>
          </div>
        </div>

        <button
          onClick={resetWeights}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0A1C13] hover:bg-[#0D261A] text-[#73FFA5] border border-[#18E66A]/30 text-xs font-bold transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Default Weights</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left: Interactive Factor Calibration */}
        <div className="lg:col-span-6 cyber-panel rounded-xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#18E66A]" />
              <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
                FACTOR WEIGHT CALIBRATION
              </h3>
            </div>
            <span className={`text-[10px] font-bold ${totalWeight === 100 ? 'text-[#2DFF78]' : 'text-[#FF7043]'}`}>
              Total Weight: {totalWeight}% {totalWeight !== 100 && '(Must equal 100%)'}
            </span>
          </div>

          <div className="space-y-4">
            {Object.entries(weights).map(([key, val]) => {
              const isSelected = selectedFactor === key;
              const formattedName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

              return (
                <div 
                  key={key} 
                  onClick={() => setSelectedFactor(key)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all space-y-2 ${
                    isSelected 
                      ? 'bg-[#0A1C13] border-[#18E66A]/60 shadow-[0_0_10px_rgba(24,230,106,0.15)]' 
                      : 'bg-[#020605] border-[#18E66A]/20 hover:border-[#18E66A]/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#E8FFF0]">{formattedName}</span>
                    <span className="font-bold text-[#2DFF78]">{val}%</span>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={val}
                    onChange={(e) => handleSliderChange(key as any, parseInt(e.target.value))}
                    className="w-full accent-[#18E66A] cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: SHAP Explainability & Mathematics */}
        <div className="lg:col-span-6 cyber-panel rounded-xl p-4 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#18E66A]" />
                <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
                  SHAP EXPLAINABILITY INSPECTOR
                </h3>
              </div>
              <span className="text-[10px] text-[#2DFF78] font-bold">XAI Grounded</span>
            </div>

            <div className="p-3 rounded-lg bg-[#020605] border border-[#18E66A]/20 space-y-2">
              <h4 className="text-xs font-bold text-[#2DFF78]">{currentFactorInfo.title}</h4>
              <p className="text-[11px] text-[#8CA798] leading-relaxed">{currentFactorInfo.desc}</p>

              <div className="pt-2 border-t border-[#18E66A]/10">
                <span className="text-[10px] text-[#8CA798] block mb-1">Mathematical Function:</span>
                <code className="text-[11px] text-[#73FFA5] bg-[#07140E] px-2 py-1 rounded block border border-[#18E66A]/20 overflow-x-auto">
                  {currentFactorInfo.mathFormula}
                </code>
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px]">
                <span className="text-[#8CA798]">Serving ML Pipeline:</span>
                <span className="text-[#2DFF78] font-bold">{currentFactorInfo.deployedModel}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0A1C13]/60 border border-[#18E66A]/20 space-y-2">
              <h4 className="text-xs font-bold text-[#E8FFF0]">Identity Score Simulation ({selectedEmployee.name})</h4>
              <div className="flex items-center justify-between text-xs text-[#8CA798]">
                <span>Calculated Risk:</span>
                <strong className="text-[#FF7043] font-black text-sm">{selectedEmployee.riskScore} / 100 (HIGH RISK)</strong>
              </div>
              <div className="text-[10px] text-[#8CA798]">
                Standard deviation threshold: <span className="text-[#2DFF78] font-bold">+3.4σ above peer cohort baseline</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-[#8CA798] flex items-center justify-between border-t border-[#18E66A]/15">
            <span>Model Version: Sentinel-Bayes-v4.2</span>
            <span className="text-[#2DFF78]">Inference Latency: 0.08ms</span>
          </div>
        </div>

      </div>

      {/* Coding Console Integration */}
      <AICodingConsole />

    </div>
  );
};
