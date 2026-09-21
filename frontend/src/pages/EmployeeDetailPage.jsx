import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, Shield, Laptop, HardDrive, Key, ArrowLeft,
  Activity, Cpu, Radio, AlertTriangle, Clock, BarChart2
} from 'lucide-react';
import { employeeAPI, activityAPI, uebaAPI, anomalyAPI } from '../services/api';
import { RiskBadge, SeverityBadge } from '../components/RiskBadge';
import { AnomalyExplainModal } from '../components/AnomalyExplainModal';

export const EmployeeDetailPage = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [activities, setActivities] = useState([]);
  const [peerComp, setPeerComp] = useState(null);
  const [explainData, setExplainData] = useState(null);
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeFullDetails();
  }, [id]);

  const fetchEmployeeFullDetails = async () => {
    try {
      const [empRes, actRes, uebaRes, expRes] = await Promise.all([
        employeeAPI.getEmployee(id),
        activityAPI.getActivities({ employee_id: id, limit: 15 }),
        uebaAPI.getPeerComparison(id),
        anomalyAPI.getExplanation(id)
      ]);
      setEmployee(empRes.data);
      setActivities(actRes.data);
      setPeerComp(uebaRes.data);
      setExplainData(expRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Identity Dossier for {id}...</div>;
  }

  if (!employee) {
    return <div className="p-8 text-center text-red-400">Identity not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Top Banner */}
      <div className="flex items-center justify-between">
        <Link to="/employees" className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Identity Roster
        </Link>
        <button
          onClick={() => setIsExplainOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/50"
        >
          <Cpu className="w-4 h-4" /> Open XAI Diagnosis (SHAP & LIME)
        </button>
      </div>

      {/* Identity Summary Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-mono text-xl font-bold">
              {employee.employee_id}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{employee.name}</h2>
                <RiskBadge level={employee.risk_level} score={employee.risk_score} />
                {employee.is_red_team && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold font-mono">
                    RED TEAM ADVERSARY
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{employee.designation} &bull; <strong className="text-slate-300">{employee.department}</strong></p>
              <p className="text-xs font-mono text-cyan-400">{employee.email} &bull; Reports to: {employee.manager || 'Executive Lead'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/90 p-4 rounded-xl border border-slate-800 font-mono">
            <div>
              <p className="text-slate-500 text-[10px]">CURRENT STATUS</p>
              <p className="text-slate-200 font-bold">{employee.status}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px]">ASSIGNED LAPTOP</p>
              <p className="text-slate-200 truncate">{employee.device_info?.laptop || 'CORP-NB'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px]">PRIMARY IP</p>
              <p className="text-cyan-400">{employee.device_info?.ip_address || '10.0.4.x'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px]">APPROVED USB</p>
              <p className="text-slate-300">{employee.device_info?.approved_usb?.join(', ') || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Privileges List */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-cyan-400" /> Authorized Access Privileges & System Entitlements
          </p>
          <div className="flex flex-wrap gap-2">
            {employee.access_privileges?.map((priv) => (
              <span key={priv} className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium">
                {priv}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* UEBA Peer Comparison Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-cyan-400" /> Behavioral Baselines & Departmental Peer Group Comparison ({employee.department})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Behavioral Metric</th>
                <th className="py-2.5 px-3">Employee Observed</th>
                <th className="py-2.5 px-3">Department Peer Median</th>
                <th className="py-2.5 px-3">Baseline Deviation</th>
                <th className="py-2.5 px-3 text-right">Anomalous Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {peerComp?.comparisons?.map((c) => {
                const isHighDev = Math.abs(c.deviation_pct) > 100;
                return (
                  <tr key={c.metric} className="hover:bg-slate-900/60">
                    <td className="py-3 px-3 text-slate-200 font-sans font-medium">{c.metric}</td>
                    <td className="py-3 px-3 font-bold text-cyan-400">{c.employee_val} <span className="text-[10px] text-slate-500 font-sans">{c.unit}</span></td>
                    <td className="py-3 px-3 text-slate-400">{c.peer_median} <span className="text-[10px] text-slate-500 font-sans">{c.unit}</span></td>
                    <td className={`py-3 px-3 font-bold ${isHighDev ? 'text-red-400' : 'text-slate-300'}`}>
                      {c.deviation_pct > 0 ? `+${c.deviation_pct}%` : `${c.deviation_pct}%`}
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      {isHighDev ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                          OUTLIER DEVIATION
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[11px]">Normal Peer Alignment</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-cyan-400" /> Recent Security & Telemetry Events
        </h3>
        <div className="space-y-2">
          {activities.map((act) => (
            <div
              key={act.id}
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                act.is_anomalous ? 'bg-red-950/20 border-red-800/60' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <SeverityBadge severity={act.severity} />
                <div>
                  <p className="font-semibold text-slate-200">{act.action} &bull; <span className="font-mono text-cyan-400">{act.resource || 'N/A'}</span></p>
                  {act.anomaly_reason && (
                    <p className="text-[11px] text-red-400 mt-0.5">{act.anomaly_reason}</p>
                  )}
                </div>
              </div>
              <div className="text-right text-slate-400 font-mono text-[11px]">
                {new Date(act.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnosis Modal */}
      <AnomalyExplainModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        explanationData={explainData}
      />
    </div>
  );
};
