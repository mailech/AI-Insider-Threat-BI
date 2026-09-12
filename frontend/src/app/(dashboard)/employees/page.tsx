'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmployeeListItem } from '@/lib/types';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { ProfileDrawer } from '@/components/drawer/ProfileDrawer';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  Loader2,
  Building2,
  Download,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';
import { getRiskTierColor } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

function EmployeesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialRiskParam = searchParams.get('risk_category') || 'All';
  const initialDeptParam = searchParams.get('department') || 'All';

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>(initialRiskParam);
  const [deptFilter, setDeptFilter] = useState<string>(initialDeptParam);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(searchParams.get('employeeId') || null);

  const canExport = user?.role === 'Administrator' || user?.role === 'Security Manager';

  useEffect(() => {
    const r = searchParams.get('risk_category');
    if (r) setRiskFilter(r);
    const d = searchParams.get('department');
    if (d) setDeptFilter(d);
    const emp = searchParams.get('employeeId');
    if (emp) setSelectedEmployeeId(emp);
  }, [searchParams]);

  const fetchEmployees = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await api.getEmployees({
        search: search || undefined,
        risk_category: riskFilter !== 'All' ? riskFilter : undefined,
        department: deptFilter !== 'All' ? deptFilter : undefined,
      });
      setEmployees(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load employee directory');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchEmployees();
  }, [riskFilter, deptFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const totalCount = employees.length;
  const criticalCount = employees.filter((e) => e.risk_category === 'Critical').length;
  const highCount = employees.filter((e) => e.risk_category === 'High').length;
  const mediumCount = employees.filter((e) => e.risk_category === 'Medium').length;
  const lowCount = employees.filter((e) => e.risk_category === 'Low').length;

  const departments = [
    'All',
    'Finance',
    'IT Infrastructure',
    'Research',
    'Sales',
    'Procurement',
    'Human Resources',
    'Legal',
    'Marketing',
    'Customer Support',
    'Operations',
  ];

  const handleExportCSV = async () => {
    if (!canExport) {
      setExportMessage('Access Restricted: Employee PII bulk export requires Administrator or Security Manager role.');
      setTimeout(() => setExportMessage(null), 4000);
      return;
    }
    try {
      setIsExporting(true);
      const csvData = await api.exportEmployeesCsv({
        search: search || undefined,
        risk_category: riskFilter !== 'All' ? riskFilter : undefined,
        department: deptFilter !== 'All' ? deptFilter : undefined,
      });

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ams_employees_directory_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportXLSX = async () => {
    if (!canExport) {
      setExportMessage('Access Restricted: Employee PII bulk export requires Administrator or Security Manager role.');
      setTimeout(() => setExportMessage(null), 4000);
      return;
    }
    try {
      setIsExportingXlsx(true);
      const blob = await api.exportEmployeesXlsx({
        search: search || undefined,
        risk_category: riskFilter !== 'All' ? riskFilter : undefined,
        department: deptFilter !== 'All' ? deptFilter : undefined,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ams_employees_directory_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Excel export failed');
    } finally {
      setIsExportingXlsx(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Monitored Employee Profiles</h1>
          <p className="text-xs text-slate-400 mt-1">
            Behavioral intelligence dossiers, device asset telemetry, and risk baselines for all internal personnel
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5 self-start sm:self-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                canExport
                  ? 'bg-violet-600/15 border border-violet-500/30 text-violet-300 hover:bg-violet-600/25 hover:text-white cursor-pointer'
                  : 'bg-white/[0.03] border border-white/10 text-slate-500 hover:border-rose-500/30 hover:text-rose-400 cursor-not-allowed'
              }`}
              title={canExport ? 'Export Filtered Employee Directory to CSV' : 'Export restricted to Admin & Security Manager'}
            >
              {isExporting ? (
                <Loader2 size={14} className="animate-spin text-violet-400" />
              ) : canExport ? (
                <Download size={14} />
              ) : (
                <Lock size={14} className="text-amber-400" />
              )}
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportXLSX}
              disabled={isExportingXlsx}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                canExport
                  ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/25 hover:text-white cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-white/[0.03] border border-white/10 text-slate-500 hover:border-rose-500/30 hover:text-rose-400 cursor-not-allowed'
              }`}
              title={canExport ? 'Export Filtered Employee Directory to Polished Excel (.xlsx)' : 'Export restricted to Admin & Security Manager'}
            >
              {isExportingXlsx ? (
                <Loader2 size={14} className="animate-spin text-emerald-400" />
              ) : canExport ? (
                <FileSpreadsheet size={14} />
              ) : (
                <Lock size={14} className="text-amber-400" />
              )}
              <span>Export Excel</span>
              {!canExport && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">
                  Admin/Mgr
                </span>
              )}
            </button>
          </div>
          {exportMessage && (
            <span className="text-[11px] text-amber-300 animate-in fade-in">
              {exportMessage}
            </span>
          )}
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard
          variant="elevated"
          className="p-5 flex items-center justify-between cursor-pointer hover:border-violet-500/40 transition-colors"
          onClick={() => { setRiskFilter('All'); setDeptFilter('All'); }}
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
              Monitored Roster
            </span>
            <div className="text-3xl font-extrabold text-white font-mono">{totalCount}</div>
            <span className="text-[10px] text-slate-400 font-medium">Click to show all</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-300">
            <Users size={22} />
          </div>
        </GlassCard>

        <GlassCard
          variant="elevated"
          className={`p-5 flex items-center justify-between cursor-pointer hover:border-rose-500/50 transition-colors ${
            riskFilter === 'Critical' ? 'border-rose-500/60 bg-rose-500/5' : ''
          }`}
          onClick={() => setRiskFilter(riskFilter === 'Critical' ? 'All' : 'Critical')}
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-rose-400">
              Critical Risk
            </span>
            <div className="text-3xl font-extrabold text-rose-400 font-mono">{criticalCount}</div>
            <span className="text-[10px] text-rose-400/80 font-medium">Click to filter tier</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <ShieldAlert size={22} />
          </div>
        </GlassCard>

        <GlassCard
          variant="elevated"
          className={`p-5 flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-colors ${
            riskFilter === 'High' ? 'border-amber-500/60 bg-amber-500/5' : ''
          }`}
          onClick={() => setRiskFilter(riskFilter === 'High' ? 'All' : 'High')}
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-amber-400">
              High Risk
            </span>
            <div className="text-3xl font-extrabold text-amber-400 font-mono">{highCount}</div>
            <span className="text-[10px] text-amber-400/80 font-medium">Click to filter tier</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <AlertTriangle size={22} />
          </div>
        </GlassCard>

        <GlassCard
          variant="elevated"
          className={`p-5 flex items-center justify-between cursor-pointer hover:border-sky-500/50 transition-colors ${
            riskFilter === 'Medium' || riskFilter === 'Low' ? 'border-sky-500/60 bg-sky-500/5' : ''
          }`}
          onClick={() => setRiskFilter(riskFilter === 'Medium' ? 'All' : 'Medium')}
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-sky-400">
              Medium / Low Risk
            </span>
            <div className="text-3xl font-extrabold text-sky-300 font-mono">
              {mediumCount + lowCount}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Click to filter tier</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-300">
            <Activity size={22} />
          </div>
        </GlassCard>
      </div>

      {/* Filters & Search Control Bar */}
      <GlassCard variant="elevated" className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex items-center flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name, ID, or designation..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Department Filter Dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-violet-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#171526] border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-violet-500 transition-colors"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === 'All' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Risk Level Filter Pill Tabs */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/5 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1 mr-2">
            <Filter size={13} className="text-violet-400" /> Risk Tier:
          </span>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((tier) => {
            const isSelected = riskFilter === tier;
            return (
              <button
                key={tier}
                onClick={() => setRiskFilter(tier)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.5)] border border-violet-400/40'
                    : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tier}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Main Employee Table */}
      <GlassCard variant="elevated" className="p-6 space-y-4">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-violet-400" />
            <span className="text-xs">Querying employee behavioral registries...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        ) : employees.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Users size={32} className="text-slate-600" />
            <span className="text-sm font-semibold text-white">No employee records match the selected filters</span>
            <span className="text-xs text-slate-500">Try adjusting your search terms or filter criteria</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#161423] text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Risk Category</th>
                  <th className="px-4 py-3">Threat Score</th>
                  <th className="px-4 py-3">Enrolled</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map((emp) => {
                  const tierStyles = getRiskTierColor(emp.risk_category);
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className="hover:bg-violet-500/10 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-semibold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {emp.avatar_initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="group-hover:text-violet-200">{emp.full_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-normal">{emp.email}</span>
                          {(emp.containment_status === 'isolated' || emp.vpn_revocation_flagged || emp.requires_mfa_reset || emp.training_assigned) && (
                            <div className="flex items-center gap-1 mt-1">
                              {emp.containment_status === 'isolated' && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Isolated
                                </span>
                              )}
                              {emp.vpn_revocation_flagged && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  VPN Flagged
                                </span>
                              )}
                              {emp.requires_mfa_reset && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  MFA Reset
                                </span>
                              )}
                              {emp.training_assigned && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  Training
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-400 group-hover:text-violet-300">
                        {emp.id}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 font-medium">{emp.department}</td>
                      <td className="px-4 py-3.5 text-slate-400">{emp.designation}</td>
                      <td className="px-4 py-3.5">
                        <RiskBadge tier={emp.risk_category} size="sm" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5 min-w-[130px]">
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tierStyles.bar}`}
                              style={{ width: `${emp.threat_score}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-white w-9 text-right">
                            {emp.threat_score}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono">
                        {new Date(emp.enrolled_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button className="text-violet-400 hover:text-violet-200 inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                          Inspect Dossier <ArrowUpRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Intelligence Profile Slide-over Drawer */}
      <ProfileDrawer
        employeeId={selectedEmployeeId}
        targetIncidentId={searchParams.get('incidentId')}
        onClose={() => {
          setSelectedEmployeeId(null);
          if (typeof window !== 'undefined' && window.location.search) {
            const params = new URLSearchParams(window.location.search);
            params.delete('employeeId');
            params.delete('incidentId');
            const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }
        }}
        onUpdate={() => fetchEmployees(true)}
      />
    </div>
  );
}


export default function EmployeesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-violet-400" />
          <span className="text-xs">Loading employee registry...</span>
        </div>
      }
    >
      <EmployeesContent />
    </Suspense>
  );
}
