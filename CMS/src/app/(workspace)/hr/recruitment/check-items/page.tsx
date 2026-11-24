"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = [
  "Training",
  "IT Setup",
  "Documentation",
  "HR",
  "Compliance",
  "Orientation",
  "Other",
];

function getCategoryBadgeClass(cat?: string | null): string {
  switch (String(cat || "").toLowerCase()) {
    case "training":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "it setup":
    case "it_setup":
    case "it":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
    case "documentation":
    case "document":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20";
    case "compliance":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "hr":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "orientation":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function HrChecklistItemsPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [checklistFilter, setChecklistFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "required" | "optional">("all");
  const [sortAsc, setSortAsc] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    templateId: "",
    title: "",
    description: "",
    category: "",
    isMandatory: true,
    status: "active" as "active" | "inactive",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["hr-recruitment-check-items"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/check-items");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["hr-recruitment-onboarding-checklists"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/onboarding-checklists").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const checklistNameMap = useMemo(() => {
    const m = new Map<string, string>();
    checklists.forEach((c: any) => m.set(c.id, c.name));
    return m;
  }, [checklists]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.templateId) throw new Error("Checklist is required.");
      if (!form.title.trim()) throw new Error("Task Name is required.");
      if (!form.category) throw new Error("Category is required.");
      const payload = {
        templateId: form.templateId,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        isMandatory: form.isMandatory,
        isActive: form.status === "active",
      };
      if (modalMode === "edit" && editingItem?.id) {
        return await api.put(`/hr/recruitment/check-items/${editingItem.id}`, payload);
      }
      return await api.post("/hr/recruitment/check-items", payload);
    },
    onSuccess: () => {
      toast.success(modalMode === "edit" ? "Checklist item updated" : "Checklist item added");
      setModalMode(null);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-check-items"] });
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-onboarding-checklists"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save checklist item"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: any) =>
      api.put(`/hr/recruitment/check-items/${item.id}`, { isActive: !item.isActive }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-check-items"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/check-items/${id}`),
    onSuccess: () => {
      toast.success("Checklist item deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-check-items"] });
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-onboarding-checklists"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete checklist item"),
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = items.filter((item: any) => {
      if (categoryFilter !== "all" && String(item.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (checklistFilter !== "all" && item.templateId !== checklistFilter) {
        return false;
      }
      if (typeFilter === "required" && !item.isMandatory) return false;
      if (typeFilter === "optional" && item.isMandatory) return false;
      if (!q) return true;
      const clName = item.template?.name || checklistNameMap.get(item.templateId) || "";
      return (
        String(item.title || "").toLowerCase().includes(q) ||
        String(item.description || "").toLowerCase().includes(q) ||
        String(item.category || "").toLowerCase().includes(q) ||
        clName.toLowerCase().includes(q)
      );
    });
    if (sortAsc !== null) {
      list = [...list].sort((a: any, b: any) => {
        const cmp = String(a.title || "").localeCompare(String(b.title || ""));
        return sortAsc ? cmp : -cmp;
      });
    }
    return list;
  }, [items, searchQuery, categoryFilter, checklistFilter, typeFilter, sortAsc, checklistNameMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      templateId: "",
      title: "",
      description: "",
      category: "",
      isMandatory: false,
      status: "active",
    });
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      templateId: item.templateId || "",
      title: item.title || "",
      description: item.description || "",
      category: item.category || "Training",
      isMandatory: Boolean(item.isMandatory),
      status: item.isActive !== false ? "active" : "inactive",
    });
    setModalMode("edit");
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Checklist Items</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage individual items within onboarding checklists.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
        >
          <i className="ph-bold ph-plus text-sm" />
          Add Item
        </button>
      </div>

      {/* Filter Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-52">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[140px]"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={checklistFilter}
            onChange={(e) => {
              setChecklistFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[155px]"
          >
            <option value="all">All Checklists</option>
            {checklists.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[125px]"
          >
            <option value="all">All Types</option>
            <option value="required">Required</option>
            <option value="optional">Optional</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setCategoryFilter("all");
            setChecklistFilter("all");
            setTypeFilter("all");
            setPage(1);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/60"
        >
          <i className="ph ph-funnel text-sm" />
          Filters
        </button>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40">
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-12">
                  #
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Checklist
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setSortAsc((p) => (p === null ? true : !p))}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Task <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="p-4">
                      <div className="h-8 rounded bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                    No checklist items found. Click &ldquo;+ Add Item&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((item: any, idx: number) => {
                  const active = item.isActive !== false;
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  const clName = item.template?.name || checklistNameMap.get(item.templateId) || "—";

                  return (
                    <tr key={item.id} className="hover:bg-muted/35 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">{rowNum}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-foreground">{clName}</td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-foreground">{item.title}</p>
                          {item.isMandatory && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-semibold">
                              Required
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-medium ${getCategoryBadgeClass(
                            item.category
                          )}`}
                        >
                          {item.category || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
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
                            title="View"
                            onClick={() => setViewItem(item)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10"
                          >
                            <i className="ph ph-eye text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(item)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10"
                          >
                            <i className="ph ph-pencil-simple-line text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title={active ? "Disable" : "Enable"}
                            onClick={() => toggleStatusMutation.mutate(item)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-500/10"
                          >
                            <i className={`ph ${active ? "ph-lock-simple" : "ph-lock-simple-open"} text-[15px]`} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteTarget(item)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10"
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1} to{" "}
            {Math.min(safePage * rowsPerPage, filtered.length)} of {filtered.length} results
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 px-2 rounded border border-border bg-background text-xs text-foreground"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2.5 rounded border border-border disabled:opacity-40 hover:bg-muted/60"
              >
                &laquo; Previous
              </button>
              <span className="h-7 min-w-[28px] px-2 inline-flex items-center justify-center rounded bg-emerald-600 text-white font-semibold">
                {safePage}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2.5 rounded border border-border disabled:opacity-40 hover:bg-muted/60"
              >
                Next &raquo;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal — Checklist Item Details */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <i className="ph ph-check-square text-lg" />
                </div>
                <h3 className="text-base font-bold text-foreground">Checklist Item Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-x text-base" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1.5">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-check-square text-sm" /> Task Name
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{viewItem.title}</span>
                  {viewItem.isMandatory && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-semibold">
                      Required
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-check-square-offset text-sm" /> Checklist
                </p>
                <p className="text-sm font-bold text-foreground">
                  {viewItem.template?.name || checklistNameMap.get(viewItem.templateId) || "—"}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-tag text-sm" /> Category
                </p>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md border font-semibold ${getCategoryBadgeClass(
                      viewItem.category
                    )}`}
                  >
                    {viewItem.category || "General"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-lock-simple text-sm" /> Status
                </p>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md border font-semibold ${
                      viewItem.isActive !== false
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                    }`}
                  >
                    {viewItem.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-file-text text-sm" /> Description
                </p>
                <p className="text-sm font-medium text-foreground">
                  {viewItem.description || "No description provided."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {modalMode === "edit" ? "Edit Checklist Item" : "Add New Checklist Item"}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-x text-base" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Checklist <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.templateId}
                  onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Checklist</option>
                  {checklists.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Task Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Submit signed employment contract"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Employee must sign and return the employment contract..."
                  className="w-full p-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isMandatory}
                  onChange={(e) => setForm((p) => ({ ...p, isMandatory: e.target.checked }))}
                  className="h-4 w-4 rounded border-emerald-500 text-emerald-600 accent-emerald-600"
                />
                <span className="text-xs font-semibold text-foreground">Required Task</span>
              </label>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <i className="ph ph-warning text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Checklist Item</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget.title}</span>?
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
