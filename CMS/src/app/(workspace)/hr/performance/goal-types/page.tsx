"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  Search,
  Target,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from "lucide-react";

interface GoalTypeItem {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  isActive: boolean;
  status?: string;
}

export default function HrPerformanceGoalTypesPage() {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<GoalTypeItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<GoalTypeItem | null>(null);

  const { data: goalTypes = [], isLoading } = useQuery<GoalTypeItem[]>({
    queryKey: ["hr-performance-goal-types"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/goal-types");
      return unwrapArray<GoalTypeItem>(res);
    },
  });

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setStatus("active");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
        isActive: status === "active",
      };
      if (editing) {
        return api.put(`/hr/performance/goal-types/${editing.id}`, payload);
      }
      return api.post("/hr/performance/goal-types", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Goal type updated" : "Goal type added");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-goal-types"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save goal type"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/performance/goal-types/${id}`),
    onSuccess: () => {
      toast.success("Goal type deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-goal-types"] });
      setDeleteTarget(null);
      if (editing?.id === deleteTarget?.id) resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete goal type"),
  });

  const filtered = useMemo(() => {
    const q = (appliedSearch || searchInput).trim().toLowerCase();
    return goalTypes
      .filter((gt) => {
        const isActive = gt.isActive !== false && gt.status !== "inactive";
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive) return false;
        if (q) {
          const text = `${gt.name} ${gt.description || ""}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [goalTypes, appliedSearch, searchInput, statusFilter, sortAsc]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Goal Type Name is required");
    saveMutation.mutate();
  };

  const startEdit = (item: GoalTypeItem) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || "");
    setStatus(item.isActive === false ? "inactive" : "active");
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Goal Types"
        description="Manage goal types used to categorize employee objectives."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form Card */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-xl shadow-xs p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {editing ? "Edit Goal Type" : "Add New Goal Type"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editing
                ? "Update the selected goal type details"
                : "Fill in the details to create a new goal type"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Goal Type Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Personal, Professional, Team"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the goal type"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {editing && (
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editing
                  ? "Update Goal Type"
                  : "Add Goal Type"}
              </Button>
            </div>
          </form>
        </div>

        {/* Right List Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Filter Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setAppliedSearch(searchInput)}
                  placeholder="Search goal types..."
                  className="pl-9 h-9 bg-background"
                />
              </div>
              <Button
                type="button"
                onClick={() => setAppliedSearch(searchInput)}
                className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white px-4"
              >
                Search
              </Button>
            </div>

            <div className="w-full sm:w-[220px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-background">
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

          {/* Table Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/50">
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => setSortAsc((p) => !p)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <span>Name</span>
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground w-28">
                      Status
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5 w-28">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="p-10 text-center text-sm text-muted-foreground">
                        Loading goal types...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-10 text-center text-sm text-muted-foreground">
                        No goal types found. Create your first goal type on the left.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((gt) => {
                      const desc = gt.description || "";
                      const isLong = desc.length > 90;
                      const expanded = Boolean(expandedIds[gt.id]);
                      const isActive = gt.isActive !== false && gt.status !== "inactive";
                      return (
                        <tr key={gt.id} className="hover:bg-muted/35 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Target className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">
                                  {gt.name}
                                </div>
                                {desc && (
                                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {isLong && !expanded ? `${desc.slice(0, 90)}...` : desc}
                                  </div>
                                )}
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedIds((prev) => ({
                                        ...prev,
                                        [gt.id]: !prev[gt.id],
                                      }))
                                    }
                                    className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-600 hover:text-sky-700 mt-1"
                                  >
                                    {expanded ? (
                                      <>
                                        <ChevronUp className="h-3.5 w-3.5" /> Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3.5 w-3.5" /> Show more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 align-middle">
                            {isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 pr-5 align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                                title="Edit Goal Type"
                                onClick={() => startEdit(gt)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                title="Delete Goal Type"
                                onClick={() => setDeleteTarget(gt)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Goal Type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
