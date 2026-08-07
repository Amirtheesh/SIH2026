"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, Zap, BellRing, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  getAnomalies, getPeakRisk, 
  AnomalyResponse, PeakRiskResponse, AnomalyItem 
} from "@/lib/api";

export default function AlertsPage() {
  const [region, setRegion] = useState("national");
  const [anomalies, setAnomalies] = useState<AnomalyResponse | null>(null);
  const [risk, setRisk] = useState<PeakRiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlertData = async () => {
    setIsLoading(true);
    try {
      const [anomRes, riskRes] = await Promise.all([
        getAnomalies(region, "24h").catch(() => null),
        getPeakRisk(region, 48).catch(() => null),
      ]);
      setAnomalies(anomRes);
      setRisk(riskRes);
    } catch (err) {
      console.warn("Alerts API error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlertData();
  }, [region]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            AI Anomaly Detection & Risk Alerts
            <div className="relative flex h-3 w-3 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </div>
          </h2>
          <p className="text-muted-foreground text-sm">
            Isolation Forest ML anomaly detection and Peak Risk Capacity Assessment
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadAlertData} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Detection
        </Button>
      </div>

      {/* Feature 6: Peak Risk Capacity Status */}
      {risk && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
              Feature 6: Peak Risk Alert Assessment ({risk.current_risk_level} Status)
            </CardTitle>
            <CardDescription>
              Capacity Threshold: {(risk.grid_capacity_mw / 1000).toFixed(0)}k MW | Time to Critical: {risk.time_to_critical_hours !== null ? `${risk.time_to_critical_hours}h` : "None"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              {risk.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-card/70 border border-border/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase text-amber-400">{rec.action}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{Math.round(rec.confidence * 100)}% Conf</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.detail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature 5: Isolation Forest Anomaly Detection Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            Feature 5: Isolation Forest Anomaly Detector Output
          </CardTitle>
          <CardDescription>
            {anomalies ? anomalies.summary : "Analyzing predictions against residuals..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
              <span className="text-sm font-mono">Running Isolation Forest Anomaly Model...</span>
            </div>
          ) : !anomalies || anomalies.anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl bg-card/30">
              <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-400 opacity-80" />
              <p className="font-semibold text-foreground">No Anomalies Detected</p>
              <p className="text-xs text-muted-foreground mt-1">Predictions are consistent with statistical boundaries (Z-score &lt; 2.5σ)</p>
            </div>
          ) : (
            <div className="grid gap-3 max-w-4xl">
              {anomalies.anomalies.map((item: AnomalyItem, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        {item.anomaly_type} ({item.severity})
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">Z-Score: {item.z_score}σ | Score: {item.anomaly_score}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-foreground">{item.value_mw.toLocaleString()} MW</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed">{item.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
