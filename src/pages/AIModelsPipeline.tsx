import React from 'react';
import { BrainCircuit, Cpu, Sparkles } from 'lucide-react';
import { AICodingConsole } from '../components/common/AICodingConsole';

export const AIModelsPipeline: React.FC = () => {
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
                AI & ML PIPELINE ORCHESTRATION
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                ENSEMBLE SERVING v4.2
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Distributed machine learning inference pipeline powering real-time insider threat scoring.
            </p>
          </div>
        </div>

        <div className="text-xs text-right text-[#8CA798]">
          Global Ensemble Latency: <strong className="text-[#2DFF78]">~0.08ms Average</strong>
        </div>
      </div>

      {/* Terminal & Models */}
      <AICodingConsole />
    </div>
  );
};
