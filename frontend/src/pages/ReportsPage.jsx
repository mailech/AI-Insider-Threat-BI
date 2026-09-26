import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  Users,
  Building2,
  AlertTriangle,
  Eye,
  Trash2,
  Save,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  ShieldAlert,
  Clock,
  X,
  Printer,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import RiskScoreGauge from '../components/RiskScoreGauge';

export const ReportsPage = () => {
  // Filter States
  const [reportType, setReportType] = useState('Executive Security Summary');
  const [reportName, setReportName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  // Employee directory for dropdown selector
  const [employees, setEmployees] = useState([]);

  // Saved Reports State
  const [savedReports, setSavedReports] = useState([]);
  const [savedSearch, setSavedSearch] = useState('');
  const [savedTypeFilter, setSavedTypeFilter] = useState('ALL');
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Preview Modal State
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Action Loading States & Notifications
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [actionStatus, setActionStatus] = useState(null); // { type: 'success' | 'info' | 'error', message: string }

  const reportTypes = [
    { name: 'Executive Security Summary', desc: 'High-level SOC threat posture, KPI distributions & trend briefing' },
    { name: 'Insider Threat Report', desc: 'Detailed exfiltration signals, critical risk users & MITRE tactics' },
    { name: 'Behavioral Analytics Report', desc: 'Multi-channel activity deviations, z-score spikes & off-hour patterns' },
    { name: 'Risk Assessment Report', desc: '5-factor explainable threat scores across roles & privilege levels' },
    { name: 'Anomaly Detection Report', desc: 'Unsupervised Isolation Forest detections & baseline deviations' },
    { name: 'Investigation Report', desc: 'Correlated incident cases, evidence references & SOC analyst notes' },
    { name: 'Employee Risk Report', desc: 'Deep forensic profile, activity timeline & baseline of a single employee' }
  ];

  const departments = ['ALL', 'Engineering', 'Finance', 'Human Resources', 'Sales & Marketing', 'IT Operations', 'Executive'];
  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  useEffect(() => {
    fetchSavedReports();
    fetchEmployeesList();
  }, []);

  // Auto-generate a default report name when report type or user changes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedUserId) {
      setReportName(`Employee_Threat_${selectedUserId}_${today}`);
    } else {
      setReportName(`${reportType.replace(/ /g, '_')}_${today}`);
    }
  }, [reportType, selectedUserId]);

  const showNotification = (message, type = 'success') => {
    setActionStatus({ message, type });
    setTimeout(() => setActionStatus(null), 4000);
  };

  const fetchEmployeesList = async () => {
    try {
      const res = await api.getEmployees({ limit: 100 });
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Failed to load employees list', err);
    }
  };

  const fetchSavedReports = async () => {
    setLoadingSaved(true);
    try {
      const res = await api.listSavedReports();
      setSavedReports(res.data.reports || []);
    } catch (err) {
      console.error('Failed to load saved reports', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Helper to trigger browser file download from Blob
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // 1. Generate Preview
  const handlePreviewReport = async () => {
    setPreviewLoading(true);
    showNotification('Preparing live telemetry data for report preview...', 'info');
    try {
      const payload = {
        report_type: reportType,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        user_id: selectedUserId || undefined,
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
        name: reportName
      };
      const res = await api.generateReportPreview(payload);
      setPreviewData(res.data);
      setShowPreviewModal(true);
      setActionStatus(null);
    } catch (err) {
      console.error('Failed to generate preview', err);
      showNotification('Error generating report preview. Please check parameters.', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  // 2. Direct PDF Export
  const handleDirectDownloadPDF = async () => {
    setGeneratingPdf(true);
    showNotification('Generating PDF document with ReportLab...', 'info');
    try {
      const payload = {
        report_type: reportType,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        user_id: selectedUserId || undefined,
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined
      };
      const res = await api.downloadDirectPDF(payload);
      const filename = `${reportName || 'Security_Report'}.pdf`;
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), filename);
      showNotification(`PDF Report "${filename}" downloaded successfully!`, 'success');
    } catch (err) {
      console.error('PDF download failed', err);
      showNotification('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 3. Direct Excel Export
  const handleDirectDownloadExcel = async () => {
    setGeneratingExcel(true);
    showNotification('Generating multi-sheet Excel workbook...', 'info');
    try {
      const payload = {
        report_type: reportType,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        user_id: selectedUserId || undefined,
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined
      };
      const res = await api.downloadDirectExcel(payload);
      const filename = `${reportName || 'Security_Report'}.xlsx`;
      downloadBlob(new Blob([res.data]), filename);
      showNotification(`Excel Workbook "${filename}" downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Excel download failed', err);
      showNotification('Failed to generate Excel file. Please try again.', 'error');
    } finally {
      setGeneratingExcel(false);
    }
  };

  // 4. Save Report into Database
  const handleSaveReport = async () => {
    setSavingReport(true);
    showNotification('Saving report snapshot & archiving files...', 'info');
    try {
      const payload = {
        name: reportName || `${reportType} - ${new Date().toISOString().split('T')[0]}`,
        report_type: reportType,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        filters: {
          user_id: selectedUserId || undefined,
          department: selectedDept,
          severity: selectedSeverity
        },
        summary_data: previewData || undefined
      };
      await api.saveReport(payload);
      showNotification(`Report "${payload.name}" saved to system successfully!`, 'success');
      fetchSavedReports();
    } catch (err) {
      console.error('Failed to save report', err);
      showNotification('Failed to save report to database.', 'error');
    } finally {
      setSavingReport(false);
    }
  };

  // 5. Download Saved Report PDF
  const handleDownloadSavedPDF = async (report) => {
    try {
      showNotification(`Downloading PDF for ${report.name}...`, 'info');
      const res = await api.downloadSavedPDF(report.report_id);
      const filename = `${report.name.replace(/ /g, '_')}_${report.report_id}.pdf`;
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), filename);
      showNotification('PDF downloaded successfully.', 'success');
    } catch (err) {
      showNotification('Failed to download saved PDF.', 'error');
    }
  };

  // 6. Download Saved Report Excel
  const handleDownloadSavedExcel = async (report) => {
    try {
      showNotification(`Downloading Excel for ${report.name}...`, 'info');
      const res = await api.downloadSavedExcel(report.report_id);
      const filename = `${report.name.replace(/ /g, '_')}_${report.report_id}.xlsx`;
      downloadBlob(new Blob([res.data]), filename);
      showNotification('Excel workbook downloaded successfully.', 'success');
    } catch (err) {
      showNotification('Failed to download saved Excel.', 'error');
    }
  };

  // 7. Delete Saved Report
  const handleDeleteSavedReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this saved report from system archives?')) return;
    try {
      await api.deleteSavedReport(reportId);
      showNotification('Report deleted successfully.', 'success');
      fetchSavedReports();
    } catch (err) {
      showNotification('Failed to delete saved report.', 'error');
    }
  };

  // Filtered saved reports
  const filteredSavedReports = savedReports.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(savedSearch.toLowerCase()) ||
      r.report_id.toLowerCase().includes(savedSearch.toLowerCase()) ||
      r.created_by.toLowerCase().includes(savedSearch.toLowerCase());
    const matchesType = savedTypeFilter === 'ALL' || r.report_type === savedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Alert Banner */}
      {actionStatus && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border font-mono text-xs shadow-2xl flex items-center gap-3 backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            actionStatus.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : actionStatus.type === 'info'
              ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
          }`}
        >
          {actionStatus.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : actionStatus.type === 'info' ? (
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{actionStatus.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
            <FileText className="w-6 h-6 text-cyan-400" />
            Security Intelligence & Threat Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate, preview, download (PDF / Excel), and save executive SOC threat intelligence reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSavedReports}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSaved ? 'animate-spin' : ''}`} />
            <span>Refresh Archives</span>
          </button>
        </div>
      </div>

      {/* ----------------- REPORT BUILDER SECTION ----------------- */}
      <div className="bg-[#090e1f] border border-slate-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 mb-4">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Report Configuration & Generator</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Report Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
              Report Template Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            >
              {reportTypes.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 italic">
              {reportTypes.find((t) => t.name === reportType)?.desc}
            </p>
          </div>

          {/* Report Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Report Document Title
            </label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g. Q1_Executive_Threat_Report"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Target Employee Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Target Employee (Optional)
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="">All Monitored Personnel</option>
              {employees.map((emp) => (
                <option key={emp.user_id} value={emp.user_id}>
                  {emp.user_id} &bull; {emp.full_name} ({emp.department} - Risk: {emp.current_risk_score})
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Reporting Period Start (From)
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Reporting Period End (To)
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Department Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Department Scope
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Corporate Departments' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              Risk Severity Tier
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            >
              {severities.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All Severity Tiers (CRITICAL, HIGH, MED, LOW)' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Telemetry data mapped directly from CERT R4.2 & Live ML dual-engine</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Preview Button */}
            <button
              onClick={handlePreviewReport}
              disabled={previewLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-mono font-medium transition shadow-lg disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>{previewLoading ? 'Loading Preview...' : 'Preview Report'}</span>
            </button>

            {/* Save Report Button */}
            <button
              onClick={handleSaveReport}
              disabled={savingReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-mono font-medium transition shadow-lg disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>{savingReport ? 'Saving...' : 'Save Report'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDirectDownloadPDF}
              disabled={generatingPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 text-rose-300 text-xs font-mono font-medium transition shadow-lg disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>{generatingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            {/* Download Excel Button */}
            <button
              onClick={handleDirectDownloadExcel}
              disabled={generatingExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-medium transition shadow-lg disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>{generatingExcel ? 'Generating Excel...' : 'Download Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- SAVED REPORTS SECTION ----------------- */}
      <div className="bg-[#090e1f] border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Saved Report Archives & Telemetry Snapshots
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Stored threat reports and compliance briefings generated by SOC security analysts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
                placeholder="Search saved reports..."
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50 w-48 transition"
              />
            </div>

            {/* Filter by Type */}
            <select
              value={savedTypeFilter}
              onChange={(e) => setSavedTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50 transition"
            >
              <option value="ALL">All Saved Types</option>
              {reportTypes.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Saved Reports Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800/80">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Report Name & ID</th>
                <th className="py-3 px-4">Report Type</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4">Creation Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {loadingSaved ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 font-mono text-xs animate-pulse">
                    Loading saved reports...
                  </td>
                </tr>
              ) : filteredSavedReports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 font-mono text-xs">
                    No saved reports found. Click "Save Report" above to archive a report snapshot.
                  </td>
                </tr>
              ) : (
                filteredSavedReports.map((report) => (
                  <tr key={report.report_id} className="hover:bg-slate-900/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{report.name}</div>
                      <div className="text-[10px] text-cyan-400/80">{report.report_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px]">
                        {report.report_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{report.created_by}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(report.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Preview */}
                        <button
                          onClick={() => {
                            if (report.summary_data && Object.keys(report.summary_data).length > 0) {
                              setPreviewData(report.summary_data);
                              setShowPreviewModal(true);
                            } else {
                              handlePreviewReport();
                            }
                          }}
                          title="View Preview"
                          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadSavedPDF(report)}
                          title="Download PDF"
                          className="p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Download Excel */}
                        <button
                          onClick={() => handleDownloadSavedExcel(report)}
                          title="Download Excel"
                          className="p-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteSavedReport(report.report_id)}
                          title="Delete Report"
                          className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- REPORT PREVIEW MODAL ----------------- */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#090e1f] border border-cyan-500/30 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
                    {previewData.report_title}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      PREVIEW
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Generated: {previewData.generated_at} &bull; Author: {previewData.author}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDirectDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono hover:bg-rose-500/30 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={handleDirectDownloadExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono hover:bg-cyan-500/30 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handleSaveReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono hover:bg-emerald-500/30 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-6 font-mono text-xs">
              {/* Executive Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Monitored</div>
                  <div className="text-lg font-bold text-slate-100 mt-0.5">
                    {previewData.metrics?.total_employees || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/20">
                  <div className="text-[10px] text-rose-400 uppercase">Critical Threats</div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">
                    {previewData.metrics?.critical_threats || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/20">
                  <div className="text-[10px] text-amber-400 uppercase">High Risk</div>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">
                    {previewData.metrics?.high_risk_users || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/20">
                  <div className="text-[10px] text-cyan-400 uppercase">Anomalies</div>
                  <div className="text-lg font-bold text-cyan-400 mt-0.5">
                    {previewData.metrics?.total_anomalies_detected || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/20">
                  <div className="text-[10px] text-indigo-400 uppercase">Avg Risk</div>
                  <div className="text-lg font-bold text-indigo-300 mt-0.5">
                    {previewData.metrics?.avg_risk_score || 0} / 100
                  </div>
                </div>
              </div>

              {/* Employee Target Profile (if single employee report) */}
              {previewData.target_employee && (
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Target Personnel Threat Assessment
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500">Employee ID:</span>{' '}
                      <span className="text-slate-100 font-bold">{previewData.target_employee.user_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Full Name:</span>{' '}
                      <span className="text-slate-100">{previewData.target_employee.full_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Department:</span>{' '}
                      <span className="text-slate-100">{previewData.target_employee.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Risk Score:</span>{' '}
                      <span className="text-rose-400 font-bold">
                        {previewData.target_employee.current_risk_score} ({previewData.target_employee.current_severity})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Risky Personnel Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>High-Risk Employees ({previewData.top_risky_employees?.length || 0})</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">User ID</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Risk Score</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Anomalies</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {previewData.top_risky_employees?.map((emp) => (
                        <tr key={emp.user_id} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-semibold text-cyan-400">{emp.user_id}</td>
                          <td className="py-2 px-3 text-slate-200">{emp.full_name}</td>
                          <td className="py-2 px-3 text-slate-400">{emp.department}</td>
                          <td className="py-2 px-3 text-slate-400">{emp.role}</td>
                          <td className="py-2 px-3 font-bold text-slate-100">{emp.current_risk_score}</td>
                          <td className="py-2 px-3">
                            <SeverityBadge severity={emp.current_severity} />
                          </td>
                          <td className="py-2 px-3">{emp.anomaly_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Security Alerts Log */}
              {previewData.alerts?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Recent Security Threat Alerts ({previewData.alerts.length})
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Alert ID</th>
                          <th className="py-2 px-3">User</th>
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Severity</th>
                          <th className="py-2 px-3">Reasons & Indicators</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {previewData.alerts.slice(0, 5).map((a) => (
                          <tr key={a.alert_id} className="hover:bg-slate-900/50">
                            <td className="py-2 px-3 text-cyan-400">{a.alert_id}</td>
                            <td className="py-2 px-3 font-semibold text-slate-200">{a.user_id}</td>
                            <td className="py-2 px-3 text-slate-400">{a.timestamp?.substring(0, 19)}</td>
                            <td className="py-2 px-3">
                              <SeverityBadge severity={a.severity} />
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {a.reasons?.join('; ') || 'Behavioral anomaly detected'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>CERT THREAT-BI &bull; SOC Automated Reporting Subsystem</span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
