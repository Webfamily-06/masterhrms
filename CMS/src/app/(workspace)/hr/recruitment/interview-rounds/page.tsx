"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

function formatDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export default function HrInterviewRoundsPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all");
  const [sortAsc, setSortAsc] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    jobPostingId: "",
    name: "",
    sequence: "1",
    description: "",
    status: "active" as "active" | "inactive",
  });

  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ["hr-recruitment-interview-rounds"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/interview-rounds");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: jobPostings = [] } = useQuery({
    queryKey: ["hr-job-postings-select"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-postings").catch(() => []);
      return Array.isArray(res) ? res : res?.data || res?.jobs || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Round name is required.");
      const seq = Number(form.sequence);
      if (!Number.isFinite(seq) || seq < 1) throw new Error("Sequence Number must be at least 1.");

      const payload = {
        jobPostingId: form.jobPostingId || null,
        name: form.name.trim(),
        sequence: seq,
        description: form.description.trim(),
        isActive: form.status === "active",
      };
      if (modalMode === "edit" && editingItem?.id) {
        return await api.put(`/hr/recruitment/interview-rounds/${editingItem.id}`, payload);
      }
      return await api.post("/hr/recruitment/interview-rounds", payload);
    },
    onSuccess: () => {
      toast.success(modalMode === "edit" ? "Interview round updated" : "Interview round added");
      setModalMode(null);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-interview-rounds"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save interview round"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: any) =>
      api.put(`/hr/recruitment/interview-rounds/${item.id}`, { isActive: !item.isActive }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-interview-rounds"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/interview-rounds/${id}`),
    onSuccess: () => {
      toast.success("Interview round deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-interview-rounds"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete interview round"),
  });

  const counts = useMemo(() => {
    const all = rounds.length;
    const active = rounds.filter((r: any) => r.isActive !== false).length;
    return { all, active, inactive: all - active };
  }, [rounds]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = rounds.filter((r: any) => {
      const active = r.isActive !== false;
      if (statusTab === "active" && !active) return false;
      if (statusTab === "inactive" && active) return false;
      if (jobFilter !== "all" && r.jobPostingId !== jobFilter) return false;
      if (!q) return true;
      return (
        String(r.name || "").toLowerCase().includes(q) ||
        String(r.description || "").toLowerCase().includes(q) ||
        String(r.jobPosting?.title || "").toLowerCase().includes(q) ||
        String(r.jobPosting?.jobCode || "").toLowerCase().includes(q)
      );
    });
    if (sortAsc !== null) {
      list = [...list].sort((a: any, b: any) => {
        const cmp = String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
        return sortAsc ? cmp : -cmp;
      });
    }
    return list;
  }, [rounds, searchQuery, jobFilter, statusTab, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const openCreate = () => {
    setEditingItem(null);
    setForm({ jobPostingId: "", name: "", sequence: "1", description: "", status: "active" });
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      jobPostingId: item.jobPostingId || "",
      name: item.name || "",
      sequence: String(item.sequence ?? 1),
      description: item.description || "",
      status: item.isActive !== false ? "active" : "inactive",
    });
    setModalMode("edit");
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Interview Rounds</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage interview rounds and stages in your hiring pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
        >
          <i className="ph-bold ph-plus text-sm" />
          Add Interview Round
        </button>
      </div>

      {/* Filter & Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-56">
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
              value={jobFilter}
              onChange={(e) => {
                setJobFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[160px]"
            >
              <option value="all">All Jobs</option>
              {jobPostings.map((j: any) => (
                <option key={j.id} value={j.id}>
                  {j.jobCode ? `${j.jobCode} - ${j.title}` : j.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setJobFilter("all");
              setStatusTab("all");
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-funnel text-sm" />
            Filters
          </button>
        </div>

        <div className="flex items-center gap-5 px-4 pt-2.5">
          {[
            { key: "all" as const, label: "All", icon: "ph-squares-four", count: counts.all },
            { key: "active" as const, label: "Active", icon: "ph-check-circle", count: counts.active },
            { key: "inactive" as const, label: "Inactive", icon: "ph-x-circle", count: counts.inactive },
          ].map((tab) => {
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusTab(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`ph ${tab.icon} text-sm`} />
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                    active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
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
                  Job
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Sequence
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setSortAsc((p) => (p === null ? true : !p))}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Created At <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="p-4">
                      <div className="h-8 rounded bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                    No interview rounds found. Click &ldquo;+ Add Interview Round&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((round: any, idx: number) => {
                  const active = round.isActive !== false;
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr key={round.id} className="hover:bg-muted/35 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">{rowNum}</td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-semibold text-foreground">
                          {round.jobPosting?.title || "General Pipeline"}
                        </p>
                        {round.jobPosting?.jobCode && (
                          <p className="text-[11px] text-muted-foreground ">
                            {round.jobPosting.jobCode}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/25 text-xs font-semibold">
                          {round.sequence ?? 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-foreground">{round.name}</td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {round.description || "—"}
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
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          {formatDate(round.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View"
                            onClick={() => setViewItem(round)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10"
                          >
                            <i className="ph ph-eye text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(round)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10"
                          >
                            <i className="ph ph-pencil-simple-line text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title={active ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatusMutation.mutate(round)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-500/10"
                          >
                            <i className={`ph ${active ? "ph-lock-simple" : "ph-lock-simple-open"} text-[15px]`} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteTarget(round)}
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

      {/* View Modal — Interview Round Details */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <i className="ph ph-users-three text-lg" />
                </div>
                <h3 className="text-base font-bold text-foreground">Interview Round Details</h3>
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
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-users text-sm" /> Name
                </p>
                <p className="text-sm font-bold text-foreground">{viewItem.name}</p>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-hash text-sm" /> Sequence Number
                </p>
                <div>
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/25 font-semibold">
                    {viewItem.sequence ?? 1}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-briefcase text-sm" /> Job
                </p>
                <p className="text-sm font-bold text-foreground">
                  {viewItem.jobPosting?.title || "General Pipeline"}
                </p>
                {viewItem.jobPosting?.jobCode && (
                  <p className="text-xs text-muted-foreground ">{viewItem.jobPosting.jobCode}</p>
                )}
              </div>
              <div className="space-y-1">
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
              <div className="sm:col-span-2 space-y-1">
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
                {modalMode === "edit" ? "Edit Interview Round" : "Add New Interview Round"}
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
                  Job <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.jobPostingId}
                  onChange={(e) => setForm((p) => ({ ...p, jobPostingId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Job Posting</option>
                  {jobPostings.map((j: any) => (
                    <option key={j.id} value={j.id}>
                      {j.jobCode ? `${j.jobCode} - ${j.title}` : j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Technical Interview"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Sequence Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.sequence}
                  onChange={(e) => setForm((p) => ({ ...p, sequence: e.target.value.replace(/[^0-9]/g, "") }))}
                  placeholder="e.g. 1"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Technical assessment to evaluate coding skills..."
                  className="w-full p-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 resize-y"
                />
              </div>

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
                <h3 className="text-sm font-bold text-foreground">Delete Interview Round</h3>
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
