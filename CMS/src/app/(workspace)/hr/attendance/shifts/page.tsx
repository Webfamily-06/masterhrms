'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Filter,
  Users,
  Sun,
  Moon,
  Clock,
  Calendar,
  Eye,
  Edit,
  Lock,
  Unlock,
  Trash2,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShiftItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  breakStartTime?: string;
  breakEndTime?: string;
  gracePeriodMinutes: number;
  isNightShift: boolean;
  status: "active" | "inactive";
  workingHours: number;
}

export default function HrAttendanceShiftsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "day" | "night">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);
  const [viewShift, setViewShift] = useState<ShiftItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftItem | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: "60",
    breakStartTime: "",
    breakEndTime: "",
    gracePeriodMinutes: "15",
    isNightShift: false,
    status: "active" as "active" | "inactive",
  });

  const { data: shifts = [], isLoading } = useQuery<ShiftItem[]>({
    queryKey: ["hr-attendance-shifts"],
    queryFn: async () => {
      const res = await api.get("/v1/hr/attendance/shifts");
      return Array.isArray(res?.data) ? res.data : unwrapArray(res);
    },
  });

  // KPI metrics
  const totalShifts = shifts.length;
  const activeShifts = shifts.filter((s) => (s.status || "active") === "active").length;
  const inactiveShifts = totalShifts - activeShifts;
  const nightShifts = shifts.filter((s) => Boolean(s.isNightShift)).length;
  const dayShifts = totalShifts - nightShifts;

  const filtered = useMemo(() => {
    return shifts.filter((s) => {
      const st = s.status || "active";
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (typeFilter === "day" && s.isNightShift) return false;
      if (typeFilter === "night" && !s.isNightShift) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(s.name || "").toLowerCase().includes(q) &&
          !(s.description || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [shifts, statusFilter, typeFilter, search]);

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
        startTime: form.startTime,
        endTime: form.endTime,
        breakMinutes: Number(form.breakMinutes) || 0,
        breakStartTime: form.breakStartTime,
        breakEndTime: form.breakEndTime,
        gracePeriodMinutes: Number(form.gracePeriodMinutes) || 0,
        isNightShift: form.isNightShift,
        status: form.status,
      };
      if (editingShift) {
        return await api.put(`/v1/hr/attendance/shifts/${editingShift.id}`, payload);
      }
      return await api.post("/v1/hr/attendance/shifts", payload);
    },
    onSuccess: () => {
      toast.success(editingShift ? "Shift updated." : "Shift created successfully.");
      setFormOpen(false);
      setEditingShift(null);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["wizard-shifts"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save shift.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      return await api.patch(`/v1/hr/attendance/shifts/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Shift status updated.");
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-shifts"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/v1/hr/attendance/shifts/${id}`);
    },
    onSuccess: () => {
      toast.success("Shift deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-shifts"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Cannot delete shift.");
    },
  });

  const openCreate = () => {
    setEditingShift(null);
    setForm({
      name: "",
      description: "",
      startTime: "09:00",
      endTime: "18:00",
      breakMinutes: "60",
      breakStartTime: "",
      breakEndTime: "",
      gracePeriodMinutes: "15",
      isNightShift: false,
      status: "active",
    });
    setFormOpen(true);
  };

  const openEdit = (s: ShiftItem) => {
    setEditingShift(s);
    setForm({
      name: s.name || "",
      description: s.description || "",
      startTime: s.startTime || "09:00",
      endTime: s.endTime || "18:00",
      breakMinutes: String(s.breakMinutes ?? 60),
      breakStartTime: s.breakStartTime || "",
      breakEndTime: s.breakEndTime || "",
      gracePeriodMinutes: String(s.gracePeriodMinutes ?? 15),
      isNightShift: Boolean(s.isNightShift),
      status: s.status || "active",
    });
    setFormOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="w-full space-y-5 font-sans">
      {/* ── Page Header (Matches Screenshot 1) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Shifts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage work shifts and schedules.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-9 px-4 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Shift
        </Button>
      </div>

      {/* ── 4 KPI Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Shifts</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalShifts}</p>
            <p className="text-[11px] text-muted-foreground mt-1">All shifts</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Shifts</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeShifts}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Currently active</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sun className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Night Shifts</p>
            <p className="text-2xl font-bold text-foreground mt-1">{nightShifts}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Night schedule</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center">
            <Moon className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Day Shifts</p>
            <p className="text-2xl font-bold text-foreground mt-1">{dayShifts}</p>
            <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-1">Day schedule</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Sun className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar & Status Tabs ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-56">
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

            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="day">Day Shift</SelectItem>
                <SelectItem value="night">Night Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 gap-1.5 text-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>

        <div className="px-3.5 border-t border-border/60 flex items-center gap-5">
          {[
            { id: "all", label: "All", count: totalShifts, icon: LayoutGrid },
            { id: "active", label: "Active", count: activeShifts, icon: CheckCircle2 },
            { id: "inactive", label: "Inactive", count: inactiveShifts, icon: XCircle },
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

      {/* ── 3-Column Shift Cards Grid (Matches Screenshot 1) ── */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading shifts...</div>
      ) : paginated.length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-card p-12 text-center space-y-2">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">No shifts configured</p>
          <p className="text-xs text-muted-foreground">Click &ldquo;Add Shift&rdquo; to define work schedules and grace periods.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((shift) => {
            const isActive = (shift.status || "active") === "active";
            return (
              <div
                key={shift.id}
                data-testid="shift-card"
                className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0">
                      {shift.isNightShift ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{shift.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium px-2 py-0 rounded-md",
                            shift.isNightShift
                              ? "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                          )}
                        >
                          {shift.isNightShift ? "Night Shift" : "Day Shift"}
                        </Badge>
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
                      title="View Shift"
                      onClick={() => setViewShift(shift)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Edit Shift"
                      onClick={() => openEdit(shift)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                      title={isActive ? "Deactivate Shift" : "Activate Shift"}
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: shift.id,
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
                      title="Delete Shift"
                      onClick={() => setDeleteTarget(shift)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* 2x2 Metrics Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs pt-1">
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">
                        {shift.startTime} - {shift.endTime}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Shift Hours</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-foreground">{shift.breakMinutes} minutes</p>
                    <p className="text-[11px] text-muted-foreground">Break Duration</p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">{Number(shift.workingHours || 8).toFixed(1)} hours</p>
                      <p className="text-[11px] text-muted-foreground">Working Time</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-foreground">{shift.gracePeriodMinutes ?? 15} minutes</p>
                    <p className="text-[11px] text-muted-foreground">Grace Period</p>
                  </div>
                </div>

                {/* Description Footer */}
                <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground line-clamp-2">
                  {shift.description || "Configured shift schedule for attendance calculation."}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination Bar ── */}
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

      {/* ── Modal: Add / Edit Shift (Matches Screenshot 2) ── */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Edit Shift" : "Add New Shift"}</DialogTitle>
            <DialogDescription>
              Shift hours, break duration, and grace period drive automated attendance calculations.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error("Shift Name is required.");
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="shift-name" className="text-xs font-semibold">
                Shift Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="shift-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Morning Shift"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift-desc" className="text-xs font-semibold">Description</Label>
              <Textarea
                id="shift-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Standard morning shift for office staff..."
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shift-start" className="text-xs font-semibold">
                  Start Time <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="shift-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shift-end" className="text-xs font-semibold">
                  End Time <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="shift-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  className="h-10 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift-break-dur" className="text-xs font-semibold">
                Break Duration (minutes) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="shift-break-dur"
                inputMode="numeric"
                value={form.breakMinutes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, breakMinutes: e.target.value.replace(/\D/g, "") }))
                }
                placeholder="60"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shift-break-start" className="text-xs font-semibold">Break Start Time</Label>
                <Input
                  id="shift-break-start"
                  type="time"
                  value={form.breakStartTime}
                  onChange={(e) => setForm((p) => ({ ...p, breakStartTime: e.target.value }))}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shift-break-end" className="text-xs font-semibold">Break End Time</Label>
                <Input
                  id="shift-break-end"
                  type="time"
                  value={form.breakEndTime}
                  onChange={(e) => setForm((p) => ({ ...p, breakEndTime: e.target.value }))}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift-grace" className="text-xs font-semibold">
                Grace Period (minutes) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="shift-grace"
                inputMode="numeric"
                value={form.gracePeriodMinutes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gracePeriodMinutes: e.target.value.replace(/\D/g, "") }))
                }
                placeholder="15"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <Checkbox
                  checked={form.isNightShift}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, isNightShift: Boolean(c) }))}
                />
                Night Shift
              </label>

              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as "active" | "inactive" }))}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
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

      {/* View Shift Modal */}
      <Dialog open={Boolean(viewShift)} onOpenChange={(o) => !o && setViewShift(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{viewShift?.name}</DialogTitle>
            <DialogDescription>Shift timing and grace period rules</DialogDescription>
          </DialogHeader>
          {viewShift && (
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <span className="text-muted-foreground">Shift Hours</span>
                <p className="font-semibold text-foreground mt-0.5">
                  {viewShift.startTime} - {viewShift.endTime}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Working Time</span>
                <p className="font-semibold text-foreground mt-0.5">
                  {Number(viewShift.workingHours || 8).toFixed(1)} hours
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Break Duration</span>
                <p className="font-semibold text-foreground mt-0.5">{viewShift.breakMinutes} minutes</p>
              </div>
              <div>
                <span className="text-muted-foreground">Grace Period</span>
                <p className="font-semibold text-foreground mt-0.5">{viewShift.gracePeriodMinutes} minutes</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Description</span>
                <p className="text-foreground mt-0.5">{viewShift.description || "—"}</p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setViewShift(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Shift Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Shift</DialogTitle>
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
