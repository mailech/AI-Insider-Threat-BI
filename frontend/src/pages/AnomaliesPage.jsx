import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export const AnomaliesPage = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const res = await api.getAnomalies({
        user_id: userIdFilter || undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      });
      setAnomalies(res.data);
    } catch (err) {
      console.error('Failed to load anomalies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAnomalies();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
            <span>Isolation Forest & Baseline Anomalies</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical z-score outlier deviations and machine-learning flagged anomalous vectors
          </p>
        </div>
        <button
          onClick={fetchAnomalies}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-400 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by user ID (AAE0190)..."
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </form>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Threat Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
        </select>
      </div>

      {/* Anomalies List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : anomalies.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center text-slate-400 font-mono text-xs border border-slate-800">
          No anomalous behavioral vectors found.
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              className="glass-panel rounded-xl p-5 border border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 font-mono font-bold text-xs">
                    {anom.user_id.substring(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-100">{anom.user_id}</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-xs text-slate-400">Date: {anom.date}</span>
                    </div>
                    <div className="text-xs font-mono text-rose-400">
                      ML Anomaly Score: {anom.anomaly_score} | Threat Risk: {anom.risk_score}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <SeverityBadge severity={anom.severity} />
                  <button
                    onClick={() => navigate(`/employees/${anom.user_id}`)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-slate-800 text-xs font-mono font-semibold flex items-center gap-1 transition"
                  >
                    <span>Investigate User</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Explanatory Indicators */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono text-xs">
                <div className="text-slate-400 font-medium mb-1.5 text-[11px] uppercase tracking-wider">
                  Baseline Deviation Explanation:
                </div>
                <div className="space-y-1">
                  {anom.contributing_factors && anom.contributing_factors.length > 0 ? (
                    anom.contributing_factors.map((factor, idx) => (
                      <div key={idx} className="text-rose-300 flex items-start gap-2">
                        <span className="text-rose-400">•</span>
                        <span>{factor}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500">Multivariate statistical outlier across access frequency and duration.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnomaliesPage;
