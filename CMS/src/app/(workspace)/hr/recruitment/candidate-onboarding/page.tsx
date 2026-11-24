"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

function formatDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function getInitials(name?: string | null): string {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name || "?").slice(0, 2).toUpperCase();
}

const AVATAR_TONES = [
  "bg-blue-500/15 text-blue-700 border-blue-500/25",
  "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  "bg-amber-500/15 text-amber-700 border-amber-500/25",
  "bg-rose-500/15 text-rose-700 border-rose-500/25",
  "bg-purple-500/15 text-purple-700 border-purple-500/25",
];

function getTone(seed?: string | null): string {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

function normalizeStatus(raw?: string | null): "pending" | "in_progress" | "completed" {
  const s = String(raw || "pending").toLowerCase().replace(/\s+/g, "_");
  if (s === "completed" || s === "complete") return "completed";
  if (s === "in_progress" || s === "inprogress" || s === "active") return "in_progress";
  return "pending";
}

function getBuddyName(buddy: any): string {
  if (!buddy) return "Unassigned";
  return [buddy.firstName, buddy.lastName].filter(Boolean).join(" ") || buddy.email || "Unassigned";
}

export default function HrCandidateOnboardingPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [sortField, setSortField] = useState<"startDate" | "createdAt" | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const [nextStatus, setNextStatus] = useState<"pending" | "in_progress" | "completed">("in_progress");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    personKey: "", // "cand:<id>" or "emp:<id>"
    templateId: "",
    startDate: new Date().toISOString().slice(0, 10),
    buddyId: "",
  });

  const { data: onboardings = [], isLoading } = useQuery({
    queryKey: ["hr-candidate-onboarding"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/candidate-onboarding");
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

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-onboarding"],
    queryFn: async () => {
      const res: any = await api.get("/hr/employees", { params: { limit: 100 } }).catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["hr-candidates-onboarding"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/candidates").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modalMode === "create" && !form.personKey) throw new Error("Employee is required.");
      if (!form.templateId) throw new Error("Onboarding Checklist is required.");
      if (!form.startDate) throw new Error("Start Date is required.");

      const payload: any = {
        templateId: form.templateId,
        startDate: form.startDate,
        buddyId: form.buddyId || null,
      };

      if (modalMode === "create") {
        if (form.personKey.startsWith("cand:")) {
          payload.candidateId = form.personKey.slice(5);
        } else if (form.personKey.startsWith("emp:")) {
          payload.employeeId = form.personKey.slice(4);
        }
        return await api.post("/hr/recruitment/candidate-onboarding", payload);
      }

      return await api.put(`/hr/recruitment/candidate-onboarding/${editingItem.id}`, payload);
    },
    onSuccess: () => {
      toast.success(modalMode === "edit" ? "Onboarding updated" : "Onboarding started");
      setModalMode(null);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-onboarding"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save onboarding"),
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      return await api.put(`/hr/recruitment/candidate-onboarding/${statusTarget.id}`, {
        status: nextStatus,
      });
    },
    onSuccess: () => {
      toast.success("Onboarding status updated");
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-onboarding"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/candidate-onboarding/${id}`),
    onSuccess: () => {
      toast.success("Onboarding record deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-onboarding"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete onboarding"),
  });

  const counts = useMemo(() => {
    const all = onboardings.length;
    const pending = onboardings.filter((o: any) => normalizeStatus(o.status) === "pending").length;
    const inProgress = onboardings.filter((o: any) => normalizeStatus(o.status) === "in_progress").length;
    const completed = onboardings.filter((o: any) => normalizeStatus(o.status) === "completed").length;
    return { all, pending, inProgress, completed };
  }, [onboardings]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = onboardings.filter((o: any) => {
      const st = normalizeStatus(o.status);
      if (statusTab !== "all" && st !== statusTab) return false;
      if (employeeFilter !== "all" && o.candidateId !== employeeFilter) return false;
      if (!q) return true;
      return (
        String(o.candidate?.fullName || "").toLowerCase().includes(q) ||
        String(o.candidate?.email || "").toLowerCase().includes(q) ||
        String(o.template?.name || "").toLowerCase().includes(q) ||
        getBuddyName(o.buddy).toLowerCase().includes(q)
      );
    });
    if (sortField) {
      list = [...list].sort((a: any, b: any) => {
        const av = sortField === "startDate" ? String(a.joiningDate || "") : String(a.createdAt || "");
        const bv = sortField === "startDate" ? String(b.joiningDate || "") : String(b.createdAt || "");
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [onboardings, searchQuery, employeeFilter, statusTab, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      personKey: "",
      templateId: "",
      startDate: new Date().toISOString().slice(0, 10),
      buddyId: "",
    });
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      personKey: item.candidateId ? `cand:${item.candidateId}` : "",
      templateId: item.templateId || "",
      startDate: formatDate(item.joiningDate),
      buddyId: item.buddyId || "",
    });
    setModalMode("edit");
  };

  const toggleSort = (field: "startDate" | "createdAt") => {
    if (sortField === field) setSortAsc((p) => !p);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Candidate Onboarding</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track and manage onboarding progress for new candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
        >
          <i className="ph-bold ph-plus text-sm" />
          Start Onboarding
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
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[160px]"
            >
              <option value="all">All Employees</option>
              {onboardings.map((o: any) => (
                <option key={o.candidateId} value={o.candidateId}>
                  {o.candidate?.fullName || o.candidate?.email}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setEmployeeFilter("all");
              setStatusTab("all");
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-funnel text-sm" />
            Filters
          </button>
        </div>

        <div className="flex items-center gap-5 px-4 pt-2.5 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", icon: "ph-squares-four", count: counts.all },
            { key: "pending" as const, label: "Pending", icon: "ph-clock", count: counts.pending },
            { key: "in_progress" as const, label: "In Progress", icon: "ph-play-circle", count: counts.inProgress },
            { key: "completed" as const, label: "Completed", icon: "ph-check-circle", count: counts.completed },
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
                className={`inline-flex items-center gap-2 pb-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
                  Employee
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Checklist
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort("startDate")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Start Date <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Buddy
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort("createdAt")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Created <i className="ph ph-caret-up-down text-xs" />
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
                      <div className="h-10 rounded bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                    No onboarding records found. Click &ldquo;+ Start Onboarding&rdquo; to begin.
                  </td>
                </tr>
              ) : (
                paginated.map((item: any, idx: number) => {
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  const empName = item.candidate?.fullName || "Candidate";
                  const empEmail = item.candidate?.email || "";
                  const buddyName = getBuddyName(item.buddy);
                  const buddyEmail = item.buddy?.email || "";
                  const st = normalizeStatus(item.status);

                  return (
                    <tr key={item.id} className="hover:bg-muted/35 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">{rowNum}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(
                              empName
                            )}`}
                          >
                            {getInitials(empName)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/hr/recruitment/candidate-onboarding/${item.id}`}
                              className="text-xs font-semibold text-foreground hover:text-emerald-600 block truncate"
                            >
                              {empName}
                            </Link>
                            <p className="text-[11px] text-muted-foreground truncate">{empEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-foreground">
                        {item.template?.name || "Standard Onboarding"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          {formatDate(item.joiningDate)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(
                              buddyName
                            )}`}
                          >
                            {getInitials(buddyName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{buddyName}</p>
                            {buddyEmail && (
                              <p className="text-[11px] text-muted-foreground truncate">{buddyEmail}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {st === "completed" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[11px] font-semibold">
                            Completed
                          </span>
                        ) : st === "in_progress" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[11px] font-semibold">
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[11px] font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          {formatDate(item.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/hr/recruitment/candidate-onboarding/${item.id}`}
                            title="View Onboarding Details"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10"
                          >
                            <i className="ph ph-eye text-[15px]" />
                          </Link>
                          <button
                            type="button"
                            title="Edit Onboarding"
                            onClick={() => openEdit(item)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10"
                          >
                            <i className="ph ph-pencil-simple-line text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Update Onboarding Status"
                            onClick={() => {
                              setStatusTarget(item);
                              setNextStatus(st);
                            }}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-500/10"
                          >
                            <i className="ph ph-arrows-clockwise text-[15px]" />
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

      {/* Start / Edit Onboarding Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {modalMode === "edit" ? "Edit Onboarding" : "Start Onboarding"}
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
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={modalMode === "edit"}
                  value={form.personKey}
                  onChange={(e) => setForm((p) => ({ ...p, personKey: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 disabled:opacity-60"
                >
                  <option value="">Select Employee / Candidate</option>
                  {candidates.length > 0 && (
                    <optgroup label="Candidates">
                      {candidates.map((c: any) => (
                        <option key={`cand:${c.id}`} value={`cand:${c.id}`}>
                          {c.fullName || c.email}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {employees.length > 0 && (
                    <optgroup label="Employees">
                      {employees.map((e: any) => {
                        const label =
                          e.fullName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
                        return (
                          <option key={`emp:${e.id}`} value={`emp:${e.id}`}>
                            {label}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Onboarding Checklist <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.templateId}
                  onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Onboarding Checklist</option>
                  {checklists.map((cl: any) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Buddy Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.buddyId}
                  onChange={(e) => setForm((p) => ({ ...p, buddyId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Buddy Employee</option>
                  {employees.map((e: any) => {
                    const label =
                      e.fullName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
                    return (
                      <option key={e.id} value={e.id}>
                        {label}
                      </option>
                    );
                  })}
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

      {/* Update Onboarding Status Modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Update Onboarding Status</h3>
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-x text-base" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusTarget(null)}
                  className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate()}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {statusMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
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
                <h3 className="text-sm font-bold text-foreground">Delete Onboarding Record</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete onboarding for{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget.candidate?.fullName || "this candidate"}
                  </span>
                  ?
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
