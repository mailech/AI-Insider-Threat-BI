import React from 'react';

export const RiskScoreGauge = ({ score = 0, max = 100, size = 'md', showLabel = true }) => {
  const numScore = Number(score) || 0;
  const percentage = Math.min(100, Math.max(0, (numScore / max) * 100));

  let color = '#10b981'; // emerald
  let textClass = 'text-emerald-400';
  let label = 'LOW';

  if (numScore >= 75) {
    color = '#ef4444'; // critical red
    textClass = 'text-rose-400 font-bold';
    label = 'CRITICAL';
  } else if (numScore >= 50) {
    color = '#f97316'; // high orange
    textClass = 'text-orange-400 font-bold';
    label = 'HIGH';
  } else if (numScore >= 25) {
    color = '#f59e0b'; // medium amber
    textClass = 'text-amber-400 font-semibold';
    label = 'MEDIUM';
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center justify-center">
        {/* Circular gauge representation */}
        <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-950/60 relative overflow-hidden">
          <div 
            className="absolute bottom-0 left-0 right-0 opacity-20 transition-all duration-500" 
            style={{ height: `${percentage}%`, backgroundColor: color }}
          />
          <span className={`text-sm font-mono font-bold ${textClass}`}>
            {numScore.toFixed(0)}
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Risk Index</span>
          <span className={`text-xs font-mono font-semibold ${textClass}`}>{label}</span>
        </div>
      )}
    </div>
  );
};

export default RiskScoreGauge;
