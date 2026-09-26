import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Laptop,
  Flame,
  AlertTriangle,
  BrainCircuit,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import RiskScoreGauge from '../components/RiskScoreGauge';

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployees({
        search: searchTerm || undefined,
        department: departmentFilter !== 'ALL' ? departmentFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      });
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [departmentFilter, severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const departments = ['ALL', 'Engineering', 'Finance', 'Human Resources', 'Sales & Marketing', 'IT Operations', 'Executive'];
  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Monitored Employee Profiles</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual behavioral baselines, assigned devices, privilege footprints, and live risk index
          </p>
        </div>
        <button
          onClick={fetchEmployees}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-400 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID (AAE0190), Name, Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Threat Tier:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              {severities.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employees Grid / Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center text-slate-400 font-mono text-xs border border-slate-800">
          No monitored employees found matching search criteria.
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User ID & Name</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Threat Risk Index</th>
                  <th className="py-3 px-4">Severity Tier</th>
                  <th className="py-3 px-4">Anomalies / Alerts</th>
                  <th className="py-3 px-4">Authorized Devices</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map((emp) => (
                  <tr key={emp.user_id} className="hover:bg-slate-850/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100">{emp.full_name}</div>
                      <div className="font-mono text-[11px] text-cyan-400">{emp.user_id}</div>
                      <div className="text-[10px] text-slate-500">{emp.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{emp.department}</div>
                      <div className="text-[11px] text-slate-400">{emp.role}</div>
                      {emp.manager && (
                        <div className="text-[10px] text-slate-500">Mgr: {emp.manager}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskScoreGauge score={emp.current_risk_score} />
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={emp.current_severity} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-rose-400 font-semibold">{emp.anomaly_count} Anomalies</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-amber-400 font-semibold">{emp.alert_count} Alerts</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {emp.devices && emp.devices.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {emp.devices.map((d) => (
                            <span key={d} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600">Standard Workstation</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/employees/${emp.user_id}`)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 font-mono text-xs font-semibold flex items-center gap-1.5 ml-auto transition"
                      >
                        <span>Profile & Baseline</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
