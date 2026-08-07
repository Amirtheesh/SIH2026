"use client";

import { useEffect, useRef } from "react";

interface AuthBackgroundProps {
  /** "blue" | "emerald" | "amber" */
  accent?: "blue" | "emerald" | "amber";
}

const ACCENT_COLORS = {
  blue: {
    orb1: "rgba(59, 130, 246, 0.15)",
    orb2: "rgba(139, 92, 246, 0.10)",
    orb3: "rgba(16, 185, 129, 0.07)",
  },
  emerald: {
    orb1: "rgba(16, 185, 129, 0.15)",
    orb2: "rgba(59, 130, 246, 0.10)",
    orb3: "rgba(99, 102, 241, 0.07)",
  },
  amber: {
    orb1: "rgba(245, 158, 11, 0.15)",
    orb2: "rgba(239, 68, 68, 0.08)",
    orb3: "rgba(168, 85, 247, 0.07)",
  },
};

export function AuthBackground({ accent = "blue" }: AuthBackgroundProps) {
  const colors = ACCENT_COLORS[accent];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060b18] via-[#080d1f] to-[#060b18]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Animated orbs */}
      <div
        className="absolute rounded-full blur-[120px] animate-orb-1"
        style={{
          width: "600px",
          height: "600px",
          top: "-20%",
          left: "-15%",
          background: colors.orb1,
          animationDuration: "20s",
        }}
      />
      <div
        className="absolute rounded-full blur-[100px] animate-orb-2"
        style={{
          width: "500px",
          height: "500px",
          bottom: "-10%",
          right: "-10%",
          background: colors.orb2,
          animationDuration: "25s",
        }}
      />
      <div
        className="absolute rounded-full blur-[80px] animate-orb-3"
        style={{
          width: "350px",
          height: "350px",
          top: "40%",
          right: "20%",
          background: colors.orb3,
          animationDuration: "18s",
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <style>{`
        @keyframes orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 30px) scale(1.05); }
          66% { transform: translate(-20px, 50px) scale(0.95); }
        }
        @keyframes orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, -30px) scale(1.08); }
          66% { transform: translate(30px, -20px) scale(0.95); }
        }
        @keyframes orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -40px) scale(1.1); }
        }
        .animate-orb-1 { animation: orb-1 var(--duration, 20s) ease-in-out infinite; }
        .animate-orb-2 { animation: orb-2 var(--duration, 25s) ease-in-out infinite; }
        .animate-orb-3 { animation: orb-3 var(--duration, 18s) ease-in-out infinite; }
      `}</style>
    </div>
  );
}
