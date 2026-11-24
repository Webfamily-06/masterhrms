'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  MessageSquare,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface RegularizationItem {
  id: string;
  employeeId: string;
  attendanceDate: string;
  originalIn?: string | null;
  originalOut?: string | null;
  proposedIn?: string | null;
  proposedOut?: string | null;
  reason: string;
  status: string;
  reviewComments?: string | null;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string | null;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    user?: { profile?: { avatarUrl?: string | null } | null } | null;
  };
}

function formatYmd(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return format(d, "yyyy-MM-dd");
  } catch {
    return "—";
  }
}

function formatTimeHm(dateStr?: string | null) {
  if (!dateStr) return "--:--";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "--:--";
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "--:--";
  }
}

function renderStatusPill(status: string) {
  const s = (status || "PENDING").toUpperCase();
  if (s === "APPROVED") {
    return (
      <Badge
        variant="outline"
        className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      >
        Approved
      </Badge>
    );
  }
  if (s === "REJECTED") {
    return (
      <Badge
        variant="outline"
        className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
      >
        Rejected
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
    >
      Pending
    </Badge>
  );
}

export default function HrAttendanceRegularizationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RegularizationItem | null>(null);
  const [viewItem, setViewItem] = useState<RegularizationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegularizationItem | null>(null);

  const [form, setForm] = useState({
    employeeId: "",
    attendanceDate: format(new Date(), "yyyy-MM-dd"),
    proposedIn: "09:00",
    proposedOut: "18:00",
    reason: "",
  });

  // 1. Fetch Employees (names only in dropdowns)
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-reg-employees"],
    queryFn: async () => {
      const res = await api.get("/hr/employees", { params: { limit: 200 } });
      return Array.isArray(res?.data) ? res.data : unwrapArray(res);
    },
  });

  // Map employeeId -> avatarUrl from live employees list as fallback
  const employeeAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employees) {
      const url = emp?.avatarUrl || emp?.user?.profile?.avatarUrl;
      if (emp?.id && url) map.set(emp.id, url);
    }
    return map;
  }, [employees]);

  // 2. Fetch Regularization Requests
  const { data: regularizations = [], isLoading } = useQuery<RegularizationItem[]>({
    queryKey: ["hr-attendance-regularizations"],
    queryFn: async () => {
      const res = await api.get("/v1/hr/attendance/regularizations");
      return Array.isArray(res?.data) ? res.data : unwrapArray(res);
    },
  });

  // 3. Fetch Attendance Records for selected employee in Add Request Modal
  const { data: empAttendanceRecords = [] } = useQuery<any[]>({
    queryKey: ["hr-reg-emp-records", form.employeeId],
    enabled: Boolean(formModalOpen && form.employeeId),
    queryFn: async () => {
      try {
        const res = await api.get("/v1/hr/attendance/records", {
          params: { employeeId: form.employeeId, limit: 30 },
        });
        return Array.isArray(res?.data) ? res.data : unwrapArray(res);
      } catch {
        return [];
      }
    },
  });

  // Counts (treat any non-approved/non-rejected status as Pending to match badge display)
  const totalCount = regularizations.length;
  const approvedCount = regularizations.filter((r) => (r.status || "").toUpperCase() === "APPROVED").length;
  const rejectedCount = regularizations.filter((r) => (r.status || "").toUpperCase() === "REJECTED").length;
  const pendingCount = totalCount - approvedCount - rejectedCount;
  const approvalRate = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : "0.0";

  const filtered = useMemo(() => {
    return regularizations.filter((r) => {
      const s = (r.status || "PENDING").toUpperCase();
      const normalizedStatus = s === "APPROVED" ? "APPROVED" : s === "REJECTED" ? "REJECTED" : "PENDING";
      if (statusFilter !== "all" && normalizedStatus !== statusFilter) return false;
      if (employeeFilter !== "all" && r.employeeId !== employeeFilter) return false;
      const targetYmd = formatYmd(r.attendanceDate);
      if (fromDate && targetYmd !== "—" && targetYmd < fromDate) return false;
      if (toDate && targetYmd !== "—" && targetYmd > toDate) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        if (!name.includes(q) && !reason.includes(q)) return false;
      }
      return true;
    });
  }, [regularizations, statusFilter, employeeFilter, fromDate, toDate, search]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingItem) {
        return await api.put(`/v1/hr/attendance/regularizations/${editingItem.id}`, {
          attendanceDate: form.attendanceDate,
          proposedIn: form.proposedIn,
          proposedOut: form.proposedOut,
          reason: form.reason.trim(),
        });
      }
      return await api.post("/v1/hr/attendance/regularizations", {
        employeeId: form.employeeId,
        attendanceDate: form.attendanceDate,
        proposedIn: form.proposedIn,
        proposedOut: form.proposedOut,
        reason: form.reason.trim(),
      });
    },
    onSuccess: () => {
      toast.success(editingItem ? "Regularization request updated." : "Regularization request added.");
      setFormModalOpen(false);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-regularizations"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save regularization request.");
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      return await api.post(`/v1/hr/attendance/regularizations/${id}/action`, { action });
    },
    onSuccess: (_res, vars) => {
      toast.success(`Request ${vars.action === "approve" ? "approved & attendance updated" : "rejected"}.`);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-regularizations"] });
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-records"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to process request.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/v1/hr/attendance/regularizations/${id}`);
    },
    onSuccess: () => {
      toast.success("Regularization request deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-regularizations"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete request.");
    },
  });

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      employeeId: employees[0]?.id || "",
      attendanceDate: format(new Date(), "yyyy-MM-dd"),
      proposedIn: "09:00",
      proposedOut: "18:00",
      reason: "",
    });
    setFormModalOpen(true);
  };

  const openEditModal = (item: RegularizationItem) => {
    setEditingItem(item);
    setForm({
      employeeId: item.employeeId,
      attendanceDate: formatYmd(item.attendanceDate),
      proposedIn: formatTimeHm(item.proposedIn) !== "--:--" ? formatTimeHm(item.proposedIn) : "09:00",
      proposedOut: formatTimeHm(item.proposedOut) !== "--:--" ? formatTimeHm(item.proposedOut) : "18:00",
      reason: item.reason || "",
    });
    setFormModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setEmployeeFilter("all");
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
  };

  return (
    <div className="w-full space-y-5 font-sans">
      {/* ── Page Header (Matches Screenshot 5) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Attendance Regularizations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and manage attendance regularization requests.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="h-9 px-4 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Request
        </Button>
      </div>

      {/* ── 4 KPI Summary Cards (Matches Screenshot 5) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">All time</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-foreground mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">Needs Review</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-foreground mt-1">{approvedCount}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {approvalRate}% rate
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-foreground mt-1">{rejectedCount}</p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">Declined</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar & Status Tabs Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[175px] h-9 text-xs bg-background">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[150px] h-9 text-xs bg-background"
              aria-label="From date"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[150px] h-9 text-xs bg-background"
              aria-label="To date"
            />
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

        {/* Status Tabs */}
        <div className="px-3.5 border-t border-border/60 flex items-center gap-5 overflow-x-auto">
          {[
            { id: "all", label: "All", count: totalCount, icon: LayoutGrid },
            { id: "PENDING", label: "Pending", count: pendingCount, icon: Clock },
            { id: "APPROVED", label: "Approved", count: approvedCount, icon: CheckCircle2 },
            { id: "REJECTED", label: "Rejected", count: rejectedCount, icon: XCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  "inline-flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer",
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

      {/* ── 3-Column Regularization Cards Grid (Matches Screenshot 5) ── */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading regularization requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-card p-12 text-center space-y-2">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">No regularization requests found</p>
          <p className="text-xs text-muted-foreground">
            Click &ldquo;Add Request&rdquo; to manually create an attendance regularization entry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const empName = `${item.employee?.firstName || ""} ${item.employee?.lastName || ""}`.trim() || "Employee";
            const avatarUrl =
              (item.employee as any)?.avatarUrl ||
              item.employee?.user?.profile?.avatarUrl ||
              employeeAvatarMap.get(item.employeeId) ||
              null;

            return (
              <div
                key={item.id}
                data-testid="regularization-card"
                className="rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  {/* Card Top: Avatar + Name/Code + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        {avatarUrl ? <AvatarImage src={avatarUrl} alt={empName} /> : null}
                        <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          {item.employee?.firstName?.slice(0, 1)?.toUpperCase()}
                          {item.employee?.lastName?.slice(0, 1)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{empName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.employee?.employeeCode || item.employee?.designation?.name || "—"}
                        </p>
                      </div>
                    </div>
                    {renderStatusPill(item.status)}
                  </div>

                  {/* Date & Requested On */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Calendar className="h-3.5 w-3.5 opacity-70" />
                      {formatYmd(item.attendanceDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 opacity-70" />
                      Requested on : {formatYmd(item.createdAt)}
                    </span>
                  </div>

                  {/* Original -> Requested Time Comparison Box */}
                  <div className="rounded-lg bg-muted/40 border border-border/60 p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Original
                      </p>
                      <p className="font-mono font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeHm(item.originalIn)}
                      </p>
                      <p className="font-mono font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeHm(item.originalOut)}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Requested
                      </p>
                      <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeHm(item.proposedIn)}
                      </p>
                      <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeHm(item.proposedOut)}
                      </p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" />
                      Reason
                    </p>
                    <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>
                </div>

                {/* Card Footer: 5 Action Icons matching Screenshot 5 */}
                <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                    title="Approve Request"
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate({ id: item.id, action: "approve" })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                    title="Reject Request"
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate({ id: item.id, action: "reject" })}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="View Details"
                    onClick={() => setViewItem(item)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Edit Request"
                    onClick={() => openEditModal(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                    title="Delete Request"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Add / Edit Regularization Request (Matches Screenshot 6) ── */}
      <Dialog open={formModalOpen} onOpenChange={(o) => !o && setFormModalOpen(false)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Regularization Request" : "Add New Regularization Request"}
            </DialogTitle>
            <DialogDescription>
              Submit or update an attendance clock-in/clock-out correction for an employee.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.employeeId) {
                toast.error("Please select an employee.");
                return;
              }
              if (!form.attendanceDate) {
                toast.error("Please select an attendance date.");
                return;
              }
              if (!form.reason.trim()) {
                toast.error("Reason is required.");
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Employee <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={form.employeeId}
                disabled={Boolean(editingItem)}
                onValueChange={(val) => setForm((p) => ({ ...p, employeeId: val }))}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Attendance Record <span className="text-rose-500">*</span>
              </Label>
              {empAttendanceRecords.length > 0 && !editingItem ? (
                <Select
                  value={form.attendanceDate}
                  onValueChange={(val) => setForm((p) => ({ ...p, attendanceDate: val }))}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Select attendance record" />
                  </SelectTrigger>
                  <SelectContent>
                    {empAttendanceRecords.map((rec: any) => {
                      const d = formatYmd(rec.date);
                      return (
                        <SelectItem key={rec.id || d} value={d}>
                          {d} — {rec.status || "recorded"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                type="date"
                value={form.attendanceDate}
                onChange={(e) => setForm((p) => ({ ...p, attendanceDate: e.target.value }))}
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-clock-in" className="text-xs font-semibold">
                Requested Clock In <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="reg-clock-in"
                type="time"
                value={form.proposedIn}
                onChange={(e) => setForm((p) => ({ ...p, proposedIn: e.target.value }))}
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-clock-out" className="text-xs font-semibold">
                Requested Clock Out <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="reg-clock-out"
                type="time"
                value={form.proposedOut}
                onChange={(e) => setForm((p) => ({ ...p, proposedOut: e.target.value }))}
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-reason" className="text-xs font-semibold">
                Reason <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="reg-reason"
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. Forgot to clock in due to urgent meeting..."
                className="text-sm"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormModalOpen(false)}>
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

      {/* ── View Details Dialog ── */}
      <Dialog open={Boolean(viewItem)} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Regularization Request Details</DialogTitle>
            <DialogDescription>
              {viewItem?.employee?.firstName} {viewItem?.employee?.lastName} •{" "}
              {formatYmd(viewItem?.attendanceDate)}
            </DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 text-xs pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Original Time</span>
                  <p className="font-mono font-semibold text-rose-600 mt-0.5">
                    {formatTimeHm(viewItem.originalIn)} – {formatTimeHm(viewItem.originalOut)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Requested Time</span>
                  <p className="font-mono font-semibold text-emerald-600 mt-0.5">
                    {formatTimeHm(viewItem.proposedIn)} – {formatTimeHm(viewItem.proposedOut)}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-0.5">{renderStatusPill(viewItem.status)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Reason</span>
                <p className="text-foreground mt-0.5 leading-relaxed">{viewItem.reason}</p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setViewItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Regularization Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this regularization request?
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
