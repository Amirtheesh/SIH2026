"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap, Flame, Snowflake, CloudRain, Calendar, Trophy, Factory } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WhatIfSliders, SimulatorParams } from "@/components/simulator/WhatIfSliders";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { ForecastPoint } from "@/hooks/useForecast";
import { runWhatIfSimulation, WhatIfResponsePayload } from "@/lib/api";

const defaultParams: SimulatorParams = {
  temperatureOffset: 0,
  humidityOffset: 0,
  industrialHoliday: false,
  evChargingSurge: false,
};

const PRESETS = [
  { id: "heatwave", name: "Heatwave (+5°C)", icon: Flame, color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { id: "cold_wave", name: "Cold Wave (-8°C)", icon: Snowflake, color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  { id: "monsoon", name: "Heavy Monsoon", icon: CloudRain, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "major_holiday", name: "Major Holiday", icon: Calendar, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "cricket_final", name: "Cricket Final", icon: Trophy, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { id: "industrial_shutdown", name: "Industrial Shutdown", icon: Factory, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
];

export default function WhatIfSimulatorPage() {
  const [params, setParams] = useState<SimulatorParams>(defaultParams);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [resultSummary, setResultSummary] = useState<WhatIfResponsePayload | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async (scenarioOverride?: string) => {
    setIsSimulating(true);
    try {
      const payload = {
        scenario_name: scenarioOverride || activeScenario || undefined,
        temperature_offset: params.temperatureOffset,
        humidity_offset: params.humidityOffset,
        is_holiday: params.industrialHoliday,
        is_sports_event: params.evChargingSurge,
        duration_hours: 24,
      };

      const res = await runWhatIfSimulation("national", payload);
      setResultSummary(res);

      const formatted: ForecastPoint[] = (res.comparison || []).map((c) => ({
        ts: c.ts,
        load_mw: c.scenario_mw,
        low: Math.round(c.scenario_mw * 0.95),
        high: Math.round(c.scenario_mw * 1.05),
      }));

      setData(formatted);
    } catch (err) {
      console.warn("What-if simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, []);

  const handlePresetClick = (presetId: string) => {
    setActiveScenario(presetId);
    runSimulation(presetId);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Feature 7: Scenario-Based What-If Simulator</h2>
          <p className="text-muted-foreground text-sm">Run live XGBoost model inference under extreme weather or grid stress scenarios</p>
        </div>
      </div>

      {/* Preset Scenario Quick-Run Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = activeScenario === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary bg-primary/10' 
                  : `${preset.color} hover:opacity-90`
              }`}
            >
              <Icon className="h-5 w-5 mb-1.5 shrink-0" />
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      {/* Simulation Result Summary KPI Bar */}
      {resultSummary && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 bg-card/60 p-4 rounded-xl border border-border/60">
          <div>
            <span className="text-xs text-muted-foreground block">Baseline Peak MW</span>
            <span className="text-lg font-bold font-mono text-foreground">{resultSummary.original_peak_mw.toLocaleString()} MW</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Simulated Peak MW</span>
            <span className="text-lg font-bold font-mono text-indigo-400">{resultSummary.new_peak_mw.toLocaleString()} MW</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Peak Shift Delta</span>
            <span className={`text-lg font-bold font-mono ${resultSummary.delta_mw >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {resultSummary.delta_mw >= 0 ? `+${resultSummary.delta_mw.toLocaleString()}` : resultSummary.delta_mw.toLocaleString()} MW
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Percentage Change</span>
            <span className={`text-lg font-bold font-mono ${resultSummary.delta_percentage >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {resultSummary.delta_percentage >= 0 ? `+${resultSummary.delta_percentage}%` : `${resultSummary.delta_percentage}%`}
            </span>
          </div>
        </div>
      )}

      {/* Sliders & Live Chart Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">Custom Parameters</CardTitle>
              <CardDescription>Adjust variables to trigger a live XGBoost re-forecast</CardDescription>
            </CardHeader>
            <CardContent>
              <WhatIfSliders 
                params={params} 
                onChange={(p) => {
                  setActiveScenario(null);
                  setParams(p);
                }} 
              />
              
              <div className="mt-8 flex gap-3">
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium" 
                  onClick={() => runSimulation()}
                  disabled={isSimulating}
                >
                  {isSimulating ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Run Re-Forecast
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveScenario(null);
                    setParams(defaultParams);
                    setTimeout(() => runSimulation(), 50);
                  }}
                  disabled={isSimulating}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full min-h-[500px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-400" />
                Live Model Re-Forecast Curve ({activeScenario ? activeScenario.toUpperCase() : "CUSTOM SCENARIO"})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-[450px]">
                <AnimatePresence mode="wait">
                  {isSimulating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg z-10"
                    >
                      <div className="flex flex-col items-center text-indigo-400">
                        <RefreshCw className="h-10 w-10 animate-spin mb-4" />
                        <span className="font-mono text-sm tracking-widest uppercase">Running XGBoost Model Inference...</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chart"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="h-full w-full"
                    >
                      <ForecastChart data={data} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
