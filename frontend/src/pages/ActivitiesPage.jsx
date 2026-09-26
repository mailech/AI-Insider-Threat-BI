import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  Laptop,
  FolderLock,
  Globe,
  Mail,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export const ActivitiesPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.getActivities({
        user_id: userIdFilter || undefined,
        anomaly_only: anomalyOnly || undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      });
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to load activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [anomalyOnly, severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchActivities();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Daily Aggregated Behavioral Activities</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full user-day event matrix across Logon, Removable Devices, Files, Web HTTP, and Email
          </p>
        </div>
        <button
          onClick={fetchActivities}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-400 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search user ID (e.g. AAE0190)..."
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </form>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={anomalyOnly}
              onChange={(e) => setAnomalyOnly(e.target.checked)}
              className="rounded border-slate-800 bg-slate-900 text-cyan-500 focus:ring-0"
            />
            <span>Anomalies Only</span>
          </label>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Date & User</th>
                  <th className="py-3 px-3">Logon / Auth</th>
                  <th className="py-3 px-3">Removable USB</th>
                  <th className="py-3 px-3">File Activity</th>
                  <th className="py-3 px-3">HTTP Web</th>
                  <th className="py-3 px-3">Email Sent</th>
                  <th className="py-3 px-3">Risk & Severity</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-850/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-cyan-400">{act.user_id}</div>
                      <div className="text-[11px] text-slate-400">{act.date}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{act.login_count} Logins</div>
                      {act.after_hours_logon > 0 && (
                        <div className="text-[10px] text-rose-400 font-semibold">
                          +{act.after_hours_logon} After-hours
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {act.device_connect_count > 0 ? (
                        <span className="text-rose-400 font-bold">
                          {act.device_connect_count} Connects
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{act.file_activity_count} Files</div>
                      {act.sensitive_file_activity > 0 && (
                        <div className="text-[10px] text-rose-400 font-bold">
                          {act.sensitive_file_activity} Sensitive
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{act.http_request_count} Requests</div>
                      {act.suspicious_domain_count > 0 && (
                        <div className="text-[10px] text-rose-400 font-bold">
                          {act.suspicious_domain_count} Suspicious Domains
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{act.email_count} Sent</div>
                      {act.attachment_count > 3 && (
                        <div className="text-[10px] text-amber-400 font-semibold">
                          {act.attachment_count} Attachments
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{act.risk_score}</span>
                        <SeverityBadge severity={act.severity} size="sm" />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/employees/${act.user_id}`)}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-slate-800 text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
