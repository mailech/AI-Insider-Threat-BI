import { palette } from "../../styles/theme.js";

const statusStyles = {
  Open: { color: palette.textPrimary, bg: palette.raised2 },
  Investigating: { color: palette.accent, bg: "rgba(91,157,249,0.14)" },
  Resolved: { color: palette.low, bg: palette.lowSoft },
};

export default function StatusPill({ status }) {
  const s = statusStyles[status] ?? statusStyles.Open;
  return (
    <span style={{ color: s.color, background: s.bg }} className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
      {status}
    </span>
  );
}
