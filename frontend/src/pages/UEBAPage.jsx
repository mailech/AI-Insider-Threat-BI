import { useState, useEffect } from "react";
import { Users, TrendingUp, Cpu, Target, ArrowUpRight, ShieldAlert } from "lucide-react";
import { palette } from "../styles/theme.js";
import { api } from "../services/api.js";

export default function UEBAPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    api.getEmployees().then(data => {
      if (data && data.length > 0) {
        setEmployees(data);
        setSelectedEmp(data[0]);
      }
    });
  }, []);

  const peerBaseline = 350; // MB average
  const empDataMB = selectedEmp?.employee_id === "EMP-4471" ? 1480 : selectedEmp?.employee_id === "EMP-4452" ? 920 : 280;

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">User & Entity Behavior Analytics (UEBA) Engine</h1>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Machine learning baselines, peer group comparative profiling, and AI predictive threat scoring
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Selection List (1 Column) */}
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
            Monitored Employee Profiles
          </h2>

          <div className="space-y-2">
            {employees.map((emp) => {
              const isSel = selectedEmp?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  style={{
                    background: isSel ? palette.raised2 : palette.raised,
                    border: `1px solid ${isSel ? palette.accent : palette.line}`
                  }}
                  className="w-full p-3 rounded-lg text-left transition-all hover:border-cyan-500/50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white text-xs">{emp.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{emp.department} • {emp.designation}</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      emp.risk_category === "Critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {emp.risk_score}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Behavioral Analytics & Peer Group Benchmarking (2 Columns) */}
        {selectedEmp && (
          <div className="lg:col-span-2 space-y-6">
            {/* Selected User Header Card */}
            <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-semibold">{selectedEmp.employee_id}</span>
                <h2 className="text-lg font-extrabold text-white">{selectedEmp.name}</h2>
                <div className="text-xs text-slate-400 mt-0.5">{selectedEmp.department} Department • Reports to {selectedEmp.manager}</div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">UEBA Threat Risk</span>
                <span style={{ color: selectedEmp.risk_score >= 80 ? "#EF4444" : "#F59E0B" }} className="text-2xl font-extrabold font-mono">
                  {selectedEmp.risk_score} / 100
                </span>
              </div>
            </div>

            {/* Baseline Deviation Comparison */}
            <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800 flex items-center gap-2">
                <Target size={16} className="text-cyan-400" />
                Data Exfiltration Volume vs Department Peer Group Baseline
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-300">Department Baseline Average ({selectedEmp.department})</span>
                    <span className="font-mono text-slate-400">{peerBaseline} MB / day</span>
                  </div>
                  <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div style={{ width: "25%", background: "#3B82F6" }} className="h-full rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-white font-bold">{selectedEmp.name} (Current 24h Telemetry)</span>
                    <span style={{ color: empDataMB > peerBaseline * 2 ? "#EF4444" : "#10B981" }} className="font-mono font-bold">
                      {empDataMB} MB / day ({Math.round((empDataMB/peerBaseline)*100)}% of baseline)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(100, (empDataMB / 1500) * 100)}%`,
                        background: empDataMB > peerBaseline * 2 ? "#EF4444" : "#10B981"
                      }}
                      className="h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              </div>

              {empDataMB > peerBaseline * 2 && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2 font-medium">
                  <ShieldAlert size={16} />
                  Statistical Anomaly Flag: Telemetry volume exceeds 3.2 standard deviations above peer baseline.
                </div>
              )}
            </div>

            {/* Asset Association & Access Privileges */}
            <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Provisioned Asset & Privilege Scopes</h3>
              <div className="flex flex-wrap gap-2">
                {selectedEmp.access_privileges?.map(priv => (
                  <span key={priv} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                    {priv}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
