"use client";

import { useState, useEffect } from "react";
import { 
  Activity, Zap, TrendingUp, AlertTriangle, ShieldAlert, CheckCircle2, 
  Brain, Clock, Layers, ChevronRight, Server, RefreshCw, Calendar as CalendarIcon,
  CloudRain, Thermometer, Droplets, Wind, Sun, AlertCircle, Database
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { 
  lookupDate, DateLookupResponse, ForecastPoint 
} from "@/lib/api";

const REGIONS = [
  { label: "SLDC Delhi", value: "sldc_delhi" },
  { label: "SLDC Chennai", value: "sldc_chennai" },
  { label: "National Grid", value: "national" },
  { label: "Northern Region", value: "northern" },
  { label: "Southern Region", value: "southern" },
  { label: "Western Region", value: "western" },
  { label: "Eastern Region", value: "eastern" },
];

export default function DashboardPage() {
  // Today's date YYYY-MM-DD from client system clock
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [region, setRegion] = useState("national");
  const [dateData, setDateData] = useState<DateLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculate max selectable future date (60 days out)
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 60);
  const maxDateStr = maxDateObj.toISOString().slice(0, 10);

  const fetchDateData = async (targetDate: string, targetRegion: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await lookupDate(targetDate, targetRegion);
      setDateData(res);
    } catch (err: any) {
      console.warn("Date lookup error:", err);
      setErrorMsg(err?.message || "Failed to load date data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDateData(selectedDate, region);
  }, [selectedDate, region]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setSelectedDate(val);
    }
  };

  // Convert points to ForecastPoint format for chart
  const forecastPoints: ForecastPoint[] = dateData?.points || [];

  const metrics = dateData?.metrics;
  const weather = dateData?.weather;
  const sourceMode = dateData?.source || "predicted";
  const confidence = dateData?.confidence || "high";

  // Badge Styling based on Source & Confidence
  const getBadgeStyle = () => {
    if (sourceMode === "historical") {
      return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    }
    if (selectedDate === todayStr) {
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    }
    if (confidence === "low") {
      return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    }
    return "bg-purple-500/20 text-purple-300 border-purple-500/40";
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Top Header with Region & Native Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Date-Based Intelligent Demand Hub</h2>
            {/* Visual Source Badge (Historical vs Predicted) */}
            {dateData && (
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${getBadgeStyle()}`}>
                {sourceMode === "historical" ? (
                  <>
                    <Database className="h-3.5 w-3.5" />
                    HISTORICAL DATA (ACTUAL)
                  </>
                ) : (
                  <>
                    <Brain className="h-3.5 w-3.5" />
                    AI FORECAST (PREDICTED)
                    {confidence === "low" && <span className="ml-1 text-amber-400">(CONFIDENCE: LOW)</span>}
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Automatic mode switching: Past dates (<span className="text-blue-400">SLDC Historical Dataset</span>) | Today & Future (<span className="text-purple-400">XGBoost AI Model</span>)
          </p>
        </div>

        {/* Controls: Region Selector + Native Date Picker */}
        <div className="flex flex-wrap items-center gap-3 bg-card/60 p-2 rounded-xl border border-border/60">
          {/* Region Select */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span>Grid Source:</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-background border border-border text-sm rounded-lg px-2.5 py-1.5 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {REGIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Native Date Picker */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span>Date:</span>
            <input
              type="date"
              value={selectedDate}
              min="2023-01-01"
              max={maxDateStr}
              onChange={handleDateChange}
              className="bg-background border border-border text-sm rounded-lg px-2.5 py-1.5 text-foreground font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            />
          </div>

          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchDateData(selectedDate, region)} 
            className="h-8 w-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Message if Out of Bounds or Malformed */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Low Confidence Alert Banner if Date is Far Future */}
      {confidence === "low" && sourceMode === "predicted" && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Low Confidence Horizon Alert:</strong> Date {selectedDate} is more than 7 days in the future. Predictions use generalized seasonal trends and carry higher variance.
            </span>
          </div>
          <span className="font-mono px-2 py-0.5 rounded bg-amber-500/30 font-bold">HORIZON &gt; 7 DAYS</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Average Demand */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Demand ({selectedDate})</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? "---" : `${metrics?.avg_demand_mw.toLocaleString()} MW`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Min: {metrics?.min_demand_mw.toLocaleString()} MW</span>
              <span className="font-mono text-[10px] opacity-80 uppercase">{sourceMode}</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Peak Demand */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Demand</CardTitle>
            <Zap className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? "---" : `${metrics?.peak_demand_mw.toLocaleString()} MW`}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1 text-amber-400" /> {metrics?.peak_time || "--"}
              </span>
              {metrics?.severity && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  metrics.severity === 'EMERGENCY' ? 'bg-rose-500/20 text-rose-400' :
                  metrics.severity === 'CRITICAL' ? 'bg-orange-500/20 text-orange-400' :
                  metrics.severity === 'ELEVATED' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {metrics.severity}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Grid Capacity Utilization */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grid Utilization</CardTitle>
            <ShieldAlert className={`h-4 w-4 ${metrics && metrics.utilization_pct >= 85 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${metrics && metrics.utilization_pct >= 85 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isLoading ? "---" : `${metrics?.utilization_pct}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reserve Margin: {metrics?.reserve_margin_mw.toLocaleString()} MW ({metrics?.risk_level || "GREEN"})
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Weather Overview */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weather ({selectedDate})</CardTitle>
            <Thermometer className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? "---" : `${weather?.temperature}°C`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>{weather?.condition || "Clear"}</span>
              <span>Hum: {weather?.humidity}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Hourly Demand Curve Chart */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-7 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-400" />
                Hourly Electricity Demand Curve ({selectedDate})
              </CardTitle>
              <CardDescription>
                {sourceMode === "historical" 
                  ? `Showing recorded SLDC historical load profile for ${selectedDate}` 
                  : `Showing AI XGBoost model predicted demand profile for ${selectedDate}`}
              </CardDescription>
            </div>

            {/* Source Badge */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${getBadgeStyle()}`}>
                {sourceMode === "historical" ? "HISTORICAL (SLDC DATASET)" : `MODEL PREDICTION (${confidence.toUpperCase()} CONF)`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <div className="h-[380px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-mono">Retrieving Data for {selectedDate}...</span>
              </div>
            ) : (
              <ForecastChart data={forecastPoints} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weather Telemetry & AI Insights Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* AI Insights & Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-300">
                <Brain className="h-5 w-5 text-blue-400" />
                Intelligent Insights for {selectedDate}
              </CardTitle>
              <CardDescription>
                {sourceMode === "historical" ? "Historical data verification and analysis" : "AI model synthesis & operator recommendations"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Insights Box */}
              {dateData?.ai_insights && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm leading-relaxed text-blue-100 font-sans">
                  {dateData.ai_insights}
                </div>
              )}

              {/* Action Recommendations */}
              <div className="space-y-3 mt-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Actionable Guidance</h4>
                {dateData?.recommendations?.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-lg bg-card/60 border border-border/60">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase mt-0.5 shrink-0 ${
                      rec.priority === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      rec.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      rec.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {rec.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-semibold text-foreground flex items-center justify-between">
                        {rec.action}
                        <span className="text-[11px] font-mono text-muted-foreground">Confidence: {Math.round(rec.confidence * 100)}%</span>
                      </h5>
                      <p className="text-xs text-muted-foreground mt-1 leading-normal">{rec.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Weather Card */}
        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-rose-400" />
                Weather Telemetry ({selectedDate})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4 text-rose-400" /> Temperature:
                </span>
                <span className="font-mono font-bold text-rose-400">{weather?.temperature ?? "--"}°C</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-sky-400" /> Humidity:
                </span>
                <span className="font-mono font-bold text-sky-400">{weather?.humidity ?? "--"}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Wind className="h-4 w-4 text-slate-400" /> Wind Speed:
                </span>
                <span className="font-mono font-bold text-slate-300">{weather?.wind_speed ?? "--"} m/s</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CloudRain className="h-4 w-4 text-blue-400" /> Rainfall:
                </span>
                <span className="font-mono font-bold text-blue-400">{weather?.rainfall ?? 0} mm</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sun className="h-4 w-4 text-amber-400" /> Heatwave Indicator:
                </span>
                <span className={`font-mono font-bold uppercase ${weather?.heatwave ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {weather?.heatwave ? "ACTIVE HEATWAVE" : "NONE"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
