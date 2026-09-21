import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Filter, Plus, Eye, Laptop, Shield, AlertTriangle } from 'lucide-react';
import { employeeAPI } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedDept, search]);

  const fetchData = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        employeeAPI.getEmployees({
          department: selectedDept || undefined,
          search: search || undefined
        }),
        employeeAPI.getDepartments()
      ]);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
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
            <Users className="w-5 h-5 text-cyan-400" /> Monitored Employee Identities & Assets
          </h2>
          <p className="text-xs text-slate-400 mt-1">Identity profiles, designated managers, privileged entitlements, and mapped hardware assets</p>
        </div>
        <div className="text-xs font-mono text-cyan-400 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 self-start sm:self-auto">
          {employees.length} Identities Monitored
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Employee ID, Name, Title, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Direct Manager</th>
                <th className="py-3 px-4">Primary Device / IP</th>
                <th className="py-3 px-4">Access Privileges</th>
                <th className="py-3 px-4">Insider Risk</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employees.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-100">{emp.name}</div>
                    <div className="font-mono text-[10px] text-cyan-400">{emp.employee_id} &bull; {emp.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-200">{emp.designation}</div>
                    <div className="text-slate-500 text-[11px]">{emp.department}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {emp.manager || 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                    <div>{emp.device_info?.laptop || 'CORP-NB'}</div>
                    <div className="text-[10px] text-slate-500">{emp.device_info?.ip_address || '10.0.4.x'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {emp.access_privileges?.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <RiskBadge level={emp.risk_level} score={emp.risk_score} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/employees/${emp.employee_id}`}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-950 text-cyan-400 hover:text-cyan-300 border border-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Profile
                    </Link>
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
