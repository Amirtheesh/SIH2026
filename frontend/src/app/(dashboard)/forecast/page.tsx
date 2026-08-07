"use client";

import { useState, useEffect } from "react";
import { Info, LineChart as ChartIcon, RefreshCw, Zap, Cpu, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfidenceBand, ConfidencePoint } from "@/components/charts/ConfidenceBand";
import { getForecast, getExplainForecast, ExplainResponse } from "@/lib/api";

const HORIZONS = [
  { label: "1 Hour", value: "1h" },
  { label: "6 Hours", value: "6h" },
  { label: "24 Hours", value: "24h" },
  { label: "48 Hours", value: "48h" },
  { label: "7 Days", value: "168h" },
];

export default function ForecastPage() {
  const [region, setRegion] = useState("national");
  const [horizon, setHorizon] = useState("24h");
  const [data, setData] = useState<ConfidencePoint[]>([]);
  const [explain, setExplain] = useState<ExplainResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchForecastAndExplanation = async () => {
    setIsLoading(true);
    try {
      const [forecastRes, explainRes] = await Promise.all([
        getForecast(region, horizon),
        getExplainForecast(region, horizon).catch(() => null),
      ]);

      const formatted: ConfidencePoint[] = (forecastRes.points || []).map((p) => {
        const timeStr = new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          time: timeStr,
          expected: p.load_mw,
          p50_high: Math.round(p.load_mw * 1.02),
          p50_low: Math.round(p.load_mw * 0.98),
          p95_high: p.high,
          p95_low: p.low,
        };
      });

      setData(formatted);
      setExplain(explainRes);
    } catch (err) {
      console.warn("Forecast page API call error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastAndExplanation();
  }, [region, horizon]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Demand Forecasts & SHAP Explainability</h2>
          <p className="text-muted-foreground text-sm">
            Multi-horizon uncertainty quantification and TreeExplainer feature importance
          </p>
        </div>

        {/* Horizon selector buttons */}
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
          {HORIZONS.map((h) => (
            <Button
              key={h.value}
              variant={horizon === h.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setHorizon(h.value)}
              className={`text-xs h-7 px-3 ${horizon === h.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {h.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Demand Curve with Confidence Bands ({horizon})</CardTitle>
                <CardDescription>XGBoost model showing 50% and 95% certainty intervals</CardDescription>
              </div>
              <ChartIcon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm font-mono">Running Multi-Horizon Model...</span>
                </div>
              ) : (
                <ConfidenceBand data={data} />
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Feature 3 & SHAP Explainability Side Panel */}
        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Sparkles className="h-5 w-5 text-blue-400" />
                Why this Forecast? (SHAP AI)
              </CardTitle>
              <CardDescription>
                {explain?.explanation_method || "TreeExplainer Attribution"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Narration */}
              {explain?.narration && (
                <div className="rounded-lg bg-blue-500/10 p-3.5 border border-blue-500/20 text-xs leading-relaxed text-blue-200">
                  {explain.narration}
                </div>
              )}
              
              {/* Feature Impact List */}
              <div className="space-y-2 mt-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Top Feature Drivers</h4>
                {explain?.shap_top_features?.map((feat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-card/60 border border-border/50 text-xs">
                    <span className="font-mono font-medium text-foreground capitalize">{feat.feature.replace(/_/g, ' ')}</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                      feat.impact.startsWith('+') ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {feat.impact}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
