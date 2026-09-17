'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RiskSummaryResponse, EmployeeRead } from '@/types/api';
import { getAnalyticsSummary, listEmployees } from '@/services/api';
import ThreatOverviewCards from '@/components/dashboard/ThreatOverviewCards';
import RecentAlertsTable   from '@/components/dashboard/RecentAlertsTable';

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 text-[#10B981]">
      <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareNodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-[#10B981]">
      <circle cx={18} cy={5} r={3} />
      <circle cx={6} cy={12} r={3} />
      <circle cx={18} cy={19} r={3} />
      <line x1={8.59} y1={13.51} x2={15.42} y2={17.49} strokeLinecap="round" />
      <line x1={15.41} y1={6.51} x2={8.59} y2={10.49} strokeLinecap="round" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-[#10B981]">
      <rect x={4} y={4} width={16} height={16} rx={2} />
      <rect x={9} y={9} width={6} height={6} />
      <line x1={9} y1={1} x2={9} y2={4} strokeLinecap="round" />
      <line x1={15} y1={1} x2={15} y2={4} strokeLinecap="round" />
      <line x1={9} y1={20} x2={9} y2={23} strokeLinecap="round" />
      <line x1={15} y1={20} x2={15} y2={23} strokeLinecap="round" />
      <line x1={20} y1={9} x2={23} y2={9} strokeLinecap="round" />
      <line x1={20} y1={15} x2={23} y2={15} strokeLinecap="round" />
      <line x1={1} y1={9} x2={4} y2={9} strokeLinecap="round" />
      <line x1={1} y1={15} x2={4} y2={15} strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardPage() {
  const [summary,   setSummary]   = useState<RiskSummaryResponse | null>(null);
  const [employees, setEmployees] = useState<EmployeeRead[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [spinning,  setSpinning]  = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, emps] = await Promise.all([
        getAnalyticsSummary(),
        listEmployees({ limit: 100 }),
      ]);
      setSummary(sum);
      setEmployees(emps);
      setLastFetch(new Date());
      setErrorDismissed(false);
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect to backend server';
      const isNetworkError = msg.toLowerCase().includes('network') || msg.toLowerCase().includes('econnrefused');
      setError(isNetworkError ? 'Unable to reach the backend server.' : msg);
      setErrorDismissed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const handleSync = () => { void fetchData(); };
    window.addEventListener('itbis:data-sync', handleSync);
    return () => window.removeEventListener('itbis:data-sync', handleSync);
  }, [fetchData]);

  async function handleRefresh() {
    setSpinning(true);
    await fetchData();
    setTimeout(() => setSpinning(false), 600);
  }

  // Active highlighted high-risk employee for AI Risk Engine panel
  const highRiskEmp = employees.find((e) => e.risk_category === 'CRITICAL' || e.risk_category === 'HIGH') || employees[0];
  const targetName  = highRiskEmp ? `${highRiskEmp.first_name} ${highRiskEmp.last_name}` : 'Authar Morgan';
  const targetEmpId = highRiskEmp ? highRiskEmp.emp_id : 'EMP-1042';
  const targetScore = highRiskEmp ? Math.round(highRiskEmp.risk_score * 100) : 78;

  return (
    <div className="animate-fade-in w-full min-w-0">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#ECFDF5] m-0 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse-green" />
            CYBER AI — Security Overview
          </h2>
          <p className="text-xs text-[#6EE7B7] mt-1 mb-0 font-medium">
            Real-time insider threat posture & behavioral anomaly surface across monitored identities
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastFetch && (
            <span className="text-[11px] font-mono text-[#A7F3D0]">
              Updated {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            id="refresh-dashboard"
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#18382B] bg-[#0B1A14] hover:bg-[#11241C] text-[#ECFDF5] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <span style={{ display: 'inline-block', animation: spinning ? 'spin 0.6s linear 1' : 'none' }}>
              <RefreshIcon />
            </span>
            Refresh Sync
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && !errorDismissed && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-center gap-2">
          <span>⚠</span>
          <span className="flex-1">{error} — Ensure CYBER AI backend is running on http://127.0.0.1:8000.</span>
          <button onClick={() => setErrorDismissed(true)} className="bg-transparent border-0 text-red-400 cursor-pointer p-1 text-base leading-none">×</button>
        </div>
      )}

      {/* ── TOP ROW: 6-Grid Cyber Metric Cards (Matching User Screenshot) ── */}
      <ThreatOverviewCards summary={summary} loading={loading} />

      {/* ── MIDDLE ROW: Behavioral Threat Surface Graph + AI Risk Engine Panel (Matching User Screenshot) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mb-6">
        
        {/* LEFT PANEL: BEHAVIORAL THREAT SURFACE GRAPH & NODE INSPECTOR */}
        <div className="cyber-card p-5 bg-[#050C08] border border-[#10B981]/30 rounded-xl flex flex-col justify-between relative overflow-hidden min-h-[380px]">
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center">
                <ShareNodeIcon />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#ECFDF5] m-0 font-mono">
                  BEHAVIORAL THREAT SURFACE
                </h3>
                <p className="text-[10px] text-[#6EE7B7] m-0">
                  Interactive Graph: Identities, Endpoints, Cloud Buckets & Exfiltration Vectors
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#10B981] text-[#040D0A]">ALL</span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border border-[#18382B] text-[#6EE7B7] hover:text-[#ECFDF5] cursor-pointer">CRITICAL</span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border border-[#18382B] text-[#6EE7B7] hover:text-[#ECFDF5] cursor-pointer">IDENTITIES</span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border border-[#18382B] text-[#6EE7B7] hover:text-[#ECFDF5] cursor-pointer">RESOURCES</span>
            </div>
          </div>

          {/* Cyber Graph Canvas Mock / Node Visualizer */}
          <div className="relative flex-1 bg-[#030805] border border-[#18382B] rounded-xl p-4 flex flex-col justify-between overflow-hidden">
            
            {/* Grid Pattern overlay */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#10B981_1px,transparent_1px),linear-gradient(to_bottom,#10B981_1px,transparent_1px)] bg-[size:16px_16px]" />

            {/* Selected Node Card Overlay (Matching screenshot) */}
            <div className="relative z-10 w-full sm:w-80 bg-[#0B1A14]/90 border border-[#10B981]/40 rounded-xl p-3.5 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold tracking-widest text-[#6EE7B7] font-mono">SELECTED NODE:</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444]">HIGH</span>
              </div>
              <p className="text-xs font-bold text-[#10B981] m-0 font-mono">{targetName} ({targetEmpId})</p>
              
              <div className="mt-2 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#6EE7B7]">Risk Score:</span>
                  <span className="text-[#EF4444] font-bold">{targetScore} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6EE7B7]">Deviation:</span>
                  <span className="text-[#10B981] font-bold">+34% vs baseline</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6EE7B7]">Last Activity:</span>
                  <span className="text-[#ECFDF5]">2 mins ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6EE7B7]">Host:</span>
                  <span className="text-[#ECFDF5]">DESKTOP-7G8H2</span>
                </div>
              </div>

              {/* Alert Notice */}
              <div className="mt-2.5 p-2 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-[10px] font-mono leading-tight">
                Exfiltrating 12.4GB data archive to untrusted S3 bucket and USB peripheral
              </div>

              {/* Action Button */}
              <button type="button" className="w-full mt-2.5 py-1.5 rounded-lg bg-[#EF4444] text-[#040D0A] font-extrabold text-[11px] uppercase tracking-wider hover:bg-red-600 transition-colors shadow-lg cursor-pointer">
                QUARANTINE HOST
              </button>
            </div>

            {/* Visual Connections & Target Circles (Matching screenshot) */}
            <div className="relative z-0 mt-4 flex items-center justify-around">
              {/* Target Node */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#EF4444] bg-[#EF4444]/10 flex flex-col items-center justify-center text-center p-1 animate-pulse-green">
                  <span className="text-[9px] font-bold text-[#ECFDF5] leading-none truncate max-w-[48px]">{targetName.split(' ')[0]}</span>
                  <span className="text-[8px] font-mono text-[#EF4444] font-bold">({targetScore}/100)</span>
                </div>
              </div>

              {/* S3 Node */}
              <div className="flex flex-col items-center">
                <div className="px-2.5 py-1 rounded-md border border-[#EF4444] bg-[#EF4444]/15 text-[9px] font-mono text-[#EF4444] text-center">
                  s3://temp-sync-8041
                  <span className="block text-[8px] text-red-400">12.4GB Egress (CRITICAL)</span>
                </div>
              </div>

              {/* SanDisk USB Node */}
              <div className="flex flex-col items-center">
                <div className="px-2.5 py-1 rounded-md border border-[#F59E0B] bg-[#F59E0B]/15 text-[9px] font-mono text-[#F59E0B] text-center">
                  SanDisk USB 3.0
                  <span className="block text-[8px] text-amber-300">4.8GB Hardware Copy</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: AI RISK ENGINE SCORING FACTOR BREAKDOWN (Matching User Screenshot) */}
        <div className="cyber-card p-5 bg-[#050C08] border border-[#10B981]/30 rounded-xl flex flex-col justify-between min-h-[380px]">
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#18382B]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center">
                <CpuIcon />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#ECFDF5] m-0 font-mono">
                  AI RISK ENGINE
                </h3>
                <p className="text-[10px] text-[#6EE7B7] m-0 font-mono">
                  Target: {targetName} ({targetEmpId})
                </p>
              </div>
            </div>

            <button type="button" className="text-[10px] font-bold text-[#10B981] hover:underline uppercase font-mono cursor-pointer">
              CALIBRATE ↗
            </button>
          </div>

          {/* Score Header */}
          <div className="flex items-center justify-between my-2 p-3 rounded-xl bg-[#0B1A14] border border-[#18382B]">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-[#EF4444]">{targetScore}</span>
              <span className="text-xs text-[#6EE7B7] font-mono">/ 100</span>
              <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444]">
                HIGH RISK
              </span>
            </div>
            <div className="text-right text-[10px] font-mono">
              <span className="text-[#10B981] font-bold block">+31 pts (24h)</span>
              <span className="text-[#6EE7B7]">Confidence: 96.4%</span>
            </div>
          </div>

          {/* 5 Risk Factors Progress Bars */}
          <div className="space-y-3.5 my-2">
            
            {/* Factor 1 */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#ECFDF5] font-bold">Behavioral Anomalies</span>
                <span className="text-[#EF4444] font-bold">Weight: 35% <span className="ml-1">88/100</span></span>
              </div>
              <div className="h-1.5 w-full bg-[#18382B] rounded-full overflow-hidden">
                <div className="h-full bg-[#EF4444] rounded-full" style={{ width: '88%' }} />
              </div>
            </div>

            {/* Factor 2 */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#ECFDF5] font-bold">Privilege Misuse Indicators</span>
                <span className="text-[#F59E0B] font-bold">Weight: 25% <span className="ml-1">76/100</span></span>
              </div>
              <div className="h-1.5 w-full bg-[#18382B] rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: '76%' }} />
              </div>
            </div>

            {/* Factor 3 */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#ECFDF5] font-bold">Data Access Violations</span>
                <span className="text-[#F59E0B] font-bold">Weight: 20% <span className="ml-1">82/100</span></span>
              </div>
              <div className="h-1.5 w-full bg-[#18382B] rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: '82%' }} />
              </div>
            </div>

            {/* Factor 4 */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#ECFDF5] font-bold">Access Pattern Deviations</span>
                <span className="text-[#34D399] font-bold">Weight: 10% <span className="ml-1">65/100</span></span>
              </div>
              <div className="h-1.5 w-full bg-[#18382B] rounded-full overflow-hidden">
                <div className="h-full bg-[#34D399] rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            {/* Factor 5 */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#ECFDF5] font-bold">Historical Security Events</span>
                <span className="text-[#10B981] font-bold">Weight: 10% <span className="ml-1">40/100</span></span>
              </div>
              <div className="h-1.5 w-full bg-[#18382B] rounded-full overflow-hidden">
                <div className="h-full bg-[#10B981] rounded-full" style={{ width: '40%' }} />
              </div>
            </div>

          </div>

          {/* Model Footer */}
          <div className="flex items-center justify-between text-[10px] text-[#6EE7B7] pt-2 border-t border-[#18382B] font-mono">
            <span>Ensemble Model: Isolation Forest + XGBoost</span>
            <span className="text-[#10B981] font-bold">Active Scoring</span>
          </div>

        </div>

      </div>

      {/* ── BOTTOM ROW: Recent Security Alerts Table ── */}
      <RecentAlertsTable employees={employees} loading={loading} />
    </div>
  );
}
