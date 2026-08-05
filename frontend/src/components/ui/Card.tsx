import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
  // Sharp Content Card — bg #1f1f1f (onyx), 1px border #252525 (graphite), padding 32–40px, radius 0.
  // Using Tailwind tokens: bg-onyx border-graphite border p-8 md:p-10 rounded-none
  return (
    <div
      className={`bg-onyx border border-graphite p-8 md:p-10 rounded-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
