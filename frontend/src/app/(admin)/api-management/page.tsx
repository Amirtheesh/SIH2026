"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export default function ApiManagementPage() {
  const user = useAppStore(state => state.user);
  const [keys, setKeys] = useState([
    { id: "key-1", name: "Production App", keyString: "sk_live_...9f2a", created: "Oct 12, 2025", lastUsed: "2 mins ago" },
    { id: "key-2", name: "Analytics Pipeline", keyString: "sk_live_...4b8c", created: "Nov 01, 2025", lastUsed: "1 hour ago" },
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You need Administrator privileges to view this page.</p>
        <Link href="/dashboard"><Button>Return to Dashboard</Button></Link>
      </div>
    );
  }

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    setKeys(keys.filter(k => k.id !== id));
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">API Management</h2>
          <p className="text-muted-foreground">Manage access tokens for downstream consumers</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active API Keys</CardTitle>
            <CardDescription>Keys used to fetch forecast data programmatically</CardDescription>
          </div>
          <Button size="sm" className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Generate New Key
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50">
            {keys.map((key, i) => (
              <div key={key.id} className={`flex items-center justify-between p-4 ${i !== keys.length - 1 ? 'border-b border-border/50' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-secondary rounded-full">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{key.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-background px-2 py-0.5 rounded text-muted-foreground">
                        {key.keyString}
                      </code>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(key.id, key.keyString)}>
                        {copiedId === key.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="text-sm">{key.created}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground">Last Used</div>
                    <div className="text-sm">{key.lastUsed}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => handleDelete(key.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
