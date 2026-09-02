import { useState, useEffect } from "react";
import { FileText, Download, ShieldCheck, Users, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";
import { palette } from "../styles/theme.js";
import { api } from "../services/api.js";

export default function ReportsPage({ onOpenExportModal }) {
  const [employees, setEmployees] = useState([]);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  useEffect(() => {
    api.getEmployees().then(data => {
      if (data && data.length > 0) {
        setEmployees(data);
      }
    });
  }, []);

  const total = employees.length || 6;
  const highCount = employees.filter(e => e.risk_score >= 70).length;
  const medCount = employees.filter(e => e.risk_score >= 40 && e.risk_score < 70).length;
  const lowCount = employees.filter(e => e.risk_score < 40).length;

  const highPct = Math.round((highCount / total) * 100);
  const medPct = Math.round((medCount / total) * 100);
  const lowPct = Math.max(0, 100 - highPct - medPct);

  const avgScore = total > 0
    ? (employees.reduce((acc, e) => acc + (e.risk_score || 0), 0) / total).toFixed(1)
    : "68.7";

  const handleDownloadPDF = async () => {
    setDownloadingFormat("PDF");
    try {
      const pdfUrl = api.getPDFExportUrl("Executive Threat Summary");
      const res = await fetch(pdfUrl);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `AEGIS_Insider_Threat_Report_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        window.open(pdfUrl, "_blank");
      }
    } catch (err) {
      window.open(api.getPDFExportUrl("Executive Threat Summary"), "_blank");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadCSV = () => {
    window.open(api.getCSVExportUrl(), "_blank");
  };

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Security Intelligence & Audit Reports</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={12} />
              ISO 27001 / NIST SP 800-53
            </span>
          </div>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Enterprise-wide insider risk posture, entity distribution metrics, and certified audit documentation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadCSV}
            style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download size={14} className="text-emerald-400" />
            Download CSV
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloadingFormat === "PDF"}
            style={{ background: palette.accent, color: palette.void }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileText size={14} />
            {downloadingFormat === "PDF" ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* 4 Summary Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
              Total Employees
            </span>
            <Users size={18} className="text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{total}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Monitored corporate identities</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
              High Risk Users
            </span>
            <AlertOctagon size={18} className="text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-red-400 font-mono">{highCount}</div>
          <div className="text-xs text-red-400/90 mt-1 font-medium">{highPct}% of total workforce (Score ≥ 70)</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
              Medium Risk Users
            </span>
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">{medCount}</div>
          <div className="text-xs text-amber-400/90 mt-1 font-medium">{medPct}% of total workforce (Score 40-69)</div>
        </div>

        <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
              Average Risk Score
            </span>
            <CheckCircle2 size={18} className="text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{avgScore}%</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Overall organizational risk score</div>
        </div>
      </div>

      {/* Risk Distribution Visual Bars */}
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="p-5 rounded-xl mb-6">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Risk Distribution Proportions
          </h2>
          <span className="text-xs font-mono text-slate-400">Total Monitored: {total} Users</span>
        </div>

        <div className="space-y-4">
          {/* High Risk Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-red-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                High Risk (Score 70–100)
              </span>
              <span className="font-mono text-white">{highCount} users ({highPct}%)</span>
            </div>
            <div className="w-full bg-slate-800/80 h-3.5 rounded-full overflow-hidden p-0.5">
              <div
                style={{ width: `${Math.max(8, highPct)}%`, background: "#EF4444" }}
                className="h-full rounded-full transition-all duration-500 shadow-sm shadow-red-500/50"
              />
            </div>
          </div>

          {/* Medium Risk Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-amber-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                Medium Risk (Score 40–69)
              </span>
              <span className="font-mono text-white">{medCount} users ({medPct}%)</span>
            </div>
            <div className="w-full bg-slate-800/80 h-3.5 rounded-full overflow-hidden p-0.5">
              <div
                style={{ width: `${Math.max(8, medPct)}%`, background: "#F59E0B" }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Low Risk Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-emerald-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Low Risk (Score 0–39)
              </span>
              <span className="font-mono text-white">{lowCount} users ({lowPct}%)</span>
            </div>
            <div className="w-full bg-slate-800/80 h-3.5 rounded-full overflow-hidden p-0.5">
              <div
                style={{ width: `${Math.max(8, lowPct)}%`, background: "#10B981" }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Risk Report Table */}
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}` }} className="rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Employee Risk Assessment Audit Table
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Showing all {employees.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ background: palette.raised, borderBottom: `1px solid ${palette.line}` }} className="text-slate-400 font-mono">
                <th className="py-3 px-4">Employee ID & Name</th>
                <th className="py-3 px-4">Department & Designation</th>
                <th className="py-3 px-4">Assigned Manager</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Threat Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employees.map((emp) => {
                const score = emp.risk_score || 0;
                const isHigh = score >= 70;
                const isMed = score >= 40 && score < 70;
                const badgeColor = isHigh ? "bg-red-500/20 text-red-400 border-red-500/30" : isMed ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
                return (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{emp.name}</div>
                      <div className="text-[11px] font-mono text-cyan-400">{emp.employee_id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{emp.department}</div>
                      <div className="text-[11px] text-slate-400">{emp.designation}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {emp.manager}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span style={{ color: isHigh ? "#EF4444" : isMed ? "#F59E0B" : "#10B981" }}>
                        {score} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${badgeColor}`}>
                        {emp.risk_category || (isHigh ? "High" : isMed ? "Medium" : "Low")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 py-3">
        Report generated from current security monitoring data • AEGIS Behavioral Intelligence System
      </div>
    </div>
  );
}
