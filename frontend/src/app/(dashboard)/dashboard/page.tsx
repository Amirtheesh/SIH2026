"use client";

import { Activity, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForecast } from "@/hooks/useForecast";
import { ForecastChart } from "@/components/charts/ForecastChart";

export default function DashboardPage() {
  const { data, isLoading, error } = useForecast("National", "24h");

  // Calculate some mock KPIs based on the mock data
  const currentLoad = data.length > 0 ? data[0].load_mw : 0;
  const peakLoad = data.length > 0 ? Math.max(...data.map(d => d.load_mw)) : 0;
  const peakTime = data.length > 0 ? new Date(data.find(d => d.load_mw === peakLoad)?.ts || "").toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Demand</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" suppressHydrationWarning>{isLoading ? "---" : currentLoad.toLocaleString("en-US")} MW</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center mt-1"><TrendingUp className="h-3 w-3 mr-1" /> +2.1% from last hour</span>
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predicted Peak (24h)</CardTitle>
            <Zap className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" suppressHydrationWarning>{isLoading ? "---" : peakLoad.toLocaleString("en-US")} MW</div>
            <p className="text-xs text-muted-foreground mt-1">Expected at {peakTime}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96.8%</div>
            <p className="text-xs text-muted-foreground mt-1">Based on recent model accuracy</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">2</div>
            <p className="text-xs text-muted-foreground mt-1">1 Critical, 1 Warning</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-7">
        <Card className="col-span-1 md:col-span-7 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>National Grid Forecast (24h)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center">Loading forecast model...</div>
            ) : error ? (
              <div className="h-[400px] flex items-center justify-center text-rose-500">Error loading forecast</div>
            ) : (
              <ForecastChart data={data} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
