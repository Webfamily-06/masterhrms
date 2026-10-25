"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckSquare,
  Plus,
  Search,
  Calendar,
  Tag,
  Trash2,
  Edit2,
  Clock,
  ListTodo,
  ArrowUpDown,
  CheckCircle2,
  Circle,
  Star,
  User,
  X,
  Send,
  Paperclip,
  History,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingState } from "@/components/system-states/loading-state";
import { EmptyState } from "@/components/system-states/empty-state";

export interface TodoChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoCommentItem {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  createdAt: string;
}

export interface TodoAttachmentItem {
  id: string;
  name: string;
  url: string;
  size?: string;
  uploadedAt?: string;
}

export interface TodoActivityItem {
  id: string;
  text: string;
  timestamp: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "urgent" | "high" | "medium" | "low" | string;
  tag: string;
  startDate: string;
  dueDate: string;
  createdAt: string;
  progress: number;
  starred: boolean;
  assignedTo?: string | null;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    name?: string;
    type?: string;
  } | null;
  checklist: TodoChecklistItem[];
  comments: TodoCommentItem[];
  attachments: TodoAttachmentItem[];
  activity: TodoActivityItem[];
  isCreator?: boolean;
  isAssignee?: boolean;
  sourceDomain?: string;
  badgeLabel?: string;
  badgeColor?: string;
}

export interface AssigneeOption {
  id: string;
  name: string;
  email: string;
  type: "employee" | "user";
  role?: string;
  department?: string;
}

export interface UnifiedTodoAppProps {
  initialView?: "list" | "gantt";
  mode?: "hr" | "me" | "workspace" | "apps";
  title?: string;
  description?: string;
}

const TAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  internal: { label: "Internal", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" },
  projects: { label: "Client Projects", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 border-blue-500/20" },
  meetings: { label: "Meeting Prep", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
  reminder: { label: "Action Reminder", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
  research: { label: "Research & Design", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  operations: { label: "HR Operations", color: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/20" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "Urgent", color: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30", dot: "bg-rose-500" },
  high: { label: "High", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", dot: "bg-red-500" },
  medium: { label: "Medium", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500" },
  low: { label: "Low", color: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
};

export function UnifiedTodoApp({
  initialView = "list",
  mode = "workspace",
  title = "Todo & Tasks",
  description = "Consolidated task tracking, subtask checklists, and interactive Gantt scheduling.",
}: UnifiedTodoAppProps) {
  const queryClient = useQueryClient();
  const { user } = useSession();

  // Active view: list or gantt
  const [viewMode, setViewMode] = useState<"list" | "gantt">(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.endsWith("/gantt")) return "gantt";
      const params = new URLSearchParams(window.location.search);
      const qView = params.get("view");
      if (qView === "gantt" || qView === "list") return qView;
    }
    return initialView;
  });

  // Sync viewMode changes to URL pathname and search param smoothly without full page refresh
  const handleViewChange = (newView: "list" | "gantt") => {
    setViewMode(newView);
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      let targetPath = pathname;
      if (newView === "gantt") {
        if (pathname === "/hr/todo") targetPath = "/hr/todo/gantt";
        else if (pathname === "/me/todo") targetPath = "/me/todo/gantt";
        else if (pathname === "/tenant/todo") targetPath = "/tenant/todo/gantt";
        else if (pathname === "/apps/todo/task-list") targetPath = "/apps/todo/gantt";
      } else {
        if (pathname === "/hr/todo/gantt") targetPath = "/hr/todo";
        else if (pathname === "/me/todo/gantt") targetPath = "/me/todo";
        else if (pathname === "/tenant/todo/gantt") targetPath = "/tenant/todo";
        else if (pathname === "/apps/todo/gantt") targetPath = "/apps/todo/task-list";
      }
      const url = new URL(window.location.href);
      url.pathname = targetPath;
      url.searchParams.set("view", newView);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Filter and search state
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"created" | "due" | "priority" | "progress">("created");

  // Selection & Modal State
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);

  // Detail panel active tab: Checklist, Comments, Files, Activity
  const [detailTab, setDetailTab] = useState<"checklist" | "comments" | "files" | "activity">("checklist");
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");

  // Gantt Scale & Navigation
  const [timelineScale, setTimelineScale] = useState<"days" | "weeks">("days");
  const [ganttWindowOffset, setGanttWindowOffset] = useState<number>(0);

  // Task Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    tag: "internal",
    startDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(addDays(new Date(), 5), "yyyy-MM-dd"),
    assignedTo: "",
    progress: 0,
    starred: false,
  });

  // 1. Fetch authorized tasks from authoritative API
  const { data: todosData = [], isLoading, refetch } = useQuery<TodoItem[]>({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/todos");
      return (res.data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        completed: Boolean(t.completed),
        priority: (t.priority || "medium").toLowerCase(),
        tag: (t.tag || "internal").toLowerCase(),
        startDate: t.startDate
          ? format(new Date(t.startDate), "yyyy-MM-dd")
          : format(new Date(t.createdAt || Date.now()), "yyyy-MM-dd"),
        dueDate: t.dueDate
          ? format(new Date(t.dueDate), "yyyy-MM-dd")
          : format(addDays(new Date(), 5), "yyyy-MM-dd"),
        createdAt: t.createdAt
          ? format(new Date(t.createdAt), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        progress: typeof t.progress === "number" ? t.progress : t.completed ? 100 : 0,
        starred: Boolean(t.starred),
        assignedTo: t.assignedTo || t.assigneeId || null,
        assigneeId: t.assigneeId || t.assignedTo || null,
        assignee: t.assignee || null,
        checklist: Array.isArray(t.checklist) ? t.checklist : [],
        comments: Array.isArray(t.comments) ? t.comments : [],
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        activity: Array.isArray(t.activity) ? t.activity : [],
        isCreator: Boolean(t.isCreator),
        isAssignee: Boolean(t.isAssignee),
        sourceDomain: t.sourceDomain,
        badgeLabel: t.badgeLabel,
        badgeColor: t.badgeColor,
      }));
    },
  });

  // Auto-select task if URL query contains taskId or id (e.g. when navigated from Calendar)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const taskId = params.get("taskId") || params.get("id");
      if (taskId && todosData.length > 0 && !selectedTodo) {
        const found = todosData.find((t: any) => t.id === taskId);
        if (found) {
          setSelectedTodo(found);
        }
      }
    }
  }, [todosData, selectedTodo]);

  // 2. Fetch assignees for the tenant
  const { data: assignees = [] } = useQuery<AssigneeOption[]>({
    queryKey: ["todos-assignees"],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: AssigneeOption[] }>("/todos/assignees");
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  // Keep selectedTodo in sync with latest queried data
  useEffect(() => {
    if (selectedTodo) {
      const fresh = todosData.find((t) => t.id === selectedTodo.id);
      if (fresh) {
        setSelectedTodo(fresh);
      }
    }
  }, [todosData]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/todos", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Task created successfully");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create task");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/todos/${id}`, data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      if (selectedTodo && data?.data?.id === selectedTodo.id) {
        setSelectedTodo(data.data);
      }
      toast.success("Task updated");
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update task");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Task deleted");
      if (selectedTodo?.id === todoToDelete) {
        setSelectedTodo(null);
      }
      setTodoToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete task");
    },
  });

  // Quick Action Handlers
  const handleToggleComplete = (todo: TodoItem) => {
    const nextCompleted = !todo.completed;
    const nextProgress = nextCompleted ? 100 : 0;
    updateMutation.mutate({
      id: todo.id,
      data: { completed: nextCompleted, progress: nextProgress },
    });
  };

  const handleToggleStar = (todo: TodoItem) => {
    updateMutation.mutate({
      id: todo.id,
      data: { starred: !todo.starred },
    });
  };

  const handleAddSubtask = () => {
    if (!selectedTodo || !newSubtaskText.trim()) return;
    const newItems: TodoChecklistItem[] = [
      ...selectedTodo.checklist,
      {
        id: `chk_${Date.now()}`,
        text: newSubtaskText.trim(),
        done: false,
      },
    ];
    const doneCount = newItems.filter((c) => c.done).length;
    const newProgress = Math.round((doneCount / newItems.length) * 100);

    updateMutation.mutate({
      id: selectedTodo.id,
      data: { checklist: newItems, progress: newProgress },
    });
    setNewSubtaskText("");
  };

  const handleToggleSubtask = (itemId: string) => {
    if (!selectedTodo) return;
    const updated = selectedTodo.checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c
    );
    const doneCount = updated.filter((c) => c.done).length;
    const newProgress = Math.round((doneCount / updated.length) * 100);
    const allDone = doneCount === updated.length && updated.length > 0;

    updateMutation.mutate({
      id: selectedTodo.id,
      data: { checklist: updated, progress: newProgress, completed: allDone },
    });
  };

  const handleDeleteSubtask = (itemId: string) => {
    if (!selectedTodo) return;
    const updated = selectedTodo.checklist.filter((c) => c.id !== itemId);
    const doneCount = updated.filter((c) => c.done).length;
    const newProgress = updated.length > 0 ? Math.round((doneCount / updated.length) * 100) : selectedTodo.progress;

    updateMutation.mutate({
      id: selectedTodo.id,
      data: { checklist: updated, progress: newProgress },
    });
  };

  const handleAddComment = () => {
    if (!selectedTodo || !newCommentText.trim()) return;
    const authorName = (user as any)?.name || user?.email || "Team Member";
    const newComments: TodoCommentItem[] = [
      ...selectedTodo.comments,
      {
        id: `cmt_${Date.now()}`,
        author: authorName,
        text: newCommentText.trim(),
        createdAt: new Date().toISOString(),
      },
    ];
    updateMutation.mutate({
      id: selectedTodo.id,
      data: { comments: newComments },
    });
    setNewCommentText("");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      tag: "internal",
      startDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(addDays(new Date(), 5), "yyyy-MM-dd"),
      assignedTo: "",
      progress: 0,
      starred: false,
    });
  };

  const handleOpenEdit = (todo: TodoItem) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      tag: todo.tag,
      startDate: todo.startDate,
      dueDate: todo.dueDate,
      assignedTo: todo.assignedTo || "",
      progress: todo.progress,
      starred: todo.starred,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (editingTodo) {
      updateMutation.mutate({
        id: editingTodo.id,
        data: {
          title: formData.title.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          tag: formData.tag,
          startDate: formData.startDate,
          dueDate: formData.dueDate,
          assignedTo: formData.assignedTo || null,
          progress: formData.progress,
          starred: formData.starred,
        },
      });
    } else {
      createMutation.mutate({
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        tag: formData.tag,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        assignedTo: formData.assignedTo || null,
        progress: formData.progress,
        starred: formData.starred,
      });
    }
  };

  // Metrics calculation
  const totalTasks = todosData.length;
  const pendingTasks = todosData.filter((t) => !t.completed).length;
  const completedTasks = todosData.filter((t) => t.completed).length;
  const urgentTasks = todosData.filter(
    (t) => (t.priority === "urgent" || t.priority === "high") && !t.completed
  ).length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered & Sorted Tasks
  const filteredTodos = useMemo(() => {
    return todosData
      .filter((t) => {
        if (statusTab === "pending" && t.completed) return false;
        if (statusTab === "completed" && !t.completed) return false;
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
        if (tagFilter !== "all" && t.tag !== tagFilter) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = t.description?.toLowerCase().includes(q);
          const matchAssignee = t.assignee?.name?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAssignee) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "due") {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === "priority") {
          const rank: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (rank[b.priority] || 0) - (rank[a.priority] || 0);
        }
        if (sortBy === "progress") {
          return b.progress - a.progress;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [todosData, statusTab, priorityFilter, tagFilter, search, sortBy]);

  // Gantt Date Windows & Geometry
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const base = startOfDay(new Date());
    base.setDate(base.getDate() - 2 + ganttWindowOffset * 7);

    const totalDays = timelineScale === "days" ? 14 : 28;
    for (let i = 0; i < totalDays; i++) {
      dates.push(addDays(base, i));
    }
    return dates;
  }, [timelineScale, ganttWindowOffset]);

  const minGridTime = timelineDates[0]?.getTime() || Date.now();
  const maxGridTime = (timelineDates[timelineDates.length - 1]?.getTime() || Date.now()) + 86400000;
  const totalGridDuration = maxGridTime - minGridTime;

  if (isLoading) {
    return <LoadingState message="Loading authorized workspace tasks..." />;
  }

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* 1. Header Toolbar */}
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Apps" },
          { label: "Todo & Tasks" },
          { label: viewMode === "gantt" ? "Gantt" : "Todo" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="inline-flex items-center rounded-lg bg-muted p-1 border">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("list")}
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <ListTodo className="w-3.5 h-3.5" />
                Todo
              </Button>
              <Button
                variant={viewMode === "gantt" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("gantt")}
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Gantt
              </Button>
            </div>

            {/* Create Task Button */}
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="gap-1.5 font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          </div>
        }
      />

      {/* 2. Stat Cards Summary */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Tasks"
          value={totalTasks}
          icon={ListTodo}
          variant="primary"
          description="Authoritative workspace items"
        />
        <StatCard
          label="Pending Action"
          value={pendingTasks}
          icon={Clock}
          variant="warning"
          description="In progress or awaiting review"
        />
        <StatCard
          label="Completed"
          value={completedTasks}
          icon={CheckCircle2}
          variant="success"
          description={`${completionRate}% overall completion rate`}
        />
        <StatCard
          label="Urgent / High"
          value={urgentTasks}
          icon={AlertCircle}
          variant="rose"
          description="Immediate priority action needed"
        />
      </StatsOverviewGrid>

      {/* 3. Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border w-fit">
          <Button
            variant={statusTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusTab("all")}
            className="h-7 text-xs font-medium gap-1"
          >
            All
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {totalTasks}
            </Badge>
          </Button>
          <Button
            variant={statusTab === "pending" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusTab("pending")}
            className="h-7 text-xs font-medium gap-1"
          >
            Pending
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {pendingTasks}
            </Badge>
          </Button>
          <Button
            variant={statusTab === "completed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusTab("completed")}
            className="h-7 text-xs font-medium gap-1"
          >
            Completed
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {completedTasks}
            </Badge>
          </Button>
        </div>

        {/* Search, Filters, and Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, descriptions..."
              className="pl-9 h-8 text-xs bg-background"
            />
          </div>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="meetings">Meetings</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="h-8 text-xs w-[120px] bg-background">
              <ArrowUpDown className="w-3 h-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Newest</SelectItem>
              <SelectItem value="due">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Active View Content */}
      {viewMode === "list" ? (
        /* ─── LIST VIEW ─── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Tasks List */}
          <div className={cn("space-y-3", selectedTodo ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12")}>
            {filteredTodos.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="No tasks match your criteria"
                description="Try clearing search or filters to see more tasks, or create a new task."
                actionLabel="Create Task"
                onAction={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
              />
            ) : (
              filteredTodos.map((todo) => {
                const isOverdue =
                  !todo.completed &&
                  isBefore(new Date(todo.dueDate), startOfDay(new Date()));
                const pConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
                const tConfig = TAG_CONFIG[todo.tag] || TAG_CONFIG.internal;
                const isSelected = selectedTodo?.id === todo.id;

                return (
                  <div
                    key={todo.id}
                    onClick={() => setSelectedTodo(todo)}
                    className={cn(
                      "group p-4 rounded-xl border bg-card transition-all cursor-pointer hover:shadow-md hover:border-primary/40",
                      isSelected && "border-primary ring-2 ring-primary/20 bg-primary/5",
                      todo.completed && "opacity-75 bg-muted/20"
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Completion Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(todo);
                        }}
                        className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      {/* Content Block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={cn(
                              "text-sm font-semibold text-foreground truncate",
                              todo.completed && "line-through text-muted-foreground"
                            )}
                          >
                            {todo.title}
                          </h4>

                          {/* Star Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(todo);
                            }}
                            className={cn(
                              "p-0.5 text-muted-foreground hover:text-amber-500 transition-colors",
                              todo.starred && "text-amber-500 fill-amber-500"
                            )}
                          >
                            <Star className={cn("w-3.5 h-3.5", todo.starred && "fill-amber-500")} />
                          </button>

                          {/* Priority Pill */}
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0 border", pConfig.color)}>
                            {pConfig.label}
                          </Badge>

                          {/* Tag Pill */}
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0 border", tConfig.bg, tConfig.color)}>
                            {tConfig.label}
                          </Badge>

                          {/* Source Domain Badge if from automated workflow */}
                          {todo.badgeLabel && (
                            <Badge variant="outline" className={cn("text-[10px] px-2 py-0", todo.badgeColor)}>
                              {todo.badgeLabel}
                            </Badge>
                          )}
                        </div>

                        {todo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {todo.description}
                          </p>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-4 mt-2.5 text-[11px] text-muted-foreground flex-wrap">
                          {/* Due Date */}
                          <div className={cn("flex items-center gap-1", isOverdue && "text-rose-600 font-semibold")}>
                            <Calendar className="w-3 h-3" />
                            <span>Due {todo.dueDate}</span>
                            {isOverdue && <span className="text-[10px] uppercase tracking-wider ml-0.5">(Overdue)</span>}
                          </div>

                          {/* Assignee */}
                          {todo.assignee?.name && (
                            <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-md border text-foreground">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium truncate max-w-[120px]">{todo.assignee.name}</span>
                            </div>
                          )}

                          {/* Checklist items indicator */}
                          {todo.checklist.length > 0 && (
                            <div className="flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-muted-foreground" />
                              <span>
                                {todo.checklist.filter((c) => c.done).length}/{todo.checklist.length} subtasks
                              </span>
                            </div>
                          )}

                          {/* Comments indicator */}
                          {todo.comments.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>{todo.comments.length} comments</span>
                            </div>
                          )}

                          {/* Progress */}
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  todo.completed ? "bg-emerald-500" : "bg-primary"
                                )}
                                style={{ width: `${todo.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono">{todo.progress}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Right action icons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(todo);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTodoToDelete(todo.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Slide-Over Detail Panel */}
          {selectedTodo && (
            <div className="lg:col-span-5 xl:col-span-4 sticky top-6 border rounded-xl bg-card shadow-lg p-5 space-y-5 animate-in fade-in duration-200">
              {/* Panel Header */}
              <div className="flex items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                      Task Details
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">#{selectedTodo.id.slice(-6)}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground leading-snug truncate">
                    {selectedTodo.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenEdit(selectedTodo)}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedTodo(null)}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Status and Attributes Grid */}
              <div className="space-y-3.5 text-xs">
                {/* Status Toggle Button */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Button
                    variant={selectedTodo.completed ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1.5 font-medium",
                      selectedTodo.completed && "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                    onClick={() => handleToggleComplete(selectedTodo)}
                  >
                    {selectedTodo.completed ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Completed
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" /> Mark Completed
                      </>
                    )}
                  </Button>
                </div>

                {/* Priority */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium px-2 py-0.5",
                      PRIORITY_CONFIG[selectedTodo.priority]?.color
                    )}
                  >
                    {PRIORITY_CONFIG[selectedTodo.priority]?.label || selectedTodo.priority}
                  </Badge>
                </div>

                {/* Assignee */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assignee</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedTodo.assignee?.name || "Unassigned"}</span>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedTodo.dueDate}</span>
                  </div>
                </div>

                {/* Progress Slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Task Progress</span>
                    <span className="font-mono font-bold text-foreground">{selectedTodo.progress}%</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        selectedTodo.completed ? "bg-emerald-500" : "bg-primary"
                      )}
                      style={{ width: `${selectedTodo.progress}%` }}
                    />
                  </div>
                </div>

                {selectedTodo.description && (
                  <div className="pt-2 border-t text-muted-foreground">
                    <span className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                      Description
                    </span>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{selectedTodo.description}</p>
                  </div>
                )}
              </div>

              {/* Sub-panel Tabs (Checklist, Comments, Activity) */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant={detailTab === "checklist" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDetailTab("checklist")}
                      className="h-7 text-xs px-2.5 font-medium"
                    >
                      Checklist ({selectedTodo.checklist.length})
                    </Button>
                    <Button
                      variant={detailTab === "comments" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDetailTab("comments")}
                      className="h-7 text-xs px-2.5 font-medium"
                    >
                      Comments ({selectedTodo.comments.length})
                    </Button>
                    <Button
                      variant={detailTab === "activity" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDetailTab("activity")}
                      className="h-7 text-xs px-2.5 font-medium"
                    >
                      Activity
                    </Button>
                  </div>
                </div>

                {/* TAB 1: Checklist */}
                {detailTab === "checklist" && (
                  <div className="space-y-3">
                    {/* Add checklist input */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                        placeholder="Add subtask / checklist item..."
                        className="h-8 text-xs"
                      />
                      <Button size="sm" className="h-8 text-xs px-3" onClick={handleAddSubtask}>
                        Add
                      </Button>
                    </div>

                    {/* Subtask items list */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {selectedTodo.checklist.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 text-center">
                          No subtasks added yet. Break this task into steps.
                        </p>
                      ) : (
                        selectedTodo.checklist.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-xs group"
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                              <Checkbox
                                checked={item.done}
                                onCheckedChange={() => handleToggleSubtask(item.id)}
                              />
                              <span className={cn("truncate", item.done && "line-through text-muted-foreground")}>
                                {item.text}
                              </span>
                            </label>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-rose-600 opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteSubtask(item.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Comments */}
                {detailTab === "comments" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                        placeholder="Post a comment..."
                        className="h-8 text-xs"
                      />
                      <Button size="sm" className="h-8 text-xs px-3" onClick={handleAddComment}>
                        <Send className="w-3 h-3 mr-1" />
                        Post
                      </Button>
                    </div>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {selectedTodo.comments.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 text-center">
                          No comments yet. Leave a note or update.
                        </p>
                      ) : (
                        selectedTodo.comments.map((cmt) => (
                          <div key={cmt.id} className="p-2.5 rounded-lg border bg-muted/20 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">{cmt.author}</span>
                              <span>{format(new Date(cmt.createdAt), "MMM d, h:mm a")}</span>
                            </div>
                            <p className="text-xs text-foreground/90 whitespace-pre-wrap">{cmt.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Activity */}
                {detailTab === "activity" && (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {selectedTodo.activity.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2 text-center">
                        No activity recorded.
                      </p>
                    ) : (
                      selectedTodo.activity.map((act) => (
                        <div key={act.id} className="flex items-start gap-2 text-xs py-1 border-b last:border-0">
                          <History className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium">{act.text}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(act.timestamp), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="flex items-center justify-between pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                  onClick={() => setTodoToDelete(selectedTodo.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Task
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs font-medium"
                  onClick={() => setSelectedTodo(null)}
                >
                  Close Panel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── GANTT TIMELINE VIEW ─── */
        <div className="space-y-4">
          {/* Gantt Timeline Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setGanttWindowOffset((prev) => prev - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setGanttWindowOffset(0)}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setGanttWindowOffset((prev) => prev + 1)}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Window Label */}
            <div className="text-xs font-semibold text-foreground">
              {format(timelineDates[0], "MMM d, yyyy")} &ndash;{" "}
              {format(timelineDates[timelineDates.length - 1], "MMM d, yyyy")}
            </div>

            {/* Scale Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Timeline View:</span>
              <div className="inline-flex rounded-lg border bg-muted p-0.5">
                <Button
                  variant={timelineScale === "days" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setTimelineScale("days")}
                >
                  14 Days
                </Button>
                <Button
                  variant={timelineScale === "weeks" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setTimelineScale("weeks")}
                >
                  4 Weeks
                </Button>
              </div>
            </div>
          </div>

          {/* Interactive Gantt Timeline Grid */}
          <Card className="overflow-hidden border shadow-sm">
            <div className="overflow-x-auto">
              <div className="min-w-[950px]">
                {/* Timeline Header */}
                <div className="grid grid-cols-12 border-b bg-muted/40 text-xs font-semibold text-foreground">
                  <div className="col-span-4 p-3 border-r font-bold">Task & Assignee</div>
                  <div className="col-span-8 grid" style={{ gridTemplateColumns: `repeat(${timelineDates.length}, minmax(0, 1fr))` }}>
                    {timelineDates.map((d, i) => {
                      const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-2 text-center border-r last:border-r-0 text-[11px]",
                            isToday && "bg-primary/10 text-primary font-bold"
                          )}
                        >
                          <div>{format(d, "EEE")}</div>
                          <div className="text-[10px] text-muted-foreground">{format(d, "d")}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline Rows */}
                <div className="divide-y">
                  {filteredTodos.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No tasks found for the current timeline range.
                    </div>
                  ) : (
                    filteredTodos.map((todo) => {
                      const start = new Date(todo.startDate).getTime();
                      const end = new Date(todo.dueDate).getTime();

                      // Clamp within grid duration
                      const leftPercent = Math.max(
                        0,
                        Math.min(100, ((start - minGridTime) / totalGridDuration) * 100)
                      );
                      const widthPercent = Math.max(
                        4,
                        Math.min(100 - leftPercent, ((end - start) / totalGridDuration) * 100)
                      );

                      const pConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
                      const isOverdue = !todo.completed && isBefore(new Date(todo.dueDate), startOfDay(new Date()));

                      return (
                        <div
                          key={todo.id}
                          className="grid grid-cols-12 items-center hover:bg-muted/20 transition-colors group cursor-pointer"
                          onClick={() => setSelectedTodo(todo)}
                        >
                          {/* Task Info Column */}
                          <div className="col-span-4 p-3 border-r flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full", pConfig.dot)} />
                                <span
                                  className={cn(
                                    "text-xs font-semibold truncate",
                                    todo.completed && "line-through text-muted-foreground"
                                  )}
                                >
                                  {todo.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                {todo.assignee?.name && <span className="truncate max-w-[100px]">{todo.assignee.name}</span>}
                                <span>&bull;</span>
                                <span className={cn(isOverdue && "text-rose-600 font-semibold")}>
                                  Due {todo.dueDate}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                              {todo.progress}%
                            </Badge>
                          </div>

                          {/* Gantt Bar Grid Column */}
                          <div className="col-span-8 p-3 relative h-12 flex items-center">
                            {/* Grid vertical lines */}
                            <div
                              className="absolute inset-0 grid pointer-events-none"
                              style={{ gridTemplateColumns: `repeat(${timelineDates.length}, minmax(0, 1fr))` }}
                            >
                              {timelineDates.map((_, idx) => (
                                <div key={idx} className="border-r last:border-r-0 border-muted/30 h-full" />
                              ))}
                            </div>

                            {/* Task Bar */}
                            <div
                              className={cn(
                                "absolute h-7 rounded-lg shadow-sm border px-2.5 flex items-center justify-between text-xs transition-all overflow-hidden cursor-pointer hover:shadow-md",
                                todo.completed
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                                  : isOverdue
                                  ? "bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-300"
                                  : "bg-primary/15 border-primary/30 text-primary"
                              )}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              title={`${todo.title} (${todo.progress}%) | ${todo.startDate} to ${todo.dueDate}`}
                            >
                              {/* Internal Progress Fill Bar */}
                              <div
                                className={cn(
                                  "absolute left-0 top-0 bottom-0 opacity-25 pointer-events-none",
                                  todo.completed ? "bg-emerald-500" : isOverdue ? "bg-rose-500" : "bg-primary"
                                )}
                                style={{ width: `${todo.progress}%` }}
                              />
                              <span className="truncate font-semibold text-[11px] relative z-10">
                                {todo.title}
                              </span>
                              <span className="text-[10px] font-mono font-bold ml-1 relative z-10 shrink-0">
                                {todo.progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 5. Create / Edit Task Modal */}
      <Dialog
        open={isCreateModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            setEditingTodo(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingTodo ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingTodo
                ? "Update task details, schedule, assignee, and priority."
                : "Add a new actionable deliverable to your authorized workspace."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Update employee compensation benchmarks"
                className="text-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide additional context or requirements..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Priority & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category Tag</Label>
                <Select
                  value={formData.tag}
                  onValueChange={(val) => setFormData({ ...formData, tag: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="meetings">Meetings</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assignee (Tenant Scoped)</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(val) => setFormData({ ...formData, assignedTo: val === "unassigned" ? "" : val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.role || a.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule: Start Date & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date (Gantt)</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setEditingTodo(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveModal} className="font-bold">
              {editingTodo ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={Boolean(todoToDelete)}
        onOpenChange={(open) => !open && setTodoToDelete(null)}
        title="Delete Task"
        description="Are you sure you want to permanently delete this task? This action cannot be undone."
        confirmLabel="Delete Task"
        onConfirm={() => {
          if (todoToDelete) {
            deleteMutation.mutate(todoToDelete);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default UnifiedTodoApp;
