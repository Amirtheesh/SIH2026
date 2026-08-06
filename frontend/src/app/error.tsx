"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="rounded-full bg-rose-500/10 p-4 mb-6 border border-rose-500/20">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
      </div>
      <h2 className="text-3xl font-bold tracking-tight mb-2">System Fault Detected</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        We encountered an unexpected error processing grid data. Our engineering team has been notified.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
