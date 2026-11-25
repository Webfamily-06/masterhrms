"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE, unwrapArray } from "@/lib/api";
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
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Eye,
  Edit,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
} from "lucide-react";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface MeetingTypeOption {
  id: string;
  name: string;
  color?: string;
  defaultDuration?: number;
}

interface MeetingRoomOption {
  id: string;
  name: string;
  roomType?: string;
}

interface MeetingItem {
  id: string;
  title: string;
  description?: string;
  typeId?: string | null;
  type?: { id: string; name: string; color?: string } | null;
  roomId?: string | null;
  room?: { id: string; name: string; roomType?: string } | null;
  organizerId: string;
  organizer?: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
  meetingDate: string;
  startTimeStr: string;
  endTimeStr: string;
  durationMinutes: number;
  recurrence: string;
  recurrenceEndDate?: string;
  agenda?: string;
  status: string;
  attendees: Array<{
    id: string;
    employee?: {
      id: string;
      name: string;
      email?: string;
      avatarUrl?: string | null;
    } | null;
  }>;
  attendeesCount: number;
  minutesCount: number;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(base: Date, delta: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta);
  return toYmd(d);
}

function resolveAvatarSrc(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = (API_BASE || "").replace(/\/api\/?$/, "").replace(/\/+$/, "");
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function MeetingStatusBadge({ status }: { status: string }) {
  const s = String(status || "scheduled").toLowerCase();
  if (s === "completed" || s === "held") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium">
        Held
      </span>
    );
  }
  if (s === "in_progress") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium">
        In Progress
      </span>
    );
  }
  if (s === "cancelled") {
    return (
      <span className="inline-flex items-center rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 text-[11px] font-medium">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 text-[11px] font-medium">
      Scheduled
    </span>
  );
}

const MINI_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function HrMeetingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const todayDate = useMemo(() => new Date(), []);
  const todayYmd = useMemo(() => toYmd(todayDate), [todayDate]);
  const yesterdayYmd = useMemo(() => shiftDays(todayDate, -1), [todayDate]);
  const tomorrowYmd = useMemo(() => shiftDays(todayDate, 1), [todayDate]);

  const [selectedDate, setSelectedDate] = useState<string>(todayYmd);
  const [calMonth, setCalMonth] = useState<Date>(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  );

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MeetingItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<MeetingItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeetingItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTypeId, setFormTypeId] = useState("");
  const [formRoomId, setFormRoomId] = useState("");
  const [formDate, setFormDate] = useState(todayYmd);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formOrganizerId, setFormOrganizerId] = useState("");
  const [formRecurrence, setFormRecurrence] = useState("none");
  const [formRecurrenceEnd, setFormRecurrenceEnd] = useState("");
  const [formAgenda, setFormAgenda] = useState("");
  const [nextStatus, setNextStatus] = useState("scheduled");

  const { data: meetings = [], isLoading } = useQuery<MeetingItem[]>({
    queryKey: ["hr-meetings"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings");
      return unwrapArray<MeetingItem>(res);
    },
  });

  const { data: meetingTypes = [] } = useQuery<MeetingTypeOption[]>({
    queryKey: ["hr-meeting-types-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/types");
      return unwrapArray<MeetingTypeOption>(res);
    },
  });

  const { data: meetingRooms = [] } = useQuery<MeetingRoomOption[]>({
    queryKey: ["hr-meeting-rooms-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/rooms");
      return unwrapArray<MeetingRoomOption>(res);
    },
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-for-meetings"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=500");
      return unwrapArray<EmployeeOption>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      title: string;
      description?: string;
      typeId?: string;
      roomId?: string;
      meetingDate: string;
      startTime: string;
      endTime: string;
      organizerId: string;
      recurrence: string;
      recurrenceEndDate?: string;
      agenda?: string;
    }) => {
      if (payload.id) return api.put(`/hr/meetings/${payload.id}`, payload);
      return api.post("/hr/meetings", payload);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["hr-meetings"] });
      toast.success(editTarget ? "Meeting updated." : "Meeting scheduled.");
      setSelectedDate(vars.meetingDate);
      setFormOpen(false);
      setEditTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save meeting.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/hr/meetings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meetings"] });
      toast.success("Meeting status updated.");
      setStatusTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meetings"] });
      toast.success("Meeting deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete meeting.");
    },
  });

  function openSchedule() {
    setEditTarget(null);
    setFormTitle("");
    setFormDescription("");
    setFormTypeId("");
    setFormRoomId("");
    setFormDate(selectedDate || todayYmd);
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormOrganizerId("");
    setFormRecurrence("none");
    setFormRecurrenceEnd("");
    setFormAgenda("");
    setFormOpen(true);
  }

  function openEdit(m: MeetingItem) {
    setEditTarget(m);
    setFormTitle(m.title || "");
    setFormDescription(m.description || "");
    setFormTypeId(m.typeId || m.type?.id || "");
    setFormRoomId(m.roomId || m.room?.id || "");
    setFormDate(m.meetingDate || todayYmd);
    setFormStartTime(m.startTimeStr || "09:00");
    setFormEndTime(m.endTimeStr || "10:00");
    setFormOrganizerId(m.organizerId || m.organizer?.id || "");
    setFormRecurrence(m.recurrence || "none");
    setFormRecurrenceEnd(m.recurrenceEndDate || "");
    setFormAgenda(m.agenda || "");
    setFormOpen(true);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formTypeId || !formDate || !formStartTime || !formEndTime || !formOrganizerId) {
      toast.error("Please fill all required fields.");
      return;
    }
    saveMutation.mutate({
      id: editTarget?.id,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      typeId: formTypeId,
      roomId: formRoomId || undefined,
      meetingDate: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      organizerId: formOrganizerId,
      recurrence: formRecurrence || "none",
      recurrenceEndDate: formRecurrenceEnd || undefined,
      agenda: formAgenda.trim() || undefined,
    });
  }

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, MeetingItem[]>();
    for (const m of meetings) {
      const k = m.meetingDate;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return map;
  }, [meetings]);

  const dayMeetings = meetingsByDate.get(selectedDate) || [];

  const summary = useMemo(() => {
    let scheduled = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;
    for (const m of dayMeetings) {
      const s = String(m.status || "scheduled").toLowerCase();
      if (s === "completed" || s === "held") completed += 1;
      else if (s === "in_progress") inProgress += 1;
      else if (s === "cancelled") cancelled += 1;
      else scheduled += 1;
    }
    return { scheduled, inProgress, completed, cancelled, total: dayMeetings.length };
  }, [dayMeetings]);

  // Mini Calendar Days
  const miniDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; ymd: string | null }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, ymd: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, ymd: toYmd(new Date(year, month, d)) });
    }
    return cells;
  }, [calMonth]);

  function selectDateAndSyncMonth(ymd: string) {
    setSelectedDate(ymd);
    const [y, m] = ymd.split("-").map(Number);
    if (y && m) setCalMonth(new Date(y, m - 1, 1));
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Meetings"
        description="Schedule and manage meetings across teams."
        actions={
          <Button
            onClick={openSchedule}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Schedule Meeting
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Day Schedule Timeline */}
        <div className="lg:col-span-9 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold text-sm text-foreground">{selectedDate}</span>
              <button
                type="button"
                onClick={() => selectDateAndSyncMonth(todayYmd)}
                className="rounded-md border border-border/80 bg-background hover:bg-muted px-2 py-0.5 text-xs font-medium text-foreground transition-colors"
              >
                Today
              </button>
            </div>

            <span className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 text-xs font-semibold">
              {dayMeetings.length} {dayMeetings.length === 1 ? "Meeting" : "Meetings"}
            </span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading meetings...
            </div>
          ) : dayMeetings.length === 0 ? (
            <div className="p-14 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                No meetings scheduled for {selectedDate}
              </div>
              <p className="text-xs text-muted-foreground">
                Select another date on the calendar or schedule a new meeting.
              </p>
              <Button
                onClick={openSchedule}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Schedule Meeting
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {dayMeetings.map((m) => {
                const orgName = m.organizer?.name || "HR Organizer";
                const visibleAttendees = (m.attendees || []).slice(0, 4);
                const extraAttendees = Math.max(0, (m.attendees || []).length - 4);

                return (
                  <div
                    key={m.id}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Time column */}
                      <div className="flex flex-col items-center text-xs font-semibold text-foreground w-12 shrink-0 pt-0.5">
                        <span>{m.startTimeStr}</span>
                        <ArrowDown className="h-3 w-3 text-muted-foreground my-0.5" />
                        <span className="text-muted-foreground font-medium">{m.endTimeStr}</span>
                      </div>

                      {/* Organizer avatar */}
                      {resolveAvatarSrc(m.organizer?.avatarUrl) ? (
                        <img
                          src={resolveAvatarSrc(m.organizer?.avatarUrl)!}
                          alt={orgName}
                          className="h-10 w-10 rounded-full object-cover border border-border/60 shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center border border-primary/20 shrink-0 mt-0.5">
                          {getInitials(orgName)}
                        </div>
                      )}

                      {/* Meeting Details */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/hr/meetings/${m.id}`)}
                            className="font-bold text-sm text-foreground hover:text-emerald-600 transition-colors text-left"
                          >
                            {m.title}
                          </button>
                          <MeetingStatusBadge status={m.status} />
                        </div>

                        <div className="text-xs text-muted-foreground truncate">
                          <span className="font-medium text-foreground/80">{orgName}</span>
                          {m.organizer?.email && <span> • {m.organizer.email}</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {m.room?.name || "Unassigned Room"}
                          </span>
                          {m.type?.name && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                              {m.type.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right actions + attendee avatars + duration */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="View Details"
                          onClick={() => router.push(`/hr/meetings/${m.id}`)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit Meeting"
                          onClick={() => openEdit(m)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Update Status"
                          onClick={() => {
                            setNextStatus(m.status || "scheduled");
                            setStatusTarget(m);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-blue-600 hover:bg-blue-500/10 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete Meeting"
                          onClick={() => setDeleteTarget(m)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {visibleAttendees.length > 0 && (
                          <div className="flex items-center -space-x-1.5">
                            {visibleAttendees.map((att) => {
                              const name = att.employee?.name || "A";
                              const attSrc = resolveAvatarSrc(att.employee?.avatarUrl);
                              return attSrc ? (
                                <img
                                  key={att.id}
                                  src={attSrc}
                                  alt={name}
                                  title={name}
                                  className="h-6 w-6 rounded-full object-cover ring-2 ring-card"
                                />
                              ) : (
                                <div
                                  key={att.id}
                                  title={name}
                                  className="h-6 w-6 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center ring-2 ring-card"
                                >
                                  {getInitials(name)}
                                </div>
                              );
                            })}
                            {extraAttendees > 0 && (
                              <span className="pl-2.5 text-[11px] font-semibold text-muted-foreground">
                                +{extraAttendees}
                              </span>
                            )}
                          </div>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          {m.durationMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Mini Calendar + Summary + Quick Filters */}
        <div className="lg:col-span-3 space-y-4">
          {/* Mini Month Calendar */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))
                }
                className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-foreground">
                {calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))
                }
                className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted-foreground">
              {MINI_WEEKDAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {miniDays.map((cell, idx) => {
                if (!cell.day || !cell.ymd) {
                  return <div key={`empty-${idx}`} />;
                }
                const isSelected = cell.ymd === selectedDate;
                const isToday = cell.ymd === todayYmd;
                const hasMeetings = (meetingsByDate.get(cell.ymd)?.length || 0) > 0;

                return (
                  <button
                    key={cell.ymd}
                    type="button"
                    onClick={() => setSelectedDate(cell.ymd!)}
                    className={`relative mx-auto h-8 w-8 rounded-lg flex flex-col items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-emerald-600 text-white font-bold"
                        : isToday
                        ? "text-emerald-600 font-bold hover:bg-emerald-500/10"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{cell.day}</span>
                    {hasMeetings && (
                      <span
                        className={`h-1 w-1 rounded-full absolute bottom-1 ${
                          isSelected ? "bg-white" : "bg-emerald-500"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Summary Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Meeting Summary</span>
              <span className="text-[11px] text-muted-foreground">({selectedDate})</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Scheduled
                </span>
                <span className="font-bold text-foreground">{summary.scheduled}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  In Progress
                </span>
                <span className="font-bold text-foreground">{summary.inProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Completed
                </span>
                <span className="font-bold text-foreground">{summary.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-rose-600" />
                  Cancelled
                </span>
                <span className="font-bold text-foreground">{summary.cancelled}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold text-foreground">
              <span>Total Meetings</span>
              <span>{summary.total}</span>
            </div>
          </div>

          {/* Quick Filters Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs p-4 space-y-2">
            <div className="text-xs font-bold text-foreground mb-1">Quick Filters</div>
            {[
              { label: "Yesterday", ymd: yesterdayYmd },
              { label: "Today", ymd: todayYmd },
              { label: "Tomorrow", ymd: tomorrowYmd },
            ].map((item) => {
              const active = selectedDate === item.ymd;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => selectDateAndSyncMonth(item.ymd)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-emerald-500/10 text-emerald-700 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Schedule / Edit Meeting Modal */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Meeting" : "Schedule New Meeting"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Meeting Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Q1 Planning Meeting"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. Quarterly planning session to review goals..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Meeting Type <span className="text-rose-500">*</span>
              </Label>
              <Select value={formTypeId} onValueChange={setFormTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Meeting Type" />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Meeting Room</Label>
              <Select value={formRoomId} onValueChange={setFormRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Meeting Room" />
                </SelectTrigger>
                <SelectContent>
                  {meetingRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {`${r.name} (${r.roomType === "virtual" ? "Virtual" : "Physical"})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Meeting Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
                <Label>
                  End Time <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Organizer <span className="text-rose-500">*</span>
              </Label>
              <Select value={formOrganizerId} onValueChange={setFormOrganizerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Organizer" />
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
                Recurrence <span className="text-rose-500">*</span>
              </Label>
              <Select value={formRecurrence} onValueChange={setFormRecurrence}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Recurrence End Date</Label>
              <Input
                type="date"
                value={formRecurrenceEnd}
                onChange={(e) => setFormRecurrenceEnd(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Agenda</Label>
              <Textarea
                rows={3}
                value={formAgenda}
                onChange={(e) => setFormAgenda(e.target.value)}
                placeholder={"e.g. 1. Review last quarter results\n2. Set new targets..."}
              />
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

      {/* Update Meeting Status Modal */}
      <Dialog open={Boolean(statusTarget)} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Meeting Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusTarget &&
                  statusMutation.mutate({ id: statusTarget.id, status: nextStatus })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {statusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Meeting</DialogTitle>
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
