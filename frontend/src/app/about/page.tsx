"use client";

import Link from "next/link";
import { ArrowLeft, Cpu, Database, LayoutDashboard, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">About This Project</h2>
          <p className="text-muted-foreground">Smart India Hackathon (SIH) Submission</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Architecture Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            This dashboard is the frontend interface for an AI-Powered Electricity Demand Forecasting System. 
            It is designed to consume real-time grid telemetry, meteorological data, and calendar events to provide 
            highly accurate 24-hour load predictions.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-background/50 border border-border/50 flex gap-4">
              <div className="mt-1"><LayoutDashboard className="h-5 w-5 text-blue-500" /></div>
              <div>
                <h4 className="font-semibold text-sm">Frontend Layer</h4>
                <p className="text-xs text-muted-foreground mt-1">Next.js 15 App Router, Tailwind CSS, Shadcn UI, Recharts, and Zustand for state management. Interactive Leaflet maps for spatial data.</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-border/50 flex gap-4">
              <div className="mt-1"><Database className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <h4 className="font-semibold text-sm">Backend API (Mocked)</h4>
                <p className="text-xs text-muted-foreground mt-1">FastAPI powering REST endpoints and WebSockets for live telemetry and alert propagation.</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-background/50 border border-border/50 flex gap-4">
              <div className="mt-1"><Cpu className="h-5 w-5 text-purple-500" /></div>
              <div>
                <h4 className="font-semibold text-sm">AI Engine</h4>
                <p className="text-xs text-muted-foreground mt-1">XGBoost Ensemble model generating probabilistic forecasts (50% and 95% confidence bands).</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-background/50 border border-border/50 flex gap-4">
              <div className="mt-1"><Globe className="h-5 w-5 text-amber-500" /></div>
              <div>
                <h4 className="font-semibold text-sm">External Integrations</h4>
                <p className="text-xs text-muted-foreground mt-1">Weather APIs and SCADA systems providing the raw features for the machine learning pipeline.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
