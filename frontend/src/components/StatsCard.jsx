import React from 'react';

export const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'cyan', badge }) => {
  const colorMap = {
    cyan: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5',
    red: 'border-red-500/20 text-red-400 bg-red-500/5',
    amber: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
    green: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
    purple: 'border-purple-500/20 text-purple-400 bg-purple-500/5',
  };

  return (
    <div className="bg-[#111827]/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-lg backdrop-blur-sm relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl lg:text-3xl font-bold font-mono text-slate-100">{value}</h3>
            {badge && <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{badge}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg border ${colorMap[color] || colorMap.cyan} group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-transparent to-white/5 rounded-full blur-xl pointer-events-none"></div>
    </div>
  );
};
