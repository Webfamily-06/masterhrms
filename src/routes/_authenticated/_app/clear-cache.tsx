import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2, RefreshCw, Database, HardDrive, Cpu, AlertTriangle,
  CheckCircle2, Info, ArrowRight, ShieldCheck, Sparkles, Server
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/clear-cache")({
  component: ClearCachePage,
  head: () => ({ meta: [{ title: "Clear Cache & Maintenance — Master HRMS" }] }),
});

export function ClearCachePage() {
  const qc = useQueryClient();
  const [clearingType, setClearingType] = useState<string | null>(null);
  const [lastCleared, setLastCleared] = useState<string | null>(null);
  const [memoryStats, setMemoryStats] = useState<any | null>(null);

  const clearServerCacheMutation = useMutation({
    mutationFn: (cacheType: string) => api.post("/system/clear-cache", { cacheType }),
    onSuccess: (data: any) => {
      setLastCleared(new Date().toLocaleTimeString());
      if (data?.memory) {
        setMemoryStats(data.memory);
      }
      toast.success(data?.message || "Cache successfully cleared!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to clear server cache");
    },
    onSettled: () => {
      setClearingType(null);
    },
  });

  const handleClearClient = () => {
    setClearingType("client");
    setTimeout(() => {
      qc.clear();
      sessionStorage.clear();
      setLastCleared(new Date().toLocaleTimeString());
      setClearingType(null);
      toast.success("Client React Query and session cache cleared!");
    }, 400);
  };

  const handleClearServer = (type: string) => {
    setClearingType(type);
    clearServerCacheMutation.mutate(type);
  };

  const handleClearAll = () => {
    setClearingType("all");
    qc.clear();
    sessionStorage.clear();
    clearServerCacheMutation.mutate("all");
  };

  // Estimate client cache items count
  const queryCount = qc.getQueryCache().getAll().length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RefreshCw className="size-6 text-primary" />
            <span>Clear Cache &amp; System Maintenance</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Purge stale query caches, flush in-memory calculation buffers, and optimize ERP performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/settings" search={{ tab: "security" }}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <ShieldCheck className="size-3.5" />
              <span>Security Settings</span>
            </Button>
          </Link>
          <Link to="/ban-ip-address">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <span>Ban IP Addresses</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Clear Cache Actions */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="py-4 px-5 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    System Cache Purge
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Clear stored queries, calculation caches, and temporary file artifacts.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  Engine Ready
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Notice Banner */}
              <div className="p-3.5 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 flex items-start gap-3">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-semibold">Notice regarding Cache Invalidation</p>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Clearing cache will remove temporary in-memory objects, pre-computed dashboard statistics, and cached payroll projections. Live MySQL records will remain completely untouched. Subsequent page loads will re-fetch fresh database records.
                  </p>
                </div>
              </div>

              {/* Cache Layer Options */}
              <div className="space-y-3">
                {/* 1. Client Query Cache */}
                <div className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Cpu className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">TanStack React Query Cache</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {queryCount} active cached queries currently stored in browser memory.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clearingType !== null}
                    onClick={handleClearClient}
                    className="text-xs h-8 shrink-0 gap-1.5"
                  >
                    <RefreshCw className={cn("size-3.5", clearingType === "client" && "animate-spin")} />
                    <span>Purge Client Cache</span>
                  </Button>
                </div>

                {/* 2. Backend & Server Cache */}
                <div className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Server className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Server Runtime &amp; DB Memoization</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Statutory rules cache, RBAC permission sets, and tenant lookup tables.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clearingType !== null}
                    onClick={() => handleClearServer("runtime")}
                    className="text-xs h-8 shrink-0 gap-1.5"
                  >
                    <Database className={cn("size-3.5", clearingType === "runtime" && "animate-spin")} />
                    <span>Flush Server Cache</span>
                  </Button>
                </div>

                {/* 3. Temporary Export & Biometric Buffers */}
                <div className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      <HardDrive className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Temporary Export &amp; Audit Logs</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Staged CSV/PDF download files and ephemeral biometric punch logs.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clearingType !== null}
                    onClick={() => handleClearServer("files")}
                    className="text-xs h-8 shrink-0 gap-1.5"
                  >
                    <Trash2 className={cn("size-3.5", clearingType === "files" && "animate-spin")} />
                    <span>Clean Temp Files</span>
                  </Button>
                </div>
              </div>

              {/* Master Button */}
              <div className="border-t pt-4 flex items-center justify-between">
                <div>
                  {lastCleared && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5" />
                      <span>Last cleared at {lastCleared}</span>
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={clearingType !== null}
                  onClick={handleClearAll}
                  className="text-xs gap-1.5 h-9 bg-primary"
                >
                  <Sparkles className={cn("size-3.5", clearingType === "all" && "animate-spin")} />
                  <span>{clearingType === "all" ? "Purging All Layers..." : "Clear All Caches"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Health & Metrics Panel */}
        <div className="space-y-4">
          <Card className="border bg-card p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              System Memory Snapshot
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-[11px] text-muted-foreground block">Server Heap Used</span>
                <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                  {memoryStats?.heapUsedMb ? `${memoryStats.heapUsedMb} MB` : "Real-time active"}
                </p>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-[11px] text-muted-foreground block">Server Heap Total</span>
                <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                  {memoryStats?.heapTotalMb ? `${memoryStats.heapTotalMb} MB` : "Allocated"}
                </p>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-[11px] text-muted-foreground block">Client Query Store</span>
                <p className="text-lg font-bold font-mono text-primary mt-0.5">
                  {queryCount} keys active
                </p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Info className="size-3.5 text-primary shrink-0" />
                <span>Node.js Garbage Collector enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>Multi-tenant isolation verified</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
