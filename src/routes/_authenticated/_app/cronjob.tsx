import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Info,
  Sliders,
  ShieldAlert,
  HardDrive,
  RefreshCw,
  Database,
  ArrowRight,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/cronjob")({
  component: CronjobPage,
  head: () => ({ meta: [{ title: "Cronjob Settings — Master HRMS" }] }),
});

function fmtDate(d: string | null | undefined) {
  if (!d) return { date: "-", time: "-" };
  try {
    const dt = new Date(d);
    return {
      date: format(dt, "dd MMM yyyy"),
      time: format(dt, "HH:mm:ss"),
    };
  } catch {
    return { date: String(d), time: "" };
  }
}

export function CronjobPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin"].includes(r)
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editJob, setEditJob] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    schedule: "5 minutes",
    cronExpression: "*/5 * * * *",
    url: "",
  });

  // ─── Query ────────────────────────────────────────────────────────────────
  const { data: cronjobs = [], isLoading, refetch } = useQuery({
    queryKey: ["system-cronjobs"],
    queryFn: async () => {
      const res = await api.get("/system/cronjobs");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post("/system/cronjobs", data),
    onSuccess: () => {
      toast.success("Cronjob created successfully");
      qc.invalidateQueries({ queryKey: ["system-cronjobs"] });
      setAddOpen(false);
      setFormData({
        name: "",
        schedule: "5 minutes",
        cronExpression: "*/5 * * * *",
        url: "",
      });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create cronjob"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/system/cronjobs/${id}`, data),
    onSuccess: () => {
      toast.success("Cronjob updated successfully");
      qc.invalidateQueries({ queryKey: ["system-cronjobs"] });
      setEditJob(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update cronjob"),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => api.post(`/system/cronjobs/${id}/run`, {}),
    onSuccess: (data: any) => {
      toast.success(data?.message || "Cronjob executed successfully");
      qc.invalidateQueries({ queryKey: ["system-cronjobs"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to execute cronjob"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/system/cronjobs/${id}`),
    onSuccess: () => {
      toast.success("Cronjob removed");
      qc.invalidateQueries({ queryKey: ["system-cronjobs"] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete cronjob"),
  });

  const handleToggleStatus = (job: any) => {
    const newStatus = job.status === "running" ? "paused" : "running";
    updateMutation.mutate({
      id: job.id,
      data: { status: newStatus },
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(cronjobs.map((j: any) => j.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* ─── Breadcrumb & Top Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/settings" className="hover:text-primary">Settings</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Cronjob</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="size-6 text-primary" />
            <span>Cronjob Management</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automate routine background executions, database cleanup, report generation, and third-party synchronizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleModalOpen(true)}
            className="text-xs gap-1.5 h-8"
          >
            <Clock className="size-3.5" />
            <span>Cron Schedule Guide</span>
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="text-xs gap-1.5 h-8"
            >
              <Plus className="size-3.5" />
              <span>Add Cronjob</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── Settings Tabs Bar (ERP Standard) ──────────────────────────────── */}
      <div className="flex items-center gap-2 border-b overflow-x-auto pb-2 text-sm font-medium">
        <Link
          to="/settings"
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          General Settings
        </Link>
        <Link
          to="/settings"
          search={{ tab: "website" }}
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          Website Settings
        </Link>
        <Link
          to="/settings"
          search={{ tab: "app" }}
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          App Settings
        </Link>
        <Link
          to="/settings"
          search={{ tab: "system" }}
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          System Settings
        </Link>
        <Link
          to="/settings"
          search={{ tab: "financial" }}
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          Financial Settings
        </Link>
        <div className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold flex items-center gap-1.5">
          <Sliders className="size-4" />
          <span>Other Settings</span>
        </div>
      </div>

      {/* ─── Layout with Settings Sidebar & Main Content ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Settings Sidebar */}
        <div className="lg:col-span-3 space-y-1">
          <Card className="shadow-none border">
            <CardContent className="p-3 space-y-1 text-xs">
              <div className="px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                Other Settings Menu
              </div>
              <Link
                to="/settings"
                search={{ tab: "custom_css" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted/60"
              >
                <Code2 className="size-3.5" />
                <span>Custom CSS</span>
              </Link>
              <Link
                to="/settings"
                search={{ tab: "custom_js" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted/60"
              >
                <Code2 className="size-3.5" />
                <span>Custom JS</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground font-semibold shadow-sm">
                <Clock className="size-3.5" />
                <span>Cronjob</span>
              </div>
              <Link
                to="/settings"
                search={{ tab: "storage" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted/60"
              >
                <HardDrive className="size-3.5" />
                <span>Storage</span>
              </Link>
              <Link
                to="/ban-ip-address"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted/60"
              >
                <ShieldAlert className="size-3.5 text-destructive" />
                <span>Ban IP Address</span>
              </Link>
              <Link
                to="/settings"
                search={{ tab: "backup" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted/60"
              >
                <Database className="size-3.5" />
                <span>Backup</span>
              </Link>
              <Link
                to="/clear-cache"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted/60"
              >
                <RefreshCw className="size-3.5 text-primary" />
                <span>Clear Cache</span>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-4">
          <Card className="shadow-none border">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Cronjob List</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time status of scheduled automated jobs across the organization.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-8 text-xs gap-1.5"
              >
                <RotateCw className="size-3" />
                <span>Refresh</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <RotateCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading scheduled cronjobs...
                </div>
              ) : cronjobs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No cronjobs registered yet. Click &quot;Add Cronjob&quot; to create one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={
                            selectedIds.length > 0 &&
                            selectedIds.length === cronjobs.length
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cronjobs.map((job: any) => {
                      const next = fmtDate(job.nextRun);
                      const last = fmtDate(job.lastRun);
                      const isRunning = job.status === "running";

                      return (
                        <TableRow key={job.id} className="hover:bg-muted/40">
                          <TableCell>
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                              checked={selectedIds.includes(job.id)}
                              onChange={(e) =>
                                handleSelectOne(job.id, e.target.checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground text-sm">
                              {job.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {job.cronExpression || job.code}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {job.schedule}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">{next.date}</div>
                            <div className="text-[11px] text-muted-foreground">{next.time}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">{last.date}</div>
                            <div className="text-[11px] text-muted-foreground">{last.time}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] font-medium gap-1 px-2 py-0.5",
                                isRunning
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  isRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                                )}
                              />
                              <span>{isRunning ? "Running" : "Paused"}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Run Now */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="Run Immediately"
                                onClick={() => runMutation.mutate(job.id)}
                                disabled={runMutation.isPending}
                              >
                                <Zap className="size-3.5 text-amber-500" />
                              </Button>

                              {/* Pause / Resume */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                title={isRunning ? "Pause Job" : "Resume Job"}
                                onClick={() => handleToggleStatus(job)}
                              >
                                {isRunning ? (
                                  <Pause className="size-3.5" />
                                ) : (
                                  <Play className="size-3.5 text-emerald-600" />
                                )}
                              </Button>

                              {/* Edit */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                title="Edit Cronjob"
                                onClick={() => setEditJob(job)}
                              >
                                <Edit2 className="size-3.5" />
                              </Button>

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Delete Cronjob"
                                onClick={() => setDeleteConfirmId(job.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Add Cronjob Modal ──────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Cronjob</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="cron-name">Job Name</Label>
              <Input
                id="cron-name"
                placeholder="e.g. Daily Data Archival"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cron-schedule">Schedule Frequency</Label>
              <Select
                value={formData.schedule}
                onValueChange={(val) => {
                  let expr = "*/5 * * * *";
                  if (val === "1 minute") expr = "* * * * *";
                  if (val === "3 minutes") expr = "*/3 * * * *";
                  if (val === "5 minutes") expr = "*/5 * * * *";
                  if (val === "15 minutes") expr = "*/15 * * * *";
                  if (val === "30 minutes") expr = "*/30 * * * *";
                  if (val === "Hourly") expr = "0 * * * *";
                  if (val === "Daily at midnight") expr = "0 0 * * *";

                  setFormData({
                    ...formData,
                    schedule: val,
                    cronExpression: expr,
                  });
                }}
              >
                <SelectTrigger id="cron-schedule">
                  <SelectValue placeholder="Select Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 minute">1 Minute</SelectItem>
                  <SelectItem value="3 minutes">3 Minutes</SelectItem>
                  <SelectItem value="5 minutes">5 Minutes</SelectItem>
                  <SelectItem value="15 minutes">15 Minutes</SelectItem>
                  <SelectItem value="30 minutes">30 Minutes</SelectItem>
                  <SelectItem value="Hourly">Hourly</SelectItem>
                  <SelectItem value="Daily at midnight">Daily at midnight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cron-expr">Cron Expression</Label>
              <Input
                id="cron-expr"
                className="font-mono text-xs"
                placeholder="*/5 * * * *"
                value={formData.cronExpression}
                onChange={(e) =>
                  setFormData({ ...formData, cronExpression: e.target.value })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Standard 5-part cron syntax: minute hour day-of-month month day-of-week
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cron-url">Target URL / Webhook (Optional)</Label>
              <Input
                id="cron-url"
                placeholder="https://api.domain.com/internal/cron"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!formData.name) {
                  toast.error("Please enter a cronjob name");
                  return;
                }
                createMutation.mutate(formData);
              }}
              disabled={createMutation.isPending}
            >
              Add Cronjob
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Cronjob Modal ─────────────────────────────────────────────── */}
      {editJob && (
        <Dialog open={!!editJob} onOpenChange={() => setEditJob(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Edit Cronjob</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cron-name">Job Name</Label>
                <Input
                  id="edit-cron-name"
                  value={editJob.name}
                  onChange={(e) =>
                    setEditJob({ ...editJob, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cron-schedule">Schedule Frequency</Label>
                <Select
                  value={editJob.schedule}
                  onValueChange={(val) => {
                    let expr = editJob.cronExpression;
                    if (val === "1 minute") expr = "* * * * *";
                    if (val === "3 minutes") expr = "*/3 * * * *";
                    if (val === "5 minutes") expr = "*/5 * * * *";
                    if (val === "15 minutes") expr = "*/15 * * * *";
                    if (val === "30 minutes") expr = "*/30 * * * *";
                    if (val === "Hourly") expr = "0 * * * *";
                    if (val === "Daily at midnight") expr = "0 0 * * *";

                    setEditJob({
                      ...editJob,
                      schedule: val,
                      cronExpression: expr,
                    });
                  }}
                >
                  <SelectTrigger id="edit-cron-schedule">
                    <SelectValue placeholder="Select Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 minute">1 Minute</SelectItem>
                    <SelectItem value="3 minutes">3 Minutes</SelectItem>
                    <SelectItem value="5 minutes">5 Minutes</SelectItem>
                    <SelectItem value="15 minutes">15 Minutes</SelectItem>
                    <SelectItem value="30 minutes">30 Minutes</SelectItem>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Daily at midnight">Daily at midnight</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cron-expr">Cron Expression</Label>
                <Input
                  id="edit-cron-expr"
                  className="font-mono text-xs"
                  value={editJob.cronExpression || ""}
                  onChange={(e) =>
                    setEditJob({ ...editJob, cronExpression: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cron-status">Status</Label>
                <Select
                  value={editJob.status}
                  onValueChange={(val) =>
                    setEditJob({ ...editJob, status: val })
                  }
                >
                  <SelectTrigger id="edit-cron-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditJob(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  updateMutation.mutate({
                    id: editJob.id,
                    data: {
                      name: editJob.name,
                      schedule: editJob.schedule,
                      cronExpression: editJob.cronExpression,
                      status: editJob.status,
                    },
                  });
                }}
                disabled={updateMutation.isPending}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteConfirmId && (
        <Dialog
          open={!!deleteConfirmId}
          onOpenChange={() => setDeleteConfirmId(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5" />
                <span>Delete Cronjob</span>
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground py-2">
              Are you sure you want to remove this cronjob? Automated executions for this job will cease immediately.
            </p>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
              >
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Cron Schedule Reference Modal ──────────────────────────────────── */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <span>Cron Schedule Syntax Reference</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Master ERP background task scheduler follows the standard POSIX cron format with 5 fields:
            </p>
            <div className="bg-muted/60 p-3 rounded-lg font-mono text-[11px] leading-relaxed">
              * * * * *<br />
              │ │ │ │ │<br />
              │ │ │ │ └─ Day of Week (0 - 6) (0 is Sunday)<br />
              │ │ │ └─── Month (1 - 12)<br />
              │ │ └───── Day of Month (1 - 31)<br />
              │ └─────── Hour (0 - 23)<br />
              └───────── Minute (0 - 59)
            </div>
            <div className="space-y-1.5 pt-1">
              <h4 className="font-semibold text-foreground">Common Presets:</h4>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li><code className="text-foreground font-mono">*/5 * * * *</code> — Runs every 5 minutes</li>
                <li><code className="text-foreground font-mono">0 * * * *</code> — Runs at minute 0 of every hour</li>
                <li><code className="text-foreground font-mono">0 0 * * *</code> — Runs daily at midnight (00:00)</li>
                <li><code className="text-foreground font-mono">0 8 * * 1</code> — Runs every Monday morning at 08:00</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScheduleModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
