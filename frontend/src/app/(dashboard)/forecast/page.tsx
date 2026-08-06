"use client";

import { useState, useEffect } from "react";
import { Info, LineChart as ChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfidenceBand, ConfidencePoint } from "@/components/charts/ConfidenceBand";

export default function ForecastPage() {
  const [data, setData] = useState<ConfidencePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock API Call
    setTimeout(() => {
      const mockData: ConfidencePoint[] = Array.from({ length: 24 }).map((_, i) => {
        const base = 150000 + Math.sin(i / 12 * Math.PI) * 30000;
        return {
          time: new Date(Date.now() + i * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          expected: Math.round(base),
          p50_high: Math.round(base * 1.02),
          p50_low: Math.round(base * 0.98),
          p95_high: Math.round(base * 1.06),
          p95_low: Math.round(base * 0.94),
        };
      });
      setData(mockData);
      setIsLoading(false);
    }, 600);
  }, []);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Demand Forecasts</h2>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Forecast with Confidence Bands</CardTitle>
                <CardDescription>24-hour horizon showing 50% and 95% certainty intervals</CardDescription>
              </div>
              <ChartIcon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading model...</div>
              ) : (
                <ConfidenceBand data={data} />
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-400" />
                Why this Forecast?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-blue-500/10 p-4 border border-blue-500/20">
                <h4 className="font-semibold text-blue-400 mb-1">Weather Impact (High)</h4>
                <p className="text-sm text-muted-foreground">
                  A sudden temperature drop of 4°C is expected over the next 12 hours, correlating heavily with a predicted 12% rise in heating demand.
                </p>
              </div>
              
              <div className="rounded-lg bg-purple-500/10 p-4 border border-purple-500/20">
                <h4 className="font-semibold text-purple-400 mb-1">Historical Pattern</h4>
                <p className="text-sm text-muted-foreground">
                  This exact load profile has a 92% cosine similarity with the third Tuesday of November from the previous year.
                </p>
              </div>

              <div className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20">
                <h4 className="font-semibold text-emerald-400 mb-1">Event Adjustment</h4>
                <p className="text-sm text-muted-foreground">
                  The model adjusted the evening peak downwards by 1.5% due to a local public holiday affecting industrial zones.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
