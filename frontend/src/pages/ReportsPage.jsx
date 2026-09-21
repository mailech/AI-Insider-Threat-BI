import React, { useState } from 'react';
import {
  FileText, Download, FileSpreadsheet, FileCode,
  Shield, Award, BarChart2, CheckCircle2
} from 'lucide-react';
import { reportAPI } from '../services/api';

export const ReportsPage = () => {
  const [downloading, setDownloading] = useState('');

  const handleDownload = async (type, format) => {
    setDownloading(`${type}-${format}`);
    try {
      let response;
      let filename = `insider_threat_${type}_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'pdf') {
        response = await reportAPI.downloadPdfReport();
        filename += '.pdf';
      } else if (format === 'excel') {
        response = await reportAPI.downloadExcelReport();
        filename += '.xlsx';
      } else {
        response = await reportAPI.downloadCsvReport();
        filename += '.csv';
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading('');
    }
  };

  const reports = [
    {
      id: 'threat_intelligence',
      title: '1. Executive Threat Intelligence & Incident Dossier',
      desc: 'Complete summary of active alerts, investigated threat entities, ML ensemble confidence scores, and containment records.',
      badge: 'Confidential SOC Briefing',
      formats: ['pdf', 'excel', 'csv']
    },
    {
      id: 'risk_assessment',
      title: '2. Enterprise Insider Risk & Behavioral Roster Assessment',
      desc: 'All monitored identities ranked by the 5-factor weighted formula (35% Beh, 25% Priv, 20% Data, 10% Pattern, 10% Hist).',
      badge: 'Risk Governance Audit',
      formats: ['excel', 'csv', 'pdf']
    },
    {
      id: 'behavioral_analytics',
      title: '3. UEBA Behavioral Profiling & Baseline Drift Report',
      desc: 'Departmental peer baselines, Z-score deviations, out-of-session access metrics, and peripheral USB connection rates.',
      badge: 'UEBA Deep Dive',
      formats: ['excel', 'csv', 'pdf']
    },
    {
      id: 'compliance_audit',
      title: '4. ISO 27001 / SOC 2 Type II Compliance & Audit Export',
      desc: 'Formal regulatory evidence log showing access privilege reviews, administrative actions, and incident response SLAs.',
      badge: 'Audit & Regulatory',
      formats: ['pdf', 'excel']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" /> Executive Reporting & Multi-Format Export Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">Generate and export automated PDF briefings (ReportLab), multi-sheet formatted Excel spreadsheets (OpenPyXL), and raw CSV logs</p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="p-6 bg-[#111827] border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  {rep.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">{rep.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{rep.desc}</p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Available Export Formats</p>
              <div className="flex flex-wrap gap-2">
                {rep.formats.includes('pdf') && (
                  <button
                    onClick={() => handleDownload(rep.id, 'pdf')}
                    disabled={downloading === `${rep.id}-pdf`}
                    className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloading === `${rep.id}-pdf` ? 'Generating PDF...' : 'Download PDF'}
                  </button>
                )}
                {rep.formats.includes('excel') && (
                  <button
                    onClick={() => handleDownload(rep.id, 'excel')}
                    disabled={downloading === `${rep.id}-excel`}
                    className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    {downloading === `${rep.id}-excel` ? 'Exporting XLSX...' : 'Export Excel (.xlsx)'}
                  </button>
                )}
                {rep.formats.includes('csv') && (
                  <button
                    onClick={() => handleDownload(rep.id, 'csv')}
                    disabled={downloading === `${rep.id}-csv`}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    {downloading === `${rep.id}-csv` ? 'Exporting CSV...' : 'Export CSV'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
