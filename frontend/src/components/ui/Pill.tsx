import React from "react";
import { Check } from "lucide-react";

export type PillVariant = "active" | "inactive" | "neutral" | "warning";

interface PillProps {
  variant?: PillVariant;
  children: React.ReactNode;
  icon?: "dot" | "check" | "none";
  className?: string;
}

export function Pill({ variant = "neutral", children, icon = "none", className = "" }: PillProps) {
  let variantStyles = "";
  let iconElement = null;

  switch (variant) {
    case "active":
      // 1px #c5ff4a border
      variantStyles = "border border-signal-lime text-signal-lime";
      break;
    case "inactive":
    case "neutral":
      // muted #525252 border
      variantStyles = "border border-fog text-ash";
      break;
    case "warning":
      variantStyles = "border border-chalk text-chalk font-semibold";
      break;
  }

  if (icon === "dot") {
    iconElement = (
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          variant === "active" ? "bg-signal-lime" : variant === "warning" ? "bg-chalk" : "bg-fog"
        }`}
      />
    );
  } else if (icon === "check") {
    iconElement = <Check className="w-3 h-3 mr-1" strokeWidth={3} />;
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-sans font-medium uppercase tracking-wider bg-transparent ${variantStyles} ${className}`}
    >
      {iconElement}
      {children}
    </span>
  );
}
