import { palette } from "../../styles/theme.js";

export default function KpiCard({ label, value, sub, tone }) {
  return (
    <div
      style={{ background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 10 }}
      className="p-4 flex-1 min-w-[180px]"
    >
      <div style={{ color: palette.textMuted }} className="text-xs font-medium tracking-wide uppercase mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span style={{ color: palette.textPrimary, fontFamily: "'IBM Plex Mono', monospace" }} className="text-2xl font-semibold">
          {value}
        </span>
        {sub && (
          <span style={{ color: tone || palette.textFaint }} className="text-xs font-medium">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
