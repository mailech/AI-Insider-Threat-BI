import React, { useState, useEffect } from 'react';
import {
  Settings, Server, Cpu, Zap, Shield, Play,
  RefreshCw, CheckCircle2, AlertTriangle, FileText, Database
} from 'lucide-react';
import { adminAPI, authAPI } from '../services/api';
import { StatsCard } from '../components/StatsCard';

export const SystemAdminPage = () => {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);
  const [simulationScenario, setSimulationScenario] = useState('data_exfiltration');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [usersRes, auditRes] = await Promise.all([
        authAPI.getUsers(),
        adminAPI.getAuditLogs(20)
      ]);
      setUsers(usersRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    try {
      const res = await adminAPI.retrainMl();
      setRetrainResult(res.data);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setRetraining(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await adminAPI.simulateAttack(simulationScenario);
      setSimResult(res.data);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>System Administration & Adversarial Simulator</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              ROOT CONSOLE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Platform telemetry, ML model lifecycle pipeline retraining, and live Red Team attack injections</p>
        </div>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active SOC Operators"
          value={users.length || 4}
          subtitle="4 RBAC Roles Configured"
          icon={Shield}
          color="cyan"
        />
        <StatsCard
          title="Database Status"
          value="Connected"
          subtitle="PostgreSQL / SQLite Storage Engine"
          icon={Database}
          color="green"
        />
        <StatsCard
          title="ML Engine Pipelines"
          value="5 Active"
          subtitle="IsoForest, SVM, AE, Graph, GNN"
          icon={Cpu}
          color="purple"
        />
        <StatsCard
          title="Audit Trail Logs"
          value={auditLogs.length || 0}
          subtitle="Full tamper-evident history"
          icon={FileText}
          color="amber"
        />
      </div>

      {/* Operational Controls: Retrain & Red Team Injection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Retraining Suite */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" /> ML Pipeline Retraining Engine
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Executes full multi-model retraining, graph embedding, and baseline recalibration</p>
            </div>
            <button
              onClick={handleRetrain}
              disabled={retraining}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-950/50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
              {retraining ? 'Training Models...' : 'Retrain All ML Models'}
            </button>
          </div>

          {retrainResult && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs space-y-2 text-emerald-200">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4" /> Pipeline Retrained Successfully!
              </div>
              <p className="font-mono text-[11px]">
                Processed {retrainResult.employees_processed} employees &bull; Generated {retrainResult.alerts_generated} alerts &bull; Models: {retrainResult.models_executed?.join(', ')}
              </p>
            </div>
          )}

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono space-y-1">
            <p className="text-slate-300 font-bold font-sans">Active Machine Learning Models In Ensemble:</p>
            <p>&bull; <strong>Isolation Forest:</strong> Contamination = 0.12, 100 binary partition trees</p>
            <p>&bull; <strong>One-Class SVM:</strong> RBF Kernel, nu = 0.12, non-linear boundary</p>
            <p>&bull; <strong>Neural Autoencoder:</strong> MLP (12-6-12), Adam optimizer, MSE loss</p>
            <p>&bull; <strong>PyTorch GNN:</strong> Graph Convolution Network node embeddings</p>
            <p>&bull; <strong>XAI Diagnostics:</strong> TreeSHAP & LIME local surrogates</p>
          </div>
        </div>

        {/* Live Attack Scenario Simulator */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" /> Interactive Red Team Attack Scenario Simulator
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Inject realistic adversarial insider attack behavior for live SOC evaluation & viva demo</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Select Attack Scenario</label>
              <select
                value={simulationScenario}
                onChange={(e) => setSimulationScenario(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-500"
              >
                <option value="data_exfiltration">1. Critical Data Exfiltration (Bulk Download + mega.nz Cloud Egress)</option>
                <option value="privilege_escalation">2. Privilege Abuse (Mimikatz execution + Domain Admin Escalation)</option>
                <option value="usb_theft">3. Removable Media Theft (Unapproved USB SanDisk + Source Code Copy)</option>
                <option value="after_hours_recon">4. After-Hours Reconnaissance (2:00 AM Login + Subnet Port Scan)</option>
              </select>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/50 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {simulating ? 'Injecting Adversary Telemetry...' : 'Inject Attack Scenario NOW'}
            </button>
          </div>

          {simResult && (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs space-y-1 text-red-200">
              <div className="flex items-center gap-2 font-bold text-red-300">
                <AlertTriangle className="w-4 h-4" /> Threat Injected & Alert Triggered!
              </div>
              <p className="font-mono text-[11px]">
                Target: {simResult.target_employee?.name} ({simResult.target_employee?.id}) &bull; New Risk Score: <strong className="text-white">{simResult.target_employee?.new_risk_score}</strong> ({simResult.target_employee?.new_risk_level})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Management & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Accounts */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-cyan-400" /> SOC RBAC Operator Roster
          </h3>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-100">{u.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-medium">
                    {u.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-cyan-400" /> SOC System Audit Trail
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-cyan-400 font-bold">{log.action}</span>
                  <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-[11px] text-slate-300">{log.details}</p>
                <p className="text-[10px] text-slate-500 font-mono">By: {log.user_email}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
