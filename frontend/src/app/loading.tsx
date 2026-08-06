import { Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center text-primary">
        <Activity className="h-12 w-12 animate-pulse mb-4" />
        <span className="font-mono text-sm tracking-widest uppercase animate-pulse">Syncing Telemetry...</span>
      </div>
    </div>
  );
}
