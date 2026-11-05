'use client';
import { useState, useMemo } from "react";
import { createFileRoute } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { useMasterForm } from "@/hooks/use-master-form";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Building2,
  Plus,
  Edit2,
  Trash2,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  Search,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DepartmentRecord {
  id?: string;
  name: string;
  description?: string;
  branchId?: string | null;
  status: "active" | "inactive";
  allowedActions?: string[];
  branch?: { id: string; name: string; code?: string };
}

const initialDept: DepartmentRecord = {
  name: "",
  description: "",
  branchId: null,
  status: "active",
};

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DepartmentRecord | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{ id: string; name: string; targetStatus: "active" | "inactive" } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Fetch branches for branch dropdown & filter
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return res.data || res || [];
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
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    extraParams,
  });

  const {
    values,
    setValues,
    handleChange,
    submit,
    isSubmitting,
    isEditMode,
    reset,
  } = useMasterForm<DepartmentRecord>({
    endpoint: "/hr/organization/departments",
    queryKeyToInvalidate: "departments-list",
    initialValues: initialDept,
    onSuccess: () => {
      setIsDialogOpen(false);
      reset();
      refetch();
    },
  });

  // Single delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/organization/departments/${id}`);
    },
    onSuccess: () => {
      toast.success("Department deleted successfully");
      setDeleteConfirmTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmTarget?.id));
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      refetch();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to delete department";
      toast.error(msg);
    },
  });

  // Archive / Status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "inactive" }) => {
      return await api.put(`/hr/organization/departments/${id}`, { status: newStatus });
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.newStatus === "inactive"
          ? "Department de-activated"
          : "Department activated"
      );
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update department status");
    },
  });

  // Bulk de-activate mutation
  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/hr/organization/departments/bulk-archive", { ids, status: "inactive" });
    },
    onSuccess: (res: any) => {
      toast.success(`De-activated ${res.data?.count || selectedIds.length} department(s)`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk archive failed");
    },
  });

  const handleOpenAdd = () => {
    reset();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentRecord) => {
    setValues({
      id: dept.id,
      name: dept.name,
      description: dept.description || "",
      branchId: dept.branchId || null,
      status: dept.status || "active",
    });
    setIsDialogOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = departments.map((d: any) => d.id).filter(Boolean);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(departments.map((d: any) => d.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const currentPageIds = departments.map((d: any) => d.id).filter(Boolean);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const isPartiallySelected =
    currentPageIds.some((id) => selectedIds.includes(id)) && !isAllCurrentPageSelected;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Functional business units and departmental hierarchy across workspace facilities."
        actions={
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        }
      />

      {/* Top Authoritative Summary Cards */}
      <StatsOverviewGrid columns={3}>
        <StatCard
          title="Total Departments"
          value={counts?.total ?? total}
          icon={Building2}
          variant="info"
          className="bg-gradient-to-br from-blue-50/70 via-card to-card dark:from-blue-950/20 dark:via-card dark:to-card border-blue-200/80 hover:border-blue-400 dark:border-blue-800/40 dark:hover:border-blue-700 hover:shadow-xs transition-all duration-200"
          description="Total business units across workspace"
        />
        <StatCard
          title="Active Departments"
          value={counts?.active ?? 0}
          icon={CheckCircle2}
          variant="success"
          className="bg-gradient-to-br from-emerald-50/70 via-card to-card dark:from-emerald-950/20 dark:via-card dark:to-card border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-800/40 dark:hover:border-emerald-700 hover:shadow-xs transition-all duration-200"
          description="Operational departments"
        />
        <StatCard
          title="Inactive Departments"
          value={counts?.inactive ?? 0}
          icon={AlertCircle}
          variant="warning"
          className="bg-gradient-to-br from-amber-50/70 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card border-amber-200/80 hover:border-amber-400 dark:border-amber-800/40 dark:hover:border-amber-700 hover:shadow-xs transition-all duration-200"
          description="De-activated business units"
        />
      </StatsOverviewGrid>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={branchFilter}
              onValueChange={(val) => {
                setBranchFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all" || branchFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setBranchFilter("all");
                  setPage(1);
                }}
                className="h-9 gap-1 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Indicator */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 border-t pt-2 sm:border-t-0 sm:pt-0">
            <span className="text-xs font-medium text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkArchiveMutation.isPending}
              onClick={() => bulkArchiveMutation.mutate(selectedIds)}
              className="h-8 gap-1 text-xs"
            >
              <PowerOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              De-activate Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={isAllCurrentPageSelected ? true : isPartiallySelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all departments on this page"
                />
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 font-semibold hover:text-foreground"
                >
                  Department Name
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("branchId")}
                  className="flex items-center gap-1 font-semibold hover:text-foreground"
                >
                  Facility / Branch
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-1 font-semibold hover:text-foreground"
                >
                  Status
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Loading departments...
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No departments found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept: any) => {
                const isSelected = selectedIds.includes(dept.id);
                const isInactive = dept.status === "inactive";
                return (
                  <TableRow key={dept.id || dept.name} className={isSelected ? "bg-muted/40" : undefined}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(dept.id, Boolean(checked))}
                        aria-label={`Select ${dept.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {dept.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dept.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dept.branch?.name || (dept.branchId ? "Assigned Branch" : "Global / All Facilities")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isInactive ? "secondary" : "default"}>
                        {dept.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(dept)}
                          className="h-8 gap-1.5 text-xs font-medium"
                          title="Edit department details"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggleStatusMutation.isPending}
                          onClick={() =>
                            setStatusConfirmTarget({
                              id: dept.id,
                              name: dept.name,
                              targetStatus: isInactive ? "active" : "inactive",
                            })
                          }
                          className={cn(
                            "h-8 gap-1.5 text-xs font-medium",
                            isInactive
                              ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          )}
                          title={isInactive ? "Activate department" : "De-activate department"}
                        >
                          {isInactive ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Activate
                            </>
                          ) : (
                            <>
                              <PowerOff className="h-3.5 w-3.5" />
                              De-activate
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmTarget(dept)}
                          className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                          title="Delete department permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination & Page Size Selector Controls */}
        <div className="flex flex-col items-center justify-between gap-4 border-t p-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(limit)}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>
              Showing {total > 0 ? (page - 1) * limit + 1 : 0} to{" "}
              {Math.min(page * limit, total)} of {total} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Add / Edit Department Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Department" : "Add New Department"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">Department Name *</Label>
              <Input
                id="dept-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Engineering & Technology"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-branch">Assigned Branch (Optional)</Label>
              <Select
                value={values.branchId || "none"}
                onValueChange={(val) =>
                  handleChange("branchId", val === "none" ? null : val)
                }
              >
                <SelectTrigger id="dept-branch">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Global / All Facilities</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-status">Status</Label>
              <Select
                value={values.status || "active"}
                onValueChange={(val) => handleChange("status", val)}
              >
                <SelectTrigger id="dept-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">Description</Label>
              <Input
                id="dept-desc"
                value={values.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Brief summary of department responsibilities"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* De-activate / Activate Confirmation Dialog */}
      <Dialog
        open={Boolean(statusConfirmTarget)}
        onOpenChange={(open) => !open && setStatusConfirmTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {statusConfirmTarget?.targetStatus === "inactive" ? (
                <>
                  <PowerOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  De-activate Department
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Activate Department
                </>
              )}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              {statusConfirmTarget?.targetStatus === "inactive" ? (
                <span>
                  Are you sure you want to de-activate{" "}
                  <strong className="text-foreground">{statusConfirmTarget?.name}</strong>?
                  This record will be marked as inactive and will not appear in selection dropdowns
                  for new assignments. Existing associations will be preserved.
                </span>
              ) : (
                <span>
                  Are you sure you want to activate{" "}
                  <strong className="text-foreground">{statusConfirmTarget?.name}</strong>?
                  This record will become active and available for assignments across the workspace.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={toggleStatusMutation.isPending}
              onClick={() => setStatusConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={
                statusConfirmTarget?.targetStatus === "inactive"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
              disabled={toggleStatusMutation.isPending}
              onClick={() => {
                if (statusConfirmTarget) {
                  toggleStatusMutation.mutate({
                    id: statusConfirmTarget.id,
                    newStatus: statusConfirmTarget.targetStatus,
                  });
                  setStatusConfirmTarget(null);
                }
              }}
            >
              {toggleStatusMutation.isPending
                ? "Updating..."
                : statusConfirmTarget?.targetStatus === "inactive"
                ? "De-activate"
                : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Dependency Guard Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmTarget)}
        onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Delete Department</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteConfirmTarget?.name}</strong>?
              If this department is assigned to active employees or designations, deletion will be
              blocked to prevent corrupting organizational records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmTarget?.id) {
                  deleteMutation.mutate(deleteConfirmTarget.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Checking..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
