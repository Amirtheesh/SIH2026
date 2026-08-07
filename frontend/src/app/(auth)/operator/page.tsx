"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Wrench, ArrowLeft, LayoutDashboard, Shield, Activity } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const FEATURE_LIST = [
  { icon: Activity, label: "Live grid telemetry" },
  { icon: LayoutDashboard, label: "Forecast dashboards" },
  { icon: Shield, label: "Operational control" },
];

export default function OperatorLoginPage() {
  const router = useRouter();
  const login = useAppStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!email.trim()) newErrors.email = "Operator email is required";
    else if (!validateEmail(email)) newErrors.email = "Please enter a valid email address";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const body = new URLSearchParams();
      body.append("username", email);
      body.append("password", password);

      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (res.status === 401) {
        setErrors({ general: "Incorrect email or password. Please try again." });
        return;
      }
      if (!res.ok) {
        setErrors({ general: "Authentication failed. Please try again." });
        return;
      }

      const data = await res.json();

      // Backend is the authority — check the DB role
      if (data.role === "public") {
        setErrors({
          general: "Insufficient permissions. Operator or Admin credentials are required to access this portal.",
        });
        return;
      }

      login({
        name: data.name,
        email: data.email,
        role: data.role,
        token: data.access_token,
      });

      router.push("/dashboard");
    } catch {
      setErrors({ general: "Unable to connect to the server. Please check your connection." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-8">
      <AuthBackground accent="emerald" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
            <Wrench className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">GridForecaster</span>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Wrench className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Operator Access</h1>
                  <p className="text-sm text-white/40 mt-0.5">Operational command center</p>
                </div>
              </div>
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Secure
              </span>
            </div>

            {/* Feature list */}
            <div className="space-y-2 mt-4">
              {FEATURE_LIST.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm text-white/40">
                  <Icon className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="px-8 py-7 space-y-5">
            {errors.general && (
              <div
                role="alert"
                className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm"
              >
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-red-500/30 flex items-center justify-center text-[10px] font-bold">!</span>
                {errors.general}
              </div>
            )}

            <AuthInput
              label="Operator Email"
              icon={Mail}
              accent="emerald"
              type="email"
              placeholder="operator@grid.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              error={errors.email}
              autoComplete="email"
              autoFocus
            />

            <AuthInput
              label="Operator Password"
              icon={Lock}
              accent="emerald"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
              error={errors.password}
              autoComplete="current-password"
            />

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  role="checkbox"
                  aria-checked={rememberMe}
                  tabIndex={0}
                  onClick={() => setRememberMe((v) => !v)}
                  onKeyDown={(e) => e.key === " " && setRememberMe((v) => !v)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    rememberMe
                      ? "bg-emerald-600 border-emerald-600"
                      : "border-white/20 bg-white/5 group-hover:border-emerald-500/40"
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-emerald-400/60 hover:text-emerald-400 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <div className="pt-1">
              <AuthButton
                type="submit"
                accent="emerald"
                loading={isLoading}
                icon={LayoutDashboard}
              >
                Access Operator Dashboard
              </AuthButton>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 border-t border-white/[0.06] pt-5">
            <button
              type="button"
              onClick={() => router.push("/admin-login")}
              className="flex items-center gap-2 text-sm text-white/30 hover:text-amber-400 transition-colors mx-auto font-semibold"
            >
              Admin Access →
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/15 mt-4">
          GridForecaster — Smart India Hackathon 2026
        </p>
      </div>
    </div>
  );
}
