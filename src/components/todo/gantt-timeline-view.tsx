import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
  DialogDescription,
  DialogFooter,
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
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CheckSquare,
  AlertCircle,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface GanttTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "high" | "medium" | "low" | string;
  tag?: string;
  startDate: Date;
  dueDate: Date;
  progress: number; // 0 - 100
  source: "todo" | "project";
}

interface GanttTimelineViewProps {
  onSwitchToList?: () => void;
}

export function GanttTimelineView({ onSwitchToList }: GanttTimelineViewProps) {
  const qc = useQueryClient();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [timelineScale, setTimelineScale] = useState<"days" | "weeks">("days");
  const [currentWindowOffset, setCurrentWindowOffset] = useState<number>(0);

  // Edit / Reschedule Modal State
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCompleted, setEditCompleted] = useState(false);

  // Add Task Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [newPriority, setNewPriority] = useState("medium");
  const [newTag, setNewTag] = useState("projects");

  // 1. Fetch Todos from authoritative backend
  const {
    data: todosData,
    isLoading: loadingTodos,
    isError: errorTodos,
    refetch: refetchTodos,
  } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/todos");
      return res.data || [];
    },
  });

  // 2. Fetch Project Tasks
  const { data: projectsData } = useQuery({
    queryKey: ["projects-tasks"],
    queryFn: async () => {
      try {
        const res = await api.get<{ tasks?: any[] }>("/projects");
        return res?.tasks || [];
      } catch {
        return [];
      }
    },
  });

  // Normalize Tasks into unified Gantt items
  const tasks: GanttTask[] = useMemo(() => {
    const list: GanttTask[] = [];

    // Map workspace todos
    if (Array.isArray(todosData)) {
      for (const t of todosData) {
        const created = t.createdAt ? new Date(t.createdAt) : new Date();
        const due = t.dueDate ? new Date(t.dueDate) : new Date(created.getTime() + 5 * 86400000);
        list.push({
          id: t.id,
          title: t.title,
          description: t.description || "",
          completed: Boolean(t.completed),
          priority: t.priority || "medium",
          tag: t.tag || "general",
          startDate: created,
          dueDate: due,
          progress: t.completed ? 100 : 35,
          source: "todo",
        });
      }
    }

    // Map project tasks if available
    if (Array.isArray(projectsData)) {
      for (const pt of projectsData) {
        const created = pt.createdAt ? new Date(pt.createdAt) : new Date();
        const due = pt.dueDate ? new Date(pt.dueDate) : new Date(created.getTime() + 7 * 86400000);
        list.push({
          id: pt.id,
          title: pt.title,
          description: pt.description || "",
          completed: pt.status === "done" || pt.status === "completed",
          priority: pt.priority || "medium",
          tag: "project",
          startDate: created,
          dueDate: due,
          progress: pt.status === "done" ? 100 : pt.status === "in_progress" ? 60 : 15,
          source: "project",
        });
      }
    }

    return list;
  }, [todosData, projectsData]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === "all" || t.priority.toLowerCase() === filterPriority.toLowerCase();
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, filterPriority]);

  // Generate Date Range for the Gantt Grid
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() - 3 + currentWindowOffset * 7);

    const totalDays = timelineScale === "days" ? 14 : 28;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [timelineScale, currentWindowOffset]);

  const minGridTime = timelineDates[0].getTime();
  const maxGridTime = timelineDates[timelineDates.length - 1].getTime() + 86400000;
  const totalGridDuration = maxGridTime - minGridTime;

  // 3. Update / Reschedule Mutation (Mutates PostgreSQL via Express API)
  const updateTodoMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { title?: string; dueDate?: string; priority?: string; completed?: boolean };
    }) => {
      return await api.put(`/todos/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Task updated & persisted to PostgreSQL!");
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to persist task update");
    },
  });

  // 4. Create Todo Mutation
  const createTodoMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/todos", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos"] });
      toast.success("New task created and scheduled on Gantt timeline!");
      setIsAddOpen(false);
      setNewTitle("");
      setNewDescription("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create task");
    },
  });

  // 5. Delete Todo Mutation
  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/todos/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Task removed from workspace");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete task");
    },
  });

  // Fast toggle complete
  const handleToggleComplete = (task: GanttTask) => {
    if (task.source === "todo") {
      updateTodoMutation.mutate({
        id: task.id,
        data: { completed: !task.completed },
      });
    } else {
      toast.info("Project tasks must be marked complete through the project board.");
    }
  };

  const handleOpenEdit = (task: GanttTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate.toISOString().slice(0, 10));
    setEditPriority(task.priority);
    setEditCompleted(task.completed);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    updateTodoMutation.mutate({
      id: editingTask.id,
      data: {
        title: editTitle.trim(),
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
        priority: editPriority,
        completed: editCompleted,
      },
    });
  };

  const todayStr = new Date().toDateString();

  return (
    <div className="space-y-4">
      {/* Header Controls & Filter Bar */}
      <Card className="border shadow-2xs bg-card">
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <CalendarIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-bold text-foreground">
                  Interactive Gantt Timeline
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                  Live Supabase Persistence
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Horizontal schedule view of your workspace tasks and milestone timelines with synchronized database mutations.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {/* View Switcher button */}
            {onSwitchToList && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToList}
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                <CheckSquare className="size-3.5" />
                List View
              </Button>
            )}

            {/* Time window step controls */}
            <div className="flex items-center border rounded-lg overflow-hidden bg-background">
              <button
                type="button"
                onClick={() => setCurrentWindowOffset((prev) => prev - 1)}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Previous Window"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentWindowOffset(0)}
                className="px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground border-x"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentWindowOffset((prev) => prev + 1)}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Next Window"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Day / Week Scale Switcher */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted text-[11px]">
              <button
                type="button"
                onClick={() => setTimelineScale("days")}
                className={cn(
                  "px-2 py-1 rounded font-bold transition-all",
                  timelineScale === "days" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                )}
              >
                14 Days
              </button>
              <button
                type="button"
                onClick={() => setTimelineScale("weeks")}
                className={cn(
                  "px-2 py-1 rounded font-bold transition-all",
                  timelineScale === "weeks" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                )}
              >
                28 Days
              </button>
            </div>

            <Button onClick={() => setIsAddOpen(true)} size="sm" className="h-8 text-xs gap-1.5">
              <Plus className="size-3.5" />
              Add Task
            </Button>
          </div>
        </CardHeader>

        {/* Filter & Search Toolbar */}
        <CardContent className="p-3 bg-muted/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search tasks on timeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Priority:</span>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-8 text-xs w-[120px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
                <SelectItem value="high" className="text-xs">High</SelectItem>
                <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                <SelectItem value="low" className="text-xs">Low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTodos()}
              disabled={loadingTodos}
              className="size-8 p-0"
              title="Refresh timeline from database"
            >
              <RefreshCw className={cn("size-3.5", loadingTodos && "animate-spin")} />
            </Button>
          </div>
        </CardContent>

        {/* Interactive Gantt Chart Surface */}
        <div className="overflow-x-auto min-h-[420px]">
          {loadingTodos ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p>Loading timeline tasks from Supabase...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <CalendarIcon className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">No Tasks Scheduled on this Timeline Window</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create a task or change the timeline view window to inspect milestones.
              </p>
              <Button onClick={() => setIsAddOpen(true)} size="sm" className="mt-2 text-xs gap-1.5">
                <Plus className="size-3.5" /> Create Task
              </Button>
            </div>
          ) : (
            <div className="min-w-[900px] divide-y border-b text-xs">
              {/* Timeline Header Row (Dates scale) */}
              <div className="flex items-stretch bg-muted/40 font-mono text-[11px] font-semibold border-b">
                {/* Fixed Task Info Column Header */}
                <div className="w-[300px] shrink-0 p-3 border-r bg-muted/50 font-sans font-bold flex items-center justify-between text-foreground">
                  <span>Task Name & Attributes</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {filteredTasks.length} tasks
                  </Badge>
                </div>

                {/* Day Columns */}
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timelineDates.length}, minmax(0, 1fr))` }}>
                  {timelineDates.map((d, idx) => {
                    const isToday = d.toDateString() === todayStr;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-2 text-center border-r last:border-r-0 flex flex-col items-center justify-center gap-0.5",
                          isToday && "bg-primary/10 text-primary font-bold border-primary/30"
                        )}
                      >
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className={cn("text-xs", isToday ? "text-primary font-bold" : "text-foreground")}>
                          {d.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Task Rows */}
              {filteredTasks.map((task) => {
                // Calculate horizontal bar offset and width relative to the visible grid duration
                const taskStart = Math.max(task.startDate.getTime(), minGridTime);
                const taskEnd = Math.min(task.dueDate.getTime(), maxGridTime);

                const leftPercent = Math.max(
                  0,
                  Math.min(100, ((taskStart - minGridTime) / totalGridDuration) * 100)
                );
                const widthPercent = Math.max(
                  4,
                  Math.min(100 - leftPercent, ((taskEnd - taskStart) / totalGridDuration) * 100)
                );

                const isPriorityHigh = task.priority.toLowerCase() === "high";
                const isPriorityMed = task.priority.toLowerCase() === "medium";

                return (
                  <div key={task.id} className="flex items-center hover:bg-muted/20 transition-colors group">
                    {/* Left Pane: Task Details & Actions */}
                    <div className="w-[300px] shrink-0 p-3 border-r flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(task)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          title={task.completed ? "Mark Incomplete" : "Mark Complete"}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="size-4 text-emerald-600" />
                          ) : (
                            <Circle className="size-4" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <p
                            className={cn(
                              "font-semibold text-xs truncate",
                              task.completed && "line-through text-muted-foreground"
                            )}
                            title={task.title}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-mono px-1 py-0",
                                isPriorityHigh && "border-rose-500/40 text-rose-600 bg-rose-500/10",
                                isPriorityMed && "border-amber-500/40 text-amber-600 bg-amber-500/10",
                                !isPriorityHigh && !isPriorityMed && "text-muted-foreground"
                              )}
                            >
                              {task.priority}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Due: {task.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Row Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(task)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Reschedule / Edit"
                        >
                          <Edit2 className="size-3" />
                        </button>
                        {task.source === "todo" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete task "${task.title}"?`)) {
                                deleteTodoMutation.mutate(task.id);
                              }
                            }}
                            className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right Pane: Gantt Bar Canvas */}
                    <div className="flex-1 relative h-12 flex items-center px-1">
                      {/* Grid background columns guide */}
                      <div
                        className="absolute inset-0 grid pointer-events-none opacity-20"
                        style={{ gridTemplateColumns: `repeat(${timelineDates.length}, minmax(0, 1fr))` }}
                      >
                        {timelineDates.map((_, i) => (
                          <div key={i} className="border-r last:border-r-0 h-full" />
                        ))}
                      </div>

                      {/* Task Timeline Bar */}
                      <div
                        onClick={() => handleOpenEdit(task)}
                        className={cn(
                          "absolute h-7 rounded-lg cursor-pointer transition-all shadow-2xs hover:shadow-sm flex items-center justify-between px-2 overflow-hidden",
                          task.completed
                            ? "bg-emerald-600 text-white"
                            : isPriorityHigh
                            ? "bg-rose-600 text-white"
                            : isPriorityMed
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-700 text-white"
                        )}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        title={`Task: ${task.title}\nDue: ${task.dueDate.toLocaleDateString()}\nStatus: ${task.completed ? "Done" : "In Progress"}`}
                      >
                        {/* Progress Fill Underlay */}
                        <div
                          className="absolute inset-0 bg-white/20 pointer-events-none"
                          style={{ width: `${task.progress}%` }}
                        />

                        {/* Bar Label */}
                        <span className="relative z-10 text-[10px] font-bold truncate">
                          {task.title}
                        </span>
                        <span className="relative z-10 text-[9px] font-mono shrink-0 ml-1 opacity-90">
                          {task.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Edit / Reschedule Modal */}
      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarIcon className="size-4 text-primary" />
              Reschedule & Edit Task
            </DialogTitle>
            <DialogDescription className="text-xs">
              Updates to title, target due dates, and completion status persist directly to the database.
            </DialogDescription>
          </DialogHeader>

          {editingTask && (
            <form onSubmit={handleSaveEdit} className="space-y-3 py-1 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Task Title</Label>
                <Input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Target Due Date</Label>
                  <Input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Priority</Label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high" className="text-xs">High</SelectItem>
                      <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                      <SelectItem value="low" className="text-xs">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="taskCompletedCheckbox"
                  checked={editCompleted}
                  onChange={(e) => setEditCompleted(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                />
                <Label htmlFor="taskCompletedCheckbox" className="text-xs cursor-pointer font-semibold">
                  Mark this task as completed (100% Progress)
                </Label>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTask(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateTodoMutation.isPending}
                  className="text-xs gap-1.5"
                >
                  {updateTodoMutation.isPending && <RefreshCw className="size-3 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Schedule New Task on Gantt
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new actionable milestone to your workspace todo schedule.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTodoMutation.mutate({
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
                dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
                priority: newPriority,
                tag: newTag,
                completed: false,
              });
            }}
            className="space-y-3 py-1 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Task Title *</Label>
              <Input
                required
                placeholder="e.g. Prepare Statutory Q3 Audit Report"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                rows={2}
                placeholder="Optional notes or milestone deliverables..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Due Date *</Label>
                <Input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high" className="text-xs">High</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                    <SelectItem value="low" className="text-xs">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category Tag</Label>
              <Select value={newTag} onValueChange={setNewTag}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="projects" className="text-xs">Client Projects</SelectItem>
                  <SelectItem value="internal" className="text-xs">Internal Operations</SelectItem>
                  <SelectItem value="meetings" className="text-xs">Meeting Deliverables</SelectItem>
                  <SelectItem value="research" className="text-xs">Research & Development</SelectItem>
                  <SelectItem value="reminder" className="text-xs">Personal Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createTodoMutation.isPending || !newTitle.trim()}
                className="text-xs gap-1.5"
              >
                {createTodoMutation.isPending && <RefreshCw className="size-3 animate-spin" />}
                Create & Place on Timeline
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
