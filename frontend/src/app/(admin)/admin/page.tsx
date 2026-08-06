"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Activity, CheckCircle, Database, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export default function AdminDashboardPage() {
  const user = useAppStore(state => state.user);
  const [isRetraining, setIsRetraining] = useState(false);
  const [lastTrained, setLastTrained] = useState("Today, 04:00 AM");

  const handleRetrain = () => {
    setIsRetraining(true);
    // Mock API POST /api/v1/admin/retrain
    setTimeout(() => {
      setIsRetraining(false);
      setLastTrained("Just now");
    }, 2000);
  };

  if (user?.role !== "Admin") {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You need Administrator privileges to view this page.</p>
        <Link href="/dashboard"><Button>Return to Dashboard</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Console</h2>
          <p className="text-muted-foreground">Manage forecasting models and system health</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Model Metrics */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Model Performance Metrics</CardTitle>
              <CardDescription>Live evaluation on holdout test set</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/50 border border-border/50 text-center">
                  <div className="text-sm font-medium text-muted-foreground mb-1">MAE</div>
                  <div className="text-2xl font-bold text-blue-400">1.24%</div>
                  <div className="text-xs text-emerald-500 mt-1">Acceptable</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-border/50 text-center">
                  <div className="text-sm font-medium text-muted-foreground mb-1">RMSE</div>
                  <div className="text-2xl font-bold text-amber-400">2.18%</div>
                  <div className="text-xs text-emerald-500 mt-1">Acceptable</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-border/50 text-center">
                  <div className="text-sm font-medium text-muted-foreground mb-1">MAPE</div>
                  <div className="text-2xl font-bold text-emerald-400">0.95%</div>
                  <div className="text-xs text-emerald-500 mt-1">Excellent</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Data Ingestion Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded bg-background/50 border border-border/50">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium">SCADA Grid Telemetry</span>
                </div>
                <span className="text-sm text-emerald-500 flex items-center"><CheckCircle className="h-4 w-4 mr-1"/> Syncing Live</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-background/50 border border-border/50">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium">Meteorological Data API</span>
                </div>
                <span className="text-sm text-emerald-500 flex items-center"><CheckCircle className="h-4 w-4 mr-1"/> Synced 5m ago</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-rose-500/20">
            <CardHeader>
              <CardTitle className="text-rose-500 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Model Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2"><strong>Model Version:</strong> v2.4.1 (XGBoost Ensemble)</p>
                <p><strong>Last Trained:</strong> {lastTrained}</p>
              </div>
              
              <Button 
                className="w-full bg-rose-600 hover:bg-rose-700 text-white" 
                onClick={handleRetrain}
                disabled={isRetraining}
              >
                {isRetraining ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Triggering Retrain Job...
                  </>
                ) : (
                  "Force Retrain Model"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This will trigger a heavy GPU job on the cluster. Use only if drift is detected.
              </p>
            </CardContent>
          </Card>
          
          <Link href="/api-management" className="block">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="font-medium">API Management</div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
