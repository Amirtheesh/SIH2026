"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, LineChart, Map, CloudRain, Bell, Sliders, Calendar, Settings, ShieldAlert, LogOut } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Forecasts', href: '/forecast', icon: LineChart },
  { name: 'Peak Analytics', href: '/peak-analytics', icon: Activity },
  { name: 'Weather', href: '/weather', icon: CloudRain },
  { name: 'Heat Map', href: '/heatmap', icon: Map },
  { name: 'What-If Simulator', href: '/what-if', icon: Sliders },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Events Impact', href: '/events', icon: Calendar },
  { name: 'Admin', href: '/admin', icon: ShieldAlert },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useAppStore((state) => state.logout);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card/30 backdrop-blur-md hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold tracking-tight text-lg">GridForecaster</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button 
            onClick={() => {
              logout();
              window.location.href = '/landing';
            }}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-background/50">
        <header className="h-14 border-b border-border flex items-center px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10 md:hidden">
          <span className="font-bold tracking-tight">GridForecaster</span>
        </header>
        <main className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
