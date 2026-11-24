'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { useMasterForm } from "@/hooks/use-master-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Eye,
  Edit,
  Lock,
  Unlock,
  Trash2,
  ArrowUpDown,
  Search,
  Calendar,
  Filter,
  Loader2,
  Building2,
  LayoutGrid,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface DepartmentRecord {
  id?: string;
  name: string;
  description?: string;
  branchId?: string | null;
  status: "active" | "inactive";
  createdAt?: string;
  branch?: { id: string; name: string; code?: string };
}

const initialDept: DepartmentRecord = {
  name: "",
  description: "",
  branchId: null,
  status: "active",
};

function formatDateYmd(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "—";
  }
}

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<DepartmentRecord | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DepartmentRecord | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    id: string;
    name: string;
    targetStatus: "active" | "inactive";
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const extraParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (branchFilter !== "all") params.branchId = branchFilter;
    return params;
  }, [statusFilter, branchFilter]);

  const {
    data: departments,
    total,
    totalPages,
    counts,
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    isLoading,
    setPage,
    setLimit,
    setSearch,
    setSortBy,
    setSortOrder,
    refetch,
  } = useMasterList<DepartmentRecord>({
    endpoint: "/hr/organization/departments",
    queryKey: "departments-list",
    defaultLimit: 10,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    extraParams,
  });

  const {
    values,
    setValues,
    isSubmitting,
    errors: formErrors,
    setErrors,
    handleChange,
    submit: handleSubmit,
    reset,
    isEditMode: isEdit,
  } = useMasterForm<DepartmentRecord>({
    endpoint: "/hr/organization/departments",
    initialValues: initialDept,
    onSuccess: () => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      queryClient.invalidateQueries({ queryKey: ["departments-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["wizard-departments"] });
      refetch();
    },
  });
  const error = formErrors._form || Object.values(formErrors)[0] || null;

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      await api.patch(`/hr/organization/departments/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Department status updated.");
      setStatusConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/organization/departments/${id}`);
    },
    onSuccess: () => {
      toast.success("Department deleted successfully.");
      setDeleteConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      queryClient.invalidateQueries({ queryKey: ["departments-dropdown"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Cannot delete department.");
    },
  });

  const openCreate = () => {
    reset();
    setIsDialogOpen(true);
  };

  const openEdit = (dept: DepartmentRecord) => {
    setValues({
      id: dept.id,
      name: dept.name || "",
      description: dept.description || "",
      branchId: dept.branchId || dept.branch?.id || null,
      status: dept.status || "active",
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setBranchFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const allCount = counts?.total ?? total;
  const activeCount = counts?.active ?? 0;
  const inactiveCount = counts?.inactive ?? 0;

  const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, total);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="w-full space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your company departments and structure.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-9 px-4 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* ── Filter Toolbar & Status Tabs Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-64">
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
              value={branchFilter}
              onValueChange={(val) => {
                setBranchFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[165px] h-9 text-xs bg-background">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
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

        {/* Status Tabs Row */}
        <div className="px-3.5 border-t border-border/60 flex items-center gap-5 overflow-x-auto">
          {[
            { id: "all", label: "All", count: allCount, icon: LayoutGrid },
            { id: "active", label: "Active", count: activeCount, icon: CheckCircle2 },
            { id: "inactive", label: "Inactive", count: inactiveCount, icon: XCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer",
                  isSelected
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                    isSelected
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Data Table Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/80">
                <TableHead className="w-12 text-xs font-semibold text-muted-foreground">#</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Name
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Branch</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleSort("createdAt")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Created At
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    Loading departments...
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <Building2 className="h-7 w-7 opacity-50" />
                      <p className="text-sm font-medium text-foreground">No departments found</p>
                      <p className="text-xs">Try adjusting filters or add a new department.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept, idx) => {
                  const rowNum = (page - 1) * limit + idx + 1;
                  const isActive = (dept.status || "active") === "active";
                  return (
                    <TableRow
                      key={dept.id || idx}
                      className="hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                    >
                      <TableCell className="text-xs font-semibold text-foreground">{rowNum}</TableCell>
                      <TableCell className="text-sm font-semibold text-foreground">{dept.name}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {dept.branch?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-medium px-2.5 py-0.5 rounded-md",
                            isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span>{formatDateYmd(dept.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="View Department"
                            onClick={() => setViewTarget(dept)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Department"
                            onClick={() => openEdit(dept)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 transition-colors",
                              isActive
                                ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                            )}
                            title={isActive ? "Deactivate Department" : "Activate Department"}
                            onClick={() =>
                              dept.id &&
                              setStatusConfirmTarget({
                                id: dept.id,
                                name: dept.name,
                                targetStatus: isActive ? "inactive" : "active",
                              })
                            }
                          >
                            {isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            title="Delete Department"
                            onClick={() => setDeleteConfirmTarget(dept)}
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

        {/* ── Pagination Footer ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/70 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{startRow}</span> to{" "}
            <span className="font-semibold text-foreground">{endRow}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> results
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
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
              {pageNumbers.map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={num === page ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 text-xs",
                    num === page && "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                  )}
                  onClick={() => setPage(num)}
                >
                  {num}
                </Button>
              ))}
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
      </div>

      {/* ── View Department Dialog ── */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{viewTarget?.name}</DialogTitle>
            <DialogDescription>Department details and branch assignment</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <span className="text-muted-foreground">Branch</span>
                <p className="font-semibold text-foreground mt-0.5">{viewTarget.branch?.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-semibold capitalize text-foreground mt-0.5">{viewTarget.status}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Description</span>
                <p className="font-medium text-foreground mt-0.5">{viewTarget.description || "—"}</p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Department Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => !o && setIsDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update department details and branch mapping." : "Create a new department mapped to a branch."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department Name *</Label>
                <Input
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Human Resources"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch *</Label>
                <Select
                  value={values.branchId || "none"}
                  onValueChange={(val) => handleChange("branchId", val === "none" ? null : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={values.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Brief department summary"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Toggle Status Dialog ── */}
      <Dialog open={Boolean(statusConfirmTarget)} onOpenChange={(o) => !o && setStatusConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>
              {statusConfirmTarget?.targetStatus === "inactive" ? "Deactivate Department" : "Activate Department"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark <strong>{statusConfirmTarget?.name}</strong> as{" "}
              <strong>{statusConfirmTarget?.targetStatus}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setStatusConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={toggleStatusMutation.isPending}
              onClick={() =>
                statusConfirmTarget &&
                toggleStatusMutation.mutate({
                  id: statusConfirmTarget.id,
                  status: statusConfirmTarget.targetStatus,
                })
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Department Dialog ── */}
      <Dialog open={Boolean(deleteConfirmTarget)} onOpenChange={(o) => !o && setDeleteConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmTarget?.id && deleteMutation.mutate(deleteConfirmTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
