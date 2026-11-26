"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@/lib/router-compat";
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
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Eye,
  Edit,
  TrendingUp,
  Trash2,
  LayoutGrid,
  CircleDot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  User,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface MeetingOption {
  id: string;
  title: string;
  startTime?: string;
}

interface ActionItemRecord {
  id: string;
  meetingId?: string | null;
  meeting?: {
    id: string;
    title: string;
    startTime?: string;
  } | null;
  title: string;
  description?: string;
  assigneeId: string;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
  dueDate?: string;
  daysRemaining?: number;
  daysOverdue?: number;
  priority: "low" | "medium" | "high" | "critical" | string;
  status: "not_started" | "in_progress" | "completed" | "overdue" | string;
  progress: number;
  progressNotes?: string;
  notes?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatMeetingOptionLabel(m: MeetingOption) {
  if (!m.startTime) return m.title;
  const d = new Date(m.startTime);
  if (Number.isNaN(d.getTime())) return m.title;
  const formatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${m.title} - ${formatted}`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = String(priority || "medium").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    critical: { label: "Critical", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
    high: { label: "High", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    medium: { label: "Medium", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    low: { label: "Low", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  };
  const info = map[p] || map.medium;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${info.cls}`}
    >
      {info.label}
    </span>
  );
}

function ActionStatusBadge({ status }: { status: string }) {
  const s = String(status || "not_started").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    completed: {
      label: "Completed",
      cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    in_progress: {
      label: "In Progress",
      cls: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    overdue: {
      label: "Overdue",
      cls: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
    not_started: {
      label: "Not Started",
      cls: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    },
  };
  const info = map[s] || map.not_started;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${info.cls}`}
    >
      {info.label}
    </span>
  );
}

function getProgressBarColor(status: string) {
  const s = String(status || "not_started").toLowerCase();
  if (s === "completed") return "bg-emerald-500";
  if (s === "overdue") return "bg-rose-500";
  if (s === "in_progress") return "bg-blue-500";
  return "bg-slate-400";
}

export default function HrMeetingActionItemsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [selectedMeeting, setSelectedMeeting] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "all" | "not_started" | "in_progress" | "completed" | "overdue"
  >("all");
  const [sortBy, setSortBy] = useState<"title" | "dueDate">("dueDate");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ActionItemRecord | null>(null);
  const [viewTarget, setViewTarget] = useState<ActionItemRecord | null>(null);
  const [progressTarget, setProgressTarget] = useState<ActionItemRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActionItemRecord | null>(null);

  // Form fields
  const [formMeetingId, setFormMeetingId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAssigneeId, setFormAssigneeId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPriority, setFormPriority] = useState("");

  // Progress modal fields
  const [progressValue, setProgressValue] = useState("0");
  const [progressNotes, setProgressNotes] = useState("");

  const { data: items = [], isLoading } = useQuery<ActionItemRecord[]>({
    queryKey: ["hr-meeting-action-items"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/action-items");
      return unwrapArray<ActionItemRecord>(res);
    },
  });

  const { data: meetings = [] } = useQuery<MeetingOption[]>({
    queryKey: ["hr-meetings-for-action-items"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings");
      return unwrapArray<MeetingOption>(res);
    },
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-for-action-items"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=500");
      return unwrapArray<EmployeeOption>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      meetingId?: string;
      title: string;
      description?: string;
      assigneeId: string;
      dueDate: string;
      priority: string;
    }) => {
      if (payload.id) {
        return api.put(`/hr/meetings/action-items/${payload.id}`, payload);
      }
      return api.post("/hr/meetings/action-items", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-action-items"] });
      toast.success(editTarget ? "Action item updated." : "Action item created.");
      setFormOpen(false);
      setEditTarget(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save action item.");
    },
  });

  const progressMutation = useMutation({
    mutationFn: async ({
      id,
      progress,
      progressNotes: notes,
    }: {
      id: string;
      progress: number;
      progressNotes?: string;
    }) => {
      return api.patch(`/hr/meetings/action-items/${id}/progress`, {
        progress,
        progressNotes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-action-items"] });
      toast.success("Progress updated.");
      setProgressTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update progress.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/meetings/action-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-action-items"] });
      toast.success("Action item deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete action item.");
    },
  });

  function resetForm() {
    setFormMeetingId("");
    setFormTitle("");
    setFormDescription("");
    setFormAssigneeId("");
    setFormDueDate("");
    setFormPriority("");
  }

  function openAdd() {
    resetForm();
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(item: ActionItemRecord) {
    setEditTarget(item);
    setFormMeetingId(item.meetingId || item.meeting?.id || "");
    setFormTitle(item.title || "");
    setFormDescription(item.description || "");
    setFormAssigneeId(item.assigneeId || item.assignee?.id || "");
    setFormDueDate(item.dueDate || "");
    setFormPriority(item.priority || "medium");
    setFormOpen(true);
  }

  function openProgress(item: ActionItemRecord) {
    setProgressTarget(item);
    setProgressValue(String(item.progress ?? 0));
    setProgressNotes(item.progressNotes || item.notes || "");
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formAssigneeId || !formDueDate || !formPriority) {
      toast.error("Please fill all required fields.");
      return;
    }
    saveMutation.mutate({
      id: editTarget?.id,
      meetingId: formMeetingId || undefined,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      assigneeId: formAssigneeId,
      dueDate: formDueDate,
      priority: formPriority,
    });
  }

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedPriority !== "all" && item.priority !== selectedPriority) return false;
      if (selectedAssignee !== "all" && item.assigneeId !== selectedAssignee) return false;
      if (selectedMeeting !== "all" && item.meetingId !== selectedMeeting) return false;
      if (q) {
        const assigneeName = item.assignee
          ? `${item.assignee.firstName} ${item.assignee.lastName}`.toLowerCase()
          : "";
        const hay = `${item.title} ${item.description || ""} ${item.meeting?.title || ""} ${assigneeName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, selectedPriority, selectedAssignee, selectedMeeting]);

  const tabCounts = useMemo(() => {
    const c = { all: baseFiltered.length, not_started: 0, in_progress: 0, completed: 0, overdue: 0 };
    for (const item of baseFiltered) {
      const s = String(item.status || "not_started") as keyof typeof c;
      if (s in c && s !== "all") c[s] += 1;
    }
    return c;
  }, [baseFiltered]);

  const filteredAndSorted = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((i) => String(i.status) === activeTab);
    return [...list].sort((a, b) => {
      const cmp =
        sortBy === "title"
          ? a.title.localeCompare(b.title)
          : (a.dueDate || "").localeCompare(b.dueDate || "");
      return sortAsc ? cmp : -cmp;
    });
  }, [baseFiltered, activeTab, sortBy, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  const startIdx = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredAndSorted.length);

  function toggleSort(col: "title" | "dueDate") {
    if (sortBy === col) setSortAsc(!sortAsc);
    else {
      setSortBy(col);
      setSortAsc(true);
    }
  }

  const tabs: Array<{
    key: "all" | "not_started" | "in_progress" | "completed" | "overdue";
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    { key: "all", label: "All", count: tabCounts.all, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    {
      key: "not_started",
      label: "Not Started",
      count: tabCounts.not_started,
      icon: <CircleDot className="h-3.5 w-3.5" />,
    },
    {
      key: "in_progress",
      label: "In Progress",
      count: tabCounts.in_progress,
      icon: <Loader2 className="h-3.5 w-3.5" />,
    },
    {
      key: "completed",
      label: "Completed",
      count: tabCounts.completed,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    {
      key: "overdue",
      label: "Overdue",
      count: tabCounts.overdue,
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Action Items"
        description="Manage tasks and follow-ups assigned from meetings."
        actions={
          !isEmployeePortal ? (
            <Button
              onClick={openAdd}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Action Item
            </Button>
          ) : undefined
        }
      />

      {/* Filter Bar + Tabs */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border/60">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={selectedPriority}
            onValueChange={(v) => {
              setSelectedPriority(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[155px] h-9">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedAssignee}
            onValueChange={(v) => {
              setSelectedAssignee(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[175px] h-9">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {`${emp.firstName} ${emp.lastName}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMeeting}
            onValueChange={(v) => {
              setSelectedMeeting(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="All Meetings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meetings</SelectItem>
              {meetings.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedPriority("all");
                setSelectedAssignee("all");
                setSelectedMeeting("all");
                setActiveTab("all");
                setPage(1);
              }}
              className="h-9 gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        <div className="px-4 flex items-center gap-1 overflow-x-auto bg-card">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 w-12">
                  #
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("title")}
                    className="inline-flex items-center gap-1 hover:text-foreground uppercase"
                  >
                    Action Item
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Assigned To
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("dueDate")}
                    className="inline-flex items-center gap-1 hover:text-foreground uppercase"
                  >
                    Due Date
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Priority
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 min-w-[180px]">
                  Progress
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Loading action items...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    No action items found.
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const empName = item.assignee
                    ? `${item.assignee.firstName} ${item.assignee.lastName}`.trim()
                    : "Unassigned";

                  return (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.meeting?.title || "General Meeting"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {item.assignee?.avatarUrl ? (
                            <img
                              src={item.assignee.avatarUrl}
                              alt={empName}
                              className="h-8 w-8 rounded-full object-cover border border-border/60 shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center border border-primary/20 shrink-0">
                              {getInitials(empName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-xs truncate">
                              {empName}
                            </div>
                            {item.assignee?.email && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {item.assignee.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {item.dueDate || "-"}
                        </div>
                        {item.status === "overdue" && (item.daysOverdue ?? 0) > 0 && (
                          <div className="text-[11px] font-medium text-rose-600 mt-0.5">
                            {item.daysOverdue} {item.daysOverdue === 1 ? "day" : "days"} overdue
                          </div>
                        )}
                        {item.status !== "completed" &&
                          item.status !== "overdue" &&
                          (item.daysRemaining ?? 0) > 0 && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {item.daysRemaining} {item.daysRemaining === 1 ? "day" : "days"}{" "}
                              remaining
                            </div>
                          )}
                      </td>
                      <td className="p-3">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="p-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {item.progress}%
                            </span>
                            <ActionStatusBadge status={item.status} />
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getProgressBarColor(
                                item.status
                              )}`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View Details"
                            onClick={() => setViewTarget(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {!isEmployeePortal && (
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => openEdit(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Update Progress"
                            onClick={() => openProgress(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-500/10 transition-colors"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          {!isEmployeePortal && (
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{startIdx}</span> to{" "}
            <span className="font-semibold text-foreground">{endIdx}</span> of{" "}
            <span className="font-semibold text-foreground">{filteredAndSorted.length}</span>{" "}
            results
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </Button>
              <Button
                variant="primary"
                size="xs"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              >
                {safePage}
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Action Item Modal */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) {
            setEditTarget(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Action Item" : "Add Action Item"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Meeting <span className="text-rose-500">*</span>
              </Label>
              <Select value={formMeetingId} onValueChange={setFormMeetingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Meeting" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {formatMeetingOptionLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Action Item Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Prepare Q2 Budget Report"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. Compile all department expenses and prepare summary..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Assign To <span className="text-rose-500">*</span>
              </Label>
              <Select value={formAssigneeId} onValueChange={setFormAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Assignee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {`${emp.firstName} ${emp.lastName}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Due Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Priority <span className="text-rose-500">*</span>
              </Label>
              <Select value={formPriority} onValueChange={setFormPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action Item Details Modal */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckSquare className="h-5 w-5" />
              </div>
              <DialogTitle>Action Item Details</DialogTitle>
            </div>
          </DialogHeader>

          {viewTarget && (
            <div className="space-y-5 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <CheckSquare className="h-3.5 w-3.5" />
                    Title
                  </div>
                  <div className="font-bold text-foreground">{viewTarget.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {viewTarget.meeting?.title || "General Meeting"}
                  </div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <User className="h-3.5 w-3.5" />
                    Assigned To
                  </div>
                  <div className="font-bold text-foreground">
                    {viewTarget.assignee
                      ? `${viewTarget.assignee.firstName} ${viewTarget.assignee.lastName}`.trim()
                      : "Unassigned"}
                  </div>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Due Date
                  </div>
                  <div className="font-bold text-foreground">{viewTarget.dueDate || "-"}</div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Priority
                  </div>
                  <div>
                    <PriorityBadge priority={viewTarget.priority} />
                  </div>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    Status
                  </div>
                  <div>
                    <ActionStatusBadge status={viewTarget.status} />
                  </div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
                    Progress
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getProgressBarColor(viewTarget.status)}`}
                        style={{ width: `${viewTarget.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {viewTarget.progress}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <FileText className="h-3.5 w-3.5" />
                  Description
                </div>
                <p className="font-medium text-foreground">
                  {viewTarget.description || "No description provided."}
                </p>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <FileText className="h-3.5 w-3.5" />
                  Notes
                </div>
                <p className="font-medium text-foreground">
                  {viewTarget.progressNotes || viewTarget.notes || "No progress notes yet."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Progress Modal */}
      <Dialog
        open={Boolean(progressTarget)}
        onOpenChange={(o) => !o && setProgressTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Progress Percentage <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={progressValue}
                onChange={(e) => setProgressValue(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Progress Notes</Label>
              <Textarea
                rows={4}
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Enter progress update notes..."
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setProgressTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={progressMutation.isPending}
                onClick={() => {
                  if (!progressTarget) return;
                  progressMutation.mutate({
                    id: progressTarget.id,
                    progress: Math.max(0, Math.min(100, Number(progressValue) || 0)),
                    progressNotes: progressNotes.trim(),
                  });
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {progressMutation.isPending ? "Updating..." : "Update Progress"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Action Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.title}</span>? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
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
