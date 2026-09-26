import React from 'react';

export const MetricCard = ({ title, value, subtext, icon: Icon, color = 'cyan', trend }) => {
  const colorStyles = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      glow: 'shadow-cyber-cyan',
      valueColor: 'text-cyan-400'
    },
    red: {
      border: 'border-rose-500/30 hover:border-rose-500/50',
      iconBg: 'bg-rose-500/10 text-rose-400',
      glow: 'shadow-cyber-red',
      valueColor: 'text-rose-400'
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      glow: '',
      valueColor: 'text-amber-400'
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      glow: '',
      valueColor: 'text-emerald-400'
    },
    purple: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10 text-purple-400',
      glow: '',
      valueColor: 'text-purple-400'
    }
  };

  const style = colorStyles[color] || colorStyles.cyan;

  return (
    <div className={`glass-panel rounded-xl p-5 border transition-all duration-300 ${style.border} ${style.glow}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg ${style.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <span className={`text-2xl lg:text-3xl font-bold font-mono tracking-tight ${style.valueColor}`}>
          {value}
        </span>
        {trend && (
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            {trend}
          </span>
        )}
      </div>
      {subtext && (
        <p className="text-xs text-slate-500 mt-2 font-medium">{subtext}</p>
      )}
    </div>
  );
};

export default MetricCard;
