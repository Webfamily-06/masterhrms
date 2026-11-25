'use client';

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface BranchRecord {
  id?: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive";
  createdAt?: string;
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

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<BranchRecord | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<BranchRecord | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    id: string;
    name: string;
    targetStatus: "active" | "inactive";
  } | null>(null);

  const {
    data: branches,
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
  } = useMasterList<BranchRecord>({
    endpoint: "/hr/organization/branches",
    queryKey: "branches-list",
    defaultLimit: 10,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
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
  } = useMasterForm<BranchRecord>({
    endpoint: "/hr/organization/branches",
    initialValues: initialBranch,
    onSuccess: () => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["branches-list"] });
      queryClient.invalidateQueries({ queryKey: ["branches-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["wizard-branches"] });
      refetch();
    },
  });
  const error = formErrors._form || Object.values(formErrors)[0] || null;

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      await api.patch(`/hr/organization/branches/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Branch status updated.");
      setStatusConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["branches-list"] });
      queryClient.invalidateQueries({ queryKey: ["branches-dropdown"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/organization/branches/${id}`);
    },
    onSuccess: () => {
      toast.success("Branch deleted successfully.");
      setDeleteConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["branches-list"] });
      queryClient.invalidateQueries({ queryKey: ["branches-dropdown"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Cannot delete branch.");
    },
  });

  const openCreate = () => {
    reset();
    setIsDialogOpen(true);
  };

  const openEdit = (branch: BranchRecord) => {
    setValues({
      id: branch.id,
      name: branch.name || "",
      code: branch.code || "",
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      status: branch.status || "active",
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
        title="Branches"
        description="Manage your company branches and locations."
        actions={
          <Button
            onClick={openCreate}
            className="h-9 px-4 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        }
      />

      {/* ── Search Toolbar Card ── */}
      <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
        <div className="relative max-w-xs">
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
                <TableHead className="text-xs font-semibold text-muted-foreground">Contact</TableHead>
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
                    Loading branches...
                  </TableCell>
                </TableRow>
              ) : branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-7 w-7 opacity-50" />
                      <p className="text-sm font-medium text-foreground">No branches found</p>
                      <p className="text-xs">Add a branch to organize your locations.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((branch, idx) => {
                  const rowNum = (page - 1) * limit + idx + 1;
                  const isActive = (branch.status || "active") === "active";
                  return (
                    <TableRow
                      key={branch.id || idx}
                      className="hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                    >
                      <TableCell className="text-xs font-semibold text-foreground">{rowNum}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">{branch.name}</p>
                          {branch.email && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{branch.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {branch.phone || "—"}
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
                          <span>{formatDateYmd(branch.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="View Branch"
                            onClick={() => setViewTarget(branch)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Branch"
                            onClick={() => openEdit(branch)}
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
                            title={isActive ? "Deactivate Branch" : "Activate Branch"}
                            onClick={() =>
                              branch.id &&
                              setStatusConfirmTarget({
                                id: branch.id,
                                name: branch.name,
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
                            title="Delete Branch"
                            onClick={() => setDeleteConfirmTarget(branch)}
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

      {/* ── View Branch Dialog ── */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{viewTarget?.name}</DialogTitle>
            <DialogDescription>Branch location and contact details</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <span className="text-muted-foreground">Branch Code</span>
                <p className="font-semibold text-foreground mt-0.5">{viewTarget.code || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-semibold capitalize text-foreground mt-0.5">{viewTarget.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium text-foreground mt-0.5">{viewTarget.email || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone</span>
                <p className="font-medium text-foreground mt-0.5">{viewTarget.phone || "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Address</span>
                <p className="font-medium text-foreground mt-0.5">{viewTarget.address || "—"}</p>
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

      {/* ── Create / Edit Branch Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => !o && setIsDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Branch" : "Add Branch"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update branch details and contact information." : "Create a new company branch location."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch Name *</Label>
                <Input
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Main Office"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch Code *</Label>
                <Input
                  value={values.code}
                  onChange={(e) => handleChange("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  placeholder="e.g. HQ-01"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  type="email"
                  value={values.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="branch@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input
                  inputMode="tel"
                  value={values.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value.replace(/[^\d+\-\s()]/g, "").slice(0, 20))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Address</Label>
                <Input
                  value={values.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Street, City, State"
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
                {isEdit ? "Save Changes" : "Create Branch"}
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
              {statusConfirmTarget?.targetStatus === "inactive" ? "Deactivate Branch" : "Activate Branch"}
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

      {/* ── Delete Branch Dialog ── */}
      <Dialog open={Boolean(deleteConfirmTarget)} onOpenChange={(o) => !o && setDeleteConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
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
