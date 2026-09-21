import React, { useState, useEffect } from 'react';
import { Cpu, Search, Filter, ShieldAlert, BarChart2, Eye, Info } from 'lucide-react';
import { anomalyAPI, employeeAPI } from '../services/api';
import { AnomalyExplainModal } from '../components/AnomalyExplainModal';
import { RiskBadge } from '../components/RiskBadge';

export const AnomaliesPage = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [selectedExplainEmp, setSelectedExplainEmp] = useState(null);
  const [explainData, setExplainData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    try {
      const res = await anomalyAPI.getAnomalies();
      setAnomalies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExplain = async (empId) => {
    setSelectedExplainEmp(empId);
    try {
      const res = await anomalyAPI.getExplanation(empId);
      setExplainData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" /> Multi-Model Anomaly Detection & Explainable AI (XAI)
          </h2>
          <p className="text-xs text-slate-400 mt-1">Cross-model comparative scoring: Isolation Forest, One-Class SVM, Neural Autoencoders, NetworkX Graph Analytics, and PyTorch GNN</p>
        </div>
      </div>

      {/* Model Technical Architecture Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-xs font-bold text-cyan-400">1. Isolation Forest</p>
          <p className="text-[11px] text-slate-400">Random feature partition tree depth. Short path length = anomaly.</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-xs font-bold text-purple-400">2. One-Class SVM</p>
          <p className="text-[11px] text-slate-400">RBF kernel non-linear support vector hyperplane boundary.</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-xs font-bold text-amber-400">3. Neural Autoencoder</p>
          <p className="text-[11px] text-slate-400">Bottleneck compression. High reconstruction MSE = anomaly.</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-xs font-bold text-emerald-400">4. Graph Centrality</p>
          <p className="text-[11px] text-slate-400">Degree & Betweenness centrality over bipartite user-file graph.</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-xs font-bold text-blue-400">5. PyTorch GNN</p>
          <p className="text-[11px] text-slate-400">Graph Convolutional Network autoencoder node embedding.</p>
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[10px] font-sans">
                <th className="py-3 px-4">Identity</th>
                <th className="py-3 px-4">Isolation Forest</th>
                <th className="py-3 px-4">One-Class SVM</th>
                <th className="py-3 px-4">Autoencoder MSE</th>
                <th className="py-3 px-4">Graph Centrality</th>
                <th className="py-3 px-4">PyTorch GNN</th>
                <th className="py-3 px-4">Composite Score</th>
                <th className="py-3 px-4 text-right font-sans">XAI Explainability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {anomalies.map((anom) => {
                const isHigh = anom.ensemble_score > 60;
                return (
                  <tr key={anom.id} className={`hover:bg-slate-900/60 ${isHigh ? 'bg-red-950/20' : ''}`}>
                    <td className="py-3 px-4 text-cyan-400 font-bold">{anom.employee_id}</td>
                    <td className="py-3 px-4 text-slate-300">{anom.isolation_forest}%</td>
                    <td className="py-3 px-4 text-slate-300">{anom.oneclass_svm}%</td>
                    <td className="py-3 px-4 text-slate-300">{anom.autoencoder}%</td>
                    <td className="py-3 px-4 text-slate-300">{anom.graph_analytics}%</td>
                    <td className="py-3 px-4 text-slate-300">{anom.gnn_score}%</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${isHigh ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-300'}`}>
                        {anom.ensemble_score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => handleOpenExplain(anom.employee_id)}
                        className="px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <BarChart2 className="w-3.5 h-3.5" /> SHAP / LIME
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explain Modal */}
      <AnomalyExplainModal
        isOpen={Boolean(selectedExplainEmp)}
        onClose={() => setSelectedExplainEmp(null)}
        explanationData={explainData}
      />
    </div>
  );
};
