"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  BookOpen,
  Check,
  ChevronDown,
  Trash2,
  Download,
  Share2,
  Edit2,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  Video,
  Palmtree,
  CheckCircle2,
  Bell,
  Mail,
  User,
  Palette,
  X,
  CalendarCheck,
  Cake,
  AlertCircle,
  ExternalLink,
  Globe,
  Ban,
  Repeat,
  Building2,
  History,
  Filter,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { OrganizationMemberSelector, SelectedShare } from "./organization-member-selector";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import { cn } from "@/lib/utils";

export interface CalendarShare {
  id?: string;
  recipientId: string;
  permission: "view" | "edit";
  rsvpStatus?: "pending" | "accepted" | "declined" | "tentative";
  sharedBy?: string;
  createdAt?: string;
  respondedAt?: string | null;
}

export interface CalendarReminderItem {
  id: string;
  minutesBefore: number;
  channel: "email" | "in_app" | "both";
  status?: string;
  dispatchedAt?: string;
  customScheduledAt?: string | null;
  customLabel?: string | null;
}

export const REMINDER_PRESET_OPTIONS = [
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "120", label: "2 hours before" },
  { value: "300", label: "5 hours before" },
  { value: "1440", label: "1 day before" },
  { value: "custom", label: "Custom date and time" },
];

export function formatReminderLabel(rem: CalendarReminderItem): string {
  if (rem.customScheduledAt) {
    try {
      const d = new Date(rem.customScheduledAt);
      if (!isNaN(d.getTime())) {
        return `Custom: ${format(d, "MMM d, yyyy h:mm a")}`;
      }
    } catch {}
  }
  switch (rem.minutesBefore) {
    case 0:
      return "At event time";
    case 5:
      return "5 minutes before";
    case 15:
      return "15 minutes before";
    case 30:
      return "30 minutes before";
    case 60:
      return "1 hour before";
    case 120:
      return "2 hours before";
    case 300:
      return "5 hours before";
    case 1440:
      return "1 day before";
    case 390:
      return "390 minutes before (6.5 hours)";
    default:
      return `${rem.minutesBefore} minutes before`;
  }
}

export function cleanCalendarText(text?: string | null): string {
  if (!text) return "";
  return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "").trim();
}

export function createDefaultReminder(existing: CalendarReminderItem[] = []): CalendarReminderItem {
  const existingOffsets = new Set(existing.filter((r) => !r.customScheduledAt).map((r) => r.minutesBefore));
  const preferred = [15, 30, 60, 120, 5, 300, 1440];
  const nextOffset = preferred.find((p) => !existingOffsets.has(p)) ?? 15;
  return {
    id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    minutesBefore: nextOffset,
    channel: "both",
    customScheduledAt: null,
  };
}

export function buildRRuleString(
  freq: string,
  endType: string,
  untilDate?: string,
  count?: number,
  weekdays?: string[]
): string | null {
  if (!freq || freq === "none") return null;
  const parts = [`FREQ=${freq}`];
  if (freq === "WEEKLY" && weekdays && weekdays.length > 0) {
    parts.push(`BYDAY=${weekdays.join(",")}`);
  }
  if (endType === "until" && untilDate) {
    const d = new Date(untilDate);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      parts.push(`UNTIL=${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T235959Z`);
    }
  } else if (endType === "count" && count && count > 0) {
    parts.push(`COUNT=${count}`);
  }
  return parts.join(";");
}

export function getInitialNewEvent(currentDate?: Date) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const safeDate = currentDate && !isNaN(currentDate.getTime()) ? currentDate : new Date();
  const selectedStr = format(safeDate, "yyyy-MM-dd");
  const dateStr = selectedStr < todayStr ? todayStr : selectedStr;
  return {
    title: "",
    date: dateStr,
    startTime: "10:00",
    endTime: "11:00",
    allDay: false,
    category: "Meetings",
    location: "",
    meetingLink: "",
    roomId: "",
    description: "",
    visibility: "team" as "private" | "team" | "organization",
    timezone: "Asia/Kolkata",
    recurrenceFreq: "none" as "none" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    recurrenceEndType: "never" as "never" | "until" | "count",
    recurrenceUntil: "",
    recurrenceCount: 10,
    recurrenceWeekdays: [] as string[],
    shares: [] as { userId: string; permission: "view" | "edit" }[],
    reminders: [
      {
        id: "rem-1",
        minutesBefore: 15,
        channel: "both" as "email" | "in_app" | "both",
        customScheduledAt: null,
      },
    ] as CalendarReminderItem[],
  };
}

export interface CalendarCategory {
  id: string;
  name: string;
  color: string;
  isSystem?: boolean;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  startDate: string; // ISO string
  endDate?: string; // ISO string
  category: string;
  color?: string;
  location?: string;
  meetingLink?: string | null;
  status?: "confirmed" | "tentative" | "cancelled" | string;
  visibility?: "private" | "team" | "organization" | string;
  timezone?: string;
  cancelledAt?: string | null;
  cancelledById?: string | null;
  userRsvp?: "pending" | "accepted" | "declined" | "tentative";
  allDay?: boolean;
  userId?: string;
  tenantId?: string;
  isShared?: boolean;
  userPermission?: "owner" | "edit" | "view";
  shares?: CalendarShare[];
  reminders?: CalendarReminderItem[];
  sourceDomain?: string;
  sourceId?: string;
  linkTo?: string;
  avatarUrl?: string;
  employeeName?: string;
  employeeInitials?: string;
  roomId?: string | null;
  room?: { id: string; name: string; location?: string } | null;
  recurrenceRule?: string | null;
  recurringSeriesId?: string | null;
  originalStartTime?: string | null;
  isRecurringInstance?: boolean;
  priority?: string;
  progress?: number;
  completed?: boolean;
  isExternal?: boolean;
}

interface UnifiedCalendarAppProps {
  mode?: "hr" | "apps" | "canonical";
  title?: string;
}

const DEFAULT_CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  Meetings: { bg: "bg-teal-600 text-white", text: "text-teal-700", dot: "bg-teal-600", label: "Meetings" },
  meeting: { bg: "bg-teal-600 text-white", text: "text-teal-700", dot: "bg-teal-600", label: "Meetings" },
  Flights: { bg: "bg-blue-500 text-white", text: "text-blue-600", dot: "bg-blue-500", label: "Flights" },
  Birthday: { bg: "bg-rose-500 text-white", text: "text-rose-700", dot: "bg-rose-500", label: "Birthdays" },
  birthday: { bg: "bg-rose-500 text-white", text: "text-rose-700", dot: "bg-rose-500", label: "Birthdays" },
  anniversary: { bg: "bg-teal-600 text-white", text: "text-teal-700", dot: "bg-teal-600", label: "Work Anniversaries" },
  interview: { bg: "bg-cyan-600 text-white", text: "text-cyan-700", dot: "bg-cyan-600", label: "Interviews" },
  onboarding: { bg: "bg-fuchsia-600 text-white", text: "text-fuchsia-700", dot: "bg-fuchsia-600", label: "Onboarding" },
  Conference: { bg: "bg-amber-500 text-white", text: "text-amber-600", dot: "bg-amber-500", label: "Conference" },
  leave: { bg: "bg-amber-600 text-white", text: "text-amber-700", dot: "bg-amber-600", label: "Leave & PTO" },
  holiday: { bg: "bg-emerald-600 text-white", text: "text-emerald-700", dot: "bg-emerald-600", label: "Official Holiday" },
  training: { bg: "bg-purple-600 text-white", text: "text-purple-700", dot: "bg-purple-600", label: "Training & Cohorts" },
  organization: { bg: "bg-indigo-600 text-white", text: "text-indigo-700", dot: "bg-indigo-600", label: "Company Event" },
  team: { bg: "bg-sky-600 text-white", text: "text-sky-700", dot: "bg-sky-600", label: "Team Event" },
  general: { bg: "bg-teal-600 text-white", text: "text-teal-700", dot: "bg-teal-600", label: "General" },
  todo: { bg: "bg-sky-600 text-white", text: "text-sky-700", dot: "bg-sky-600", label: "Todo & Tasks" },
  "Todo & Tasks": { bg: "bg-sky-600 text-white", text: "text-sky-700", dot: "bg-sky-600", label: "Todo & Tasks" },
};

const COLOR_SWATCHES = [
  { name: "Teal", value: "bg-teal-600 text-white", dot: "bg-teal-600" },
  { name: "Indigo", value: "bg-indigo-600 text-white", dot: "bg-indigo-600" },
  { name: "Purple", value: "bg-purple-600 text-white", dot: "bg-purple-600" },
  { name: "Rose", value: "bg-rose-600 text-white", dot: "bg-rose-600" },
  { name: "Blue", value: "bg-blue-600 text-white", dot: "bg-blue-600" },
  { name: "Emerald", value: "bg-emerald-600 text-white", dot: "bg-emerald-600" },
  { name: "Amber", value: "bg-amber-600 text-white", dot: "bg-amber-600" },
  { name: "Sky", value: "bg-sky-600 text-white", dot: "bg-sky-600" },
];

export function ReminderSectionEditor({
  reminders,
  onChange,
  eventDate,
  eventStartTime,
}: {
  reminders: CalendarReminderItem[];
  onChange: (reminders: CalendarReminderItem[]) => void;
  eventDate: string;
  eventStartTime: string;
}) {
  const handleAdd = () => {
    onChange([...reminders, createDefaultReminder(reminders)]);
  };

  const handleRemove = (index: number) => {
    onChange(reminders.filter((_, i) => i !== index));
  };

  const handlePresetChange = (index: number, val: string) => {
    const updated = [...reminders];
    if (val === "custom") {
      let targetDateStr = eventDate || format(new Date(), "yyyy-MM-dd");
      let targetTimeStr = eventStartTime || "10:00";
      let startMs = new Date(`${targetDateStr}T${targetTimeStr}:00`).getTime();
      if (isNaN(startMs)) startMs = Date.now() + 60 * 60000;
      const defaultCustom = new Date(Math.max(Date.now() + 5 * 60000, startMs - 15 * 60000));
      const diffMinutes = Math.max(0, Math.round((startMs - defaultCustom.getTime()) / 60000));
      updated[index] = {
        ...updated[index],
        customScheduledAt: defaultCustom.toISOString(),
        minutesBefore: diffMinutes,
      };
    } else {
      const minutes = parseInt(val, 10);
      updated[index] = {
        ...updated[index],
        minutesBefore: isNaN(minutes) ? 15 : minutes,
        customScheduledAt: null,
      };
    }
    onChange(updated);
  };

  const handleCustomDateTimeChange = (index: number, newDate: string, newTime: string) => {
    const updated = [...reminders];
    const combined = new Date(`${newDate}T${newTime}:00`);
    if (!isNaN(combined.getTime())) {
      const startMs = new Date(`${eventDate}T${eventStartTime || "10:00"}:00`).getTime();
      const diffMinutes = Math.max(0, Math.round((startMs - combined.getTime()) / 60000));
      updated[index] = {
        ...updated[index],
        customScheduledAt: combined.toISOString(),
        minutesBefore: diffMinutes,
      };
      onChange(updated);
    }
  };

  const handleChannelChange = (index: number, val: "email" | "in_app" | "both") => {
    const updated = [...reminders];
    updated[index] = {
      ...updated[index],
      channel: val,
    };
    onChange(updated);
  };

  return (
    <div className="border-t pt-2 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Bell className="size-3.5 text-teal-600" /> Reminders & Notifications
        </Label>
        <button
          type="button"
          onClick={handleAdd}
          className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="size-3" /> Add Reminder
        </button>
      </div>

      {reminders.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No reminders configured. Event will be saved without reminders.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((rem, idx) => {
            const isCustom = Boolean(rem.customScheduledAt);
            const selectValue = isCustom ? "custom" : String(rem.minutesBefore);

            let customDateVal = eventDate || format(new Date(), "yyyy-MM-dd");
            let customTimeVal = "09:45";
            if (rem.customScheduledAt) {
              try {
                const parsed = new Date(rem.customScheduledAt);
                if (!isNaN(parsed.getTime())) {
                  customDateVal = format(parsed, "yyyy-MM-dd");
                  customTimeVal = format(parsed, "HH:mm");
                }
              } catch {}
            }

            let validationWarning: string | null = null;
            if (isCustom && rem.customScheduledAt) {
              const customMs = new Date(rem.customScheduledAt).getTime();
              const startMs = new Date(`${eventDate}T${eventStartTime || "10:00"}:00`).getTime();
              if (customMs < Date.now() - 60000) {
                validationWarning = "Reminder is in the past and cannot be dispatched.";
              } else if (customMs > startMs) {
                validationWarning = "Reminder cannot be scheduled after event starts.";
              }
            }

            return (
              <div
                key={rem.id || idx}
                className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={selectValue}
                      onValueChange={(val) => handlePresetChange(idx, val)}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_PRESET_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                        {rem.minutesBefore === 390 && !isCustom && (
                          <SelectItem value="390">390 minutes before (6.5 hours)</SelectItem>
                        )}
                        {rem.minutesBefore === 0 && !isCustom && (
                          <SelectItem value="0">At event time</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-34">
                    <Select
                      value={rem.channel}
                      onValueChange={(val: any) => handleChannelChange(idx, val)}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Email & In-App</SelectItem>
                        <SelectItem value="email">Email only</SelectItem>
                        <SelectItem value="in_app">In-App only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer"
                    title="Remove reminder"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Custom Date & Time Inputs */}
                {isCustom && (
                  <div className="pt-1.5 space-y-1.5 border-t border-border/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Reminder Date</Label>
                        <Input
                          type="date"
                          min={format(new Date(), "yyyy-MM-dd")}
                          max={eventDate || undefined}
                          value={customDateVal}
                          onChange={(e) => handleCustomDateTimeChange(idx, e.target.value, customTimeVal)}
                          className="text-xs h-7 mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Reminder Time</Label>
                        <Input
                          type="time"
                          value={customTimeVal}
                          onChange={(e) => handleCustomDateTimeChange(idx, customDateVal, e.target.value)}
                          className="text-xs h-7 mt-0.5"
                        />
                      </div>
                    </div>
                    {validationWarning && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>{validationWarning}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UnifiedCalendarApp({ mode = "hr", title = "Calendar" }: UnifiedCalendarAppProps) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const profile = useCurrentProfile();

  // Authoritative today date string in application timezone
  const todayDateStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // Active viewing date (default to current date)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  // Mini calendar browsing date
  const [miniCalendarDate, setMiniCalendarDate] = useState<Date>(() => new Date());
  // View mode
  const [viewMode, setViewMode] = useState<"Month" | "Week" | "Day" | "List">("Month");

  // Active Category Filters
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({
    Meetings: true,
    Birthday: true,
    anniversary: true,
    interview: true,
    onboarding: true,
    leave: true,
    holiday: true,
    training: true,
    organization: true,
    team: true,
    general: true,
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Conflict modal state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<"create" | "update" | null>(null);

  // Recurrence scope modal state
  const [recurrenceScopeModalOpen, setRecurrenceScopeModalOpen] = useState(false);
  const [recurrenceActionType, setRecurrenceActionType] = useState<"edit" | "cancel">("edit");
  const [selectedRecurrenceScope, setSelectedRecurrenceScope] = useState<"this_occurrence" | "all_occurrences">("this_occurrence");

  // Audit trail modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);

  // New Category Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_SWATCHES[1].value);

  // New Event Form State
  const [newEvent, setNewEvent] = useState(() => getInitialNewEvent(new Date()));

  // Edit Event Form State
  const [editForm, setEditForm] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    allDay: false,
    category: "Meetings",
    location: "",
    meetingLink: "",
    roomId: "",
    visibility: "team" as "private" | "team" | "organization",
    timezone: "Asia/Kolkata",
    recurrenceFreq: "none" as "none" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    recurrenceEndType: "never" as "never" | "until" | "count",
    recurrenceUntil: "",
    recurrenceCount: 10,
    recurrenceWeekdays: [] as string[],
    description: "",
    reminders: [] as CalendarReminderItem[],
  });

  // Share Input State for Details Modal
  const [shareInput, setShareInput] = useState({
    recipientId: "",
    permission: "view" as "view" | "edit",
  });

  // Synchronize mini calendar with main calendar on date jump
  useEffect(() => {
    setMiniCalendarDate(currentDate);
  }, [currentDate]);

  // 0a. Fetch Categories from database API
  const { data: dbCategories = [] } = useQuery<CalendarCategory[]>({
    queryKey: ["calendar-categories"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/calendar/categories");
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.categories) ? res.categories : Array.isArray(res) ? res : [];
        return list;
      } catch {
        return [];
      }
    },
  });

  // 0b. Fetch Active Meeting Rooms from database API
  const { data: dbRooms = [] } = useQuery<any[]>({
    queryKey: ["calendar-rooms"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/calendar/rooms");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  // Dynamic Category Styles Map
  const categoryStyles = useMemo(() => {
    const map = { ...DEFAULT_CATEGORY_STYLES };
    for (const cat of dbCategories) {
      if (!map[cat.name]) {
        map[cat.name] = {
          bg: cat.color,
          text: "text-foreground",
          dot: cat.color.split(" ")[0] || "bg-teal-600",
          label: cat.name,
        };
      }
    }
    return map;
  }, [dbCategories]);

  // 1. Fetch Primary Database Calendar Events with start/end date window filtering
  const queryWindowStart = useMemo(() => startOfMonth(subMonths(currentDate, 1)).toISOString(), [currentDate]);
  const queryWindowEnd = useMemo(() => endOfMonth(addMonths(currentDate, 1)).toISOString(), [currentDate]);

  const { data: primaryEvents = [], isLoading: isLoadingPrimary } = useQuery<CalendarEventItem[]>({
    queryKey: ["calendar-events", format(currentDate, "yyyy-MM")],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/calendar/events?startDate=${encodeURIComponent(queryWindowStart)}&endDate=${encodeURIComponent(queryWindowEnd)}`);
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return list.map((e: any) => {
          const cat = e.category || "Meetings";
          const style = categoryStyles[cat] || DEFAULT_CATEGORY_STYLES.Meetings;
          return {
            id: e.id,
            title: e.title,
            description: e.description || "",
            startDate: e.startDate ? new Date(e.startDate).toISOString() : new Date().toISOString(),
            endDate: e.endDate ? new Date(e.endDate).toISOString() : undefined,
            allDay: Boolean(e.allDay),
            category: cat,
            color: style.bg,
            location: e.location || "",
            meetingLink: e.meetingLink || null,
            status: e.status || "confirmed",
            visibility: e.visibility || "team",
            timezone: e.timezone || "Asia/Kolkata",
            cancelledAt: e.cancelledAt || null,
            cancelledById: e.cancelledById || null,
            userRsvp: e.userRsvp || "pending",
            userId: e.userId,
            tenantId: e.tenantId,
            isShared: Boolean(e.isShared),
            userPermission: e.userPermission || (e.userId === user?.id ? "owner" : "view"),
            shares: Array.isArray(e.shares) ? e.shares : [],
            reminders: Array.isArray(e.reminders) ? e.reminders : [],
            roomId: e.roomId || null,
            room: e.room || null,
            recurrenceRule: e.recurrenceRule || null,
            recurringSeriesId: e.recurringSeriesId || null,
            originalStartTime: e.originalStartTime || null,
            isRecurringInstance: Boolean(e.isRecurringInstance),
            sourceDomain: e.sourceDomain || "calendar",
            sourceId: e.sourceId || e.id,
            linkTo: e.linkTo,
            priority: e.priority,
            progress: e.progress,
            completed: e.completed,
            employeeName: e.employeeName,
          } as CalendarEventItem;
        });
      } catch (err) {
        console.error("Failed to load calendar events:", err);
        return [];
      }
    },
  });

  // 2. Fetch HR/Employee Composite Projections (Approved Leaves, Official Holidays, Training Cohorts, Meetings, Birthdays, Tasks)
  const { data: hrCompositeEvents = [] } = useQuery<CalendarEventItem[]>({
    queryKey: ["hr-calendar-composite-events", format(currentDate, "yyyy-MM")],
    queryFn: async () => {
      try {
        const isEmployeePath = typeof window !== "undefined" && window.location.pathname.startsWith("/me");
        const compositeUrl = isEmployeePath ? "/me/calendar/events" : "/hr/calendar/events";
        const res = await api.get<any[]>(`${compositeUrl}?startDate=${encodeURIComponent(queryWindowStart)}&endDate=${encodeURIComponent(queryWindowEnd)}`);
        if (!Array.isArray(res)) return [];
        return res
          .filter((item) => item.sourceDomain !== "calendar") // Avoid double counting custom calendar events
          .map((item) => {
            const cat = item.category || "general";
            const style = categoryStyles[cat] || DEFAULT_CATEGORY_STYLES[cat] || DEFAULT_CATEGORY_STYLES.general;
            return {
              id: item.id,
              title: item.title,
              description: item.description || "",
              startDate: item.startDate,
              endDate: item.endDate,
              allDay: Boolean(item.allDay),
              category: cat,
              color: style.bg,
              location: item.location || "",
              sourceDomain: item.sourceDomain,
              sourceId: item.sourceId,
              linkTo: item.linkTo,
              status: item.status,
              userPermission: "view",
              avatarUrl: item.avatarUrl,
              employeeName: item.employeeName,
              employeeInitials: item.employeeInitials,
              priority: item.priority,
              progress: item.progress,
              completed: item.completed,
            } as CalendarEventItem;
          });
      } catch {
        return [];
      }
    },
  });

  // Combine and deduplicate real database events
  const allEvents = useMemo(() => {
    const map = new Map<string, CalendarEventItem>();
    for (const ev of primaryEvents) {
      map.set(ev.id, ev);
    }
    for (const ev of hrCompositeEvents) {
      if (!map.has(ev.id)) {
        map.set(ev.id, ev);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [primaryEvents, hrCompositeEvents]);

  // Filtered Events based on active category checkboxes, search, status, and source
  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      const cat = (e.category || "general").toLowerCase();
      if (cat === "birthday") {
        if (activeCategories.Birthday === false || activeCategories.birthday === false) return false;
      } else if (cat === "meeting" || cat === "meetings") {
        if (activeCategories.Meetings === false || activeCategories.meeting === false) return false;
      } else if (activeCategories[e.category] === false) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && e.status !== statusFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== "all") {
        if (sourceFilter === "calendar" && e.sourceDomain && e.sourceDomain !== "calendar") return false;
        if (sourceFilter !== "calendar" && e.sourceDomain !== sourceFilter && cat !== sourceFilter) return false;
      }

      // Search query filter (title, description, location)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (e.title || "").toLowerCase().includes(q);
        const descMatch = (e.description || "").toLowerCase().includes(q);
        const locMatch = (e.location || "").toLowerCase().includes(q);
        const catMatch = (e.category || "").toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !locMatch && !catMatch) return false;
      }

      return true;
    });
  }, [allEvents, activeCategories, statusFilter, sourceFilter, searchQuery]);

  // Upcoming Events from today onwards (respects active category filters)
  const upcomingEvents = useMemo(() => {
    const now = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
    return filteredEvents
      .filter((e) => new Date(e.startDate).getTime() >= now - 86400000)
      .slice(0, 6);
  }, [filteredEvents, currentDate]);

  // Month Grid Calculation for Main Calendar
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  // Mini Calendar Days
  const miniCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(miniCalendarDate);
    const monthEnd = endOfMonth(miniCalendarDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [miniCalendarDate]);

  // Week View Days Calculation
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const evt of allEvents) {
      const cat = evt.category || "general";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [allEvents]);

  // Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      return await api.post("/api/calendar/categories", { name, color });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-categories"] });
      toast.success(`Category "${newCatName}" created!`);
      setActiveCategories((prev) => ({ ...prev, [newCatName]: true }));
      setNewEvent((prev) => ({ ...prev, category: newCatName }));
      setNewCatName("");
      setNewCategoryModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create category");
    },
  });

  // Create Event Mutation
  const createEventMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/calendar/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Calendar event created successfully!");
      setCreateModalOpen(false);
      setConflictModalOpen(false);
      setPendingPayload(null);
      setPendingAction(null);
      setNewEvent(getInitialNewEvent(currentDate));
    },
    onError: (err: any, vars: any) => {
      const conflicts = err?.response?.data?.conflicts || err?.conflicts || err?.data?.conflicts;
      if (err?.response?.status === 409 || err?.status === 409 || conflicts) {
        setConflictData(conflicts);
        setPendingPayload(vars);
        setPendingAction("create");
        setConflictModalOpen(true);
        return;
      }
      toast.error(err?.message || "Failed to create event");
    },
  });

  // Update Event Mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/api/calendar/events/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Calendar event updated successfully!");
      setIsEditingEvent(false);
      setDetailsModalOpen(false);
      setConflictModalOpen(false);
      setRecurrenceScopeModalOpen(false);
      setPendingPayload(null);
      setPendingAction(null);
      setSelectedEvent(null);
    },
    onError: (err: any, vars: any) => {
      const conflicts = err?.response?.data?.conflicts || err?.conflicts || err?.data?.conflicts;
      if (err?.response?.status === 409 || err?.status === 409 || conflicts) {
        setConflictData(conflicts);
        setPendingPayload(vars?.payload || vars);
        setPendingAction("update");
        setConflictModalOpen(true);
        return;
      }
      toast.error(err?.message || "Failed to update event");
    },
  });

  // Delete Event Mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Event deleted from calendar.");
      setDetailsModalOpen(false);
      setSelectedEvent(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete event. You must be the owner or administrator.");
    },
  });

  // Cancel Event Mutation
  const cancelEventMutation = useMutation({
    mutationFn: async ({ id, recurrenceScope }: { id: string; recurrenceScope?: "this_occurrence" | "all_occurrences" }) => {
      return await api.post(`/api/calendar/events/${id}/cancel`, { recurrenceScope });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Event cancelled successfully.");
      setDetailsModalOpen(false);
      setRecurrenceScopeModalOpen(false);
      setSelectedEvent(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to cancel event");
    },
  });

  // Attendee RSVP Mutation (Phase D)
  const rsvpEventMutation = useMutation({
    mutationFn: async ({ id, rsvpStatus }: { id: string; rsvpStatus: "pending" | "accepted" | "declined" | "tentative" }) => {
      return await api.post(`/api/calendar/events/${id}/rsvp`, { rsvpStatus });
    },
    onSuccess: (_res: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success(`RSVP updated to ${vars.rsvpStatus}!`);
      if (selectedEvent) {
        setSelectedEvent({
          ...selectedEvent,
          userRsvp: vars.rsvpStatus,
        });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update RSVP");
    },
  });

  // Share Event Mutation
  const shareEventMutation = useMutation({
    mutationFn: async ({ id, recipientId, permission }: { id: string; recipientId: string; permission: "view" | "edit" }) => {
      return await api.post(`/api/calendar/events/${id}/share`, { recipientId, permission });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event shared successfully!");
      setShareInput({ recipientId: "", permission: "view" });
      if (res?.shares && selectedEvent) {
        setSelectedEvent({ ...selectedEvent, shares: res.shares });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to share event");
    },
  });

  // Revoke Share Mutation
  const revokeShareMutation = useMutation({
    mutationFn: async ({ id, recipientId }: { id: string; recipientId: string }) => {
      return await api.delete(`/api/calendar/events/${id}/share/${recipientId}`);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Share revoked.");
      if (res?.shares && selectedEvent) {
        setSelectedEvent({ ...selectedEvent, shares: res.shares });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to revoke share");
    },
  });

  // Handle Event Creation
  const handleCreateSubmit = () => {
    if (!newEvent.title.trim()) {
      toast.error("Please enter an event title");
      return;
    }

    if (newEvent.date < todayDateStr) {
      toast.error("Event date cannot be scheduled before today. Please select today or a future date.");
      return;
    }

    if (!newEvent.allDay && newEvent.endTime <= newEvent.startTime) {
      toast.error("End time must be later than start time.");
      return;
    }

    const startDateTime = newEvent.allDay
      ? `${newEvent.date}T00:00:00`
      : `${newEvent.date}T${newEvent.startTime || "10:00"}:00`;
    const endDateTime = newEvent.allDay
      ? `${newEvent.date}T23:59:59`
      : `${newEvent.date}T${newEvent.endTime || "11:00"}:00`;

    // Validate reminders
    const startMs = new Date(startDateTime).getTime();
    for (const rem of newEvent.reminders) {
      if (rem.customScheduledAt) {
        const customMs = new Date(rem.customScheduledAt).getTime();
        if (isNaN(customMs)) {
          toast.error("Please enter a valid custom reminder date and time.");
          return;
        }
        if (customMs < Date.now() - 60000) {
          toast.error("Custom reminder cannot be scheduled in the past.");
          return;
        }
        if (customMs > startMs) {
          toast.error("Custom reminder cannot be scheduled after the event start time.");
          return;
        }
      }
    }

    const sharedWith = newEvent.shares.length > 0
      ? newEvent.shares.map((s) => ({ recipientId: s.userId, permission: s.permission }))
      : undefined;

    const rrule = buildRRuleString(
      newEvent.recurrenceFreq,
      newEvent.recurrenceEndType,
      newEvent.recurrenceUntil,
      newEvent.recurrenceCount,
      newEvent.recurrenceWeekdays
    );

    createEventMutation.mutate({
      title: newEvent.title.trim(),
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: newEvent.allDay,
      category: newEvent.category,
      location: newEvent.location.trim() || undefined,
      meetingLink: newEvent.meetingLink.trim() || undefined,
      roomId: newEvent.roomId || undefined,
      recurrenceRule: rrule || undefined,
      description: newEvent.description.trim() || undefined,
      visibility: newEvent.visibility,
      timezone: newEvent.timezone,
      sharedWith,
      reminders: newEvent.reminders,
    });
  };

  // Open Details Modal
  const openEventDetails = (evt: CalendarEventItem) => {
    setSelectedEvent(evt);
    setIsEditingEvent(false);
    const startDate = new Date(evt.startDate);
    const endDate = evt.endDate ? new Date(evt.endDate) : startDate;
    setEditForm({
      title: evt.title,
      date: format(startDate, "yyyy-MM-dd"),
      startTime: format(startDate, "HH:mm"),
      endTime: format(endDate, "HH:mm"),
      allDay: Boolean(evt.allDay),
      category: evt.category,
      location: evt.location || "",
      meetingLink: evt.meetingLink || "",
      roomId: evt.roomId || "",
      visibility: (evt.visibility as any) || "team",
      timezone: evt.timezone || "Asia/Kolkata",
      recurrenceFreq: "none",
      recurrenceEndType: "never",
      recurrenceUntil: "",
      recurrenceCount: 10,
      recurrenceWeekdays: [],
      description: evt.description || "",
      reminders: Array.isArray(evt.reminders) ? [...evt.reminders] : [],
    });
    setDetailsModalOpen(true);
  };

  const executeEventUpdate = (scope?: "this_occurrence" | "all_occurrences", ignoreConflicts = false) => {
    if (!selectedEvent) return;
    const startDateTime = editForm.allDay
      ? `${editForm.date}T00:00:00`
      : `${editForm.date}T${editForm.startTime || "10:00"}:00`;
    const endDateTime = editForm.allDay
      ? `${editForm.date}T23:59:59`
      : `${editForm.date}T${editForm.endTime || "11:00"}:00`;

    updateEventMutation.mutate({
      id: selectedEvent.id,
      payload: {
        title: editForm.title.trim(),
        startDate: startDateTime,
        endDate: endDateTime,
        allDay: editForm.allDay,
        category: editForm.category,
        location: editForm.location.trim() || undefined,
        meetingLink: editForm.meetingLink.trim() || undefined,
        roomId: editForm.roomId || undefined,
        visibility: editForm.visibility,
        timezone: editForm.timezone,
        description: editForm.description.trim() || undefined,
        reminders: editForm.reminders,
        recurrenceScope: scope || (selectedEvent.isRecurringInstance || selectedEvent.recurringSeriesId ? "this_occurrence" : undefined),
        ignoreConflicts,
      },
    });
  };

  // Handle Update Submit
  const handleUpdateSubmit = () => {
    if (!selectedEvent) return;
    if (!editForm.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    const isSelectedHistorical = new Date(selectedEvent.startDate).getTime() < new Date().setHours(0, 0, 0, 0);
    if (!isSelectedHistorical && editForm.date < todayDateStr) {
      toast.error("Event date cannot be moved to before today.");
      return;
    }

    if (!editForm.allDay && editForm.endTime <= editForm.startTime) {
      toast.error("End time must be later than start time.");
      return;
    }

    if (selectedEvent.isRecurringInstance || selectedEvent.recurringSeriesId || selectedEvent.recurrenceRule) {
      setRecurrenceActionType("edit");
      setRecurrenceScopeModalOpen(true);
      return;
    }

    executeEventUpdate();
  };

  const handleCancelClick = () => {
    if (!selectedEvent) return;
    if (selectedEvent.isRecurringInstance || selectedEvent.recurringSeriesId || selectedEvent.recurrenceRule) {
      setRecurrenceActionType("cancel");
      setRecurrenceScopeModalOpen(true);
    } else {
      if (confirm("Are you sure you want to cancel this event? All invited participants will be notified.")) {
        cancelEventMutation.mutate({ id: selectedEvent.id });
      }
    }
  };

  const handleOpenAuditTrail = async (eventId: string) => {
    setIsLoadingAudit(true);
    setAuditModalOpen(true);
    try {
      const res = await api.get<any>(`/api/calendar/events/${eventId}/audit-logs`);
      const logs = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setAuditLogs(logs);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load audit logs");
      setAuditLogs([]);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Navigation Handlers
  const handlePrev = () => {
    if (viewMode === "Month") {
      setCurrentDate((d) => subMonths(d, 1));
    } else if (viewMode === "Week") {
      setCurrentDate((d) => subWeeks(d, 1));
    } else {
      setCurrentDate((d) => subDays(d, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "Month") {
      setCurrentDate((d) => addMonths(d, 1));
    } else if (viewMode === "Week") {
      setCurrentDate((d) => addWeeks(d, 1));
    } else {
      setCurrentDate((d) => addDays(d, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Export Calendar to CSV
  const exportCalendarCSV = () => {
    if (filteredEvents.length === 0) return toast.error("No events to export.");
    const headers = ["Title", "Category", "Start Date", "End Date", "Location", "Description", "Shares", "Reminders"];
    const rows = filteredEvents.map((e) => [
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.startDate}"`,
      `"${e.endDate || ""}"`,
      `"${(e.location || "").replace(/"/g, '""')}"`,
      `"${(e.description || "").replace(/"/g, '""')}"`,
      `"${(e.shares || []).map((s) => `${s.recipientId}:${s.permission}`).join("; ")}"`,
      `"${(e.reminders || []).map((r) => r.customScheduledAt ? `custom(${r.customScheduledAt}):${r.channel}` : `${r.minutesBefore}m:${r.channel}`).join("; ")}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `masterhrms-calendar-${format(currentDate, "yyyy-MM")}.csv`;
    a.click();
    toast.success("Calendar exported to CSV.");
  };

  // Permission Checks
  const isUserOwnerOrAdmin =
    selectedEvent?.userPermission === "owner" ||
    selectedEvent?.userId === user?.id ||
    profile?.data?.roles?.includes("admin") ||
    profile?.data?.roles?.includes("super_admin") ||
    (user as any)?.roles?.includes("admin") ||
    (user as any)?.roles?.includes("super_admin");

  const canUserEdit = isUserOwnerOrAdmin || selectedEvent?.userPermission === "edit";

  // All Available Categories for Selectors (database-backed with documented fallback)
  const availableCategories = useMemo(() => {
    if (dbCategories.length > 0) {
      return dbCategories.map((c) => c.name);
    }
    // Documented intentional fallback only when API is unavailable
    return ["Meetings", "Training", "Leave & Time Off", "Holidays", "Birthdays", "General Events"];
  }, [dbCategories]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Create Event CTA */}
          <Button
            onClick={() => {
              setNewEvent(getInitialNewEvent(currentDate));
              setCreateModalOpen(true);
            }}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl shadow-xs gap-2 transition-all cursor-pointer"
          >
            <Plus className="size-4" /> Create New Event
          </Button>

          {/* Mini Calendar Browsing Widget */}
          <div className="border border-border rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground">
                {format(miniCalendarDate, "MMMM yyyy")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMiniCalendarDate((d) => subMonths(d, 1))}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  onClick={() => setMiniCalendarDate((d) => addMonths(d, 1))}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground font-semibold mb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {miniCalendarDays.map((d, i) => {
                const inMonth = isSameMonth(d, miniCalendarDate);
                const isSelected = isSameDay(d, currentDate);
                const isTodayDate = isSameDay(d, new Date());
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentDate(d)}
                    className={cn(
                      "py-0.5 rounded cursor-pointer transition-colors font-medium flex items-center justify-center",
                      isSelected
                        ? "bg-teal-700 text-white font-bold"
                        : isTodayDate
                        ? "border border-teal-600 text-teal-600 font-bold"
                        : inMonth
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/40 hover:bg-muted/40"
                    )}
                  >
                    {format(d, "d")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events Section */}
          <div>
            <h5 className="text-xs font-bold text-teal-700 dark:text-teal-400 mb-3 flex items-center justify-between">
              <span>Upcoming Events</span>
              <Badge variant="outline" className="text-[10px] font-medium">
                {upcomingEvents.length}
              </Badge>
            </h5>
            <div className="space-y-2">
              {upcomingEvents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">No upcoming events scheduled.</p>
              ) : (
                upcomingEvents.map((item) => {
                  const style = categoryStyles[item.category] || DEFAULT_CATEGORY_STYLES[item.category] || DEFAULT_CATEGORY_STYLES.Meetings;
                  const itemDate = new Date(item.startDate);
                  const isItemToday = isSameDay(itemDate, new Date());
                  const isItemTomorrow = isSameDay(itemDate, addDays(new Date(), 1));
                  const timeLabel = isItemToday
                    ? `Today, ${format(itemDate, "h:mm a")}`
                    : isItemTomorrow
                    ? `Tomorrow, ${format(itemDate, "h:mm a")}`
                    : format(itemDate, "dd MMM, h:mm a");

                  const isBirthday = item.category?.toLowerCase() === "birthday" || item.id.startsWith("birthday-");
                  const isTodo = item.sourceDomain === "todo" || item.category?.toLowerCase() === "todo";

                  return (
                    <div
                      key={item.id}
                      onClick={() => openEventDetails(item)}
                      className="flex items-start gap-2 text-xs cursor-pointer p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {isBirthday ? (
                        item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.employeeName || cleanCalendarText(item.title)}
                            className="size-5 rounded-full object-cover shrink-0 ring-1 ring-rose-400 mt-0.5"
                          />
                        ) : (
                          <div className="size-5 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                            {item.employeeInitials || "BD"}
                          </div>
                        )
                      ) : isTodo ? (
                        <div className="size-5 rounded-md bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <CheckSquare className="size-3" />
                        </div>
                      ) : (
                        <span className={cn("size-2 rounded-full mt-1.5 flex-shrink-0", style.dot)} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
                        <p className="font-semibold text-foreground text-xs mt-0.5 truncate">{cleanCalendarText(item.title)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Categories Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h5 className="text-xs font-bold text-teal-700 dark:text-teal-400">Categories</h5>
              <button
                onClick={() => setNewCategoryModalOpen(true)}
                className="size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Add Custom Category"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <div className="space-y-1.5">
              {Object.keys(activeCategories).map((cat) => {
                const style = categoryStyles[cat] || DEFAULT_CATEGORY_STYLES[cat] || { dot: "bg-teal-600", label: cat };
                const count = categoryCounts[cat] || (cat === "Birthday" ? categoryCounts["birthday"] || 0 : 0);
                return (
                  <label key={cat} className="flex items-center justify-between text-xs text-foreground cursor-pointer select-none py-0.5 hover:opacity-80">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeCategories[cat]}
                        onChange={() =>
                          setActiveCategories((prev) => {
                            const nextVal = !prev[cat];
                            const next = { ...prev, [cat]: nextVal };
                            if (cat === "Birthday") next.birthday = nextVal;
                            if (cat === "birthday") next.Birthday = nextVal;
                            return next;
                          })
                        }
                        className="rounded border-border text-teal-700 focus:ring-teal-600 size-3.5 cursor-pointer"
                      />
                      <span className={cn("size-2 rounded-full", style.dot)} />
                      <span className="capitalize">{style.label || cat}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Toolbar Icons */}
        <div className="p-3 border-t border-border flex items-center justify-around text-muted-foreground">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
              queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
              queryClient.invalidateQueries({ queryKey: ["calendar-categories"] });
              toast.success("Calendar refreshed from server.");
            }}
            className="hover:text-foreground p-1 transition-colors cursor-pointer"
            title="Refresh Schedules"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            onClick={exportCalendarCSV}
            className="hover:text-foreground p-1 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="size-4" />
          </button>
          <button
            onClick={() => toast.info("Master HRMS Enterprise Calendar v2.0 (Real-time Sync & Pusher Active)")}
            className="hover:text-foreground p-1 transition-colors cursor-pointer"
            title="Calendar Info"
          >
            <BookOpen className="size-4" />
          </button>
        </div>
      </aside>

      {/* ─── MAIN CALENDAR CONTENT ─── */}
      <main className="flex-1 flex flex-col bg-card overflow-hidden">
        {/* Header Toolbar */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              Today
            </Button>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="size-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={handleNext}
                className="size-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground">
            {format(currentDate, "MMMM yyyy")}
          </h2>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden p-0.5 bg-muted/30">
              {(["Month", "Week", "Day", "List"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setViewMode(view)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    viewMode === view
                      ? "bg-teal-700 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SEARCH & ADVANCED FILTERS BAR ─── */}
        <div className="px-6 py-2.5 border-b border-border bg-muted/10 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search title, description, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[120px] bg-background">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Source:</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="calendar">User Events</SelectItem>
                <SelectItem value="birthday">Birthdays</SelectItem>
                <SelectItem value="anniversary">Anniversaries</SelectItem>
                <SelectItem value="interview">Interviews</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="leave">Leave & PTO</SelectItem>
                <SelectItem value="holiday">Holidays</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || statusFilter !== "all" || sourceFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setSourceFilter("all");
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Filter className="size-3 mr-1" /> Clear Filters
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/api/calendar/export/ics?startDate=${encodeURIComponent(queryWindowStart)}&endDate=${encodeURIComponent(queryWindowEnd)}`, "_blank");
              }}
              className="h-8 text-xs gap-1.5 cursor-pointer"
              title="Export all events as iCalendar (.ics)"
            >
              <Download className="size-3.5" /> Export .ics
            </Button>
          </div>
        </div>

        {/* ─── VIEW MODE: MONTH ─── */}
        {viewMode === "Month" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border bg-muted/20 text-center py-2 text-[11px] font-bold text-muted-foreground uppercase">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-border overflow-y-auto">
              {calendarDays.map((d, idx) => {
                const dayStr = format(d, "yyyy-MM-dd");
                const dayEvents = filteredEvents.filter((e) => e.startDate.startsWith(dayStr));
                const inMonth = isSameMonth(d, currentDate);
                const isTodayDate = isSameDay(d, new Date());

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (dayStr < todayDateStr) {
                        toast.info("Cannot schedule events before today. Date set to today.");
                        setNewEvent({
                          ...getInitialNewEvent(new Date()),
                          date: todayDateStr,
                        });
                      } else {
                        setNewEvent({
                          ...getInitialNewEvent(d),
                          date: dayStr,
                        });
                      }
                      setCreateModalOpen(true);
                    }}
                    className={cn(
                      "min-h-[105px] p-1.5 flex flex-col justify-start transition-colors cursor-pointer hover:bg-muted/10",
                      !inMonth && "bg-muted/10 text-muted-foreground/60"
                    )}
                  >
                    <div className="flex justify-end mb-1">
                      <span
                        className={cn(
                          "size-6 flex items-center justify-center text-xs font-semibold rounded-full",
                          isTodayDate ? "bg-teal-700 text-white font-bold" : "text-foreground"
                        )}
                      >
                        {format(d, "d")}
                      </span>
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[80px]">
                      {dayEvents.map((evt) => {
                        const isBirthday = evt.category?.toLowerCase() === "birthday" || evt.id.startsWith("birthday-");
                        const isTodo = evt.sourceDomain === "todo" || evt.category?.toLowerCase() === "todo";

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventDetails(evt);
                            }}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[11px] font-medium truncate cursor-pointer shadow-2xs transition-transform hover:scale-[1.02] flex items-center justify-between gap-1",
                              evt.color || "bg-teal-600 text-white"
                            )}
                            title={`${evt.title} (${evt.category})`}
                          >
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              {isBirthday && (
                                evt.avatarUrl ? (
                                  <img
                                    src={evt.avatarUrl}
                                    alt={evt.employeeName || cleanCalendarText(evt.title)}
                                    className="size-3.5 rounded-full object-cover shrink-0 ring-1 ring-white/60"
                                  />
                                ) : (
                                  <span className="size-3.5 rounded-full bg-white/30 text-[8px] font-bold flex items-center justify-center shrink-0">
                                    {evt.employeeInitials || "BD"}
                                  </span>
                                )
                              )}
                              {isTodo && (
                                <CheckSquare className="size-3 shrink-0 opacity-90 text-white" />
                              )}
                              <span className={cn("truncate", evt.completed && "line-through opacity-85")}>
                                {cleanCalendarText(evt.title)}
                              </span>
                            </div>
                            {evt.isShared && <Share2 className="size-2.5 shrink-0 opacity-80" />}
                            {evt.reminders && evt.reminders.length > 0 && <Bell className="size-2.5 shrink-0 opacity-80" />}
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

        {/* ─── VIEW MODE: WEEK ─── */}
        {viewMode === "Week" && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="grid grid-cols-7 border-b border-border bg-muted/20 text-center py-2 text-[11px] font-bold text-muted-foreground uppercase">
              {weekDays.map((d, i) => (
                <div key={i} className={cn(isSameDay(d, new Date()) && "text-teal-600 font-bold")}>
                  {format(d, "EEE dd")}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-border flex-1 min-h-[400px]">
              {weekDays.map((d, i) => {
                const dayStr = format(d, "yyyy-MM-dd");
                const dayEvents = filteredEvents.filter((e) => e.startDate.startsWith(dayStr));
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (dayStr < todayDateStr) {
                        toast.info("Cannot schedule events before today. Date set to today.");
                        setNewEvent({
                          ...getInitialNewEvent(new Date()),
                          date: todayDateStr,
                        });
                      } else {
                        setNewEvent({
                          ...getInitialNewEvent(d),
                          date: dayStr,
                        });
                      }
                      setCreateModalOpen(true);
                    }}
                    className="p-2 space-y-2 hover:bg-muted/10 cursor-pointer min-h-[400px]"
                  >
                    {dayEvents.map((evt) => {
                      const isBirthday = evt.category?.toLowerCase() === "birthday" || evt.id.startsWith("birthday-");
                      const isTodo = evt.sourceDomain === "todo" || evt.category?.toLowerCase() === "todo";
                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEventDetails(evt);
                          }}
                          className={cn(
                            "p-2 rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-all hover:opacity-90",
                            evt.color || "bg-teal-600 text-white"
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-bold truncate">
                            {isBirthday && (
                              evt.avatarUrl ? (
                                <img
                                  src={evt.avatarUrl}
                                  alt={evt.employeeName || cleanCalendarText(evt.title)}
                                  className="size-4 rounded-full object-cover shrink-0 ring-1 ring-white/60"
                                />
                              ) : (
                                <span className="size-4 rounded-full bg-white/30 text-[9px] font-bold flex items-center justify-center shrink-0">
                                  {evt.employeeInitials || "BD"}
                                </span>
                              )
                            )}
                            {isTodo && (
                              <CheckSquare className="size-3.5 shrink-0 opacity-90 text-white" />
                            )}
                            <p className={cn("truncate", evt.completed && "line-through opacity-85")}>
                              {cleanCalendarText(evt.title)}
                            </p>
                          </div>
                          <p className="text-[10px] opacity-80 mt-0.5">
                            {format(new Date(evt.startDate), "h:mm a")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── VIEW MODE: DAY ─── */}
        {viewMode === "Day" && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold">{format(currentDate, "EEEE, MMMM d, yyyy")}</h3>
                <p className="text-xs text-muted-foreground">Scheduled Sessions, Reminders and Projections</p>
              </div>
              <Button
                size="sm"
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5"
                onClick={() => {
                  setNewEvent({
                    ...getInitialNewEvent(currentDate),
                    date: format(currentDate, "yyyy-MM-dd"),
                  });
                  setCreateModalOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Add Event
              </Button>
            </div>

            {filteredEvents.filter((e) => e.startDate.startsWith(format(currentDate, "yyyy-MM-dd"))).length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <CalendarIcon className="size-10 mx-auto mb-2 opacity-40 text-teal-600" />
                No events scheduled for this day.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents
                  .filter((e) => e.startDate.startsWith(format(currentDate, "yyyy-MM-dd")))
                  .map((evt) => {
                    const isBirthday = evt.category?.toLowerCase() === "birthday" || evt.id.startsWith("birthday-");
                    const isTodo = evt.sourceDomain === "todo" || evt.category?.toLowerCase() === "todo";
                    return (
                      <div
                        key={evt.id}
                        onClick={() => openEventDetails(evt)}
                        className={cn(
                          "p-3.5 rounded-xl border border-border flex items-center justify-between cursor-pointer hover:shadow-xs transition-all",
                          evt.color || "bg-teal-600 text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isBirthday && (
                            evt.avatarUrl ? (
                              <img
                                src={evt.avatarUrl}
                                alt={evt.employeeName || cleanCalendarText(evt.title)}
                                className="size-10 rounded-full object-cover shrink-0 ring-2 ring-white/80 shadow-xs"
                              />
                            ) : (
                              <div className="size-10 rounded-full bg-white/20 text-white font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-white/50">
                                {evt.employeeInitials || "BD"}
                              </div>
                            )
                          )}
                          {isTodo && (
                            <div className="size-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 ring-2 ring-white/50">
                              <CheckSquare className="size-5" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-sm">{cleanCalendarText(evt.title)}</h4>
                            <p className="text-xs opacity-85 mt-0.5">
                              {format(new Date(evt.startDate), "h:mm a")}
                              {evt.endDate ? ` – ${format(new Date(evt.endDate), "h:mm a")}` : ""}
                              {evt.location ? ` • ${evt.location}` : ""}
                            </p>
                            {evt.description && <p className="text-xs opacity-75 mt-1 line-clamp-1">{evt.description}</p>}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs uppercase font-medium">
                          {evt.category}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ─── VIEW MODE: LIST ─── */}
        {viewMode === "List" && (
          <div className="p-6 overflow-y-auto space-y-3 flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm text-foreground">Scheduled Events Agenda ({filteredEvents.length})</h4>
              <Button variant="outline" size="sm" onClick={exportCalendarCSV} className="text-xs gap-1.5">
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No events match current category filters.
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const isBirthday = evt.category?.toLowerCase() === "birthday" || evt.id.startsWith("birthday-");
                const isTodo = evt.sourceDomain === "todo" || evt.category?.toLowerCase() === "todo";
                return (
                  <div
                    key={evt.id}
                    onClick={() => openEventDetails(evt)}
                    className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between hover:border-teal-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {isBirthday ? (
                        evt.avatarUrl ? (
                          <img
                            src={evt.avatarUrl}
                            alt={evt.employeeName || cleanCalendarText(evt.title)}
                            className="size-8 rounded-full object-cover shrink-0 ring-1 ring-rose-400"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {evt.employeeInitials || "BD"}
                          </div>
                        )
                      ) : isTodo ? (
                        <div className="size-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                          <CheckSquare className="size-4" />
                        </div>
                      ) : (
                        <span className={cn("size-3 rounded-full shrink-0", evt.color ? evt.color.split(" ")[0] : "bg-teal-600")} />
                      )}
                      <div>
                        <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
                          <span>{cleanCalendarText(evt.title)}</span>
                          {evt.isShared && (
                            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                              <Share2 className="size-2.5" /> Shared
                            </Badge>
                          )}
                          {evt.reminders && evt.reminders.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                              <Bell className="size-2.5" /> {evt.reminders.length} reminder(s)
                            </Badge>
                          )}
                        </h5>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(evt.startDate), "PPP")} at {format(new Date(evt.startDate), "h:mm a")}
                          {evt.location ? ` • ${evt.location}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                      {evt.category}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* ─── CREATE CUSTOM CATEGORY MODAL ─── */}
      <Dialog open={newCategoryModalOpen} onOpenChange={setNewCategoryModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Palette className="size-4 text-teal-600" /> Create Calendar Category
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a custom category to tag and filter organization events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-medium">Category Name</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Town Hall, Sprint Review"
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Select Badge Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    onClick={() => setNewCatColor(swatch.value)}
                    className={cn(
                      "p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all",
                      newCatColor === swatch.value
                        ? "border-teal-600 bg-muted ring-1 ring-teal-600"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <span className={cn("size-3 rounded-full shrink-0", swatch.dot)} />
                    <span className="text-[11px] truncate">{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              onClick={() => {
                if (!newCatName.trim()) {
                  toast.error("Please enter a category name");
                  return;
                }
                createCategoryMutation.mutate({ name: newCatName.trim(), color: newCatColor });
              }}
              disabled={createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending ? "Creating..." : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CREATE EVENT MODAL ─── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck className="size-4 text-teal-600" /> Create New Calendar Event
            </DialogTitle>
            <DialogDescription className="text-xs">
              Schedule meetings, set multi-member permissions, and configure automated reminders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-medium">Event Title *</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g. Q4 Executive Strategy Meeting"
                className="text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">Date *</Label>
                <Input
                  type="date"
                  min={todayDateStr}
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className={cn("text-xs mt-1", newEvent.date < todayDateStr && "border-destructive ring-1 ring-destructive")}
                />
                {newEvent.date < todayDateStr && (
                  <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>Event date cannot be scheduled before today.</span>
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs font-medium">Category</Label>
                <Select
                  value={newEvent.category}
                  onValueChange={(val) => setNewEvent({ ...newEvent, category: val })}
                >
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium">Start Time</Label>
                  <Input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="text-xs mt-1"
                    disabled={newEvent.allDay}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">End Time</Label>
                  <Input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className={cn(
                      "text-xs mt-1",
                      !newEvent.allDay && newEvent.endTime <= newEvent.startTime && "border-destructive ring-1 ring-destructive"
                    )}
                    disabled={newEvent.allDay}
                  />
                </div>
              </div>
              {!newEvent.allDay && newEvent.endTime <= newEvent.startTime && (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>End time must be later than start time.</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="allDayCheck"
                checked={newEvent.allDay}
                onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                className="rounded border-border text-teal-700 size-3.5 cursor-pointer"
              />
              <label htmlFor="allDayCheck" className="text-xs cursor-pointer select-none">
                All Day Event
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">Location</Label>
                <Input
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="e.g. Conference Room B"
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Video className="size-3 text-teal-600" /> Meeting Link
                </Label>
                <Input
                  value={newEvent.meetingLink}
                  onChange={(e) => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                  placeholder="e.g. https://meet.google.com/xyz"
                  className="text-xs mt-1"
                />
              </div>
            </div>

            {/* Meeting Room Selection */}
            <div>
              <Label className="text-xs font-medium flex items-center gap-1">
                <Building2 className="size-3 text-teal-600" /> Meeting Room (Resource Booking)
              </Label>
              <Select
                value={newEvent.roomId || "none"}
                onValueChange={(val) => setNewEvent({ ...newEvent, roomId: val === "none" ? "" : val })}
              >
                <SelectTrigger className="text-xs mt-1">
                  <SelectValue placeholder="No room selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No room assigned</SelectItem>
                  {dbRooms.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} {r.capacity ? `(${r.capacity} seats)` : ""} {r.location ? `• ${r.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurrence Engine Section */}
            <div className="border-t pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Repeat className="size-3.5 text-teal-600" /> Recurrence & Repeat Rules
                </Label>
                <span className="text-[10px] text-muted-foreground">RFC 5545 Series</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Frequency</Label>
                  <Select
                    value={newEvent.recurrenceFreq}
                    onValueChange={(val: any) => setNewEvent({ ...newEvent, recurrenceFreq: val })}
                  >
                    <SelectTrigger className="text-xs mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newEvent.recurrenceFreq !== "none" && (
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">End Condition</Label>
                    <Select
                      value={newEvent.recurrenceEndType}
                      onValueChange={(val: any) => setNewEvent({ ...newEvent, recurrenceEndType: val })}
                    >
                      <SelectTrigger className="text-xs mt-0.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never (Continues)</SelectItem>
                        <SelectItem value="until">Until specific date</SelectItem>
                        <SelectItem value="count">After number of occurrences</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {newEvent.recurrenceFreq === "WEEKLY" && (
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block">Repeat on Days</Label>
                  <div className="flex items-center gap-1">
                    {["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map((day) => {
                      const isSelected = newEvent.recurrenceWeekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const updated = isSelected
                              ? newEvent.recurrenceWeekdays.filter((d) => d !== day)
                              : [...newEvent.recurrenceWeekdays, day];
                            setNewEvent({ ...newEvent, recurrenceWeekdays: updated });
                          }}
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors",
                            isSelected ? "bg-teal-700 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {newEvent.recurrenceFreq !== "none" && newEvent.recurrenceEndType === "until" && (
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Repeat Until Date</Label>
                  <Input
                    type="date"
                    min={newEvent.date || todayDateStr}
                    value={newEvent.recurrenceUntil}
                    onChange={(e) => setNewEvent({ ...newEvent, recurrenceUntil: e.target.value })}
                    className="text-xs mt-0.5"
                  />
                </div>
              )}

              {newEvent.recurrenceFreq !== "none" && newEvent.recurrenceEndType === "count" && (
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Number of Occurrences</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={newEvent.recurrenceCount}
                    onChange={(e) => setNewEvent({ ...newEvent, recurrenceCount: parseInt(e.target.value, 10) || 10 })}
                    className="text-xs mt-0.5"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Globe className="size-3 text-teal-600" /> Visibility
                </Label>
                <Select
                  value={newEvent.visibility}
                  onValueChange={(val: any) => setNewEvent({ ...newEvent, visibility: val })}
                >
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (Only me & invitees)</SelectItem>
                    <SelectItem value="team">Team (Department & shared)</SelectItem>
                    <SelectItem value="organization">Organization (All employees)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Timezone</Label>
                <Input
                  value={newEvent.timezone}
                  onChange={(e) => setNewEvent({ ...newEvent, timezone: e.target.value })}
                  placeholder="Asia/Kolkata"
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Optional notes or agenda..."
                className="text-xs mt-1 h-16"
              />
            </div>

            {/* Sharing / Access Control */}
            <div className="border-t pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Share2 className="size-3.5 text-teal-600" /> Share with Organization Members
                </Label>
                <span className="text-[10px] text-muted-foreground">Assign View Only or Can Edit</span>
              </div>
              <OrganizationMemberSelector
                value={newEvent.shares.map((s) => ({
                  recipientId: s.userId,
                  permission: s.permission,
                }))}
                onChange={(updated: SelectedShare[]) =>
                  setNewEvent({
                    ...newEvent,
                    shares: updated.map((u) => ({ userId: u.recipientId, permission: u.permission })),
                  })
                }
                placeholder="Search and select organization members..."
              />
            </div>

            {/* Configurable Reminders Section */}
            <ReminderSectionEditor
              reminders={newEvent.reminders}
              onChange={(reminders) => setNewEvent({ ...newEvent, reminders })}
              eventDate={newEvent.date}
              eventStartTime={newEvent.startTime}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              onClick={handleCreateSubmit}
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? "Saving..." : "Save Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EVENT DETAILS / EDIT MODAL ─── */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        {selectedEvent && (
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <Badge className={cn("text-xs font-semibold", selectedEvent.color || "bg-teal-600 text-white")}>
                  {selectedEvent.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(selectedEvent.startDate), "PPP")}
                </span>
              </div>
              <DialogTitle className="text-base font-bold mt-2 flex items-center gap-2">
                {(selectedEvent.category?.toLowerCase() === "birthday" || selectedEvent.id.startsWith("birthday-")) && (
                  <Cake className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                {(selectedEvent.sourceDomain === "todo" || selectedEvent.category?.toLowerCase() === "todo") && (
                  <CheckSquare className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
                )}
                <span>{cleanCalendarText(selectedEvent.title)}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedEvent.sourceDomain === "todo" || selectedEvent.category?.toLowerCase() === "todo"
                  ? "Projected Enterprise Task — Synchronized with Todo & Gantt"
                  : selectedEvent.isShared
                  ? `Shared with you (${selectedEvent.userPermission === "edit" ? "Edit permission" : "View only"})`
                  : "Private Event"}
              </DialogDescription>
            </DialogHeader>

            {selectedEvent.sourceDomain === "todo" || selectedEvent.category?.toLowerCase() === "todo" ? (
              /* Dedicated Todo Task Projection Card */
              <div className="space-y-4 py-2 text-xs">
                <div className="p-3.5 bg-muted/40 rounded-xl space-y-2.5 border">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Task Schedule:</span>
                    <span className="font-semibold text-foreground">
                      {format(new Date(selectedEvent.startDate), "MMM d, yyyy")}
                      {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.startDate
                        ? ` — ${format(new Date(selectedEvent.endDate), "MMM d, yyyy")}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Status:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize font-medium",
                        selectedEvent.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                      )}
                    >
                      {selectedEvent.status === "completed" ? "Completed" : "In Progress / Pending"}
                    </Badge>
                  </div>
                  {selectedEvent.priority && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Priority:</span>
                      <span className="capitalize font-semibold text-foreground">{selectedEvent.priority}</span>
                    </div>
                  )}
                  {selectedEvent.employeeName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Assignee:</span>
                      <span className="font-semibold text-foreground">{selectedEvent.employeeName}</span>
                    </div>
                  )}
                  {selectedEvent.progress !== undefined && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">Execution Progress</span>
                        <span className="font-semibold">{selectedEvent.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-teal-600 h-full rounded-full transition-all"
                          style={{ width: `${selectedEvent.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground block mb-1">Description</Label>
                    <p className="text-xs text-foreground bg-muted/20 p-2.5 rounded-lg border whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-800 dark:text-sky-300 text-[11px] flex items-start gap-2">
                  <CheckSquare className="size-4 shrink-0 mt-0.5 text-sky-600" />
                  <span>
                    This task is synchronized directly from the MasterHRMS Todo & Tasks engine. Task changes must be made in the Todo workspace.
                  </span>
                </div>
              </div>
            ) : isEditingEvent ? (
              /* Edit Form */
              <div className="space-y-3 py-2 text-xs">
                <div>
                  <Label className="text-xs font-medium">Title</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium flex items-center justify-between">
                      <span>Date</span>
                      {selectedEvent && new Date(selectedEvent.startDate).getTime() < new Date().setHours(0, 0, 0, 0) && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (Historical)
                        </span>
                      )}
                    </Label>
                    <Input
                      type="date"
                      min={selectedEvent && new Date(selectedEvent.startDate).getTime() < new Date().setHours(0, 0, 0, 0) ? undefined : todayDateStr}
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className={cn(
                        "text-xs mt-1",
                        selectedEvent && new Date(selectedEvent.startDate).getTime() >= new Date().setHours(0, 0, 0, 0) && editForm.date < todayDateStr && "border-destructive ring-1 ring-destructive"
                      )}
                    />
                    {selectedEvent && new Date(selectedEvent.startDate).getTime() >= new Date().setHours(0, 0, 0, 0) && editForm.date < todayDateStr && (
                      <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>Event date cannot be moved to before today.</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Category</Label>
                    <Select
                      value={editForm.category}
                      onValueChange={(val) => setEditForm({ ...editForm, category: val })}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-medium">Start Time</Label>
                      <Input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                        className="text-xs mt-1"
                        disabled={editForm.allDay}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">End Time</Label>
                      <Input
                        type="time"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                        className={cn(
                          "text-xs mt-1",
                          !editForm.allDay && editForm.endTime <= editForm.startTime && "border-destructive ring-1 ring-destructive"
                        )}
                        disabled={editForm.allDay}
                      />
                    </div>
                  </div>
                  {!editForm.allDay && editForm.endTime <= editForm.startTime && (
                    <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>End time must be later than start time.</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium">Location</Label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Video className="size-3 text-teal-600" /> Meeting Link
                    </Label>
                    <Input
                      value={editForm.meetingLink}
                      onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })}
                      placeholder="e.g. Zoom / Meet URL"
                      className="text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Meeting Room Selection */}
                <div>
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Building2 className="size-3 text-teal-600" /> Meeting Room (Resource Booking)
                  </Label>
                  <Select
                    value={editForm.roomId || "none"}
                    onValueChange={(val) => setEditForm({ ...editForm, roomId: val === "none" ? "" : val })}
                  >
                    <SelectTrigger className="text-xs mt-1">
                      <SelectValue placeholder="No room selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No room assigned</SelectItem>
                      {dbRooms.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.capacity ? `(${r.capacity} seats)` : ""} {r.location ? `• ${r.location}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Globe className="size-3 text-teal-600" /> Visibility
                    </Label>
                    <Select
                      value={editForm.visibility}
                      onValueChange={(val: any) => setEditForm({ ...editForm, visibility: val })}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private (Only me & invitees)</SelectItem>
                        <SelectItem value="team">Team (Department & shared)</SelectItem>
                        <SelectItem value="organization">Organization (All employees)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Timezone</Label>
                    <Input
                      value={editForm.timezone}
                      onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="text-xs mt-1 h-18"
                  />
                </div>

                {/* Reminders & Notifications in Edit Mode */}
                <ReminderSectionEditor
                  reminders={editForm.reminders}
                  onChange={(reminders) => setEditForm({ ...editForm, reminders })}
                  eventDate={editForm.date}
                  eventStartTime={editForm.startTime}
                />
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-3 py-2 text-xs">
                {/* Cancellation Banner */}
                {selectedEvent.status === "cancelled" && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 flex items-center gap-2.5">
                    <Ban className="size-4 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs">Event Cancelled</p>
                      <p className="text-[11px] opacity-90">
                        This event has been marked as cancelled. Historical details and participant responses are retained below.
                      </p>
                    </div>
                  </div>
                )}

                {(selectedEvent.category?.toLowerCase() === "birthday" || selectedEvent.id.startsWith("birthday-")) && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/5 border border-rose-500/20 flex items-center gap-3.5">
                    {selectedEvent.avatarUrl ? (
                      <img
                        src={selectedEvent.avatarUrl}
                        alt={selectedEvent.employeeName || selectedEvent.title}
                        className="size-12 rounded-full object-cover ring-2 ring-rose-400 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="size-12 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white font-bold text-base flex items-center justify-center ring-2 ring-rose-300 shadow-sm shrink-0">
                        {selectedEvent.employeeInitials || "BD"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Cake className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-400 truncate">
                          {selectedEvent.employeeName || cleanCalendarText(selectedEvent.title)}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Annual birthday celebration projected from verified employee profile.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4 text-teal-600 shrink-0" />
                  <span>
                    {format(new Date(selectedEvent.startDate), "h:mm a")}
                    {selectedEvent.endDate ? ` – ${format(new Date(selectedEvent.endDate), "h:mm a")}` : ""}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">• {selectedEvent.timezone || "Asia/Kolkata"}</span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4 text-rose-500 shrink-0" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.room && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="size-4 text-teal-600 shrink-0" />
                    <span>Meeting Room: <strong className="text-foreground">{selectedEvent.room.name}</strong> {selectedEvent.room.location ? `(${selectedEvent.room.location})` : ""}</span>
                  </div>
                )}

                {(selectedEvent.recurrenceRule || selectedEvent.isRecurringInstance || selectedEvent.recurringSeriesId) && (
                  <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 p-2 rounded-lg">
                    <Repeat className="size-4 shrink-0" />
                    <span>Recurring Series {selectedEvent.recurrenceRule ? `(${selectedEvent.recurrenceRule})` : ""}</span>
                  </div>
                )}

                {/* Meeting Link with Quick Join */}
                {selectedEvent.meetingLink && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <Video className="size-4 text-teal-600 shrink-0" />
                      <span className="font-medium truncate">{selectedEvent.meetingLink}</span>
                    </div>
                    <a
                      href={selectedEvent.meetingLink.startsWith("http") ? selectedEvent.meetingLink : `https://${selectedEvent.meetingLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline font-semibold shrink-0 ml-2"
                    >
                      Join <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="size-3 text-muted-foreground" />
                    <span>Visibility: <strong className="capitalize">{selectedEvent.visibility || "team"}</strong></span>
                  </span>
                </div>

                {selectedEvent.description && (
                  <div className="p-3 bg-muted/30 rounded-lg text-foreground border leading-relaxed">
                    {selectedEvent.description}
                  </div>
                )}

                {/* Attendee RSVP Action Bar */}
                {selectedEvent.isShared && selectedEvent.userPermission !== "owner" && selectedEvent.status !== "cancelled" && (
                  <div className="border-t pt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground block">
                        Your RSVP Response
                      </Label>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        Status: {selectedEvent.userRsvp || "pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {(["accepted", "tentative", "declined"] as const).map((status) => {
                        const isActive = (selectedEvent.userRsvp || "pending") === status;
                        return (
                          <Button
                            key={status}
                            size="sm"
                            type="button"
                            variant={isActive ? "default" : "outline"}
                            className={cn(
                              "text-xs h-7 flex-1 capitalize",
                              isActive && status === "accepted" && "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold",
                              isActive && status === "tentative" && "bg-amber-600 hover:bg-amber-700 text-white font-semibold",
                              isActive && status === "declined" && "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                            )}
                            disabled={rsvpEventMutation.isPending}
                            onClick={() => rsvpEventMutation.mutate({ id: selectedEvent.id, rsvpStatus: status })}
                          >
                            {status}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Configured Reminders */}
                {selectedEvent.reminders && selectedEvent.reminders.length > 0 && (
                  <div className="border-t pt-2">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Bell className="size-3.5 text-teal-600" /> Configured Reminders ({selectedEvent.reminders.length})
                    </Label>
                    <div className="space-y-1">
                      {selectedEvent.reminders.map((rem, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-xs">
                          <span className="font-medium text-[11px]">
                            {formatReminderLabel(rem)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {rem.channel === "both" ? "Email & In-App" : rem.channel === "in_app" ? "In-App only" : "Email only"}
                            </Badge>
                            {rem.status === "dispatched" && (
                              <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600">
                                Dispatched
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shares list with Attendee RSVP indicators */}
                {selectedEvent.shares && selectedEvent.shares.length > 0 && (
                  <div className="border-t pt-2">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Invited Attendees ({selectedEvent.shares.length})
                    </Label>
                    <div className="space-y-1">
                      {selectedEvent.shares.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-xs">
                          <span className="font-medium text-[11px] truncate">{s.recipientId}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[9px] capitalize",
                                s.rsvpStatus === "accepted" && "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
                                s.rsvpStatus === "tentative" && "bg-amber-500/15 text-amber-700 border-amber-500/30",
                                s.rsvpStatus === "declined" && "bg-rose-500/15 text-rose-700 border-rose-500/30",
                                (!s.rsvpStatus || s.rsvpStatus === "pending") && "bg-muted text-muted-foreground"
                              )}
                            >
                              RSVP: {s.rsvpStatus || "pending"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {s.permission === "edit" ? "Can Edit" : "View Only"}
                            </Badge>
                            {isUserOwnerOrAdmin && (
                              <button
                                onClick={() => revokeShareMutation.mutate({ id: selectedEvent.id, recipientId: s.recipientId })}
                                className="text-destructive hover:underline text-[10px]"
                                title="Revoke Share"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Share (Owner/Admin only) */}
                {isUserOwnerOrAdmin && (
                  <div className="border-t pt-2 space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground block">Share Event</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-7">
                        <OrganizationMemberSelector
                          singleValue={shareInput.recipientId}
                          onSingleChange={(userId) => setShareInput({ ...shareInput, recipientId: userId })}
                          placeholder="Select member..."
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Select
                          value={shareInput.permission}
                          onValueChange={(val: any) => setShareInput({ ...shareInput, permission: val })}
                        >
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">View Only</SelectItem>
                            <SelectItem value="edit">Can Edit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Button
                          size="sm"
                          className="h-9 w-full text-xs bg-teal-700 hover:bg-teal-800 text-white font-medium"
                          onClick={() => {
                            if (!shareInput.recipientId.trim()) {
                              toast.error("Please select an organization member to share with");
                              return;
                            }
                            shareEventMutation.mutate({
                              id: selectedEvent.id,
                              recipientId: shareInput.recipientId.trim(),
                              permission: shareInput.permission,
                            });
                          }}
                        >
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              {selectedEvent.sourceDomain === "todo" || selectedEvent.category?.toLowerCase() === "todo" ? (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`/api/calendar/events/${selectedEvent.id}/export/ics`, "_blank");
                      }}
                      className="gap-1.5 text-xs"
                      title="Export task as iCalendar (.ics)"
                    >
                      <Download className="size-3.5" /> .ics
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        const taskId = selectedEvent.sourceId || selectedEvent.id.replace(/^todo-/, "");
                        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                        let ganttPath = "/me/todo/gantt";
                        if (currentPath.startsWith("/hr")) ganttPath = "/hr/todo/gantt";
                        else if (currentPath.startsWith("/tenant")) ganttPath = "/tenant/todo/gantt";
                        window.location.href = `${ganttPath}?taskId=${encodeURIComponent(taskId)}`;
                      }}
                      className="gap-1.5 text-xs"
                    >
                      <ExternalLink className="size-3.5" /> View in Gantt
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        const taskId = selectedEvent.sourceId || selectedEvent.id.replace(/^todo-/, "");
                        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                        let todoPath = "/me/todo";
                        if (currentPath.startsWith("/hr")) todoPath = "/hr/todo";
                        else if (currentPath.startsWith("/tenant")) todoPath = "/tenant/todo";
                        window.location.href = `${todoPath}?taskId=${encodeURIComponent(taskId)}`;
                      }}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-medium gap-1.5 text-xs"
                    >
                      <CheckSquare className="size-3.5" /> Open in Todo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDetailsModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </>
              ) : isEditingEvent ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingEvent(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
                    onClick={handleUpdateSubmit}
                    disabled={updateEventMutation.isPending}
                  >
                    {updateEventMutation.isPending ? "Updating..." : "Update Event"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAuditTrail(selectedEvent.id)}
                      className="gap-1.5 text-xs"
                      title="View complete audit trail"
                    >
                      <History className="size-3.5" /> Audit Trail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`/api/calendar/events/${selectedEvent.id}/export/ics`, "_blank");
                      }}
                      className="gap-1.5 text-xs"
                      title="Export event as iCalendar (.ics)"
                    >
                      <Download className="size-3.5" /> .ics
                    </Button>
                    {isUserOwnerOrAdmin && selectedEvent.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelClick}
                        disabled={cancelEventMutation.isPending}
                        className="gap-1 text-xs text-amber-700 hover:text-amber-800 border-amber-500/40 hover:bg-amber-500/10"
                      >
                        <Ban className="size-3.5" /> Cancel Event
                      </Button>
                    )}
                    {isUserOwnerOrAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to permanently delete this calendar event?")) {
                            deleteEventMutation.mutate(selectedEvent.id);
                          }
                        }}
                        disabled={deleteEventMutation.isPending}
                        className="gap-1 text-xs"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canUserEdit && selectedEvent.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingEvent(true)}
                        className="gap-1.5 text-xs"
                      >
                        <Edit2 className="size-3.5" /> Edit
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setDetailsModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ─── CONFLICT WARNING MODAL ─── */}
      <Dialog open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
              <AlertCircle className="size-4" /> Scheduling Conflict Detected
            </DialogTitle>
            <DialogDescription className="text-xs">
              One or more attendees or resources have overlapping commitments during this scheduled time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {conflictData?.attendeeConflicts && conflictData.attendeeConflicts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-teal-600" /> Attendee Overlaps ({conflictData.attendeeConflicts.length})
                </Label>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {conflictData.attendeeConflicts.map((c: any, idx: number) => (
                    <div key={idx} className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
                      <p className="font-semibold text-foreground">{c.attendeeName || c.attendeeId}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {c.reason || "Busy: Scheduled Commitment"} • {c.conflictingEventTime || ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {conflictData?.roomConflicts && conflictData.roomConflicts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-teal-600" /> Room Double-Booking
                </Label>
                <div className="space-y-1">
                  {conflictData.roomConflicts.map((c: any, idx: number) => (
                    <div key={idx} className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs">
                      <p className="font-semibold text-foreground">{c.roomName || "Meeting Room"}</p>
                      <p className="text-[11px] text-destructive mt-0.5">
                        Already booked: {c.conflictingEventTitle || "Conflicting Session"} ({c.conflictingEventTime || ""})
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button variant="outline" size="sm" onClick={() => setConflictModalOpen(false)}>
              Change Time / Room
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={() => {
                if (pendingAction === "create" && pendingPayload) {
                  createEventMutation.mutate({ ...pendingPayload, ignoreConflicts: true });
                } else if (pendingAction === "update" && pendingPayload) {
                  executeEventUpdate(undefined, true);
                }
              }}
            >
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── RECURRENCE SCOPE MODAL ─── */}
      <Dialog open={recurrenceScopeModalOpen} onOpenChange={setRecurrenceScopeModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Repeat className="size-4 text-teal-600" />
              {recurrenceActionType === "cancel" ? "Cancel Recurring Event" : "Edit Recurring Event"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              This event is part of a recurring series. Choose how you want to apply your changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3 text-xs">
            <div
              onClick={() => setSelectedRecurrenceScope("this_occurrence")}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3",
                selectedRecurrenceScope === "this_occurrence"
                  ? "border-teal-600 bg-teal-500/10 text-foreground ring-1 ring-teal-600"
                  : "border-border hover:bg-muted/40"
              )}
            >
              <input
                type="radio"
                name="recurrence_scope"
                checked={selectedRecurrenceScope === "this_occurrence"}
                onChange={() => setSelectedRecurrenceScope("this_occurrence")}
                className="mt-0.5 text-teal-600"
              />
              <div>
                <p className="font-semibold text-xs">This occurrence only</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Applies only to this specific date. All other occurrences in the series remain unchanged.
                </p>
              </div>
            </div>

            <div
              onClick={() => setSelectedRecurrenceScope("all_occurrences")}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3",
                selectedRecurrenceScope === "all_occurrences"
                  ? "border-teal-600 bg-teal-500/10 text-foreground ring-1 ring-teal-600"
                  : "border-border hover:bg-muted/40"
              )}
            >
              <input
                type="radio"
                name="recurrence_scope"
                checked={selectedRecurrenceScope === "all_occurrences"}
                onChange={() => setSelectedRecurrenceScope("all_occurrences")}
                className="mt-0.5 text-teal-600"
              />
              <div>
                <p className="font-semibold text-xs">All occurrences in series</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Applies to every occurrence in this recurring series across all dates.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRecurrenceScopeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={cn(
                "text-white font-medium",
                recurrenceActionType === "cancel" ? "bg-rose-600 hover:bg-rose-700" : "bg-teal-700 hover:bg-teal-800"
              )}
              onClick={() => {
                if (recurrenceActionType === "cancel" && selectedEvent) {
                  cancelEventMutation.mutate({
                    id: selectedEvent.id,
                    recurrenceScope: selectedRecurrenceScope,
                  });
                } else if (recurrenceActionType === "edit") {
                  executeEventUpdate(selectedRecurrenceScope);
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AUDIT TRAIL MODAL ─── */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="size-4 text-teal-600" /> Calendar Event Audit Trail
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete chronological log of modifications, permissions, and RSVP states for this event.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs">
            {isLoadingAudit ? (
              <div className="py-8 text-center text-muted-foreground text-xs">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">No audit records found for this event.</div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {log.action}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {log.createdAt ? format(new Date(log.createdAt), "MMM d, yyyy h:mm:ss a") : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Actor: <strong className="text-foreground">{log.user?.email || log.userId || "System"}</strong></span>
                      {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
                    </div>
                    {log.details && (
                      <div className="text-[10px] bg-background/80 p-1.5 rounded font-mono text-muted-foreground overflow-x-auto">
                        {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setAuditModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UnifiedCalendarApp;
