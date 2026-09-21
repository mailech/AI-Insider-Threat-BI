import React, { useState, useEffect } from 'react';
import { Radio, Users, Activity, BarChart2, ShieldAlert, Cpu } from 'lucide-react';
import { uebaAPI } from '../services/api';

export const UebaPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [peerBaselines, setPeerBaselines] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUebaData();
  }, []);

  const fetchUebaData = async () => {
    try {
      const [profRes, baseRes] = await Promise.all([
        uebaAPI.getProfiles({ limit: 50 }),
        uebaAPI.getPeerBaselines()
      ]);
      setProfiles(profRes.data);
      setPeerBaselines(baseRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" /> User & Entity Behavior Analytics (UEBA)
          </h2>
          <p className="text-xs text-slate-400 mt-1">Algorithmic baseline profiling, departmental peer group normal distribution modeling, and Z-score deviation ranking</p>
        </div>
      </div>

      {/* Departmental Peer Baselines Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-cyan-400" /> Department Peer Group Learned Baselines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(peerBaselines).map(([dept, base]) => (
            <div key={dept} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs">{dept}</span>
                <span className="text-[10px] text-slate-500 font-mono">{base.employee_count} identities</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                <div>
                  <span className="text-slate-500">Avg Files/Day:</span> <span className="text-cyan-400 font-bold">{base.avg_files_per_day}</span>
                </div>
                <div>
                  <span className="text-slate-500">Avg USB/Day:</span> <span className="text-purple-400 font-bold">{base.avg_usb_per_day}</span>
                </div>
                <div>
                  <span className="text-slate-500">Avg Network:</span> <span className="text-amber-400 font-bold">{base.avg_network_mb_per_day} MB</span>
                </div>
                <div>
                  <span className="text-slate-500">Login Hour:</span> <span className="text-emerald-400 font-bold">{base.avg_login_hour}:00</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral Profiles Roster */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-100">Behavioral Profiles & Statistical Z-Score Outlier Ranks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[10px] font-sans">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Mean Login / Logout</th>
                <th className="py-3 px-4">Files / Day</th>
                <th className="py-3 px-4">USB Frequency</th>
                <th className="py-3 px-4">Network Egress (MB/d)</th>
                <th className="py-3 px-4">Out-of-Session Ops</th>
                <th className="py-3 px-4">Graph Centrality</th>
                <th className="py-3 px-4 text-right font-sans">Peer Deviation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {profiles.map((p) => {
                const isOutlier = p.peer_group_deviation > 5.0 || p.out_of_session_access > 3;
                return (
                  <tr key={p.id} className={`hover:bg-slate-900/60 ${isOutlier ? 'bg-red-950/20' : ''}`}>
                    <td className="py-3 px-4 text-cyan-400 font-bold">{p.employee_id}</td>
                    <td className="py-3 px-4 text-slate-300">{p.mean_login_hour}:00 - {p.mean_logout_hour}:00</td>
                    <td className="py-3 px-4 text-slate-300">{p.files_per_day}</td>
                    <td className="py-3 px-4 text-slate-300">{p.usb_per_day}</td>
                    <td className="py-3 px-4 text-slate-300">{p.network_mb_per_day} MB</td>
                    <td className="py-3 px-4">
                      {p.out_of_session_access > 0 ? (
                        <span className="text-red-400 font-bold">+{p.out_of_session_access} events</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{p.degree_centrality}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      {isOutlier ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                          +{p.peer_group_deviation} &sigma; DEV
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-xs">Aligned ({p.peer_group_deviation})</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
