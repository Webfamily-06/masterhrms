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
} from "lucide-react";
import { toast } from "sonner";
import { OrganizationMemberSelector } from "./organization-member-selector";
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
  recipientId: string;
  permission: "view" | "edit";
  sharedBy?: string;
  createdAt?: string;
}

export interface CalendarReminderItem {
  id: string;
  minutesBefore: number;
  channel: "email" | "in_app" | "both";
  status?: string;
  dispatchedAt?: string;
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
  status?: string;
  avatarUrl?: string;
  employeeName?: string;
  employeeInitials?: string;
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
  Conference: { bg: "bg-amber-500 text-white", text: "text-amber-600", dot: "bg-amber-500", label: "Conference" },
  leave: { bg: "bg-amber-600 text-white", text: "text-amber-700", dot: "bg-amber-600", label: "Leave & PTO" },
  holiday: { bg: "bg-emerald-600 text-white", text: "text-emerald-700", dot: "bg-emerald-600", label: "Official Holiday" },
  training: { bg: "bg-purple-600 text-white", text: "text-purple-700", dot: "bg-purple-600", label: "Training & Cohorts" },
  organization: { bg: "bg-indigo-600 text-white", text: "text-indigo-700", dot: "bg-indigo-600", label: "Company Event" },
  team: { bg: "bg-sky-600 text-white", text: "text-sky-700", dot: "bg-sky-600", label: "Team Event" },
  general: { bg: "bg-teal-600 text-white", text: "text-teal-700", dot: "bg-teal-600", label: "General" },
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

export function UnifiedCalendarApp({ mode = "hr", title = "Calendar" }: UnifiedCalendarAppProps) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const profile = useCurrentProfile();

  // Active viewing date (default to current date)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 23));
  // Mini calendar browsing date
  const [miniCalendarDate, setMiniCalendarDate] = useState<Date>(new Date(2026, 9, 23));
  // View mode
  const [viewMode, setViewMode] = useState<"Month" | "Week" | "Day" | "List">("Month");

  // Active Category Filters
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({
    Meetings: true,
    Birthday: true,
    leave: true,
    holiday: true,
    training: true,
    organization: true,
    team: true,
    general: true,
  });

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
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: format(new Date(2026, 9, 23), "yyyy-MM-dd"),
    startTime: "10:00",
    endTime: "11:00",
    allDay: false,
    category: "Meetings",
    location: "",
    description: "",
    visibility: "private",
    shares: [] as { userId: string; permission: "view" | "edit" }[],
    reminders: [
      { id: "rem-1", minutesBefore: 60, channel: "both" as "email" | "in_app" | "both" },
    ],
  });

  // Edit Event Form State
  const [editForm, setEditForm] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    allDay: false,
    category: "Meetings",
    location: "",
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

  // 0. Fetch Categories
  const { data: dbCategories = [] } = useQuery<CalendarCategory[]>({
    queryKey: ["calendar-categories"],
    queryFn: async () => {
      try {
        const res = await api.get<{ categories: CalendarCategory[] }>("/api/calendar/categories");
        return res?.categories || [];
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

  // 1. Fetch Primary Database Calendar Events
  const { data: primaryEvents = [], isLoading: isLoadingPrimary } = useQuery<CalendarEventItem[]>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/calendar/events");
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
            userId: e.userId,
            tenantId: e.tenantId,
            isShared: Boolean(e.isShared),
            userPermission: e.userPermission || (e.userId === user?.id ? "owner" : "view"),
            shares: Array.isArray(e.shares) ? e.shares : [],
            reminders: Array.isArray(e.reminders) ? e.reminders : [],
            sourceDomain: "calendar",
          } as CalendarEventItem;
        });
      } catch (err) {
        console.error("Failed to load calendar events:", err);
        return [];
      }
    },
  });

  // 2. Fetch HR Composite Projections (Approved Leaves, Official Holidays, Training Cohorts, Meetings, Birthdays)
  const { data: hrCompositeEvents = [] } = useQuery<CalendarEventItem[]>({
    queryKey: ["hr-calendar-composite-events"],
    queryFn: async () => {
      try {
        const res = await api.get<any[]>("/hr/calendar/events");
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

  // Filtered Events based on active category checkboxes
  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      const cat = (e.category || "general").toLowerCase();
      if (cat === "birthday") {
        return activeCategories.Birthday !== false && activeCategories.birthday !== false;
      }
      if (cat === "meeting" || cat === "meetings") {
        return activeCategories.Meetings !== false && activeCategories.meeting !== false;
      }
      return activeCategories[e.category] ?? true;
    });
  }, [allEvents, activeCategories]);

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
      setNewEvent({
        title: "",
        date: format(currentDate, "yyyy-MM-dd"),
        startTime: "10:00",
        endTime: "11:00",
        allDay: false,
        category: "Meetings",
        location: "",
        description: "",
        visibility: "private",
        shares: [],
        reminders: [{ id: "rem-1", minutesBefore: 60, channel: "both" }],
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create event");
    },
  });

  // Update Event Mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/api/calendar/events/${id}`, payload);
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Calendar event updated successfully!");
      setIsEditingEvent(false);
      setDetailsModalOpen(false);
      setSelectedEvent(null);
    },
    onError: (err: any) => {
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

    const startDateTime = newEvent.allDay
      ? `${newEvent.date}T00:00:00`
      : `${newEvent.date}T${newEvent.startTime || "10:00"}:00`;
    const endDateTime = newEvent.allDay
      ? `${newEvent.date}T23:59:59`
      : `${newEvent.date}T${newEvent.endTime || "11:00"}:00`;

    const sharedWith = newEvent.shares.length > 0
      ? newEvent.shares.map((s) => ({ recipientId: s.userId, permission: s.permission }))
      : undefined;

    createEventMutation.mutate({
      title: newEvent.title.trim(),
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: newEvent.allDay,
      category: newEvent.category,
      location: newEvent.location.trim() || undefined,
      description: newEvent.description.trim() || undefined,
      visibility: newEvent.visibility,
      sharedWith,
      reminders: newEvent.reminders.length > 0 ? newEvent.reminders : undefined,
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
      description: evt.description || "",
      reminders: evt.reminders || [],
    });
    setDetailsModalOpen(true);
  };

  // Handle Update Submit
  const handleUpdateSubmit = () => {
    if (!selectedEvent) return;
    if (!editForm.title.trim()) {
      toast.error("Event title is required");
      return;
    }

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
        description: editForm.description.trim() || undefined,
        reminders: editForm.reminders,
      },
    });
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
    setCurrentDate(new Date(2026, 9, 23));
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
      `"${(e.reminders || []).map((r) => `${r.minutesBefore}m:${r.channel}`).join("; ")}"`,
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
    profile?.role === "admin" ||
    profile?.role === "super_admin";

  const canUserEdit = isUserOwnerOrAdmin || selectedEvent?.userPermission === "edit";

  // All Available Categories for Selectors
  const availableCategories = useMemo(() => {
    const list: string[] = ["Meetings", "Flights", "Birthday", "Conference", "organization", "team", "leave", "holiday", "training"];
    for (const cat of dbCategories) {
      if (!list.includes(cat.name)) {
        list.push(cat.name);
      }
    }
    return list;
  }, [dbCategories]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Create Event CTA */}
          <Button
            onClick={() => {
              setNewEvent({
                title: "",
                date: format(currentDate, "yyyy-MM-dd"),
                startTime: "10:00",
                endTime: "11:00",
                allDay: false,
                category: "Meetings",
                location: "",
                description: "",
                visibility: "private",
                shares: [],
                reminders: [{ id: "rem-1", minutesBefore: 60, channel: "both" }],
              });
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
                const isTodayDate = isSameDay(d, new Date(2026, 9, 23));
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
              <Badge variant="outline" className="text-[10px] font-mono">
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
                  const isItemToday = isSameDay(itemDate, new Date(2026, 9, 23));
                  const isItemTomorrow = isSameDay(itemDate, addDays(new Date(2026, 9, 23), 1));
                  const timeLabel = isItemToday
                    ? `Today, ${format(itemDate, "h:mm a")}`
                    : isItemTomorrow
                    ? `Tomorrow, ${format(itemDate, "h:mm a")}`
                    : format(itemDate, "dd MMM, h:mm a");

                  const isBirthday = item.category?.toLowerCase() === "birthday" || item.id.startsWith("birthday-");

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
                            alt={item.employeeName || item.title}
                            className="size-5 rounded-full object-cover shrink-0 ring-1 ring-rose-400 mt-0.5"
                          />
                        ) : (
                          <div className="size-5 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                            {item.employeeInitials || "BD"}
                          </div>
                        )
                      ) : (
                        <span className={cn("size-2 rounded-full mt-1.5 flex-shrink-0", style.dot)} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
                        <p className="font-semibold text-foreground text-xs mt-0.5 truncate">{item.title}</p>
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
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded-full">
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
                const isTodayDate = isSameDay(d, new Date(2026, 9, 23));

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setNewEvent((prev) => ({
                        ...prev,
                        date: dayStr,
                        startTime: "10:00",
                        endTime: "11:00",
                      }));
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
                                    alt={evt.employeeName || evt.title}
                                    className="size-3.5 rounded-full object-cover shrink-0 ring-1 ring-white/60"
                                  />
                                ) : (
                                  <span className="size-3.5 rounded-full bg-white/30 text-[8px] font-bold flex items-center justify-center shrink-0">
                                    {evt.employeeInitials || "BD"}
                                  </span>
                                )
                              )}
                              <span className="truncate">{evt.title}</span>
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
                <div key={i} className={cn(isSameDay(d, new Date(2026, 9, 23)) && "text-teal-600")}>
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
                      setNewEvent((prev) => ({ ...prev, date: dayStr }));
                      setCreateModalOpen(true);
                    }}
                    className="p-2 space-y-2 hover:bg-muted/10 cursor-pointer min-h-[400px]"
                  >
                    {dayEvents.map((evt) => {
                      const isBirthday = evt.category?.toLowerCase() === "birthday" || evt.id.startsWith("birthday-");
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
                                  alt={evt.employeeName || evt.title}
                                  className="size-4 rounded-full object-cover shrink-0 ring-1 ring-white/60"
                                />
                              ) : (
                                <span className="size-4 rounded-full bg-white/30 text-[9px] font-bold flex items-center justify-center shrink-0">
                                  {evt.employeeInitials || "BD"}
                                </span>
                              )
                            )}
                            <p className="truncate">{evt.title}</p>
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
                  setNewEvent((prev) => ({ ...prev, date: format(currentDate, "yyyy-MM-dd") }));
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
                                alt={evt.employeeName || evt.title}
                                className="size-10 rounded-full object-cover shrink-0 ring-2 ring-white/80 shadow-xs"
                              />
                            ) : (
                              <div className="size-10 rounded-full bg-white/20 text-white font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-white/50">
                                {evt.employeeInitials || "BD"}
                              </div>
                            )
                          )}
                          <div>
                            <h4 className="font-bold text-sm">{evt.title}</h4>
                            <p className="text-xs opacity-85 mt-0.5">
                              {format(new Date(evt.startDate), "h:mm a")}
                              {evt.endDate ? ` – ${format(new Date(evt.endDate), "h:mm a")}` : ""}
                              {evt.location ? ` • ${evt.location}` : ""}
                            </p>
                            {evt.description && <p className="text-xs opacity-75 mt-1 line-clamp-1">{evt.description}</p>}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs uppercase font-mono">
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
                            alt={evt.employeeName || evt.title}
                            className="size-8 rounded-full object-cover shrink-0 ring-1 ring-rose-400"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {evt.employeeInitials || "BD"}
                          </div>
                        )
                      ) : (
                        <span className={cn("size-3 rounded-full shrink-0", evt.color ? evt.color.split(" ")[0] : "bg-teal-600")} />
                      )}
                      <div>
                        <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
                          <span>{evt.title}</span>
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
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="text-xs mt-1"
                />
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
                  className="text-xs mt-1"
                  disabled={newEvent.allDay}
                />
              </div>
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

            <div>
              <Label className="text-xs font-medium">Location / Meeting Link</Label>
              <Input
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="e.g. Conference Room B / Zoom URL"
                className="text-xs mt-1"
              />
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
                selectedMembers={newEvent.shares}
                onMembersChange={(updated) => setNewEvent({ ...newEvent, shares: updated })}
                placeholder="Search and select organization members..."
              />
            </div>

            {/* Configurable Reminders Section */}
            <div className="border-t pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Bell className="size-3.5 text-teal-600" /> Reminders & Notifications
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    const newRemId = `rem-${Date.now()}`;
                    setNewEvent({
                      ...newEvent,
                      reminders: [
                        ...newEvent.reminders,
                        { id: newRemId, minutesBefore: 60, channel: "both" },
                      ],
                    });
                  }}
                  className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add Reminder
                </button>
              </div>

              {newEvent.reminders.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">No reminders configured.</p>
              ) : (
                <div className="space-y-2">
                  {newEvent.reminders.map((rem, idx) => (
                    <div key={rem.id || idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
                      <div className="flex-1">
                        <Select
                          value={String(rem.minutesBefore)}
                          onValueChange={(val) => {
                            const updated = [...newEvent.reminders];
                            updated[idx].minutesBefore = parseInt(val, 10);
                            setNewEvent({ ...newEvent, reminders: updated });
                          }}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="390">390 minutes before (6.5 hours)</SelectItem>
                            <SelectItem value="60">60 minutes before (1 hour)</SelectItem>
                            <SelectItem value="30">30 minutes before</SelectItem>
                            <SelectItem value="15">15 minutes before</SelectItem>
                            <SelectItem value="0">At event time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-32">
                        <Select
                          value={rem.channel}
                          onValueChange={(val: any) => {
                            const updated = [...newEvent.reminders];
                            updated[idx].channel = val;
                            setNewEvent({ ...newEvent, reminders: updated });
                          }}
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
                        onClick={() => {
                          const updated = newEvent.reminders.filter((_, i) => i !== idx);
                          setNewEvent({ ...newEvent, reminders: updated });
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                        title="Remove reminder"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                <span className="text-xs font-mono text-muted-foreground">
                  {format(new Date(selectedEvent.startDate), "PPP")}
                </span>
              </div>
              <DialogTitle className="text-base font-bold mt-2">{selectedEvent.title}</DialogTitle>
              <DialogDescription className="text-xs">
                {selectedEvent.isShared
                  ? `Shared with you (${selectedEvent.userPermission === "edit" ? "Edit permission" : "View only"})`
                  : "Private Event"}
              </DialogDescription>
            </DialogHeader>

            {isEditingEvent ? (
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
                    <Label className="text-xs font-medium">Date</Label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="text-xs mt-1"
                    />
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium">Start Time</Label>
                    <Input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">End Time</Label>
                    <Input
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Location</Label>
                  <Input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="text-xs mt-1 h-18"
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-3 py-2 text-xs">
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
                        <span className="text-sm">🎂</span>
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-400 truncate">
                          {selectedEvent.employeeName || selectedEvent.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Annual birthday celebration projected from verified employee profile.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4 text-teal-600" />
                  <span>
                    {format(new Date(selectedEvent.startDate), "h:mm a")}
                    {selectedEvent.endDate ? ` – ${format(new Date(selectedEvent.endDate), "h:mm a")}` : ""}
                  </span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4 text-rose-500" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="p-3 bg-muted/30 rounded-lg text-foreground border leading-relaxed">
                    {selectedEvent.description}
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
                            {rem.minutesBefore === 0
                              ? "At event time"
                              : `${rem.minutesBefore} minutes before`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {rem.channel === "both" ? "Email & In-App" : rem.channel}
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

                {/* Shares list */}
                {selectedEvent.shares && selectedEvent.shares.length > 0 && (
                  <div className="border-t pt-2">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Shared Access ({selectedEvent.shares.length})
                    </Label>
                    <div className="space-y-1">
                      {selectedEvent.shares.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-xs">
                          <span className="font-mono text-[11px] truncate">{s.recipientId}</span>
                          <div className="flex items-center gap-2">
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
                          value={shareInput.recipientId}
                          onChange={(userId) => setShareInput({ ...shareInput, recipientId: userId })}
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
              {isEditingEvent ? (
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
                  <div>
                    {isUserOwnerOrAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this calendar event?")) {
                            deleteEventMutation.mutate(selectedEvent.id);
                          }
                        }}
                        className="gap-1.5"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canUserEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingEvent(true)}
                        className="gap-1.5"
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
    </div>
  );
}

export default UnifiedCalendarApp;
