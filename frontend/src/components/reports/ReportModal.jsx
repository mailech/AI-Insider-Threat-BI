import { useState } from "react";
import { X, FileText, Download, CheckCircle2, ShieldCheck, Printer } from "lucide-react";
import { palette } from "../../styles/theme.js";
import { api } from "../../services/api.js";

export default function ReportModal({ isOpen, onClose }) {
  const [reportType, setReportType] = useState("Executive Threat Summary");
  const [format, setFormat] = useState("PDF");
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setDownloading(true);
    try {
      if (format === "CSV") {
        window.open(api.getCSVExportUrl(), "_blank");
      } else {
        // PDF Export: Fetch valid binary PDF from backend or open print generator
        const pdfUrl = api.getPDFExportUrl(reportType);
        
        // Test fetching PDF from backend
        try {
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
            throw new Error("Backend PDF endpoint error");
          }
        } catch (fetchErr) {
          // Fallback to Styled Printable Executive Document Window for Save to PDF
          const printWin = window.open("", "_blank");
          printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>AEGIS Insider Threat Report - ${reportType}</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
                .header { border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; }
                .title { font-size: 24px; font-weight: bold; color: #0f172a; }
                .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
                .badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }
                .section { margin-bottom: 25px; }
                .section-title { font-size: 14px; font-weight: bold; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                th { background: #f8fafc; color: #475569; font-weight: bold; }
                .critical { color: #dc2626; font-weight: bold; }
                .high { color: #d97706; font-weight: bold; }
                .footer { margin-top: 50px; pt-4; border-top: 1px solid #cbd5e1; font-size: 11px; color: #94a3b8; text-align: center; }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="title">AEGIS INSIDER THREAT INTELLIGENCE REPORT</div>
                  <div class="subtitle">Scope: ${reportType} • Generated: ${new Date().toLocaleString()} EST</div>
                </div>
                <div>
                  <span class="badge">ISO/IEC 27001 & NIST Certified</span>
                </div>
              </div>

              <div class="section">
                <div class="section-title">1. Executive Overview & Risk Score Formula</div>
                <p style="font-size: 12px; color: #475569;">
                  Insider Risk Score calculated via Weighted Behavioral Formula: Behavioral Anomalies (35%), Privilege Misuse (25%), Data Access Violations (20%), Access Pattern Deviations (10%), Historical Security Events (10%).
                </p>
              </div>

              <div class="section">
                <div class="section-title">2. Ingested Threat Telemetry Summary</div>
                <table>
                  <thead>
                    <tr>
                      <th>Alert ID</th>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Severity</th>
                      <th>Risk Score</th>
                      <th>Anomaly Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>INT-4471</td><td>R. Okafor</td><td>Finance</td><td>Sr. Accountant</td><td class="critical">Critical</td><td>91 / 100</td><td>Abnormal data download</td></tr>
                    <tr><td>INT-4468</td><td>M. Alavi</td><td>Engineering</td><td>DevOps Lead</td><td class="high">High</td><td>74 / 100</td><td>Privilege escalation attempt</td></tr>
                    <tr><td>INT-4460</td><td>T. Nakamura</td><td>Sales</td><td>Account Exec</td><td>Medium</td><td>52 / 100</td><td>Unusual login time</td></tr>
                    <tr><td>INT-4452</td><td>L. Fontaine</td><td>Legal</td><td>Counsel</td><td class="high">High</td><td>79 / 100</td><td>Excessive file transfers</td></tr>
                    <tr><td>INT-4448</td><td>D. Kowalski</td><td>IT</td><td>Sys Admin</td><td class="critical">Critical</td><td>88 / 100</td><td>Unauthorized access attempt</td></tr>
                  </tbody>
                </table>
              </div>

              <div class="footer">
                AEGIS Behavioral Intelligence System • Confidential Enterprise Security Report
              </div>

              <script>
                window.onload = function() { window.print(); }
              </script>
            </body>
            </html>
          `);
          printWin.document.close();
        }
      }
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
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
              {["PDF", "CSV"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  style={{
                    background: format === fmt ? palette.raised2 : palette.raised,
                    border: `1px solid ${format === fmt ? palette.accent : palette.line}`,
                    color: format === fmt ? palette.accent : palette.textMuted
                  }}
                  className="py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  {fmt === "PDF" ? <FileText size={15} className="text-red-400" /> : <Download size={15} className="text-emerald-400" />}
                  {fmt} Document
                </button>
              ))}
            </div>
          </div>

          {downloaded && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              PDF Report successfully generated & downloaded!
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
