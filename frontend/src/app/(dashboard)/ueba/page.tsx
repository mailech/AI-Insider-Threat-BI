'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  listEmployees,
  getUEBAOverview,
  getUEBAUserProfile,
  getUEBAEntities,
} from '@/services/api';
import type {
  EmployeeRead,
  UEBAOverview,
  UEBAUserProfileResponse,
  UEBAEntityRead,
  RiskCategory,
} from '@/types/api';

const RISK_COLOR_MAP: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  CRITICAL: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', text: '#EF4444' },
  HIGH:     { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#F59E0B' },
  MEDIUM:   { bg: 'rgba(52, 211, 153, 0.15)', border: '#34D399', text: '#34D399' },
  LOW:      { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#10B981' },
};

export default function UEBAIntelligencePage() {
  const [overview, setOverview] = useState<UEBAOverview | null>(null);
  const [employees, setEmployees] = useState<EmployeeRead[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [uebaProfile, setUebaProfile] = useState<UEBAUserProfileResponse | null>(null);
  const [entities, setEntities] = useState<UEBAEntityRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Initial Load
  const fetchOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, emps, ents] = await Promise.all([
        getUEBAOverview(),
        listEmployees({ limit: 100 }),
        getUEBAEntities(15),
      ]);
      setOverview(ov);
      setEmployees(emps);
      setEntities(ents);

      if (emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(emps[0].emp_id);
      }
    } catch (err) {
      console.error('Failed to load UEBA intelligence overview:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEmpId]);

  useEffect(() => {
    void fetchOverviewData();
  }, [fetchOverviewData]);

  // Load UEBA Profile when user changes
  useEffect(() => {
    if (!selectedEmpId) return;
    setProfileLoading(true);
    getUEBAUserProfile(selectedEmpId)
      .then(setUebaProfile)
      .catch((err) => {
        console.error('Failed to load UEBA profile:', err);
        setUebaProfile(null);
      })
      .finally(() => setProfileLoading(false));
  }, [selectedEmpId]);

  // Filtered employees for selector
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.toLowerCase();
      return (
        !search.trim() ||
        emp.first_name.toLowerCase().includes(q) ||
        emp.last_name.toLowerCase().includes(q) ||
        emp.emp_id.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const userBehavior = uebaProfile?.user_behavior;
  const peerComp = uebaProfile?.peer_comparison;
  const prediction = uebaProfile?.prediction;
  const trendPoints = uebaProfile?.trend_points ?? [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0B1A14] p-6 rounded-2xl border border-[#18382B] shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse-green" />
            <span className="text-[#10B981] text-xs font-bold uppercase tracking-widest">
              BEHAVIORAL ANALYTICS & PREDICTION
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#ECFDF5] tracking-tight">
            UEBA Intelligence Engine
          </h1>
          <p className="text-xs text-[#A7F3D0] mt-1 max-w-2xl">
            User and Entity Behavior Analytics. Baseline profiling, peer group benchmark deviation (Z-scores), historical behavioral trend drift, and 72-hour threat prediction.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-[#11241C] border border-[#10B981]/40 text-[#10B981] text-xs font-mono font-bold">
            ⚡ ENGINE ACTIVE
          </span>
        </div>
      </div>

      {/* ── Executive UEBA Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Monitored Identities */}
        <div className="bg-[#0B1A14] p-4 rounded-2xl border border-[#18382B] space-y-1 shadow-md">
          <p className="text-[10px] font-bold text-[#6EE7B7] uppercase tracking-wider m-0">
            Monitored Identities (UBA)
          </p>
          <p className="text-2xl font-black text-[#ECFDF5] m-0">
            {overview?.total_monitored_users ?? '—'}
          </p>
          <p className="text-[10px] text-[#A7F3D0] m-0">
            Active behavioral baselines
          </p>
        </div>

        {/* High Anomaly Users */}
        <div className="bg-[#0B1A14] p-4 rounded-2xl border border-[#18382B] space-y-1 shadow-md">
          <p className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider m-0">
            High Anomaly Users
          </p>
          <p className="text-2xl font-black text-[#F59E0B] m-0">
            {overview?.high_anomaly_users ?? '—'}
          </p>
          <p className="text-[10px] text-[#A7F3D0] m-0">
            Elevated threat threshold
          </p>
        </div>

        {/* Peer Outliers */}
        <div className="bg-[#0B1A14] p-4 rounded-2xl border border-[#18382B] space-y-1 shadow-md">
          <p className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider m-0">
            Peer Group Outliers
          </p>
          <p className="text-2xl font-black text-[#EF4444] m-0">
            {overview?.peer_outliers_count ?? '—'}
          </p>
          <p className="text-[10px] text-[#A7F3D0] m-0">
            Z-score ≥ 1.5 above department
          </p>
        </div>

        {/* 72h Threat Spike Forecast */}
        <div className="bg-[#0B1A14] p-4 rounded-2xl border border-[#18382B] space-y-1 shadow-md">
          <p className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider m-0">
            72h Threat Spike Forecast
          </p>
          <p className="text-2xl font-black text-[#10B981] m-0">
            {overview?.predicted_threat_spikes_72h ?? '—'}
          </p>
          <p className="text-[10px] text-[#A7F3D0] m-0">
            Predicted risk transition alerts
          </p>
        </div>
      </div>

      {/* ── User Selector & Interactive UEBA Profile ── */}
      <div className="bg-[#0B1A14] p-4 rounded-2xl border border-[#18382B] space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#ECFDF5]">
              Select Monitored User to Inspect UEBA Vector:
            </span>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user..."
              className="w-full bg-[#11241C] border border-[#18382B] focus:border-[#10B981] rounded-xl px-3 py-1.5 text-xs text-[#ECFDF5] outline-none"
            />
          </div>
        </div>

        {/* Horizontal Employee Selector Cards */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredEmployees.map((emp) => {
            const isSelected = emp.emp_id === selectedEmpId;
            const rc = RISK_COLOR_MAP[emp.risk_category] ?? RISK_COLOR_MAP.LOW;
            return (
              <button
                key={emp.emp_id}
                type="button"
                onClick={() => setSelectedEmpId(emp.emp_id)}
                className={`px-3 py-2 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#11241C] border-[#10B981] text-[#ECFDF5] shadow-md shadow-[#10B981]/20 scale-[1.02]'
                    : 'bg-[#040D0A]/60 border-[#18382B] text-[#A7F3D0] hover:bg-[#11241C]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate">
                    {emp.first_name} {emp.last_name}
                  </span>
                  <span
                    className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase"
                    style={{ backgroundColor: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}
                  >
                    {emp.risk_category}
                  </span>
                </div>
                <p className="text-[10px] text-[#6EE7B7] m-0 font-mono">
                  {emp.emp_id} • {emp.department}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── UEBA Detailed Intelligence Panels ── */}
      {profileLoading ? (
        <div className="p-12 text-center bg-[#0B1A14] rounded-2xl border border-[#18382B]">
          <div className="w-8 h-8 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#A7F3D0]">Computing UEBA behavioral profile & prediction models...</p>
        </div>
      ) : uebaProfile ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Peer Group Comparison & Anomaly Vectors */}
          <div className="bg-[#0B1A14] p-6 rounded-2xl border border-[#18382B] space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#18382B] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#ECFDF5] m-0">
                  Peer Group Benchmark Comparison
                </h2>
                <p className="text-[11px] text-[#A7F3D0] m-0">
                  Department: <span className="text-[#10B981] font-semibold">{userBehavior?.department}</span> ({peerComp?.peer_count} peers)
                </p>
              </div>

              {peerComp?.is_outlier && (
                <span className="px-2.5 py-1 rounded-full bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] text-[10px] font-extrabold uppercase">
                  ⚠️ Peer Outlier (Z: +{peerComp.z_score})
                </span>
              )}
            </div>

            {/* Peer Comparison Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] space-y-1">
                <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">
                  User Threat Score
                </p>
                <p className="text-xl font-black text-[#ECFDF5] m-0">
                  {userBehavior?.current_risk_score} <span className="text-xs text-[#A7F3D0]">/ 100</span>
                </p>
              </div>

              <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] space-y-1">
                <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">
                  Dept Avg Baseline
                </p>
                <p className="text-xl font-black text-[#10B981] m-0">
                  {peerComp?.dept_avg_score} <span className="text-xs text-[#A7F3D0]">/ 100</span>
                </p>
              </div>

              <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] space-y-1">
                <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">
                  Statistical Z-Score
                </p>
                <p className={`text-xl font-black m-0 ${(peerComp?.z_score ?? 0) >= 1.5 ? 'text-[#EF4444]' : 'text-[#34D399]'}`}>
                  {peerComp?.z_score && peerComp.z_score > 0 ? `+${peerComp.z_score}` : peerComp?.z_score} σ
                </p>
              </div>

              <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] space-y-1">
                <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">
                  Percentile Rank
                </p>
                <p className="text-xl font-black text-[#ECFDF5] m-0">
                  {peerComp?.percentile_standing}%
                </p>
              </div>
            </div>

            {/* Behavioral Vectors Breakdown */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-[#ECFDF5] uppercase tracking-wider m-0">
                Behavioral Vectors (7-Day Baseline)
              </h3>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#A7F3D0]">Off-Hours Activity Ratio</span>
                    <span className="text-[#10B981] font-mono">
                      {Math.round((userBehavior?.off_hours_ratio ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#040D0A]">
                    <div
                      className="h-full rounded-full bg-[#10B981]"
                      style={{ width: `${(userBehavior?.off_hours_ratio ?? 0) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#A7F3D0]">Anomaly Index</span>
                    <span className="text-[#F59E0B] font-mono">
                      {Math.round((userBehavior?.anomaly_index ?? 0) * 100)} / 100
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#040D0A]">
                    <div
                      className="h-full rounded-full bg-[#F59E0B]"
                      style={{ width: `${(userBehavior?.anomaly_index ?? 0) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Threat Prediction & 72h Trajectory Forecast */}
          <div className="bg-[#0B1A14] p-6 rounded-2xl border border-[#18382B] space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#18382B] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#ECFDF5] m-0">
                    Predictive Threat Forecast (72h)
                  </h2>
                  <p className="text-[11px] text-[#A7F3D0] m-0">
                    Machine learning threat momentum trajectory for {userBehavior?.name}
                  </p>
                </div>

                {prediction?.soc_action_recommended && (
                  <span className="px-2.5 py-1 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] text-[10px] font-extrabold uppercase animate-pulse">
                    🚨 SOC Escalation Recommended
                  </span>
                )}
              </div>

              {/* Forecast Trajectory Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#11241C] p-3 rounded-xl border border-[#18382B]">
                  <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">+24h Forecast</p>
                  <p className="text-lg font-black text-[#ECFDF5] mt-1 m-0 font-mono">
                    {prediction?.predicted_24h}
                  </p>
                </div>

                <div className="bg-[#11241C] p-3 rounded-xl border border-[#18382B]">
                  <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">+48h Forecast</p>
                  <p className="text-lg font-black text-[#F59E0B] mt-1 m-0 font-mono">
                    {prediction?.predicted_48h}
                  </p>
                </div>

                <div className="bg-[#11241C] p-3 rounded-xl border border-[#18382B]">
                  <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">+72h Forecast</p>
                  <p className="text-lg font-black text-[#EF4444] mt-1 m-0 font-mono">
                    {prediction?.predicted_72h}
                  </p>
                </div>
              </div>

              {/* Escalation Probability */}
              <div className="bg-[#11241C] p-4 rounded-xl border border-[#18382B] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#ECFDF5]">Escalation Probability</span>
                  <span className="text-[#EF4444] font-mono">
                    {prediction?.escalation_probability_pct}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#040D0A]">
                  <div
                    className="h-full rounded-full bg-[#EF4444]"
                    style={{ width: `${prediction?.escalation_probability_pct}%` }}
                  />
                </div>
              </div>

              {/* Primary Threat Vectors */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#ECFDF5] uppercase tracking-wider m-0">
                  Primary Threat Vectors Identified
                </p>
                <div className="space-y-1.5">
                  {prediction?.primary_threat_vectors.map((vec, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[#11241C] border border-[#18382B] text-xs text-[#A7F3D0]"
                    >
                      <span className="text-[#10B981]">⚡</span>
                      <span>{vec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 14-Day Trend Micro Timeline */}
            <div className="pt-4 border-t border-[#18382B]">
              <p className="text-xs font-bold text-[#ECFDF5] uppercase tracking-wider mb-2 m-0">
                14-Day Risk Score Drift History
              </p>
              <div className="flex items-end gap-1 h-16 pt-2">
                {trendPoints.map((tp, idx) => {
                  const heightPct = Math.max(10, Math.min(100, tp.score));
                  const rc = RISK_COLOR_MAP[tp.category] ?? RISK_COLOR_MAP.LOW;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    >
                      <div
                        className="w-full rounded-t transition-all duration-200"
                        style={{ height: `${heightPct}%`, backgroundColor: rc.border }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 px-2 py-1 bg-[#11241C] text-[10px] text-[#ECFDF5] rounded border border-[#10B981]/40 whitespace-nowrap">
                        {tp.date}: {tp.score} ({tp.category})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Entity Behavior Analytics (EBA) Matrix ── */}
      <div className="bg-[#0B1A14] p-6 rounded-2xl border border-[#18382B] space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#18382B] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#ECFDF5] m-0">
              Entity Behavior Analytics (EBA) — Devices & IP Endpoints
            </h2>
            <p className="text-[11px] text-[#A7F3D0] m-0">
              Behavioral anomaly tracking for assigned hardware devices & network IP addresses.
            </p>
          </div>
          <span className="text-xs font-mono text-[#10B981] font-bold">
            {entities.length} Monitored Entities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#18382B] text-[#6EE7B7] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Asset Identifier</th>
                <th className="py-2.5 px-3">Asset Type</th>
                <th className="py-2.5 px-3">Assigned Owner</th>
                <th className="py-2.5 px-3">Total Events</th>
                <th className="py-2.5 px-3">Entity Risk Score</th>
                <th className="py-2.5 px-3 text-right">Behavior Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18382B]">
              {entities.map((ent) => (
                <tr key={ent.asset_id} className="hover:bg-[#11241C] transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#ECFDF5]">
                    {ent.identifier}
                  </td>
                  <td className="py-3 px-3 text-[#A7F3D0]">
                    <span className="px-2 py-0.5 rounded-full bg-[#11241C] border border-[#18382B] font-semibold text-[10px]">
                      {ent.asset_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#ECFDF5]">
                    {ent.owner_name} <span className="text-[#6EE7B7] font-mono text-[10px]">({ent.emp_id})</span>
                  </td>
                  <td className="py-3 px-3 text-[#A7F3D0] font-mono">
                    {ent.total_events} events
                  </td>
                  <td className="py-3 px-3 font-bold font-mono text-[#10B981]">
                    {ent.entity_risk_score} / 100
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        ent.status === 'ANOMALOUS'
                          ? 'bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444]'
                          : 'bg-[#10B981]/15 border border-[#10B981] text-[#10B981]'
                      }`}
                    >
                      {ent.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
