"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type CandidateStage = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

function normalizeStage(raw?: string | null): CandidateStage {
  const s = String(raw || "new").toLowerCase();
  if (s === "screening") return "screening";
  if (s === "interview" || s === "assessment") return "interview";
  if (s === "offer" || s === "offered") return "offer";
  if (s === "hired") return "hired";
  if (s === "rejected" || s === "declined") return "rejected";
  return "new";
}

function stageLabel(st: CandidateStage): string {
  return st.charAt(0).toUpperCase() + st.slice(1);
}

function stageBadgeClass(st: CandidateStage): string {
  switch (st) {
    case "new":
      return "bg-sky-500/10 text-sky-700 border-sky-500/20";
    case "screening":
      return "bg-indigo-500/10 text-indigo-700 border-indigo-500/20";
    case "interview":
      return "bg-purple-500/10 text-purple-700 border-purple-500/20";
    case "offer":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "hired":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "rejected":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  }
}

function formatMoney(val: any): string {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

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
  "bg-purple-500/15 text-purple-700 border-purple-500/25",
  "bg-amber-500/15 text-amber-700 border-amber-500/25",
  "bg-sky-500/15 text-sky-700 border-sky-500/25",
  "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  "bg-rose-500/15 text-rose-700 border-rose-500/25",
];

function getTone(seed?: string | null): string {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

export default function HrCandidatesPage() {
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stageTab, setStageTab] = useState<"all" | CandidateStage>("all");
  const [sortField, setSortField] = useState<"name" | "applied" | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Kanban Drag-and-Drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<CandidateStage | null>(null);

  // Modals
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const [nextStage, setNextStage] = useState<CandidateStage>("new");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    jobPostingId: "",
    sourceId: "",
    yearsOfExperience: "0",
    currentSalary: "",
    expectedSalary: "",
    currentCompany: "",
    currentPosition: "",
    location: "",
    noticePeriodDays: "30",
    stage: "new" as CandidateStage,
    coverLetter: "",
    resumeUrl: "",
  });

  // Queries
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["hr-recruitment-candidates"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/candidates");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: jobPostings = [] } = useQuery({
    queryKey: ["hr-job-postings-candidates"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-postings").catch(() => []);
      return Array.isArray(res) ? res : res?.data || res?.jobs || [];
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["hr-recruitment-candidate-sources"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/candidate-sources").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.fullName.trim()) throw new Error("Full Name is required.");
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        throw new Error("Please enter a valid email address.");
      }
      if (!form.jobPostingId) throw new Error("Job Posting is required.");
      if (form.yearsOfExperience !== "" && Number(form.yearsOfExperience) < 0) {
        throw new Error("Years of experience cannot be negative.");
      }
      if (form.expectedSalary !== "" && Number(form.expectedSalary) < 0) {
        throw new Error("Expected salary cannot be negative.");
      }

      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        jobPostingId: form.jobPostingId,
        sourceId: form.sourceId || null,
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        currentSalary: form.currentSalary !== "" ? Number(form.currentSalary) : null,
        expectedSalary: form.expectedSalary !== "" ? Number(form.expectedSalary) : null,
        currentCompany: form.currentCompany.trim(),
        currentPosition: form.currentPosition.trim(),
        location: form.location.trim(),
        noticePeriodDays: form.noticePeriodDays !== "" ? Number(form.noticePeriodDays) : null,
        stage: form.stage,
        coverLetter: form.coverLetter.trim(),
        resumeUrl: form.resumeUrl.trim(),
        allowDuplicate: true,
      };
      if (modalMode === "edit" && editingItem?.id) {
        return await api.put(`/hr/recruitment/candidates/${editingItem.id}`, payload);
      }
      return await api.post("/hr/recruitment/candidates", payload);
    },
    onSuccess: () => {
      toast.success(modalMode === "edit" ? "Candidate updated" : "Candidate added");
      setModalMode(null);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-candidates"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save candidate"),
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: CandidateStage }) => {
      return await api.put(`/hr/recruitment/candidates/${id}`, { stage });
    },
    onSuccess: () => {
      toast.success("Candidate status updated");
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-candidates"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update candidate status"),
  });

  const convertMutation = useMutation({
    mutationFn: async (cand: any) => {
      return await api.post(`/hr/recruitment/candidates/${cand.id}/convert-to-employee`, {});
    },
    onSuccess: () => {
      toast.success("Candidate converted to Employee");
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-candidates"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to convert candidate"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/candidates/${id}`),
    onSuccess: () => {
      toast.success("Candidate deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-candidates"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete candidate"),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: candidates.length,
      new: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
    };
    candidates.forEach((cand: any) => {
      const st = normalizeStage(cand.stage);
      c[st] = (c[st] || 0) + 1;
    });
    return c;
  }, [candidates]);

  const activeFilterCount =
    (jobFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (stageTab !== "all" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = candidates.filter((c: any) => {
      const st = normalizeStage(c.stage);
      if (viewMode === "list" && stageTab !== "all" && st !== stageTab) return false;
      if (jobFilter !== "all" && c.jobPostingId !== jobFilter) return false;
      if (sourceFilter !== "all" && c.sourceId !== sourceFilter) return false;
      if (!q) return true;
      return (
        String(c.fullName || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q) ||
        String(c.jobPosting?.title || "").toLowerCase().includes(q) ||
        String(c.jobPosting?.jobCode || "").toLowerCase().includes(q) ||
        String(c.source?.name || "").toLowerCase().includes(q)
      );
    });
    if (sortField) {
      list = [...list].sort((a: any, b: any) => {
        const av = sortField === "name" ? String(a.fullName || "") : String(a.createdAt || "");
        const bv = sortField === "name" ? String(b.fullName || "") : String(b.createdAt || "");
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [candidates, searchQuery, jobFilter, sourceFilter, stageTab, sortField, sortAsc, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      fullName: "",
      email: "",
      phone: "",
      jobPostingId: jobPostings[0]?.id || "",
      sourceId: "",
      yearsOfExperience: "2",
      currentSalary: "",
      expectedSalary: "",
      currentCompany: "",
      currentPosition: "",
      location: "",
      noticePeriodDays: "30",
      stage: "new",
      coverLetter: "",
      resumeUrl: "",
    });
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      fullName: item.fullName || "",
      email: item.email || "",
      phone: item.phone || "",
      jobPostingId: item.jobPostingId || "",
      sourceId: item.sourceId || "",
      yearsOfExperience: String(item.yearsOfExperience ?? 0),
      currentSalary: item.currentCtc !== null && item.currentCtc !== undefined ? String(item.currentCtc) : "",
      expectedSalary: item.expectedSalary !== null && item.expectedSalary !== undefined ? String(item.expectedSalary) : "",
      currentCompany: item.currentCompany || "",
      currentPosition: item.currentPosition || "",
      location: item.location || "",
      noticePeriodDays: item.noticePeriodDays !== null && item.noticePeriodDays !== undefined ? String(item.noticePeriodDays) : "",
      stage: normalizeStage(item.stage),
      coverLetter: item.coverLetter || "",
      resumeUrl: item.resumeUrl || "",
    });
    setModalMode("edit");
  };

  const toggleSort = (field: "name" | "applied") => {
    if (sortField === field) setSortAsc((p) => !p);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const kanbanColumns: { key: CandidateStage; label: string; dot: string; colClass: string }[] = [
    { key: "new", label: "New", dot: "bg-sky-500", colClass: "border-sky-200/80 bg-sky-50/30 dark:bg-sky-950/10" },
    { key: "screening", label: "Screening", dot: "bg-indigo-500", colClass: "border-indigo-200/80 bg-indigo-50/30 dark:bg-indigo-950/10" },
    { key: "interview", label: "Interview", dot: "bg-purple-500", colClass: "border-purple-200/80 bg-purple-50/30 dark:bg-purple-950/10" },
    { key: "offer", label: "Offer", dot: "bg-amber-500", colClass: "border-amber-200/80 bg-amber-50/30 dark:bg-amber-950/10" },
    { key: "hired", label: "Hired", dot: "bg-emerald-500", colClass: "border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/10" },
    { key: "rejected", label: "Rejected", dot: "bg-rose-500", colClass: "border-rose-200/80 bg-rose-50/30 dark:bg-rose-950/10" },
  ];

  const handleDropOnColumn = (targetStage: CandidateStage, transferredId?: string) => {
    setDragOverCol(null);
    const idToMove = draggingId || transferredId;
    if (!idToMove) return;
    const cand = candidates.find((c: any) => c.id === idToMove);
    setDraggingId(null);
    if (!cand || normalizeStage(cand.stage) === targetStage) return;
    updateStageMutation.mutate({ id: cand.id, stage: targetStage });
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {viewMode === "kanban" ? "Candidates Kanban" : "Candidates"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {viewMode === "kanban"
              ? "Drag and drop candidates across hiring stages to update their status."
              : "View and manage candidates across all job postings."}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <i className="ph-bold ph-plus text-sm" />
            Add Candidate
          </button>
          <button
            type="button"
            title={viewMode === "kanban" ? "Switch to List View" : "Switch to Kanban View"}
            onClick={() => setViewMode((v) => (v === "list" ? "kanban" : "list"))}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted/60 transition-colors"
          >
            <i className={`ph ${viewMode === "kanban" ? "ph-list-bullets" : "ph-kanban"} text-base`} />
          </button>
        </div>
      </div>

      {/* Filter & Status Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border/70 flex flex-wrap items-center justify-between gap-3">
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
              value={jobFilter}
              onChange={(e) => {
                setJobFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[140px]"
            >
              <option value="all">All Jobs</option>
              {jobPostings.map((j: any) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[140px]"
            >
              <option value="all">All Sources</option>
              {sources.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setJobFilter("all");
                  setSourceFilter("all");
                  setStageTab("all");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-arrows-clockwise text-sm" />
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setJobFilter("all");
                setSourceFilter("all");
                setStageTab("all");
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors ${activeFilterCount > 0
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "border-border bg-background text-foreground hover:bg-muted/60"
                }`}
            >
              <i className="ph ph-funnel text-sm" />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-white text-emerald-700 text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {viewMode === "list" && (
          <div className="flex items-center gap-5 px-4 pt-2.5 overflow-x-auto">
            {[
              { key: "all" as const, label: "All", icon: "ph-squares-four" },
              { key: "new" as const, label: "New", icon: "ph-sparkle" },
              { key: "screening" as const, label: "Screening", icon: "ph-scan" },
              { key: "interview" as const, label: "Interview", icon: "ph-chat-text" },
              { key: "offer" as const, label: "Offer", icon: "ph-file-text" },
              { key: "hired" as const, label: "Hired", icon: "ph-user-check" },
              { key: "rejected" as const, label: "Rejected", icon: "ph-user-minus" },
            ].map((tab) => {
              const active = stageTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStageTab(tab.key);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-2 pb-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <i className={`ph ${tab.icon} text-sm`} />
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {counts[tab.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* LIST VIEW */}
      {viewMode === "list" ? (
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40">
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-12">#</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                      Name <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Job</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Experience</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expected Salary</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Employee Converted</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <button type="button" onClick={() => toggleSort("applied")} className="inline-flex items-center gap-1 hover:text-foreground">
                      Applied <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={10} className="p-4"><div className="h-10 rounded bg-muted animate-pulse" /></td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-muted-foreground">
                      No candidates found. Click &ldquo;+ Add Candidate&rdquo; to add one.
                    </td>
                  </tr>
                ) : (
                  paginated.map((c: any, idx: number) => {
                    const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                    const st = normalizeStage(c.stage);
                    const name = c.fullName || "Candidate";
                    return (
                      <tr key={c.id} className="hover:bg-muted/35 transition-colors">
                        <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">{rowNum}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(name)}`}>
                              {getInitials(name)}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/hr/recruitment/candidates/${c.id}`} className="text-xs font-semibold text-foreground hover:text-emerald-600 block truncate">
                                {name}
                              </Link>
                              <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-foreground">{c.jobPosting?.title || "—"}</p>
                          {c.jobPosting?.jobCode && (
                            <p className="text-[11px] text-muted-foreground ">{c.jobPosting.jobCode}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-foreground">{c.source?.name || "Direct"}</td>
                        <td className="py-3.5 px-4 text-xs text-foreground whitespace-nowrap">
                          {Number(c.yearsOfExperience || 0)} years
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold tabular-nums text-foreground whitespace-nowrap">
                          {formatMoney(c.expectedSalary)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${stageBadgeClass(st)}`}>
                            {stageLabel(st)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold ${c.isConvertedToEmployee
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                            }`}>
                            {c.isConvertedToEmployee ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <i className="ph ph-calendar-blank text-sm" />
                            {formatDate(c.createdAt)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/hr/recruitment/candidates/${c.id}`} title="View Candidate" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10">
                              <i className="ph ph-eye text-[15px]" />
                            </Link>
                            <button type="button" title="Edit Candidate" onClick={() => openEdit(c)} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10">
                              <i className="ph ph-pencil-simple-line text-[15px]" />
                            </button>
                            {st === "hired" && !c.isConvertedToEmployee ? (
                              <button
                                type="button"
                                title="Convert to Employee"
                                onClick={() => convertMutation.mutate(c)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-500/10"
                              >
                                <i className="ph ph-user-plus text-[15px]" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Update Status"
                                onClick={() => {
                                  setStatusTarget(c);
                                  setNextStage(st);
                                }}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-500/10"
                              >
                                <i className="ph ph-arrows-clockwise text-[15px]" />
                              </button>
                            )}
                            <button type="button" title="Delete Candidate" onClick={() => setDeleteTarget(c)} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10">
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
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 px-2.5 rounded border border-border disabled:opacity-40 hover:bg-muted/60">
                  &laquo; Previous
                </button>
                <span className="h-7 min-w-[28px] px-2 inline-flex items-center justify-center rounded bg-emerald-600 text-white font-semibold">
                  {safePage}
                </span>
                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-7 px-2.5 rounded border border-border disabled:opacity-40 hover:bg-muted/60">
                  Next &raquo;
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* KANBAN VIEW WITH DRAG & DROP ACROSS 6 STAGES */
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-6 gap-3.5 min-w-[1260px] items-start">
            {kanbanColumns.map((col) => {
              const colItems = filtered.filter((c: any) => normalizeStage(c.stage) === col.key);
              const isOver = dragOverCol === col.key;
              return (
                <div
                  key={col.key}
                  data-kanban-col={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                    setDragOverCol(col.key);
                  }}
                  onDragLeave={() => setDragOverCol((cur) => (cur === col.key ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const transferredId = e.dataTransfer?.getData("text/plain");
                    handleDropOnColumn(col.key, transferredId);
                  }}
                  className={`rounded-xl border p-3 space-y-3 min-h-[480px] transition-all ${col.colClass} ${isOver ? "ring-2 ring-emerald-500 border-emerald-500" : ""
                    }`}
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <h3 className="text-xs font-bold text-foreground">{col.label}</h3>
                      <span className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] font-bold text-muted-foreground">
                        {colItems.length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {colItems.map((c: any) => {
                      const name = c.fullName || "Candidate";
                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(c.id);
                            if (e.dataTransfer) {
                              e.dataTransfer.setData("text/plain", c.id);
                              e.dataTransfer.effectAllowed = "move";
                            }
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverCol(null);
                          }}
                          className="rounded-xl border border-border/80 bg-card p-3 shadow-xs space-y-2.5 cursor-grab active:cursor-grabbing hover:border-emerald-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`h-7 w-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${getTone(name)}`}>
                                {getInitials(name)}
                              </div>
                              <div className="min-w-0">
                                <Link href={`/hr/recruitment/candidates/${c.id}`} draggable={false} className="text-xs font-bold text-foreground hover:text-emerald-600 block truncate">
                                  {name}
                                </Link>
                                <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button type="button" title="Edit" onClick={() => openEdit(c)} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-amber-600">
                                <i className="ph ph-pencil-simple-line text-xs" />
                              </button>
                              <button type="button" title="Delete" onClick={() => setDeleteTarget(c)} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-rose-600">
                                <i className="ph ph-trash text-xs" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-foreground truncate">{c.jobPosting?.title || "Open Role"}</p>
                            {c.jobPosting?.jobCode && (
                              <p className="text-[10px] text-muted-foreground ">{c.jobPosting.jobCode}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/60">
                            <span>{Number(c.yearsOfExperience || 0)} yrs exp</span>
                            <span className="font-semibold text-foreground">{formatMoney(c.expectedSalary)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Candidate Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground">
                {modalMode === "edit" ? "Edit Candidate" : "Add New Candidate"}
              </h3>
              <button type="button" onClick={() => setModalMode(null)} className="text-muted-foreground hover:text-foreground">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Full Name <span className="text-rose-500">*</span></label>
                  <input type="text" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="e.g. Rajesh Kumar" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email <span className="text-rose-500">*</span></label>
                  <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="rajesh@example.com" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Job Posting <span className="text-rose-500">*</span></label>
                  <select value={form.jobPostingId} onChange={(e) => setForm((p) => ({ ...p, jobPostingId: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs">
                    <option value="">Select Job Posting</option>
                    {jobPostings.map((j: any) => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Source</label>
                  <select value={form.sourceId} onChange={(e) => setForm((p) => ({ ...p, sourceId: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs">
                    <option value="">Select Source</option>
                    {sources.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status <span className="text-rose-500">*</span></label>
                  <select value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as CandidateStage }))} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs">
                    <option value="new">New</option>
                    <option value="screening">Screening</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="hired">Hired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Experience (Years)</label>
                  <input type="number" min={0} step="0.5" value={form.yearsOfExperience} onChange={(e) => setForm((p) => ({ ...p, yearsOfExperience: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Notice Period (Days)</label>
                  <input type="number" min={0} value={form.noticePeriodDays} onChange={(e) => setForm((p) => ({ ...p, noticePeriodDays: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Current Salary</label>
                  <input type="number" min={0} value={form.currentSalary} onChange={(e) => setForm((p) => ({ ...p, currentSalary: e.target.value }))} placeholder="95000" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Expected Salary</label>
                  <input type="number" min={0} value={form.expectedSalary} onChange={(e) => setForm((p) => ({ ...p, expectedSalary: e.target.value }))} placeholder="120000" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Current Company</label>
                  <input type="text" value={form.currentCompany} onChange={(e) => setForm((p) => ({ ...p, currentCompany: e.target.value }))} placeholder="Tech Solutions Pvt Ltd" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Bangalore, India" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Cover Letter</label>
                <textarea rows={3} value={form.coverLetter} onChange={(e) => setForm((p) => ({ ...p, coverLetter: e.target.value }))} placeholder="Candidate cover letter..." className="w-full p-2.5 rounded-lg border border-border bg-background text-xs" />
              </div>
              <div className="pt-3 border-t border-border/70 flex justify-end gap-2">
                <button type="button" onClick={() => setModalMode(null)} className="h-9 px-4 rounded-lg border border-border text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold">
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Candidate Status Modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Update Candidate Status</h3>
              <button type="button" onClick={() => setStatusTarget(null)} className="text-muted-foreground hover:text-foreground">
                <i className="ph ph-x text-base" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Status <span className="text-rose-500">*</span></label>
                <select value={nextStage} onChange={(e) => setNextStage(e.target.value as CandidateStage)} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs">
                  <option value="new">New</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="pt-3 border-t border-border/70 flex justify-end gap-2">
                <button type="button" onClick={() => setStatusTarget(null)} className="h-9 px-4 rounded-lg border border-border text-xs font-semibold">Cancel</button>
                <button type="button" disabled={updateStageMutation.isPending} onClick={() => updateStageMutation.mutate({ id: statusTarget.id, stage: nextStage })} className="h-9 px-5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                  {updateStageMutation.isPending ? "Saving..." : "Save"}
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
                <h3 className="text-sm font-bold text-foreground">Delete Candidate</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget.fullName}</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="h-8 px-3.5 rounded-lg border border-border text-xs font-semibold">Cancel</button>
              <button type="button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)} className="h-8 px-4 rounded-lg bg-rose-600 text-white text-xs font-semibold">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
