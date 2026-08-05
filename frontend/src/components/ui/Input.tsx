import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col w-full mb-4">
        <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full bg-onyx text-bone text-body rounded-sm px-4 py-3 outline-none transition-all duration-200
              ${
                error
                  ? "border border-validation-error focus:ring-1 focus:ring-validation-error/50"
                  : "border border-slate focus:border-signal-lime focus:glow-lime"
              }
              ${className}
            `}
            {...props}
          />
          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="h-4 w-4 text-validation-error" />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-[11px] text-validation-error font-sans uppercase tracking-wider flex items-center">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
