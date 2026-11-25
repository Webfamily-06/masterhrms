'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileText,
  ArrowUpDown,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
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

function normalizeStatus(status?: string): "pending" | "approved" | "rejected" | "completed" {
  const s = (status || "pending").toLowerCase();
  if (s === "approved" || s === "serving_notice" || s === "clearance_pending") return "approved";
  if (s === "rejected" || s === "withdrawn") return "rejected";
  if (s === "completed" || s === "exited") return "completed";
  return "pending";
}

function getStatusBadge(status?: string) {
  const s = normalizeStatus(status);
  if (s === "approved") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
        Approved
      </Badge>
    );
  }
  if (s === "rejected") {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium">
        Rejected
      </Badge>
    );
  }
  if (s === "completed") {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
        Completed
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium">
      Pending
    </Badge>
  );
}

const emptyForm = {
  employeeId: "",
  resignationDate: new Date().toISOString().split("T")[0],
  lastWorkingDay: "",
  noticePeriodLabel: "30 days",
  reason: "",
  description: "",
  documentUrl: "",
  documentName: "",
  status: "pending",
  exitInterviewConducted: false,
  exitInterviewDate: "",
  exitInterviewNotes: "",
};

export default function HrResignationsPage() {
  const queryClient = useQueryClient();

  // Filter & Sort State
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "approved" | "rejected" | "completed">("all");
  const [sortField, setSortField] = useState<"resignationDate" | "lastWorkingDay">("resignationDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [viewItem, setViewItem] = useState<any | null>(null);

  const [statusModalItem, setStatusModalItem] = useState<any | null>(null);
  const [statusForm, setStatusForm] = useState({
    status: "pending",
    exitInterviewConducted: false,
    exitInterviewDate: "",
    exitInterviewNotes: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Queries
  const { data: resignations = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-resignations"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/resignations");
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
    mutationFn: async (payload: any) => api.post("/hr/lifecycle/resignations", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-resignations"] });
      toast.success("Resignation request created.");
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create resignation.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/hr/lifecycle/resignations/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-resignations"] });
      toast.success("Resignation updated.");
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update resignation.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.patch(`/hr/lifecycle/resignations/${id}/status`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-resignations"] });
      toast.success("Resignation status updated.");
      setStatusModalItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/lifecycle/resignations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-resignations"] });
      toast.success("Resignation record deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete resignation.");
    },
  });

  // Counts
  const counts = useMemo(() => {
    const c = { all: resignations.length, pending: 0, approved: 0, rejected: 0, completed: 0 };
    resignations.forEach((r: any) => {
      c[normalizeStatus(r.status)] += 1;
    });
    return c;
  }, [resignations]);

  // Filtering + Sorting
  const filteredResignations = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...resignations]
      .filter((r: any) => {
        if (statusTab !== "all" && normalizeStatus(r.status) !== statusTab) return false;
        const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
        const email = (r.employee?.email || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        if (q && !name.includes(q) && !email.includes(q) && !reason.includes(q)) return false;
        if (employeeFilter !== "all" && r.employeeId !== employeeFilter) return false;

        const d = r.resignationDate ? new Date(r.resignationDate) : null;
        if (dateFrom && d && d < new Date(dateFrom)) return false;
        if (dateTo && d) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const aVal = new Date(a[sortField] || 0).getTime();
        const bVal = new Date(b[sortField] || 0).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [resignations, statusTab, search, employeeFilter, dateFrom, dateTo, sortField, sortDir]);

  const paginated = filteredResignations.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: "resignationDate" | "lastWorkingDay") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (r: any) => {
    setEditingItem(r);
    setFormData({
      employeeId: r.employeeId || "",
      resignationDate: toInputDate(r.resignationDate),
      lastWorkingDay: toInputDate(r.lastWorkingDay),
      noticePeriodLabel: r.noticePeriodLabel || `${r.noticePeriodDays || 30} days`,
      reason: r.reason || "",
      description: r.description || "",
      documentUrl: r.documentUrl || "",
      documentName: r.documentName || "",
      status: normalizeStatus(r.status),
      exitInterviewConducted: Boolean(r.exitInterviewConducted),
      exitInterviewDate: toInputDate(r.exitInterviewDate),
      exitInterviewNotes: r.exitInterviewNotes || "",
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = () => {
    if (!formData.employeeId || !formData.resignationDate || !formData.reason.trim()) {
      toast.error("Employee, Resignation Date, and Reason are required.");
      return;
    }

    const payload = {
      ...formData,
      lastWorkingDay: formData.lastWorkingDay || undefined,
      exitInterviewDate: formData.exitInterviewDate || null,
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
        title="Resignations"
        description="View and manage employee resignation requests."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Employee Lifecycle", href: "/hr/lifecycle" },
          { label: "Resignations" },
        ]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            Add Resignation
          </Button>
        }
      />

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
            { key: "pending", label: "Pending", count: counts.pending, icon: Clock },
            { key: "approved", label: "Approved", count: counts.approved, icon: CheckCircle2 },
            { key: "rejected", label: "Rejected", count: counts.rejected, icon: XCircle },
            { key: "completed", label: "Completed", count: counts.completed, icon: CheckCircle2 },
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

      {/* Data Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12 text-[11px] uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                  onClick={() => toggleSort("resignationDate")}
                >
                  <span className="inline-flex items-center gap-1">
                    Resignation Date <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                  onClick={() => toggleSort("lastWorkingDay")}
                >
                  <span className="inline-flex items-center gap-1">
                    Last Working Day <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Notice Period</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">Documents</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Loading resignations...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No resignations found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((r: any, idx: number) => {
                  const fullName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim() || "Unknown";
                  const initials = fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const avatarUrl = r.employee?.user?.profile?.avatarUrl || r.employee?.avatarUrl;

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
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
                              {r.employee?.email || r.employee?.employeeCode || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(r.resignationDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(r.lastWorkingDay)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {r.noticePeriodLabel || `${r.noticePeriodDays || 30} days`}
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-center">
                        {r.documentUrl ? (
                          <a
                            href={r.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title={r.documentName || "View Document"}
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="View Details"
                            onClick={() => setViewItem(r)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Edit Resignation"
                            onClick={() => handleOpenEdit(r)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                            title="Change Resignation Status"
                            onClick={() => {
                              setStatusModalItem(r);
                              setStatusForm({
                                status: normalizeStatus(r.status),
                                exitInterviewConducted: Boolean(r.exitInterviewConducted),
                                exitInterviewDate: toInputDate(r.exitInterviewDate),
                                exitInterviewNotes: r.exitInterviewNotes || "",
                              });
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete Resignation"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <StandardPagination
          page={page}
          pageSize={pageSize}
          total={filteredResignations.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Add / Edit Resignation Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Resignation" : "Add New Resignation"}</DialogTitle>
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
                  <SelectValue placeholder="Select Employee" />
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
                Resignation Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.resignationDate}
                onChange={(e) => setFormData({ ...formData, resignationDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Personal reasons, Better opportunity"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Additional details about the resignation..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <LifecycleDocumentField
              label="Documents"
              folder="tenant/resignations"
              documentUrl={formData.documentUrl}
              documentName={formData.documentName}
              onChange={(url, name) => setFormData({ ...formData, documentUrl: url, documentName: name })}
            />

            {editingItem && (
              <div className="pt-3 border-t border-border/60 space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    Last Working Day <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.lastWorkingDay}
                    onChange={(e) => setFormData({ ...formData, lastWorkingDay: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Notice Period <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. 2 weeks, 1 month, 30 days"
                    value={formData.noticePeriodLabel}
                    onChange={(e) => setFormData({ ...formData, noticePeriodLabel: e.target.value })}
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="res-exit-interview"
                    checked={formData.exitInterviewConducted}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, exitInterviewConducted: Boolean(checked) })
                    }
                  />
                  <Label htmlFor="res-exit-interview" className="cursor-pointer font-medium">
                    Exit Interview Conducted
                  </Label>
                </div>

                <div className="space-y-1.5">
                  <Label>Exit Interview Date</Label>
                  <Input
                    type="date"
                    value={formData.exitInterviewDate}
                    onChange={(e) => setFormData({ ...formData, exitInterviewDate: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Exit Feedback</Label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Employee feedback during exit interview..."
                    value={formData.exitInterviewNotes}
                    onChange={(e) => setFormData({ ...formData, exitInterviewNotes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveForm}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resignation Details Modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <LogOut className="h-4 w-4" />
              </span>
              Resignation Details
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {(viewItem.employee?.user?.profile?.avatarUrl || viewItem.employee?.avatarUrl) && (
                      <AvatarImage
                        src={viewItem.employee?.user?.profile?.avatarUrl || viewItem.employee?.avatarUrl}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {`${viewItem.employee?.firstName?.[0] || ""}${viewItem.employee?.lastName?.[0] || ""}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Employee</p>
                    <p className="font-semibold text-sm text-foreground">
                      {viewItem.employee?.firstName} {viewItem.employee?.lastName}
                    </p>
                  </div>
                </div>
                {getStatusBadge(viewItem.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Resignation Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateSafe(viewItem.resignationDate)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Last Working Day</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateSafe(viewItem.lastWorkingDay)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Notice Period</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {viewItem.noticePeriodLabel || `${viewItem.noticePeriodDays || 30} days`}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Reason</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{viewItem.reason}</p>
                </div>
              </div>

              <DocumentPreviewBlock
                url={viewItem.documentUrl}
                name={viewItem.documentName}
                label="Documents"
              />

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Description</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {viewItem.description || "—"}
                </p>
              </div>

              {viewItem.exitInterviewConducted && (
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1 text-xs">
                  <p className="font-semibold text-foreground">
                    Exit Interview Conducted {viewItem.exitInterviewDate ? `(${formatDateSafe(viewItem.exitInterviewDate)})` : ""}
                  </p>
                  {viewItem.exitInterviewNotes && (
                    <p className="text-muted-foreground">{viewItem.exitInterviewNotes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Resignation Status Modal */}
      <Dialog open={!!statusModalItem} onOpenChange={(open) => !open && setStatusModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Resignation Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={statusForm.status}
                onValueChange={(val) => setStatusForm({ ...statusForm, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="status-exit-interview"
                checked={statusForm.exitInterviewConducted}
                onCheckedChange={(checked) =>
                  setStatusForm({ ...statusForm, exitInterviewConducted: Boolean(checked) })
                }
              />
              <Label htmlFor="status-exit-interview" className="cursor-pointer font-medium">
                Exit Interview Conducted
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label>Exit Interview Date</Label>
              <Input
                type="date"
                value={statusForm.exitInterviewDate}
                onChange={(e) => setStatusForm({ ...statusForm, exitInterviewDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Exit Feedback</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Employee feedback during exit interview..."
                value={statusForm.exitInterviewNotes}
                onChange={(e) => setStatusForm({ ...statusForm, exitInterviewNotes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStatusModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (statusModalItem) {
                  statusMutation.mutate({
                    id: statusModalItem.id,
                    payload: {
                      ...statusForm,
                      exitInterviewDate: statusForm.exitInterviewDate || null,
                    },
                  });
                }
              }}
              disabled={statusMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {statusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Resignation"
        description="Are you sure you want to delete this resignation record? This action cannot be undone."
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
