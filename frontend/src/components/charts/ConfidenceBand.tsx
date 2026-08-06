"use client";

import { useMemo } from 'react';
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

export interface ConfidencePoint {
  time: string;
  expected: number;
  p95_high: number;
  p95_low: number;
  p50_high: number;
  p50_low: number;
}

interface ConfidenceBandProps {
  data: ConfidencePoint[];
}

export function ConfidenceBand({ data }: ConfidenceBandProps) {
  if (!data || data.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>;
  }

  return (
    <div className="h-[400px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="p95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="p50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend />
          
          <Area type="monotone" name="95% Confidence Interval" dataKey="p95_high" stroke="none" fill="url(#p95)" fillOpacity={1} />
          <Area type="monotone" dataKey="p95_low" stroke="none" fill="#0f172a" fillOpacity={1} />
          
          <Area type="monotone" name="50% Confidence Interval" dataKey="p50_high" stroke="none" fill="url(#p50)" fillOpacity={1} />
          <Area type="monotone" dataKey="p50_low" stroke="none" fill="#0f172a" fillOpacity={1} />
          
          <Line 
            type="monotone" 
            name="Expected Demand (MW)"
            dataKey="expected" 
            stroke="#f8fafc" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
