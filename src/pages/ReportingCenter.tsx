import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Share2, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  FileCode,
  ArrowUpRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ReportingCenter: React.FC = () => {
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const reports = [
    {
      id: 'REP-01',
      title: 'Executive Board Insider Threat Summary',
      type: 'EXECUTIVE',
      description: 'High-level synthesis of enterprise risk scores, contained exfiltration attempts, and overall defensive posture trends.',
      lastGenerated: 'Today, 08:30 UTC',
      frequency: 'Weekly',
      format: 'PDF / JSON'
    },
    {
      id: 'REP-02',
      title: 'SOC Operational UEBA Audit Trail',
      type: 'OPERATIONAL',
      description: 'Comprehensive line-item telemetry log of all triaged anomalies, playbook containment triggers, and analyst actions.',
      lastGenerated: 'Yesterday, 18:00 UTC',
      frequency: 'Daily',
      format: 'CSV / SIEM'
    },
    {
      id: 'REP-03',
      title: 'SOC2 Type II & GDPR Data Privacy Compliance Dossier',
      type: 'COMPLIANCE',
      description: 'Evidence artifacts demonstrating continuous employee data access auditing and privacy-preserving tokenization.',
      lastGenerated: 'Aug 15, 2026',
      frequency: 'Monthly',
      format: 'PDF'
    },
    {
      id: 'REP-04',
      title: 'Privilege Misuse & Kerberos TGT Anomaly Dossier',
      type: 'IDENTITY',
      description: 'Detailed analysis of Kerberos ticket requests, PAM escalation events, and domain admin session durations.',
      lastGenerated: 'Aug 18, 2026',
      frequency: 'On-Demand',
      format: 'PDF / JSON'
    }
  ];

  const handleGenerate = (id: string, title: string) => {
    setGeneratingReport(id);
    setTimeout(() => {
      setGeneratingReport(null);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      
      const content = `SENTINEL AI - ${title}\nGenerated at: ${new Date().toISOString()}\nStatus: CERTIFIED COMPLIANT\nTotal Identities Monitored: 1,420\nPrimary Target: Authar Morgan (EMP-1042)\nContained Threats: 2\nThreat Level: RESILIENT`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${id}_${title.replace(/\s+/g, '_').toLowerCase()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 750);
  };

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                ENTERPRISE SOC REPORTING & AUDIT DOSSIERS
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                AUTOMATED SYNTHESIS
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              Executive briefings, compliance evidence packages, and SOC operations forensics exports.
            </p>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="cyber-panel p-4 rounded-xl hover:border-[#18E66A]/50 shadow-xl transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <span className="px-2 py-0.5 rounded bg-[#0A1C13] text-[#2DFF78] border border-[#18E66A]/30 text-[10px] font-bold uppercase">
                  {rep.type}
                </span>
                <span className="text-[10px] text-[#8CA798]">{rep.frequency}</span>
              </div>

              <h2 className="text-sm font-bold text-[#E8FFF0]">{rep.title}</h2>
              <p className="text-xs text-[#8CA798] leading-relaxed">{rep.description}</p>
            </div>

            <div className="pt-3 border-t border-[#18E66A]/15 flex items-center justify-between text-xs">
              <div className="text-[#8CA798] text-[10px]">
                Last Generated: <strong className="text-[#E8FFF0]">{rep.lastGenerated}</strong>
              </div>

              <button
                onClick={() => handleGenerate(rep.id, rep.title)}
                disabled={generatingReport === rep.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18E66A] hover:bg-[#2DFF78] text-[#020605] font-bold text-xs shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{generatingReport === rep.id ? 'Generating...' : 'Export Dossier'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
