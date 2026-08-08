"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield, ArrowLeft, ShieldAlert, Fingerprint, Eye } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAppStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberAdmin, setRememberAdmin] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!email.trim()) newErrors.email = "Admin email is required";
    else if (!validateEmail(email)) newErrors.email = "Please enter a valid email address";
    if (!password) newErrors.password = "Admin password is required";
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

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (res.status === 401) {
        setErrors({ general: "Invalid admin credentials. Access denied." });
        return;
      }
      if (!res.ok) {
        setErrors({ general: "Authentication failed. Please try again." });
        return;
      }

      const data = await res.json();

      // Backend is the authority — only role='admin' can access admin portal
      if (data.role !== "admin") {
        setErrors({
          general:
            "Admin privileges required. Your account does not have administrator access. Contact your system administrator.",
        });
        return;
      }

      login({
        name: data.name,
        email: data.email,
        role: data.role,
        token: data.access_token,
      });

      router.push("/admin");
    } catch {
      setErrors({ general: "Unable to connect to the server. Please check your connection." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-8">
      <AuthBackground accent="amber" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/20">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">GridForecaster</span>
        </div>

        {/* Warning banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-4">
          <Eye className="h-4 w-4 text-amber-400/80 shrink-0" />
          <p className="text-xs text-amber-300/60 leading-relaxed">
            <span className="font-semibold text-amber-300/80">Restricted Area.</span>{" "}
            Unauthorized access attempts are logged and monitored.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/10 bg-white/[0.025] backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/[0.05]">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-white tracking-tight">Admin Portal</h1>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 tracking-wider">
                      RESTRICTED
                    </span>
                  </div>
                  <p className="text-sm text-white/40 mt-0.5">Privileged system access</p>
                </div>
              </div>
            </div>

            {/* Security info pills */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Shield, label: "Encrypted" },
                { icon: Fingerprint, label: "Verified" },
                { icon: Eye, label: "Audited" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                >
                  <Icon className="h-4 w-4 text-amber-400/60" />
                  <span className="text-[11px] text-white/30 font-medium">{label}</span>
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
              label="Admin Email"
              icon={Mail}
              accent="amber"
              type="email"
              placeholder="admin@grid.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              error={errors.email}
              autoComplete="email"
              autoFocus
            />

            <AuthInput
              label="Admin Password"
              icon={Lock}
              accent="amber"
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
              error={errors.password}
              autoComplete="current-password"
            />

            {/* Remember admin session */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  role="checkbox"
                  aria-checked={rememberAdmin}
                  tabIndex={0}
                  onClick={() => setRememberAdmin((v) => !v)}
                  onKeyDown={(e) => e.key === " " && setRememberAdmin((v) => !v)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    rememberAdmin
                      ? "bg-amber-600 border-amber-600"
                      : "border-white/20 bg-white/5 group-hover:border-amber-500/40"
                  }`}
                >
                  {rememberAdmin && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                  Remember admin session
                </span>
              </label>
            </div>

            <div className="pt-1">
              <AuthButton
                type="submit"
                accent="amber"
                loading={isLoading}
                icon={ShieldAlert}
              >
                Access Admin Portal
              </AuthButton>
            </div>

            <p className="text-center text-[11px] text-white/20 leading-relaxed">
              All admin actions are logged for security compliance.
            </p>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 border-t border-white/[0.05] pt-5">
            <button
              type="button"
              onClick={() => router.push("/operator")}
              className="flex items-center gap-2 text-sm text-white/25 hover:text-emerald-400 transition-colors mx-auto font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Operator Access
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/12 mt-6">
          GridForecaster — Smart India Hackathon 2026
        </p>
      </div>
    </div>
  );
}
