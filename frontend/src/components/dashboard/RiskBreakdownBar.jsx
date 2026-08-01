import { palette } from "../../styles/theme.js";

// Segments mirror the weighted scoring model from the product spec:
// Behavioral Anomalies 35% / Privilege Misuse 25% / Data Access Violations 20%
// / Access Pattern Deviations 10% / Historical Security Events 10%
const segments = [
  { key: "behavioral", label: "Behavioral Anomalies", weight: "35%", color: palette.critical },
  { key: "privilege", label: "Privilege Misuse", weight: "25%", color: palette.high },
  { key: "data", label: "Data Access Violations", weight: "20%", color: palette.accent },
  { key: "access", label: "Access Pattern Deviations", weight: "10%", color: palette.medium },
  { key: "historical", label: "Historical Security Events", weight: "10%", color: palette.textFaint },
];

export default function RiskBreakdownBar({ breakdown }) {
  const total = segments.reduce((sum, s) => sum + breakdown[s.key], 0);

  return (
    <div>
      <div style={{ background: palette.raised, borderRadius: 6, overflow: "hidden" }} className="flex h-3 w-full mb-3">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${(breakdown[s.key] / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${breakdown[s.key]}`}
          />
        ))}
      </div>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }} />
              <span style={{ color: palette.textMuted }}>{s.label}</span>
              <span style={{ color: palette.textFaint }}>({s.weight} weight)</span>
            </div>
            <span style={{ color: palette.textPrimary, fontFamily: "'IBM Plex Mono', monospace" }}>
              {breakdown[s.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
