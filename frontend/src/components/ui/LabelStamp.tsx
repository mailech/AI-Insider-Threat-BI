import React from "react";

interface LabelStampProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export function LabelStamp({ className = "", children, ...props }: LabelStampProps) {
  // Metadata Label Stamp — `[ LIKE THIS ]` bracket-wrapped uppercase Inter Tight 11px, 0.22em tracking, #7a7a7a.
  // Implemented using the global `.label-stamp` utility class from globals.css
  return (
    <span className={`label-stamp inline-block mb-4 ${className}`} {...props}>
      [ {children} ]
    </span>
  );
}
