import { useState } from "react";
import { X, FileText, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import { palette } from "../../styles/theme.js";
import { api } from "../../services/api.js";

export default function ReportModal({ isOpen, onClose }) {
  const [reportType, setReportType] = useState("Executive Threat Summary");
  const [format, setFormat] = useState("CSV");
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setDownloading(true);
    setTimeout(() => {
      if (format === "CSV") {
        window.open(api.getCSVExportUrl(), "_blank");
      } else {
        // Generate simulated PDF download blob
        const blob = new Blob([
          `AEGIS INSIDER THREAT INTELLIGENCE REPORT\nGenerated: 2026-08-01\nFormat: PDF Summary\nType: ${reportType}\nStatus: Certified ISO27001 Compliant`
        ], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `AEGIS_Threat_Report_${Date.now()}.pdf`;
        a.click();
      }
      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        style={{ background: palette.surface, border: `1px solid ${palette.line}` }}
        className="max-w-md w-full rounded-2xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <FileText size={22} className="text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Export Intelligence Report</h2>
        </div>

        <p style={{ color: palette.textMuted }} className="text-xs mb-6">
          Configure security assessment reports for executive briefing, audit compliance, or SOC investigation archives.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Report Specification Scope</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="Executive Threat Summary">Executive Threat Summary</option>
              <option value="Behavioral Analytics Deep Dive">Behavioral Analytics Deep Dive</option>
              <option value="Incident & Investigation Audit">Incident & Investigation Audit</option>
              <option value="NIST Compliance Matrix">NIST Compliance Matrix</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Target Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              {["CSV", "PDF"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  style={{
                    background: format === fmt ? palette.raised2 : palette.raised,
                    border: `1px solid ${format === fmt ? palette.accent : palette.line}`,
                    color: format === fmt ? palette.accent : palette.textMuted
                  }}
                  className="py-2.5 rounded-lg text-xs font-bold transition-all"
                >
                  {fmt} Document
                </button>
              ))}
            </div>
          </div>

          {downloaded && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              Report successfully generated and downloaded!
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={downloading}
              style={{ background: palette.accent, color: palette.void }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50"
            >
              <Download size={14} />
              {downloading ? "Generating..." : `Download ${format}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
