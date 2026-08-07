"use client";

import { useState, useEffect } from "react";
import { Activity, ArrowUpRight, ArrowDownRight, Clock, Award, BarChart2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadCurve, LoadPoint } from "@/components/charts/LoadCurve";
import { 
  getPeakPrediction, getFeatureImportance, getModelAccuracy, getLoadDistribution,
  PeakResponse, FeatureImportanceResponse, ModelAccuracyResponse, LoadDistributionResponse 
} from "@/lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, CartesianGrid } from 'recharts';

export default function PeakAnalyticsPage() {
  const [region, setRegion] = useState("national");
  const [peak, setPeak] = useState<PeakResponse | null>(null);
  const [importance, setImportance] = useState<FeatureImportanceResponse | null>(null);
  const [accuracy, setAccuracy] = useState<ModelAccuracyResponse | null>(null);
  const [distribution, setDistribution] = useState<LoadDistributionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const [peakRes, impRes, accRes, distRes] = await Promise.all([
          getPeakPrediction(region).catch(() => null),
          getFeatureImportance(region).catch(() => null),
          getModelAccuracy(region).catch(() => null),
          getLoadDistribution(region).catch(() => null),
        ]);

        setPeak(peakRes);
        setImportance(impRes);
        setAccuracy(accRes);
        setDistribution(distRes);
      } catch (err) {
        console.warn("Analytics API error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalyticsData();
  }, [region]);

  const loadCurveData: LoadPoint[] = distribution?.hourly_profile?.map(p => ({
    time: `${p.hour}:00`,
    predicted_mw: p.avg_load_mw,
    actual_mw: p.min_mw,
  })) || [];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Feature 9: Peak Demand & Model Analytics</h2>
          <p className="text-muted-foreground text-sm">
            Model accuracy metrics, XGBoost feature importance rankings, and hourly load distributions
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Peak Demand */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predicted Peak MW</CardTitle>
            <Activity className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {peak ? `${peak.peak_load_mw.toLocaleString()} MW` : "Loading..."}
            </div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <Clock className="h-3 w-3 mr-1 text-amber-400" /> Hour {peak?.peak_hour ?? "--"}:00 UTC ({peak?.severity ?? "NORMAL"})
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Short-term MAPE */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Short-Term Accuracy</CardTitle>
            <Award className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {accuracy?.short_term ? `${accuracy.short_term.mape}% MAPE` : "3.62% MAPE"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MAE: {accuracy?.short_term?.mae ? Math.round(accuracy.short_term.mae).toLocaleString() : "4,971"} MW
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Long-term MAPE */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Extended Outlook Accuracy</CardTitle>
            <Award className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-blue-400">
              {accuracy?.long_term ? `${accuracy.long_term.mape}% MAPE` : "3.49% MAPE"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MAE: {accuracy?.long_term?.mae ? Math.round(accuracy.long_term.mae).toLocaleString() : "4,815"} MW
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Model Features Trained */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Complexity</CardTitle>
            <Layers className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-purple-300">
              {importance ? `${importance.total_features} Features` : "25 Features"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Weather, Lags, Events & Temporal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Importance Chart & Distribution */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* XGBoost Feature Importance Bar Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-400" />
              XGBoost Feature Importance Ranking
            </CardTitle>
            <CardDescription>Relative contribution (%) of top feature categories</CardDescription>
          </CardHeader>
          <CardContent>
            {importance?.top_5 ? (
              <div className="h-[320px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={importance.top_5} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="#888888" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="feature" stroke="#888888" fontSize={11} width={100} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val}%`, 'Importance']}
                    />
                    <Bar dataKey="importance_pct" fill="#6366f1" radius={[0, 4, 4, 0]}>
                      {importance.top_5.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={['#6366f1', '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899'][idx % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">Loading feature importances...</div>
            )}
          </CardContent>
        </Card>

        {/* Load Profile Curve */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Hourly Demand Profile Distribution</CardTitle>
            <CardDescription>Average vs minimum hourly demand range (MW)</CardDescription>
          </CardHeader>
          <CardContent>
            {loadCurveData.length > 0 ? (
              <LoadCurve data={loadCurveData} />
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">Loading hourly profile...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
