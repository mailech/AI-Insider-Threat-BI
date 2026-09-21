import React, { useState, useEffect } from 'react';
import {
  Activity, Search, Filter, ShieldAlert, Laptop,
  Mail, HardDrive, Globe, Terminal, KeyRound, CloudUpload, Lock
} from 'lucide-react';
import { activityAPI, employeeAPI } from '../services/api';
import { SeverityBadge } from '../components/RiskBadge';

export const ActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [anomalousOnly, setAnomalousOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [typeFilter, anomalousOnly, search]);

  const fetchActivities = async () => {
    try {
      const [actRes, statsRes] = await Promise.all([
        activityAPI.getActivities({
          activity_type: typeFilter || undefined,
          is_anomalous: anomalousOnly ? true : undefined,
          limit: 100
        }),
        activityAPI.getStats()
      ]);
      setActivities(actRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'login': return <Lock className="w-4 h-4 text-cyan-400" />;
      case 'file_access': return <Laptop className="w-4 h-4 text-blue-400" />;
      case 'email': return <Mail className="w-4 h-4 text-purple-400" />;
      case 'usb_usage': return <HardDrive className="w-4 h-4 text-amber-400" />;
      case 'network': return <Globe className="w-4 h-4 text-emerald-400" />;
      case 'application': return <Terminal className="w-4 h-4 text-rose-400" />;
      case 'remote_access': return <Globe className="w-4 h-4 text-indigo-400" />;
      case 'privilege_change': return <KeyRound className="w-4 h-4 text-red-400" />;
      case 'data_transfer': return <CloudUpload className="w-4 h-4 text-orange-400" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> Activity Monitoring & Multi-Source Telemetry Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">Continuous ingestion of Logins, Files, USBs, Emails, Network egress, Applications, Remote access, and Privilege events</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            Total: <strong className="text-white">{stats?.total_activities || 0}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800 text-xs font-mono text-red-400">
            Anomalous: <strong className="text-red-300">{stats?.anomalous_activities || 0} ({stats?.anomalous_percentage || 0}%)</strong>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All 9 Monitored Event Types</option>
          <option value="login">1. Login & Auth Events</option>
          <option value="file_access">2. File Access (Read/Download/Upload)</option>
          <option value="email">3. Email & NLP Keyword Tracking</option>
          <option value="usb_usage">4. USB Removable Storage Usage</option>
          <option value="network">5. Network Outbound Connections</option>
          <option value="application">6. Application & Process Usage</option>
          <option value="remote_access">7. Remote Access & VPN Sessions</option>
          <option value="privilege_change">8. Privilege Changes & Escalations</option>
          <option value="data_transfer">9. Large Volume Data Transfers</option>
        </select>

        <button
          onClick={() => setAnomalousOnly(!anomalousOnly)}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
            anomalousOnly
              ? 'bg-red-950 text-red-300 border-red-700 shadow-lg shadow-red-950/50'
              : 'bg-slate-900 text-slate-400 border-slate-750 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          {anomalousOnly ? 'Showing Anomalies Only' : 'Filter Anomalous Only'}
        </button>
      </div>

      {/* Activity Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Identity</th>
                <th className="py-3 px-4">Action Details</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Endpoint IP</th>
                <th className="py-3 px-4">Anomaly Flag</th>
                <th className="py-3 px-4 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {activities.map((act) => (
                <tr key={act.id} className={`hover:bg-slate-900/60 ${act.is_anomalous ? 'bg-red-950/20' : ''}`}>
                  <td className="py-3 px-4 font-sans">
                    <span className="flex items-center gap-2 text-slate-200 capitalize font-medium">
                      {getEventIcon(act.activity_type)}
                      {act.activity_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{new Date(act.timestamp).toLocaleTimeString()}</td>
                  <td className="py-3 px-4 text-cyan-400 font-bold">{act.employee_id}</td>
                  <td className="py-3 px-4 font-sans text-slate-200 font-medium">{act.action}</td>
                  <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{act.resource || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-500">{act.ip_address}</td>
                  <td className="py-3 px-4 font-sans">
                    {act.is_anomalous ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        {act.anomaly_reason || 'Outlier Activity'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Normal Baseline</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <SeverityBadge severity={act.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
