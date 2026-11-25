'use client';

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Award,
  Edit,
  Lock,
  Unlock,
  Trash2,
  ArrowUpDown,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AwardTypeItem {
  id: string;
  name: string;
  description?: string | null;
  status: "active" | "inactive";
}

export default function AwardTypesPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<AwardTypeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AwardTypeItem | null>(null);

  // Left Panel Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const extraParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (statusFilter !== "all") params.status = statusFilter;
    return params;
  }, [statusFilter]);

  const {
    data: awardTypes,
    sortBy,
    sortOrder,
    isLoading,
    setSearch,
    setSortBy,
    setSortOrder,
    setPage,
    refetch,
  } = useMasterList<AwardTypeItem>({
    endpoint: "/hr/organization/award-types",
    queryKey: "award-types-list",
    defaultLimit: 50,
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    extraParams,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
      };
      if (editingItem) {
        return await api.put(`/hr/organization/award-types/${editingItem.id}`, payload);
      }
      return await api.post("/hr/organization/award-types", payload);
    },
    onSuccess: () => {
      toast.success(editingItem ? "Award type updated." : "Award type created successfully.");
      setEditingItem(null);
      setName("");
      setDescription("");
      setStatus("active");
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save award type.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: "active" | "inactive" }) => {
      await api.patch(`/hr/organization/award-types/${id}/status`, { status: nextStatus });
    },
    onSuccess: () => {
      toast.success("Award type status updated.");
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/organization/award-types/${id}`);
    },
    onSuccess: () => {
      toast.success("Award type deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Cannot delete award type.");
    },
  });

  const startEdit = (item: AwardTypeItem) => {
    setEditingItem(item);
    setName(item.name || "");
    setDescription(item.description || "");
    setStatus(item.status || "active");
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
    setStatus("active");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Award Types"
        description="Manage award types used for employee recognition."
      />

      {/* ── 2-Column Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Add / Edit Award Type Form Card */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border/70">
            <h2 className="text-base font-bold text-foreground">
              {editingItem ? "Edit Award Type" : "Add New Award Type"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingItem
                ? "Update the selected award type details"
                : "Fill in the details to create a new award type"}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("Award Type Name is required.");
                return;
              }
              saveMutation.mutate();
            }}
            className="p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="award-name" className="text-xs font-semibold text-foreground">
                Award Type Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="award-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Employee of the Month, Best Performer"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="award-desc" className="text-xs font-semibold text-foreground">
                Description
              </Label>
              <Textarea
                id="award-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the award type"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full h-10 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
              >
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingItem ? "Save Changes" : "Add Award Type"}
              </Button>
              {editingItem && (
                <Button type="button" variant="outline" onClick={cancelEdit} className="h-10 text-xs">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Search/Filter Card + Award Types Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value.trim()) {
                      setSearch("");
                      setPage(1);
                    }
                  }}
                  placeholder="Search award types..."
                  className="pl-9 h-9 text-xs bg-background"
                />
              </div>
              <Button
                type="submit"
                className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Search
              </Button>
            </form>

            <div>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/80">
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy("name");
                        setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc");
                      }}
                      className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                    >
                      Name
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground w-28">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right pr-6 w-36">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                      Loading award types...
                    </TableCell>
                  </TableRow>
                ) : awardTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                      No award types found. Add one using the form on the left.
                    </TableCell>
                  </TableRow>
                ) : (
                  awardTypes.map((item) => {
                    const isActive = (item.status || "active") === "active";
                    const desc = item.description || "";
                    const isLong = desc.length > 75;
                    const expanded = Boolean(expandedIds[item.id]);

                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                      >
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                              <Award className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-snug">{item.name}</p>
                              {desc && (
                                <p
                                  className={cn(
                                    "text-xs text-muted-foreground mt-0.5 leading-relaxed",
                                    !expanded && isLong && "line-clamp-2"
                                  )}
                                >
                                  {desc}
                                </p>
                              )}
                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline mt-1 cursor-pointer"
                                >
                                  {expanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" /> Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" /> Show more
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
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
                        <TableCell className="text-right pr-4">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Edit Award Type"
                              onClick={() => startEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8",
                                isActive
                                  ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                  : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                              )}
                              title={isActive ? "Deactivate" : "Activate"}
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  id: item.id,
                                  nextStatus: isActive ? "inactive" : "active",
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
                              title="Delete Award Type"
                              onClick={() => setDeleteTarget(item)}
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
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Award Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
