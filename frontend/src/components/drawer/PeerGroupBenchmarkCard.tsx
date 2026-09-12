import React from 'react';
import { BehavioralBaseline } from '@/lib/types';
import { Users, BarChart3, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Clock, HardDrive, Activity, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeerGroupBenchmarkCardProps {
  baseline: BehavioralBaseline;
  employeeName: string;
}

export const PeerGroupBenchmarkCard: React.FC<PeerGroupBenchmarkCardProps> = ({ baseline, employeeName }) => {
  const deptName = baseline.dept_name || 'Department';
  const peerCount = baseline.dept_peer_count ?? 0;
  const memberCount = baseline.dept_member_count ?? (peerCount + 1);
  const isSufficient = baseline.has_sufficient_peer_data && memberCount >= 3;

  // Real employee values
  const empDailyTransfer = baseline.employee_daily_transfer_mb ?? baseline.avg_daily_transfer_mb ?? 0;
  const deptAvgDailyTransfer = baseline.dept_avg_daily_transfer_mb ?? 0;
  const empDailyEvents = baseline.employee_daily_events ?? baseline.avg_daily_events ?? 0;
  const deptAvgDailyEvents = baseline.dept_avg_daily_events ?? 0;
  const empTotalTransfer = baseline.employee_total_transfer_mb ?? (empDailyTransfer * (baseline.days_analyzed || 30));
  const deptAvgTotalTransfer = baseline.dept_avg_total_transfer_mb ?? (deptAvgDailyTransfer * (baseline.days_analyzed || 30));

  // Multiples
  const transferMultiple = deptAvgDailyTransfer > 0 ? (empDailyTransfer / deptAvgDailyTransfer) : 1.0;
  const eventMultiple = deptAvgDailyEvents > 0 ? (empDailyEvents / deptAvgDailyEvents) : 1.0;

  // Helpers for formatting MB/GB
  const formatBytes = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#17142b] to-[#121020] border border-violet-500/20 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Users size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                Peer Group Benchmark Visualizer
              </h4>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/25">
                Section 8
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Department Cohort Comparison: <span className="text-violet-300 font-medium">{deptName}</span> ({memberCount} total member{memberCount !== 1 ? 's' : ''}, {peerCount} peer{peerCount !== 1 ? 's' : ''})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isSufficient ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={11} /> Valid Cohort ({memberCount} members)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={11} /> Limited Cohort Sample
            </span>
          )}
        </div>
      </div>

      {/* State A: Insufficient Peer Data Fallback */}
      {!isSufficient ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
              <Info size={14} className="shrink-0 text-amber-400" />
              <span>Insufficient peer data for comparison</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The <strong className="text-white font-medium">{deptName}</strong> department currently has only{' '}
              <span className="font-mono text-amber-300 font-bold">{memberCount}</span> employee{memberCount !== 1 ? 's' : ''}{' '}
              ({peerCount} other peer{peerCount !== 1 ? 's' : ''}). Statistical benchmarking requires a minimum of 3 cohort members to compute meaningful standard deviations and group averages without sample bias.
            </p>
          </div>

          {/* Clean Individual Metrics Without Misleading Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Individual Daily Transfer</span>
              <div className="text-sm font-mono font-bold text-white">
                {formatBytes(empDailyTransfer)}/day
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                Total: {formatBytes(empTotalTransfer)} (30d)
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Individual Daily Events</span>
              <div className="text-sm font-mono font-bold text-white">
                {empDailyEvents.toLocaleString()} ev/day
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                Total: {baseline.total_historical_events_analyzed?.toLocaleString() ?? 0} events
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Typical Login Schedule</span>
              <div className="text-sm font-mono font-bold text-white">
                {baseline.typical_login_median || '08:45 AM'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                Window: {baseline.typical_login_start} - {baseline.typical_login_end}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* State B: Sufficient Peer Data Available - Rich Comparative Bar Visualizer */
        <div className="space-y-3.5">
          {/* Metric 1: Daily Data Transfer Volume */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <HardDrive size={13} className="text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">Daily Data Transfer Volume</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded border",
                  transferMultiple >= 3.0 || (baseline.z_score_daily_transfer !== null && baseline.z_score_daily_transfer !== undefined && baseline.z_score_daily_transfer >= 1.0)
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    : transferMultiple > 1.2
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                )}>
                  {transferMultiple >= 1.0
                    ? `${transferMultiple.toFixed(1)}x department average`
                    : `${Math.round((1 - transferMultiple) * 100)}% below dept avg`}
                </span>
                {baseline.z_score_daily_transfer !== null && baseline.z_score_daily_transfer !== undefined && (
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
                    baseline.z_score_daily_transfer >= 1.5
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                      : baseline.z_score_daily_transfer >= 0.8
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                  )}>
                    {baseline.z_score_daily_transfer >= 0 ? '+' : ''}{baseline.z_score_daily_transfer.toFixed(1)}σ
                  </span>
                )}
              </div>
            </div>

            {/* Proportional Dual Bar Visualizer */}
            <div className="space-y-2 pt-1">
              {/* Employee Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">
                    This employee (<span className="text-white font-medium">{employeeName.split(' ')[0]}</span>):
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {formatBytes(empDailyTransfer)}/day
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden p-0.5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      transferMultiple >= 2.0
                        ? "bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                        : "bg-gradient-to-r from-cyan-500 to-violet-500"
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(8, Math.round((empDailyTransfer / Math.max(empDailyTransfer, deptAvgDailyTransfer, 1)) * 100)))}%`
                    }}
                  />
                </div>
              </div>

              {/* Department Average Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">
                    {deptName} average:
                  </span>
                  <span className="font-mono font-medium text-slate-300">
                    {formatBytes(deptAvgDailyTransfer)}/day
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-slate-500/60 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(8, Math.round((deptAvgDailyTransfer / Math.max(empDailyTransfer, deptAvgDailyTransfer, 1)) * 100)))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono border-t border-white/5">
              <span>30-Day Cumulative: {formatBytes(empTotalTransfer)}</span>
              <span>Cohort Mean: {formatBytes(deptAvgTotalTransfer)} (σ = {baseline.dept_std_daily_transfer_mb ?? 0} MB)</span>
            </div>
          </div>

          {/* Metric 2: Daily Event Frequency */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <Activity size={13} className="text-violet-400" />
                <span className="text-xs font-semibold text-slate-200">Daily Event Frequency</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded border",
                  eventMultiple >= 2.0
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                )}>
                  {eventMultiple >= 1.0
                    ? `${eventMultiple.toFixed(1)}x department average`
                    : `${Math.round((1 - eventMultiple) * 100)}% below dept avg`}
                </span>
                {baseline.z_score_daily_events !== null && baseline.z_score_daily_events !== undefined && (
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
                    Math.abs(baseline.z_score_daily_events) >= 1.5
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                  )}>
                    {baseline.z_score_daily_events >= 0 ? '+' : ''}{baseline.z_score_daily_events.toFixed(1)}σ
                  </span>
                )}
              </div>
            </div>

            {/* Proportional Dual Bar Visualizer */}
            <div className="space-y-2 pt-1">
              {/* Employee Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">
                    This employee:
                  </span>
                  <span className="font-mono font-bold text-violet-300">
                    {empDailyEvents.toFixed(1)} events/day
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(8, Math.round((empDailyEvents / Math.max(empDailyEvents, deptAvgDailyEvents, 1)) * 100)))}%`
                    }}
                  />
                </div>
              </div>

              {/* Department Average Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">
                    {deptName} average:
                  </span>
                  <span className="font-mono font-medium text-slate-300">
                    {deptAvgDailyEvents.toFixed(1)} events/day
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-slate-500/60 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(8, Math.round((deptAvgDailyEvents / Math.max(empDailyEvents, deptAvgDailyEvents, 1)) * 100)))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono border-t border-white/5">
              <span>Today Activity: {baseline.today_event_count} events</span>
              <span>Cohort Standard Dev: σ = {baseline.dept_std_daily_events ?? 0}</span>
            </div>
          </div>

          {/* Metric 3: Login Schedule Comparison */}
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-indigo-400 shrink-0" />
              <div>
                <span className="text-slate-300 font-medium block">Median Login Window</span>
                <span className="text-[11px] text-slate-400">
                  This employee: <strong className="text-white font-mono">{baseline.typical_login_median}</strong> vs {deptName} typical: <strong className="text-slate-300 font-mono">{baseline.dept_typical_login_median || '08:45 AM'}</strong>
                </span>
              </div>
            </div>
            <div className="self-end sm:self-auto">
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded border",
                baseline.login_anomaly_flag
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              )}>
                {baseline.login_anomaly_flag ? 'Shift Discrepancy' : 'Standard Shift Match'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
