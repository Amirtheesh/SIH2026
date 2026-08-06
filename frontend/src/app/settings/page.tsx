"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Moon, Sun, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your preferences and notifications</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Region & Display</CardTitle>
            <CardDescription>Configure your default dashboard view</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Region</Label>
              <select className="flex h-10 w-full md:w-[300px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="national">National Grid</option>
                <option value="northern">Northern Grid</option>
                <option value="southern">Southern Grid</option>
                <option value="western">Western Grid</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold flex items-center gap-2">Theme</Label>
                <p className="text-xs text-muted-foreground">Toggle between light and dark mode</p>
              </div>
              <div className="flex items-center gap-2 bg-background border border-border p-1 rounded-full">
                <Button 
                  variant={theme === 'light' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="rounded-full h-8"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-4 w-4 mr-2" /> Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="rounded-full h-8"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-4 w-4 mr-2" /> Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
            <CardDescription>Choose how you want to be alerted of grid events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Email Alerts</Label>
                <p className="text-xs text-muted-foreground">Receive daily summaries and critical alerts</p>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">SMS Alerts</Label>
                <p className="text-xs text-muted-foreground">Immediate texts for CRITICAL level events only</p>
              </div>
              <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
