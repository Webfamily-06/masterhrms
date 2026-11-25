'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { useMasterForm } from "@/hooks/use-master-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface DesignationRecord {
  id?: string;
  name: string;
  description?: string;
  departmentId?: string | null;
  status: "active" | "inactive";
  createdAt?: string;
  department?: {
    id: string;
    name: string;
    branchId?: string | null;
    branch?: { id: string; name: string } | null;
  };
}

const initialDesig: DesignationRecord = {
  name: "",
  description: "",
  departmentId: null,
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

export default function DesignationsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<DesignationRecord | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DesignationRecord | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    id: string;
    name: string;
    targetStatus: "active" | "inactive";
  } | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const extraParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (deptFilter !== "all") params.departmentId = deptFilter;
    return params;
  }, [deptFilter]);

  const {
    data: designations,
    total,
    totalPages,
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
  } = useMasterList<DesignationRecord>({
    endpoint: "/hr/organization/designations",
    queryKey: "designations-list",
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
  } = useMasterForm<DesignationRecord>({
    endpoint: "/hr/organization/designations",
    initialValues: initialDesig,
    onSuccess: () => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["designations-list"] });
      queryClient.invalidateQueries({ queryKey: ["designations-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["wizard-designations"] });
      refetch();
    },
  });
  const error = formErrors._form || Object.values(formErrors)[0] || null;

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      await api.patch(`/hr/organization/designations/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Designation status updated.");
      setStatusConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["designations-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/organization/designations/${id}`);
    },
    onSuccess: () => {
      toast.success("Designation deleted successfully.");
      setDeleteConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["designations-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Cannot delete designation.");
    },
  });

  const openCreate = () => {
    reset();
    setIsDialogOpen(true);
  };

  const openEdit = (desig: DesignationRecord) => {
    setValues({
      id: desig.id,
      name: desig.name || "",
      description: desig.description || "",
      departmentId: desig.departmentId || desig.department?.id || null,
      status: desig.status || "active",
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
    setDeptFilter("all");
    setPage(1);
  };

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
      <PageHeader
        title="Designations"
        description="Manage job designations and roles within your organization."
        actions={
          <Button
            onClick={openCreate}
            className="h-9 px-4 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Designation
          </Button>
        }
      />

      {/* ── Filter Toolbar Card ── */}
      <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
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
            value={deptFilter}
            onValueChange={(val) => {
              setDeptFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] h-9 text-xs bg-background">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}{d.branch?.name ? ` (${d.branch.name})` : ""}
                </SelectItem>
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
                <TableHead className="text-xs font-semibold text-muted-foreground">Department</TableHead>
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
                    Loading designations...
                  </TableCell>
                </TableRow>
              ) : designations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <Briefcase className="h-7 w-7 opacity-50" />
                      <p className="text-sm font-medium text-foreground">No designations found</p>
                      <p className="text-xs">Try adjusting filters or add a new designation.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                designations.map((desig, idx) => {
                  const rowNum = (page - 1) * limit + idx + 1;
                  const isActive = (desig.status || "active") === "active";
                  return (
                    <TableRow
                      key={desig.id || idx}
                      className="hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                    >
                      <TableCell className="text-xs font-semibold text-foreground">{rowNum}</TableCell>
                      <TableCell className="text-sm font-semibold text-foreground">{desig.name}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground leading-tight">
                            {desig.department?.name || "—"}
                          </p>
                          {desig.department?.branch?.name && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Branch: {desig.department.branch.name}
                            </p>
                          )}
                        </div>
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
                          <span>{formatDateYmd(desig.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="View Designation"
                            onClick={() => setViewTarget(desig)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Designation"
                            onClick={() => openEdit(desig)}
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
                            title={isActive ? "Deactivate Designation" : "Activate Designation"}
                            onClick={() =>
                              desig.id &&
                              setStatusConfirmTarget({
                                id: desig.id,
                                name: desig.name,
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
                            title="Delete Designation"
                            onClick={() => setDeleteConfirmTarget(desig)}
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
                    num === page && "bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
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

      {/* ── View Designation Dialog ── */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{viewTarget?.name}</DialogTitle>
            <DialogDescription>Designation role and department mapping</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <span className="text-muted-foreground">Department</span>
                <p className="font-semibold text-foreground mt-0.5">{viewTarget.department?.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Branch</span>
                <p className="font-semibold text-foreground mt-0.5">{viewTarget.department?.branch?.name || "—"}</p>
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

      {/* ── Create / Edit Designation Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => !o && setIsDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Designation" : "Add Designation"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update designation title and department mapping." : "Create a new job designation under a department."}
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
                <Label className="text-xs font-semibold">Designation Name *</Label>
                <Input
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. HR Executive"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department *</Label>
                <Select
                  value={values.departmentId || "none"}
                  onValueChange={(val) => handleChange("departmentId", val === "none" ? null : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}{d.branch?.name ? ` — ${d.branch.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={values.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Role responsibilities summary"
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Designation"}
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
              {statusConfirmTarget?.targetStatus === "inactive" ? "Deactivate Designation" : "Activate Designation"}
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
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

      {/* ── Delete Designation Dialog ── */}
      <Dialog open={Boolean(deleteConfirmTarget)} onOpenChange={(o) => !o && setDeleteConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Designation</DialogTitle>
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
