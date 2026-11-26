'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@/lib/router-compat";
import { api, unwrapArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  Edit,
  Lock,
  Unlock,
  Trash2,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PolicyItem {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  graceMinutes: number;
  lateArrivalGrace: number;
  earlyDepartureGrace: number;
  overtimeRatePerHour: number;
  status: "active" | "inactive";
}

export default function HrAttendancePoliciesPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyItem | null>(null);
  const [viewPolicy, setViewPolicy] = useState<PolicyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PolicyItem | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    lateArrivalGrace: "15",
    earlyDepartureGrace: "15",
    overtimeRatePerHour: "150",
    status: "active" as "active" | "inactive",
  });

  const { data: policies = [], isLoading } = useQuery<PolicyItem[]>({
    queryKey: ["hr-attendance-policies"],
    queryFn: async () => {
      const res = await api.get("/v1/hr/attendance/policies");
      return Array.isArray(res?.data) ? res.data : unwrapArray(res);
    },
  });

  // KPI metrics
  const totalPolicies = policies.length;
  const activePolicies = policies.filter((p) => (p.status || "active") === "active").length;
  const inactivePolicies = totalPolicies - activePolicies;
  const avgLateGrace =
    totalPolicies > 0
      ? Math.round(
          policies.reduce((acc, p) => acc + Number(p.lateArrivalGrace ?? p.graceMinutes ?? 15), 0) /
            totalPolicies
        )
      : 0;
  const avgOvertimeRate =
    totalPolicies > 0
      ? policies.reduce((acc, p) => acc + Number(p.overtimeRatePerHour ?? 150), 0) / totalPolicies
      : 0;

  const filtered = useMemo(() => {
    return policies.filter((p) => {
      const st = p.status || "active";
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(p.name || "").toLowerCase().includes(q) &&
          !(p.description || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [policies, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paginated = filtered.slice((page - 1) * limit, page * limit);
  const startRow = filtered.length === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, filtered.length);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        lateArrivalGrace: Number(form.lateArrivalGrace) || 0,
        graceMinutes: Number(form.lateArrivalGrace) || 0,
        earlyDepartureGrace: Number(form.earlyDepartureGrace) || 0,
        overtimeRatePerHour: Number(form.overtimeRatePerHour) || 0,
        status: form.status,
      };
      if (editingPolicy) {
        return await api.put(`/v1/hr/attendance/policies/${editingPolicy.id}`, payload);
      }
      return await api.post("/v1/hr/attendance/policies", payload);
    },
    onSuccess: () => {
      toast.success(editingPolicy ? "Attendance policy updated." : "Attendance policy created.");
      setFormOpen(false);
      setEditingPolicy(null);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-policies"] });
      queryClient.invalidateQueries({ queryKey: ["wizard-attendance-policies"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save attendance policy.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      return await api.patch(`/v1/hr/attendance/policies/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Policy status updated.");
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-policies"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/v1/hr/attendance/policies/${id}`);
    },
    onSuccess: () => {
      toast.success("Attendance policy deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-policies"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Cannot delete policy.");
    },
  });

  const openCreate = () => {
    setEditingPolicy(null);
    setForm({
      name: "",
      description: "",
      lateArrivalGrace: "15",
      earlyDepartureGrace: "15",
      overtimeRatePerHour: "150",
      status: "active",
    });
    setFormOpen(true);
  };

  const openEdit = (p: PolicyItem) => {
    setEditingPolicy(p);
    setForm({
      name: p.name || "",
      description: p.description || "",
      lateArrivalGrace: String(p.lateArrivalGrace ?? p.graceMinutes ?? 15),
      earlyDepartureGrace: String(p.earlyDepartureGrace ?? p.graceMinutes ?? 15),
      overtimeRatePerHour: String(p.overtimeRatePerHour ?? 150),
      status: p.status || "active",
    });
    setFormOpen(true);
  };

  return (
    <div className="w-full space-y-5 font-sans">
      {/* ── Page Header (Matches Screenshot 3) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Attendance Policies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage attendance rules and policies for your organization.
          </p>
        </div>
        {!isEmployeePortal && (
          <Button
            onClick={openCreate}
            className="h-9 px-4 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Attendance Policy
          </Button>
        )}
      </div>

      {/* ── 4 KPI Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Policies</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalPolicies}</p>
            <p className="text-[11px] text-muted-foreground mt-1">All policies</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Policies</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activePolicies}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Currently active</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avg Late Grace</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {avgLateGrace} <span className="text-xs font-normal text-muted-foreground">min</span>
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">Late arrival grace</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avg Overtime Rate</p>
            <p className="text-2xl font-bold text-foreground mt-1">${avgOvertimeRate.toFixed(2)}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Per hour</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Status Tabs Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>
        </div>

        <div className="px-3.5 border-t border-border/60 flex items-center gap-5">
          {[
            { id: "all", label: "All", count: totalPolicies, icon: LayoutGrid },
            { id: "active", label: "Active", count: activePolicies, icon: CheckCircle2 },
            { id: "inactive", label: "Inactive", count: inactivePolicies, icon: XCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer",
                  active
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                    active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3-Column Policy Cards Grid (Matches Screenshot 3) ── */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading attendance policies...</div>
      ) : paginated.length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-card p-12 text-center space-y-2">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">No attendance policies configured</p>
          <p className="text-xs text-muted-foreground">
            Click &ldquo;Add Attendance Policy&rdquo; to define grace periods and overtime calculation rules.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((policy) => {
            const isActive = (policy.status || "active") === "active";
            return (
              <div
                key={policy.id}
                data-testid="policy-card"
                className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{policy.name}</h3>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium px-2 py-0 rounded-md",
                            isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* 4 Action Icons */}
                  <div className="inline-flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="View Policy"
                      onClick={() => setViewPolicy(policy)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {!isEmployeePortal && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Policy"
                          onClick={() => openEdit(policy)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                          title={isActive ? "Deactivate Policy" : "Activate Policy"}
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: policy.id,
                              status: isActive ? "inactive" : "active",
                            })
                          }
                        >
                          {isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          title="Delete Policy"
                          onClick={() => setDeleteTarget(policy)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs pt-1">
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">
                        {policy.lateArrivalGrace ?? policy.graceMinutes ?? 15} minutes
                      </p>
                      <p className="text-[11px] text-muted-foreground">Late Arrival Grace</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">
                        ${Number(policy.overtimeRatePerHour ?? 150).toFixed(2)}/hr
                      </p>
                      <p className="text-[11px] text-muted-foreground">Overtime Rate</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 col-span-2">
                    <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">
                        {policy.earlyDepartureGrace ?? policy.graceMinutes ?? 15} minutes
                      </p>
                      <p className="text-[11px] text-muted-foreground">Early Departure Grace</p>
                    </div>
                  </div>
                </div>

                {/* Description Footer */}
                <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground line-clamp-2">
                  {policy.description || "Attendance calculation policy with configured grace periods and overtime rates."}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination Footer ── */}
      <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          Showing <span className="font-semibold text-foreground">{startRow}</span> to{" "}
          <span className="font-semibold text-foreground">{endRow}</span> of{" "}
          <span className="font-semibold text-foreground">{filtered.length}</span> results
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="9">9</SelectItem>
                <SelectItem value="18">18</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              &laquo; Previous
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 w-8 p-0 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {page}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next &raquo;
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal: Add / Edit Attendance Policy (Matches Screenshot 4) ── */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? "Edit Attendance Policy" : "Add New Attendance Policy"}
            </DialogTitle>
            <DialogDescription>
              Configure late arrival grace, early departure grace, and overtime rate rules.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error("Policy Name is required.");
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="pol-name" className="text-xs font-semibold">
                Policy Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="pol-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Standard Attendance Policy"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pol-desc" className="text-xs font-semibold">Description</Label>
              <Textarea
                id="pol-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Default attendance policy for all employees..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pol-late-grace" className="text-xs font-semibold">
                Late Arrival Grace (minutes) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="pol-late-grace"
                inputMode="numeric"
                value={form.lateArrivalGrace}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lateArrivalGrace: e.target.value.replace(/\D/g, "") }))
                }
                placeholder="15"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pol-early-grace" className="text-xs font-semibold">
                Early Departure Grace (minutes) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="pol-early-grace"
                inputMode="numeric"
                value={form.earlyDepartureGrace}
                onChange={(e) =>
                  setForm((p) => ({ ...p, earlyDepartureGrace: e.target.value.replace(/\D/g, "") }))
                }
                placeholder="15"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pol-ot-rate" className="text-xs font-semibold">
                Overtime Rate Per Hour <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="pol-ot-rate"
                inputMode="decimal"
                value={form.overtimeRatePerHour}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    overtimeRatePerHour: e.target.value.replace(/[^\d.]/g, ""),
                  }))
                }
                placeholder="150"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as "active" | "inactive" }))}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-5"
              >
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Policy Modal */}
      <Dialog open={Boolean(viewPolicy)} onOpenChange={(o) => !o && setViewPolicy(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{viewPolicy?.name}</DialogTitle>
            <DialogDescription>Attendance policy calculation rules</DialogDescription>
          </DialogHeader>
          {viewPolicy && (
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <span className="text-muted-foreground">Late Arrival Grace</span>
                <p className="font-semibold text-foreground mt-0.5">
                  {viewPolicy.lateArrivalGrace ?? viewPolicy.graceMinutes} minutes
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Early Departure Grace</span>
                <p className="font-semibold text-foreground mt-0.5">
                  {viewPolicy.earlyDepartureGrace ?? viewPolicy.graceMinutes} minutes
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Overtime Rate</span>
                <p className="font-semibold text-foreground mt-0.5">
                  ${Number(viewPolicy.overtimeRatePerHour ?? 150).toFixed(2)}/hr
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-semibold capitalize text-foreground mt-0.5">{viewPolicy.status}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Description</span>
                <p className="text-foreground mt-0.5">{viewPolicy.description || "—"}</p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setViewPolicy(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Policy Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Attendance Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
