"use client";

import { AlertTriangle, Info, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface Alert {
  id: string;
  type: "CRITICAL" | "WARNING" | "INFO";
  region: string;
  message: string;
  triggered_at: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
}

interface AlertCardProps {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge, onResolve }: AlertCardProps) {
  const isCritical = alert.type === "CRITICAL";
  const isWarning = alert.type === "WARNING";
  const isResolved = alert.status === "RESOLVED";

  const getIcon = () => {
    if (isResolved) return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (isCritical) return <XCircle className="h-5 w-5 text-rose-500" />;
    if (isWarning) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  const getBorderColor = () => {
    if (isResolved) return "border-emerald-500/20";
    if (isCritical) return "border-rose-500/50";
    if (isWarning) return "border-amber-500/50";
    return "border-blue-500/30";
  };

  const getBgColor = () => {
    if (isResolved) return "bg-emerald-500/5";
    if (isCritical) return "bg-rose-500/10";
    if (isWarning) return "bg-amber-500/10";
    return "bg-blue-500/5";
  };

  return (
    <Card className={`overflow-hidden transition-colors ${getBorderColor()} ${getBgColor()} backdrop-blur-sm`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="mt-1">{getIcon()}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm uppercase tracking-wider">{alert.type}</span>
                <span className="text-muted-foreground text-sm flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(alert.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 border border-border/50">
                  {alert.region}
                </span>
              </div>
              <p className="text-sm font-medium">{alert.message}</p>
            </div>
          </div>
          
          {!isResolved && (
            <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
              {alert.status === "ACTIVE" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full sm:w-auto"
                  onClick={() => onAcknowledge(alert.id)}
                >
                  Acknowledge
                </Button>
              )}
              <Button 
                variant="default" 
                size="sm" 
                className={`w-full sm:w-auto ${isCritical ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}`}
                onClick={() => onResolve(alert.id)}
              >
                Resolve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
