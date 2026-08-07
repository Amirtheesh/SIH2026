"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  accent?: "blue" | "emerald" | "amber";
}

const ACCENT_RING = {
  blue: "focus-within:ring-blue-500/30 focus-within:border-blue-500/60",
  emerald: "focus-within:ring-emerald-500/30 focus-within:border-emerald-500/60",
  amber: "focus-within:ring-amber-500/30 focus-within:border-amber-500/60",
};

const ACCENT_ICON = {
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
};

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon: Icon, error, accent = "blue", className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    const hasError = !!error;

    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/70 tracking-wide">
          {label}
        </label>
        <div
          className={cn(
            "relative flex items-center rounded-xl border bg-white/[0.04] ring-2 ring-transparent transition-all duration-200",
            hasError
              ? "border-red-500/60 ring-red-500/20"
              : `border-white/10 ${ACCENT_RING[accent]}`,
            className
          )}
        >
          {Icon && (
            <div className={cn("pl-4 shrink-0", ACCENT_ICON[accent])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            aria-invalid={hasError}
            className={cn(
              "w-full bg-transparent px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none",
              Icon && "pl-3",
              isPassword && "pr-12"
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 text-white/30 hover:text-white/60 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {hasError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
            {error}
          </p>
        )}
      </div>
    );
  }
);
AuthInput.displayName = "AuthInput";
