import { X, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { palette, sevColor, sevSoft } from "../../styles/theme.js";
import RiskBreakdownBar from "./RiskBreakdownBar.jsx";

export default function InvestigationPanel({ alert, onClose }) {
  if (!alert) {
    return (
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 12 }} className="p-5 h-fit sticky top-20">
        <div style={{ color: palette.textFaint }} className="text-sm text-center py-10">
          Select an alert to investigate
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 12 }} className="p-5 h-fit sticky top-20">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div style={{ color: palette.textFaint, fontFamily: "'IBM Plex Mono', monospace" }} className="text-xs mb-1">
            {alert.id}
          </div>
          <h2 style={{ color: palette.textPrimary }} className="text-base font-semibold">{alert.user}</h2>
          <p style={{ color: palette.textMuted }} className="text-xs mt-0.5">{alert.role} · {alert.dept}</p>
        </div>
        <button onClick={onClose} style={{ color: palette.textFaint }} className="p-1 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div style={{ borderTop: `1px solid ${palette.line}`, borderBottom: `1px solid ${palette.line}` }} className="flex items-center justify-between py-3 my-4">
        <div>
          <div style={{ color: palette.textFaint }} className="text-xs mb-1">Insider Risk Score</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: sevColor(alert.severity) }} className="text-3xl font-bold">
            {alert.score}
          </div>
        </div>
        <span style={{ color: sevColor(alert.severity), background: sevSoft(alert.severity) }} className="text-xs font-semibold px-2.5 py-1.5 rounded-md">
          {alert.severity} Risk
        </span>
      </div>

      <div className="mb-5">
        <div style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wide mb-3">
          Score breakdown
        </div>
        <RiskBreakdownBar breakdown={alert.breakdown} />
      </div>

      <div className="mb-5">
        <div style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wide mb-3">
          Activity timeline
        </div>
        <div className="space-y-3">
          {alert.timeline.map((ev, i) => (
            <div key={i} className="flex gap-3">
              <span style={{ color: palette.textFaint, fontFamily: "'IBM Plex Mono', monospace" }} className="text-xs shrink-0 pt-0.5">
                {ev.t}
              </span>
              <span style={{ color: palette.textPrimary }} className="text-xs leading-relaxed">{ev.e}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button style={{ background: palette.accent, color: palette.void }} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg hover:brightness-110">
          <ArrowUpRight size={14} /> Escalate
        </button>
        <button style={{ background: palette.raised2, color: palette.textPrimary }} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg hover:brightness-125">
          <CheckCircle2 size={14} /> Resolve
        </button>
        <button style={{ background: "transparent", color: palette.textFaint, border: `1px solid ${palette.line}` }} className="px-3 rounded-lg hover:brightness-125">
          <XCircle size={14} />
        </button>
      </div>
    </div>
  );
}
