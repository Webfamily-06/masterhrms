"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Calendar,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  LayoutGrid,
  CalendarClock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

interface TrainerPerson {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string | null;
}

interface SessionRecord {
  id: string;
  courseId: string;
  course?: { id: string; title: string; name?: string } | null;
  title: string;
  sessionName?: string;
  startDate: string;
  endDate: string;
  location: string;
  locationType: "virtual" | "physical";
  meetingLink: string;
  notes: string;
  status: SessionStatus;
  trainerIds: string[];
  trainers: TrainerPerson[];
  isRecurring: boolean;
  attendanceCount: number;
}

interface ProgramOption {
  id: string;
  name: string;
  title?: string;
}

function getInitials(first?: string, last?: string) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

function StatusBadge({ status }: { status: SessionStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
        In progress
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
      Scheduled
    </span>
  );
}

const EMPTY_FORM = {
  courseId: "",
  sessionName: "",
  startDate: "",
  endDate: "",
  locationType: "" as "" | "virtual" | "physical",
  location: "",
  meetingLink: "",
  status: "" as "" | SessionStatus,
  notes: "",
  trainerIds: [] as string[],
  isRecurring: false,
};

export default function HrTrainingSessionsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | SessionStatus>("all");
  const [sortBy, setSortBy] = useState<"startDate" | "endDate" | "status">("startDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SessionRecord | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<SessionRecord | null>(null);

  const { data: sessions = [], isLoading } = useQuery<SessionRecord[]>({
    queryKey: ["hr-training-sessions"],
    queryFn: async () => {
      const res = await api.get("/hr/training/sessions");
      return unwrapArray<SessionRecord>(res);
    },
  });

  const { data: programs = [] } = useQuery<ProgramOption[]>({
    queryKey: ["hr-training-programs"],
    queryFn: async () => {
      const res = await api.get("/hr/training/programs");
      return unwrapArray<ProgramOption>(res);
    },
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees-list-training-sessions"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=300");
      return unwrapArray(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const body = {
        courseId: payload.courseId,
        sessionName: payload.sessionName.trim(),
        title: payload.sessionName.trim(),
        startDate: payload.startDate,
        endDate: payload.endDate,
        locationType: payload.locationType || "physical",
        location: payload.location.trim(),
        meetingLink: payload.meetingLink.trim(),
        status: payload.status || "scheduled",
        notes: payload.notes.trim(),
        trainerIds: payload.trainerIds,
        isRecurring: payload.isRecurring,
      };
      if (editing) {
        return api.put(`/hr/training/sessions/${editing.id}`, body);
      }
      return api.post("/hr/training/sessions", body);
    },
    onSuccess: () => {
      toast.success(
        editing
          ? "Training session updated & synced to Calendar"
          : "Training session scheduled & added to Employee/Trainer Calendar"
      );
      queryClient.invalidateQueries({ queryKey: ["hr-training-sessions"] });
      setFormOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save training session"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/training/sessions/${id}`),
    onSuccess: () => {
      toast.success("Training session deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-training-sessions"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete session"),
  });

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (locationFilter !== "all" && s.locationType !== locationFilter) return false;
      if (dateFrom && s.startDate < dateFrom) return false;
      if (dateTo && s.startDate > dateTo) return false;
      if (q) {
        const text = `${s.title} ${s.course?.title || ""} ${s.location}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, search, locationFilter, dateFrom, dateTo]);

  const counts = useMemo(
    () => ({
      all: baseFiltered.length,
      scheduled: baseFiltered.filter((s) => s.status === "scheduled").length,
      in_progress: baseFiltered.filter((s) => s.status === "in_progress").length,
      completed: baseFiltered.filter((s) => s.status === "completed").length,
      cancelled: baseFiltered.filter((s) => s.status === "cancelled").length,
    }),
    [baseFiltered]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((s) => s.status === activeTab);
    return [...list].sort((a, b) => {
      const va = sortBy === "status" ? a.status : sortBy === "endDate" ? a.endDate : a.startDate;
      const vb = sortBy === "status" ? b.status : sortBy === "endDate" ? b.endDate : b.startDate;
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [baseFiltered, activeTab, sortBy, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters = Boolean(search || locationFilter !== "all" || dateFrom || dateTo);

  const openAdd = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: SessionRecord) => {
    setEditing(item);
    setFormData({
      courseId: item.courseId || "",
      sessionName: item.title || "",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      locationType: item.locationType || "physical",
      location: item.location || "",
      meetingLink: item.meetingLink || "",
      status: item.status || "scheduled",
      notes: item.notes || "",
      trainerIds: item.trainerIds || [],
      isRecurring: Boolean(item.isRecurring),
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) return toast.error("Please select a Training Program");
    if (!formData.startDate || !formData.endDate) return toast.error("Start and End Dates are required");
    if (!formData.locationType) return toast.error("Please select Location Type");
    if (!formData.location.trim()) return toast.error("Location is required");
    if (formData.locationType === "virtual" && !formData.meetingLink.trim()) {
      return toast.error("Meeting Link is required for Virtual sessions");
    }
    if (!formData.status) return toast.error("Please select Status");
    if (formData.trainerIds.length === 0) return toast.error("Please select at least one Trainer");
    saveMutation.mutate(formData);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header: NO Calendar View button per user request */}
      <PageHeader
        title="Training Sessions"
        description="Manage scheduled training sessions for your employees."
        actions={
          !isEmployeePortal ? (
            <Button
              onClick={openAdd}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Session
            </Button>
          ) : undefined
        }
      />

      {/* Filter & Tabs Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-[280px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9 bg-background"
            />
          </div>

          <Select
            value={locationFilter}
            onValueChange={(val) => {
              setLocationFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[165px] h-9 bg-background">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[160px] h-9 bg-background"
            aria-label="Start Date"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[160px] h-9 bg-background"
            aria-label="End Date"
          />

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setLocationFilter("all");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="h-9 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/70 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: counts.all, Icon: LayoutGrid },
            { key: "scheduled" as const, label: "Scheduled", count: counts.scheduled, Icon: CalendarClock },
            { key: "in_progress" as const, label: "In Progress", count: counts.in_progress, Icon: PlayCircle },
            { key: "completed" as const, label: "Completed", count: counts.completed, Icon: CheckCircle2 },
            { key: "cancelled" as const, label: "Cancelled", count: counts.cancelled, Icon: XCircle },
          ].map(({ key, label, count, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setPage(1);
                }}
                className={`py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="p-3.5 text-xs font-semibold text-muted-foreground w-12">#</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Program</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("startDate");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Start Date</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("endDate");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>End Date</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Location</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("status");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Trainers</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Attendance</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-sm text-muted-foreground">
                    Loading training sessions...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-sm text-muted-foreground">
                    No training sessions found. Click &ldquo;+ Add Session&rdquo; to schedule one.
                  </td>
                </tr>
              ) : (
                paginated.map((session, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const visibleTrainers = (session.trainers || []).slice(0, 4);
                  const extraTrainers = Math.max(0, (session.trainers || []).length - 4);
                  return (
                    <tr key={session.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3.5 min-w-[200px]">
                        <div className="text-sm font-semibold text-foreground">{session.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {session.course?.title || "—"}
                        </div>
                      </td>
                      <td className="p-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {session.startDate}
                        </span>
                      </td>
                      <td className="p-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {session.endDate}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-sm font-semibold text-foreground">
                          {session.location || "—"}
                        </div>
                        <div className="mt-0.5">
                          {session.locationType === "virtual" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                              Virtual
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              Physical
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center -space-x-2">
                          {visibleTrainers.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <>
                              {visibleTrainers.map((t) => {
                                const name = `${t.firstName} ${t.lastName}`.trim();
                                return t.avatarUrl ? (
                                  <img
                                    key={t.id}
                                    src={t.avatarUrl}
                                    alt={name}
                                    title={name}
                                    className="h-7 w-7 rounded-full object-cover ring-2 ring-background"
                                  />
                                ) : (
                                  <div
                                    key={t.id}
                                    title={name}
                                    className="h-7 w-7 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center ring-2 ring-background"
                                  >
                                    {getInitials(t.firstName, t.lastName)}
                                  </div>
                                );
                              })}
                              {extraTrainers > 0 && (
                                <span className="h-7 w-7 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center ring-2 ring-background">
                                  +{extraTrainers}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-sm font-semibold text-foreground">
                        {session.attendanceCount ?? 0}
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Session Details"
                            onClick={() => router.push(`/hr/training/sessions/${session.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isEmployeePortal && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                                title="Edit Session"
                                onClick={() => openEdit(session)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                title="Delete Session"
                                onClick={() => setDeleteTarget(session)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-medium text-foreground">
              {totalResults === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(safePage * pageSize, totalResults)}
            </span>{" "}
            of <span className="font-medium text-foreground">{totalResults}</span> results
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 bg-background text-xs">
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
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === safePage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 p-0 text-xs ${
                      pNum === safePage
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                        : ""
                    }`}
                  >
                    {pNum}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Training Session Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Training Session" : "Add New Training Session"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>
                Training Program <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.courseId}
                onValueChange={(val) => setFormData((p) => ({ ...p, courseId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Training Program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.name || prog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Session Name</Label>
              <Input
                value={formData.sessionName}
                onChange={(e) => setFormData((p) => ({ ...p, sessionName: e.target.value }))}
                placeholder="e.g. Morning Batch - Week 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  End Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Location Type <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.locationType}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, locationType: val as "virtual" | "physical" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Location <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Conference Room A, Head Office"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Meeting Link{" "}
                {formData.locationType === "virtual" && <span className="text-rose-500">*</span>}
              </Label>
              <Input
                value={formData.meetingLink}
                onChange={(e) => setFormData((p) => ({ ...p, meetingLink: e.target.value }))}
                placeholder="https://meet.google.com/abc-xyz"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, status: val as SessionStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Bring your laptop and training materials..."
              />
            </div>

            {/* Multi-select Trainers (Name ONLY) */}
            <div className="space-y-2">
              <Label>
                Trainers <span className="text-rose-500">*</span>
              </Label>
              {formData.trainerIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.trainerIds.map((id) => {
                    const emp = employees.find((e) => e.id === id);
                    const name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border/80"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              trainerIds: p.trainerIds.filter((x) => x !== id),
                            }))
                          }
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="max-h-36 overflow-y-auto border border-border/80 rounded-lg divide-y divide-border/50">
                {employees.map((emp: any) => {
                  const checked = formData.trainerIds.includes(emp.id);
                  const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                  return (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setFormData((p) => ({
                            ...p,
                            trainerIds: checked
                              ? p.trainerIds.filter((x) => x !== emp.id)
                              : [...p.trainerIds, emp.id],
                          }))
                        }
                        className="h-4 w-4 rounded border-border accent-emerald-500"
                      />
                      <span>{fullName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData((p) => ({ ...p, isRecurring: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-emerald-500"
              />
              <span className="text-sm font-semibold text-foreground">Recurring Session</span>
            </label>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Training Session</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.title}</span>? This will
            also remove it from synced calendars.
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
