'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  listEmployees,
  calculateRisk,
  getTelemetryLogs,
  createEmployee,
} from '@/services/api';
import type {
  EmployeeRead,
  RiskCategory,
  RiskCalculateResponse,
} from '@/types/api';

// ── Department & Risk Badges ──────────────────────────────────────────────────

const DEPARTMENTS = [
  'All Departments',
  'IT Infrastructure',
  'Human Resources',
  'Finance & Accounting',
  'Research',
  'Legal',
];

const RISK_COLOR_MAP: Record<
  RiskCategory,
  { bg: string; border: string; text: string; ring: string }
> = {
  CRITICAL: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: '#EF4444',
    text: '#EF4444',
    ring: 'rgba(239, 68, 68, 0.4)',
  },
  HIGH: {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: '#F59E0B',
    text: '#F59E0B',
    ring: 'rgba(245, 158, 11, 0.4)',
  },
  MEDIUM: {
    bg: 'rgba(52, 211, 153, 0.15)',
    border: '#34D399',
    text: '#34D399',
    ring: 'rgba(52, 211, 153, 0.3)',
  },
  LOW: {
    bg: 'rgba(16, 185, 129, 0.15)',
    border: '#10B981',
    text: '#10B981',
    ring: 'rgba(16, 185, 129, 0.3)',
  },
};

export default function CyberEmployeeProfilePage() {
  // ── States ──
  const [employees, setEmployees] = useState<EmployeeRead[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [riskData, setRiskData] = useState<RiskCalculateResponse | null>(null);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'radar' | 'telemetry' | 'clearance'>('radar');

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

  const canManage = activeRole === 'SECURITY_MANAGER' || activeRole === 'ADMINISTRATOR';

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    emp_id: '',
    first_name: '',
    last_name: '',
    department: 'IT Infrastructure',
    email: '',
    role_title: 'Security Specialist',
    risk_score: 0.2,
  });

  // ── Fetch Employees ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEmployees({ limit: 100 });
      setEmployees(data);
      if (data.length > 0 && !selectedEmp) {
        setSelectedEmp(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } flex: {
      setLoading(false);
    }
  }, [selectedEmp]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // ── Fetch Telemetry & Risk when selected employee changes ──
  useEffect(() => {
    if (!selectedEmp) return;

    setLogsLoading(true);
    getTelemetryLogs(selectedEmp.emp_id, 25)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));

    // Recalculate risk automatically for selected profile
    calculateRisk({ emp_id: selectedEmp.emp_id })
      .then(setRiskData)
      .catch(() => setRiskData(null));
  }, [selectedEmp]);

  // Filtered List for selector strip
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        emp.first_name.toLowerCase().includes(q) ||
        emp.last_name.toLowerCase().includes(q) ||
        emp.emp_id.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);

      const matchDept =
        selectedDept === 'All Departments' || emp.department === selectedDept;

      return matchSearch && matchDept;
    });
  }, [employees, search, selectedDept]);

  // Handle Risk Recalculation
  async function handleTriggerRecalculate() {
    if (!selectedEmp) return;
    setRecalculating(true);
    try {
      const res = await calculateRisk({ emp_id: selectedEmp.emp_id });
      setRiskData(res);
      // Refresh employee record
      const updatedList = await listEmployees({ limit: 100 });
      setEmployees(updatedList);
      const updated = updatedList.find((e) => e.emp_id === selectedEmp.emp_id);
      if (updated) setSelectedEmp(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  }

  // Handle Add Employee Form
  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createEmployee(newEmp);
      setShowModal(false);
      await fetchAll();
      setSelectedEmp(created);
    } catch (err) {
      alert('Failed to onboard employee: ' + String(err));
    }
  }

  const currentColors = selectedEmp
    ? RISK_COLOR_MAP[selectedEmp.risk_category] ?? RISK_COLOR_MAP.LOW
    : RISK_COLOR_MAP.LOW;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0B1A14] p-6 rounded-2xl border border-[#18382B] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse-green" />
            <span className="text-[#10B981] text-xs font-bold uppercase tracking-widest">
              IDENTITY & THREAT DOSSIER
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#ECFDF5] tracking-tight">
            CYBER Employee Profile
          </h1>
          <p className="text-xs text-[#A7F3D0] mt-1 max-w-xl">
            Interactive behavioral dossier hub. Inspect employee security posture, telemetry activity streams, and identity clearance parameters.
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-[#040D0A] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#10B981]/25 hover:scale-[1.02] transition-transform shrink-0 cursor-pointer border-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
              <line x1={12} y1={5} x2={12} y2={19} />
              <line x1={5} y1={12} x2={19} y2={12} />
            </svg>
            Onboard Identity
          </button>
        ) : (
          <div className="text-[11px] font-mono text-[#A7F3D0] bg-[#11241C] border border-[#18382B] px-3 py-1.5 rounded-xl">
            🔒 View-Only Mode ({activeRole.replace('_', ' ')})
          </div>
        )}
      </div>

      {/* ── Search & Employee Selection Strip ── */}
      <div className="bg-[#0B1A14] p-4 rounded-2xl border border-[#18382B] space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10B981"
              strokeWidth={2}
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
            >
              <circle cx={11} cy={11} r={8} />
              <line x1={21} y1={21} x2={16.65} y2={16.65} />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search identity by name or ID..."
              className="w-full bg-[#11241C] border border-[#18382B] focus:border-[#10B981] rounded-xl pl-9 pr-3 py-2 text-xs text-[#ECFDF5] placeholder-[#6EE7B7]/60 outline-none transition-colors"
            />
          </div>

          {/* Department Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedDept === dept
                    ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                    : 'bg-[#11241C] border-[#18382B] text-[#A7F3D0] hover:text-[#ECFDF5]'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Cards Selector Carousel */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#A7F3D0]">
            No monitored identities found matching search.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto pr-1">
            {filteredEmployees.map((emp) => {
              const isSelected = selectedEmp?.emp_id === emp.emp_id;
              const rc = RISK_COLOR_MAP[emp.risk_category] ?? RISK_COLOR_MAP.LOW;
              return (
                <button
                  key={emp.emp_id}
                  type="button"
                  onClick={() => setSelectedEmp(emp)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#11241C] border-[#10B981] shadow-lg shadow-[#10B981]/15 scale-[1.02]'
                      : 'bg-[#040D0A]/60 border-[#18382B] hover:border-[#10B981]/40 hover:bg-[#11241C]/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-[#6EE7B7]">
                      {emp.emp_id}
                    </span>
                    <span
                      className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: rc.bg,
                        color: rc.text,
                        border: `1px solid ${rc.border}`,
                      }}
                    >
                      {emp.risk_category}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[#ECFDF5] truncate m-0">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-[10px] text-[#A7F3D0] truncate m-0">
                    {emp.department}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main Profile Spotlight Hero Card ── */}
      {selectedEmp && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity Spotlight Info Card (Left Column) */}
          <div className="bg-[#0B1A14] rounded-2xl border border-[#18382B] p-6 space-y-6 relative overflow-hidden shadow-xl">
            {/* Halo Glow */}
            <div
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-20"
              style={{ backgroundColor: currentColors.border }}
            />

            {/* Profile Avatar Header */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-[#ECFDF5] shrink-0 border-2 shadow-xl"
                style={{
                  backgroundColor: '#11241C',
                  borderColor: currentColors.border,
                  boxShadow: `0 0 20px ${currentColors.ring}`,
                }}
              >
                {selectedEmp.first_name[0]}
                {selectedEmp.last_name[0]}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#ECFDF5] truncate m-0">
                    {selectedEmp.first_name} {selectedEmp.last_name}
                  </h2>
                </div>
                <p className="text-xs font-semibold text-[#10B981] m-0">
                  {selectedEmp.role_title}
                </p>
                <p className="text-[11px] text-[#A7F3D0] truncate m-0">
                  {selectedEmp.email}
                </p>
              </div>
            </div>

            {/* Identity Specs Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#18382B]">
              <div className="bg-[#11241C] p-3 rounded-xl border border-[#18382B]">
                <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">
                  Employee ID
                </p>
                <p className="text-xs font-mono font-bold text-[#ECFDF5] mt-1 m-0">
                  {selectedEmp.emp_id}
                </p>
              </div>

              <div className="bg-[#11241C] p-3 rounded-xl border border-[#18382B]">
                <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">
                  Department
                </p>
                <p className="text-xs font-bold text-[#ECFDF5] mt-1 m-0 truncate">
                  {selectedEmp.department}
                </p>
              </div>

              <div className="bg-[#11241C] p-3 rounded-xl border border-[#18382B]">
                <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">
                  Risk Category
                </p>
                <span
                  className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-1 uppercase"
                  style={{
                    backgroundColor: currentColors.bg,
                    color: currentColors.text,
                    border: `1px solid ${currentColors.border}`,
                  }}
                >
                  {selectedEmp.risk_category}
                </span>
              </div>

              <div className="bg-[#11241C] p-3 rounded-xl border border-[#18382B]">
                <p className="text-[10px] text-[#6EE7B7] uppercase font-bold m-0">
                  Clearance Level
                </p>
                <p className="text-xs font-bold text-[#10B981] mt-1 m-0">
                  Level 4 — Monitored
                </p>
              </div>
            </div>

            {/* Real-time Threat Gauge Meter */}
            <div className="bg-[#11241C] p-4 rounded-xl border border-[#18382B] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#ECFDF5]">
                  Calculated Threat Index
                </span>
                <span
                  className="text-base font-extrabold font-mono"
                  style={{ color: currentColors.text }}
                >
                  {Math.round(selectedEmp.risk_score * 100)} / 100
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-[#040D0A] overflow-hidden p-0.5 border border-[#18382B]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, selectedEmp.risk_score * 100)}%`,
                    backgroundColor: currentColors.border,
                    boxShadow: `0 0 10px ${currentColors.ring}`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#A7F3D0]">
                <span>0 (Safe)</span>
                <span>50 (Moderate)</span>
                <span>100 (Severe)</span>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={() => void handleTriggerRecalculate()}
              disabled={recalculating}
              className="w-full py-2.5 rounded-xl bg-[#11241C] hover:bg-[#18382B] border border-[#10B981]/40 text-[#10B981] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {recalculating ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 animate-spin">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Recalculating Threat Model...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Recalculate Risk Score
                </>
              )}
            </button>
          </div>

          {/* Dossier Tabs & Detailed Analysis (Right 2 Columns) */}
          <div className="lg:col-span-2 bg-[#0B1A14] rounded-2xl border border-[#18382B] p-6 space-y-6 shadow-xl">
            {/* Tab Controls */}
            <div className="flex items-center gap-2 border-b border-[#18382B] pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('radar')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  activeTab === 'radar'
                    ? 'bg-[#10B981] text-[#040D0A] border-[#10B981] shadow-md'
                    : 'bg-[#11241C] text-[#A7F3D0] border-[#18382B] hover:text-[#ECFDF5]'
                }`}
              >
                📊 Threat Radar
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('telemetry')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  activeTab === 'telemetry'
                    ? 'bg-[#10B981] text-[#040D0A] border-[#10B981] shadow-md'
                    : 'bg-[#11241C] text-[#A7F3D0] border-[#18382B] hover:text-[#ECFDF5]'
                }`}
              >
                ⚡ Audit Activity Stream ({logs.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('clearance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  activeTab === 'clearance'
                    ? 'bg-[#10B981] text-[#040D0A] border-[#10B981] shadow-md'
                    : 'bg-[#11241C] text-[#A7F3D0] border-[#18382B] hover:text-[#ECFDF5]'
                }`}
              >
                🔐 Access & RBAC Matrix
              </button>
            </div>

            {/* Tab Content 1: Threat Radar & Risk Factors */}
            {activeTab === 'radar' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-sm font-bold text-[#ECFDF5] m-0">
                  Behavioral Vector Risk Factors
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Behavioral Anomalies */}
                  <div className="bg-[#11241C] p-4 rounded-xl border border-[#18382B] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#ECFDF5]">Behavioral Anomalies</span>
                      <span className="text-[#10B981] font-mono">
                        {riskData?.sub_scores?.behavioral_anomalies !== undefined
                          ? `${Math.round(riskData.sub_scores.behavioral_anomalies * 100)}%`
                          : '35%'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#040D0A]">
                      <div
                        className="h-full rounded-full bg-[#10B981]"
                        style={{
                          width: `${
                            riskData?.sub_scores?.behavioral_anomalies !== undefined
                              ? riskData.sub_scores.behavioral_anomalies * 100
                              : 35
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-[#A7F3D0] m-0">
                      Off-hours activity and abnormal login volume metrics.
                    </p>
                  </div>

                  {/* Data Access Violations */}
                  <div className="bg-[#11241C] p-4 rounded-xl border border-[#18382B] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#ECFDF5]">Data Access Violations</span>
                      <span className="text-[#F59E0B] font-mono">
                        {riskData?.sub_scores?.data_access_violations !== undefined
                          ? `${Math.round(riskData.sub_scores.data_access_violations * 100)}%`
                          : '45%'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#040D0A]">
                      <div
                        className="h-full rounded-full bg-[#F59E0B]"
                        style={{
                          width: `${
                            riskData?.sub_scores?.data_access_violations !== undefined
                              ? riskData.sub_scores.data_access_violations * 100
                              : 45
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-[#A7F3D0] m-0">
                      Mass data export or sensitive document downloads.
                    </p>
                  </div>

                  {/* Privilege Misuse */}
                  <div className="bg-[#11241C] p-4 rounded-xl border border-[#18382B] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#ECFDF5]">Privilege Escalation</span>
                      <span className="text-[#EF4444] font-mono">
                        {riskData?.sub_scores?.privilege_misuse !== undefined
                          ? `${Math.round(riskData.sub_scores.privilege_misuse * 100)}%`
                          : '60%'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#040D0A]">
                      <div
                        className="h-full rounded-full bg-[#EF4444]"
                        style={{
                          width: `${
                            riskData?.sub_scores?.privilege_misuse !== undefined
                              ? riskData.sub_scores.privilege_misuse * 100
                              : 60
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-[#A7F3D0] m-0">
                      Unauthorized admin commands or privilege elevation attempts.
                    </p>
                  </div>

                  {/* Access Pattern Deviations */}
                  <div className="bg-[#11241C] p-4 rounded-xl border border-[#18382B] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#ECFDF5]">Access Pattern Deviations</span>
                      <span className="text-[#34D399] font-mono">
                        {riskData?.sub_scores?.access_pattern_deviations !== undefined
                          ? `${Math.round(riskData.sub_scores.access_pattern_deviations * 100)}%`
                          : '20%'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#040D0A]">
                      <div
                        className="h-full rounded-full bg-[#34D399]"
                        style={{
                          width: `${
                            riskData?.sub_scores?.access_pattern_deviations !== undefined
                              ? riskData.sub_scores.access_pattern_deviations * 100
                              : 20
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-[#A7F3D0] m-0">
                      Geographic location jumps and device fingerprint mismatches.
                    </p>
                  </div>
                </div>

                {/* Threat Mitigation Status */}
                <div className="bg-[#11241C] p-4 rounded-xl border border-[#10B981]/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                      🛡️
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#ECFDF5] m-0">
                        Active Monitoring Protocol: ENFORCED
                      </p>
                      <p className="text-[10px] text-[#A7F3D0] m-0">
                        All behavioral events are continuously logged & scored in real time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content 2: Telemetry Audit Activity Stream */}
            {activeTab === 'telemetry' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#ECFDF5] m-0">
                    Telemetry Event Logs for {selectedEmp.emp_id}
                  </h3>
                  <span className="text-[11px] text-[#10B981] font-mono">
                    Showing latest {logs.length} events
                  </span>
                </div>

                {logsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="skeleton h-12 rounded-xl" />
                    ))}
                  </div>
                ) : logs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#A7F3D0] bg-[#11241C] rounded-xl border border-[#18382B]">
                    No telemetry events recorded for this employee profile yet.
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                    {logs.map((log, idx) => {
                      const eventType = String(log.event_type ?? log.type ?? 'EVENT');
                      const severity = String(log.severity ?? 'MEDIUM');
                      const timestamp = String(log.timestamp ?? 'Just now');
                      const ip = String(log.source_ip ?? '192.168.1.45');
                      const details = String(log.details ?? log.description ?? 'Telemetry payload recorded.');

                      return (
                        <div
                          key={idx}
                          className="bg-[#11241C] p-3 rounded-xl border border-[#18382B] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#ECFDF5] font-mono">
                                {eventType}
                              </span>
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                                {severity}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#A7F3D0] m-0">
                              {details}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-[#6EE7B7] font-mono m-0">
                              {timestamp}
                            </p>
                            <p className="text-[10px] text-[#A7F3D0] font-mono m-0">
                              IP: {ip}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab Content 3: Access & RBAC Matrix */}
            {activeTab === 'clearance' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-sm font-bold text-[#ECFDF5] m-0">
                  Role-Based Access Control & System Privileges
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#10B981]">✓</span>
                      <span className="text-xs font-bold text-[#ECFDF5]">
                        Database Access Scope
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A7F3D0] m-0 pl-5">
                      Read-only access to department records ({selectedEmp.department}).
                    </p>
                  </div>

                  <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#10B981]">✓</span>
                      <span className="text-xs font-bold text-[#ECFDF5]">
                        Network Tier Access
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A7F3D0] m-0 pl-5">
                      Internal corporate subnet & authenticated VPN gateway.
                    </p>
                  </div>

                  <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#10B981]">✓</span>
                      <span className="text-xs font-bold text-[#ECFDF5]">
                        MFA Multi-Factor Verification
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A7F3D0] m-0 pl-5">
                      Hardware TOTP token enabled & verified.
                    </p>
                  </div>

                  <div className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#F59E0B]">⚠️</span>
                      <span className="text-xs font-bold text-[#ECFDF5]">
                        Elevated Privileges
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A7F3D0] m-0 pl-5">
                      Subject to automated behavioral audit log inspection.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Onboard Monitored Identity ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1A14] border border-[#18382B] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#18382B] pb-3">
              <h3 className="text-sm font-bold text-[#ECFDF5] m-0">
                Onboard New Monitored Identity
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#6EE7B7] hover:text-[#ECFDF5] text-xs font-bold bg-none border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => void handleAddEmployee(e)} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#A7F3D0] uppercase mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="emp_1099"
                  value={newEmp.emp_id}
                  onChange={(e) => setNewEmp({ ...newEmp, emp_id: e.target.value })}
                  className="w-full bg-[#11241C] border border-[#18382B] focus:border-[#10B981] rounded-xl px-3 py-2 text-xs text-[#ECFDF5] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#A7F3D0] uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Alex"
                    value={newEmp.first_name}
                    onChange={(e) => setNewEmp({ ...newEmp, first_name: e.target.value })}
                    className="w-full bg-[#11241C] border border-[#18382B] focus:border-[#10B981] rounded-xl px-3 py-2 text-xs text-[#ECFDF5] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#A7F3D0] uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vance"
                    value={newEmp.last_name}
                    onChange={(e) => setNewEmp({ ...newEmp, last_name: e.target.value })}
                    className="w-full bg-[#11241C] border border-[#18382B] focus:border-[#10B981] rounded-xl px-3 py-2 text-xs text-[#ECFDF5] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#A7F3D0] uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex.vance@cyberai.internal"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  className="w-full bg-[#11241C] border border-[#18382B] focus:border-[#10B981] rounded-xl px-3 py-2 text-xs text-[#ECFDF5] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#A7F3D0] uppercase mb-1">
                  Department
                </label>
                <select
                  value={newEmp.department}
                  onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                  className="w-full bg-[#11241C] border border-[#18382B] focus:border-[#10B981] rounded-xl px-3 py-2 text-xs text-[#ECFDF5] outline-none"
                >
                  {DEPARTMENTS.filter((d) => d !== 'All Departments').map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11241C] border border-[#18382B] text-xs text-[#A7F3D0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-[#040D0A] font-bold text-xs uppercase cursor-pointer border-0"
                >
                  Save Identity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
