"use client";

import { useState, useEffect } from "react";
import { CloudRain, Thermometer, Droplets, Wind, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WeatherOverlay, WeatherDemandPoint } from "@/components/charts/WeatherOverlay";

export default function WeatherAnalyticsPage() {
  const [data, setData] = useState<WeatherDemandPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'humidity'>('temperature');

  useEffect(() => {
    // Mock API Call
    setTimeout(() => {
      const mockData: WeatherDemandPoint[] = Array.from({ length: 24 }).map((_, i) => {
        // Temperature dips at night, peaks in afternoon
        const temp = 22 + Math.sin((i - 8) / 12 * Math.PI) * 8 + Math.random();
        // Humidity inversely related to temp roughly
        const hum = 80 - Math.sin((i - 8) / 12 * Math.PI) * 20 + Math.random() * 5;
        // Demand spikes when temp is very high (cooling) or very low (heating)
        const base = 130000;
        const coolingLoad = Math.max(0, temp - 25) * 4000;
        const heatingLoad = Math.max(0, 20 - temp) * 2000;
        const diurnalPattern = Math.sin(i / 12 * Math.PI) * 20000;
        
        return {
          time: new Date(new Date().setHours(i, 0, 0, 0)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          demand_mw: Math.round(base + coolingLoad + heatingLoad + diurnalPattern),
          temperature: Number(temp.toFixed(1)),
          humidity: Number(hum.toFixed(1)),
        };
      });
      setData(mockData);
      setIsLoading(false);
    }, 600);
  }, []);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Weather Correlation</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-colors bg-card/50 backdrop-blur-sm ${activeMetric === 'temperature' ? 'border-red-500/50 bg-red-500/5' : 'border-border/50 hover:bg-card/80'}`}
          onClick={() => setActiveMetric('temperature')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Temperature</CardTitle>
            <Thermometer className={`h-4 w-4 ${activeMetric === 'temperature' ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28.4°C</div>
            <p className="text-xs text-muted-foreground mt-1 text-red-400">High correlation with cooling load</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors bg-card/50 backdrop-blur-sm ${activeMetric === 'humidity' ? 'border-sky-500/50 bg-sky-500/5' : 'border-border/50 hover:bg-card/80'}`}
          onClick={() => setActiveMetric('humidity')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Humidity</CardTitle>
            <Droplets className={`h-4 w-4 ${activeMetric === 'humidity' ? 'text-sky-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">64%</div>
            <p className="text-xs text-muted-foreground mt-1">Moderate correlation</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rainfall (24h)</CardTitle>
            <CloudRain className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 mm</div>
            <p className="text-xs text-muted-foreground mt-1">Expected to suppress peak by 2%</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
            <Wind className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14 km/h</div>
            <p className="text-xs text-muted-foreground mt-1">Favorable for renewable generation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle>Demand vs {activeMetric === 'temperature' ? 'Temperature' : 'Humidity'} Overlay</CardTitle>
              <CardDescription>Dual-axis chart showing correlation over a 24-hour period</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading weather data...</div>
              ) : (
                <WeatherOverlay data={data} activeMetric={activeMetric} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-rose-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-500">
                <AlertCircle className="h-5 w-5" />
                Weather Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-rose-500/10 p-4 border border-rose-500/20">
                <h4 className="font-semibold text-rose-400 mb-1">Heatwave Warning</h4>
                <p className="text-sm text-muted-foreground">
                  Temperatures are expected to exceed 38°C tomorrow between 14:00 and 16:00. Model predicts an abnormal 8% surge in cooling loads in urban districts.
                </p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-4 border border-blue-500/20">
                <h4 className="font-semibold text-blue-400 mb-1">Monsoon Trough</h4>
                <p className="text-sm text-muted-foreground">
                  Heavy rainfall predicted in the northern sector may lead to localized outages, though overall grid demand will likely drop.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
