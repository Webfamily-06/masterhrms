'use client';

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@/lib/router-compat";
import { format, differenceInCalendarDays } from "date-fns";
import { api, unwrapArray } from "@/lib/api";
import { useWorkspaceSettings } from "@/src/context/workspace-settings-context";
import { PageHeader } from "@/components/ui/page-header";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  LifecycleDocumentField,
  DocumentPreviewBlock,
} from "@/components/hr/lifecycle-document-field";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  RefreshCw,
  Trash2,
  Calendar,
  Plane,
  Receipt,
  DollarSign,
  CreditCard,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDateSafe(val?: string | null) {
  if (!val) return "—";
  try {
    return format(new Date(val), "yyyy-MM-dd");
  } catch {
    return String(val).slice(0, 10);
  }
}

function toInputDate(val?: string | null) {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function calcDays(from?: string | null, to?: string | null) {
  if (!from || !to) return 1;
  try {
    return Math.max(1, differenceInCalendarDays(new Date(to), new Date(from)) + 1);
  } catch {
    return 1;
  }
}

function normalizeTripStatus(status?: string): "planned" | "ongoing" | "completed" | "cancelled" {
  const s = (status || "planned").toLowerCase();
  if (s === "approved" || s === "ongoing" || s === "in_progress") return "ongoing";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "rejected") return "cancelled";
  return "planned";
}

function getTripStatusBadge(status?: string) {
  const s = normalizeTripStatus(status);
  if (s === "completed") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
        Completed
      </Badge>
    );
  }
  if (s === "ongoing") {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium">
        Ongoing
      </Badge>
    );
  }
  if (s === "cancelled") {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium">
        Cancelled
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
      Planned
    </Badge>
  );
}

function getAdvancePill(status?: string) {
  const s = (status || "requested").toLowerCase();
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  if (s === "paid" || s === "disbursed") {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700">
        {label}
      </span>
    );
  }
  if (s === "reconciled") {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-700">
        Reconciled
      </span>
    );
  }
  if (s === "approved") {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700">
        Approved
      </span>
    );
  }
  if (s === "rejected") {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700">
      Requested
    </span>
  );
}

function getReimbPill(status?: string) {
  const s = (status || "pending").toLowerCase();
  const label = s === "reimbursed" ? "Paid" : s.charAt(0).toUpperCase() + s.slice(1);
  if (s === "paid" || s === "reimbursed" || s === "approved") {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700">
        {label}
      </span>
    );
  }
  if (s === "rejected") {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700">
      Pending
    </span>
  );
}

function DonutRing({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-muted/40"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">{clamped}%</span>
    </div>
  );
}

const emptyForm = {
  employeeId: "",
  purpose: "",
  destination: "",
  fromDate: new Date().toISOString().split("T")[0],
  toDate: new Date().toISOString().split("T")[0],
  description: "",
  expectedOutcomes: "",
  documentUrl: "",
  documentName: "",
  advanceAmount: "0",
  status: "planned",
  advanceStatus: "requested",
  reimbursementStatus: "pending",
  tripReport: "",
};

export default function HrTripsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const { formatCurrency: formatMoney } = useWorkspaceSettings();
  const queryClient = useQueryClient();

  // Filter & Expand State
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "planned" | "ongoing" | "completed" | "cancelled">("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [viewItem, setViewItem] = useState<any | null>(null);
  const [tripStatusModal, setTripStatusModal] = useState<any | null>(null);
  const [tripStatusValue, setTripStatusValue] = useState("planned");

  const [advanceStatusModal, setAdvanceStatusModal] = useState<any | null>(null);
  const [advanceStatusValue, setAdvanceStatusValue] = useState("requested");

  const [reimbStatusModal, setReimbStatusModal] = useState<any | null>(null);
  const [reimbStatusValue, setReimbStatusValue] = useState("pending");

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Queries
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-trips"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/trips");
      return unwrapArray(res);
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=300");
      return unwrapArray(res);
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post("/hr/lifecycle/trips", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Trip created successfully.");
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create trip.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/hr/lifecycle/trips/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Trip updated successfully.");
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update trip.");
    },
  });

  const tripStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/hr/lifecycle/trips/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Trip status updated.");
      setTripStatusModal(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update trip status.");
    },
  });

  const advanceStatusMutation = useMutation({
    mutationFn: async ({ id, advanceStatus }: { id: string; advanceStatus: string }) =>
      api.patch(`/hr/lifecycle/trips/${id}/advance-status`, { advanceStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Advance status updated.");
      setAdvanceStatusModal(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update advance status.");
    },
  });

  const reimbStatusMutation = useMutation({
    mutationFn: async ({ id, reimbursementStatus }: { id: string; reimbursementStatus: string }) =>
      api.patch(`/hr/lifecycle/trips/${id}/reimbursement-status`, { reimbursementStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Reimbursement status updated.");
      setReimbStatusModal(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update reimbursement status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/lifecycle/trips/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Trip deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete trip.");
    },
  });

  // Counts
  const counts = useMemo(() => {
    const c = { all: trips.length, planned: 0, ongoing: 0, completed: 0, cancelled: 0 };
    trips.forEach((t: any) => {
      c[normalizeTripStatus(t.status)] += 1;
    });
    return c;
  }, [trips]);

  // Filtering
  const filteredTrips = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...trips].filter((t: any) => {
      if (statusTab !== "all" && normalizeTripStatus(t.status) !== statusTab) return false;
      const name = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
      const email = (t.employee?.email || "").toLowerCase();
      const dest = (t.destination || "").toLowerCase();
      const purpose = (t.purpose || "").toLowerCase();
      if (q && !name.includes(q) && !email.includes(q) && !dest.includes(q) && !purpose.includes(q)) {
        return false;
      }
      if (employeeFilter !== "all" && t.employeeId !== employeeFilter) return false;

      const d = t.fromDate ? new Date(t.fromDate) : null;
      if (dateFrom && d && d < new Date(dateFrom)) return false;
      if (dateTo && d) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [trips, statusTab, search, employeeFilter, dateFrom, dateTo]);

  const paginatedTrips = filteredTrips.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditingItem(t);
    setFormData({
      employeeId: t.employeeId || "",
      purpose: t.purpose || "",
      destination: t.destination || "",
      fromDate: toInputDate(t.fromDate),
      toDate: toInputDate(t.toDate),
      description: t.description || "",
      expectedOutcomes: t.expectedOutcomes || "",
      documentUrl: t.documentUrl || "",
      documentName: t.documentName || "",
      advanceAmount: String(Number(t.advanceAmount || 0)),
      status: normalizeTripStatus(t.status),
      advanceStatus: (t.advanceStatus || "requested").toLowerCase(),
      reimbursementStatus: (t.reimbursementStatus || t.settlementStatus || "pending").toLowerCase(),
      tripReport: t.tripReport || "",
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.employeeId || !formData.purpose.trim() || !formData.destination.trim()) {
      toast.error("Employee, Purpose, and Destination are required.");
      return;
    }
    if (!formData.fromDate || !formData.toDate) {
      toast.error("Start Date and End Date are required.");
      return;
    }

    const payload = {
      ...formData,
      advanceAmount: Number(formData.advanceAmount) || 0,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const hasActiveFilters = Boolean(search || employeeFilter !== "all" || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch("");
    setEmployeeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Trips"
        description="Manage business trips and travel requests for employees."
        breadcrumbs={[
          { label: "Dashboard", href: isEmployeePortal ? "/me/dashboard" : "/hr/dashboard" },
          { label: "Employee Lifecycle", href: isEmployeePortal ? "/me/awards" : "/hr/lifecycle" },
          { label: "Trips" },
        ]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            {isEmployeePortal ? "Request Trip" : "Add Trip"}
          </Button>
        }
      />

      {/* 5 KPI Summary Cards (Reference Screenshot 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Trips</p>
            <p className="text-2xl font-bold text-foreground mt-1">{counts.all}</p>
            <p className="text-[11px] text-muted-foreground mt-1">• All business trips</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Planned</p>
            <p className="text-2xl font-bold text-foreground mt-1">{counts.planned}</p>
            <p className="text-[11px] text-blue-600 mt-1">Upcoming trips</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Plane className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Ongoing</p>
            <p className="text-2xl font-bold text-foreground mt-1">{counts.ongoing}</p>
            <p className="text-[11px] text-amber-600 mt-1">Currently in progress</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground mt-1">{counts.completed}</p>
            <p className="text-[11px] text-emerald-600 mt-1">Successfully completed</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-bold text-foreground mt-1">{counts.cancelled}</p>
            <p className="text-[11px] text-rose-600 mt-1">Trips not completed</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar + Status Tabs */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={employeeFilter}
            onValueChange={(val) => {
              setEmployeeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
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
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[155px] h-9"
            aria-label="Date From"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[155px] h-9"
            aria-label="Date To"
          />

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/60 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all", label: "All", count: counts.all, icon: LayoutGrid },
            { key: "planned", label: "Planned", count: counts.planned, icon: Calendar },
            { key: "ongoing", label: "Ongoing", count: counts.ongoing, icon: Clock },
            { key: "completed", label: "Completed", count: counts.completed, icon: CheckCircle2 },
            { key: "cancelled", label: "Cancelled", count: counts.cancelled, icon: XCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusTab(tab.key as any);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[11px] font-semibold",
                    active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table with Expandable Row Panel */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12 text-[11px] uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Destination</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Trip Period</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Advance</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Expenses</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Loading business trips...
                  </TableCell>
                </TableRow>
              ) : paginatedTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No business trips found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTrips.map((t: any, idx: number) => {
                  const fullName = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.trim() || "Unknown";
                  const initials = fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const avatarUrl = t.employee?.user?.profile?.avatarUrl || t.employee?.avatarUrl;
                  const days = calcDays(t.fromDate, t.toDate);
                  const advanceAmt = Number(t.advanceAmount || 0);
                  const totalExpenses = (t.expenses || []).reduce(
                    (sum: number, e: any) => sum + Number(e.amount || 0),
                    0
                  );
                  const settlement = advanceAmt - totalExpenses;
                  const pct = advanceAmt > 0 ? Math.min(100, Math.round((totalExpenses / advanceAmt) * 100)) : 0;
                  const isCancelled = normalizeTripStatus(t.status) === "cancelled";
                  const isExpanded = expandedRowId === t.id;

                  return (
                    <React.Fragment key={t.id}>
                      <TableRow className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium text-muted-foreground">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/60">
                              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {t.employee?.email || t.employee?.employeeCode || "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          {t.destination}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>
                              {formatDateSafe(t.fromDate)}–{formatDateSafe(t.toDate)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-5">
                            {days} {days === 1 ? "Day" : "Days"}
                          </p>
                        </TableCell>
                        <TableCell>{getTripStatusBadge(t.status)}</TableCell>
                        <TableCell>
                          <p className="font-semibold text-sm text-foreground">{formatMoney(advanceAmt)}</p>
                          <div className="mt-0.5">{getAdvancePill(t.advanceStatus)}</div>
                        </TableCell>
                        <TableCell>
                          {totalExpenses > 0 ? (
                            <>
                              <p className="font-semibold text-sm text-foreground">{formatMoney(totalExpenses)}</p>
                              <div className="mt-0.5">{getReimbPill(t.reimbursementStatus || t.settlementStatus)}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="View Trip Details"
                              onClick={() => setViewItem(t)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!isEmployeePortal && !isCancelled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                title="Edit Trip"
                                onClick={() => handleOpenEdit(t)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!isEmployeePortal && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                  title="Change Trip Status"
                                  onClick={() => {
                                    setTripStatusModal(t);
                                    setTripStatusValue(normalizeTripStatus(t.status));
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                {!isCancelled && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-purple-600"
                                      title="Change Advance Status"
                                      onClick={() => {
                                        setAdvanceStatusModal(t);
                                        setAdvanceStatusValue((t.advanceStatus || "requested").toLowerCase());
                                      }}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      asChild
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                                      title="Manage Trip Expenses"
                                    >
                                      <Link href={`/hr/lifecycle/trips/${t.id}/expenses`}>
                                        <Receipt className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                      title="Change Reimbursement Status"
                                      onClick={() => {
                                        setReimbStatusModal(t);
                                        setReimbStatusValue((t.reimbursementStatus || t.settlementStatus || "pending").toLowerCase());
                                      }}
                                    >
                                      <CreditCard className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Delete Trip"
                                  onClick={() => setDeleteTarget(t)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 ml-1 text-muted-foreground"
                              title={isExpanded ? "Collapse Summary" : "Expand Summary"}
                              onClick={() => setExpandedRowId(isExpanded ? null : t.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expandable 3-Column Summary Row (Reference Screenshot 13) */}
                      {isExpanded && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={8} className="p-4">
                            <div className="rounded-xl border border-border/80 bg-card p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Col 1: Trip Details */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                  <Briefcase className="h-4 w-4 text-emerald-600" />
                                  <span>Trip Details</span>
                                </div>
                                <div className="grid grid-cols-[90px_1fr] gap-y-2 text-xs">
                                  <span className="text-muted-foreground">Employee</span>
                                  <span className="font-semibold text-foreground">{fullName}</span>
                                  <span className="text-muted-foreground">Email</span>
                                  <span className="font-medium text-foreground truncate">{t.employee?.email || "—"}</span>
                                  <span className="text-muted-foreground">Destination</span>
                                  <span className="font-semibold text-foreground">{t.destination}</span>
                                  <span className="text-muted-foreground">Start Date</span>
                                  <span className="font-semibold text-foreground">{formatDateSafe(t.fromDate)}</span>
                                  <span className="text-muted-foreground">End Date</span>
                                  <span className="font-semibold text-foreground">{formatDateSafe(t.toDate)}</span>
                                  <span className="text-muted-foreground">Trip Status</span>
                                  <div>{getTripStatusBadge(t.status)}</div>
                                </div>
                              </div>

                              {/* Col 2: Financial Summary */}
                              <div className="space-y-3 lg:border-x lg:border-border/60 lg:px-6">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                  <DollarSign className="h-4 w-4 text-emerald-600" />
                                  <span>Financial Summary</span>
                                </div>
                                <div className="flex items-center gap-5">
                                  <DonutRing percentage={pct} />
                                  <div className="flex-1 space-y-2 text-xs">
                                    <div className="flex items-start justify-between">
                                      <span className="text-muted-foreground">Advance</span>
                                      <div className="text-right">
                                        <p className="font-semibold text-foreground">{formatMoney(advanceAmt)}</p>
                                        {getAdvancePill(t.advanceStatus)}
                                      </div>
                                    </div>
                                    <div className="flex items-start justify-between">
                                      <span className="text-muted-foreground">Expenses</span>
                                      <div className="text-right">
                                        <p className="font-semibold text-foreground">{formatMoney(totalExpenses)}</p>
                                        {totalExpenses > 0 && getReimbPill(t.reimbursementStatus || t.settlementStatus)}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
                                      <span className="text-muted-foreground">Settlement</span>
                                      <span className="font-semibold text-foreground">{formatMoney(settlement)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-foreground">Net Balance</span>
                                      <span className="font-bold text-emerald-600">{formatMoney(settlement)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Col 3: Trip Timeline */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                  <Clock className="h-4 w-4 text-emerald-600" />
                                  <span>Trip Timeline</span>
                                </div>
                                <div className="space-y-3 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                      Created
                                    </span>
                                    <span className="text-muted-foreground">{formatDateSafe(t.createdAt)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                      <span className={cn("h-2 w-2 rounded-full", t.approvedAt || normalizeTripStatus(t.status) !== "planned" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                                      Approved
                                    </span>
                                    <span className="text-muted-foreground">{formatDateSafe(t.approvedAt || t.updatedAt)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                      <span className={cn("h-2 w-2 rounded-full", ["ongoing", "completed"].includes(normalizeTripStatus(t.status)) ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                                      Trip Started
                                    </span>
                                    <span className="text-muted-foreground">{formatDateSafe(t.fromDate)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                      <span className={cn("h-2 w-2 rounded-full", normalizeTripStatus(t.status) === "completed" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                                      Completed
                                    </span>
                                    <span className="text-muted-foreground">{formatDateSafe(t.toDate)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <StandardPagination
          page={page}
          pageSize={pageSize}
          total={filteredTrips.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Add / Edit Trip Modal (Reference Screenshots 14 & 15) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Trip" : "Add New Trip"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Purpose <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Market Research, Client Meeting"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Destination <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Toronto, Canada"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Conducting market research, competitor analysis..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Expected Outcomes</Label>
              <Textarea
                rows={3}
                placeholder="Expected deliverables and business outcomes..."
                value={formData.expectedOutcomes}
                onChange={(e) => setFormData({ ...formData, expectedOutcomes: e.target.value })}
              />
            </div>

            <LifecycleDocumentField
              label="Documents"
              folder="tenant/trips"
              documentUrl={formData.documentUrl}
              documentName={formData.documentName}
              onChange={(url, name) => setFormData({ ...formData, documentUrl: url, documentName: name })}
            />

            <div className="space-y-1.5">
              <Label>Advance Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.advanceAmount}
                onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Advance Status</Label>
              <Select
                value={formData.advanceStatus}
                onValueChange={(val) => setFormData({ ...formData, advanceStatus: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reimbursement Status</Label>
              <Select
                value={formData.reimbursementStatus}
                onValueChange={(val) => setFormData({ ...formData, reimbursementStatus: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Trip Report</Label>
              <Textarea
                rows={3}
                placeholder="Post-trip summary and findings..."
                value={formData.tripReport}
                onChange={(e) => setFormData({ ...formData, tripReport: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trip Details Modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Plane className="h-4 w-4" />
              </span>
              Trip Details
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Employee</p>
                  <p className="font-semibold">
                    {viewItem.employee?.firstName} {viewItem.employee?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-semibold">{viewItem.destination}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Purpose</p>
                  <p className="font-semibold">{viewItem.purpose}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5">{getTripStatusBadge(viewItem.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{formatDateSafe(viewItem.fromDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="font-semibold">{formatDateSafe(viewItem.toDate)}</p>
                </div>
              </div>

              <DocumentPreviewBlock
                url={viewItem.documentUrl}
                name={viewItem.documentName}
                label="Documents"
              />

              {viewItem.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{viewItem.description}</p>
                </div>
              )}

              {viewItem.expectedOutcomes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expected Outcomes</p>
                  <p className="text-sm text-foreground">{viewItem.expectedOutcomes}</p>
                </div>
              )}

              {viewItem.tripReport && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trip Report</p>
                  <p className="text-sm text-foreground">{viewItem.tripReport}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewItem(null)}>
                  Close
                </Button>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  <Link href={`/hr/lifecycle/trips/${viewItem.id}/expenses`}>
                    <Receipt className="h-4 w-4" />
                    Manage Expenses
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Trip Status Modal */}
      <Dialog open={!!tripStatusModal} onOpenChange={(open) => !open && setTripStatusModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Trip Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select value={tripStatusValue} onValueChange={setTripStatusValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTripStatusModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                tripStatusModal &&
                tripStatusMutation.mutate({ id: tripStatusModal.id, status: tripStatusValue })
              }
              disabled={tripStatusMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {tripStatusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Advance Status Modal */}
      <Dialog open={!!advanceStatusModal} onOpenChange={(open) => !open && setAdvanceStatusModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Advance Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>
                Advance Status <span className="text-destructive">*</span>
              </Label>
              <Select value={advanceStatusValue} onValueChange={setAdvanceStatusValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdvanceStatusModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                advanceStatusModal &&
                advanceStatusMutation.mutate({
                  id: advanceStatusModal.id,
                  advanceStatus: advanceStatusValue,
                })
              }
              disabled={advanceStatusMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {advanceStatusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Reimbursement Status Modal */}
      <Dialog open={!!reimbStatusModal} onOpenChange={(open) => !open && setReimbStatusModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Reimbursement Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>
                Reimbursement Status <span className="text-destructive">*</span>
              </Label>
              <Select value={reimbStatusValue} onValueChange={setReimbStatusValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReimbStatusModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                reimbStatusModal &&
                reimbStatusMutation.mutate({
                  id: reimbStatusModal.id,
                  reimbursementStatus: reimbStatusValue,
                })
              }
              disabled={reimbStatusMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {reimbStatusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Business Trip"
        description="Are you sure you want to delete this trip and all its associated expenses? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
