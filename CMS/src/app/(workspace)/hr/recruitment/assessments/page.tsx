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

function getInitials(name?: string | null): string {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name || "?").slice(0, 2).toUpperCase();
}

const AVATAR_TONES = [
  "bg-amber-500/15 text-amber-700 border-amber-500/25",
  "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  "bg-sky-500/15 text-sky-700 border-sky-500/25",
  "bg-purple-500/15 text-purple-700 border-purple-500/25",
  "bg-rose-500/15 text-rose-700 border-rose-500/25",
];

function getTone(seed?: string | null): string {
  const s = String(seed || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

function normalizeStatus(a: any): "pending" | "pass" | "fail" {
  const st = String(a?.status || "").toLowerCase();
  if (st === "pass" || st === "passed" || a?.passed === true) return "pass";
  if (st === "fail" || st === "failed" || a?.passed === false) return "fail";
  return "pending";
}

function getEvaluatorName(ev: any): string {
  if (!ev) return "Unassigned";
  return [ev.firstName, ev.lastName].filter(Boolean).join(" ") || ev.email || "Unassigned";
}

export default function HrCandidateAssessmentsPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "pass" | "fail">("all");
  const [sortField, setSortField] = useState<"assessment" | "date" | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    candidateId: "",
    assessmentName: "",
    score: "",
    maxScore: "100",
    status: "pending" as "pending" | "pass" | "fail",
    evaluatorId: "",
    assessmentDate: new Date().toISOString().slice(0, 10),
    comments: "",
  });

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["hr-candidate-assessments"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/assessments");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["hr-recruitment-candidates-all"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/candidates").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-evaluators"],
    queryFn: async () => {
      const res: any = await api.get("/hr/employees", { params: { limit: 100 } }).catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.candidateId) throw new Error("Candidate is required.");
      if (!form.assessmentName.trim()) throw new Error("Assessment Name is required.");
      const payload = {
        candidateId: form.candidateId,
        assessmentName: form.assessmentName.trim(),
        score: form.score !== "" ? Number(form.score) : null,
        maxScore: form.maxScore !== "" ? Number(form.maxScore) : 100,
        status: form.status,
        evaluatorId: form.evaluatorId || null,
        assessmentDate: form.assessmentDate || new Date().toISOString().slice(0, 10),
        comments: form.comments.trim(),
      };
      if (modalMode === "edit" && editingItem?.id) {
        return await api.put(`/hr/recruitment/assessments/${editingItem.id}`, payload);
      }
      return await api.post("/hr/recruitment/assessments", payload);
    },
    onSuccess: () => {
      toast.success(modalMode === "edit" ? "Assessment updated" : "Assessment added");
      setModalMode(null);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-assessments"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save assessment"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/assessments/${id}`),
    onSuccess: () => {
      toast.success("Assessment deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-assessments"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete assessment"),
  });

  const counts = useMemo(() => {
    const all = assessments.length;
    const pending = assessments.filter((a: any) => normalizeStatus(a) === "pending").length;
    const pass = assessments.filter((a: any) => normalizeStatus(a) === "pass").length;
    const fail = assessments.filter((a: any) => normalizeStatus(a) === "fail").length;
    return { all, pending, pass, fail };
  }, [assessments]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = assessments.filter((a: any) => {
      const st = normalizeStatus(a);
      if (statusTab !== "all" && st !== statusTab) return false;
      if (candidateFilter !== "all" && a.candidateId !== candidateFilter) return false;
      if (!q) return true;
      return (
        String(a.candidate?.fullName || "").toLowerCase().includes(q) ||
        String(a.candidate?.email || "").toLowerCase().includes(q) ||
        String(a.template?.title || "").toLowerCase().includes(q) ||
        getEvaluatorName(a.evaluator).toLowerCase().includes(q)
      );
    });
    if (sortField) {
      list = [...list].sort((a: any, b: any) => {
        const av =
          sortField === "assessment"
            ? String(a.template?.title || "")
            : String(a.completedAt || a.assignedAt || a.createdAt || "");
        const bv =
          sortField === "assessment"
            ? String(b.template?.title || "")
            : String(b.completedAt || b.assignedAt || b.createdAt || "");
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [assessments, searchQuery, candidateFilter, statusTab, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      candidateId: "",
      assessmentName: "",
      score: "",
      maxScore: "100",
      status: "pending",
      evaluatorId: "",
      assessmentDate: new Date().toISOString().slice(0, 10),
      comments: "",
    });
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      candidateId: item.candidateId || "",
      assessmentName: item.template?.title || "",
      score: item.score !== null && item.score !== undefined ? String(item.score) : "",
      maxScore: item.totalScore !== null && item.totalScore !== undefined ? String(item.totalScore) : "100",
      status: normalizeStatus(item),
      evaluatorId: item.evaluatorId || "",
      assessmentDate: formatDate(item.completedAt || item.assignedAt || item.createdAt),
      comments: item.evaluationNotes || "",
    });
    setModalMode("edit");
  };

  const toggleSort = (field: "assessment" | "date") => {
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
          <h1 className="text-xl font-bold tracking-tight text-foreground">Candidate Assessments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View and manage assessments assigned to candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
        >
          <i className="ph-bold ph-plus text-sm" />
          Add Assessment
        </button>
      </div>

      {/* Filter & Status Tabs Card */}
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
              value={candidateFilter}
              onChange={(e) => {
                setCandidateFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[160px]"
            >
              <option value="all">All Candidates</option>
              {candidates.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.fullName || c.email}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setCandidateFilter("all");
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
            { key: "pass" as const, label: "Pass", icon: "ph-check-circle", count: counts.pass },
            { key: "fail" as const, label: "Fail", icon: "ph-x-circle", count: counts.fail },
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
                  Candidate
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort("assessment")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Assessment <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Score
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Conducted By
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort("date")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Date <i className="ph ph-caret-up-down text-xs" />
                  </button>
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
                    <td colSpan={8} className="p-4">
                      <div className="h-10 rounded bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                    No candidate assessments found. Click &ldquo;+ Add Assessment&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((a: any, idx: number) => {
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  const st = normalizeStatus(a);
                  const candName = a.candidate?.fullName || "Candidate";
                  const candEmail = a.candidate?.email || "";
                  const evalName = getEvaluatorName(a.evaluator);
                  const evalEmail = a.evaluator?.email || "";
                  const maxScore = Number(a.totalScore) || 100;
                  const hasScore = a.score !== null && a.score !== undefined && st !== "pending";
                  const pct = hasScore && maxScore > 0 ? Math.round((Number(a.score) / maxScore) * 100) : null;

                  return (
                    <tr key={a.id} className="hover:bg-muted/35 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">{rowNum}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(
                              candName
                            )}`}
                          >
                            {getInitials(candName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{candName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{candEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-foreground">
                        {a.template?.title || "Assessment"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasScore ? (
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {a.score}/{maxScore}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{pct}%</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {st === "pass" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                            Pass
                          </span>
                        ) : st === "fail" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[11px] font-semibold">
                            Fail
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[11px] font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {a.evaluator?.avatarUrl ? (
                            <img
                              src={a.evaluator.avatarUrl}
                              alt={evalName}
                              className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div
                              className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(
                                evalName
                              )}`}
                            >
                              {getInitials(evalName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{evalName}</p>
                            {evalEmail && (
                              <p className="text-[11px] text-muted-foreground truncate">{evalEmail}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          {formatDate(a.completedAt || a.assignedAt || a.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View"
                            onClick={() => setViewItem(a)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10"
                          >
                            <i className="ph ph-eye text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(a)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10"
                          >
                            <i className="ph ph-pencil-simple-line text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteTarget(a)}
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

      {/* View Modal — Candidate Assessment Details */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <i className="ph ph-clipboard-text text-lg" />
                </div>
                <h3 className="text-base font-bold text-foreground">Candidate Assessment Details</h3>
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
                  <i className="ph ph-user text-sm" /> Candidate
                </p>
                <p className="text-sm font-bold text-foreground">
                  {viewItem.candidate?.fullName || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-clipboard-text text-sm" /> Assessment Name
                </p>
                <p className="text-sm font-bold text-foreground">
                  {viewItem.template?.title || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-hash text-sm" /> Score
                </p>
                <p className="text-sm font-bold text-foreground">
                  {viewItem.score !== null && viewItem.score !== undefined
                    ? `${viewItem.score}/${viewItem.totalScore || 100} (${Math.round(
                        (Number(viewItem.score) / (Number(viewItem.totalScore) || 100)) * 100
                      )}%)`
                    : "Pending"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-file-text text-sm" /> Status
                </p>
                <div>
                  {(() => {
                    const st = normalizeStatus(viewItem);
                    return (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md border font-semibold ${
                          st === "pass"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : st === "fail"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                        }`}
                      >
                        {st === "pass" ? "Pass" : st === "fail" ? "Fail" : "Pending"}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-user-check text-sm" /> Conducted By
                </p>
                <p className="text-sm font-bold text-foreground">{getEvaluatorName(viewItem.evaluator)}</p>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-calendar-blank text-sm" /> Assessment Date
                </p>
                <p className="text-sm font-bold text-foreground">
                  {formatDate(viewItem.completedAt || viewItem.assignedAt || viewItem.createdAt)}
                </p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <p className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <i className="ph ph-chat-text text-sm" /> Comments
                </p>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {viewItem.evaluationNotes || "No comments provided."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground">
                {modalMode === "edit" ? "Edit Assessment" : "Add New Assessment"}
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
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Candidate <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.candidateId}
                  onChange={(e) => setForm((p) => ({ ...p, candidateId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Candidate</option>
                  {candidates.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Assessment Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.assessmentName}
                  onChange={(e) => setForm((p) => ({ ...p, assessmentName: e.target.value }))}
                  placeholder="e.g. Personality Assessment"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Score <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.score}
                  onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))}
                  placeholder="e.g. 88"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Max Score <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maxScore}
                  onChange={(e) => setForm((p) => ({ ...p, maxScore: e.target.value }))}
                  placeholder="100"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
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
                  <option value="pending">Pending</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Conducted By <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.evaluatorId}
                  onChange={(e) => setForm((p) => ({ ...p, evaluatorId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Evaluator</option>
                  {employees.map((e: any) => {
                    const name =
                      e.fullName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
                    return (
                      <option key={e.id} value={e.id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Assessment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.assessmentDate}
                  onChange={(e) => setForm((p) => ({ ...p, assessmentDate: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Comments</label>
                <textarea
                  rows={3}
                  value={form.comments}
                  onChange={(e) => setForm((p) => ({ ...p, comments: e.target.value }))}
                  placeholder="Enter evaluator feedback and observations..."
                  className="w-full p-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 resize-y"
                />
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
                <h3 className="text-sm font-bold text-foreground">Delete Assessment</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget.template?.title || "this assessment"}
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
