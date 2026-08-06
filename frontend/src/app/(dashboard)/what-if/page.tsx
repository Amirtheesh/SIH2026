"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WhatIfSliders, SimulatorParams } from "@/components/simulator/WhatIfSliders";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { ForecastPoint } from "@/hooks/useForecast";

const defaultParams: SimulatorParams = {
  temperatureOffset: 0,
  humidityOffset: 0,
  industrialHoliday: false,
  evChargingSurge: false,
};

export default function WhatIfSimulatorPage() {
  const [params, setParams] = useState<SimulatorParams>(defaultParams);
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = () => {
    setIsSimulating(true);
    
    // Mock re-forecast API Call
    setTimeout(() => {
      const mockData: ForecastPoint[] = Array.from({ length: 24 }).map((_, i) => {
        let baseLoad = 150000 + Math.sin(i / 12 * Math.PI) * 30000;
        
        // Apply What-If parameters
        // 1. Temperature: higher temp -> higher cooling load
        baseLoad += params.temperatureOffset * 2500;
        
        // 2. Humidity: adds a smaller compounding factor
        baseLoad += params.humidityOffset * 500;
        
        // 3. Holiday: drop daytime industrial load (hours 8-18)
        if (params.industrialHoliday && i >= 8 && i <= 18) {
          baseLoad -= 15000;
        }
        
        // 4. EV Surge: spike evening load (hours 17-22)
        if (params.evChargingSurge && i >= 17 && i <= 22) {
          baseLoad += 12000;
        }

        return {
          ts: new Date(Date.now() + i * 3600 * 1000).toISOString(),
          load_mw: Math.round(baseLoad),
          low: Math.round(baseLoad * 0.95),
          high: Math.round(baseLoad * 1.05),
        };
      });
      
      setData(mockData);
      setIsSimulating(false);
    }, 800);
  };

  // Run initial simulation
  useEffect(() => {
    runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">What-If Simulator</h2>
          <p className="text-muted-foreground">Test grid resilience against hypothetical scenarios</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">Scenario Parameters</CardTitle>
              <CardDescription>Adjust variables to trigger a live re-forecast</CardDescription>
            </CardHeader>
            <CardContent>
              <WhatIfSliders params={params} onChange={setParams} />
              
              <div className="mt-8 flex gap-3">
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700" 
                  onClick={runSimulation}
                  disabled={isSimulating}
                >
                  {isSimulating ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Run Simulation
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setParams(defaultParams);
                    // Defer re-simulating to let state update
                    setTimeout(() => runSimulation(), 0);
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
              <CardTitle>Simulated Load Forecast</CardTitle>
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
                        <span className="font-mono text-sm tracking-widest uppercase">Recalculating Model...</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chart"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
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
