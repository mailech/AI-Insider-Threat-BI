import { useState, useEffect, useMemo } from "react";
import { Download, RefreshCw, ShieldAlert, AlertTriangle } from "lucide-react";
import { palette } from "../styles/theme.js";
import { alerts as mockAlerts } from "../data/mockAlerts.js";
import { api } from "../services/api.js";
import KpiCard from "../components/dashboard/KpiCard.jsx";
import AlertTable from "../components/dashboard/AlertTable.jsx";
import InvestigationPanel from "../components/dashboard/InvestigationPanel.jsx";

export default function SecurityAnalystDashboard({ query = "", onOpenReport }) {
  const [severityFilter, setSeverityFilter] = useState("All");
  const [alertsList, setAlertsList] = useState(mockAlerts);
  const [selected, setSelected] = useState(mockAlerts[0]);
  const [metrics, setMetrics] = useState(null);

  const loadData = () => {
    api.getAlerts().then(data => {
      if (data && data.length > 0) {
        setAlertsList(data);
        if (!selected) setSelected(data[0]);
      }
    });
    api.getAnalystMetrics().then(m => {
      if (m) setMetrics(m);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return alertsList.filter((a) => {
      const matchesSev = severityFilter === "All" || a.severity === severityFilter;
      const matchesQuery =
        !query || query.trim() === "" ||
        a.user.toLowerCase().includes(query.toLowerCase()) ||
        a.id.toLowerCase().includes(query.toLowerCase()) ||
        a.anomaly.toLowerCase().includes(query.toLowerCase()) ||
        a.dept.toLowerCase().includes(query.toLowerCase());
      return matchesSev && matchesQuery;
    });
  }, [severityFilter, query, alertsList]);

  const openCount = metrics?.open_alerts ?? alertsList.filter((a) => a.status === "Open").length;
  const criticalCount = metrics?.critical_risk_users ?? alertsList.filter((a) => a.severity === "Critical").length;

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Insider Threat Queue</h1>
          <p style={{ color: palette.textMuted }} className="text-sm mt-1">
            Behavioral anomalies and risk-scored alerts across enterprise identities
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            style={{ background: palette.raised, border: `1px solid ${palette.line}`, color: palette.textPrimary }}
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} className="text-cyan-400" />
            Refresh Queue
          </button>
          
          <button
            onClick={onOpenReport}
            style={{ background: palette.accent, color: palette.void }}
            className="flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-lg hover:brightness-110 shadow-lg shadow-cyan-500/20"
          >
            <Download size={15} />
            Export report
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <KpiCard label="Open Alerts" value={openCount} sub="+3 since yesterday" tone={palette.high} />
        <KpiCard label="Critical Risk Users" value={criticalCount} sub="requires immediate review" tone={palette.critical} />
        <KpiCard label="Mean Time to Detect" value={metrics?.mean_time_to_detect || "4.2m"} sub="↓ 18% this week" tone={palette.low} />
        <KpiCard label="Investigations Active" value={metrics?.active_investigations || "2"} sub="1 escalated to legal" tone={palette.accent} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <AlertTable
          alerts={filtered}
          severityFilter={severityFilter}
          onSeverityFilterChange={setSeverityFilter}
          selectedId={selected?.id}
          onSelectAlert={setSelected}
        />
        <InvestigationPanel alert={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
