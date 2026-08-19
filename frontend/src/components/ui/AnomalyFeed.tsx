import React from "react";
import { Anomaly } from "@/lib/types";
import { Pill } from "./Pill";
import { AlertCircle, Eye, ShieldAlert, ArrowRight, ShieldCheck } from "lucide-react";

interface AnomalyFeedProps {
  anomalies: Anomaly[];
  onRowClick?: (anomaly: Anomaly) => void;
}

export function AnomalyFeed({ anomalies, onRowClick }: AnomalyFeedProps) {
  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-ash text-[13px]">
        No recent anomalies detected.
      </div>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "Critical": return <ShieldAlert className="w-3.5 h-3.5 text-signal-lime" />;
      case "High": return <AlertCircle className="w-3.5 h-3.5 text-signal-lime" />;
      case "Medium": return <AlertCircle className="w-3.5 h-3.5 text-bone" />;
      case "Low": return <Eye className="w-3.5 h-3.5 text-fog" />;
      default: return <ShieldCheck className="w-3.5 h-3.5 text-fog" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical": return "border-signal-lime text-signal-lime font-medium";
      case "High": return "border-signal-lime/50 text-signal-lime";
      case "Medium": return "border-graphite text-bone";
      default: return "border-graphite/50 text-fog";
    }
  };

  return (
    <div className="flex flex-col w-full">
      {anomalies.map((anomaly, index) => {
        const time = new Date(anomaly.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        return (
          <div 
            key={anomaly.id} 
            onClick={() => onRowClick?.(anomaly)}
            className={`
              group flex flex-col md:flex-row md:items-center gap-3 p-3 border-b border-graphite/50 
              ${onRowClick ? "cursor-pointer hover:bg-onyx transition-colors" : ""}
              ${index === anomalies.length - 1 ? "border-b-0" : ""}
            `}
          >
            {/* Timestamp & Icon */}
            <div className="flex items-center gap-3 min-w-[120px]">
              {getSeverityIcon(anomaly.severity)}
              <span className="font-mono text-[11px] text-ash">{time}</span>
            </div>
            
            {/* Category Badge */}
            <div className="min-w-[180px]">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] uppercase tracking-wider ${getSeverityStyle(anomaly.severity)}`}>
                {anomaly.severity} • {anomaly.type}
              </span>
            </div>

            {/* Description */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-bone truncate font-sans">
                <span className="font-mono text-pearl mr-2">{anomaly.employeeId}</span>
                {anomaly.description}
              </p>
            </div>
            
            {/* Status & Arrow */}
            <div className="flex items-center gap-4 justify-end mt-2 md:mt-0">
              <Pill variant={
                anomaly.status === "New" ? "warning" : 
                anomaly.status === "Confirmed" ? "active" : 
                "neutral"
              }>
                {anomaly.status}
              </Pill>
              {onRowClick && (
                <ArrowRight className="w-4 h-4 text-graphite group-hover:text-signal-lime transition-colors hidden md:block" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
