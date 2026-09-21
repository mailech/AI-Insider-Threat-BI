import React, { useState, useEffect } from 'react';
import {
  Activity, Cpu, Network, Radio, Clock, ShieldAlert,
  Layers, HardDrive, RefreshCw, AlertCircle
} from 'lucide-react';
import { dashboardAPI, anomalyAPI } from '../services/api';
import { StatsCard } from '../components/StatsCard';
import { EntityGraph } from '../components/EntityGraph';
import { SeverityBadge } from '../components/RiskBadge';

export const SocDashboard = () => {
  const [data, setData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSocData();
  }, []);

  const fetchSocData = async () => {
    try {
      const [socRes, graphRes] = await Promise.all([
        dashboardAPI.getSocDashboard(),
        anomalyAPI.getGraphNetwork()
      ]);
      setData(socRes.data);
      setGraphData(graphRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSocData();
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading SOC Engineering Telemetry...</div>;
  }

  const { telemetry_metrics, ml_engine_health, live_activity_stream } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>SOC Engineering & Telemetry Operations</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
              SIEM / UEBA STREAM
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Multi-sensor log ingestion, PyTorch GNN embeddings, and entity relationship topologies</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Telemetry
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Events Ingested"
          value={telemetry_metrics?.total_events_ingested || 0}
          subtitle="All 9 monitored categories"
          icon={Activity}
          color="purple"
        />
        <StatsCard
          title="Behavioral Anomalies"
          value={telemetry_metrics?.anomaly_events || 0}
          subtitle="Flagged out-of-baseline events"
          icon={AlertCircle}
          color="red"
        />
        <StatsCard
          title="Mean Time To Detect (MTTD)"
          value={telemetry_metrics?.mean_time_to_detect_mttd || "4.2 mins"}
          subtitle="AI anomaly latency"
          icon={Clock}
          color="cyan"
        />
        <StatsCard
          title="Mean Time To Investigate"
          value={telemetry_metrics?.mean_time_to_investigate_mtti || "18.5 mins"}
          subtitle="Automated correlation"
          icon={ShieldAlert}
          color="green"
        />
      </div>

      {/* ML Engine Status Cards */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-cyan-400" /> Real-time ML Anomaly Engines State
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Isolation Forest Contamination</p>
            <p className="text-lg font-bold font-mono text-cyan-400 mt-1">12% Contamination</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Scikit-learn Ensemble Trees</p>
          </div>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">One-Class SVM Kernel</p>
            <p className="text-lg font-bold font-mono text-purple-400 mt-1">RBF Gamma Scale</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Support Vector Hyperplane</p>
          </div>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Neural Autoencoder</p>
            <p className="text-lg font-bold font-mono text-amber-400 mt-1">MLP (12-6-12)</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Reconstruction MSE Error</p>
          </div>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">PyTorch Graph Neural Net</p>
            <p className="text-lg font-bold font-mono text-emerald-400 mt-1">GCN Autoencoder</p>
            <p className="text-[10px] text-slate-500 mt-0.5">NetworkX Centrality + GNN</p>
          </div>
        </div>
      </div>

      {/* Interactive Entity Topology Graph */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" /> Bipartite Entity Relationship & At-Risk Graph Topology
            </h3>
            <p className="text-xs text-slate-500">Live network linking Employees, Accessed Confidential Files, and Connected USB Devices</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Interactive physics enabled</span>
        </div>
        <EntityGraph graphData={graphData} height="480px" />
      </div>

      {/* Live Telemetry Stream */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-cyan-400" /> Ingested Event Feed (Last 15 Events)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Activity Type</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource / Target</th>
                <th className="py-2.5 px-3">Anomaly Tag</th>
                <th className="py-2.5 px-3 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {live_activity_stream && live_activity_stream.map((evt) => (
                <tr key={evt.id} className={`hover:bg-slate-900/60 ${evt.is_anomalous ? 'bg-red-950/20' : ''}`}>
                  <td className="py-2.5 px-3 text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">{evt.employee_id}</td>
                  <td className="py-2.5 px-3 font-sans capitalize text-slate-300">{evt.activity_type.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-200">{evt.action}</td>
                  <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">{evt.resource || 'N/A'}</td>
                  <td className="py-2.5 px-3 font-sans">
                    {evt.is_anomalous ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        {evt.anomaly_reason || 'Anomalous'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Normal</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <SeverityBadge severity={evt.severity} />
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
