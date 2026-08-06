"use client";

import { useState, useMemo } from "react";
import { Filter, BellRing } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { AlertCard } from "@/components/alerts/AlertCard";
import { Button } from "@/components/ui/button";

export default function AlertsPage() {
  const { alerts, acknowledgeAlert, resolveAlert } = useAlerts();
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "CRITICAL">("ALL");

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (filter === "ACTIVE") return alert.status === "ACTIVE";
      if (filter === "CRITICAL") return alert.type === "CRITICAL";
      return true;
    });
  }, [alerts, filter]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          System Alerts
          <div className="relative flex h-3 w-3 ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </div>
        </h2>
        
        <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm p-1 rounded-lg border border-border/50">
          <Button 
            variant={filter === "ALL" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setFilter("ALL")}
          >
            All
          </Button>
          <Button 
            variant={filter === "ACTIVE" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setFilter("ACTIVE")}
          >
            Active Only
          </Button>
          <Button 
            variant={filter === "CRITICAL" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setFilter("CRITICAL")}
            className={filter === "CRITICAL" ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 hover:text-rose-400" : "text-rose-500 hover:text-rose-400"}
          >
            Critical
          </Button>
          <div className="h-4 w-px bg-border mx-2 hidden sm:block" />
          <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      <div className="grid gap-4 max-w-4xl">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl bg-card/30">
            <BellRing className="h-10 w-10 mb-4 opacity-20" />
            <p>No alerts matching current filters.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <AlertCard 
              key={alert.id} 
              alert={alert} 
              onAcknowledge={acknowledgeAlert}
              onResolve={resolveAlert}
            />
          ))
        )}
      </div>
    </div>
  );
}
