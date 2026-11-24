"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type InterviewStatus = "scheduled" | "completed" | "cancelled" | "no_show";

function normalizeInterviewStatus(raw?: string | null): InterviewStatus {
  const s = String(raw || "scheduled").toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "no_show" || s === "noshow") return "no_show";
  return "scheduled";
}

function statusLabel(st: InterviewStatus): string {
  switch (st) {
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "No-show";
    default:
      return "Scheduled";
  }
}

function statusBadgeClass(st: InterviewStatus): string {
  switch (st) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "cancelled":
      return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    case "no_show":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    default:
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }
}

function getInitials(name?: string | null): string {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name || "?").slice(0, 2).toUpperCase();
}

const AVATAR_TONES = [
  "bg-rose-500/15 text-rose-700 border-rose-500/25",
  "bg-amber-500/15 text-amber-700 border-amber-500/25",
  "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  "bg-sky-500/15 text-sky-700 border-sky-500/25",
  "bg-purple-500/15 text-purple-700 border-purple-500/25",
];

function getTone(seed?: string | null): string {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

function formatDateYmd(val?: string | Date | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatTimeHm(val?: string | Date | null): string {
  if (!val) return "09:30";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "09:30";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function HrInterviewsPage() {
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | InterviewStatus>("all");

  // Calendar / Week strip navigation
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);

  // Drag-and-drop state for Kanban
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<InterviewStatus | null>(null);

  // Modals
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const [nextStatus, setNextStatus] = useState<InterviewStatus>("scheduled");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    candidateId: "",
    roundName: "",
    interviewType: "",
    date: new Date().toISOString().slice(0, 10),
    time: "10:00",
    durationMinutes: "60",
    location: "",
    meetingLink: "",
    interviewerIds: [] as string[],
  });

  // Queries
  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["hr-recruitment-interviews"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/interviews");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["hr-candidates-interviews"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/candidates").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: interviewRounds = [] } = useQuery({
    queryKey: ["hr-recruitment-interview-rounds"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/interview-rounds").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: interviewTypes = [] } = useQuery({
    queryKey: ["hr-recruitment-interview-types"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/interview-types").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-interviewers"],
    queryFn: async () => {
      const res: any = await api.get("/hr/employees", { params: { limit: 100 } }).catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.candidateId) throw new Error("Candidate is required.");
      if (!form.roundName.trim()) throw new Error("Interview Round is required.");
      if (!form.interviewType.trim()) throw new Error("Interview Type is required.");
      if (!form.date || !form.time) throw new Error("Date and Time are required.");

      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      const payload = {
        candidateId: form.candidateId,
        roundName: form.roundName.trim(),
        interviewType: form.interviewType.trim(),
        scheduledAt,
        durationMinutes: Number(form.durationMinutes) || 60,
        location: form.location.trim(),
        meetingLink: form.meetingLink.trim(),
        interviewerIds: form.interviewerIds,
        mode: form.meetingLink.trim() ? "virtual" : "onsite",
      };
      if (modalMode === "edit" && editingItem?.id) {
        return await api.put(`/hr/recruitment/interviews/${editingItem.id}`, payload);
      }
      return await api.post("/hr/recruitment/interviews", payload);
    },
    onSuccess: () => {
      toast.success(modalMode === "edit" ? "Interview updated" : "Interview scheduled");
      setModalMode(null);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-interviews"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save interview"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InterviewStatus }) => {
      return await api.put(`/hr/recruitment/interviews/${id}`, { status });
    },
    onSuccess: () => {
      toast.success("Interview status updated");
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-interviews"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/interviews/${id}`),
    onSuccess: () => {
      toast.success("Interview deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-interviews"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete interview"),
  });

  // KPI & tab counts
  const stats = useMemo(() => {
    const total = interviews.length;
    const scheduled = interviews.filter((i: any) => normalizeInterviewStatus(i.status) === "scheduled").length;
    const completed = interviews.filter((i: any) => normalizeInterviewStatus(i.status) === "completed").length;
    const cancelled = interviews.filter((i: any) => normalizeInterviewStatus(i.status) === "cancelled").length;
    const noShow = interviews.filter((i: any) => normalizeInterviewStatus(i.status) === "no_show").length;
    const pendingFeedback = interviews.filter(
      (i: any) => !i.feedback && (!Array.isArray(i.feedbackList) || i.feedbackList.length === 0)
    ).length;
    return { total, scheduled, completed, cancelled, noShow, pendingFeedback };
  }, [interviews]);

  // Week strip dates around anchorDate
  const weekDays = useMemo(() => {
    const d = new Date(anchorDate);
    const day = d.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);
    return Array.from({ length: 7 }).map((_, idx) => {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + idx);
      return {
        iso: cur.toISOString().slice(0, 10),
        weekday: cur.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        dayNum: cur.getDate(),
      };
    });
  }, [anchorDate]);

  const monthLabel = anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekRangeLabel = `${weekDays[0].dayNum} ${new Date(weekDays[0].iso).toLocaleDateString("en-US", { month: "short" })} - ${weekDays[6].dayNum} ${new Date(weekDays[6].iso).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return interviews.filter((i: any) => {
      const st = normalizeInterviewStatus(i.status);
      if (viewMode === "list" && statusTab !== "all" && st !== statusTab) return false;
      if (candidateFilter !== "all" && i.candidateId !== candidateFilter) return false;
      if (viewMode === "list" && selectedDayIso && formatDateYmd(i.scheduledAt) !== selectedDayIso) return false;
      if (!q) return true;
      return (
        String(i.candidate?.fullName || "").toLowerCase().includes(q) ||
        String(i.candidate?.jobPosting?.title || "").toLowerCase().includes(q) ||
        String(i.roundName || "").toLowerCase().includes(q) ||
        String(i.interviewType || "").toLowerCase().includes(q) ||
        String(i.location || "").toLowerCase().includes(q)
      );
    });
  }, [interviews, searchQuery, candidateFilter, statusTab, selectedDayIso, viewMode]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      candidateId: "",
      roundName: interviewRounds[0]?.name || "",
      interviewType: interviewTypes[0]?.name || "",
      date: new Date().toISOString().slice(0, 10),
      time: "10:00",
      durationMinutes: "60",
      location: "",
      meetingLink: "",
      interviewerIds: [],
    });
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      candidateId: item.candidateId || "",
      roundName: item.roundName || "",
      interviewType: item.interviewType || "",
      date: formatDateYmd(item.scheduledAt) || new Date().toISOString().slice(0, 10),
      time: formatTimeHm(item.scheduledAt),
      durationMinutes: String(item.durationMinutes || 60),
      location: item.location || "",
      meetingLink: item.meetingLink || "",
      interviewerIds: Array.isArray(item.interviewerIds)
        ? item.interviewerIds
        : item.interviewerId
          ? [item.interviewerId]
          : [],
    });
    setModalMode("edit");
  };

  const toggleInterviewer = (empId: string) => {
    setForm((p) => ({
      ...p,
      interviewerIds: p.interviewerIds.includes(empId)
        ? p.interviewerIds.filter((id) => id !== empId)
        : [...p.interviewerIds, empId],
    }));
  };

  const kanbanColumns: { key: InterviewStatus; label: string; dot: string; colClass: string }[] = [
    { key: "scheduled", label: "Scheduled", dot: "bg-blue-500", colClass: "border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/10" },
    { key: "completed", label: "Completed", dot: "bg-emerald-500", colClass: "border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/10" },
    { key: "cancelled", label: "Cancelled", dot: "bg-slate-500", colClass: "border-slate-200/80 bg-slate-50/40 dark:bg-slate-900/20" },
    { key: "no_show", label: "No-Show", dot: "bg-rose-500", colClass: "border-rose-200/80 bg-rose-50/30 dark:bg-rose-950/10" },
  ];

  const handleDropOnColumn = (targetStatus: InterviewStatus, transferredId?: string) => {
    setDragOverCol(null);
    const idToMove = draggingId || transferredId;
    if (!idToMove) return;
    const item = interviews.find((i: any) => i.id === idToMove);
    setDraggingId(null);
    if (!item || normalizeInterviewStatus(item.status) === targetStatus) return;
    updateStatusMutation.mutate({ id: item.id, status: targetStatus });
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {viewMode === "kanban" ? "Interviews Kanban" : "Interviews"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {viewMode === "kanban"
              ? "Track and manage interview schedules visually across stages. Drag cards to update status."
              : "Schedule and manage candidate interviews."}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <i className="ph-bold ph-plus text-sm" />
            Schedule Interview
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

      {/* 4 KPI Cards (List View) */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Interviews</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-1">All time</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <i className="ph ph-users-three text-xl" />
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.scheduled}</p>
              <p className="text-[11px] text-blue-600 font-medium mt-1">Upcoming interviews</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <i className="ph ph-calendar-check text-xl" />
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.completed}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Successfully completed</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <i className="ph ph-check-circle text-xl" />
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Feedback</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.pendingFeedback}</p>
              <p className="text-[11px] text-orange-600 font-medium mt-1">Awaiting feedback</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <i className="ph ph-chat-dots text-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Filter & Status Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-56">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={candidateFilter}
              onChange={(e) => setCandidateFilter(e.target.value)}
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
              setSelectedDayIso(null);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-funnel text-sm" />
            Filters
          </button>
        </div>

        {viewMode === "list" && (
          <div className="flex items-center gap-5 px-4 pt-2.5 overflow-x-auto">
            {[
              { key: "all" as const, label: "All", icon: "ph-squares-four", count: stats.total },
              { key: "scheduled" as const, label: "Scheduled", icon: "ph-calendar-check", count: stats.scheduled },
              { key: "completed" as const, label: "Completed", icon: "ph-check-circle", count: stats.completed },
              { key: "cancelled" as const, label: "Cancelled", icon: "ph-x-circle", count: stats.cancelled },
              { key: "no_show" as const, label: "No-show", icon: "ph-user-minus", count: stats.noShow },
            ].map((tab) => {
              const active = statusTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusTab(tab.key)}
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
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* LIST VIEW */}
      {viewMode === "list" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left 8 Cols: Month/Week Strip + Table */}
          <div className="xl:col-span-8 space-y-4">
            {/* Month Bar */}
            <div className="rounded-xl border border-border/80 bg-card px-4 py-2.5 flex items-center justify-between shadow-xs">
              <button
                type="button"
                onClick={() =>
                  setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, d.getDate()))
                }
                className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted/60"
              >
                <i className="ph ph-caret-left text-xs" />
              </button>
              <span className="text-xs font-bold text-foreground">{monthLabel}</span>
              <button
                type="button"
                onClick={() =>
                  setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()))
                }
                className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted/60"
              >
                <i className="ph ph-caret-right text-xs" />
              </button>
            </div>

            {/* Week Strip */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden grid grid-cols-9 divide-x divide-border/60">
              <div className="col-span-2 p-2.5 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => setAnchorDate((d) => new Date(d.getTime() - 7 * 86400000))}
                  className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted/60 shrink-0"
                >
                  <i className="ph ph-caret-left text-[10px]" />
                </button>
                <div className="text-center min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">{weekRangeLabel}</p>
                  <p className="text-[10px] text-muted-foreground">{monthLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnchorDate((d) => new Date(d.getTime() + 7 * 86400000))}
                  className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted/60 shrink-0"
                >
                  <i className="ph ph-caret-right text-[10px]" />
                </button>
              </div>
              {weekDays.map((wd) => {
                const isSelected = selectedDayIso === wd.iso;
                const hasAny = interviews.some((i: any) => formatDateYmd(i.scheduledAt) === wd.iso);
                return (
                  <button
                    key={wd.iso}
                    type="button"
                    onClick={() => setSelectedDayIso((cur) => (cur === wd.iso ? null : wd.iso))}
                    className={`py-2.5 px-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${isSelected
                      ? "bg-emerald-600 text-white"
                      : "hover:bg-muted/50 text-foreground"
                      }`}
                  >
                    <span className={`text-[10px] font-semibold ${isSelected ? "text-emerald-100" : "text-muted-foreground"}`}>
                      {wd.weekday}
                    </span>
                    <span className="text-xs font-bold">{wd.dayNum}</span>
                    {hasAny && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40">
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Candidate</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Round</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type / Location</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Feedback</th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="p-4"><div className="h-10 rounded bg-muted animate-pulse" /></td>
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                          No interviews found. Click &ldquo;+ Schedule Interview&rdquo; to schedule one.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((item: any) => {
                        const st = normalizeInterviewStatus(item.status);
                        const candName = item.candidate?.fullName || "Candidate";
                        const jobTitle = item.candidate?.jobPosting?.title || "Open Role";
                        const hasFeedback = Boolean(item.feedback) || (Array.isArray(item.feedbackList) && item.feedbackList.length > 0);
                        const isOnline = Boolean(item.meetingLink) || String(item.location || "").toLowerCase() === "online";

                        return (
                          <tr key={item.id} className="hover:bg-muted/35 transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p className="text-xs font-bold text-foreground">{formatTimeHm(item.scheduledAt)}</p>
                              <p className="text-[11px] text-muted-foreground">{item.durationMinutes || 60} min</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(candName)}`}>
                                  {getInitials(candName)}
                                </div>
                                <div className="min-w-0">
                                  <Link href={`/hr/recruitment/interviews/${item.id}`} className="text-xs font-semibold text-foreground hover:text-emerald-600 block truncate">
                                    {candName}
                                  </Link>
                                  <p className="text-[11px] text-muted-foreground truncate">{jobTitle}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[11px] font-semibold whitespace-nowrap">
                                {item.roundName || "Initial Screening"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="text-xs font-medium text-foreground">{item.interviewType || "Technical Interview"}</p>
                              <p className={`text-[11px] inline-flex items-center gap-1 mt-0.5 ${isOnline ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                                <i className={`ph ${isOnline ? "ph-video-camera" : "ph-map-pin"} text-xs`} />
                                {isOnline ? "Online" : item.location || "Office"}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${statusBadgeClass(st)}`}>
                                {statusLabel(st)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {hasFeedback ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[11px] font-semibold">
                                  Submitted
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[11px] font-semibold">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-1">
                                <Link href={`/hr/recruitment/interviews/${item.id}`} title="View Interview" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10">
                                  <i className="ph ph-eye text-[15px]" />
                                </Link>
                                <button type="button" title="Edit Interview" onClick={() => openEdit(item)} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10">
                                  <i className="ph ph-pencil-simple-line text-[15px]" />
                                </button>
                                <button
                                  type="button"
                                  title="Update Interview Status"
                                  onClick={() => {
                                    setStatusTarget(item);
                                    setNextStatus(st);
                                  }}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-500/10"
                                >
                                  <i className="ph ph-arrows-clockwise text-[15px]" />
                                </button>
                                <button type="button" title="Delete Interview" onClick={() => setDeleteTarget(item)} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10">
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

          {/* Right 4 Cols: Upcoming Panel + Monthly Summary */}
          <div className="xl:col-span-4 space-y-4">
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-calendar-blank text-emerald-600 text-base" />
                <h3 className="text-xs font-bold text-foreground">
                  {selectedDayIso ? `Schedule – ${selectedDayIso}` : "Upcoming Interviews"}
                </h3>
              </div>
              <div className="p-3.5 space-y-3 max-h-[420px] overflow-y-auto">
                {filtered.slice(0, 4).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No interviews scheduled.</p>
                ) : (
                  filtered.slice(0, 4).map((item: any) => {
                    const candName = item.candidate?.fullName || "Candidate";
                    const isOnline = Boolean(item.meetingLink) || String(item.location || "").toLowerCase() === "online";
                    return (
                      <div key={item.id} className="rounded-xl border border-border/80 bg-background p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{formatTimeHm(item.scheduledAt)}</span>
                          <span className="text-[11px] text-muted-foreground">({item.durationMinutes || 60} min)</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(candName)}`}>
                            {getInitials(candName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{candName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.candidate?.jobPosting?.title || "Open Role"}</p>
                          </div>
                        </div>
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-semibold">
                            {item.roundName || "Initial Screening"}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          <p className="inline-flex items-center gap-1.5">
                            <i className="ph ph-clock text-xs" /> {item.interviewType || "Technical Interview"}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <i className="ph ph-map-pin text-xs" /> {isOnline ? "Online" : item.location || "Office"}
                          </p>
                        </div>
                        {item.meetingLink && (
                          <a
                            href={item.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full h-8 rounded-lg border border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <i className="ph ph-video-camera text-sm" />
                            Join Interview
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground">{monthLabel} Summary</h3>
              <div className="space-y-2 text-xs">
                {[
                  { icon: "ph-users-three", label: "Total Interviews", val: stats.total },
                  { icon: "ph-calendar-check", label: "Scheduled", val: stats.scheduled },
                  { icon: "ph-check-circle", label: "Completed", val: stats.completed },
                  { icon: "ph-chat-dots", label: "Pending Feedback", val: stats.pendingFeedback },
                  { icon: "ph-x-circle", label: "Cancelled", val: stats.cancelled },
                  { icon: "ph-user-minus", label: "No-show", val: stats.noShow },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <i className={`ph ${r.icon} text-sm`} />
                      {r.label}
                    </span>
                    <span className="font-bold text-foreground">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* KANBAN VIEW WITH DRAG & DROP */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colItems = filtered.filter((i: any) => normalizeInterviewStatus(i.status) === col.key);
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

                <div className="space-y-3">
                  {colItems.map((item: any) => {
                    const candName = item.candidate?.fullName || "Candidate";
                    const isOnline = Boolean(item.meetingLink) || String(item.location || "").toLowerCase() === "online";
                    const interviewers: any[] = Array.isArray(item.interviewers) ? item.interviewers : [];
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(item.id);
                          if (e.dataTransfer) {
                            e.dataTransfer.setData("text/plain", item.id);
                            e.dataTransfer.effectAllowed = "move";
                          }
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverCol(null);
                        }}
                        className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs space-y-3 cursor-grab active:cursor-grabbing hover:border-emerald-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(candName)}`}>
                              {getInitials(candName)}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/hr/recruitment/interviews/${item.id}`} draggable={false} className="text-xs font-bold text-foreground hover:text-emerald-600 block truncate">
                                {candName}
                              </Link>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.candidate?.jobPosting?.title || "Open Role"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" title="Edit" onClick={() => openEdit(item)} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-amber-600">
                              <i className="ph ph-pencil-simple-line text-xs" />
                            </button>
                            <button type="button" title="Delete" onClick={() => setDeleteTarget(item)} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-rose-600">
                              <i className="ph ph-trash text-xs" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <i className="ph ph-calendar-blank text-xs" />
                            {formatDateYmd(item.scheduledAt)} at {formatTimeHm(item.scheduledAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <i className="ph ph-clock text-xs" />
                            {item.durationMinutes || 60} mins
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 border border-purple-500/20 text-[10px] font-semibold">
                            {item.roundName || "Initial Screening"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[10px] font-semibold">
                            {item.interviewType || "Technical Interview"}
                          </span>
                        </div>

                        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <i className={`ph ${isOnline ? "ph-video-camera" : "ph-map-pin"} text-xs`} />
                          {isOnline ? "Online" : item.location || "Office"}
                        </div>

                        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-muted-foreground">Interviewers</span>
                          <div className="flex -space-x-1.5">
                            {interviewers.slice(0, 3).map((ev: any) => {
                              const nm = [ev.firstName, ev.lastName].filter(Boolean).join(" ") || ev.email;
                              return (
                                <span
                                  key={ev.id}
                                  title={nm}
                                  className={`h-6 w-6 rounded-full border border-card flex items-center justify-center text-[9px] font-bold ${getTone(nm)}`}
                                >
                                  {getInitials(nm)}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {item.meetingLink && (
                          <a
                            href={item.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <i className="ph ph-video-camera text-sm" />
                            Join Interview
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Interview Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground">
                {modalMode === "edit" ? "Edit Interview" : "Schedule New Interview"}
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
                  Interview Round <span className="text-rose-500">*</span>
                </label>
                {interviewRounds.length > 0 ? (
                  <select
                    value={form.roundName}
                    onChange={(e) => setForm((p) => ({ ...p, roundName: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Interview Round</option>
                    {Array.from(new Set(interviewRounds.map((r: any) => r.name))).map((name: any) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.roundName}
                    onChange={(e) => setForm((p) => ({ ...p, roundName: e.target.value }))}
                    placeholder="e.g. Technical Assessment"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Interview Type <span className="text-rose-500">*</span>
                </label>
                {interviewTypes.length > 0 ? (
                  <select
                    value={form.interviewType}
                    onChange={(e) => setForm((p) => ({ ...p, interviewType: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Interview Type</option>
                    {interviewTypes.map((t: any) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.interviewType}
                    onChange={(e) => setForm((p) => ({ ...p, interviewType: e.target.value }))}
                    placeholder="e.g. Video Interview"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Duration (minutes) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={15}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value.replace(/[^0-9]/g, "") }))}
                  placeholder="e.g. 60"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Conference Room A, Floor 2"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Meeting Link</label>
                <input
                  type="url"
                  value={form.meetingLink}
                  onChange={(e) => setForm((p) => ({ ...p, meetingLink: e.target.value }))}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Interviewers <span className="text-rose-500">*</span>
                </label>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-1">
                  {employees.map((e: any) => {
                    const name = e.fullName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
                    const checked = form.interviewerIds.includes(e.id);
                    return (
                      <label key={e.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleInterviewer(e.id)}
                          className="h-3.5 w-3.5 accent-emerald-600"
                        />
                        <span className="text-foreground">{name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setModalMode(null)} className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60">
                  Cancel
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold">
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Interview Status Modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Update Interview Status</h3>
              <button type="button" onClick={() => setStatusTarget(null)} className="text-muted-foreground hover:text-foreground">
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
                  onChange={(e) => setNextStatus(e.target.value as InterviewStatus)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No-show</option>
                </select>
              </div>
              <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setStatusTarget(null)} className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: statusTarget.id, status: nextStatus })}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {updateStatusMutation.isPending ? "Saving..." : "Save"}
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
                <h3 className="text-sm font-bold text-foreground">Delete Interview</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete this interview for{" "}
                  <span className="font-semibold text-foreground">{deleteTarget.candidate?.fullName || "this candidate"}</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="h-8 px-3.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60">
                Cancel
              </button>
              <button type="button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)} className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-60">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
