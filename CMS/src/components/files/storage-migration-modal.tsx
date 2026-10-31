"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import {
  HardDrive,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export function StorageMigrationModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Poll migration status
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["super-storage-migration-status"],
    queryFn: async () => {
      const res = await api.get("/api/v1/super/storage/migrate-local/status");
      return res.data?.telemetry;
    },
    refetchInterval: (query) => (query.state.data?.isRunning ? 2000 : false),
    enabled: open,
  });

  // Start migration mutation
  const migrationMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/super/storage/migrate-local", {
        batchSize: 50,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Storage migration job started.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to start migration.");
    },
  });

  const isRunning = data?.isRunning;
  const totalFiles = data?.totalFiles || 0;
  const processed = data?.processedCount || 0;
  const migrated = data?.migratedCount || 0;
  const failed = data?.failedCount || 0;
  const progressPercent = totalFiles > 0 ? Math.round((processed / totalFiles) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CloudUpload className="w-4 h-4 text-primary" />
          <span>Object Storage Migration</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <HardDrive className="w-5 h-5 text-primary" />
            Local-to-Object Storage Migration Engine
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Transfers legacy local disk files into configured object storage (Supabase Storage), verifies SHA-256 integrity, and updates database records with zero downtime.
          </p>

          {/* Progress Card */}
          <div className="p-4 rounded-lg border bg-card/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Migration Progress</span>
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 text-[11px] gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> In Progress
                  </Badge>
                ) : processed > 0 && processed === totalFiles ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[11px] gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px]">Ready</Badge>
                )}
              </div>
            </div>

            <Progress value={progressPercent} className="h-2" />

            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="p-2 rounded bg-muted/30">
                <p className="text-base font-bold">{totalFiles}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total Local</p>
              </div>
              <div className="p-2 rounded bg-emerald-500/10 text-emerald-500">
                <p className="text-base font-bold">{migrated}</p>
                <p className="text-[10px] uppercase">Migrated</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-base font-bold">{data?.skippedCount || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Skipped</p>
              </div>
              <div className="p-2 rounded bg-destructive/10 text-destructive">
                <p className="text-base font-bold">{failed}</p>
                <p className="text-[10px] uppercase">Failed</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>SHA-256 verification active: files are validated before disk deletion.</span>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isRunning || migrationMutation.isPending}
            onClick={() => migrationMutation.mutate()}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4 mr-2" />
                Start Migration Batch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

