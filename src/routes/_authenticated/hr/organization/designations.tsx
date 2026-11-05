import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  Briefcase,
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

export const Route = createFileRoute("/_authenticated/hr/organization/designations")({
  component: DesignationsPage,
  head: () => ({
    meta: [{ title: "Designations & Job Titles — Master HRMS" }],
  }),
});

interface DesignationRecord {
  id?: string;
  name: string;
  description?: string;
  departmentId?: string | null;
  status: "active" | "inactive";
  allowedActions?: string[];
  department?: { id: string; name: string };
}

const initialDesig: DesignationRecord = {
  name: "",
  description: "",
  departmentId: null,
  status: "active",
};

export function DesignationsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DesignationRecord | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{ id: string; name: string; targetStatus: "active" | "inactive" } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  // Fetch departments for dropdown & filter
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const extraParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (deptFilter !== "all") params.departmentId = deptFilter;
    return params;
  }, [statusFilter, deptFilter]);

  const {
    data: designations,
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
  } = useMasterList<DesignationRecord>({
    endpoint: "/hr/organization/designations",
    queryKey: "designations-list",
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
  } = useMasterForm<DesignationRecord>({
    endpoint: "/hr/organization/designations",
    queryKeyToInvalidate: "designations-list",
    initialValues: initialDesig,
    onSuccess: () => {
      setIsDialogOpen(false);
      reset();
      refetch();
    },
  });

  // Single delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/organization/designations/${id}`);
    },
    onSuccess: () => {
      toast.success("Designation deleted successfully");
      setDeleteConfirmTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmTarget?.id));
      queryClient.invalidateQueries({ queryKey: ["designations-list"] });
      refetch();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to delete designation";
      toast.error(msg);
    },
  });

  // Archive / Status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "inactive" }) => {
      return await api.put(`/hr/organization/designations/${id}`, { status: newStatus });
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.newStatus === "inactive"
          ? "Designation de-activated"
          : "Designation activated"
      );
      queryClient.invalidateQueries({ queryKey: ["designations-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update designation status");
    },
  });

  // Bulk de-activate mutation
  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/hr/organization/designations/bulk-archive", { ids, status: "inactive" });
    },
    onSuccess: (res: any) => {
      toast.success(`De-activated ${res.data?.count || selectedIds.length} designation(s)`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["designations-list"] });
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

  const handleOpenEdit = (desig: DesignationRecord) => {
    setValues({
      id: desig.id,
      name: desig.name,
      description: desig.description || "",
      departmentId: desig.departmentId || null,
      status: desig.status || "active",
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
      const pageIds = designations.map((d: any) => d.id).filter(Boolean);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(designations.map((d: any) => d.id));
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

  const currentPageIds = designations.map((d: any) => d.id).filter(Boolean);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const isPartiallySelected =
    currentPageIds.some((id) => selectedIds.includes(id)) && !isAllCurrentPageSelected;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations & Job Titles"
        description="Formal organizational roles, job titles, and departmental hierarchy levels."
        actions={
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Designation
          </Button>
        }
      />

      {/* Authoritative Top Summary Cards */}
      <StatsOverviewGrid columns={3}>
        <StatCard
          title="Total Designations"
          value={counts?.total ?? total}
          icon={Briefcase}
          variant="info"
          className="bg-gradient-to-br from-blue-50/70 via-card to-card dark:from-blue-950/20 dark:via-card dark:to-card border-blue-200/80 hover:border-blue-400 dark:border-blue-800/40 dark:hover:border-blue-700 hover:shadow-xs transition-all duration-200"
          description="Formal roles defined across organization"
        />
        <StatCard
          title="Active Roles"
          value={counts?.active ?? 0}
          icon={CheckCircle2}
          variant="success"
          className="bg-gradient-to-br from-emerald-50/70 via-card to-card dark:from-emerald-950/20 dark:via-card dark:to-card border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-800/40 dark:hover:border-emerald-700 hover:shadow-xs transition-all duration-200"
          description="Operational job titles in use"
        />
        <StatCard
          title="Inactive Roles"
          value={counts?.inactive ?? 0}
          icon={AlertCircle}
          variant="warning"
          className="bg-gradient-to-br from-amber-50/70 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card border-amber-200/80 hover:border-amber-400 dark:border-amber-800/40 dark:hover:border-amber-700 hover:shadow-xs transition-all duration-200"
          description="De-activated or deprecated roles"
        />
      </StatsOverviewGrid>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search designations..."
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
              value={deptFilter}
              onValueChange={(val) => {
                setDeptFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
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

            {(search || statusFilter !== "all" || deptFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setDeptFilter("all");
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
                  aria-label="Select all designations on this page"
                />
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 font-semibold hover:text-foreground"
                >
                  Job Title / Designation
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("departmentId")}
                  className="flex items-center gap-1 font-semibold hover:text-foreground"
                >
                  Department
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
                  Loading designations...
                </TableCell>
              </TableRow>
            ) : designations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No designations found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              designations.map((desig: any) => {
                const isSelected = selectedIds.includes(desig.id);
                const isInactive = desig.status === "inactive";
                return (
                  <TableRow key={desig.id || desig.name} className={isSelected ? "bg-muted/40" : undefined}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(desig.id, Boolean(checked))}
                        aria-label={`Select ${desig.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {desig.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {desig.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {desig.department?.name || (desig.departmentId ? "Assigned Dept" : "General / All Departments")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isInactive ? "secondary" : "default"}>
                        {desig.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(desig)}
                          className="h-8 gap-1.5 text-xs font-medium"
                          title="Edit designation details"
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
                              id: desig.id,
                              name: desig.name || desig.title,
                              targetStatus: isInactive ? "active" : "inactive",
                            })
                          }
                          className={cn(
                            "h-8 gap-1.5 text-xs font-medium",
                            isInactive
                              ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          )}
                          title={isInactive ? "Activate designation" : "De-activate designation"}
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
                          onClick={() => setDeleteConfirmTarget(desig)}
                          className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                          title="Delete designation permanently"
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

      {/* Add / Edit Designation Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Designation" : "Add New Designation"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="desig-name">Job Title / Designation *</Label>
              <Input
                id="desig-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desig-dept">Department (Optional)</Label>
              <Select
                value={values.departmentId || "none"}
                onValueChange={(val) =>
                  handleChange("departmentId", val === "none" ? null : val)
                }
              >
                <SelectTrigger id="desig-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General / All Departments</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desig-status">Status</Label>
              <Select
                value={values.status || "active"}
                onValueChange={(val) => handleChange("status", val)}
              >
                <SelectTrigger id="desig-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desig-desc">Description</Label>
              <Input
                id="desig-desc"
                value={values.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Brief summary of role scope and responsibilities"
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
                    : "Create Designation"}
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
                  De-activate Designation
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Activate Designation
                </>
              )}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              {statusConfirmTarget?.targetStatus === "inactive" ? (
                <span>
                  Are you sure you want to de-activate{" "}
                  <strong className="text-foreground">{statusConfirmTarget?.name}</strong>?
                  This role will be marked as inactive and will not appear in selection dropdowns
                  for new employee assignments. Existing employee associations will be preserved.
                </span>
              ) : (
                <span>
                  Are you sure you want to activate{" "}
                  <strong className="text-foreground">{statusConfirmTarget?.name}</strong>?
                  This role will become active and available for assignments across the workspace.
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
              <DialogTitle>Delete Designation</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteConfirmTarget?.name}</strong>?
              If this designation is assigned to active employees, deletion will be blocked
              to prevent corrupting employee master records.
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
