import { useState } from "react";
import { X, UserCheck, Shield, Laptop, Lock, Mail, Building2, CheckCircle2, Edit2 } from "lucide-react";
import { palette } from "../../styles/theme.js";
import { api } from "../../services/api.js";

export default function EmployeeDetailModal({ employee, isOpen, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [designation, setDesignation] = useState(employee?.designation || "");
  const [manager, setManager] = useState(employee?.manager || "");
  const [status, setStatus] = useState(employee?.status || "Active");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !employee) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await api.updateEmployee(employee.id, {
        designation,
        manager,
        status
      });
      setIsEditing(false);
      onUpdate(updated);
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
        className="max-w-xl w-full rounded-2xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X size={18} />
        </button>

        {/* Employee Header Banner */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold font-mono text-lg">
              {employee.name.split(' ').map(n=>n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{employee.name}</h2>
                <span className="text-xs font-mono font-semibold text-cyan-400 px-2 py-0.5 rounded bg-slate-800">
                  {employee.employee_id}
                </span>
              </div>
              <p style={{ color: palette.textMuted }} className="text-xs mt-0.5">
                {employee.department} Department • {employee.designation}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Risk Category</span>
            <span
              className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded ${
                employee.risk_category === "Critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" : employee.risk_category === "High" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {employee.risk_score} / 100 ({employee.risk_category})
            </span>
          </div>
        </div>

        {/* Identity Details Grid */}
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div style={{ background: palette.raised, border: `1px solid ${palette.line}` }} className="p-3 rounded-xl">
              <span className="text-slate-400 font-semibold text-[10px] uppercase block mb-1">Corporate Email</span>
              <div className="text-white font-mono flex items-center gap-1.5">
                <Mail size={13} className="text-cyan-400" />
                {employee.email}
              </div>
            </div>

            <div style={{ background: palette.raised, border: `1px solid ${palette.line}` }} className="p-3 rounded-xl">
              <span className="text-slate-400 font-semibold text-[10px] uppercase block mb-1">Reporting Manager</span>
              <div className="text-white font-semibold flex items-center gap-1.5">
                <Building2 size={13} className="text-cyan-400" />
                {isEditing ? (
                  <input
                    type="text"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs focus:outline-none"
                  />
                ) : (
                  employee.manager
                )}
              </div>
            </div>
          </div>

          {/* Provisioned Device Asset */}
          <div style={{ background: palette.raised2, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Laptop size={15} className="text-cyan-400" />
              Associated Device Asset Information
            </h3>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">HOSTNAME</span>
                <span className="text-white font-bold">{employee.device_info?.hostname || "FIN-LAPTOP-88"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">OPERATING SYSTEM</span>
                <span className="text-slate-200">{employee.device_info?.os || "Windows 11"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">BOUND IP ADDRESS</span>
                <span className="text-cyan-400 font-bold">{employee.device_info?.ip || "10.4.12.89"}</span>
              </div>
            </div>
          </div>

          {/* Access Privileges Scopes */}
          <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-4 rounded-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Lock size={15} className="text-cyan-400" />
              Granted Access Privileges & System Scopes
            </h3>
            <div className="flex flex-wrap gap-2">
              {employee.access_privileges?.map((priv) => (
                <span key={priv} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                  {priv}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
          <div className="text-[11px] text-slate-400">
            Telemetry Status: <span className="text-emerald-400 font-bold">{employee.status || "Active"}</span>
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={loading}
                style={{ background: palette.accent, color: palette.void }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold hover:brightness-110"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800"
              >
                <Edit2 size={13} className="text-cyan-400" />
                Edit Profile & Manager
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
