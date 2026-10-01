import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Kanban,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Download,
  MoreVertical,
  Pencil,
  FileSpreadsheet,
  FileText,
  Calendar,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  MessageCircle,
  Paperclip,
  Check,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/task-board")({
  component: TaskBoardPage,
  head: () => ({ meta: [{ title: "Task Board (Kanban) — Master ERP" }] }),
});

export type KanbanColumn = {
  id: string;
  name: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
};

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: "todo",
    name: "To Do",
    dotColor: "bg-purple-600",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
  },
  {
    id: "pending",
    name: "Pending",
    dotColor: "bg-pink-600",
    bgColor: "bg-pink-100",
    textColor: "text-pink-700",
  },
  {
    id: "in_progress",
    name: "Inprogress",
    dotColor: "bg-blue-600",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  {
    id: "on_hold",
    name: "On-hold",
    dotColor: "bg-amber-600",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
  },
  {
    id: "review",
    name: "Review",
    dotColor: "bg-teal-600",
    bgColor: "bg-teal-100",
    textColor: "text-teal-700",
  },
  {
    id: "completed",
    name: "Completed",
    dotColor: "bg-emerald-600",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
  },
];

export type TaskItem = {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  status: string; // todo, pending, in_progress, on_hold, review, completed
  priority: "low" | "medium" | "high" | "critical";
  assignee: string;
  category?: string;
  progress?: number;
  dueDate?: string;
  commentsCount?: number;
  attachmentsCount?: number;
  createdAt?: string;
};

export default function TaskBoardPage() {
  const queryClient = useQueryClient();

  // Columns state
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS);

  // Filters state
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("created_date");

  // Modals state
  const [addBoardModalOpen, setAddBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardColor, setNewBoardColor] = useState("purple");

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [targetColumnId, setTargetColumnId] = useState<string>("todo");

  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);

  // Task Form State
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    status: string;
    assignee: string;
    projectId: string;
    dueDate: string;
    category: string;
    progress: number;
  }>({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    assignee: "Lewis",
    projectId: "",
    dueDate: new Date().toISOString().split("T")[0],
    category: "Web Layout",
    progress: 30,
  });

  // Query Projects
  const { data: projects = [] } = useQuery({
    queryKey: ["kanban-projects"],
    queryFn: async () => {
      const res = await api.get("/api/projects");
      return Array.isArray(res.data) ? res.data : res.data?.projects || [];
    },
  });

  // Query Tasks
  const { data: rawTasks = [], isLoading: tasksLoading, refetch } = useQuery<TaskItem[]>({
    queryKey: ["kanban-tasks", selectedProject, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProject !== "all") params.append("projectId", selectedProject);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      const res = await api.get(`/api/projects/tasks?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post("/api/projects/tasks", payload)).data;
    },
    onSuccess: () => {
      toast.success("Task created successfully!");
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      setTaskModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create task");
    },
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; payload: any }) => {
      return (await api.put(`/api/projects/tasks/${taskId}`, payload)).data;
    },
    onSuccess: () => {
      toast.success("Task updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      setTaskModalOpen(false);
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update task");
    },
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return (await api.delete(`/api/projects/tasks/${taskId}`)).data;
    },
    onSuccess: () => {
      toast.success("Task deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      setDeleteTaskModalOpen(false);
      setTaskToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete task");
    },
  });

  // Quick Move Column
  const handleMoveColumn = (task: TaskItem, direction: "next" | "prev") => {
    const colIndex = columns.findIndex((c) => c.id === task.status);
    if (colIndex === -1) return;
    const targetIdx = direction === "next" ? colIndex + 1 : colIndex - 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;

    const newStatus = columns[targetIdx].id;
    updateTaskMutation.mutate({
      taskId: task.id,
      payload: { status: newStatus },
    });
  };

  // Add Board Column
  const handleAddBoard = () => {
    if (!newBoardName.trim()) {
      toast.error("Please enter a board name");
      return;
    }
    const slug = newBoardName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const colors: Record<string, { dot: string; bg: string; text: string }> = {
      purple: { dot: "bg-purple-600", bg: "bg-purple-100", text: "text-purple-700" },
      pink: { dot: "bg-pink-600", bg: "bg-pink-100", text: "text-pink-700" },
      blue: { dot: "bg-blue-600", bg: "bg-blue-100", text: "text-blue-700" },
      amber: { dot: "bg-amber-600", bg: "bg-amber-100", text: "text-amber-700" },
      teal: { dot: "bg-teal-600", bg: "bg-teal-100", text: "text-teal-700" },
      emerald: { dot: "bg-emerald-600", bg: "bg-emerald-100", text: "text-emerald-700" },
    };
    const c = colors[newBoardColor] || colors.purple;

    setColumns([
      ...columns,
      {
        id: slug,
        name: newBoardName.trim(),
        dotColor: c.dot,
        bgColor: c.bg,
        textColor: c.text,
      },
    ]);
    toast.success(`Board column '${newBoardName}' added!`);
    setNewBoardName("");
    setAddBoardModalOpen(false);
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    let list = [...rawTasks];

    // Priority filter
    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority.toLowerCase() === priorityFilter.toLowerCase());
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assignee && t.assignee.toLowerCase().includes(q)) ||
          (t.projectName && t.projectName.toLowerCase().includes(q))
      );
    }

    // Sort By
    if (sortBy === "high") {
      const pMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      list.sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
    } else if (sortBy === "medium") {
      list.sort((a) => (a.priority === "medium" ? -1 : 1));
    } else if (sortBy === "low") {
      const pMap: Record<string, number> = { low: 4, medium: 3, high: 2, critical: 1 };
      list.sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list;
  }, [rawTasks, priorityFilter, searchQuery, sortBy]);

  // Tasks mapped by column
  const tasksByColumn = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    for (const col of columns) {
      map[col.id] = [];
    }

    for (const task of filteredTasks) {
      let statusKey = task.status;
      // Normalize common synonyms
      if (statusKey === "inprogress") statusKey = "in_progress";
      if (statusKey === "onhold") statusKey = "on_hold";

      if (map[statusKey]) {
        map[statusKey].push(task);
      } else if (map["todo"]) {
        map["todo"].push(task);
      }
    }
    return map;
  }, [filteredTasks, columns]);

  // Overall statistics
  const totalTasksCount = filteredTasks.length;
  const pendingTasksCount = (tasksByColumn["todo"]?.length || 0) + (tasksByColumn["pending"]?.length || 0) + (tasksByColumn["on_hold"]?.length || 0);
  const completedTasksCount = tasksByColumn["completed"]?.length || 0;

  // Active Project Title
  const activeProjectTitle = useMemo(() => {
    if (selectedProject === "all") return "Hospital Administration System";
    const found = projects.find((p: any) => p.id === selectedProject);
    return found ? found.name : "Hospital Administration System";
  }, [selectedProject, projects]);

  // Open Create Task Modal for a specific column
  const handleOpenAddTask = (colId: string) => {
    setEditingTask(null);
    setTargetColumnId(colId);
    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      status: colId,
      assignee: "Lewis",
      projectId: selectedProject !== "all" ? selectedProject : (projects[0]?.id || ""),
      dueDate: new Date().toISOString().split("T")[0],
      category: "Web Layout",
      progress: 25,
    });
    setTaskModalOpen(true);
  };

  // Open Edit Task Modal
  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      assignee: task.assignee || "Lewis",
      projectId: task.projectId,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      category: task.category || "Web Layout",
      progress: task.progress || 40,
    });
    setTaskModalOpen(true);
  };

  // Submit Task Form
  const handleSubmitTask = () => {
    if (!taskForm.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    if (editingTask) {
      updateTaskMutation.mutate({
        taskId: editingTask.id,
        payload: {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          status: taskForm.status,
          assignee: taskForm.assignee,
          dueDate: taskForm.dueDate,
        },
      });
    } else {
      createTaskMutation.mutate({
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        status: taskForm.status || targetColumnId,
        assignee: taskForm.assignee,
        projectId: taskForm.projectId || (projects[0]?.id || undefined),
        dueDate: taskForm.dueDate,
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      toast.warning("No tasks to export");
      return;
    }
    const headers = ["Task ID", "Title", "Project", "Status", "Priority", "Assignee", "Due Date"];
    const rows = filteredTasks.map((t) => [
      `"${t.id}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.projectName || "General"}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${t.assignee}"`,
      `"${t.dueDate || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `task_board_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Tasks exported to CSV");
  };

  return (
    <div className="space-y-4">
      {/* ─── PAGE BREADCRUMB & HEADER (Exact match to ui-2/task-board.html) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span className="text-gray-600 font-medium">Projects</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">Task Board</span>
          </div>
          <h1 className="text-gray-900 text-xl font-bold tracking-tight mb-0">Task Board</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium border-border-color bg-white hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                <Download className="size-3.5 text-gray-500" />
                <span>Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 text-xs">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                <span>Export as Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer">
                <FileText className="size-3.5 text-rose-600" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Board Button */}
          <Button
            size="sm"
            onClick={() => setAddBoardModalOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-primary-hover cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Add Board</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="size-8 p-0 border-border-color bg-white hover:bg-slate-50 cursor-pointer"
            title="Refresh Tasks"
          >
            <RotateCcw className="size-3.5 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* ─── PROJECT SUMMARY & STATS CARD (ui-2/task-board.html lines 4589-4621) ─── */}
      <Card className="border border-border-color bg-white shadow-xs rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border-color flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900 mb-0">{activeProjectTitle}</h2>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Avatar Stack */}
            <div className="flex items-center -space-x-2">
              <span className="size-7 rounded-full bg-indigo-100 text-indigo-700 border-2 border-white flex items-center justify-center font-bold text-[10px]">
                AK
              </span>
              <span className="size-7 rounded-full bg-emerald-100 text-emerald-700 border-2 border-white flex items-center justify-center font-bold text-[10px]">
                GW
              </span>
              <span className="size-7 rounded-full bg-rose-100 text-rose-700 border-2 border-white flex items-center justify-center font-bold text-[10px]">
                CR
              </span>
              <span className="size-7 rounded-full bg-primary text-white border-2 border-white flex items-center justify-center font-bold text-[10px]">
                1+
              </span>
            </div>

            {/* Task Stats */}
            <div className="flex items-center text-xs divide-x divide-border-color gap-3 pl-2">
              <span className="text-muted-foreground pr-3">
                Total Task : <span className="font-bold text-gray-900">{totalTasksCount}</span>
              </span>
              <span className="text-muted-foreground px-3">
                Pending : <span className="font-bold text-gray-900">{pendingTasksCount}</span>
              </span>
              <span className="text-muted-foreground pl-3">
                Completed : <span className="font-bold text-gray-900">{completedTasksCount}</span>
              </span>
            </div>

            {/* Project / Tasks Search Input */}
            <div className="relative w-56">
              <Search className="size-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search Project / Task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 h-8 text-xs border-border-color rounded-md bg-white focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* ─── FILTER ROW (Priority pills, client dropdown, date picker, status, sort) ─── */}
        <div className="p-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/50">
          {/* Priority Pill Buttons */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Priority:</span>
            <div className="inline-flex rounded-md border border-border-color bg-white p-0.5 shadow-2xs">
              {(["all", "high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded capitalize cursor-pointer transition-colors",
                    priorityFilter === p
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-slate-50"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Right Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project / Client Dropdown */}
            <div className="w-44">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-8 text-xs border-border-color bg-white">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((prj: any) => (
                    <SelectItem key={prj.id} value={prj.id}>
                      {prj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By Dropdown */}
            <div className="w-36">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 text-xs border-border-color bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="created_date">Sort: Created Date</SelectItem>
                  <SelectItem value="high">Sort: High Priority</SelectItem>
                  <SelectItem value="medium">Sort: Medium Priority</SelectItem>
                  <SelectItem value="low">Sort: Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── KANBAN BOARD CONTAINER (6 COLUMNS) ─── */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-4 min-w-[1280px]">
          {columns.map((col) => {
            const columnTasks = tasksByColumn[col.id] || [];
            const countFormatted = String(columnTasks.length).padStart(2, "0");

            return (
              <div
                key={col.id}
                className="w-80 shrink-0 bg-slate-50/80 border border-border-color/80 rounded-lg p-3 shadow-2xs"
              >
                {/* Column Header Card */}
                <div className="bg-white border border-border-color rounded-md p-2.5 mb-3 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("p-1 rounded-full flex items-center justify-center size-5", col.bgColor)}>
                      <span className={cn("size-2 rounded-full", col.dotColor)} />
                    </span>
                    <h3 className="font-bold text-gray-900 text-xs mb-0">{col.name}</h3>
                    <Badge variant="outline" className="text-[11px] font-semibold bg-slate-50 text-gray-700 px-1.5 py-0 h-4 border-border-color">
                      {countFormatted}
                    </Badge>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-6 p-0 hover:bg-slate-100 cursor-pointer">
                        <MoreVertical className="size-3 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 text-xs">
                      <DropdownMenuItem onClick={() => handleOpenAddTask(col.id)} className="cursor-pointer">
                        <Plus className="size-3.5 mr-1.5" />
                        <span>Add Task</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-2.5 min-h-[300px]">
                  {tasksLoading ? (
                    <div className="py-12 flex justify-center items-center text-xs text-muted-foreground gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span>Loading tasks...</span>
                    </div>
                  ) : columnTasks.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-border-color rounded-md bg-white/50 text-muted-foreground text-xs">
                      <p className="font-medium text-gray-500">No tasks in this board</p>
                      <button
                        type="button"
                        onClick={() => handleOpenAddTask(col.id)}
                        className="text-primary hover:underline text-[11px] mt-1 cursor-pointer"
                      >
                        + Add a task
                      </button>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const progress = task.progress || (task.status === "completed" ? 100 : task.status === "in_progress" ? 50 : 20);
                      const priorityColor =
                        task.priority === "critical" || task.priority === "high"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : task.priority === "medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200";

                      const dotColor =
                        task.priority === "critical" || task.priority === "high"
                          ? "bg-rose-500"
                          : task.priority === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500";

                      const progressBarColor =
                        progress >= 80 ? "bg-emerald-500" : progress >= 40 ? "bg-amber-500" : "bg-rose-500";

                      return (
                        <div
                          key={task.id}
                          className="bg-white border border-border-color rounded-lg p-3 shadow-2xs hover:shadow-md transition-shadow cursor-default"
                        >
                          {/* Card Top: Category, Priority & Three-dots Menu */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-medium border border-border-color text-gray-600 px-1.5 py-0.5 rounded bg-slate-50">
                                {task.category || "Web Layout"}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 capitalize",
                                  priorityColor
                                )}
                              >
                                <span className={cn("size-1.5 rounded-full", dotColor)} />
                                {task.priority}
                              </span>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="size-6 p-0 hover:bg-slate-100 cursor-pointer"
                                >
                                  <MoreVertical className="size-3 text-gray-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditTask(task)}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="size-3.5 mr-1.5 text-gray-500" />
                                  <span>Edit Task</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleMoveColumn(task, "prev")}
                                  className="cursor-pointer"
                                >
                                  <ArrowLeft className="size-3.5 mr-1.5 text-blue-500" />
                                  <span>Move Left</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleMoveColumn(task, "next")}
                                  className="cursor-pointer"
                                >
                                  <ArrowRight className="size-3.5 mr-1.5 text-blue-500" />
                                  <span>Move Right</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setTaskToDelete(task);
                                    setDeleteTaskModalOpen(true);
                                  }}
                                  className="cursor-pointer text-rose-600 hover:text-rose-700"
                                >
                                  <Trash2 className="size-3.5 mr-1.5 text-rose-600" />
                                  <span>Delete Task</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Task Title */}
                          <h4 className="text-xs font-semibold text-gray-900 mb-2 leading-snug">
                            {task.title}
                          </h4>

                          {/* Progress Bar */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all", progressBarColor)}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-medium text-gray-700 w-8 text-right">
                              {progress}%
                            </span>
                          </div>

                          {/* Due Date */}
                          <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                            <span>Due on :</span>
                            <span className="text-gray-900 font-medium">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                            </span>
                          </p>

                          {/* Card Footer: Assignee avatar & stats */}
                          <div className="flex items-center justify-between pt-2 border-t border-border-color">
                            <div className="flex items-center -space-x-1.5">
                              <span className="size-5 rounded-full bg-slate-200 text-gray-700 border border-white flex items-center justify-center text-[9px] font-bold">
                                {(task.assignee || "U").slice(0, 2).toUpperCase()}
                              </span>
                              <span className="size-5 rounded-full bg-indigo-100 text-indigo-700 border border-white flex items-center justify-center text-[9px] font-bold">
                                1+
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                              <span className="flex items-center gap-0.5">
                                <MessageCircle className="size-3 text-gray-400" />
                                <span>{task.commentsCount || 14}</span>
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Paperclip className="size-3 text-gray-400" />
                                <span>{task.attachmentsCount || 4}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom "+ New Task" Button */}
                <div className="pt-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAddTask(col.id)}
                    className="w-full h-8 text-xs font-medium border-dashed border-border-color bg-white hover:bg-slate-100 text-gray-700 cursor-pointer shadow-2xs"
                  >
                    <Plus className="size-3.5 mr-1.5" />
                    <span>New Task</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── ADD BOARD MODAL (ui-2/task-board.html) ─── */}
      <Dialog open={addBoardModalOpen} onOpenChange={setAddBoardModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Add Board Column</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a custom status column to expand your Kanban project workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-gray-900 mb-1 block">Board Column Name</Label>
              <Input
                placeholder="e.g. Code Review, QA Testing, Deployed"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="h-8 text-xs border-border-color"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-900 mb-1 block">Theme Color</Label>
              <div className="flex items-center gap-2">
                {[
                  { id: "purple", color: "bg-purple-600" },
                  { id: "pink", color: "bg-pink-600" },
                  { id: "blue", color: "bg-blue-600" },
                  { id: "amber", color: "bg-amber-600" },
                  { id: "teal", color: "bg-teal-600" },
                  { id: "emerald", color: "bg-emerald-600" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewBoardColor(c.id)}
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center cursor-pointer transition-transform",
                      c.color,
                      newBoardColor === c.id ? "ring-2 ring-offset-2 ring-gray-900 scale-110" : ""
                    )}
                  >
                    {newBoardColor === c.id && <Check className="size-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border-color pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddBoardModalOpen(false)}
              className="text-xs border-border-color cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddBoard}
              className="text-xs bg-gray-900 text-white hover:bg-primary-hover cursor-pointer"
            >
              Add Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ADD / EDIT TASK MODAL ─── */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              {editingTask ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set title, assignee, priority, and due dates for this Kanban card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-gray-900 mb-1 block">
                Task Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Appointment booking with payment gateway"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="h-8 text-xs border-border-color"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-900 mb-1 block">Description</Label>
              <Textarea
                rows={3}
                placeholder="Detailed task specifications and requirements..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="text-xs border-border-color"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-900 mb-1 block">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(val: any) => setTaskForm({ ...taskForm, priority: val })}
                >
                  <SelectTrigger className="h-8 text-xs border-border-color bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-900 mb-1 block">Status / Column</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(val) => setTaskForm({ ...taskForm, status: val })}
                >
                  <SelectTrigger className="h-8 text-xs border-border-color bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-900 mb-1 block">Assignee</Label>
                <Input
                  placeholder="e.g. Lewis / Alexander"
                  value={taskForm.assignee}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                  className="h-8 text-xs border-border-color"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-900 mb-1 block">Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="h-8 text-xs border-border-color"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border-color pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTaskModalOpen(false)}
              className="text-xs border-border-color cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitTask}
              disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
              className="text-xs bg-gray-900 text-white hover:bg-primary-hover cursor-pointer"
            >
              {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="size-3.5 mr-1.5" />
              )}
              <span>{editingTask ? "Update Task" : "Save Task"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE TASK CONFIRMATION MODAL ─── */}
      <Dialog open={deleteTaskModalOpen} onOpenChange={setDeleteTaskModalOpen}>
        <DialogContent className="max-w-sm p-6 text-center">
          <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="size-6 text-rose-600" />
          </div>
          <DialogTitle className="text-base font-bold text-gray-900 mb-1">
            Delete Task Confirmation
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mb-4">
            Are you sure you want to delete task{" "}
            <span className="font-semibold text-gray-900">"{taskToDelete?.title}"</span>?
          </DialogDescription>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => taskToDelete && deleteTaskMutation.mutate(taskToDelete.id)}
              disabled={deleteTaskMutation.isPending}
              className="w-full text-xs font-semibold cursor-pointer"
            >
              {deleteTaskMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : null}
              <span>Yes, Delete</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTaskModalOpen(false)}
              className="w-full text-xs border-border-color cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
