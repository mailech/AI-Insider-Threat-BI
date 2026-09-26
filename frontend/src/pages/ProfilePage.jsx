import React from 'react';
import { UserCheck, Shield, Key, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage = () => {
  const { user } = useAuth();

  const permissionsByRole = {
    'Administrator': [
      'Full SOC System Administration',
      'Manage Analyst Accounts & RBAC Roles',
      'Trigger End-to-End ML Pipeline Retraining',
      'Create & Assign Forensic Incident Cases',
      'Export Certified Audit & Compliance Logs',
      'Inspect Raw CERT Dataset Aggregations',
      'Adjust 5-Factor Risk Engine Weights'
    ],
    'Security Manager': [
      'Supervise Active Incident Cases & Assign Analysts',
      'Review & Close Forensic Triage Alerts',
      'Trigger Model Retraining & Performance Audits',
      'Export Case Summaries and Threat Reports',
      'Inspect Employee Baseline Deviations'
    ],
    'SOC Engineer': [
      'Trigger End-to-End ML Pipeline Retraining',
      'Inspect Feature Engineering & Parquet Datasets',
      'Monitor Model PR-AUC, ROC-AUC, & Confusion Matrix',
      'Investigate Daily Behavioral Deviations',
      'Manage Triage Alerts & Create Cases'
    ],
    'Security Analyst': [
      'Triage Live Security Alerts (Investigating / Resolved)',
      'Inspect Employee Behavioral Profiles & Baselines',
      'Investigate Correlated Activity Timelines',
      'Post Commentary to Open Forensic Cases',
      'Filter Daily Logon, USB, File, Web, & Email Logs'
    ]
  };

  const currentPermissions = permissionsByRole[user?.role] || permissionsByRole['Security Analyst'];

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div>
        <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
          <UserCheck className="w-5 h-5 text-cyan-400" />
          <span>SOC Analyst Profile & Credentials</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Active session identity, security credentials, and Role-Based Access Control (RBAC) permissions
        </p>
      </div>

      {/* User Info Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center font-mono text-xl font-bold text-cyan-400 shadow-cyber-cyan">
            {user?.username?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-100 font-mono">{user?.full_name || user?.username}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300 font-semibold">
                {user?.role}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">Username: @{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold font-mono text-slate-200 mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-cyan-400" />
          <span>Active Role Privileges & Capabilities</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentPermissions.map((perm, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-200 font-mono">{perm}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
