'use client';

import { useState, useEffect } from 'react';
import { getScoringMatrix } from '@/services/api';
import type { ScoringOverviewResponse, InsiderRiskMatrixItem } from '@/types/api';

export default function InsiderRiskScoringPage() {
  const [data, setData] = useState<ScoringOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [activeRole, setActiveRoleState] = useState<string>('ADMINISTRATOR');

  useEffect(() => {
    const { getActiveRole } = require('@/lib/rbac');
    setActiveRoleState(getActiveRole('ADMINISTRATOR'));
    const handleRoleChanged = (e: any) => {
      if (e.detail) setActiveRoleState(e.detail);
    };
    window.addEventListener('cyber-role-changed', handleRoleChanged);
    return () => window.removeEventListener('cyber-role-changed', handleRoleChanged);
  }, []);

  const canUseSimulator = activeRole === 'SOC_ENGINEER' || activeRole === 'ADMINISTRATOR';

  // Interactive Simulator Sliders
  const [simBA, setSimBA] = useState<number>(75);
  const [simPMI, setSimPMI] = useState<number>(80);
  const [simDAV, setSimDAV] = useState<number>(65);
  const [simAPD, setSimAPD] = useState<number>(90);
  const [simHSE, setSimHSE] = useState<number>(40);

  useEffect(() => {
    async function loadScoringData() {
      setLoading(true);
      try {
        const res = await getScoringMatrix();
        setData(res);
      } catch (err) {
        console.error('Failed to load scoring matrix:', err);
      } finally {
        setLoading(false);
      }
    }
    loadScoringData();
  }, []);

  // Simulator Calculated Score
  const simScore = Math.round(
    0.35 * simBA +
    0.25 * simPMI +
    0.20 * simDAV +
    0.10 * simAPD +
    0.10 * simHSE
  );

  const getSimCategory = (score: number) => {
    if (score >= 80) return { label: 'CRITICAL RISK', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
    if (score >= 60) return { label: 'HIGH RISK', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    if (score >= 30) return { label: 'MEDIUM RISK', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' };
    return { label: 'LOW RISK', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
  };

  const simCat = getSimCategory(simScore);

  // Filtered Matrix List
  const filteredMatrix = (data?.matrix || []).filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.emp_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || item.risk_category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0B1A14] p-6 rounded-2xl border border-[#18382B] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="#040D0A" strokeWidth={2} className="w-5 h-5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" />
              <circle cx="12" cy="15" r="0.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#ECFDF5] tracking-tight m-0">
              Insider Risk Scoring Engine
            </h1>
            <p className="text-xs font-medium text-[#A7F3D0] m-0 mt-0.5">
              Multi-factor threat quantification, weighted risk scoring model, severity assessment, and threat prioritization queue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#11241C] p-2.5 px-4 rounded-xl border border-[#18382B]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-xs font-mono text-[#10B981] font-bold">
            SCORING ENGINE ACTIVE
          </span>
        </div>
      </div>

      {/* ── 1. Weighted Scoring Model & Formula Simulator ── */}
      <div className="bg-[#0B1A14] p-6 rounded-2xl border border-[#18382B] space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#18382B] pb-4">
          <div>
            <span className="text-[10px] font-bold text-[#10B981] tracking-widest uppercase">
              MODEL ARCHITECTURE & FORMULA
            </span>
            <h2 className="text-lg font-extrabold text-[#ECFDF5] m-0">
              Weighted Insider Risk Scoring Formula
            </h2>
          </div>
          <div className="text-xs font-mono bg-[#11241C] p-2 px-3 rounded-lg border border-[#10B981]/30 text-[#A7F3D0]">
            Insider Risk Score = (35% BA) + (25% PMI) + (20% DAV) + (10% APD) + (10% HSE)
          </div>
        </div>

        {/* 5 Factor Weights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#10B981]/30">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-[#A7F3D0] uppercase">Behavioral Anomalies</span>
              <span className="text-xs font-black text-[#10B981] font-mono">35%</span>
            </div>
            <p className="text-[11px] text-[#ECFDF5]/80 m-0">
              Unusual user activities, abnormal command execution & anomaly vector spikes.
            </p>
          </div>

          <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#10B981]/30">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-[#A7F3D0] uppercase">Privilege Misuse</span>
              <span className="text-xs font-black text-[#10B981] font-mono">25%</span>
            </div>
            <p className="text-[11px] text-[#ECFDF5]/80 m-0">
              Unauthorized admin escalations, group modifications & privilege policy bypass.
            </p>
          </div>

          <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#10B981]/30">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-[#A7F3D0] uppercase">Data Access Violations</span>
              <span className="text-xs font-black text-[#10B981] font-mono">20%</span>
            </div>
            <p className="text-[11px] text-[#ECFDF5]/80 m-0">
              Bulk confidential file downloads, mass exports & suspicious USB transfers.
            </p>
          </div>

          <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#10B981]/30">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-[#A7F3D0] uppercase">Access Pattern Deviations</span>
              <span className="text-xs font-black text-[#10B981] font-mono">10%</span>
            </div>
            <p className="text-[11px] text-[#ECFDF5]/80 m-0">
              Off-hours logins, unexpected remote IP endpoints & geographic velocity bursts.
            </p>
          </div>

          <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#10B981]/30">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-[#A7F3D0] uppercase">Historical Security Events</span>
              <span className="text-xs font-black text-[#10B981] font-mono">10%</span>
            </div>
            <p className="text-[11px] text-[#ECFDF5]/80 m-0">
              Prior historical incident logs, mean severity weight & policy violation history.
            </p>
          </div>
        </div>

        {/* Interactive Factor Testing Simulator */}
        <div className="bg-[#11241C] p-5 rounded-xl border border-[#18382B] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#10B981] uppercase tracking-wider m-0">
              🧪 Live Factor Testing Simulator
            </h3>
            <span className="text-[11px] text-[#A7F3D0]">
              Adjust sliders to test dynamic score generation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="flex justify-between text-[11px] text-[#A7F3D0] mb-1">
                <span>BA (35%)</span>
                <span className="font-mono text-[#10B981]">{simBA}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={simBA}
                onChange={(e) => setSimBA(Number(e.target.value))}
                className="w-full accent-[#10B981] cursor-pointer"
              />
            </div>

            <div>
              <label className="flex justify-between text-[11px] text-[#A7F3D0] mb-1">
                <span>PMI (25%)</span>
                <span className="font-mono text-[#10B981]">{simPMI}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={simPMI}
                onChange={(e) => setSimPMI(Number(e.target.value))}
                className="w-full accent-[#10B981] cursor-pointer"
              />
            </div>

            <div>
              <label className="flex justify-between text-[11px] text-[#A7F3D0] mb-1">
                <span>DAV (20%)</span>
                <span className="font-mono text-[#10B981]">{simDAV}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={simDAV}
                onChange={(e) => setSimDAV(Number(e.target.value))}
                className="w-full accent-[#10B981] cursor-pointer"
              />
            </div>

            <div>
              <label className="flex justify-between text-[11px] text-[#A7F3D0] mb-1">
                <span>APD (10%)</span>
                <span className="font-mono text-[#10B981]">{simAPD}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={simAPD}
                onChange={(e) => setSimAPD(Number(e.target.value))}
                className="w-full accent-[#10B981] cursor-pointer"
              />
            </div>

            <div>
              <label className="flex justify-between text-[11px] text-[#A7F3D0] mb-1">
                <span>HSE (10%)</span>
                <span className="font-mono text-[#10B981]">{simHSE}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={simHSE}
                onChange={(e) => setSimHSE(Number(e.target.value))}
                className="w-full accent-[#10B981] cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#18382B] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#A7F3D0] font-semibold">Generated Score:</span>
              <span className="text-3xl font-black text-[#10B981] font-mono">
                {simScore} <span className="text-xs font-normal text-[#A7F3D0]">/ 100</span>
              </span>
            </div>

            <div className={`px-4 py-1.5 rounded-lg border font-mono font-bold text-xs ${simCat.color}`}>
              ASSIGNED CATEGORY: {simCat.label}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Employee Risk Categorization Overview ── */}
      <div>
        <p className="text-xs font-bold text-[#6EE7B7] uppercase tracking-wider mb-3">
          Employee Risk Categorization & Severity Posture
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Critical Risk */}
          <div
            onClick={() => setSelectedCategory(selectedCategory === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
            className={`bg-[#0B1A14] p-5 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'CRITICAL'
                ? 'border-rose-500 bg-[#11241C] ring-1 ring-rose-500'
                : 'border-[#18382B] hover:border-rose-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                CRITICAL RISK
              </span>
              <span className="text-[10px] font-mono text-[#A7F3D0]">Score &ge; 80</span>
            </div>
            <p className="text-3xl font-black text-rose-400 font-mono m-0 mb-1">
              {data?.summary.category_counts.CRITICAL || 0}
            </p>
            <p className="text-[11px] text-[#A7F3D0]/80 m-0">
              Immediate exfiltration & severe policy violation threat.
            </p>
          </div>

          {/* High Risk */}
          <div
            onClick={() => setSelectedCategory(selectedCategory === 'HIGH' ? 'ALL' : 'HIGH')}
            className={`bg-[#0B1A14] p-5 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'HIGH'
                ? 'border-amber-500 bg-[#11241C] ring-1 ring-amber-500'
                : 'border-[#18382B] hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                HIGH RISK
              </span>
              <span className="text-[10px] font-mono text-[#A7F3D0]">Score 60 – 79</span>
            </div>
            <p className="text-3xl font-black text-amber-400 font-mono m-0 mb-1">
              {data?.summary.category_counts.HIGH || 0}
            </p>
            <p className="text-[11px] text-[#A7F3D0]/80 m-0">
              Elevated behavioral anomalies & off-hours burst activity.
            </p>
          </div>

          {/* Medium Risk */}
          <div
            onClick={() => setSelectedCategory(selectedCategory === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
            className={`bg-[#0B1A14] p-5 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'MEDIUM'
                ? 'border-yellow-500 bg-[#11241C] ring-1 ring-yellow-500'
                : 'border-[#18382B] hover:border-yellow-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                MEDIUM RISK
              </span>
              <span className="text-[10px] font-mono text-[#A7F3D0]">Score 30 – 59</span>
            </div>
            <p className="text-3xl font-black text-yellow-400 font-mono m-0 mb-1">
              {data?.summary.category_counts.MEDIUM || 0}
            </p>
            <p className="text-[11px] text-[#A7F3D0]/80 m-0">
              Moderate access pattern variances under standard SOC monitoring.
            </p>
          </div>

          {/* Low Risk */}
          <div
            onClick={() => setSelectedCategory(selectedCategory === 'LOW' ? 'ALL' : 'LOW')}
            className={`bg-[#0B1A14] p-5 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'LOW'
                ? 'border-[#10B981] bg-[#11241C] ring-1 ring-[#10B981]'
                : 'border-[#18382B] hover:border-[#10B981]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                LOW RISK
              </span>
              <span className="text-[10px] font-mono text-[#A7F3D0]">Score 0 – 29</span>
            </div>
            <p className="text-3xl font-black text-[#10B981] font-mono m-0 mb-1">
              {data?.summary.category_counts.LOW || 0}
            </p>
            <p className="text-[11px] text-[#A7F3D0]/80 m-0">
              Normal baseline operational activity adhering to access controls.
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Threat Prioritization Queue Table ── */}
      <div className="bg-[#0B1A14] border border-[#18382B] rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#18382B] pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#ECFDF5] m-0">
              Threat Prioritization Queue & Risk Matrix
            </h2>
            <p className="text-xs text-[#A7F3D0] m-0 mt-0.5">
              Identities ordered by calculated Insider Risk Score with 5-factor breakdown pills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search identity or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#11241C] border border-[#18382B] text-[#ECFDF5] text-xs rounded-xl p-2.5 px-3 focus:border-[#10B981] focus:outline-none w-64"
            />
            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="text-xs font-bold text-[#10B981] hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-[#A7F3D0]">
              Evaluating multi-factor threat scores...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#11241C] text-[#A7F3D0] font-bold border-b border-[#18382B]">
                <tr>
                  <th className="p-3">Rank / Identity</th>
                  <th className="p-3">Dept & Access</th>
                  <th className="p-3">Insider Risk Score</th>
                  <th className="p-3">Risk Category</th>
                  <th className="p-3">5-Factor Breakdown</th>
                  <th className="p-3">Threat Severity & SOC Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18382B] bg-[#0B1A14]">
                {filteredMatrix.map((item, idx) => {
                  const isCrit = item.risk_category === 'CRITICAL';
                  const isHigh = item.risk_category === 'HIGH';
                  const isMed = item.risk_category === 'MEDIUM';

                  return (
                    <tr key={item.emp_id} className="hover:bg-[#11241C]/50 transition-colors">
                      {/* Identity */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[11px] font-bold text-[#10B981]">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-[#ECFDF5] m-0">
                              {item.name}
                            </p>
                            <p className="font-mono text-[10px] text-[#A7F3D0] m-0">
                              {item.emp_id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Dept & Access */}
                      <td className="p-3">
                        <p className="font-medium text-[#ECFDF5] m-0">{item.department}</p>
                        <span className="text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded">
                          {item.access_level} ACCESS
                        </span>
                      </td>

                      {/* Insider Risk Score */}
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-mono font-bold text-sm">
                            <span className={isCrit ? 'text-rose-400' : isHigh ? 'text-amber-400' : isMed ? 'text-yellow-400' : 'text-[#10B981]'}>
                              {item.insider_risk_score}
                            </span>
                            <span className="text-[10px] text-[#A7F3D0]">/ 100</span>
                          </div>

                          <div className="w-24 h-1.5 bg-[#11241C] rounded-full overflow-hidden border border-[#18382B]">
                            <div
                              className={`h-full rounded-full ${
                                isCrit ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : isMed ? 'bg-yellow-500' : 'bg-[#10B981]'
                              }`}
                              style={{ width: `${item.insider_risk_score}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Risk Category */}
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold font-mono border ${
                          isCrit ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                          isHigh ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                          isMed ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                          'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
                        }`}>
                          {item.risk_category}
                        </span>
                      </td>

                      {/* 5-Factor Breakdown Pills */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs text-[9px] font-mono">
                          <span className="bg-[#11241C] border border-[#10B981]/30 text-[#A7F3D0] px-1.5 py-0.5 rounded">
                            BA: {item.factors.behavioral_anomalies_35}%
                          </span>
                          <span className="bg-[#11241C] border border-[#10B981]/30 text-[#A7F3D0] px-1.5 py-0.5 rounded">
                            PMI: {item.factors.privilege_misuse_25}%
                          </span>
                          <span className="bg-[#11241C] border border-[#10B981]/30 text-[#A7F3D0] px-1.5 py-0.5 rounded">
                            DAV: {item.factors.data_access_violations_20}%
                          </span>
                          <span className="bg-[#11241C] border border-[#10B981]/30 text-[#A7F3D0] px-1.5 py-0.5 rounded">
                            APD: {item.factors.access_pattern_deviations_10}%
                          </span>
                          <span className="bg-[#11241C] border border-[#10B981]/30 text-[#A7F3D0] px-1.5 py-0.5 rounded">
                            HSE: {item.factors.historical_events_10}%
                          </span>
                        </div>
                      </td>

                      {/* Severity & Action */}
                      <td className="p-3 space-y-0.5">
                        <p className="font-bold text-[#ECFDF5] m-0 text-[11px]">
                          {item.threat_severity}
                        </p>
                        <p className="text-[10px] text-[#10B981] font-semibold m-0">
                          {item.recommended_action}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
