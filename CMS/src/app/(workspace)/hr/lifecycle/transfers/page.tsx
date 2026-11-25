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
  CheckCircle2,
  XCircle,
  Trash2,
  Calendar,
  FileText,
  ArrowRight,
  ArrowUpDown,
  ArrowLeftRight,
  Building2,
  Briefcase,
  GitBranch,
  Clock,
  LayoutGrid,
  Lock,
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

function normalizeStatus(status?: string) {
  const s = (status || "PENDING").toUpperCase();
  if (s === "COMPLETED" || s === "APPROVED") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";
  return "PENDING";
}

function getStatusBadge(status?: string) {
  const s = normalizeStatus(status);
  if (s === "APPROVED") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
        Approved
      </Badge>
    );
  }
  if (s === "REJECTED") {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium">
        Rejected
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
  toBranchId: "",
  toDeptId: "",
  toDesignationId: "",
  transferDate: new Date().toISOString().split("T")[0],
  effectiveDate: new Date().toISOString().split("T")[0],
  reason: "",
  notes: "",
  documentUrl: "",
  documentName: "",
};

export default function HrTransfersPage() {
  const queryClient = useQueryClient();

  // Filter & Sort State
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");
  const [sortField, setSortField] = useState<"transferDate" | "effectiveDate">("transferDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [viewItem, setViewItem] = useState<any | null>(null);
  const [statusAction, setStatusAction] = useState<{ item: any; status: "APPROVED" | "REJECTED" } | null>(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Queries
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-transfers"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/transfers");
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

  const { data: branches = [] } = useQuery({
    queryKey: ["hr-branches-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches?limit=200");
      return unwrapArray(res);
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hr-departments-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments?limit=200");
      return unwrapArray(res);
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["hr-designations-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/designations?limit=200");
      return unwrapArray(res);
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post("/hr/lifecycle/transfers", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-transfers"] });
      toast.success("Employee transfer created.");
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create transfer.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/hr/lifecycle/transfers/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-transfers"] });
      toast.success("Transfer updated successfully.");
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update transfer.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "APPROVED" | "REJECTED"; notes?: string }) =>
      api.patch(`/hr/lifecycle/transfers/${id}/status`, { status, notes }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employees-list-quick"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(
        vars.status === "APPROVED"
          ? "Transfer approved and employee assignment updated."
          : "Transfer rejected."
      );
      setStatusAction(null);
      setStatusNotes("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update transfer status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/lifecycle/transfers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-transfers"] });
      toast.success("Transfer record deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete transfer.");
    },
  });

  // Status counts
  const counts = useMemo(() => {
    const c = { all: transfers.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    transfers.forEach((t: any) => {
      const s = normalizeStatus(t.status);
      c[s] += 1;
    });
    return c;
  }, [transfers]);

  // Filtering + Sorting
  const filteredTransfers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...transfers]
      .filter((t: any) => {
        const s = normalizeStatus(t.status);
        if (statusTab !== "all" && s !== statusTab) return false;

        const name = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
        const email = (t.employee?.email || "").toLowerCase();
        const code = (t.employee?.employeeCode || "").toLowerCase();
        const branchText = `${t.fromBranchName || ""} ${t.toBranchName || ""}`.toLowerCase();
        const deptText = `${t.fromDeptName || ""} ${t.toDeptName || ""}`.toLowerCase();
        const reason = (t.reason || "").toLowerCase();
        if (
          q &&
          !name.includes(q) &&
          !email.includes(q) &&
          !code.includes(q) &&
          !branchText.includes(q) &&
          !deptText.includes(q) &&
          !reason.includes(q)
        ) {
          return false;
        }

        if (deptFilter !== "all" && t.toDeptId !== deptFilter && t.fromDeptId !== deptFilter) {
          return false;
        }

        const tDate = new Date(t.transferDate || t.effectiveDate || 0);
        if (dateFrom && tDate < new Date(dateFrom)) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (tDate > end) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        const aVal = new Date(a[sortField] || a.effectiveDate || 0).getTime();
        const bVal = new Date(b[sortField] || b.effectiveDate || 0).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [transfers, statusTab, search, deptFilter, dateFrom, dateTo, sortField, sortDir]);

  const paginatedTransfers = filteredTransfers.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: "transferDate" | "effectiveDate") => {
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

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      employeeId: item.employeeId || "",
      toBranchId: item.toBranchId || "",
      toDeptId: item.toDeptId || "",
      toDesignationId: item.toDesignationId || "",
      transferDate: toInputDate(item.transferDate || item.createdAt),
      effectiveDate: toInputDate(item.effectiveDate),
      reason: item.reason || "",
      notes: item.notes || "",
      documentUrl: item.documentUrl || "",
      documentName: item.documentName || "",
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!formData.toBranchId && !formData.toDeptId && !formData.toDesignationId) {
      toast.error("Please select a target branch, department, or designation.");
      return;
    }
    if (!formData.transferDate || !formData.effectiveDate) {
      toast.error("Transfer Date and Effective Date are required.");
      return;
    }
    if (!formData.reason.trim()) {
      toast.error("Please provide a transfer reason.");
      return;
    }

    const matchedDesig = designations.find((d: any) => d.id === formData.toDesignationId);
    const payload = {
      ...formData,
      toDesignation: matchedDesig?.name || undefined,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const hasActiveFilters = Boolean(search || deptFilter !== "all" || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch("");
    setDeptFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Employee Transfers"
        description="Manage employee transfers between departments and branches."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Employee Lifecycle", href: "/hr/lifecycle" },
          { label: "Employee Transfers" },
        ]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            Add Transfer
          </Button>
        }
      />

      {/* Filter Card + Status Tabs */}
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
            value={deptFilter}
            onValueChange={(val) => {
              setDeptFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
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
            { key: "PENDING", label: "Pending", count: counts.PENDING, icon: Clock },
            { key: "APPROVED", label: "Approved", count: counts.APPROVED, icon: CheckCircle2 },
            { key: "REJECTED", label: "Rejected", count: counts.REJECTED, icon: XCircle },
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
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">From → To</TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                  onClick={() => toggleSort("transferDate")}
                >
                  <span className="inline-flex items-center gap-1">
                    Transfer Date <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                  onClick={() => toggleSort("effectiveDate")}
                >
                  <span className="inline-flex items-center gap-1">
                    Effective Date <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">Documents</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Loading transfers...
                  </TableCell>
                </TableRow>
              ) : paginatedTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No employee transfers found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransfers.map((t: any, idx: number) => {
                  const fullName = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.trim() || "Unknown";
                  const initials = fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const avatarUrl = t.employee?.user?.profile?.avatarUrl || t.employee?.avatarUrl;
                  const normalizedStatus = normalizeStatus(t.status);

                  return (
                    <TableRow key={t.id} className="hover:bg-muted/40 transition-colors">
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
                      <TableCell>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[10px] w-12 text-center shrink-0">
                              Branch
                            </span>
                            <span className="text-muted-foreground">{t.fromBranchName || "—"}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-foreground">{t.toBranchName || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[10px] w-12 text-center shrink-0">
                              Dept
                            </span>
                            <span className="text-muted-foreground">{t.fromDeptName || "—"}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-foreground">{t.toDeptName || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[10px] w-12 text-center shrink-0">
                              Role
                            </span>
                            <span className="text-muted-foreground">{t.fromDesignationName || "—"}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-foreground">{t.toDesignationName || "—"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(t.transferDate || t.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(t.effectiveDate)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-center">
                        {t.documentUrl ? (
                          <a
                            href={t.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title={t.documentName || "View Document"}
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
                            onClick={() => setViewItem(t)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {normalizedStatus === "PENDING" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                title="Edit Transfer"
                                onClick={() => handleOpenEdit(t)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                                title="Approve Transfer"
                                onClick={() => setStatusAction({ item: t, status: "APPROVED" })}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                                title="Reject Transfer"
                                onClick={() => setStatusAction({ item: t, status: "REJECTED" })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Delete Transfer"
                                onClick={() => setDeleteTarget(t)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
          total={filteredTransfers.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Add / Edit Transfer Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Transfer" : "Add New Transfer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
                disabled={!!editingItem}
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
                To Branch <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.toBranchId}
                onValueChange={(val) => setFormData({ ...formData, toBranchId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select to branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                To Department <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.toDeptId}
                onValueChange={(val) => setFormData({ ...formData, toDeptId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select to department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>To Designation</Label>
              <Select
                value={formData.toDesignationId}
                onValueChange={(val) => setFormData({ ...formData, toDesignationId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select to designation" />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Transfer Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.transferDate}
                onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Effective Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="e.g. Business expansion, Employee request, Restructuring..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                placeholder="Additional transfer notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <LifecycleDocumentField
              label="Documents"
              folder="tenant/transfers"
              documentUrl={formData.documentUrl}
              documentName={formData.documentName}
              onChange={(url, name) => setFormData({ ...formData, documentUrl: url, documentName: name })}
            />
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

      {/* Transfer Details Modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ArrowLeftRight className="h-4 w-4" />
              </span>
              Transfer Details
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 py-2">
              {/* Branch Transfer */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Branch Transfer</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-xl p-3 bg-rose-500/5 border border-rose-500/15">
                    <p className="text-[11px] text-muted-foreground">From</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">
                      {viewItem.fromBranchName || "—"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-emerald-600" />
                  <div className="rounded-xl p-3 bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-[11px] text-muted-foreground">To</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">
                      {viewItem.toBranchName || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Department Transfer */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Department Transfer</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-xl p-3 bg-rose-500/5 border border-rose-500/15">
                    <p className="text-[11px] text-muted-foreground">From</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">
                      {viewItem.fromDeptName || "—"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-emerald-600" />
                  <div className="rounded-xl p-3 bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-[11px] text-muted-foreground">To</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">
                      {viewItem.toDeptName || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Designation Transfer */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Designation Transfer</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-xl p-3 bg-rose-500/5 border border-rose-500/15">
                    <p className="text-[11px] text-muted-foreground">From</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">
                      {viewItem.fromDesignationName || "—"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-emerald-600" />
                  <div className="rounded-xl p-3 bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-[11px] text-muted-foreground">To</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">
                      {viewItem.toDesignationName || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Transfer Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateSafe(viewItem.transferDate || viewItem.createdAt)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Effective Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateSafe(viewItem.effectiveDate)}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Status</span>
                </div>
                <div>{getStatusBadge(viewItem.status)}</div>
              </div>

              {/* Documents */}
              <DocumentPreviewBlock
                url={viewItem.documentUrl}
                name={viewItem.documentName}
                label="Documents"
              />

              {/* Reason */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Reason</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {viewItem.reason || "—"}
                </p>
              </div>

              {/* Notes */}
              {viewItem.notes && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Notes</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{viewItem.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve / Reject Transfer Modal with Notes Input */}
      <Dialog
        open={!!statusAction}
        onOpenChange={(open) => {
          if (!open) {
            setStatusAction(null);
            setStatusNotes("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusAction?.status === "APPROVED" ? "Approve Employee Transfer" : "Reject Employee Transfer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {statusAction && (
              <p className="text-sm text-muted-foreground">
                {statusAction.status === "APPROVED"
                  ? `Approving this transfer will update ${statusAction.item?.employee?.firstName || "the employee"}'s branch, department, and designation accordingly.`
                  : `Please provide any notes for rejecting ${statusAction.item?.employee?.firstName || "the employee"}'s transfer request.`}
              </p>
            )}
            <div className="space-y-1.5">
              <Label>
                Notes {statusAction?.status === "REJECTED" && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                rows={3}
                placeholder={
                  statusAction?.status === "APPROVED"
                    ? "e.g. Approved as per business expansion plan..."
                    : "e.g. Reason for rejecting transfer request..."
                }
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatusAction(null);
                setStatusNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={statusMutation.isPending}
              className={
                statusAction?.status === "REJECTED"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
              onClick={() => {
                if (!statusAction) return;
                if (statusAction.status === "REJECTED" && !statusNotes.trim()) {
                  toast.error("Please enter notes for rejecting this transfer.");
                  return;
                }
                statusMutation.mutate({
                  id: statusAction.item.id,
                  status: statusAction.status,
                  notes: statusNotes.trim() || undefined,
                });
              }}
            >
              {statusMutation.isPending
                ? "Saving..."
                : statusAction?.status === "APPROVED"
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Transfer Record"
        description="Are you sure you want to delete this employee transfer record? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
