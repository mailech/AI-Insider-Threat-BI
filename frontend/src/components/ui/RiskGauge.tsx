import React from "react";

interface RiskGaugeProps {
  value: number; // 0 to 100
  label?: string; // Low, Medium, High, Critical
}

export function RiskGauge({ value, label }: RiskGaugeProps) {
  // SVG properties for a semi-circle gauge
  const radius = 80;
  const strokeWidth = 12;
  const viewBoxSize = radius * 2 + strokeWidth * 2;
  const center = viewBoxSize / 2;
  
  // Path for a semi-circle: starts left, arcs to right
  const arcPath = `M ${strokeWidth},${center} A ${radius},${radius} 0 0,1 ${viewBoxSize - strokeWidth},${center}`;
  
  // Calculate stroke dasharray for the filled portion
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative w-full max-w-[220px] mx-auto">
      <svg 
        viewBox={`0 0 ${viewBoxSize} ${center + strokeWidth}`} 
        className="w-full overflow-visible"
        style={{ filter: "drop-shadow(0 0 12px rgba(197, 255, 74, 0.15))" }}
      >
        {/* Background Track */}
        <path
          d={arcPath}
          fill="none"
          stroke="#252525"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Foreground Fill */}
        <path
          d={arcPath}
          fill="none"
          stroke="#c5ff4a"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Center Values */}
      <div className="absolute bottom-0 flex flex-col items-center pb-2">
        <span className="text-4xl font-mono text-bone font-medium">{value.toFixed(1)}%</span>
        {label && (
          <span className="text-[11px] uppercase tracking-wider text-signal-lime mt-1 font-semibold">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
