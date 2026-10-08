import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
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
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Tag,
  Trash2,
  Video,
  GraduationCap,
  CalendarCheck,
  Palmtree,
  CheckCircle2,
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
} from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/hr/calendar")({
  component: HrCalendarPage,
  head: () => ({ meta: [{ title: "Company Calendar & Schedules — Master HRMS" }] }),
});

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  category: "meeting" | "training" | "leave" | "holiday" | "event";
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  sourceDomain: string;
  sourceId: string;
  linkTo: string;
  status?: string;
  badgeColor?: string;
}

export function HrCalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["hr-calendar-events", format(monthStart, "yyyy-MM"), selectedCategory],
    queryFn: async () => {
      const res = await api.get<CalendarEvent[]>("/hr/calendar/events", {
        params: {
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
          category: selectedCategory !== "all" ? selectedCategory : undefined,
        },
      });
      return res || [];
    },
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: format(new Date(), "yyyy-MM-dd'T'10:00"),
    endDate: format(new Date(), "yyyy-MM-dd'T'11:00"),
    allDay: false,
    category: "company",
    location: "",
  });

  const createEventMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await api.post("/hr/calendar/events", payload);
    },
    onSuccess: () => {
      toast.success("Calendar event scheduled");
      setIsAddModalOpen(false);
      setForm({
        title: "",
        description: "",
        startDate: format(new Date(), "yyyy-MM-dd'T'10:00"),
        endDate: format(new Date(), "yyyy-MM-dd'T'11:00"),
        allDay: false,
        category: "company",
        location: "",
      });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-events"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create event");
    },
  });

  // Calendar Grid Days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  // Stats
  const meetingCount = events.filter((e) => e.category === "meeting").length;
  const trainingCount = events.filter((e) => e.category === "training").length;
  const leaveCount = events.filter((e) => e.category === "leave").length;
  const holidayCount = events.filter((e) => e.category === "holiday").length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "meeting":
        return <Video className="h-3 w-3" />;
      case "training":
        return <GraduationCap className="h-3 w-3" />;
      case "leave":
        return <Palmtree className="h-3 w-3" />;
      case "holiday":
        return <CalendarCheck className="h-3 w-3" />;
      default:
        return <Tag className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Calendar"
        description="Unified workplace schedule of meetings, training cohorts, approved employee leaves, and holidays"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              Month View
            </Button>
            <Button
              variant={viewMode === "agenda" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("agenda")}
            >
              Agenda
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </div>
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="Total Scheduled"
          value={isLoading ? "..." : events.length}
          description="Events this month"
          icon={CalendarIcon}
          variant="primary"
        />
        <StatCard
          title="Meetings"
          value={isLoading ? "..." : meetingCount}
          description="Scheduled sessions"
          icon={Video}
          variant="secondary"
        />
        <StatCard
          title="Training Cohorts"
          value={isLoading ? "..." : trainingCount}
          description="Live learning sessions"
          icon={GraduationCap}
          variant="secondary"
        />
        <StatCard
          title="Approved Absences"
          value={isLoading ? "..." : leaveCount}
          description="Leaves & Holidays"
          icon={Palmtree}
          variant="secondary"
        />
      </StatsOverviewGrid>

      {/* Navigation & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-bold text-base ml-2">
            {format(currentDate, "MMMM yyyy")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Filter Category:</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="leave">Leaves</SelectItem>
              <SelectItem value="holiday">Holidays</SelectItem>
              <SelectItem value="event">Ad-Hoc Events</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Calendar View */}
      {viewMode === "month" ? (
        <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y border-b">
            {calendarDays.map((day, idx) => {
              const isCurrMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const dayEvents = events.filter((e) => isSameDay(new Date(e.startDate), day));

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-28 p-1.5 flex flex-col gap-1 transition-colors",
                    !isCurrMonth && "bg-muted/15 text-muted-foreground/50",
                    isToday && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between px-1">
                    <span
                      className={cn(
                        "text-xs font-medium inline-flex size-5 items-center justify-center rounded-full",
                        isToday && "bg-primary text-primary-foreground font-bold"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1 overflow-y-auto max-h-24">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate flex items-center gap-1 font-medium border transition-colors hover:opacity-80",
                          event.badgeColor || "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {getCategoryIcon(event.category)}
                        <span className="truncate">{event.title}</span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-medium pl-1 block">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda List View */
        <div className="bg-card border rounded-xl divide-y">
          {events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No scheduled events found for this interval.
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-secondary text-foreground">
                    {getCategoryIcon(event.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {event.category}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(event.startDate), "MMM d, yyyy HH:mm")}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View Source
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getCategoryIcon(selectedEvent.category)}
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription className="capitalize">
              Category: {selectedEvent?.category}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-3 py-2 text-sm">
              {selectedEvent.description && (
                <div>
                  <span className="text-xs text-muted-foreground block">Description:</span>
                  <p>{selectedEvent.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block">Start Time:</span>
                  <span className="font-semibold">{format(new Date(selectedEvent.startDate), "PPp")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">End Time:</span>
                  <span className="font-semibold">{format(new Date(selectedEvent.endDate), "PPp")}</span>
                </div>
              </div>
              {selectedEvent.location && (
                <div className="text-xs">
                  <span className="text-muted-foreground block">Location / Room:</span>
                  <span className="font-semibold">{selectedEvent.location}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
            {selectedEvent?.linkTo && (
              <Button asChild>
                <a href={selectedEvent.linkTo}>Open Domain Module</a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Ad-Hoc Event Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Workplace Event</DialogTitle>
            <DialogDescription>
              Create an ad-hoc company event visible across tenant calendars.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createEventMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Event Title</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Q4 Company All-Hands"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time</Label>
                <Input
                  type="datetime-local"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location / Meeting URL</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Auditorium or Zoom URL"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional agenda or details..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Scheduling..." : "Save Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
