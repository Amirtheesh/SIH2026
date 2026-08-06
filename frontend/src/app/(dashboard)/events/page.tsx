"use client";

import { useState } from "react";
import { Calendar, Search, ArrowRight, Zap, CloudLightning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const mockEvents = [
  { id: 1, name: "Diwali Festival", category: "Holiday", impact: "+12.4%", date: "Oct 31, 2025", confidence: "High" },
  { id: 2, name: "Cricket World Cup Final", category: "Sports", impact: "+8.2%", date: "Nov 15, 2025", confidence: "High" },
  { id: 3, name: "General Elections Phase 1", category: "Civic", impact: "-4.1%", date: "Apr 19, 2026", confidence: "Medium" },
  { id: 4, name: "Severe Heatwave (Projected)", category: "Weather", impact: "+18.5%", date: "May 10, 2026", confidence: "Medium" },
];

const historicalImpactData = [
  { name: 'Diwali 2023', shift_mw: 15400, type: 'surge' },
  { name: 'Diwali 2024', shift_mw: 16200, type: 'surge' },
  { name: 'CWC Final 23', shift_mw: 11000, type: 'surge' },
  { name: 'Monsoon Low', shift_mw: -8500, type: 'drop' },
  { name: 'Heatwave May24', shift_mw: 22000, type: 'surge' },
];

export default function EventsImpactPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Events & Historical Impact</h2>
          <p className="text-muted-foreground">Analyze how major public events and holidays shift grid demand</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Events List */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle>Upcoming Major Events</CardTitle>
              <CardDescription>Predicted impact based on historical analogs</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search events..."
                  className="pl-8 bg-background/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockEvents
                .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((event) => (
                <div key={event.id} className="flex flex-col p-4 rounded-lg border border-border/50 bg-background/30 hover:bg-background/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{event.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <Calendar className="h-3 w-3 mr-1" /> {event.date}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                      {event.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Expected Shift:</span>
                      <span className={`text-sm font-bold ${event.impact.startsWith('+') ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {event.impact}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Historical Impact Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Historical Trend Analogues</CardTitle>
                <CardDescription>Actual MW shifts recorded during past similar events</CardDescription>
              </div>
              <CloudLightning className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalImpactData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="shift_mw" radius={[4, 4, 0, 0]}>
                      {historicalImpactData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.shift_mw > 0 ? '#ef4444' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-4">
                  <div className="p-2 bg-rose-500/20 rounded-full">
                    <Zap className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Holiday Surge</p>
                    <p className="text-lg font-bold text-rose-500">+14,200 MW</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                  <div className="p-2 bg-emerald-500/20 rounded-full">
                    <Zap className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Civic Drop</p>
                    <p className="text-lg font-bold text-emerald-500">-6,500 MW</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
