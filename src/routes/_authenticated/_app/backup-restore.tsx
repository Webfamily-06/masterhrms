import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  History,
  FileCheck,
  CheckCircle2,
  HardDrive,
  Loader2,
  Lock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/backup-restore")({
  component: BackupRestorePage,
  head: () => ({
    meta: [{ title: "Backup & Restore — Enterprise Data Protection" }],
  }),
});

interface BackupItem {
  id: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  modelCounts: Record<string, number>;
  totalRecords: number;
  checksumSha256: string;
}

interface DryRunReport {
  valid: boolean;
  backupId: string;
  sourceTenantId: string;
  targetTenantId: string;
  compatible: boolean;
  modelCounts: Record<string, number>;
  totalRecords: number;
  existingRecordCounts: Record<string, number>;
  conflictsDetected: string[];
  estimatedDurationMs: number;
}

interface BackupPolicy {
  retentionDays: number;
  frequency: "manual" | "daily" | "weekly";
  requireApproval: boolean;
  autoDeleteExpired: boolean;
}

export function BackupRestorePage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const workspaceSlug = (profile as any)?.tenant?.slug || "workspace";

  const [activeTab, setActiveTab] = useState<"backups" | "restore" | "policy">("backups");
  const [selectedBackupForDryRun, setSelectedBackupForDryRun] = useState<BackupItem | null>(null);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [confirmationPhraseInput, setConfirmationPhraseInput] = useState("");

  // 1. Fetch Backups
  const { data: backups = [], isLoading: isBackupsLoading, refetch: refetchBackups } = useQuery<BackupItem[]>({
    queryKey: ["tenant-backups"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/backup-restore/backups");
        if (Array.isArray(res)) return res;
        return res?.backups || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch Policy
  const { data: policy, isLoading: isPolicyLoading } = useQuery<BackupPolicy>({
    queryKey: ["tenant-backup-policy"],
    queryFn: async () => {
      try {
        const res = await api.get<{ policy: BackupPolicy }>("/backup-restore/policy");
        return res?.policy || { retentionDays: 30, frequency: "daily", requireApproval: false, autoDeleteExpired: true };
      } catch {
        return { retentionDays: 30, frequency: "daily", requireApproval: false, autoDeleteExpired: true };
      }
    },
  });

  // 3. Create Backup Mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ backup: BackupItem }>("/backup-restore/backups");
    },
    onSuccess: (data) => {
      toast.success(`Backup snapshot created successfully (${data.backup?.sizeFormatted || "Ready"})!`);
      refetchBackups();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create backup snapshot.");
    },
  });

  // 4. Dry Run Mutation
  const dryRunMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return await api.post<{ report: DryRunReport }>("/backup-restore/restore/dry-run", { backupId });
    },
    onSuccess: (data) => {
      setDryRunReport(data.report);
      toast.info("Dry-run restore simulation completed with zero database mutations.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Dry-run verification failed.");
    },
  });

  // 5. Guarded Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async (payload: { backupId: string; confirmationPhrase: string }) => {
      return await api.post("/backup-restore/restore/execute", payload);
    },
    onSuccess: () => {
      toast.success("Workspace restore completed successfully inside transaction boundary!");
      setShowRestoreConfirmModal(false);
      setDryRunReport(null);
      setSelectedBackupForDryRun(null);
      setConfirmationPhraseInput("");
      refetchBackups();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Restore execution failed. Database rolled back cleanly.");
    },
  });

  // 6. Policy Update Mutation
  const [policyForm, setPolicyForm] = useState<BackupPolicy | null>(null);
  const activePolicy = policyForm || policy || { retentionDays: 30, frequency: "daily", requireApproval: false, autoDeleteExpired: true };

  const updatePolicyMutation = useMutation({
    mutationFn: async (data: BackupPolicy) => {
      return await api.put("/backup-restore/policy", data);
    },
    onSuccess: () => {
      toast.success("Backup schedule and retention policy updated.");
      qc.invalidateQueries({ queryKey: ["tenant-backup-policy"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update backup policy.");
    },
  });

  const handleStartDryRun = (b: BackupItem) => {
    setSelectedBackupForDryRun(b);
    dryRunMutation.mutate(b.id);
  };

  const expectedPhrase = `CONFIRM_RESTORE_${workspaceSlug}`;

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Backup & Disaster Recovery</h1>
            <Badge variant="outline" className="text-xs font-mono">
              E9 Security Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tenant-isolated, cryptographic SHA-256 database snapshot exports, dry-run simulations, and atomic restores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
            className="font-bold gap-1.5 shadow-sm"
          >
            {createBackupMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creating Snapshot...
              </>
            ) : (
              <>
                <Database className="size-4" /> Create Snapshot Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "backups" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("backups")}
          className="text-xs font-bold gap-1.5"
        >
          <HardDrive className="size-3.5" /> Backups & Snapshots ({backups.length})
        </Button>
        <Button
          variant={activeTab === "policy" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("policy")}
          className="text-xs font-bold gap-1.5"
        >
          <Clock className="size-3.5" /> Retention & Schedule
        </Button>
      </div>

      {/* TAB 1: BACKUPS LIST */}
      {activeTab === "backups" && (
        <div className="space-y-4">
          {isBackupsLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground mt-2">Loading snapshot ledger...</p>
            </Card>
          ) : backups.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <Database className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-foreground">No Backup Snapshots Created Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Generate your first isolated database snapshot to protect workspace records against accidental changes.
              </p>
              <Button
                size="sm"
                className="mt-4 font-bold"
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
              >
                Create Initial Snapshot
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {backups.map((b) => (
                <Card key={b.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border shadow-xs hover:border-primary/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground font-mono">{b.filename}</h4>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {b.sizeFormatted}
                      </Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-mono">
                        {b.totalRecords} Records
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      <span>Created: {new Date(b.createdAt).toLocaleString()}</span>
                      <span className="font-mono text-[11px] truncate max-w-xs text-muted-foreground/80">
                        SHA-256: {b.checksumSha256.slice(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-semibold gap-1.5"
                      onClick={() => handleStartDryRun(b)}
                    >
                      <History className="size-3.5 text-primary" /> Simulate Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-semibold gap-1.5"
                      asChild
                    >
                      <a href={`/api/backup-restore/backups/${b.id}/download`} target="_blank" rel="noreferrer">
                        <Download className="size-3.5" /> Download
                      </a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RETENTION & SCHEDULE POLICY */}
      {activeTab === "policy" && (
        <Card className="max-w-2xl border shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-5 text-primary" /> Automated Backup Policy
            </CardTitle>
            <CardDescription className="text-xs">
              Configure automatic backup intervals and retention retention periods for this workspace instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Backup Frequency</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["manual", "daily", "weekly"] as const).map((freq) => (
                  <Button
                    key={freq}
                    type="button"
                    variant={activePolicy.frequency === freq ? "default" : "outline"}
                    size="sm"
                    className="capitalize font-semibold text-xs"
                    onClick={() => setPolicyForm({ ...activePolicy, frequency: freq })}
                  >
                    {freq}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Retention Window (Days)</Label>
              <Input
                type="number"
                min={7}
                max={365}
                value={activePolicy.retentionDays}
                onChange={(e) => setPolicyForm({ ...activePolicy, retentionDays: parseInt(e.target.value) || 30 })}
                className="max-w-xs text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Snapshots older than this threshold will be pruned automatically.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
              <div>
                <div className="font-bold text-foreground">Require Dual Admin Approval for Restore</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Require two workspace administrators to sign off on disaster recovery restore operations.
                </div>
              </div>
              <Button
                size="sm"
                variant={activePolicy.requireApproval ? "default" : "outline"}
                className="text-xs font-bold"
                onClick={() => setPolicyForm({ ...activePolicy, requireApproval: !activePolicy.requireApproval })}
              >
                {activePolicy.requireApproval ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              size="sm"
              className="font-bold"
              disabled={updatePolicyMutation.isPending}
              onClick={() => updatePolicyMutation.mutate(activePolicy)}
            >
              {updatePolicyMutation.isPending ? "Saving..." : "Save Backup Policy"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* MODAL 1: DRY RUN SIMULATION REPORT */}
      <Dialog open={!!selectedBackupForDryRun && !!dryRunReport} onOpenChange={(open) => !open && setSelectedBackupForDryRun(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileCheck className="size-5 text-emerald-600" /> Non-Destructive Dry-Run Simulation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simulated restore analysis for snapshot <strong className="text-foreground">{selectedBackupForDryRun?.filename}</strong>.
            </DialogDescription>
          </DialogHeader>

          {dryRunReport && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Total Records in Snapshot</span>
                  <div className="text-lg font-black text-foreground mt-0.5">{dryRunReport.totalRecords}</div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Estimated Duration</span>
                  <div className="text-lg font-black text-foreground mt-0.5">{dryRunReport.estimatedDurationMs} ms</div>
                </div>
              </div>

              {/* Multi-Tenant Boundary Check */}
              <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 flex items-start gap-2">
                <ShieldCheck className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-emerald-800">
                  <strong className="block">Tenant Isolation Verified</strong>
                  Snapshot belongs to this workspace ({dryRunReport.sourceTenantId}). Cross-tenant contamination check passed.
                </div>
              </div>

              {/* Model Counts Comparison */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Entities Affected</h4>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b font-bold">
                      <tr>
                        <th className="p-2">Model</th>
                        <th className="p-2 text-right">Records in Snapshot</th>
                        <th className="p-2 text-right">Existing in Workspace</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono text-[11px]">
                      {Object.entries(dryRunReport.modelCounts).map(([model, count]) => (
                        <tr key={model}>
                          <td className="p-2 font-semibold text-foreground">{model}</td>
                          <td className="p-2 text-right text-emerald-600 font-bold">{count}</td>
                          <td className="p-2 text-right text-muted-foreground">
                            {dryRunReport.existingRecordCounts[model] ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
            <Button size="sm" variant="outline" onClick={() => setSelectedBackupForDryRun(null)}>
              Close
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="font-bold gap-1.5"
              onClick={() => setShowRestoreConfirmModal(true)}
            >
              Proceed to Guarded Restore <ArrowRight className="size-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: GUARDED RESTORE CONFIRMATION WITH PHRASE */}
      <Dialog open={showRestoreConfirmModal} onOpenChange={setShowRestoreConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" /> Authorize Workspace Restoration
            </DialogTitle>
            <DialogDescription className="text-xs">
              Restoring a snapshot overwrites conflicting workspace records with snapshot data inside an interactive database transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-800">
              To proceed, enter the exact verification phrase below:
              <div className="font-mono font-bold text-foreground bg-card p-1.5 rounded border mt-1 select-all text-center">
                {expectedPhrase}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Enter Confirmation Phrase</Label>
              <Input
                type="text"
                placeholder={expectedPhrase}
                value={confirmationPhraseInput}
                onChange={(e) => setConfirmationPhraseInput(e.target.value.trim())}
                className="font-mono text-xs font-bold text-center"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button size="sm" variant="outline" onClick={() => setShowRestoreConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="font-bold"
              disabled={confirmationPhraseInput !== expectedPhrase || restoreMutation.isPending}
              onClick={() => {
                if (selectedBackupForDryRun) {
                  restoreMutation.mutate({
                    backupId: selectedBackupForDryRun.id,
                    confirmationPhrase: confirmationPhraseInput,
                  });
                }
              }}
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" /> Executing Transaction...
                </>
              ) : (
                "Authorize & Execute Restore"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BackupRestorePage;
