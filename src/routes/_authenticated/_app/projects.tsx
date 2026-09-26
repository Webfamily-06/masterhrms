import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Kanban,
  Plus,
  User,
  Folder,
  Edit2,
  Trash2,
  ArrowRight,
  Loader2,
  CalendarDays,
  Search,
  FolderPlus,
  X,
  GripVertical,
  Layers,
  Eye,
  Clock,
  CheckCircle2,
  Tag,
  Calendar,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Sparkles,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects & Kanban Board — Master ERP" }] }),
});

export type ProjectTask = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  assignee: string;
  dueDate: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
};

const TASK_STATUSES: {
  id: ProjectTask["status"];
  label: string;
  dotColor: string;
  badgeClass: string;
  columnBg: string;
  dropBorder: string;
}[] = [
  {
    id: "todo",
    label: "To Do",
    dotColor: "bg-slate-400 dark:bg-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    columnBg: "bg-muted/30 dark:bg-muted/15 border-border/70",
    dropBorder: "border-primary/60 bg-primary/5 ring-2 ring-primary/20",
  },
  {
    id: "in_progress",
    label: "In Progress",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    columnBg: "bg-blue-500/[0.03] dark:bg-blue-950/15 border-blue-500/20",
    dropBorder: "border-blue-500/70 bg-blue-500/10 ring-2 ring-blue-500/20",
  },
  {
    id: "in_review",
    label: "In Review",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    columnBg: "bg-amber-500/[0.03] dark:bg-amber-950/15 border-amber-500/20",
    dropBorder: "border-amber-500/70 bg-amber-500/10 ring-2 ring-amber-500/20",
  },
  {
    id: "done",
    label: "Done",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    columnBg: "bg-emerald-500/[0.03] dark:bg-emerald-950/15 border-emerald-500/20",
    dropBorder: "border-emerald-500/70 bg-emerald-500/10 ring-2 ring-emerald-500/20",
  },
];

const COLUMNS = TASK_STATUSES;

const PRIORITIES: { id: ProjectTask["priority"]; label: string; badgeClass: string; dotClass: string }[] = [
  { id: "low", label: "Low", badgeClass: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700", dotClass: "bg-slate-400" },
  { id: "medium", label: "Medium", badgeClass: "text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800", dotClass: "bg-blue-500" },
  { id: "high", label: "High", badgeClass: "text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800", dotClass: "bg-amber-500" },
  { id: "critical", label: "Critical", badgeClass: "text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800", dotClass: "bg-rose-500" },
];

const PROJECT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

const EMPTY_TASK: Omit<ProjectTask, "id" | "createdAt" | "projectId"> = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assignee: "",
  dueDate: "",
};

function ProjectsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const SLUG = `system-projects-kanban-${tenantId}`;

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "grid" | "reports">("kanban");
  const [search, setSearch] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<ProjectTask | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [taskForm, setTaskForm] =
    useState<Omit<ProjectTask, "id" | "createdAt" | "projectId">>(EMPTY_TASK);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0]);

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<ProjectTask["status"] | null>(null);

  const { data: storeData, isLoading } = useQuery({
    queryKey: ["projects-kanban", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/projects");
        if (res && res.projects) {
          return {
            projects: (res.projects || []) as Project[],
            tasks: (res.tasks || []) as ProjectTask[],
          };
        }
        return { projects: [] as Project[], tasks: [] as ProjectTask[] };
      } catch {
        return { projects: [] as Project[], tasks: [] as ProjectTask[] };
      }
    },
  });

  const projects = storeData?.projects ?? [];
  const tasks = storeData?.tasks ?? [];
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;

  const boardTasks = useMemo(() => {
    if (!activeProject) return [];
    return tasks.filter((t) => {
      const inProject = t.projectId === activeProject.id;
      const matchSearch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.assignee.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase());
      return inProject && matchSearch;
    });
  }, [tasks, activeProject, search]);

  function openCreateTask(initialStatus?: ProjectTask["status"]) {
    setEditingTask(null);
    setTaskForm({
      ...EMPTY_TASK,
      status: initialStatus || "todo",
    });
    setIsTaskModalOpen(true);
  }

  function openEditTask(task: ProjectTask) {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate,
    });
    setIsTaskModalOpen(true);
  }

  function openViewTask(task: ProjectTask) {
    setViewingTask(task);
    setIsViewModalOpen(true);
  }

  async function saveTask() {
    if (!taskForm.title.trim()) return toast.error("Task title is required");
    if (!activeProject) return toast.error("Select a project first");
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (editingTask) {
        await api.put(`/projects/tasks/${editingTask.id}`, taskForm);
        toast.success("Task updated!");
      } else {
        await api.post(`/projects/${activeProject.id}/tasks`, taskForm);
        toast.success(`Task "${taskForm.title}" created!`);
      }
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
      setIsTaskModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save task");
    } finally { setIsSaving(false); }
  }

  async function deleteTask(id: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/projects/tasks/${id}`);
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
      if (viewingTask?.id === id) {
        setIsViewModalOpen(false);
        setViewingTask(null);
      }
      toast.success("Task deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    }
  }

  async function moveTask(task: ProjectTask, newStatus: ProjectTask["status"]) {
    if (task.status === newStatus) return;
    try {
      await api.put(`/projects/tasks/${task.id}`, { status: newStatus });
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
      const targetCol = COLUMNS.find((c) => c.id === newStatus);
      toast.success(`Moved to ${targetCol?.label || newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to move task");
    }
  }

  function handleDropTask(taskId: string, targetStatus: ProjectTask["status"]) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === targetStatus) return;
    moveTask(task, targetStatus);
  }

  async function createProject() {
    if (!projectName.trim()) return toast.error("Project name is required");
    if (isSaving) return;
    setIsSaving(true);
    try {
      const created = await api.post("/projects", {
        name: projectName.trim(),
        description: projectDesc.trim(),
      });
      if (created?.id) setActiveProjectId(created.id);
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
      setIsProjectModalOpen(false);
      setProjectName("");
      setProjectDesc("");
      toast.success(`Project "${projectName}" created!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally { setIsSaving(false); }
  }

  async function deleteProject(projectId: string) {
    if (!confirm("Are you sure you want to delete this project and all its tasks?")) return;
    try {
      await api.delete(`/projects/${projectId}`);
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
      toast.success("Project deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
    }
  }

  return (
    <PlanGuard moduleName="Projects & Kanban Board" requiredPlan="starter">
      <div className="space-y-5 max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Kanban className="size-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight truncate">Projects & Kanban Board</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              Drag and drop tasks between stages to track project workflows and team velocity.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProjectModalOpen(true)}
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              <FolderPlus className="size-4" /> New Project
            </Button>
            <Button
              size="sm"
              onClick={() => openCreateTask("todo")}
              className="gap-1.5 text-xs font-semibold shadow-xs"
              disabled={!activeProject}
            >
              <Plus className="size-4" /> Add Task
            </Button>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border">
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="gap-1.5 text-xs font-bold h-7"
            >
              <Kanban className="size-3.5" /> Kanban Board
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="gap-1.5 text-xs font-bold h-7"
            >
              <LayoutGrid className="size-3.5" /> Projects Grid
            </Button>
            <Button
              variant={viewMode === "reports" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("reports")}
              className="gap-1.5 text-xs font-bold h-7"
            >
              <BarChart3 className="size-3.5" /> Reports & Velocity
            </Button>
          </div>
        </div>

        {/* Sneat Pro Projects & Tasks KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Total Projects", value: `${projects.length} Workspaces`, desc: "Active project initiatives", icon: Folder, color: "text-primary bg-primary/10" },
            { title: "Total Tasks", value: `${tasks.length} Work Items`, desc: "Cross-project deliverables", icon: Layers, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
            { title: "In Progress", value: `${tasks.filter(t => t.status === "in_progress").length} Tasks`, desc: "Actively being executed", icon: Clock, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
            { title: "Completed Done", value: `${tasks.filter(t => t.status === "done").length} Tasks`, desc: "Successfully delivered", icon: CheckCircle2, color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]" },
          ].map((w) => (
            <Card key={w.title} className="border border-border/70 shadow-xs">
              <div className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">{w.title}</span>
                  <h4 className="text-xl font-bold tracking-tight text-foreground">{w.value}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{w.desc}</p>
                </div>
                <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", w.color)}>
                  <w.icon className="size-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ─── VIEW 1: KANBAN BOARD ─── */}
        {viewMode === "kanban" && (
          <div className="flex flex-col lg:flex-row gap-5 items-start max-w-full">
            {/* Projects Sidebar */}
            <div className="w-full lg:w-56 shrink-0 space-y-2 rounded-2xl border bg-card/60 p-3 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Projects ({projects.length})
              </span>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-0.5"
                title="Create Project"
              >
                <Plus className="size-3" /> Add
              </button>
            </div>

            {isLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-6 px-2 space-y-2 border border-dashed rounded-xl bg-muted/20">
                <Folder className="size-6 mx-auto text-muted-foreground opacity-40" />
                <p className="text-xs text-muted-foreground">No projects created yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs w-full"
                  onClick={() => setIsProjectModalOpen(true)}
                >
                  <Plus className="size-3 mr-1" /> Create First
                </Button>
              </div>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {projects.map((p) => {
                  const pTasks = tasks.filter((t) => t.projectId === p.id);
                  const isSelected = activeProject?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setActiveProjectId(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all group ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30 font-bold text-foreground shadow-2xs"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                        <div
                          className="size-2.5 rounded-full shrink-0 ring-2 ring-background"
                          style={{ background: p.color }}
                        />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1 font-mono font-normal opacity-80"
                        >
                          {pTasks.length}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete project "${p.name}" and all its tasks?`)) {
                              deleteProject(p.id);
                            }
                          }}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Kanban Board Area */}
          <div className="flex-1 w-full min-w-0 space-y-4 overflow-hidden">
            {activeProject ? (
              <>
                {/* Board Control Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-2xl p-3.5 shadow-2xs min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <div
                      className="size-3.5 rounded-full ring-2 ring-background shrink-0"
                      style={{ background: activeProject.color }}
                    />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <h2 className="font-bold text-base tracking-tight truncate">{activeProject.name}</h2>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {boardTasks.length} {boardTasks.length === 1 ? "task" : "tasks"}
                        </Badge>
                      </div>
                      {activeProject.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {activeProject.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter tasks..."
                        className="pl-8 h-8 text-xs w-48 bg-background shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 4 Kanban Columns with Drag and Drop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start w-full min-w-0">
                  {COLUMNS.map((col) => {
                    const colTasks = boardTasks.filter((t) => t.status === col.id);
                    const isOver = dragOverColId === col.id;

                    return (
                      <div
                        key={col.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverColId !== col.id) setDragOverColId(col.id);
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setDragOverColId(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
                          if (taskId) {
                            handleDropTask(taskId, col.id);
                          }
                          setDraggedTaskId(null);
                          setDragOverColId(null);
                        }}
                        className={`rounded-2xl border p-3 space-y-3 transition-all duration-150 min-h-[400px] flex flex-col justify-between overflow-hidden w-full min-w-0 ${
                          col.columnBg
                        } ${isOver ? col.dropBorder : ""}`}
                      >
                        <div className="space-y-3 min-w-0 w-full overflow-hidden">
                          {/* Column Header */}
                          <div className="flex items-center justify-between pb-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`size-2 rounded-full shrink-0 ${col.dotColor}`} />
                              <span className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                                {col.label}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-mono h-5 px-1.5 border shrink-0 ${col.badgeClass}`}
                            >
                              {colTasks.length}
                            </Badge>
                          </div>

                          {/* Task List */}
                          <div className="space-y-2.5 min-w-0 w-full overflow-hidden">
                            {colTasks.length === 0 ? (
                              <div
                                className={`border border-dashed rounded-xl p-6 text-center transition-colors ${
                                  isOver
                                    ? "border-primary bg-primary/10 text-primary font-medium"
                                    : "border-border/60 text-muted-foreground/60"
                                }`}
                              >
                                <p className="text-[11px]">
                                  {isOver ? "Drop here to assign" : "No tasks in this stage"}
                                </p>
                              </div>
                            ) : (
                              colTasks.map((task) => {
                                const priority =
                                  PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[1];
                                const nextColIndex = COLUMNS.findIndex((c) => c.id === task.status) + 1;
                                const nextCol = nextColIndex < COLUMNS.length ? COLUMNS[nextColIndex] : null;
                                const isBeingDragged = draggedTaskId === task.id;

                                return (
                                  <Card
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("text/plain", task.id);
                                      setDraggedTaskId(task.id);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedTaskId(null);
                                      setDragOverColId(null);
                                    }}
                                    onClick={() => openViewTask(task)}
                                    className={`p-3 space-y-2 shadow-xs border bg-card hover:border-primary/50 transition-all cursor-pointer select-none group relative w-full min-w-0 overflow-hidden box-border hover:shadow-md ${
                                      isBeingDragged
                                        ? "opacity-30 border-dashed border-primary scale-95"
                                        : ""
                                    }`}
                                  >
                                    {/* Task Header & Priority */}
                                    <div className="flex items-start justify-between gap-2 min-w-0 w-full overflow-hidden">
                                      <div className="flex items-start gap-1.5 flex-1 min-w-0 overflow-hidden">
                                        <span title="Drag to move column" className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing">
                                          <GripVertical className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                                        </span>
                                        <p className="font-semibold text-xs leading-snug text-foreground break-words [overflow-wrap:anywhere] line-clamp-3 min-w-0 flex-1 group-hover:text-primary transition-colors">
                                          {task.title}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] px-1.5 py-0 h-4 shrink-0 font-medium border ${priority.badgeClass}`}
                                      >
                                        {priority.label}
                                      </Badge>
                                    </div>

                                    {/* Description */}
                                    {task.description && (
                                      <p className="text-[11px] text-muted-foreground line-clamp-2 break-words [overflow-wrap:anywhere] pl-5 min-w-0">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Footer with Metadata & Actions */}
                                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground min-w-0 w-full overflow-hidden">
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                                        {task.assignee ? (
                                          <span
                                            className="flex items-center gap-1 text-foreground/80 font-medium truncate max-w-[100px]"
                                            title={task.assignee}
                                          >
                                            <User className="size-3 text-muted-foreground shrink-0" />
                                            <span className="truncate text-[10px]">{task.assignee}</span>
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground/60 italic truncate">
                                            Unassigned
                                          </span>
                                        )}
                                        {task.dueDate && (
                                          <span
                                            className="flex items-center gap-1 shrink-0 font-mono text-[9px] text-muted-foreground"
                                            title={`Due: ${task.dueDate}`}
                                          >
                                            <CalendarDays className="size-3 shrink-0" />
                                            <span>{task.dueDate}</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {/* View Task Button */}
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="size-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openViewTask(task);
                                          }}
                                          title="View Task Details"
                                        >
                                          <Eye className="size-3.5" />
                                        </Button>

                                        {/* Edit Task Button */}
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="size-6 text-muted-foreground hover:text-foreground"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditTask(task);
                                          }}
                                          title="Edit Task"
                                        >
                                          <Edit2 className="size-3" />
                                        </Button>

                                        {/* Delete Task Button */}
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteTask(task.id);
                                          }}
                                          title="Delete Task"
                                        >
                                          <Trash2 className="size-3" />
                                        </Button>

                                        {/* Move Forward Button */}
                                        {nextCol && (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-6 text-primary hover:bg-primary/10"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              moveTask(task, nextCol.id);
                                            }}
                                            title={`Move to ${nextCol.label}`}
                                          >
                                            <ArrowRight className="size-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Quick Add in this Column */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreateTask(col.id)}
                          className="w-full text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 h-8 mt-3 justify-center gap-1.5 shrink-0"
                        >
                          <Plus className="size-3.5" /> Add Task
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-muted-foreground space-y-3 bg-card border rounded-2xl shadow-2xs">
                <Layers className="size-12 mx-auto opacity-30 text-primary" />
                <h3 className="font-bold text-base text-foreground">No projects yet</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Create your first project to start organizing tasks, managing sprints, and moving work across the Kanban board.
                </p>
                <Button onClick={() => setIsProjectModalOpen(true)} className="gap-2 mt-2">
                  <FolderPlus className="size-4" /> Create First Project
                </Button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* ─── VIEW 2: PROJECTS GRID CARDS VIEW ─── */}
        {viewMode === "grid" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.length === 0 ? (
                <div className="col-span-full py-16 text-center text-muted-foreground bg-card border rounded-2xl">
                  <Folder className="size-10 mx-auto text-muted-foreground opacity-30 mb-2" />
                  <p className="text-sm font-semibold">No projects found</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a project to see grid cards.</p>
                </div>
              ) : (
                projects.map((p) => {
                  const pTasks = tasks.filter((t) => t.projectId === p.id);
                  const completedTasks = pTasks.filter((t) => t.status === "done").length;
                  const inProgressTasks = pTasks.filter((t) => t.status === "in_progress").length;
                  const todoTasks = pTasks.filter((t) => t.status === "todo").length;
                  const progress = pTasks.length > 0 ? Math.round((completedTasks / pTasks.length) * 100) : 0;

                  return (
                    <Card
                      key={p.id}
                      className="border shadow-xs hover:shadow-md transition-shadow bg-card flex flex-col justify-between overflow-hidden"
                    >
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="size-4 rounded-full shrink-0 ring-2 ring-background"
                              style={{ background: p.color }}
                            />
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-foreground truncate">{p.name}</h3>
                              <p className="text-[11px] text-muted-foreground font-mono">{pTasks.length} Work Items</p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold shrink-0",
                              progress === 100
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : progress > 50
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {progress}% Done
                          </Badge>
                        </div>

                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-muted-foreground">Milestone Progress</span>
                            <span className="font-mono font-bold text-foreground">{completedTasks}/{pTasks.length}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${progress}%`, backgroundColor: p.color }}
                            />
                          </div>
                        </div>

                        {/* Task Counts Summary */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="p-2 rounded-lg bg-muted/40 border text-xs">
                            <span className="text-[10px] text-muted-foreground block">To Do</span>
                            <span className="font-bold font-mono text-foreground">{todoTasks}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs">
                            <span className="text-[10px] text-blue-600 block">In Progress</span>
                            <span className="font-bold font-mono text-blue-600">{inProgressTasks}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
                            <span className="text-[10px] text-emerald-600 block">Completed</span>
                            <span className="font-bold font-mono text-emerald-600">{completedTasks}</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 py-3 bg-muted/20 border-t flex items-center justify-between">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActiveProjectId(p.id);
                            setViewMode("kanban");
                          }}
                          className="text-xs font-bold text-primary hover:bg-primary/10 gap-1.5 h-8"
                        >
                          <Kanban className="size-3.5" /> Open Kanban Board
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProject(p.id)}
                          className="size-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── VIEW 3: PROJECT REPORTS & VELOCITY ─── */}
        {viewMode === "reports" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Velocity & Priority Breakdown */}
              <Card className="border shadow-xs bg-card">
                <CardHeader className="py-3 px-4 border-b bg-muted/20">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    <span>Task Priority Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {PRIORITIES.map((pr) => {
                    const count = tasks.filter((t) => t.priority === pr.id).length;
                    const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
                    return (
                      <div key={pr.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <span className={cn("size-2 rounded-full", pr.dotClass)} />
                            {pr.label} Priority
                          </span>
                          <span className="font-mono text-muted-foreground font-semibold">{count} tasks ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", pr.dotClass)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Project Performance & Health Table */}
              <Card className="lg:col-span-2 border shadow-xs bg-card">
                <CardHeader className="py-3 px-4 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <Layers className="size-4 text-emerald-600" />
                      <span>Project Delivery Health Index</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {projects.length} Active Workspaces
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-[11px]">
                        <TableHead className="font-bold">Project Name</TableHead>
                        <TableHead className="font-bold text-center">Tasks</TableHead>
                        <TableHead className="font-bold text-center">Progress</TableHead>
                        <TableHead className="font-bold text-right">Delivery Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {projects.map((p) => {
                        const pTasks = tasks.filter((t) => t.projectId === p.id);
                        const completed = pTasks.filter((t) => t.status === "done").length;
                        const pct = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;

                        return (
                          <TableRow key={p.id} className="hover:bg-muted/20">
                            <TableCell className="font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full" style={{ background: p.color }} />
                                <span>{p.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold">
                              {completed}/{pTasks.length}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="w-24 mx-auto space-y-1">
                                <span className="text-[10px] font-mono font-bold text-muted-foreground">{pct}%</span>
                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold",
                                  pct === 100
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : pct > 40
                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                )}
                              >
                                {pct === 100 ? "Completed" : pct > 40 ? "On Track" : "In Sprints"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── View Task Modal ─── */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-[540px]">
            {viewingTask && (
              <>
                <DialogHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                        {viewingTask.id}
                      </span>
                      {activeProject && (
                        <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ background: activeProject.color }}
                          />
                          {activeProject.name}
                        </Badge>
                      )}
                    </div>
                    {(() => {
                      const priority =
                        PRIORITIES.find((p) => p.id === viewingTask.priority) || PRIORITIES[1];
                      return (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-semibold border ${priority.badgeClass}`}
                        >
                          {priority.label} Priority
                        </Badge>
                      );
                    })()}
                  </div>

                  <DialogTitle className="text-lg font-bold leading-snug break-words [overflow-wrap:anywhere] pt-1">
                    {viewingTask.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  {/* Task Description */}
                  <div className="space-y-1.5 bg-muted/30 dark:bg-muted/15 p-3.5 rounded-xl border">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Description
                    </span>
                    {viewingTask.description ? (
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                        {viewingTask.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/70 italic">
                        No description provided for this task.
                      </p>
                    )}
                  </div>

                  {/* Task Meta Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-card border p-3 rounded-xl shadow-2xs">
                    {/* Stage / Status with inline switcher */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Current Stage
                      </span>
                      <Select
                        value={viewingTask.status}
                        onValueChange={(v) => moveTask(viewingTask, v as any)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMNS.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${c.dotColor}`} />
                                <span>{c.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assignee */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Assignee
                      </span>
                      <div className="flex items-center gap-2 h-8 px-2.5 rounded-md border bg-muted/20 text-xs font-medium">
                        <Avatar className="size-5">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                            {viewingTask.assignee ? viewingTask.assignee.slice(0, 2).toUpperCase() : "UN"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {viewingTask.assignee || "Unassigned"}
                        </span>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Due Date
                      </span>
                      <div className="flex items-center gap-2 h-8 px-2.5 rounded-md border bg-muted/20 text-xs font-mono">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <span>{viewingTask.dueDate || "No deadline set"}</span>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Created At
                      </span>
                      <div className="flex items-center gap-2 h-8 px-2.5 rounded-md border bg-muted/20 text-xs text-muted-foreground font-mono">
                        <Clock className="size-3.5" />
                        <span>{viewingTask.createdAt ? new Date(viewingTask.createdAt).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                    onClick={() => deleteTask(viewingTask.id)}
                  >
                    <Trash2 className="size-3.5" /> Delete Task
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsViewModalOpen(false)}
                      className="text-xs"
                    >
                      Close
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs font-semibold gap-1.5"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        openEditTask(viewingTask);
                      }}
                    >
                      <Edit2 className="size-3.5" /> Edit Task
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Task Edit / Create Modal ─── */}
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Kanban className="size-5 text-primary" />
                {editingTask ? "Edit Task" : "Create Task"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details below to add or modify a task on the Kanban board.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Task Title *</Label>
                <Input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Implement user authentication"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Provide context, acceptance criteria, or links..."
                  className="text-xs resize-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Stage / Status</Label>
                  <Select
                    value={taskForm.status}
                    onValueChange={(v) => setTaskForm({ ...taskForm, status: v as any })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full ${c.dotColor}`} />
                            <span>{c.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Priority</Label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as any })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Assignee</Label>
                  <Input
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                    placeholder="Team member name"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Due Date</Label>
                  <Input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveTask} disabled={isSaving} className="font-bold gap-2">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Create Project Modal ─── */}
        <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderPlus className="size-5 text-primary" /> Create New Project
              </DialogTitle>
              <DialogDescription>
                Create a distinct workspace board to organize features or sprints.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Project Name *</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. ERP Launch Q3"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Project goals or scope..."
                  className="text-xs resize-none"
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Theme Color</Label>
                <div className="flex gap-2 pt-1">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProjectColor(c)}
                      className={`size-6 rounded-full border-2 transition-all ${
                        projectColor === c ? "border-foreground scale-110 shadow-sm" : "border-transparent"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProjectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={createProject}
                disabled={isSaving}
                className="font-bold gap-2"
              >
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
