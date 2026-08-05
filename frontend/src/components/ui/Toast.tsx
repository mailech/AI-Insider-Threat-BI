import React from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "info" | "error";

interface ToastProps {
  type?: ToastType;
  title: string;
  message?: string;
  onClose?: () => void;
}

export function Toast({ type = "info", title, message, onClose }: ToastProps) {
  let barColor = "bg-signal-lime";
  let Icon = Info;
  let iconColor = "text-signal-lime";

  if (type === "success") {
    barColor = "bg-signal-lime";
    Icon = CheckCircle2;
    iconColor = "text-signal-lime";
  } else if (type === "error") {
    barColor = "bg-validation-error";
    Icon = AlertTriangle;
    iconColor = "text-validation-error";
  }

  return (
    <div className="relative flex w-full max-w-sm overflow-hidden bg-onyx shadow-lg">
      <div className={`w-[3px] flex-shrink-0 ${barColor}`} />
      <div className="flex flex-1 p-4">
        <div className="flex-shrink-0 mr-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-body font-medium text-bone mb-1">{title}</h3>
          {message && <p className="text-body text-ash">{message}</p>}
        </div>
        {onClose && (
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={onClose}
              className="text-fog hover:text-bone outline-none focus:glow-lime p-0.5 rounded-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
