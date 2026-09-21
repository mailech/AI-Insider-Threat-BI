import React from 'react';
import { X, ShieldAlert, Cpu, BarChart2, Info } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

export const AnomalyExplainModal = ({ isOpen, onClose, explanationData }) => {
  if (!isOpen || !explanationData) return null;

  const { employee_id, name, department, risk_score, risk_level, models, shap_feature_importance, lime_weights, behavioral_features } = explanationData;

  const shapEntries = Object.entries(shap_feature_importance || {}).sort((a, b) => Math.abs(b[1].shap_value) - Math.abs(a[1].shap_value));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-[#111827] z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-100">{name}</h3>
                <span className="font-mono text-sm text-cyan-400">({employee_id})</span>
                <RiskBadge level={risk_level} score={risk_score} />
              </div>
              <p className="text-xs text-slate-400">{department} &bull; AI Behavioral Anomaly & Explainability Diagnosis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Multi-Model Anomaly Radar / Score Grid */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Multi-Model Anomaly Detection Engine Results
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-[#182234] p-3 rounded-lg border border-slate-800 text-center">
                <p className="text-xs text-slate-400">Isolation Forest</p>
                <p className="text-xl font-bold font-mono text-cyan-400 mt-1">{models?.isolation_forest || 0}%</p>
              </div>
              <div className="bg-[#182234] p-3 rounded-lg border border-slate-800 text-center">
                <p className="text-xs text-slate-400">One-Class SVM</p>
                <p className="text-xl font-bold font-mono text-purple-400 mt-1">{models?.oneclass_svm || 0}%</p>
              </div>
              <div className="bg-[#182234] p-3 rounded-lg border border-slate-800 text-center">
                <p className="text-xs text-slate-400">Autoencoder Loss</p>
                <p className="text-xl font-bold font-mono text-amber-400 mt-1">{models?.neural_autoencoder || 0}%</p>
              </div>
              <div className="bg-[#182234] p-3 rounded-lg border border-slate-800 text-center">
                <p className="text-xs text-slate-400">Graph Centrality</p>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{models?.graph_centrality || 0}%</p>
              </div>
              <div className="bg-[#182234] p-3 rounded-lg border border-slate-800 text-center">
                <p className="text-xs text-slate-400">PyTorch GNN</p>
                <p className="text-xl font-bold font-mono text-blue-400 mt-1">{models?.pytorch_gnn || 0}%</p>
              </div>
              <div className="bg-red-950/40 p-3 rounded-lg border border-red-800/60 text-center">
                <p className="text-xs text-red-300 font-semibold">Ensemble Score</p>
                <p className="text-xl font-bold font-mono text-red-400 mt-1">{models?.ensemble_composite || 0}%</p>
              </div>
            </div>
          </div>

          {/* SHAP Feature Contribution */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" /> SHAP Feature Attribution (Shapley Values)
            </h4>
            <div className="bg-[#182234] border border-slate-800 rounded-xl p-4 space-y-3">
              {shapEntries.slice(0, 6).map(([feat, data]) => {
                const isRisk = data.shap_value > 0;
                return (
                  <div key={feat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-slate-300">{feat.replace(/_/g, ' ')}</span>
                      <span className="text-slate-400">
                        Observed: <strong className="text-white font-mono">{data.value}</strong> (Baseline: {data.baseline}) &bull; SHAP: <span className={isRisk ? 'text-red-400 font-bold' : 'text-emerald-400'}>{data.shap_value > 0 ? `+${data.shap_value}` : data.shap_value}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${isRisk ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, Math.abs(data.shap_value) * 150)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LIME Local Surrogate Weights */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" /> LIME Local Interpretable Surrogate Model
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(lime_weights || {}).slice(0, 6).map(([rule, weight]) => (
                <div key={rule} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-300">{rule}</span>
                  <span className={`font-mono font-bold ${weight > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {weight > 0 ? `+${weight}` : weight}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
