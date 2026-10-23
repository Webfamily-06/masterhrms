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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Settings,
  Archive,
  BookOpen,
  Check,
  ChevronDown,
  Trash2,
  CalendarCheck,
  Download,
  Share2,
  Lock,
  Globe,
  Eye,
  Edit2,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  Video,
  GraduationCap,
  Palmtree,
  CheckCircle2,
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
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";

export interface CalendarShare {
  recipientId: string;
  permission: "view" | "edit";
  sharedBy: string;
  createdAt: string;
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
  sourceDomain?: string;
  sourceId?: string;
  linkTo?: string;
  status?: string;
}

interface UnifiedCalendarAppProps {
  mode?: "hr" | "apps" | "canonical";
  title?: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
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
    shareRecipientId: "",
    sharePermission: "view" as "view" | "edit",
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

  // 1. Fetch Primary Database Calendar Events (CRUD + structured sharing)
  const { data: primaryEvents = [], isLoading: isLoadingPrimary } = useQuery<CalendarEventItem[]>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/calendar/events");
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return list.map((e: any) => {
          const cat = e.category || "Meetings";
          const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.Meetings;
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
            sourceDomain: "calendar",
          } as CalendarEventItem;
        });
      } catch (err) {
        console.error("Failed to load calendar events:", err);
        return [];
      }
    },
  });

  // 2. Fetch HR Composite Projections (Approved Leaves, Official Holidays, Training Cohorts, Meetings)
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
            const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.general;
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
        return (activeCategories.Birthday !== false && activeCategories.birthday !== false);
      }
      if (cat === "meeting" || cat === "meetings") {
        return (activeCategories.Meetings !== false && activeCategories.meeting !== false);
      }
      return activeCategories[e.category] ?? true;
    });
  }, [allEvents, activeCategories]);

  // Upcoming Events from today onwards (respects active category filters)
  const upcomingEvents = useMemo(() => {
    const now = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
    return filteredEvents
      .filter((e) => new Date(e.startDate).getTime() >= now - 86400000)
      .slice(0, 5);
  }, [filteredEvents, currentDate]);

  // Month Grid Calculation for Main Calendar
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  // Mini Calendar Days Calculation
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
        shareRecipientId: "",
        sharePermission: "view",
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

    const sharedWith = newEvent.shareRecipientId.trim()
      ? [{ recipientId: newEvent.shareRecipientId.trim(), permission: newEvent.sharePermission }]
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
    const headers = ["Title", "Category", "Start Date", "End Date", "Location", "Description", "Shares"];
    const rows = filteredEvents.map((e) => [
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.startDate}"`,
      `"${e.endDate || ""}"`,
      `"${(e.location || "").replace(/"/g, '""')}"`,
      `"${(e.description || "").replace(/"/g, '""')}"`,
      `"${(e.shares || []).map((s) => `${s.recipientId}:${s.permission}`).join("; ")}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `calendar_schedules_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    toast.success("Calendar exported to CSV!");
  };

  const isProjection =
    selectedEvent &&
    (selectedEvent.sourceDomain === "organization" ||
      selectedEvent.sourceDomain === "leave" ||
      selectedEvent.sourceDomain === "training" ||
      selectedEvent.category === "birthday" ||
      selectedEvent.category === "Birthday" ||
      selectedEvent.category === "holiday" ||
      selectedEvent.id.startsWith("birthday-") ||
      selectedEvent.id.startsWith("holiday-") ||
      selectedEvent.id.startsWith("leave-") ||
      selectedEvent.id.startsWith("training-"));

  const isUserOwnerOrAdmin =
    selectedEvent &&
    !isProjection &&
    (selectedEvent.userPermission === "owner" ||
      selectedEvent.userId === user?.id ||
      profile?.data?.roles?.some((r: string) => ["super_admin", "tenant_admin", "admin", "hr_admin"].includes(r)));

  const canUserEdit =
    selectedEvent &&
    !isProjection &&
    (isUserOwnerOrAdmin || selectedEvent.userPermission === "edit");

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background border-t border-border">
      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border bg-card flex flex-col justify-between">
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Create Button Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-full h-10 flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                <span>Create</span>
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
              <DropdownMenuItem
                onClick={() => {
                  setNewEvent((prev) => ({
                    ...prev,
                    date: format(currentDate, "yyyy-MM-dd"),
                    startTime: "10:00",
                    endTime: "11:00",
                    category: "Meetings",
                  }));
                  setCreateModalOpen(true);
                }}
                className="cursor-pointer font-medium"
              >
                <CalendarCheck className="size-4 mr-2 text-teal-600" />
                Schedule Event
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setNewEvent((prev) => ({
                    ...prev,
                    date: format(currentDate, "yyyy-MM-dd"),
                    startTime: "09:00",
                    endTime: "17:00",
                    category: "Meetings",
                  }));
                  setCreateModalOpen(true);
                }}
                className="cursor-pointer"
              >
                <Clock className="size-4 mr-2 text-amber-500" />
                Schedule Meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mini Calendar Widget */}
          <div className="border border-border/70 rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                onClick={() => setMiniCalendarDate((d) => subMonths(d, 1))}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                {format(miniCalendarDate, "MMM yyyy")}
              </span>
              <button
                onClick={() => setMiniCalendarDate((d) => addMonths(d, 1))}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                title="Next Month"
              >
                <ChevronRight className="size-3.5" />
              </button>
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
                    onClick={() => {
                      setCurrentDate(d);
                    }}
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
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">No upcoming events scheduled.</p>
              ) : (
                upcomingEvents.map((item) => {
                  const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Meetings;
                  const itemDate = new Date(item.startDate);
                  const isItemToday = isSameDay(itemDate, new Date(2026, 9, 23));
                  const isItemTomorrow = isSameDay(itemDate, addDays(new Date(2026, 9, 23), 1));
                  const timeLabel = isItemToday
                    ? `Today, ${format(itemDate, "h:mm a")}`
                    : isItemTomorrow
                    ? `Tomorrow, ${format(itemDate, "h:mm a")}`
                    : format(itemDate, "dd MMM, h:mm a");

                  return (
                    <div
                      key={item.id}
                      onClick={() => openEventDetails(item)}
                      className="flex items-start gap-2.5 text-xs cursor-pointer p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className={cn("size-2 rounded-full mt-1.5 flex-shrink-0", style.dot)} />
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
                onClick={() => {
                  const catName = prompt("Enter new category name:");
                  if (catName && catName.trim()) {
                    setActiveCategories((prev) => ({ ...prev, [catName.trim()]: true }));
                    toast.success(`Category "${catName.trim()}" added!`);
                  }
                }}
                className="size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                title="Add Category"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <div className="space-y-2">
              {Object.keys(activeCategories).map((cat) => {
                const style = CATEGORY_STYLES[cat] || { dot: "bg-teal-600", label: cat };
                return (
                  <label key={cat} className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
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
                      className="rounded border-border text-teal-700 focus:ring-teal-600 size-3.5"
                    />
                    <span className={cn("size-2 rounded-full", style.dot)} />
                    <span className="capitalize">{style.label || cat}</span>
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
            onClick={() => toast.info("Master HRMS Enterprise Calendar v2.0 (Real-time Sync Active)")}
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
                      ? "bg-background text-foreground shadow-2xs"
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
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/20 text-center py-2 text-[11px] font-bold text-muted-foreground uppercase">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Dynamic Month Grid */}
            <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border border-b border-border">
              {calendarDays.map((d, idx) => {
                const dayStr = format(d, "yyyy-MM-dd");
                const inMonth = isSameMonth(d, currentDate);
                const isTodayDate = isSameDay(d, new Date(2026, 9, 23));
                const dayEvents = filteredEvents.filter((e) => e.startDate.startsWith(dayStr));

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
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEventDetails(evt);
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-medium truncate cursor-pointer shadow-2xs transition-transform hover:scale-[1.02] flex items-center justify-between gap-1",
                            evt.color || "bg-teal-600 text-white"
                          )}
                          title={`${evt.title} (${evt.category})`}
                        >
                          <span className="truncate">{evt.title}</span>
                          {evt.isShared && <Share2 className="size-2.5 shrink-0 opacity-80" />}
                        </div>
                      ))}
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
                    {dayEvents.map((evt) => (
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
                        <p className="font-bold truncate">{evt.title}</p>
                        <p className="text-[10px] opacity-80 mt-0.5">
                          {format(new Date(evt.startDate), "h:mm a")}
                        </p>
                      </div>
                    ))}
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
                <p className="text-xs text-muted-foreground">Today's Scheduled Sessions and Action Items</p>
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
                  .map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => openEventDetails(evt)}
                      className={cn(
                        "p-3.5 rounded-xl border border-border flex items-center justify-between cursor-pointer hover:shadow-xs transition-all",
                        evt.color || "bg-teal-600 text-white"
                      )}
                    >
                      <div>
                        <h4 className="font-bold text-sm">{evt.title}</h4>
                        <p className="text-xs opacity-85 mt-0.5">
                          {format(new Date(evt.startDate), "h:mm a")}
                          {evt.endDate ? ` – ${format(new Date(evt.endDate), "h:mm a")}` : ""}
                          {evt.location ? ` • ${evt.location}` : ""}
                        </p>
                        {evt.description && <p className="text-xs opacity-75 mt-1 line-clamp-1">{evt.description}</p>}
                      </div>
                      <Badge variant="secondary" className="text-xs uppercase font-mono">
                        {evt.category}
                      </Badge>
                    </div>
                  ))}
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
              filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => openEventDetails(evt)}
                  className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between hover:border-teal-500/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("size-3 rounded-full shrink-0", evt.color ? evt.color.split(" ")[0] : "bg-teal-600")} />
                    <div>
                      <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
                        <span>{evt.title}</span>
                        {evt.isShared && (
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                            <Share2 className="size-2.5" /> Shared
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
              ))
            )}
          </div>
        )}
      </main>

      {/* ─── CREATE EVENT MODAL ─── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck className="size-5 text-teal-600" /> Create New Event
            </DialogTitle>
            <DialogDescription className="text-xs">
              Schedule meetings, company events, or team conferences. Real-time persisted.
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
                    <SelectItem value="Meetings">Meetings</SelectItem>
                    <SelectItem value="Flights">Flights</SelectItem>
                    <SelectItem value="Birthday">Birthday</SelectItem>
                    <SelectItem value="Conference">Conference</SelectItem>
                    <SelectItem value="organization">Company Event</SelectItem>
                    <SelectItem value="team">Team Event</SelectItem>
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
              <Label className="text-xs font-medium">Location</Label>
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
                className="text-xs mt-1 h-18"
              />
            </div>

            {/* Sharing / Access Control */}
            <div className="border-t pt-2 space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Share2 className="size-3.5 text-teal-600" /> Share with Organization Member
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div className="sm:col-span-2">
                  <OrganizationMemberSelector
                    value={newEvent.shareRecipientId}
                    onChange={(userId) => setNewEvent({ ...newEvent, shareRecipientId: userId })}
                    placeholder="Search or select member..."
                  />
                </div>
                <div>
                  <Select
                    value={newEvent.sharePermission}
                    onValueChange={(val: any) => setNewEvent({ ...newEvent, sharePermission: val })}
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
              </div>
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
          <DialogContent className="max-w-md">
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
                        <SelectItem value="Meetings">Meetings</SelectItem>
                        <SelectItem value="Flights">Flights</SelectItem>
                        <SelectItem value="Birthday">Birthday</SelectItem>
                        <SelectItem value="Conference">Conference</SelectItem>
                        <SelectItem value="organization">Company Event</SelectItem>
                        <SelectItem value="team">Team Event</SelectItem>
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
                {(selectedEvent.category === "birthday" || selectedEvent.id.startsWith("birthday-")) && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                    <span className="text-2xl">🎂</span>
                    <div>
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Employee Birthday Celebration</p>
                      <p className="text-[11px] text-muted-foreground">Annual birthday occurrence projected from authorized employee records.</p>
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
                              {s.permission}
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
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="edit">Edit</SelectItem>
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
