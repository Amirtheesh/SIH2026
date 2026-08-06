"use client";

import { useState, useEffect } from "react";
import { Activity, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadCurve, LoadPoint } from "@/components/charts/LoadCurve";

export default function PeakAnalyticsPage() {
  const [data, setData] = useState<LoadPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock API Call
    setTimeout(() => {
      const mockData: LoadPoint[] = Array.from({ length: 24 }).map((_, i) => {
        const predicted = 140000 + Math.sin(i / 12 * Math.PI) * 40000;
        // Simulate actual data only up to hour 14
        const actual = i <= 14 ? predicted + (Math.random() * 8000 - 4000) : undefined;
        return {
          time: new Date(new Date().setHours(i, 0, 0, 0)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          predicted_mw: Math.round(predicted),
          actual_mw: actual ? Math.round(actual) : undefined,
        };
      });
      setData(mockData);
      setIsLoading(false);
    }, 600);
  }, []);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Peak Demand Analytics</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predicted Peak</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">178,420 MW</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <Clock className="h-3 w-3 mr-1" /> Expected at 18:00
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vs Yesterday Peak</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">+4.2%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Yesterday: 171,200 MW
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vs Last Week Peak</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">-1.8%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last Week: 181,600 MW
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Probability</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Confidence in 18:00-19:00 window
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Daily Load Curve Overlay</CardTitle>
            <CardDescription>Comparing actual real-time load vs model predictions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center">Loading load curve...</div>
            ) : (
              <LoadCurve data={data} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
