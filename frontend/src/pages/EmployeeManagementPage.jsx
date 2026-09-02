import { useState, useEffect } from "react";
import { Users, UserPlus, Search, Filter, Laptop, Lock, ShieldAlert, RefreshCw, Trash2, Edit3 } from "lucide-react";
import { palette } from "../styles/theme.js";
import { api } from "../services/api.js";
import EmployeeOnboardingModal from "../components/employees/EmployeeOnboardingModal.jsx";
import EmployeeDetailModal from "../components/employees/EmployeeDetailModal.jsx";

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState([]);
  const [deptFilter, setDeptFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  const loadEmployees = () => {
    api.getEmployees().then(data => {
      if (data) setEmployees(data);
    });
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleDelete = async (emp, e) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete employee ${emp.name} (${emp.employee_id})?`);
    if (confirmed) {
      setEmployees(prev => prev.filter(item => item.id !== emp.id && item.employee_id !== emp.employee_id));
      try {
        await api.deleteEmployee(emp.id || emp.employee_id);
      } catch (err) {
        console.warn("Deleted from local state:", err);
      }
    }
  };

  const filtered = employees.filter(emp => {
    const matchesDept = deptFilter === "All" || emp.department.toLowerCase().includes(deptFilter.toLowerCase());
    
    let matchesRisk = true;
    if (riskFilter !== "All") {
      if (riskFilter === "Critical") {
        matchesRisk = emp.risk_category === "Critical" || emp.risk_score >= 86;
      } else if (riskFilter === "High") {
        matchesRisk = emp.risk_category === "High" || (emp.risk_score >= 60 && emp.risk_score < 86);
      } else if (riskFilter === "Medium") {
        matchesRisk = emp.risk_category === "Medium" || (emp.risk_score >= 40 && emp.risk_score < 60);
      } else if (riskFilter === "Low") {
        matchesRisk = emp.risk_category === "Low" || emp.risk_score < 40;
      }
    }

    const matchesQuery =
      searchQuery === "" ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.manager.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDept && matchesRisk && matchesQuery;
  });

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Employee Identity & Profile Management</h1>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Employee onboarding, department mapping, role management, asset association, and access privileges oversight
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadEmployees}
            style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className="text-cyan-400" />
            Sync Identities
          </button>

          <button
            onClick={() => setOnboardOpen(true)}
            style={{ background: palette.accent, color: palette.void }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <UserPlus size={15} />
            + Add Employee
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider mr-1">Dept:</span>
          {["All", "Finance", "Engineering", "Sales", "HR", "Legal", "IT"].map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              style={{
                background: deptFilter === dept ? palette.accent : palette.raised,
                color: deptFilter === dept ? palette.void : palette.textMuted,
                border: `1px solid ${deptFilter === dept ? palette.accent : palette.line}`
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:brightness-110 cursor-pointer"
            >
              {dept}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Risk Level Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="All">All Risk Levels</option>
              <option value="Critical">Critical Risk</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          <div className="relative w-60">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, name, designation..."
              style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Count Indicator */}
      <div className="flex justify-between items-center mb-2 px-1 text-xs text-slate-400">
        <span>Showing <strong className="text-cyan-400">{filtered.length}</strong> employees found</span>
        <span>Total Monitored: {employees.length}</span>
      </div>

      {/* Employee Identity Table */}
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ background: palette.raised, borderBottom: `1px solid ${palette.line}` }} className="text-slate-400 font-mono">
                <th className="py-3 px-4">Employee ID & Name</th>
                <th className="py-3 px-4">Department & Designation</th>
                <th className="py-3 px-4">Reporting Manager</th>
                <th className="py-3 px-4">Device Information Asset</th>
                <th className="py-3 px-4">Access Privileges</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{emp.name}</div>
                    <div className="text-[11px] font-mono text-cyan-400">{emp.employee_id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">{emp.department}</div>
                    <div className="text-[11px] text-slate-400">{emp.designation}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium">
                    {emp.manager}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Laptop size={13} className="text-cyan-400" />
                      <span>{emp.device_info?.hostname || "FIN-LAPTOP"}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{emp.device_info?.ip || "10.4.12.89"}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-slate-300 font-mono text-xs">
                      <Lock size={12} className="text-cyan-400" />
                      <span>{emp.access_privileges?.length || 0} Granted Scopes</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded ${
                        emp.risk_category === "Critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" : emp.risk_category === "High" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {emp.risk_score} ({emp.risk_category})
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmp(emp);
                        }}
                        style={{ background: palette.raised, border: `1px solid ${palette.line}` }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit employee details"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>

                      <button
                        onClick={(e) => handleDelete(emp, e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Delete employee from system"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Modal */}
      <EmployeeOnboardingModal
        isOpen={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        onOnboardSuccess={() => loadEmployees()}
      />

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        employee={selectedEmp}
        isOpen={!!selectedEmp}
        onClose={() => setSelectedEmp(null)}
        onUpdate={() => loadEmployees()}
      />
    </div>
  );
}
