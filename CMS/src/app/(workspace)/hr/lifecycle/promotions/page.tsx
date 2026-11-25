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
  RefreshCw,
  Trash2,
  Calendar,
  FileText,
  ArrowRight,
  ArrowUpDown,
  Briefcase,
  TrendingUp,
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

function getStatusBadge(status?: string) {
  const s = (status || "pending").toLowerCase();
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
  return (
    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium">
      Pending
    </Badge>
  );
}

const emptyForm = {
  employeeId: "",
  previousDesignation: "",
  newDesignation: "",
  promotionDate: new Date().toISOString().split("T")[0],
  effectiveDate: new Date().toISOString().split("T")[0],
  remarks: "",
  documentUrl: "",
  documentName: "",
  status: "pending",
};

export default function HrPromotionsPage() {
  const queryClient = useQueryClient();

  // Filter & Sort State
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [sortField, setSortField] = useState<"promotionDate" | "effectiveDate">("promotionDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [viewItem, setViewItem] = useState<any | null>(null);
  const [statusModalItem, setStatusModalItem] = useState<any | null>(null);
  const [newStatusValue, setNewStatusValue] = useState("pending");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Queries
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-promotions"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/promotions");
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

  const { data: designations = [] } = useQuery({
    queryKey: ["hr-designations-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/designations?limit=200");
      return unwrapArray(res);
    },
  });

  // Designation options combining master designations + existing values
  const designationOptions = useMemo(() => {
    const set = new Set<string>();
    designations.forEach((d: any) => d?.name && set.add(d.name));
    promotions.forEach((p: any) => {
      if (p.previousDesignation) set.add(p.previousDesignation);
      if (p.newDesignation) set.add(p.newDesignation);
    });
    employees.forEach((e: any) => {
      if (e.designation?.name) set.add(e.designation.name);
      else if (e.position) set.add(e.position);
    });
    return Array.from(set).sort();
  }, [designations, promotions, employees]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post("/hr/lifecycle/promotions", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-promotions"] });
      toast.success("Promotion created successfully.");
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create promotion.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/hr/lifecycle/promotions/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-promotions"] });
      toast.success("Promotion updated successfully.");
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update promotion.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/hr/lifecycle/promotions/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employees-list-quick"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Promotion status updated.");
      setStatusModalItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/lifecycle/promotions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-promotions"] });
      toast.success("Promotion record deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete promotion.");
    },
  });

  // Status counts
  const counts = useMemo(() => {
    const c = { all: promotions.length, pending: 0, approved: 0, rejected: 0 };
    promotions.forEach((p: any) => {
      const s = (p.status || "pending").toLowerCase();
      if (s === "approved") c.approved += 1;
      else if (s === "rejected") c.rejected += 1;
      else c.pending += 1;
    });
    return c;
  }, [promotions]);

  // Filtering + Sorting
  const filteredPromotions = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...promotions]
      .filter((p: any) => {
        const s = (p.status || "pending").toLowerCase();
        if (statusTab !== "all" && s !== statusTab) return false;

        const name = `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.toLowerCase();
        const email = (p.employee?.email || "").toLowerCase();
        const code = (p.employee?.employeeCode || "").toLowerCase();
        const prev = (p.previousDesignation || "").toLowerCase();
        const next = (p.newDesignation || "").toLowerCase();
        if (q && !name.includes(q) && !email.includes(q) && !code.includes(q) && !prev.includes(q) && !next.includes(q)) {
          return false;
        }

        if (
          designationFilter !== "all" &&
          p.newDesignation !== designationFilter &&
          p.previousDesignation !== designationFilter
        ) {
          return false;
        }

        const pDate = p.promotionDate ? new Date(p.promotionDate) : null;
        if (dateFrom && pDate && pDate < new Date(dateFrom)) return false;
        if (dateTo && pDate) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (pDate > end) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        const aVal = new Date(a[sortField] || a.promotionDate || 0).getTime();
        const bVal = new Date(b[sortField] || b.promotionDate || 0).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [promotions, statusTab, search, designationFilter, dateFrom, dateTo, sortField, sortDir]);

  const paginatedPromotions = filteredPromotions.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: "promotionDate" | "effectiveDate") => {
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
      previousDesignation: item.previousDesignation || "",
      newDesignation: item.newDesignation || "",
      promotionDate: toInputDate(item.promotionDate),
      effectiveDate: toInputDate(item.effectiveDate || item.promotionDate),
      remarks: item.remarks || "",
      documentUrl: item.documentUrl || "",
      documentName: item.documentName || "",
      status: (item.status || "pending").toLowerCase(),
    });
    setIsFormOpen(true);
  };

  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find((e: any) => e.id === empId);
    const currentDesig = emp?.designation?.name || emp?.position || "";
    setFormData((prev) => ({
      ...prev,
      employeeId: empId,
      previousDesignation: currentDesig || prev.previousDesignation,
    }));
  };

  const handleSave = () => {
    if (!formData.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!formData.newDesignation) {
      toast.error("Please select a new designation.");
      return;
    }
    if (!formData.promotionDate || !formData.effectiveDate) {
      toast.error("Promotion Date and Effective Date are required.");
      return;
    }

    const matchedDesig = designations.find((d: any) => d.name === formData.newDesignation);
    const payload = {
      ...formData,
      newDesignationId: matchedDesig?.id,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const hasActiveFilters = Boolean(search || designationFilter !== "all" || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch("");
    setDesignationFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Promotions"
        description="Manage employee promotions and career advancements."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Employee Lifecycle", href: "/hr/lifecycle" },
          { label: "Promotions" },
        ]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            Add Promotion
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
            value={designationFilter}
            onValueChange={(val) => {
              setDesignationFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="All Designations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Designations</SelectItem>
              {designationOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
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
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Previous Designation</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">New Designation</TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                  onClick={() => toggleSort("promotionDate")}
                >
                  <span className="inline-flex items-center gap-1">
                    Promotion Date <ArrowUpDown className="h-3 w-3" />
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
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">Document</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Loading promotions...
                  </TableCell>
                </TableRow>
              ) : paginatedPromotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No promotions found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPromotions.map((p: any, idx: number) => {
                  const fullName = `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.trim() || "Unknown";
                  const initials = fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const avatarUrl = p.employee?.user?.profile?.avatarUrl || p.employee?.avatarUrl;

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
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
                              {p.employee?.email || p.employee?.employeeCode || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{p.previousDesignation || "—"}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{p.newDesignation || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(p.promotionDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(p.effectiveDate || p.promotionDate)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-center">
                        {p.documentUrl ? (
                          <a
                            href={p.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title={p.documentName || "View Document"}
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
                            onClick={() => setViewItem(p)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Edit Promotion"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                            title="Update Status"
                            onClick={() => {
                              setStatusModalItem(p);
                              setNewStatusValue((p.status || "pending").toLowerCase());
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete Promotion"
                            onClick={() => setDeleteTarget(p)}
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
          total={filteredPromotions.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Add / Edit Promotion Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Promotion" : "Add New Promotion"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.employeeId} onValueChange={handleEmployeeSelect}>
                <SelectTrigger>
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
              <Label>
                Previous Designation <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.previousDesignation}
                onValueChange={(val) => setFormData({ ...formData, previousDesignation: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select previous designation" />
                </SelectTrigger>
                <SelectContent>
                  {designationOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                New Designation <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.newDesignation}
                onValueChange={(val) => setFormData({ ...formData, newDesignation: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select New Designation" />
                </SelectTrigger>
                <SelectContent>
                  {designationOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Promotion Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.promotionDate}
                onChange={(e) => setFormData({ ...formData, promotionDate: e.target.value })}
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
              <Label>Reason for Promotion</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Exceptional performance and leadership skills..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>

            <LifecycleDocumentField
              label="Document"
              folder="tenant/promotions"
              documentUrl={formData.documentUrl}
              documentName={formData.documentName}
              onChange={(url, name) => setFormData({ ...formData, documentUrl: url, documentName: name })}
            />

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
                </SelectContent>
              </Select>
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

      {/* Promotion Details Modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </span>
              Promotion Details
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-5 py-2">
              {/* Employee Summary Banner */}
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

              {/* Designation Change */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Designation Change</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-xl p-3.5 bg-rose-500/5 border border-rose-500/15">
                    <p className="text-[11px] text-muted-foreground mb-1">Previous</p>
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Briefcase className="h-4 w-4 text-rose-500 shrink-0" />
                      <span>{viewItem.previousDesignation || "—"}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-emerald-600" />
                  <div className="rounded-xl p-3.5 bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-[11px] text-muted-foreground mb-1">New</p>
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Briefcase className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{viewItem.newDesignation || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                  <div className="relative">
                    <span className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2 border-emerald-500 bg-emerald-500/20 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    </span>
                    <p className="text-xs text-muted-foreground">Promotion Date</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDateSafe(viewItem.promotionDate)}
                    </p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2 border-emerald-500 bg-emerald-500/20 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    </span>
                    <p className="text-xs text-muted-foreground">Effective Date</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDateSafe(viewItem.effectiveDate || viewItem.promotionDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Preview */}
              <DocumentPreviewBlock
                url={viewItem.documentUrl}
                name={viewItem.documentName}
                label="Document"
              />

              {/* Reason */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Reason for Promotion</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {viewItem.remarks || "No reason provided."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Promotion Status Modal */}
      <Dialog open={!!statusModalItem} onOpenChange={(open) => !open && setStatusModalItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Promotion Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select value={newStatusValue} onValueChange={setNewStatusValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStatusModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                statusModalItem &&
                statusMutation.mutate({ id: statusModalItem.id, status: newStatusValue })
              }
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
        title="Delete Promotion Record"
        description="Are you sure you want to delete this promotion record? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
