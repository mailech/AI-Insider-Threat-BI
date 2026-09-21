import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldAlert, Clock, FileText, Lock, Plus, ArrowLeft,
  CheckCircle, AlertTriangle, Paperclip, Send, HardDrive, Ban
} from 'lucide-react';
import { investigationAPI, employeeAPI } from '../services/api';
import { SeverityBadge, RiskBadge } from '../components/RiskBadge';

export const InvestigationDetailPage = () => {
  const { id } = useParams();
  const [investigation, setInvestigation] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceType, setEvidenceType] = useState('PCAP');
  const [evidenceHash, setEvidenceHash] = useState('');
  const [containmentStatus, setContainmentStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvestigation();
  }, [id]);

  const fetchInvestigation = async () => {
    try {
      const res = await investigationAPI.getInvestigation(id);
      setInvestigation(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await investigationAPI.addNote(id, noteText);
      setNoteText('');
      fetchInvestigation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceName.trim()) return;
    try {
      await investigationAPI.addEvidence(id, {
        name: evidenceName,
        type: evidenceType,
        hash: evidenceHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      });
      setEvidenceName('');
      setEvidenceHash('');
      fetchInvestigation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleContainment = async (action) => {
    try {
      const res = await investigationAPI.executeContainment(id, action);
      setContainmentStatus(`Action executed: ${action.replace('_', ' ')}`);
      fetchInvestigation();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Investigation Workspace {id}...</div>;
  }

  if (!investigation) {
    return <div className="p-8 text-center text-red-400">Investigation dossier not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div className="flex items-center justify-between">
        <Link to="/incidents" className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Incidents Roster
        </Link>
        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold">
          STATUS: {investigation.status?.toUpperCase()}
        </span>
      </div>

      {/* Case Header Dossier */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{investigation.investigation_id}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                LINKED: {investigation.incident_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Target Suspect Identity: <strong className="text-cyan-400 font-mono">{investigation.employee_id}</strong> &bull; Lead Investigator: <strong className="text-slate-200">{investigation.lead_analyst}</strong>
            </p>
          </div>

          {/* Quick Immediate Remediation Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleContainment('isolate_endpoint')}
              className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" /> Isolate Host EDR
            </button>
            <button
              onClick={() => handleContainment('disable_user')}
              className="px-3 py-2 bg-amber-950 hover:bg-amber-900 text-amber-400 border border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> Suspend AD Account
            </button>
          </div>
        </div>

        {containmentStatus && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {containmentStatus}
          </div>
        )}
      </div>

      {/* Main Grid: Chronological Threat Timeline & Forensic Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chronological Timeline (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-cyan-400" /> Correlated Threat Activity Timeline
            </h3>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
              {investigation.timeline_events && investigation.timeline_events.length > 0 ? (
                investigation.timeline_events.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyan-500"></div>
                    <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 text-xs">{evt.event_title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{evt.event_type}</span>
                        </div>
                        <SeverityBadge severity={evt.severity} />
                      </div>
                      <p className="text-xs text-slate-400">{evt.details}</p>
                      <p className="text-[10px] text-slate-500 font-mono pt-1">
                        {new Date(evt.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 pl-8">No timeline entries recorded yet.</div>
              )}
            </div>
          </div>

          {/* Investigator Notes Journal */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" /> Forensic Investigator Journal & Action Log
            </h3>

            <div className="space-y-3">
              {investigation.investigator_notes?.map((n, idx) => (
                <div key={idx} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span className="font-bold text-cyan-400 font-sans">{n.author}</span>
                    <span>{n.timestamp}</span>
                  </div>
                  <p className="text-slate-200">{n.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Log an investigator observation, interview result, or forensic step..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Log Entry
              </button>
            </form>
          </div>
        </div>

        {/* Forensic Evidence Vault (1 Col) */}
        <div className="space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-cyan-400" /> Attached Threat Evidence Vault
            </h3>

            <div className="space-y-2">
              {investigation.evidence_items && investigation.evidence_items.length > 0 ? (
                investigation.evidence_items.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">{item.type}</span>
                    </div>
                    {item.hash && (
                      <p className="text-[10px] font-mono text-slate-500 truncate" title={item.hash}>
                        SHA256: {item.hash}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No forensic artifacts attached yet.</p>
              )}
            </div>

            {/* Add Evidence Form */}
            <form onSubmit={handleAddEvidence} className="space-y-2.5 pt-3 border-t border-slate-800 text-xs">
              <p className="font-semibold text-slate-300">Attach Forensic Artifact</p>
              <input
                type="text"
                placeholder="File name (e.g. cloud_traffic_leak.pcap)"
                value={evidenceName}
                onChange={(e) => setEvidenceName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="px-2.5 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-200 text-xs focus:outline-none"
                >
                  <option value="PCAP">PCAP</option>
                  <option value="Memory">Memory Dump</option>
                  <option value="USB_Reg">Registry Key</option>
                  <option value="Disk">Disk Image</option>
                  <option value="Email">Email EML</option>
                </select>
                <input
                  type="text"
                  placeholder="SHA256 Hash"
                  value={evidenceHash}
                  onChange={(e) => setEvidenceHash(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold rounded-lg text-xs"
              >
                + Register Evidence Item
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
