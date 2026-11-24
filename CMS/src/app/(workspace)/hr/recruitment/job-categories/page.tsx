"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function HrJobCategoriesPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["hr-recruitment-job-categories"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-categories");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Category Name is required.");
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (editingItem?.id) {
        return await api.put(`/hr/recruitment/job-categories/${editingItem.id}`, payload);
      }
      return await api.post("/hr/recruitment/job-categories", payload);
    },
    onSuccess: () => {
      toast.success(editingItem ? "Job category updated" : "Job category created");
      setEditingItem(null);
      setForm({ name: "", description: "", isActive: true });
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-job-categories"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save job category"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: any) =>
      api.put(`/hr/recruitment/job-categories/${item.id}`, { isActive: !(item.isActive !== false) }),
    onSuccess: () => {
      toast.success("Job category status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-job-categories"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/job-categories/${id}`),
    onSuccess: () => {
      toast.success("Job category deleted");
      if (editingItem?.id === deleteTarget?.id) {
        setEditingItem(null);
        setForm({ name: "", description: "", isActive: true });
      }
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-job-categories"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete job category"),
  });

  const filtered = useMemo(() => {
    const q = (appliedSearch || searchInput).trim().toLowerCase();
    const list = categories.filter((c: any) => {
      const active = c.isActive !== false;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (!q) return true;
      return (
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.description || "").toLowerCase().includes(q)
      );
    });
    return [...list].sort((a: any, b: any) => {
      const cmp = String(a.name || "").localeCompare(String(b.name || ""));
      return sortAsc ? cmp : -cmp;
    });
  }, [categories, appliedSearch, searchInput, statusFilter, sortAsc]);

  const startEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      isActive: item.isActive !== false,
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setForm({ name: "", description: "", isActive: true });
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Job Categories</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage job categories used to classify open positions.
        </p>
      </div>

      {/* 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form Card (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border/70">
            <h2 className="text-sm font-bold text-foreground">
              {editingItem ? "Edit Job Category" : "Add New Job Category"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingItem
                ? "Update the selected job category details"
                : "Fill in the details to create a new job category"}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Category Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Engineering, Marketing, Finance"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of the job category"
                className="w-full p-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "active" }))}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="pt-2 border-t border-border/70 flex items-center gap-2">
              {editingItem && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingItem
                    ? "Update Job Category"
                    : "Add Job Category"}
              </button>
            </div>
          </form>
        </div>

        {/* Right List & Filter Column (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Status Filter Card */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedSearch(searchInput);
              }}
              className="flex items-center gap-2.5"
            >
              <div className="relative flex-1">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search job categories..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Search
              </button>
            </form>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[180px]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Categories Table Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40">
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => setSortAsc((v) => !v)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Name <i className="ph ph-caret-up-down text-xs" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">
                      Status
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={3} className="p-4">
                          <div className="h-10 rounded bg-muted animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-xs text-muted-foreground">
                        No job categories found. Use the form on the left to add one.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cat: any) => {
                      const active = cat.isActive !== false;
                      const desc = String(cat.description || "").trim();
                      const isLong = desc.length > 95;
                      const isExpanded = Boolean(expandedIds[cat.id]);
                      const displayDesc = isLong && !isExpanded ? `${desc.slice(0, 95)}...` : desc;

                      return (
                        <tr key={cat.id} className="hover:bg-muted/35 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                <i className="ph ph-briefcase text-base" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-xs font-bold text-foreground">{cat.name}</p>
                                {desc && (
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {displayDesc}
                                  </p>
                                )}
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedIds((p) => ({ ...p, [cat.id]: !p[cat.id] }))
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline pt-0.5"
                                  >
                                    <i className={`ph ${isExpanded ? "ph-caret-up" : "ph-caret-down"} text-xs`} />
                                    {isExpanded ? "Show less" : "Show more"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[11px] font-semibold">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 border border-slate-500/20 text-[11px] font-semibold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => startEdit(cat)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                              >
                                <i className="ph ph-pencil-simple-line text-[15px]" />
                              </button>
                              <button
                                type="button"
                                title={active ? "Deactivate" : "Activate"}
                                onClick={() => toggleStatusMutation.mutate(cat)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                              >
                                <i className={`ph ${active ? "ph-lock-simple" : "ph-lock-simple-open"} text-[15px]`} />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => setDeleteTarget(cat)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              >
                                <i className="ph ph-trash text-[15px]" />
                              </button>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <i className="ph ph-warning text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Job Category</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">{deleteTarget.name}</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-8 px-3.5 rounded-lg border border-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="h-8 px-4 rounded-lg bg-rose-600 text-white text-xs font-semibold disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
