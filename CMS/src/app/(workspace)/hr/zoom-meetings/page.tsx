"use client";

import { useMemo, useState } from "react";
import { useRouterState } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Video,
  Copy,
  Check,
  X,
  Play,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface AttendeeInfo {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

interface ZoomMeetingItem {
  id: string;
  topic: string;
  title?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  passcode?: string;
  description?: string;
  status: "scheduled" | "started" | "ended" | "cancelled" | string;
  attendeeIds: string[];
  attendees: AttendeeInfo[];
  hostName?: string;
  hostEmail?: string;
  hostAvatar?: string | null;
  zoomMeetingId?: string;
  joinUrl?: string;
  startUrl?: string;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateSixDigitPasscode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getStatusPillClass(status: string) {
  const s = String(status || "scheduled").toLowerCase();
  if (s === "started") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  if (s === "ended") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (s === "cancelled") return "bg-rose-500/15 text-rose-700 border-rose-500/30";
  return "bg-blue-500/15 text-blue-700 border-blue-500/30";
}

function getStatusLabel(status: string) {
  const s = String(status || "scheduled").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HrZoomMeetingsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const queryClient = useQueryClient();

  const todayDate = useMemo(() => new Date(), []);
  const todayYmd = useMemo(() => toYmd(todayDate), [todayDate]);

  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => toYmd(new Date()));

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ZoomMeetingItem | null>(null);
  const [viewTarget, setViewTarget] = useState<ZoomMeetingItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ZoomMeetingItem | null>(null);

  // Form fields
  const [formTopic, setFormTopic] = useState("");
  const [formStartDate, setFormStartDate] = useState(todayYmd);
  const [formStartTime, setFormStartTime] = useState("10:00");
  const [formDuration, setFormDuration] = useState("30");
  const [formPasscode, setFormPasscode] = useState(() => generateSixDigitPasscode());
  const [formAttendeeIds, setFormAttendeeIds] = useState<string[]>([]);
  const [formDescription, setFormDescription] = useState("");
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  const { data: meetings = [], isLoading } = useQuery<ZoomMeetingItem[]>({
    queryKey: ["hr-zoom-meetings"],
    queryFn: async () => {
      const res = await api.get("/hr/zoom-meetings");
      return unwrapArray<ZoomMeetingItem>(res);
    },
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-for-zoom"],
    enabled: !isEmployeePortal,
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=500");
      return unwrapArray<EmployeeOption>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      topic: string;
      startDate: string;
      startTime: string;
      durationMinutes: number;
      passcode?: string;
      attendeeIds: string[];
      description?: string;
    }) => {
      if (payload.id) {
        return api.put(`/hr/zoom-meetings/${payload.id}`, payload);
      }
      return api.post("/hr/zoom-meetings", payload);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["hr-zoom-meetings"] });
      toast.success(editTarget ? "Zoom meeting updated." : "Zoom meeting scheduled.");
      setSelectedDate(vars.startDate);
      setFormOpen(false);
      setEditTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save Zoom meeting.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/hr/zoom-meetings/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-zoom-meetings"] });
      toast.success("Meeting status updated.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/hr/zoom-meetings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-zoom-meetings"] });
      toast.success("Zoom meeting deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete meeting.");
    },
  });

  function openSchedule(prefillDate?: string) {
    setEditTarget(null);
    setFormTopic("");
    setFormStartDate(prefillDate || selectedDate || todayYmd);
    setFormStartTime("10:00");
    setFormDuration("30");
    setFormPasscode(generateSixDigitPasscode());
    setFormAttendeeIds([]);
    setFormDescription("");
    setEmpSearch("");
    setEmpPickerOpen(false);
    setFormOpen(true);
  }

  function openEdit(m: ZoomMeetingItem) {
    setEditTarget(m);
    setFormTopic(m.topic || "");
    setFormStartDate(m.startDate || todayYmd);
    setFormStartTime(m.startTime || "10:00");
    setFormDuration(String(m.durationMinutes || 30));
    setFormPasscode(m.passcode || generateSixDigitPasscode());
    setFormAttendeeIds(m.attendeeIds || []);
    setFormDescription(m.description || "");
    setEmpSearch("");
    setEmpPickerOpen(false);
    setFormOpen(true);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTopic.trim() || !formStartDate || !formStartTime) {
      toast.error("Please fill all required fields.");
      return;
    }
    saveMutation.mutate({
      id: editTarget?.id,
      topic: formTopic.trim(),
      startDate: formStartDate,
      startTime: formStartTime,
      durationMinutes: Math.max(5, Number(formDuration) || 30),
      passcode: formPasscode.trim() || undefined,
      attendeeIds: formAttendeeIds,
      description: formDescription.trim() || undefined,
    });
  }

  function toggleAttendee(empId: string) {
    setFormAttendeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  }

  // Group meetings by YYYY-MM-DD
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, ZoomMeetingItem[]>();
    for (const m of meetings) {
      const key = m.startDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [meetings]);

  // Calendar grid (42 days for month view)
  const monthGridDays = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sun
    const gridStart = new Date(year, month, 1 - startOffset);
    const cells: Array<{ date: Date; ymd: string; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      cells.push({
        date: d,
        ymd: toYmd(d),
        inMonth: d.getMonth() === month,
      });
    }
    return cells;
  }, [cursorDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const dayOfWeek = cursorDate.getDay();
    const start = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      cursorDate.getDate() - dayOfWeek
    );
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date: d, ymd: toYmd(d) };
    });
  }, [cursorDate]);

  function navigatePrev() {
    if (viewMode === "month") {
      setCursorDate(new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      setCursorDate(
        new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate() - 7)
      );
    } else {
      const next = new Date(
        cursorDate.getFullYear(),
        cursorDate.getMonth(),
        cursorDate.getDate() - 1
      );
      setCursorDate(next);
      setSelectedDate(toYmd(next));
    }
  }

  function navigateNext() {
    if (viewMode === "month") {
      setCursorDate(new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      setCursorDate(
        new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate() + 7)
      );
    } else {
      const next = new Date(
        cursorDate.getFullYear(),
        cursorDate.getMonth(),
        cursorDate.getDate() + 1
      );
      setCursorDate(next);
      setSelectedDate(toYmd(next));
    }
  }

  function navigateToday() {
    const now = new Date();
    setCursorDate(now);
    setSelectedDate(toYmd(now));
  }

  const calendarTitle = useMemo(() => {
    if (viewMode === "month") {
      return cursorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
      const first = weekDays[0].date;
      const last = weekDays[6].date;
      return `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursorDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [viewMode, cursorDate, weekDays]);

  const selectedDayMeetings = meetingsByDate.get(selectedDate) || [];

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
    );
  }, [employees, empSearch]);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Zoom Meetings"
        description="Schedule, manage, and start video meetings seamlessly with Zoom."
        actions={
          !isEmployeePortal ? (
            <Button
              onClick={() => openSchedule()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Schedule Zoom Meeting
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Calendar Card */}
        <div className="lg:col-span-8 rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Legend:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Started
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Ended
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
              Cancelled
            </span>
          </div>

          {/* Calendar Navigation Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md overflow-hidden border border-slate-800 bg-slate-800 text-white">
                <button
                  type="button"
                  onClick={navigatePrev}
                  className="px-2.5 py-1.5 hover:bg-slate-700 transition-colors"
                  title="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={navigateNext}
                  className="px-2.5 py-1.5 hover:bg-slate-700 transition-colors border-l border-slate-700"
                  title="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={navigateToday}
                className="px-3 py-1.5 rounded-md bg-slate-500 hover:bg-slate-600 text-white text-xs font-medium transition-colors"
              >
                Today
              </button>
            </div>

            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {calendarTitle}
            </h2>

            <div className="inline-flex rounded-md overflow-hidden bg-slate-800 text-white text-xs font-medium">
              {(["month", "week", "day"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 capitalize transition-colors ${viewMode === mode
                    ? "bg-slate-950 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Month View */}
          {viewMode === "month" && (
            <div className="border border-border/80 rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 bg-muted/40 border-b border-border/80">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-xs font-semibold text-foreground border-r last:border-r-0 border-border/60"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthGridDays.map((cell) => {
                  const dayMeetings = meetingsByDate.get(cell.ymd) || [];
                  const isToday = cell.ymd === todayYmd;
                  const isSelected = cell.ymd === selectedDate;

                  return (
                    <div
                      key={cell.ymd}
                      onClick={() => setSelectedDate(cell.ymd)}
                      className={`min-h-[92px] p-1.5 border-r border-b border-border/60 cursor-pointer transition-colors ${isToday
                        ? "bg-amber-50/70 dark:bg-amber-500/10"
                        : isSelected
                          ? "bg-primary/5"
                          : "hover:bg-muted/30"
                        }`}
                    >
                      <div className="flex items-center justify-end mb-1">
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isSelected
                            ? "bg-emerald-600 text-white"
                            : cell.inMonth
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                            }`}
                        >
                          {cell.date.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {dayMeetings.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.ymd);
                            }}
                            title={`${m.startTime} - ${m.topic}`}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border truncate ${getStatusPillClass(
                              m.status
                            )}`}
                          >
                            {m.topic}
                          </div>
                        ))}
                        {dayMeetings.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayMeetings.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week View */}
          {viewMode === "week" && (
            <div className="border border-border/80 rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 bg-muted/40 border-b border-border/80">
                {weekDays.map((wd) => (
                  <div
                    key={wd.ymd}
                    className="py-2 text-center text-xs font-semibold text-foreground border-r last:border-r-0 border-border/60"
                  >
                    <div>{WEEKDAYS[wd.date.getDay()]}</div>
                    <div className="text-[11px] text-muted-foreground">{wd.date.getDate()}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 min-h-[320px]">
                {weekDays.map((wd) => {
                  const dayMeetings = meetingsByDate.get(wd.ymd) || [];
                  const isToday = wd.ymd === todayYmd;
                  return (
                    <div
                      key={wd.ymd}
                      onClick={() => setSelectedDate(wd.ymd)}
                      className={`p-2 border-r last:border-r-0 border-border/60 space-y-2 cursor-pointer ${isToday ? "bg-amber-50/70 dark:bg-amber-500/10" : "hover:bg-muted/20"
                        }`}
                    >
                      {dayMeetings.map((m) => (
                        <div
                          key={m.id}
                          className={`p-1.5 rounded border text-[11px] ${getStatusPillClass(
                            m.status
                          )}`}
                        >
                          <div className="font-semibold truncate">{m.topic}</div>
                          <div className="text-[10px] opacity-80">
                            {m.startTime} - {m.endTime}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day View */}
          {viewMode === "day" && (
            <div className="border border-border/80 rounded-lg p-4 space-y-3 min-h-[300px]">
              {(meetingsByDate.get(toYmd(cursorDate)) || []).length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No Zoom meetings scheduled on {toYmd(cursorDate)}.
                </div>
              ) : (
                (meetingsByDate.get(toYmd(cursorDate)) || []).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setViewTarget(m)}
                    className="p-3 rounded-lg border border-border/80 hover:bg-muted/40 cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-sm text-foreground">{m.topic}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {m.startTime} - {m.endTime} ({m.durationMinutes} mins)
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusPillClass(
                        m.status
                      )}`}
                    >
                      {getStatusLabel(m.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Selected Date Details Panel */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{selectedDate}</span>
            </div>
            {!isEmployeePortal && (
              <button
                type="button"
                onClick={() => openSchedule(selectedDate)}
                className="text-xs font-medium text-primary hover:text-primary/80 inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading meetings...
            </div>
          ) : selectedDayMeetings.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Video className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium text-foreground">No meetings on this date</div>
              <p className="text-[11px] text-muted-foreground">
                Click &ldquo;Schedule Zoom Meeting&rdquo; to add one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayMeetings.map((m) => {
                const participants: Array<{ name: string; avatarUrl?: string | null }> = [
                  { name: m.hostName || "Company", avatarUrl: m.hostAvatar },
                  ...(m.attendees || []).map((a) => ({
                    name: a.name,
                    avatarUrl: a.avatarUrl,
                  })),
                ];
                const visibleParticipants = participants.slice(0, 3);
                const extraCount = Math.max(0, participants.length - 3);

                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {m.startTime} - {m.endTime}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${getStatusPillClass(
                          m.status
                        )}`}
                      >
                        {getStatusLabel(m.status)}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-foreground">{m.topic}</h3>
                      {m.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {m.description}
                        </p>
                      )}
                    </div>

                    {/* Participants */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
                      {visibleParticipants.map((p, idx) => (
                        <div key={idx} className="inline-flex items-center gap-1.5">
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.name}
                              className="h-6 w-6 rounded-full object-cover border border-border/60"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/20">
                              {getInitials(p.name)}
                            </div>
                          )}
                          <span className="text-xs text-foreground font-medium truncate max-w-[110px]">
                            {p.name}
                          </span>
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <span className="text-xs font-medium text-muted-foreground">
                          +{extraCount}
                        </span>
                      )}
                    </div>

                    {/* Card Footer Action Menu */}
                    <div className="flex items-center justify-end pt-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setViewTarget(m)}>
                            <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            View Details
                          </DropdownMenuItem>
                          {!isEmployeePortal && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(m)}>
                                <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({ id: m.id, status: "started" })
                                }
                              >
                                <Play className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                Mark Started
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({ id: m.id, status: "ended" })
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                Mark Ended
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({ id: m.id, status: "cancelled" })
                                }
                              >
                                <XCircle className="h-3.5 w-3.5 mr-2 text-rose-600" />
                                Cancel Meeting
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(m)}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule / Edit Zoom Meeting Modal */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) {
            setEditTarget(null);
            setEmpPickerOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Zoom Meeting" : "Schedule Zoom Meeting"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Meeting Title / Topic <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                placeholder="e.g., Performance Review Meeting"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Start Time <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Duration (Minutes) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Passcode</Label>
                <Input
                  value={formPasscode}
                  onChange={(e) => setFormPasscode(e.target.value)}
                  placeholder="6-digit passcode"
                />
              </div>
            </div>

            {/* Invite Employees Multi-Select (Name only) */}
            <div className="space-y-1.5">
              <Label>Invite Employees</Label>
              <div
                onClick={() => setEmpPickerOpen((prev) => !prev)}
                className="min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer flex flex-wrap items-center gap-1.5"
              >
                {formAttendeeIds.length === 0 ? (
                  <span className="text-muted-foreground">Select Employees</span>
                ) : (
                  formAttendeeIds.map((id) => {
                    const emp = employees.find((e) => e.id === id);
                    const name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAttendee(id);
                          }}
                          className="hover:text-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>

              {empPickerOpen && (
                <div className="rounded-lg border border-border bg-popover shadow-md p-2 space-y-2">
                  <Input
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="Search employees..."
                    className="h-8 text-xs"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {filteredEmployees.length === 0 ? (
                      <div className="py-3 text-center text-xs text-muted-foreground">
                        No employees found.
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const checked = formAttendeeIds.includes(emp.id);
                        const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleAttendee(emp.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${checked
                              ? "bg-emerald-500/10 text-emerald-700 font-medium"
                              : "hover:bg-muted text-foreground"
                              }`}
                          >
                            <span>{fullName}</span>
                            {checked && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Description / Agenda</Label>
              <Textarea
                rows={4}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Add meeting agenda, discussion topics, or notes..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
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

      {/* View Zoom Meeting Details Modal */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewTarget?.topic || "Zoom Meeting Details"}</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {viewTarget.startDate} • {viewTarget.startTime} - {viewTarget.endTime} (
                  {viewTarget.durationMinutes} mins)
                </span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusPillClass(
                    viewTarget.status
                  )}`}
                >
                  {getStatusLabel(viewTarget.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">Meeting ID</div>
                  <div className="tabular-nums font-semibold text-foreground">
                    {viewTarget.zoomMeetingId || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Passcode</div>
                  <div className="tabular-nums font-semibold text-foreground">
                    {viewTarget.passcode || "-"}
                  </div>
                </div>
              </div>

              {viewTarget.joinUrl && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Join Link</div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={viewTarget.joinUrl}
                      className="h-8 text-xs tabular-nums bg-muted/30"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(viewTarget.joinUrl || "");
                        toast.success("Join link copied.");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-muted-foreground mb-1">Description / Agenda</div>
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-foreground whitespace-pre-wrap">
                  {viewTarget.description || "No agenda provided."}
                </div>
              </div>

              {viewTarget.attendees && viewTarget.attendees.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    Invited Employees ({viewTarget.attendees.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {viewTarget.attendees.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewTarget(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Zoom Meeting</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.topic}</span>? This
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
