import React from "react";

export type ButtonVariant = "primary" | "ghost" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function Button({
  variant = "primary",
  isLoading,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-sans font-medium text-body rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  let variantStyles = "";
  
  switch (variant) {
    case "primary":
      // Signal Lime CTA Button — bg #c5ff4a, text #000000, padding 14px 24px, radius 4px, Inter Tight 500 14px, 0.04em tracking, glow shadow.
      variantStyles = "bg-signal-lime text-void-black px-[24px] py-[14px] tracking-[0.04em] hover:glow-lime focus:glow-lime outline-none";
      break;
    case "outline":
      // Outlined Lime Button — transparent bg, 1px #c5ff4a border, #c5ff4a text, same glow
      variantStyles = "bg-transparent border border-signal-lime text-signal-lime px-[24px] py-[14px] tracking-[0.04em] hover:glow-lime focus:glow-lime outline-none";
      break;
    case "ghost":
      // Ghost Button — transparent bg, white text, Inter Tight 500, no border.
      variantStyles = "bg-transparent text-chalk hover:text-bone px-4 py-2 outline-none focus:ring-1 focus:ring-fog";
      break;
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
