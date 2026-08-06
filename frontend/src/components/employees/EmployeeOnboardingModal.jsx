import { useState } from "react";
import { X, UserPlus, Shield, Laptop, Lock, CheckCircle2 } from "lucide-react";
import { palette } from "../../styles/theme.js";
import { api } from "../../services/api.js";

const DEFAULT_PRIVILEGES = [
  "SAP Financials",
  "AWS Master Console",
  "Kubernetes Production Cluster",
  "Workday HR portal",
  "Salesforce CRM",
  "Active Directory Admin",
  "Litigation Vault",
  "Swift Payment Gateway",
  "GitHub Admin"
];

export default function EmployeeOnboardingModal({ isOpen, onClose, onOnboardSuccess }) {
  const [empId, setEmpId] = useState(`EMP-${Math.floor(Math.random()*9000+1000)}`);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [designation, setDesignation] = useState("Software Engineer");
  const [manager, setManager] = useState("D. Sterling");
  const [email, setEmail] = useState("");
  const [hostname, setHostname] = useState("WORKSTATION-NEW");
  const [os, setOs] = useState("Windows 11 Enterprise");
  const [ip, setIp] = useState("10.4.15.55");
  const [selectedPrivileges, setSelectedPrivileges] = useState(["Internal Portal"]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const togglePrivilege = (priv) => {
    if (selectedPrivileges.includes(priv)) {
      setSelectedPrivileges(selectedPrivileges.filter(p => p !== priv));
    } else {
      setSelectedPrivileges([...selectedPrivileges, priv]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newEmp = await api.onboardEmployee({
        employee_id: empId,
        name: name || "Onboarded Employee",
        department,
        designation,
        manager,
        email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
        device_info: { hostname, os, ip },
        access_privileges: selectedPrivileges
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOnboardSuccess(newEmp);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        style={{ background: palette.surface, border: `1px solid ${palette.line}` }}
        className="max-w-xl w-full rounded-2xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div style={{ background: palette.accent }} className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <UserPlus size={20} color={palette.void} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Employee Onboarding Workflow</h2>
            <p style={{ color: palette.textMuted }} className="text-xs">
              Provision identity, department mapping, device assets, and access privileges
            </p>
          </div>
        </div>

        {success && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} />
            Employee onboarded successfully! Integrated into identity telemetry.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identity Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Employee ID</label>
              <input
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                className="w-full px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marcus Miller"
                style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="Finance">Finance</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Legal">Legal</option>
                <option value="IT">IT Administration</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Sr. Developer"
                style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Reporting Manager</label>
              <input
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                placeholder="D. Sterling"
                style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Device Assets */}
          <div style={{ background: palette.raised2, border: `1px solid ${palette.line}` }} className="p-3.5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Laptop size={15} className="text-cyan-400" />
              Provisioned Device Asset Information
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Hostname</label>
                <input
                  type="text"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-2.5 py-1 rounded text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">OS Build</label>
                <input
                  type="text"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-2.5 py-1 rounded text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">IP Binding</label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                  className="w-full px-2.5 py-1 rounded text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Access Privileges Checklist */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-1.5">
              <Lock size={14} className="text-cyan-400" />
              Granted Access Privileges & System Scopes
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {DEFAULT_PRIVILEGES.map((priv) => {
                const checked = selectedPrivileges.includes(priv);
                return (
                  <label
                    key={priv}
                    onClick={() => togglePrivilege(priv)}
                    style={{
                      background: checked ? palette.raised2 : palette.raised,
                      border: `1px solid ${checked ? palette.accent : palette.line}`
                    }}
                    className="p-2 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-between select-none transition-all"
                  >
                    <span className={checked ? "text-cyan-400 font-semibold" : "text-slate-400"}>{priv}</span>
                    <input type="checkbox" checked={checked} readOnly className="accent-cyan-400" />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ background: palette.accent, color: palette.void }}
              className="px-5 py-2 rounded-lg text-xs font-bold hover:brightness-110 shadow-lg shadow-cyan-500/20"
            >
              {loading ? "Provisioning Identity..." : "Complete Onboarding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
