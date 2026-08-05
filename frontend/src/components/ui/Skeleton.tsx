import React from "react";
import { Button } from "./Button";

export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Skeleton blocks in #1f1f1f (onyx) pulsing to #252525 (graphite)
  // To do a custom pulse between those specific colors, we use an animation via tailwind config, 
  // or simply rely on standard pulse with bg-onyx that has an opacity shift.
  // We will define a custom pulse animation in globals.css later if needed, 
  // but for now animate-pulse with bg-graphite works well.
  return (
    <div
      className={`animate-pulse bg-graphite rounded-sm ${className}`}
      {...props}
    />
  );
}

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center border border-dashed border-graphite bg-carbon ${className}`}>
      {Icon && (
        <div className="mb-4 text-fog">
          <Icon className="w-12 h-12 stroke-[1.5]" />
        </div>
      )}
      <h3 className="text-subheading font-sans font-medium text-bone mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-body text-ash max-w-sm mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
