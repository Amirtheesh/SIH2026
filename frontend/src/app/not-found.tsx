import Link from "next/link";
import { SearchX, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-6">
        <SearchX className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-4xl font-extrabold tracking-tight mb-3">404 - Node Offline</h2>
      <p className="text-muted-foreground max-w-md mb-8 text-lg">
        The dashboard view or data stream you are looking for does not exist in this grid sector.
      </p>
      <Link href="/dashboard">
        <Button size="lg" className="flex items-center gap-2">
          Return to Central Dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
