'use client';

import { useState, useEffect } from 'react';
import {
  getReportTypes,
  getReportPreview,
  downloadReportPDF,
  downloadReportExcel,
  listEmployees
} from '@/services/api';
import type {
  ReportTypeMetadata,
  ReportFilterPayload,
  ReportPreviewResponse,
  EmployeeRead
} from '@/types/api';

export default function ReportsPage() {
  const [reportTypes, setReportTypes] = useState<ReportTypeMetadata[]>([]);
  const [selectedType, setSelectedType] = useState<string>('insider_threat');
  const [employees, setEmployees] = useState<EmployeeRead[]>([]);
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
  
  // Filters state
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [department, setDepartment] = useState<string>('ALL');
  const [minRisk, setMinRisk] = useState<string>('ALL');
  const [targetEmpId, setTargetEmpId] = useState<string>('');
  const [framework, setFramework] = useState<string>('SOC2');

  // Loading & Preview state
  const [preview, setPreview] = useState<ReportPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [exportingPDF, setExportingPDF] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial data loading
  useEffect(() => {
    async function init() {
      try {
        const types = await getReportTypes();
        setReportTypes(types);
        
        const empList = await listEmployees();
        setEmployees(empList);
        if (empList.length > 0) {
          setTargetEmpId(empList[0].emp_id);
        }
      } catch (err: any) {
        console.error('Failed to initialize report types:', err);
      }
    }
    init();
  }, []);

  // Fetch preview whenever filters or selection change
  useEffect(() => {
    if (!selectedType) return;
    loadPreview();
  }, [selectedType, timeRange, department, minRisk, targetEmpId, framework]);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const payload: ReportFilterPayload = {
        report_type: selectedType,
        time_range: timeRange,
        department,
        min_risk: minRisk,
        employee_id: targetEmpId,
        framework
      };
      const data = await getReportPreview(payload);
      setPreview(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to render report preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const payload: ReportFilterPayload = {
        report_type: selectedType,
        time_range: timeRange,
        department,
        min_risk: minRisk,
        employee_id: targetEmpId,
        framework
      };
      await downloadReportPDF(payload);
    } catch (err: any) {
      alert('Failed to download PDF report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const payload: ReportFilterPayload = {
        report_type: selectedType,
        time_range: timeRange,
        department,
        min_risk: minRisk,
        employee_id: targetEmpId,
        framework
      };
      await downloadReportExcel(payload);
    } catch (err: any) {
      alert('Failed to download Excel report. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const currentTypeMeta = reportTypes.find((t) => t.id === selectedType);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0B1A14] p-6 rounded-2xl border border-[#18382B] shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="#040D0A" strokeWidth={2} className="w-5 h-5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#ECFDF5] tracking-tight m-0">
                Reports & Export System
              </h1>
              <p className="text-xs font-medium text-[#A7F3D0] m-0 mt-0.5">
                Generate, preview, and export SOC threat intelligence, UEBA analytics, forensic dossiers, compliance audits, and risk posture in PDF & Excel.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Export Actions Header Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exportingPDF || loadingPreview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-[#040D0A] font-extrabold text-xs transition-all shadow-md cursor-pointer"
          >
            {exportingPDF ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel || loadingPreview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#11241C] border border-[#10B981]/40 hover:bg-[#18382B] disabled:opacity-50 text-[#10B981] font-bold text-xs transition-all cursor-pointer"
          >
            {exportingExcel ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            )}
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ── 1. Report Type Selector Cards (5 Types) ── */}
      <div>
        <p className="text-xs font-bold text-[#6EE7B7] uppercase tracking-wider mb-3">
          Select Security Report Type
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {reportTypes.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <div
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#11241C] border-[#10B981] shadow-lg shadow-[#10B981]/15 ring-1 ring-[#10B981]'
                    : 'bg-[#0B1A14] border-[#18382B] hover:border-[#10B981]/50 hover:bg-[#11241C]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isSelected ? 'bg-[#10B981] text-[#040D0A]' : 'bg-[#18382B] text-[#A7F3D0]'
                    }`}>
                      {type.badge}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#ECFDF5] m-0 mb-1 leading-snug">
                    {type.title}
                  </h3>
                  <p className="text-[11px] text-[#A7F3D0]/80 m-0 line-clamp-3 leading-relaxed">
                    {type.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#18382B]/60 flex items-center justify-between text-[10px] text-[#10B981] font-semibold">
                  <span>{isSelected ? 'ACTIVE SELECTION' : 'SELECT REPORT'}</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Dynamic Report Filter Parameters Bar ── */}
      <div className="bg-[#0B1A14] p-5 rounded-xl border border-[#18382B] space-y-4">
        <div className="flex items-center justify-between border-b border-[#18382B] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-xs font-bold text-[#ECFDF5] uppercase tracking-wider">
              Report Parameters & Filtering
            </span>
          </div>
          <span className="text-[11px] text-[#A7F3D0]">
            Configuring parameters for: <strong className="text-[#10B981]">{currentTypeMeta?.title}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Time Horizon Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[#A7F3D0] mb-1">
              Time Horizon / Scope
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-[#11241C] border border-[#18382B] text-[#ECFDF5] text-xs rounded-lg p-2 focus:border-[#10B981] focus:outline-none"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ALL">All Recorded Data</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[#A7F3D0] mb-1">
              Department Scope
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-[#11241C] border border-[#18382B] text-[#ECFDF5] text-xs rounded-lg p-2 focus:border-[#10B981] focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="HR">Human Resources</option>
              <option value="Finance">Finance</option>
              <option value="Executive">Executive</option>
              <option value="IT Operations">IT Operations</option>
            </select>
          </div>

          {/* Minimum Risk Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[#A7F3D0] mb-1">
              Threat Score Threshold
            </label>
            <select
              value={minRisk}
              onChange={(e) => setMinRisk(e.target.value)}
              className="w-full bg-[#11241C] border border-[#18382B] text-[#ECFDF5] text-xs rounded-lg p-2 focus:border-[#10B981] focus:outline-none"
            >
              <option value="ALL">All Risk Levels (Low to Critical)</option>
              <option value="HIGH_CRITICAL">High & Critical Risk Only (Score &ge; 60)</option>
            </select>
          </div>

          {/* Conditional Target Subject / Employee Filter */}
          {selectedType === 'investigation' ? (
            <div>
              <label className="block text-[11px] font-semibold text-[#10B981] mb-1">
                Target Subject (Employee)
              </label>
              <select
                value={targetEmpId}
                onChange={(e) => setTargetEmpId(e.target.value)}
                className="w-full bg-[#11241C] border border-[#10B981] text-[#ECFDF5] text-xs rounded-lg p-2 focus:outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.first_name} {emp.last_name} ({emp.emp_id})
                  </option>
                ))}
              </select>
            </div>
          ) : selectedType === 'compliance' ? (
            <div>
              <label className="block text-[11px] font-semibold text-[#10B981] mb-1">
                Compliance Standard
              </label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="w-full bg-[#11241C] border border-[#10B981] text-[#ECFDF5] text-xs rounded-lg p-2 focus:outline-none"
              >
                <option value="SOC2">SOC 2 Type II</option>
                <option value="ISO27001">ISO 27001:2022</option>
                <option value="HIPAA">HIPAA Security Rule</option>
                <option value="NIST_CSF">NIST Cybersecurity Framework</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <button
                type="button"
                onClick={loadPreview}
                className="w-full py-2 bg-[#18382B] hover:bg-[#10B981] hover:text-[#040D0A] text-[#A7F3D0] text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                ↻ Refresh Live Preview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Live Web Report Preview & Export Toolbar ── */}
      <div className="bg-[#0B1A14] border border-[#18382B] rounded-2xl overflow-hidden shadow-2xl">
        {/* Preview Top Action Bar */}
        <div className="bg-[#11241C] p-4 px-6 border-b border-[#18382B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] font-mono font-extrabold uppercase tracking-wider">
              LIVE PREVIEW DRAFT
            </span>
            <h2 className="text-base font-bold text-[#ECFDF5] m-0">
              {preview?.title || 'Report Preview'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={exportingPDF || loadingPreview}
              className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#040D0A] font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingPDF ? 'Generating PDF...' : '📄 Export PDF'}
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || loadingPreview}
              className="px-3.5 py-1.5 rounded-lg bg-[#18382B] hover:bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingExcel ? 'Generating Excel...' : '📊 Export Excel'}
            </button>
          </div>
        </div>

        {/* Live Document Body */}
        {loadingPreview ? (
          <div className="p-16 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-[#A7F3D0]">
              Compiling security report dataset & formatting preview...
            </p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400 text-xs font-semibold">
            ⚠️ {error}
          </div>
        ) : preview ? (
          <div className="p-6 md:p-8 space-y-6 text-[#ECFDF5]">
            {/* Header Document Banner */}
            <div className="bg-[#11241C] p-5 rounded-xl border border-[#18382B] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold text-[#10B981] tracking-widest uppercase m-0">
                  CYBER AI SECURITY PLATFORM • OFFICIAL REPORT
                </p>
                <h3 className="text-xl font-black text-[#ECFDF5] m-0 mt-0.5">
                  {preview.title}
                </h3>
              </div>
              <div className="text-right text-[11px] text-[#A7F3D0] space-y-0.5">
                <p className="m-0 font-mono">
                  CLASSIFICATION: <strong className="text-amber-400">RESTRICTED SOC DOSSIER</strong>
                </p>
                <p className="m-0 font-mono text-[10px]">
                  GENERATED: {preview.generated_at}
                </p>
              </div>
            </div>

            {/* Executive Summary Callout Box */}
            <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-4 rounded-xl space-y-1.5">
              <p className="text-[10px] font-black text-[#10B981] uppercase tracking-wider m-0">
                Executive Threat Summary & Key Takeaways
              </p>
              <p className="text-xs text-[#ECFDF5] leading-relaxed m-0">
                {preview.summary?.executive_takeaway}
              </p>
            </div>

            {/* Key Performance Indicators (KPIs) */}
            {preview.kpis && preview.kpis.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {preview.kpis.map((kpi, idx) => (
                  <div key={idx} className="bg-[#11241C] p-3.5 rounded-xl border border-[#18382B] text-center">
                    <p className="text-[10px] font-bold text-[#A7F3D0] uppercase tracking-wider m-0 mb-1">
                      {kpi.label}
                    </p>
                    <p className="text-lg font-black text-[#10B981] m-0">
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Data Tables */}
            {preview.tables && preview.tables.map((table, tIdx) => (
              <div key={tIdx} className="space-y-2">
                <h4 className="text-xs font-bold text-[#6EE7B7] uppercase tracking-wider m-0">
                  {table.title}
                </h4>

                <div className="overflow-x-auto rounded-xl border border-[#18382B]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#11241C] text-[#A7F3D0] font-bold border-b border-[#18382B]">
                      <tr>
                        {table.headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-3 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#18382B] bg-[#0B1A14]">
                      {table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#11241C]/50 transition-colors">
                          {row.map((cell, cIdx) => {
                            const isStatus = cell === 'CRITICAL' || cell === 'HIGH' || cell === 'FLAGGED' || cell === 'FLAGGED OUTLIER' || cell === 'UNDER INVESTIGATION';
                            const isGood = cell === 'COMPLIANT' || cell === 'NORMAL' || cell === 'MONITORED' || cell === 'LOW';
                            return (
                              <td key={cIdx} className="p-3 text-[#ECFDF5] font-medium whitespace-nowrap">
                                {isStatus ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                                    {cell}
                                  </span>
                                ) : isGood ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[#10B981] font-bold text-[10px]">
                                    {cell}
                                  </span>
                                ) : (
                                  cell
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Recommendations Action Box */}
            {preview.recommendations && preview.recommendations.length > 0 && (
              <div className="bg-[#11241C] p-4 rounded-xl border border-[#18382B] space-y-2">
                <p className="text-xs font-bold text-[#10B981] uppercase tracking-wider m-0">
                  SOC Recommended Action Plan
                </p>
                <ul className="space-y-1.5 pl-5 m-0 text-xs text-[#A7F3D0] list-disc">
                  {preview.recommendations.map((rec, rIdx) => (
                    <li key={rIdx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
