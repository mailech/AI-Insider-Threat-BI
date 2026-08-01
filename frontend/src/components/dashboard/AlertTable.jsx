import { Clock, ChevronRight } from "lucide-react";
import { palette, sevColor, sevSoft } from "../../styles/theme.js";
import { severities } from "../../data/mockAlerts.js";
import StatusPill from "./StatusPill.jsx";

export default function AlertTable({
  alerts,
  severityFilter,
  onSeverityFilterChange,
  selectedId,
  onSelectAlert,
}) {
  return (
    <div style={{ background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 12 }} className="overflow-hidden">
      <div style={{ borderBottom: `1px solid ${palette.line}` }} className="flex items-center gap-1 px-4 py-3 overflow-x-auto">
        {severities.map((s) => (
          <button
            key={s}
            onClick={() => onSeverityFilterChange(s)}
            style={{
              background: severityFilter === s ? palette.raised2 : "transparent",
              color: severityFilter === s ? palette.textPrimary : palette.textMuted,
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap hover:brightness-125"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: palette.textFaint, borderBottom: `1px solid ${palette.line}` }} className="text-xs uppercase tracking-wide">
              <th className="text-left font-medium px-4 py-2.5">Severity</th>
              <th className="text-left font-medium px-4 py-2.5">User</th>
              <th className="text-left font-medium px-4 py-2.5">Risk Score</th>
              <th className="text-left font-medium px-4 py-2.5">Anomaly</th>
              <th className="text-left font-medium px-4 py-2.5">Detected</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr
                key={a.id}
                onClick={() => onSelectAlert(a)}
                style={{
                  borderBottom: `1px solid ${palette.lineSoft}`,
                  background: selectedId === a.id ? palette.raised : "transparent",
                  cursor: "pointer",
                }}
                className="hover:brightness-110 transition-colors"
              >
                <td className="px-4 py-3">
                  <span style={{ color: sevColor(a.severity), background: sevSoft(a.severity) }} className="text-xs font-semibold px-2 py-1 rounded-md">
                    {a.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div style={{ color: palette.textPrimary }} className="font-medium">{a.user}</div>
                  <div style={{ color: palette.textFaint }} className="text-xs">{a.dept} · {a.role}</div>
                </td>
                <td className="px-4 py-3">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: sevColor(a.severity) }} className="font-semibold">
                    {a.score}
                  </span>
                </td>
                <td style={{ color: palette.textMuted }} className="px-4 py-3">{a.anomaly}</td>
                <td style={{ color: palette.textFaint }} className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1"><Clock size={12} />{a.time}</span>
                </td>
                <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                <td className="px-4 py-3 text-right"><ChevronRight size={15} color={palette.textFaint} /></td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: palette.textFaint }} className="text-center py-10 text-sm">
                  No alerts match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
