import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSearch,
  ArrowLeft,
  User,
  Clock,
  Shield,
  Send,
  CheckCircle2,
  FolderLock,
  FileCode,
  Link as LinkIcon,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export const IncidentDetailPage = () => {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const res = await api.getIncidentById(id);
      setIncident(res.data);
      setStatus(res.data.status);
    } catch (err) {
      console.error('Failed to load incident', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await api.addIncidentComment(id, { comment: commentText });
      setCommentText('');
      fetchIncident();
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.updateIncident(id, { status: newStatus });
      setStatus(newStatus);
      fetchIncident();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center glass-panel rounded-xl border border-rose-500/30">
        <p className="text-sm text-slate-300 font-mono">Incident '{id}' not found.</p>
        <button
          onClick={() => navigate('/incidents')}
          className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono"
        >
          Return to Incidents
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <button
        onClick={() => navigate('/incidents')}
        className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Incidents</span>
      </button>

      {/* Top Case Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-mono text-cyan-400 font-bold">{incident.incident_id}</span>
              <SeverityBadge severity={incident.severity} size="md" />
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                Target: {incident.user_id}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-2 font-sans">{incident.title}</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Opened by SOC • Assigned to: <span className="text-cyan-300">{incident.assigned_analyst || 'Unassigned'}</span>
            </p>
          </div>

          {/* Status Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Case Status:</span>
            <select
              value={status}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="OPEN">Open / Active</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed / Remediated</option>
            </select>
          </div>
        </div>

        {/* Case Narrative */}
        <div className="mt-6 pt-6 border-t border-slate-800 text-xs">
          <h3 className="font-mono text-slate-400 uppercase tracking-wider text-[11px] mb-2 font-semibold">
            Forensic Findings & Incident Scope
          </h3>
          <p className="text-slate-200 leading-relaxed font-sans bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {incident.description}
          </p>
        </div>

        {/* Evidence References */}
        {incident.evidence_references && incident.evidence_references.length > 0 && (
          <div className="mt-4">
            <h3 className="font-mono text-slate-400 uppercase tracking-wider text-[11px] mb-2 font-semibold">
              Correlated Artifacts & Evidence Links
            </h3>
            <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
              {incident.evidence_references.map((ev, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/20 text-cyan-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3 h-3 text-cyan-400" />
                  <span>{ev}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Investigation Commentary & Collaboration Thread */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold font-mono text-slate-200 mb-4 flex items-center gap-2">
          <span>SOC Analyst Investigation Notes & Chain-of-Custody Log</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
            {incident.comments ? incident.comments.length : 0} Notes
          </span>
        </h3>

        {/* Comments Stream */}
        <div className="space-y-4 mb-6">
          {incident.comments && incident.comments.length > 0 ? (
            incident.comments.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-sans">
                <div className="flex items-center justify-between mb-2 font-mono text-[11px]">
                  <span className="font-bold text-cyan-400">{c.author}</span>
                  <span className="text-slate-500">{new Date(c.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-slate-200 leading-relaxed">{c.comment}</div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-500 font-mono italic">No notes posted yet.</div>
          )}
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAddComment} className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Add analyst observation, forensic artifact hash, or legal escalation note..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Note</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default IncidentDetailPage;
