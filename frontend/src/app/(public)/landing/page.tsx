"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [currentDemand, setCurrentDemand] = useState(185420); // mock MW

  // Mock live ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDemand((prev) => prev + Math.floor(Math.random() * 50) - 25);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px]" />

      <main className="flex flex-col items-center text-center z-10 px-4">
        <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium backdrop-blur-sm mb-8">
          <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          Live National Grid Status: Normal
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Predict the Future of Power.
        </h1>
        
        <p className="max-w-2xl text-lg text-muted-foreground mb-10">
          AI-Powered Electricity Demand Forecasting System designed for the Smart India Hackathon. 
          Real-time analytics, predictive modeling, and intelligent alerts for a resilient grid.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link 
            href="/operator" 
            className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base font-semibold")}
          >
            Enter Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        {/* Live Ticker Card */}
        <div className="flex flex-col items-center p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-md shadow-xl w-full max-w-sm">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Activity className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-medium uppercase tracking-wider">Current National Demand</h2>
          </div>
          <div className="text-4xl font-bold font-mono text-foreground" suppressHydrationWarning>
            {currentDemand.toLocaleString("en-US")} <span className="text-xl text-muted-foreground">MW</span>
          </div>
        </div>
      </main>
    </div>
  );
}
