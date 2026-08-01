// Shared design tokens for the Aegis dashboard.
// Keeping these in one place makes it easy to re-theme the whole app later.
export const palette = {
  void: "#0A0D12",
  surface: "#12161D",
  raised: "#1A1F28",
  raised2: "#1F2530",
  line: "#232933",
  lineSoft: "#1B2029",
  textPrimary: "#E7EAEE",
  textMuted: "#8A93A3",
  textFaint: "#5C6472",
  accent: "#5B9DF9",
  critical: "#EF4444",
  criticalSoft: "rgba(239,68,68,0.12)",
  high: "#F59E0B",
  highSoft: "rgba(245,158,11,0.12)",
  medium: "#EAB308",
  mediumSoft: "rgba(234,179,8,0.12)",
  low: "#22C55E",
  lowSoft: "rgba(34,197,94,0.12)",
};

export const sevColor = (s) =>
  s === "Critical"
    ? palette.critical
    : s === "High"
    ? palette.high
    : s === "Medium"
    ? palette.medium
    : palette.low;

export const sevSoft = (s) =>
  s === "Critical"
    ? palette.criticalSoft
    : s === "High"
    ? palette.highSoft
    : s === "Medium"
    ? palette.mediumSoft
    : palette.lowSoft;

export const mono = "'IBM Plex Mono', monospace";
