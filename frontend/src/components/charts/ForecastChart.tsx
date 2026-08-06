"use client";

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import { ForecastPoint } from '@/hooks/useForecast';

interface ForecastChartProps {
  data: ForecastPoint[];
}

export function ForecastChart({ data }: ForecastChartProps) {
  const formattedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      time: new Date(d.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="h-[400px] flex items-center justify-center text-muted-foreground">No data available</div>;
  }

  return (
    <div className="h-[400px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
          <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend />
          <Area type="monotone" dataKey="high" stroke="none" fill="url(#colorBand)" fillOpacity={1} />
          <Area type="monotone" dataKey="low" stroke="none" fill="#0f172a" fillOpacity={1} />
          
          <Line 
            type="monotone" 
            name="Forecasted Load (MW)"
            dataKey="load_mw" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 8, fill: "#3b82f6", stroke: "#0f172a", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
