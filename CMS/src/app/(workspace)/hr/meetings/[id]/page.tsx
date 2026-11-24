"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE, unwrapArray, unwrapData } from "@/lib/api";
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
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Users,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  MessageSquare,
  User,
} from "lucide-react";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface AttendeeItem {
  id: string;
  employeeId: string;
  rsvpStatus: string;
  attendanceStatus: string;
  declineReason?: string;
  respondedAt?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
}

interface MinuteItem {
  id: string;
  topic: string;
  type: string;
  content: string;
  recordedById?: string | null;
  recordedByName: string;
  recordedByEmail?: string;
  recordedByAvatar?: string | null;
  recordedAt: string;
  recordedTime?: string;
}

interface MeetingDetail {
  id: string;
  title: string;
  description?: string;
  meetingDate: string;
  startTimeStr: string;
  endTimeStr: string;
  durationMinutes: number;
  recurrence: string;
  agenda?: string;
  status: string;
  room?: { id: string; name: string } | null;
  type?: { id: string; name: string } | null;
  organizer?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
  attendees: AttendeeItem[];
  minutes: MinuteItem[];
  attendeesCount: number;
  minutesCount: number;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

function UserAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const [imgError, setImgError] = useState(false);
  const src = resolveAvatarSrc(avatarUrl);
  const dims = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]";

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`${dims} rounded-full object-cover border border-border/60 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dims} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

function RsvpBadge({ status }: { status: string }) {
  const s = String(status || "pending").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    accepted: { label: "Accepted", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    declined: { label: "Declined", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
    tentative: { label: "Tentative", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    pending: { label: "Pending", cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  };
  const info = map[s] || map.pending;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}

function AttendanceBadge({ status }: { status: string }) {
  const s = String(status || "not_attended").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    present: { label: "Present", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    late: { label: "Late", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    not_attended: { label: "Not Attended", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  };
  const info = map[s] || map.not_attended;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}

function MinuteTypeBadge({ type }: { type: string }) {
  const t = String(type || "discussion").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    discussion: { label: "Discussion", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    decision: { label: "Decision", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    action_item: { label: "Action Item", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    note: { label: "Note", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  };
  const info = map[t] || map.discussion;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}

export default function HrMeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const meetingId = params?.id;

  const [activeTab, setActiveTab] = useState<"attendees" | "minutes">("attendees");

  // Attendees filters
  const [attSearch, setAttSearch] = useState("");
  const [attRsvpFilter, setAttRsvpFilter] = useState("all");
  const [attStatusFilter, setAttStatusFilter] = useState("all");

  // Minutes filters
  const [minSearch, setMinSearch] = useState("");
  const [minTypeFilter, setMinTypeFilter] = useState("all");
  const [minRecorderFilter, setMinRecorderFilter] = useState("all");

  // Modals
  const [attModalOpen, setAttModalOpen] = useState(false);
  const [editAtt, setEditAtt] = useState<AttendeeItem | null>(null);
  const [viewAtt, setViewAtt] = useState<AttendeeItem | null>(null);

  const [minModalOpen, setMinModalOpen] = useState(false);
  const [editMin, setEditMin] = useState<MinuteItem | null>(null);
  const [viewMin, setViewMin] = useState<MinuteItem | null>(null);

  // Attendee form
  const [attEmpId, setAttEmpId] = useState("");
  const [attRsvp, setAttRsvp] = useState("pending");
  const [attAttendance, setAttAttendance] = useState("not_attended");
  const [attDeclineReason, setAttDeclineReason] = useState("");

  // Minute form
  const [minTopic, setMinTopic] = useState("");
  const [minType, setMinType] = useState("discussion");
  const [minContent, setMinContent] = useState("");
  const [minRecorderId, setMinRecorderId] = useState("");
  const [minDate, setMinDate] = useState("");
  const [minTime, setMinTime] = useState("10:00");

  const { data: meeting, isLoading } = useQuery<MeetingDetail>({
    queryKey: ["hr-meeting-detail", meetingId],
    enabled: Boolean(meetingId),
    queryFn: async () => {
      const res = await api.get(`/hr/meetings/${meetingId}`);
      return unwrapData<MeetingDetail>(res);
    },
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-for-meeting-detail"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=500");
      return unwrapArray<EmployeeOption>(res);
    },
  });

  const saveAttendeeMutation = useMutation({
    mutationFn: async (payload: {
      attendeeId?: string;
      employeeId: string;
      rsvpStatus: string;
      attendanceStatus: string;
      declineReason?: string;
    }) => {
      if (payload.attendeeId) {
        return api.put(`/hr/meetings/${meetingId}/attendees/${payload.attendeeId}`, payload);
      }
      return api.post(`/hr/meetings/${meetingId}/attendees`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-detail", meetingId] });
      toast.success(editAtt ? "Attendee updated." : "Attendee added.");
      setAttModalOpen(false);
      setEditAtt(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save attendee.");
    },
  });

  const deleteAttendeeMutation = useMutation({
    mutationFn: async (attendeeId: string) =>
      api.delete(`/hr/meetings/${meetingId}/attendees/${attendeeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-detail", meetingId] });
      toast.success("Attendee removed.");
    },
  });

  const saveMinuteMutation = useMutation({
    mutationFn: async (payload: {
      minuteId?: string;
      topic: string;
      type: string;
      content: string;
      recordedById?: string;
      recordedDate?: string;
      recordedTime?: string;
    }) => {
      if (payload.minuteId) {
        return api.put(`/hr/meetings/${meetingId}/minutes/${payload.minuteId}`, payload);
      }
      return api.post(`/hr/meetings/${meetingId}/minutes`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-detail", meetingId] });
      toast.success(editMin ? "Minute updated." : "Minute added.");
      setMinModalOpen(false);
      setEditMin(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save minute.");
    },
  });

  const deleteMinuteMutation = useMutation({
    mutationFn: async (minuteId: string) =>
      api.delete(`/hr/meetings/${meetingId}/minutes/${minuteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-detail", meetingId] });
      toast.success("Minute deleted.");
    },
  });

  function openAddAttendee() {
    setEditAtt(null);
    setAttEmpId("");
    setAttRsvp("pending");
    setAttAttendance("not_attended");
    setAttDeclineReason("");
    setAttModalOpen(true);
  }

  function openEditAttendee(att: AttendeeItem) {
    setEditAtt(att);
    setAttEmpId(att.employeeId);
    setAttRsvp(att.rsvpStatus || "pending");
    setAttAttendance(att.attendanceStatus || "not_attended");
    setAttDeclineReason(att.declineReason || "");
    setAttModalOpen(true);
  }

  function openAddMinute() {
    setEditMin(null);
    setMinTopic("");
    setMinType("discussion");
    setMinContent("");
    setMinRecorderId("");
    setMinDate(new Date().toISOString().split("T")[0]);
    setMinTime("10:00");
    setMinModalOpen(true);
  }

  function openEditMinute(min: MinuteItem) {
    setEditMin(min);
    setMinTopic(min.topic || "");
    setMinType(min.type || "discussion");
    setMinContent(min.content || "");
    setMinRecorderId(min.recordedById || "");
    setMinDate(min.recordedAt || "");
    setMinTime(min.recordedTime || "10:00");
    setMinModalOpen(true);
  }

  const filteredAttendees = useMemo(() => {
    const list = meeting?.attendees || [];
    const q = attSearch.trim().toLowerCase();
    return list.filter((a) => {
      if (attRsvpFilter !== "all" && a.rsvpStatus !== attRsvpFilter) return false;
      if (attStatusFilter !== "all" && a.attendanceStatus !== attStatusFilter) return false;
      if (q) {
        const hay = `${a.employee?.name || ""} ${a.employee?.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [meeting?.attendees, attSearch, attRsvpFilter, attStatusFilter]);

  const recorders = useMemo(() => {
    const set = new Set<string>();
    for (const m of meeting?.minutes || []) {
      if (m.recordedByName) set.add(m.recordedByName);
    }
    return Array.from(set);
  }, [meeting?.minutes]);

  const filteredMinutes = useMemo(() => {
    const list = meeting?.minutes || [];
    const q = minSearch.trim().toLowerCase();
    return list.filter((m) => {
      if (minTypeFilter !== "all" && m.type !== minTypeFilter) return false;
      if (minRecorderFilter !== "all" && m.recordedByName !== minRecorderFilter) return false;
      if (q) {
        const hay = `${m.topic} ${m.content} ${m.recordedByName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [meeting?.minutes, minSearch, minTypeFilter, minRecorderFilter]);

  if (isLoading || !meeting) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-sm text-muted-foreground">
        Loading meeting details...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={meeting.title}
        description="View meeting details"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/hr/meetings")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Top Overview Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">{meeting.title}</h2>
            {meeting.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{meeting.description}</p>
            )}
          </div>
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold capitalize">
            {meeting.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground mb-1">Date</div>
            <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {meeting.meetingDate}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Time</div>
            <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {meeting.startTimeStr} - {meeting.endTimeStr} ({meeting.durationMinutes}m)
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Room</div>
            <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {meeting.room?.name || "Unassigned"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Type</div>
            <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {meeting.type?.name || "General"}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Organizer</div>
            <div className="flex items-center gap-2">
              <UserAvatar
                name={meeting.organizer?.name || "HR Organizer"}
                avatarUrl={meeting.organizer?.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">
                  {meeting.organizer?.name || "HR Organizer"}
                </div>
                {meeting.organizer?.email && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {meeting.organizer.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Recurrence</div>
            <span className="inline-flex items-center rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2 py-0.5 text-[11px] font-medium capitalize">
              {meeting.recurrence || "None"}
            </span>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Attendees</div>
            <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {meeting.attendeesCount}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Minutes</div>
            <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {meeting.minutesCount}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border/60 text-xs">
          <div className="text-muted-foreground mb-1">Agenda</div>
          <div className="text-foreground whitespace-pre-wrap">
            {meeting.agenda || "No agenda specified."}
          </div>
        </div>
      </div>

      {/* Tabs + Table Section */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("attendees")}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "attendees"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Attendees ({meeting.attendeesCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("minutes")}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "minutes"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Minutes ({meeting.minutesCount})
            </button>
          </div>

          {activeTab === "attendees" ? (
            <Button
              size="sm"
              onClick={openAddAttendee}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Attendee
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={openAddMinute}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Minute
            </Button>
          )}
        </div>

        {activeTab === "attendees" ? (
          <>
            <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border/60">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={attSearch}
                  onChange={(e) => setAttSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 h-9"
                />
              </div>

              <Select value={attRsvpFilter} onValueChange={setAttRsvpFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="All RSVP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All RSVP</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="tentative">Tentative</SelectItem>
                </SelectContent>
              </Select>

              <Select value={attStatusFilter} onValueChange={setAttStatusFilter}>
                <SelectTrigger className="w-[165px] h-9">
                  <SelectValue placeholder="All Attendance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Attendance</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="not_attended">Not Attended</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAttSearch("");
                  setAttRsvpFilter("all");
                  setAttStatusFilter("all");
                }}
                className="ml-auto h-9 gap-1.5"
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 w-12">
                      #
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Attendee
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      RSVP
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Attendance
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      RSVP Date
                    </th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No attendees added yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((att, idx) => {
                      const empName = att.employee?.name || "Employee";
                      return (
                        <tr key={att.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3 text-muted-foreground font-medium">{idx + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                name={empName}
                                avatarUrl={att.employee?.avatarUrl}
                              />
                              <div>
                                <div className="font-semibold text-foreground text-xs">
                                  {empName}
                                </div>
                                {att.employee?.email && (
                                  <div className="text-[11px] text-muted-foreground">
                                    {att.employee.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <RsvpBadge status={att.rsvpStatus} />
                          </td>
                          <td className="p-3">
                            <AttendanceBadge status={att.attendanceStatus} />
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {att.respondedAt || "-"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="View"
                                onClick={() => setViewAtt(att)}
                                className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => openEditAttendee(att)}
                                className="h-7 w-7 rounded-md hover:bg-amber-500/10 flex items-center justify-center text-amber-600"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Mark Accepted"
                                onClick={() =>
                                  saveAttendeeMutation.mutate({
                                    attendeeId: att.id,
                                    employeeId: att.employeeId,
                                    rsvpStatus: "accepted",
                                    attendanceStatus: att.attendanceStatus,
                                  })
                                }
                                className="h-7 w-7 rounded-md hover:bg-blue-500/10 flex items-center justify-center text-blue-600"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Mark Present"
                                onClick={() =>
                                  saveAttendeeMutation.mutate({
                                    attendeeId: att.id,
                                    employeeId: att.employeeId,
                                    rsvpStatus: att.rsvpStatus,
                                    attendanceStatus: "present",
                                  })
                                }
                                className="h-7 w-7 rounded-md hover:bg-emerald-500/10 flex items-center justify-center text-emerald-600"
                              >
                                <UserCheck className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Remove"
                                onClick={() => deleteAttendeeMutation.mutate(att.id)}
                                className="h-7 w-7 rounded-md hover:bg-rose-500/10 flex items-center justify-center text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
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
          </>
        ) : (
          <>
            <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border/60">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={minSearch}
                  onChange={(e) => setMinSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 h-9"
                />
              </div>

              <Select value={minTypeFilter} onValueChange={setMinTypeFilter}>
                <SelectTrigger className="w-[155px] h-9">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                  <SelectItem value="action_item">Action Item</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>

              <Select value={minRecorderFilter} onValueChange={setMinRecorderFilter}>
                <SelectTrigger className="w-[170px] h-9">
                  <SelectValue placeholder="All Recorders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recorders</SelectItem>
                  {recorders.map((rec) => (
                    <SelectItem key={rec} value={rec}>
                      {rec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMinSearch("");
                  setMinTypeFilter("all");
                  setMinRecorderFilter("all");
                }}
                className="ml-auto h-9 gap-1.5"
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 w-12">
                      #
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      <span className="inline-flex items-center gap-1">
                        Topic <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Type
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Recorded By
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Recorded At
                    </th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMinutes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No meeting minutes recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredMinutes.map((min, idx) => (
                      <tr key={min.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 text-muted-foreground font-medium">{idx + 1}</td>
                        <td className="p-3 font-semibold text-foreground">{min.topic}</td>
                        <td className="p-3">
                          <MinuteTypeBadge type={min.type} />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={min.recordedByName}
                              avatarUrl={min.recordedByAvatar}
                            />
                            <div>
                              <div className="font-semibold text-foreground text-xs">
                                {min.recordedByName}
                              </div>
                              {min.recordedByEmail && (
                                <div className="text-[11px] text-muted-foreground">
                                  {min.recordedByEmail}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {min.recordedAt || "-"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="View Minute"
                              onClick={() => setViewMin(min)}
                              className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Edit Minute"
                              onClick={() => openEditMinute(min)}
                              className="h-7 w-7 rounded-md hover:bg-amber-500/10 flex items-center justify-center text-amber-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete Minute"
                              onClick={() => deleteMinuteMutation.mutate(min.id)}
                              className="h-7 w-7 rounded-md hover:bg-rose-500/10 flex items-center justify-center text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Attendee Modal */}
      <Dialog open={attModalOpen} onOpenChange={setAttModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editAtt ? "Edit Attendee" : "Add Attendee"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!attEmpId) {
                toast.error("Please select an employee.");
                return;
              }
              saveAttendeeMutation.mutate({
                attendeeId: editAtt?.id,
                employeeId: attEmpId,
                rsvpStatus: attRsvp,
                attendanceStatus: attAttendance,
                declineReason: attDeclineReason.trim() || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-rose-500">*</span>
              </Label>
              <Select value={attEmpId} onValueChange={setAttEmpId} disabled={Boolean(editAtt)}>
                <SelectTrigger>
                  <SelectValue placeholder="Search and select employee" />
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
              <Label>RSVP Status</Label>
              <Select value={attRsvp} onValueChange={setAttRsvp}>
                <SelectTrigger>
                  <SelectValue placeholder="Select RSVP status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="tentative">Tentative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Attendance Status</Label>
              <Select value={attAttendance} onValueChange={setAttAttendance}>
                <SelectTrigger>
                  <SelectValue placeholder="Select attendance status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="not_attended">Not Attended</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Decline Reason</Label>
              <Textarea
                rows={3}
                value={attDeclineReason}
                onChange={(e) => setAttDeclineReason(e.target.value)}
                placeholder="Reason for declining the meeting..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAttModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveAttendeeMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveAttendeeMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Attendee Modal */}
      <Dialog open={Boolean(viewAtt)} onOpenChange={(o) => !o && setViewAtt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attendee Details</DialogTitle>
          </DialogHeader>
          {viewAtt && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Employee</div>
                <div className="font-semibold">{viewAtt.employee?.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">RSVP</div>
                  <RsvpBadge status={viewAtt.rsvpStatus} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Attendance</div>
                  <AttendanceBadge status={viewAtt.attendanceStatus} />
                </div>
              </div>
              {viewAtt.declineReason && (
                <div>
                  <div className="text-xs text-muted-foreground">Decline Reason</div>
                  <div className="text-foreground">{viewAtt.declineReason}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Minute Modal */}
      <Dialog open={minModalOpen} onOpenChange={setMinModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMin ? "Edit Minute" : "Add Minute"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!minTopic.trim() || !minContent.trim() || !minRecorderId) {
                toast.error("Please fill all required fields.");
                return;
              }
              saveMinuteMutation.mutate({
                minuteId: editMin?.id,
                topic: minTopic.trim(),
                type: minType,
                content: minContent.trim(),
                recordedById: minRecorderId,
                recordedDate: minDate || undefined,
                recordedTime: minTime || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>
                Topic <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={minTopic}
                onChange={(e) => setMinTopic(e.target.value)}
                placeholder="e.g. Budget approval discussion"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Type <span className="text-rose-500">*</span>
              </Label>
              <Select value={minType} onValueChange={setMinType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select minute type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                  <SelectItem value="action_item">Action Item</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Content <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                rows={4}
                value={minContent}
                onChange={(e) => setMinContent(e.target.value)}
                placeholder="Describe the discussion, decision, or action item in detail..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Recorded By <span className="text-rose-500">*</span>
              </Label>
              <Select value={minRecorderId} onValueChange={setMinRecorderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Search and select recorder" />
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
              <Label>Recorded Date</Label>
              <Input
                type="date"
                value={minDate}
                onChange={(e) => setMinDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Recorded Time</Label>
              <Input
                type="time"
                value={minTime}
                onChange={(e) => setMinTime(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMinModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMinuteMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveMinuteMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Meeting Minute Details Modal */}
      <Dialog open={Boolean(viewMin)} onOpenChange={(o) => !o && setViewMin(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <DialogTitle>Meeting Minute Details</DialogTitle>
            </div>
          </DialogHeader>
          {viewMin && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    Topic
                  </div>
                  <div className="font-bold text-foreground">{viewMin.topic}</div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    Type
                  </div>
                  <div>
                    <MinuteTypeBadge type={viewMin.type} />
                  </div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Meeting
                  </div>
                  <div className="font-bold text-foreground">{meeting.title}</div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <User className="h-3.5 w-3.5" />
                    Recorded By
                  </div>
                  <div className="font-bold text-foreground">{viewMin.recordedByName}</div>
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  Recorded At
                </div>
                <div className="font-bold text-foreground">{viewMin.recordedAt}</div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <FileText className="h-3.5 w-3.5" />
                  Content
                </div>
                <p className="font-medium text-foreground whitespace-pre-wrap">
                  {viewMin.content}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
