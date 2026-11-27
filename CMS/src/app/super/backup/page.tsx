'use client';

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Database,
  Download,
  RefreshCw,
  Loader2,
  Trash2,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Clock,
  Table2,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";

export type BackupSnapshot = {
  id: string;
  name: string;
  size: string;
  bytes?: number;
  date: string;
  type: string;
  sha256?: string;
};

export type BackupVerificationReport = {
  success: boolean;
  filename: string;
  checksumSha256: string;
  uncompressedSizeBytes: number;
  statementCount: number;
  tablesDetected: string[];
  disposableSchemaTested: string;
  disposableRestorePassed: boolean;
  durationMs: number;
  message: string;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function BackupRestoreAdmin() {
  const qc = useQueryClient();
  const [downloadingName, setDownloadingName] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<BackupSnapshot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupSnapshot | null>(null);
  const [verificationReport, setVerificationReport] = useState<BackupVerificationReport | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  const {
    data: snapshots = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<BackupSnapshot[]>({
    queryKey: ["super-database-snapshots"],
    queryFn: async () => {
      const res = await api.get("/super/backup/snapshots");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
  });

  const generateBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/super/backup/generate");
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Database backup generated successfully.");
      qc.invalidateQueries({ queryKey: ["super-database-snapshots"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to generate database backup.");
    },
  });

  const verifyRestoreMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await api.post(`/super/backup/verify-restore/${encodeURIComponent(filename)}`);
      const unwrapped = res?.data || res || {};
      return (unwrapped.result || unwrapped) as BackupVerificationReport;
    },
    onSuccess: (report) => {
      setVerifyTarget(null);
      setVerificationReport(report);
      if (report.disposableRestorePassed) {
        toast.success(report.message || `Backup "${report.filename}" verified successfully.`);
      } else {
        toast.warning(report.message || `Verification completed with warnings for "${report.filename}".`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Backup restore verification failed.");
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await api.delete(`/super/backup/${encodeURIComponent(filename)}`);
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Backup archive deleted successfully.");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["super-database-snapshots"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete backup archive.");
    },
  });

  async function handleDownload(filename: string) {
    try {
      setDownloadingName(filename);
      await api.download(`/api/super/backup/download/${encodeURIComponent(filename)}`, filename);
      toast.success(`Download started for ${filename}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download backup file.");
    } finally {
      setDownloadingName(null);
    }
  }

  function handleCopyChecksum(checksum: string) {
    if (!checksum) return;
    navigator.clipboard.writeText(checksum).then(() => {
      setCopiedChecksum(true);
      toast.success("SHA-256 checksum copied to clipboard.");
      setTimeout(() => setCopiedChecksum(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy checksum.");
    });
  }

  const totalVolumeBytes = useMemo(
    () => snapshots.reduce((sum, s) => sum + (Number(s.bytes) || 0), 0),
    [snapshots],
  );
  const latestSnapshot = snapshots[0] || null;

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Database Backup & Recovery"
        description="Generate full SQL database archives, download encrypted dumps, and run non-destructive disposable-schema restore verifications."
        icon={Database}
        badge={
          <Badge variant="soft" className="gap-1.5">
            <HardDrive className="size-3" />
            {snapshots.length} {snapshots.length === 1 ? "Snapshot" : "Snapshots"}
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => generateBackupMutation.mutate()}
              disabled={generateBackupMutation.isPending}
            >
              {generateBackupMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Database className="size-3.5" />
              )}
              {generateBackupMutation.isPending ? "Generating..." : "Export Backup Now"}
            </Button>
          </>
        }
      />

      <Alert variant="ghost-success" icon={<ShieldCheck className="size-4" />}>
        <span className="text-xs leading-relaxed">
          <strong>Secure Isolated Storage:</strong> All database backups are generated in protected non-public filesystem storage and streamed strictly through Super Admin authentication. Restore verification runs inside an isolated disposable schema and never mutates live production tables.
        </span>
      </Alert>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Stored Snapshots"
          value={snapshots.length}
          description="Available SQL / GZIP recovery archives"
          icon={HardDrive}
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          label="Total Archive Volume"
          value={formatBytes(totalVolumeBytes)}
          description="Combined disk footprint in backup vault"
          icon={Database}
          variant="info"
          isLoading={isLoading}
        />
        <StatCard
          label="Latest Snapshot"
          value={latestSnapshot ? latestSnapshot.size : "None"}
          description={latestSnapshot ? latestSnapshot.date : "No backup generated yet"}
          icon={Clock}
          variant={latestSnapshot ? "success" : "warning"}
          isLoading={isLoading}
        />
      </div>

      {/* Snapshots Table */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/80">
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pl-4">
                  Snapshot Archive Name
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Type
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  File Size
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Created Timestamp
                </th>
                <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pr-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary mx-auto mb-2" />
                    <p>Inspecting database backup snapshots...</p>
                  </td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-14 text-center text-muted-foreground">
                    <Database className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="font-medium text-foreground">No database snapshots found</p>
                    <p className="mt-1">
                      Click &ldquo;Export Backup Now&rdquo; to generate a complete SQL recovery archive.
                    </p>
                  </td>
                </tr>
              ) : (
                snapshots.map((s) => {
                  const isDownloading = downloadingName === s.name;
                  return (
                    <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 pl-4 font-mono font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <HardDrive className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-md" title={s.name}>
                            {s.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {s.type || "Database Snapshot"}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-medium text-foreground">{s.size}</td>
                      <td className="p-3 text-muted-foreground">{s.date}</td>
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleDownload(s.name)}
                            disabled={isDownloading}
                            title="Download Backup Archive"
                          >
                            {isDownloading ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Download className="size-3" />
                            )}
                            Download
                          </Button>
                          <Button
                            size="xs"
                            variant="soft"
                            onClick={() => setVerifyTarget(s)}
                            disabled={verifyRestoreMutation.isPending}
                            title="Verify Checksum & Disposable Restore"
                          >
                            <FileCheck2 className="size-3" />
                            Verify Restore
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={deleteBackupMutation.isPending}
                            onClick={() => setDeleteTarget(s)}
                            className="px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                            title="Delete Backup File"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirm Verify Restore Dialog */}
      <ConfirmationDialog
        open={Boolean(verifyTarget)}
        onOpenChange={(open) => {
          if (!open && !verifyRestoreMutation.isPending) setVerifyTarget(null);
        }}
        title="Verify Backup Integrity & Disposable Restore"
        description={
          verifyTarget ? (
            <>
              Run SHA-256 integrity verification, SQL statement parsing, and a non-destructive disposable-schema restore check on{" "}
              <span className="font-mono font-semibold text-foreground">{verifyTarget.name}</span> ({verifyTarget.size})?
            </>
          ) : undefined
        }
        confirmLabel={verifyRestoreMutation.isPending ? "Verifying..." : "Run Verification"}
        variant="default"
        icon={<FileCheck2 className="size-5" />}
        isLoading={verifyRestoreMutation.isPending}
        onConfirm={() => {
          if (verifyTarget) {
            verifyRestoreMutation.mutate(verifyTarget.name);
          }
        }}
      >
        <p className="text-muted-foreground">
          This executes in an isolated temporary schema that is automatically dropped after verification. Live production data will not be modified.
        </p>
      </ConfirmationDialog>

      {/* Confirm Delete Snapshot Dialog */}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteBackupMutation.isPending) setDeleteTarget(null);
        }}
        title="Delete Backup Archive?"
        description={
          deleteTarget ? (
            <>
              Permanently remove <span className="font-mono font-semibold text-foreground">{deleteTarget.name}</span> from backup storage? This action cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete Permanently"
        variant="destructive"
        isLoading={deleteBackupMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteBackupMutation.mutate(deleteTarget.name);
          }
        }}
      />

      {/* Restore Verification Report Dialog */}
      <Dialog
        open={Boolean(verificationReport)}
        onOpenChange={(open) => {
          if (!open) setVerificationReport(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {verificationReport?.disposableRestorePassed ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="size-5 text-amber-600" />
              )}
              Restore Verification Report
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              {verificationReport?.filename}
            </DialogDescription>
          </DialogHeader>

          {verificationReport && (
            <div className="space-y-4 text-xs">
              <Alert
                variant={verificationReport.disposableRestorePassed ? "ghost-success" : "ghost-warning"}
                icon={
                  verificationReport.disposableRestorePassed ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )
                }
              >
                <div className="space-y-0.5">
                  <div className="font-semibold">
                    {verificationReport.disposableRestorePassed
                      ? "Integrity & Disposable Restore Passed"
                      : "Verification Completed with Issues"}
                  </div>
                  <p className="text-xs opacity-90">{verificationReport.message}</p>
                </div>
              </Alert>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border/80 bg-muted/30">
                  <div className="text-[11px] text-muted-foreground">Duration</div>
                  <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                    {verificationReport.durationMs.toLocaleString()} ms
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-muted/30">
                  <div className="text-[11px] text-muted-foreground">Uncompressed Size</div>
                  <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                    {formatBytes(verificationReport.uncompressedSizeBytes)}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-muted/30">
                  <div className="text-[11px] text-muted-foreground">SQL Statements</div>
                  <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                    {verificationReport.statementCount.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-muted/30">
                  <div className="text-[11px] text-muted-foreground">Tables Detected</div>
                  <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                    {verificationReport.tablesDetected?.length ?? 0}
                  </div>
                </div>
              </div>

              {/* SHA-256 Checksum */}
              <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    SHA-256 Archive Checksum
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => handleCopyChecksum(verificationReport.checksumSha256)}
                  >
                    {copiedChecksum ? (
                      <>
                        <Check className="size-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" /> Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="font-mono text-[11px] break-all text-foreground bg-background p-2 rounded border border-border/60">
                  {verificationReport.checksumSha256}
                </p>
              </div>

              {/* Disposable Schema Tested */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/20">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Disposable Schema Tested</span>
                  <span className="font-mono font-semibold text-foreground">
                    {verificationReport.disposableSchemaTested || "N/A"}
                  </span>
                </div>
                <Badge variant={verificationReport.disposableRestorePassed ? "success" : "destructive"}>
                  {verificationReport.disposableRestorePassed ? "PASSED" : "FAILED"}
                </Badge>
              </div>

              {/* Detected Tables */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Table2 className="size-3.5" />
                  Tables Detected ({verificationReport.tablesDetected?.length ?? 0})
                </div>
                {verificationReport.tablesDetected && verificationReport.tablesDetected.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-3 rounded-lg border border-border/80 bg-muted/20">
                    {verificationReport.tablesDetected.map((tbl) => (
                      <Badge key={tbl} variant="outline" className="font-mono text-[10px]">
                        {tbl}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No CREATE TABLE / INSERT table targets detected.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setVerificationReport(null)}>
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BackupRestoreAdmin;
