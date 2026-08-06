"use client";

import dynamic from "next/dynamic";
import { MapPin, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Leaflet requires the window object, so we must dynamically import it with ssr: false
const HeatMap = dynamic(() => import("@/components/map/HeatMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">Loading map...</div>
});

export default function HeatMapPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6 h-[calc(100vh-3.5rem)] md:h-screen flex flex-col">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Geographic Heat Map</h2>
          <p className="text-muted-foreground">District-level demand intensity visualization</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 shrink-0">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Intensity Region</CardTitle>
            <MapPin className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Gujarat Industrial</div>
            <p className="text-xs text-muted-foreground mt-1">95% capacity utilization</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fastest Growing</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Northern Grid</div>
            <p className="text-xs text-muted-foreground mt-1 text-emerald-400">+12% vs yesterday</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-amber-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grid Constraints</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">2 Corridors</div>
            <p className="text-xs text-muted-foreground mt-1">Transmission limits reached</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border/50 min-h-[400px] flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Live Demand Intensity Overlay</CardTitle>
          <CardDescription>Size and color indicate localized grid stress</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 pb-6 px-6">
          <HeatMap />
        </CardContent>
      </Card>
    </div>
  );
}
