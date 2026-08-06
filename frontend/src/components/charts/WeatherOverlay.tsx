"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export interface WeatherDemandPoint {
  time: string;
  demand_mw: number;
  temperature: number;
  humidity: number;
}

interface WeatherOverlayProps {
  data: WeatherDemandPoint[];
  activeMetric: 'temperature' | 'humidity';
}

export function WeatherOverlay({ data, activeMetric }: WeatherOverlayProps) {
  if (!data || data.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>;
  }

  const metricColor = activeMetric === 'temperature' ? '#ef4444' : '#0ea5e9';
  const metricName = activeMetric === 'temperature' ? 'Temperature (°C)' : 'Humidity (%)';

  return (
    <div className="h-[400px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          
          <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          
          {/* Left Y-Axis for Demand */}
          <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
          
          {/* Right Y-Axis for Weather Metric */}
          <YAxis yAxisId="right" orientation="right" stroke={metricColor} fontSize={12} tickLine={false} axisLine={false} />
          
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend />
          
          <Area 
            yAxisId="left"
            type="monotone" 
            name="Power Demand (MW)"
            dataKey="demand_mw" 
            stroke="#3b82f6" 
            fill="url(#colorDemand)" 
            fillOpacity={1} 
            strokeWidth={2}
          />
          
          <Line 
            yAxisId="right"
            type="monotone" 
            name={metricName}
            dataKey={activeMetric} 
            stroke={metricColor} 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
