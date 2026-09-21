import React, { useState, useEffect } from 'react';
import { Gauge, Sliders, Calculator, Info, ShieldAlert, BarChart3 } from 'lucide-react';
import { riskAPI } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';

export const RiskScoringPage = () => {
  const [riskScores, setRiskScores] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interactive Live Calculator Sliders
  const [calcBeh, setCalcBeh] = useState(75);
  const [calcPriv, setCalcPriv] = useState(80);
  const [calcData, setCalcData] = useState(60);
  const [calcPat, setCalcPat] = useState(50);
  const [calcHist, setCalcHist] = useState(40);
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Exact Weighted Formula
    const score = (0.35 * calcBeh) + (0.25 * calcPriv) + (0.20 * calcData) + (0.10 * calcPat) + (0.10 * calcHist);
    const rounded = Math.round(score * 100) / 100;
    let level = 'Low';
    if (rounded >= 80) level = 'Critical';
    else if (rounded >= 60) level = 'High';
    else if (rounded >= 30) level = 'Medium';
    setCalcResult({ score: rounded, level });
  }, [calcBeh, calcPriv, calcData, calcPat, calcHist]);

  const fetchData = async () => {
    try {
      const [scoresRes, distRes] = await Promise.all([
        riskAPI.getRiskScores({ limit: 50 }),
        riskAPI.getDistribution()
      ]);
      setRiskScores(scoresRes.data);
      setDistribution(distRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" /> Mathematical Insider Risk Scoring Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">Exact 5-component weighted risk calculation model from official project specification</p>
        </div>
      </div>

      {/* Official Weighted Formula Specification Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold uppercase tracking-wider">
          <Info className="w-4 h-4" /> Official Weighted Scoring Model
        </div>
        <div className="p-4 bg-slate-950/80 rounded-xl border border-blue-900/60 font-mono text-xs text-cyan-200 overflow-x-auto">
          {"Insider Risk Score = (0.35 × Behavioral Anomalies) + (0.25 × Privilege Misuse) + (0.20 × Data Access Violations) + (0.10 × Access Pattern Deviations) + (0.10 × Historical Events)"}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono text-center">
          <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
            <span className="text-slate-400">Behavioral:</span> <strong className="text-cyan-400">35%</strong>
          </div>
          <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
            <span className="text-slate-400">Privilege:</span> <strong className="text-purple-400">25%</strong>
          </div>
          <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
            <span className="text-slate-400">Data Access:</span> <strong className="text-amber-400">20%</strong>
          </div>
          <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
            <span className="text-slate-400">Access Pattern:</span> <strong className="text-emerald-400">10%</strong>
          </div>
          <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
            <span className="text-slate-400">Historical:</span> <strong className="text-rose-400">10%</strong>
          </div>
        </div>
      </div>

      {/* Interactive Live Formula Calculator */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-cyan-400" /> Interactive Weighted Risk Simulator (Viva Live Test)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">1. Behavioral Anomalies Score (Weight 35%)</span>
                <span className="font-mono text-cyan-400 font-bold">{calcBeh}/100 &rarr; +{(calcBeh * 0.35).toFixed(1)} pts</span>
              </div>
              <input
                type="range" min="0" max="100" value={calcBeh} onChange={(e) => setCalcBeh(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">2. Privilege Misuse Indicators (Weight 25%)</span>
                <span className="font-mono text-purple-400 font-bold">{calcPriv}/100 &rarr; +{(calcPriv * 0.25).toFixed(1)} pts</span>
              </div>
              <input
                type="range" min="0" max="100" value={calcPriv} onChange={(e) => setCalcPriv(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">3. Data Access Violations (Weight 20%)</span>
                <span className="font-mono text-amber-400 font-bold">{calcData}/100 &rarr; +{(calcData * 0.20).toFixed(1)} pts</span>
              </div>
              <input
                type="range" min="0" max="100" value={calcData} onChange={(e) => setCalcData(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">4. Access Pattern Deviations (Weight 10%)</span>
                <span className="font-mono text-emerald-400 font-bold">{calcPat}/100 &rarr; +{(calcPat * 0.10).toFixed(1)} pts</span>
              </div>
              <input
                type="range" min="0" max="100" value={calcPat} onChange={(e) => setCalcPat(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">5. Historical Security Events (Weight 10%)</span>
                <span className="font-mono text-rose-400 font-bold">{calcHist}/100 &rarr; +{(calcHist * 0.10).toFixed(1)} pts</span>
              </div>
              <input
                type="range" min="0" max="100" value={calcHist} onChange={(e) => setCalcHist(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-3">
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Calculated Composite Threat Score</p>
            <div className="text-5xl font-mono font-bold text-white my-2">
              {calcResult?.score} <span className="text-sm font-sans text-slate-500 font-normal">/ 100</span>
            </div>
            <div>
              <RiskBadge level={calcResult?.level} />
            </div>
            <p className="text-[11px] text-slate-500 font-mono pt-2">
              {calcResult?.score >= 80 ? 'CRITICAL RISK (80-100)' : calcResult?.score >= 60 ? 'HIGH RISK (60-79.9)' : calcResult?.score >= 30 ? 'MEDIUM RISK (30-59.9)' : 'LOW RISK (0-29.9)'}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Scores Roster Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-100">Live Enterprise Risk Evaluations Roster</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[10px] font-sans">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Behavioral (35%)</th>
                <th className="py-3 px-4">Privilege (25%)</th>
                <th className="py-3 px-4">Data Access (20%)</th>
                <th className="py-3 px-4">Pattern (10%)</th>
                <th className="py-3 px-4">Historical (10%)</th>
                <th className="py-3 px-4">Overall Score</th>
                <th className="py-3 px-4 text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {riskScores.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/60">
                  <td className="py-3.5 px-4 text-cyan-400 font-bold">{r.employee_id}</td>
                  <td className="py-3.5 px-4 text-slate-300">{r.behavioral_anomalies_score}</td>
                  <td className="py-3.5 px-4 text-slate-300">{r.privilege_misuse_score}</td>
                  <td className="py-3.5 px-4 text-slate-300">{r.data_access_violations_score}</td>
                  <td className="py-3.5 px-4 text-slate-300">{r.access_pattern_deviations_score}</td>
                  <td className="py-3.5 px-4 text-slate-300">{r.historical_security_events_score}</td>
                  <td className="py-3.5 px-4 text-white font-bold text-sm">{r.overall_score}</td>
                  <td className="py-3.5 px-4 text-right font-sans">
                    <RiskBadge level={r.risk_level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
