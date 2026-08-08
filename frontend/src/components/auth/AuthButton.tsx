"use client";

import { LucideIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: LucideIcon;
  accent?: "blue" | "emerald" | "amber";
  variant?: "primary" | "ghost";
}

const ACCENT_STYLES = {
  blue: {
    primary: "bg-blue-600 hover:bg-blue-500 shadow-blue-500/25 hover:shadow-blue-500/40 focus-visible:ring-blue-500/50",
    ghost: "text-blue-400 hover:bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40",
  },
  emerald: {
    primary: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25 hover:shadow-emerald-500/40 focus-visible:ring-emerald-500/50",
    ghost: "text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40",
  },
  amber: {
    primary: "bg-amber-600 hover:bg-amber-500 shadow-amber-500/25 hover:shadow-amber-500/40 focus-visible:ring-amber-500/50",
    ghost: "text-amber-400 hover:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40",
  },
};

export function AuthButton({
  children,
  loading = false,
  icon: Icon,
  accent = "blue",
  variant = "primary",
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  const isDisabled = disabled || loading;
  const styles = ACCENT_STYLES[accent][variant];

  return (
    <button
      disabled={isDisabled}
      className={cn(
        "relative w-full flex items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-semibold tracking-wide transition-all duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variant === "primary" && [
          "text-white shadow-lg",
          "before:absolute before:inset-0 before:rounded-xl before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
          styles,
        ],
        variant === "ghost" && [
          "border bg-transparent",
          styles,
        ],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
