import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  MapPin,
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
  Phone,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hr/organization/branches")({
  component: BranchesPage,
  head: () => ({
    meta: [{ title: "Branches & Locations — Master HRMS" }],
  }),
});

interface BranchRecord {
  id?: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive";
  allowedActions?: string[];
}

const initialBranch: BranchRecord = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  status: "active",
};

export function BranchesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<BranchRecord | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{ id: string; name: string; targetStatus: "active" | "inactive" } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const extraParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (statusFilter !== "all") params.status = statusFilter;
    return params;
  }, [statusFilter]);

  const {
    data: branches,
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
  } = useMasterList<BranchRecord>({
    endpoint: "/hr/organization/branches",
    queryKey: "branches-list",
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
  } = useMasterForm<BranchRecord>({
    endpoint: "/hr/organization/branches",
    queryKeyToInvalidate: "branches-list",
    initialValues: initialBranch,
    onSuccess: () => {
      setIsDialogOpen(false);
      reset();
      refetch();
    },
  });

  // Single delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/organization/branches/${id}`);
    },
    onSuccess: () => {
      toast.success("Branch facility deleted successfully");
      setDeleteConfirmTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmTarget?.id));
      queryClient.invalidateQueries({ queryKey: ["branches-list"] });
      refetch();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to delete branch";
      toast.error(msg);
    },
  });

  // Archive / Status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "inactive" }) => {
      return await api.put(`/hr/organization/branches/${id}`, { status: newStatus });
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.newStatus === "inactive"
          ? "Branch location de-activated"
          : "Branch location activated"
      );
      queryClient.invalidateQueries({ queryKey: ["branches-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update branch status");
    },
  });

  // Bulk de-activate mutation
  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/hr/organization/branches/bulk-archive", { ids, status: "inactive" });
    },
    onSuccess: (res: any) => {
      toast.success(`De-activated ${res.data?.count || selectedIds.length} branch location(s)`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["branches-list"] });
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

  const handleOpenEdit = (branch: BranchRecord) => {
    setValues({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      status: branch.status || "active",
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
      const pageIds = branches.map((b: any) => b.id).filter(Boolean);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(branches.map((b: any) => b.id));
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

  const currentPageIds = branches.map((b: any) => b.id).filter(Boolean);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const isPartiallySelected =
    currentPageIds.some((id) => selectedIds.includes(id)) && !isAllCurrentPageSelected;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches & Locations"
        description="Authoritative master directory of organization corporate offices, regional centers, and operating facilities."
        actions={
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        }
      />

      {/* Authoritative Top Summary Cards */}
      <StatsOverviewGrid columns={3}>
        <StatCard
          title="Total Branches"
          value={counts?.total ?? total}
          icon={MapPin}
          variant="info"
          className="bg-gradient-to-br from-blue-50/70 via-card to-card dark:from-blue-950/20 dark:via-card dark:to-card border-blue-200/80 hover:border-blue-400 dark:border-blue-800/40 dark:hover:border-blue-700 hover:shadow-xs transition-all duration-200"
          description="Registered operational facilities"
        />
        <StatCard
          title="Active Facilities"
          value={counts?.active ?? 0}
          icon={CheckCircle2}
          variant="success"
          className="bg-gradient-to-br from-emerald-50/70 via-card to-card dark:from-emerald-950/20 dark:via-card dark:to-card border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-800/40 dark:hover:border-emerald-700 hover:shadow-xs transition-all duration-200"
          description="Operational workspace centers"
        />
        <StatCard
          title="Inactive Locations"
          value={counts?.inactive ?? 0}
          icon={AlertCircle}
          variant="warning"
          className="bg-gradient-to-br from-amber-50/70 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card border-amber-200/80 hover:border-amber-400 dark:border-amber-800/40 dark:hover:border-amber-700 hover:shadow-xs transition-all duration-200"
          description="De-activated or decommissioned offices"
        />
      </StatsOverviewGrid>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, email, phone..."
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

            {(search || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
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
                  aria-label="Select all branches on this page"
                />
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 font-semibold hover:text-foreground"
                >
                  Branch Name
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("code")}
                  className="flex items-center gap-1 font-semibold hover:text-foreground"
                >
                  Code
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
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
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading branches...
                </TableCell>
              </TableRow>
            ) : branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No branches found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              branches.map((branch: any) => {
                const isSelected = selectedIds.includes(branch.id);
                const isInactive = branch.status === "inactive";
                return (
                  <TableRow key={branch.id || branch.code} className={isSelected ? "bg-muted/40" : undefined}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(branch.id, Boolean(checked))}
                        aria-label={`Select ${branch.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {branch.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {branch.code || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branch.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[200px]">{branch.address}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex flex-col gap-0.5 text-xs">
                        {branch.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {branch.phone}
                          </span>
                        )}
                        {branch.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            {branch.email}
                          </span>
                        )}
                        {!branch.phone && !branch.email && "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isInactive ? "secondary" : "default"}>
                        {branch.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(branch)}
                          className="h-8 gap-1.5 text-xs font-medium"
                          title="Edit branch facility details"
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
                              id: branch.id,
                              name: branch.name,
                              targetStatus: isInactive ? "active" : "inactive",
                            })
                          }
                          className={cn(
                            "h-8 gap-1.5 text-xs font-medium",
                            isInactive
                              ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          )}
                          title={isInactive ? "Activate facility" : "De-activate facility"}
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
                          onClick={() => setDeleteConfirmTarget(branch)}
                          className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                          title="Delete facility permanently"
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

      {/* Add / Edit Branch Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Branch Location" : "Add New Branch Location"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name">Branch / Location Name *</Label>
              <Input
                id="branch-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Headquarters Campus"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-code">Branch Code *</Label>
              <Input
                id="branch-code"
                value={values.code}
                onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                placeholder="e.g. HQ-01, CHN"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-status">Status</Label>
              <Select
                value={values.status || "active"}
                onValueChange={(val) => handleChange("status", val)}
              >
                <SelectTrigger id="branch-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-addr">Physical Address</Label>
              <Input
                id="branch-addr"
                value={values.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Street address, City, Country"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-phone">Phone</Label>
                <Input
                  id="branch-phone"
                  value={values.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branch-email">Email</Label>
                <Input
                  id="branch-email"
                  type="email"
                  value={values.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="facility@company.com"
                />
              </div>
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
                    : "Create Branch"}
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
                  De-activate Branch Facility
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Activate Branch Facility
                </>
              )}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              {statusConfirmTarget?.targetStatus === "inactive" ? (
                <span>
                  Are you sure you want to de-activate{" "}
                  <strong className="text-foreground">{statusConfirmTarget?.name}</strong>?
                  This facility will be marked as inactive and will not appear in selection dropdowns
                  for new assignments. Existing departmental and employee associations will be preserved.
                </span>
              ) : (
                <span>
                  Are you sure you want to activate{" "}
                  <strong className="text-foreground">{statusConfirmTarget?.name}</strong>?
                  This facility will become active and available across the workspace.
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
              <DialogTitle>Delete Branch Facility</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteConfirmTarget?.name}</strong>?
              If this branch has active employees or departments assigned to it, deletion will be
              blocked to safeguard organizational data integrity.
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
