import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Tag,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  CalendarCheck,
  FolderKanban,
  Video,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
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

export const Route = createFileRoute("/_authenticated/_app/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Company Calendar & Schedules — Master HRMS" }] }),
});

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  category: "team" | "work" | "external" | "projects" | "apps" | "design" | "holiday";
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees?: string[];
  color?: string;
};

const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  team: { label: "Team Events", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  work: { label: "Work & Tasks", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  external: { label: "External Clients", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-500/15", border: "border-rose-500/30" },
  projects: { label: "Project Milestones", color: "text-sky-700 dark:text-sky-300", bg: "bg-sky-500/15", border: "border-sky-500/30" },
  apps: { label: "App Releases", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/15", border: "border-purple-500/30" },
  design: { label: "Design Sprints", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-500/15", border: "border-indigo-500/30" },
  holiday: { label: "Official Holiday", color: "text-pink-700 dark:text-pink-300", bg: "bg-pink-500/15", border: "border-pink-500/30" },
};

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Quarterly Townhall & Review",
    description: "Company-wide review and quarterly achievement awards presentation.",
    category: "team",
    date: format(addDays(new Date(), 2), "yyyy-MM-dd"),
    startTime: "10:00",
    endTime: "11:30",
    location: "Main Auditorium & Zoom",
  },
  {
    id: "evt-2",
    title: "Client Sprint Retrospective",
    description: "Review deliverables with enterprise client leadership.",
    category: "external",
    date: format(addDays(new Date(), 4), "yyyy-MM-dd"),
    startTime: "14:00",
    endTime: "15:00",
    location: "Google Meet",
  },
  {
    id: "evt-3",
    title: "Design System UI Workshop",
    description: "Hands-on session for design tokens and component standards.",
    category: "design",
    date: format(addDays(new Date(), 6), "yyyy-MM-dd"),
    startTime: "16:00",
    endTime: "17:30",
    location: "Design Studio",
  },
  {
    id: "evt-4",
    title: "HRMS Cloud Release v4.2",
    description: "Staging deployment and final sanity tests.",
    category: "apps",
    date: format(addDays(new Date(), 8), "yyyy-MM-dd"),
    startTime: "18:00",
    endTime: "20:00",
    location: "DevOps Staging",
  },
];

export function CalendarPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem(`hrms_calendar_events_${tenantId}`);
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateClick, setSelectedDateClick] = useState<Date | null>(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    category: "team" as CalendarEvent["category"],
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "10:00",
    endTime: "11:00",
    location: "",
  });

  function saveEvents(newEvents: CalendarEvent[]) {
    setEvents(newEvents);
    localStorage.setItem(`hrms_calendar_events_${tenantId}`, JSON.stringify(newEvents));
  }

  function handleCreateEvent() {
    if (!eventForm.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    const newEvt: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      category: eventForm.category,
      date: eventForm.date,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
      location: eventForm.location.trim(),
    };

    saveEvents([...events, newEvt]);
    setIsAddModalOpen(false);
    setEventForm({
      title: "",
      description: "",
      category: "team",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "10:00",
      endTime: "11:00",
      location: "",
    });
    toast.success("Calendar event scheduled successfully!");
  }

  function handleDeleteEvent(id: string) {
    saveEvents(events.filter((e) => e.id !== id));
    setSelectedEvent(null);
    toast.success("Event removed from calendar.");
  }

  function exportCalendarCSV() {
    if (events.length === 0) return toast.error("No events to export.");
    const headers = ["Title", "Category", "Date", "Start Time", "End Time", "Location", "Description"];
    const rows = events.map((e) => [
      `"${e.title}"`,
      `"${CATEGORY_MAP[e.category]?.label || e.category}"`,
      `"${e.date}"`,
      `"${e.startTime || ""}"`,
      `"${e.endTime || ""}"`,
      `"${e.location || ""}"`,
      `"${e.description || ""}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `calendar_schedules_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    toast.success("Calendar exported to CSV!");
  }

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (selectedCategory === "all") return events;
    return events.filter((e) => e.category === selectedCategory);
  }, [events, selectedCategory]);

  // Month interval days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return [...events]
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [events]);

  return (
    <div className="space-y-5 max-w-full pb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-5 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-foreground">Company Calendar</h1>
            <Badge variant="outline" className="text-[10px] font-mono">
              {filteredEvents.length} Events
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unified schedule for company meetings, sprints, sprint demos, and holidays.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCalendarCSV} className="gap-1.5 text-xs font-semibold">
            <Download className="size-3.5" /> Export
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEventForm({
                title: "",
                description: "",
                category: "team",
                date: format(new Date(), "yyyy-MM-dd"),
                startTime: "10:00",
                endTime: "11:00",
                location: "",
              });
              setIsAddModalOpen(true);
            }}
            className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" /> Create Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Categories & Upcoming */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Event Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-left",
                    selectedCategory === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Layers className="size-3.5" /> All Categories
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{events.length}</Badge>
                </button>

                {Object.entries(CATEGORY_MAP).map(([key, cat]) => {
                  const count = events.filter((e) => e.category === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-left",
                        selectedCategory === key ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", cat.bg, "border", cat.border)} />
                        {cat.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">{count}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5">
                Upcoming Schedules
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No upcoming events scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((evt) => {
                    const cat = CATEGORY_MAP[evt.category] || CATEGORY_MAP.team;
                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-xs",
                          cat.bg,
                          cat.border
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold truncate text-foreground">{evt.title}</span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{evt.date}</span>
                        </div>
                        {evt.startTime && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="size-3" /> {evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Area: Calendar Grid */}
        <div className="lg:col-span-9 space-y-4">
          <Card className="p-4">
            {/* Month Nav & View Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-3 border-b">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  {format(currentDate, "MMMM yyyy")}
                </h2>
                <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    title="Previous Month"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs font-bold px-2.5"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    title="Next Month"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40">
                {(["month", "week", "day"] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={viewMode === mode ? "secondary" : "ghost"}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "h-7 px-3 text-xs font-bold capitalize",
                      viewMode === mode && "bg-background shadow-2xs text-foreground"
                    )}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 text-center font-bold text-xs text-muted-foreground border-b pb-2 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            {/* Month Day Grid */}
            <div className="grid grid-cols-7 gap-1 min-h-[520px]">
              {monthDays.map((day, idx) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const dayEvents = filteredEvents.filter((e) => e.date === dayStr);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDateClick(day);
                      setEventForm((prev) => ({ ...prev, date: dayStr }));
                      setIsAddModalOpen(true);
                    }}
                    className={cn(
                      "min-h-[90px] p-1.5 rounded-lg border border-border/40 flex flex-col justify-between transition-all cursor-pointer hover:border-primary/50 hover:bg-muted/30",
                      !isCurrentMonth && "opacity-30 bg-muted/10",
                      isToday && "border-primary/60 bg-primary/5 ring-1 ring-primary/40 font-bold"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "size-5.5 rounded-full flex items-center justify-center text-xs",
                          isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] font-mono text-muted-foreground font-semibold">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Events on this day */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => {
                        const cat = CATEGORY_MAP[evt.category] || CATEGORY_MAP.team;
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(evt);
                            }}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded truncate font-medium border leading-tight",
                              cat.bg,
                              cat.border,
                              cat.color
                            )}
                            title={`${evt.title} (${evt.startTime || ""})`}
                          >
                            {evt.startTime && <span className="font-mono text-[9px] mr-1">{evt.startTime}</span>}
                            {evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] font-bold text-muted-foreground text-center">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Create Event */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-primary" /> Schedule Calendar Event
            </DialogTitle>
            <DialogDescription>
              Create a new company meeting, project milestone, or sprint event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold">Event Title *</Label>
              <Input
                placeholder="e.g. Q1 Product Roadmapping"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Category</Label>
                <Select
                  value={eventForm.category}
                  onValueChange={(val: any) => setEventForm({ ...eventForm, category: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Date *</Label>
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Start Time</Label>
                <Input
                  type="time"
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">End Time</Label>
                <Input
                  type="time"
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Location / Meeting Link</Label>
              <Input
                placeholder="e.g. Room 4B / Zoom URL"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Description & Agenda</Label>
              <Textarea
                rows={3}
                placeholder="Key talking points and objectives..."
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateEvent} className="font-bold">
              Save Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: View / Manage Event Details */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <Badge
                  className={cn(
                    "text-xs font-semibold",
                    CATEGORY_MAP[selectedEvent.category]?.bg,
                    CATEGORY_MAP[selectedEvent.category]?.color,
                    CATEGORY_MAP[selectedEvent.category]?.border
                  )}
                >
                  {CATEGORY_MAP[selectedEvent.category]?.label}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">{selectedEvent.date}</span>
              </div>
              <DialogTitle className="text-lg font-bold mt-2">{selectedEvent.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {(selectedEvent.startTime || selectedEvent.endTime) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4 text-primary" />
                  <span>
                    {selectedEvent.startTime || "09:00"} – {selectedEvent.endTime || "10:00"}
                  </span>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 text-rose-500" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="p-3 bg-muted/40 rounded-lg text-foreground border leading-relaxed">
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
              <Button size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
