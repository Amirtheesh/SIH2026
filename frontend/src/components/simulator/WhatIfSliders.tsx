"use client";

import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface SimulatorParams {
  temperatureOffset: number;
  humidityOffset: number;
  industrialHoliday: boolean;
  evChargingSurge: boolean;
}

interface WhatIfSlidersProps {
  params: SimulatorParams;
  onChange: (params: SimulatorParams) => void;
}

export function WhatIfSliders({ params, onChange }: WhatIfSlidersProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Temperature Anomaly (°C)</Label>
          <span className="text-sm font-mono text-muted-foreground">
            {params.temperatureOffset > 0 ? "+" : ""}{params.temperatureOffset}°C
          </span>
        </div>
        <Slider 
          value={params.temperatureOffset} 
          min={-10} 
          max={10} 
          step={0.5} 
          onValueChange={(val) => onChange({ ...params, temperatureOffset: Array.isArray(val) ? val[0] : val })}
          className="py-4"
        />
        <p className="text-xs text-muted-foreground">Adjust base temperature to simulate heatwaves or cold snaps.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Humidity Anomaly (%)</Label>
          <span className="text-sm font-mono text-muted-foreground">
            {params.humidityOffset > 0 ? "+" : ""}{params.humidityOffset}%
          </span>
        </div>
        <Slider 
          value={params.humidityOffset} 
          min={-30} 
          max={30} 
          step={1} 
          onValueChange={(val) => onChange({ ...params, humidityOffset: Array.isArray(val) ? val[0] : val })}
          className="py-4"
        />
      </div>

      <div className="space-y-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Industrial Holiday</Label>
            <p className="text-xs text-muted-foreground">Simulate a sudden public holiday</p>
          </div>
          <Switch 
            checked={params.industrialHoliday}
            onCheckedChange={(checked) => onChange({ ...params, industrialHoliday: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">EV Charging Surge</Label>
            <p className="text-xs text-muted-foreground">Simulate evening EV grid stress</p>
          </div>
          <Switch 
            checked={params.evChargingSurge}
            onCheckedChange={(checked) => onChange({ ...params, evChargingSurge: checked })}
          />
        </div>
      </div>
    </div>
  );
}
