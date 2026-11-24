"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface SplitMasterConfig {
  pageTitle: string;
  pageSubtitle: string;
  formCreateTitle: string;
  formCreateSubtitle: string;
  formEditTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  addButtonLabel: string;
  updateButtonLabel: string;
  searchPlaceholder: string;
  endpoint: string;
  queryKey: string;
  iconClass: string;
  iconBoxClass: string;
}

export function SplitMasterCrud({ config }: { config: SplitMasterConfig }) {
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortAsc, setSortAsc] = useState<boolean | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [config.queryKey],
    queryFn: async () => {
      const res: any = await api.get(config.endpoint);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setStatus("active");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error(`${config.nameLabel} is required.`);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        isActive: status === "active",
      };
      if (editingId) {
        return await api.put(`${config.endpoint}/${editingId}`, payload);
      }
      return await api.post(config.endpoint, payload);
    },
    onSuccess: () => {
      toast.success(editingId ? `${config.pageTitle.replace(/s$/, "")} updated` : `${config.pageTitle.replace(/s$/, "")} added`);
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: any) => {
      return await api.put(`${config.endpoint}/${item.id}`, {
        isActive: !item.isActive,
      });
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`${config.endpoint}/${id}`),
    onSuccess: () => {
      toast.success("Deleted successfully");
      setDeleteTarget(null);
      if (editingId === deleteTarget?.id) resetForm();
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete"),
  });

  const filteredItems = useMemo(() => {
    const q = (appliedSearch || searchInput).trim().toLowerCase();
    let list = items.filter((item: any) => {
      const active = item.isActive !== false;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (!q) return true;
      return (
        String(item.name || "").toLowerCase().includes(q) ||
        String(item.description || "").toLowerCase().includes(q)
      );
    });
    if (sortAsc !== null) {
      list = [...list].sort((a: any, b: any) => {
        const cmp = String(a.name || "").localeCompare(String(b.name || ""));
        return sortAsc ? cmp : -cmp;
      });
    }
    return list;
  }, [items, appliedSearch, searchInput, statusFilter, sortAsc]);

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name || "");
    setDescription(item.description || "");
    setStatus(item.isActive !== false ? "active" : "inactive");
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{config.pageTitle}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{config.pageSubtitle}</p>
      </div>

      {/* 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form Card */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border/70">
            <h2 className="text-sm font-bold text-foreground">
              {editingId ? config.formEditTitle : config.formCreateTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{config.formCreateSubtitle}</p>
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
                {config.nameLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={config.namePlaceholder}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={config.descriptionPlaceholder}
                className="w-full p-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="pt-2 border-t border-border/70 flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-9 px-3.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
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
                  : editingId
                    ? config.updateButtonLabel
                    : config.addButtonLabel}
              </button>
            </div>
          </form>
        </div>

        {/* Right Filter + List Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Status Filter Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value) setAppliedSearch("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setAppliedSearch(searchInput);
                  }}
                  placeholder={config.searchPlaceholder}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>
              <button
                type="button"
                onClick={() => setAppliedSearch(searchInput)}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shrink-0"
              >
                Search
              </button>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 w-48 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Table Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40">
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => setSortAsc((p) => (p === null ? true : !p))}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Name
                        <i className="ph ph-caret-up-down text-xs" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28 text-center">
                      Status
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32 text-right">
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
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-xs text-muted-foreground">
                        No records found. Use the form on the left to add one.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item: any) => {
                      const active = item.isActive !== false;
                      const desc = String(item.description || "");
                      const isLong = desc.length > 90;
                      const expanded = Boolean(expandedIds[item.id]);

                      return (
                        <tr key={item.id} className="hover:bg-muted/35 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${config.iconBoxClass}`}
                              >
                                <i className={`ph ${config.iconClass} text-base`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-foreground">{item.name}</p>
                                {desc && (
                                  <div className="mt-0.5">
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      {isLong && !expanded ? `${desc.slice(0, 90)}...` : desc}
                                    </p>
                                    {isLong && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedIds((p) => ({ ...p, [item.id]: !p[item.id] }))
                                        }
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:underline mt-0.5"
                                      >
                                        <i className={`ph ${expanded ? "ph-caret-up" : "ph-caret-down"} text-[10px]`} />
                                        {expanded ? "Show less" : "Show more"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 border border-slate-500/20 text-[11px] font-semibold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => startEdit(item)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10 transition-colors"
                              >
                                <i className="ph ph-pencil-simple-line text-[15px]" />
                              </button>
                              <button
                                type="button"
                                title={active ? "Deactivate" : "Activate"}
                                onClick={() => toggleStatusMutation.mutate(item)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-500/10 transition-colors"
                              >
                                <i className={`ph ${active ? "ph-lock-simple" : "ph-lock-simple-open"} text-[15px]`} />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => setDeleteTarget(item)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
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
                <h3 className="text-sm font-bold text-foreground">Confirm Delete</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget.name}</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-8 px-3.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-60"
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
