import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Database,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

export const AdminPage = () => {
  const [training, setTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState(null);

  const handleTriggerTrain = async (modelType) => {
    try {
      setTraining(true);
      setTrainStatus(null);
      const res = await api.triggerMLTrain({ model_type: modelType });
      setTrainStatus({ success: true, message: res.data.message });
    } catch (err) {
      setTrainStatus({ success: false, message: err.response?.data?.detail || 'Training failed to initiate.' });
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <div>
        <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-cyan-400" />
          <span>System Administration & MLOps Control</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure CERT dataset ingestion, trigger model retraining, and adjust risk weights
        </p>
      </div>

      {trainStatus && (
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-3 ${
          trainStatus.success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {trainStatus.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
          <span>{trainStatus.message}</span>
        </div>
      )}

      {/* Model Training Controls */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold font-mono text-slate-200 mb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Dual-Engine Model Retraining Pipeline</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6 font-sans">
          Trigger end-to-end retraining of Isolation Forest (unsupervised) and XGBoost (supervised) over latest Parquet behavioral feature cache.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-cyan-400">1. Isolation Forest Retrain</div>
              <div className="text-xs text-slate-400 mt-1">Unsupervised anomaly detection with 5% contamination factor.</div>
            </div>
            <button
              onClick={() => handleTriggerTrain('isolation_forest')}
              disabled={training}
              className="mt-4 w-full py-2 rounded-lg bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-slate-800 text-xs font-mono font-semibold flex items-center justify-center gap-2 transition"
            >
              {training ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Train Isolation Forest</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-purple-400">2. XGBoost Classifier Retrain</div>
              <div className="text-xs text-slate-400 mt-1">Supervised ground-truth model with time-aware train/test split.</div>
            </div>
            <button
              onClick={() => handleTriggerTrain('xgboost')}
              disabled={training}
              className="mt-4 w-full py-2 rounded-lg bg-slate-900 hover:bg-purple-500/20 text-purple-400 border border-slate-800 text-xs font-mono font-semibold flex items-center justify-center gap-2 transition"
            >
              {training ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Train XGBoost Ground-Truth</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Factor Risk Engine Weights Configuration */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold font-mono text-slate-200 mb-2 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Configurable 5-Factor Risk Formula Weights</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4 font-sans">
          Configured in environment variables as specified in the project architecture.
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-200">Behavioral Anomalies (Isolation Forest + Z-Scores)</span>
            <span className="text-cyan-400 font-bold">35% (0.35)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-200">Privilege Misuse Indicators (Multiple PCs, Root DB access)</span>
            <span className="text-cyan-400 font-bold">25% (0.25)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-200">Data Access Violations (Sensitive/Confidential Files)</span>
            <span className="text-cyan-400 font-bold">20% (0.20)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-200">Access Pattern Deviations (After-hours & Weekend)</span>
            <span className="text-cyan-400 font-bold">10% (0.10)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-200">Historical Security Events (Past Alerts & Violations)</span>
            <span className="text-cyan-400 font-bold">10% (0.10)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
