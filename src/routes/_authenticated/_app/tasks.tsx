import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Kanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  Calendar,
  Check,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/tasks")({
  component: PersonalTasksBoardPage,
  head: () => ({ meta: [{ title: "My Tasks Board — Master ERP" }] }),
});

export function PersonalTasksBoardPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  // New Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");

  // Fetch tasks across projects
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["personal-tasks-board", priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      return await api.get(`/projects/tasks?${params.toString()}`);
    },
  });

  // Fetch projects list for task creation
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-mini"],
    queryFn: async () => {
      const res = await api.get("/projects");
      return Array.isArray(res) ? res : res.data || res.projects || [];
    },
  });

  // Update Task Status Mutation
  const updateTaskMut = useMutation({
    mutationFn: async ({ taskId, status, priority, description }: { taskId: string; status?: string; priority?: string; description?: string }) => {
      return await api.put(`/projects/tasks/${taskId}`, { status, priority, description });
    },
    onSuccess: () => {
      toast.success("Task updated successfully!");
      qc.invalidateQueries({ queryKey: ["personal-tasks-board"] });
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update task.");
    },
  });

  // Create Task Mutation
  const createTaskMut = useMutation({
    mutationFn: async (payload: any) => {
      const projId = payload.projectId || (projects[0]?.id || "general");
      return await api.post(`/projects/${projId}/tasks`, payload);
    },
    onSuccess: () => {
      toast.success("Task created successfully!");
      qc.invalidateQueries({ queryKey: ["personal-tasks-board"] });
      setIsNewTaskModalOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create task.");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Task title is required.");
      return;
    }
    createTaskMut.mutate({
      projectId: taskProjectId || projects[0]?.id,
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      assignee: profile?.full_name || profile?.email || "Me",
    });
  };

  const filteredTasks = tasks.filter((t: any) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    const title = (t.title || "").toLowerCase();
    const desc = (t.description || "").toLowerCase();
    const proj = (t.projectName || "").toLowerCase();
    return title.includes(s) || desc.includes(s) || proj.includes(s);
  });

  // Task Status Columns matching ui-2/tasks.html
  const columns = [
    { key: "todo", label: "To Do", color: "border-slate-500/30 text-slate-600 bg-slate-500/10" },
    { key: "in_progress", label: "In Progress", color: "border-blue-500/30 text-blue-600 bg-blue-500/10" },
    { key: "review", label: "Review", color: "border-amber-500/30 text-amber-600 bg-amber-500/10" },
    { key: "completed", label: "Completed", color: "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Page Header matching ui-2/tasks.html ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/hrm-dashboard" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link to="/projects" className="hover:text-foreground">Projects</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Personal Tasks Board</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Kanban className="size-6 text-primary" />
            <span>My Tasks Board</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deliverables, milestones, and action items assigned to you across projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="gap-1.5 h-9 font-bold bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="size-4" />
            <span>Add New Task</span>
          </Button>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 p-3 rounded-lg border">
        <div className="relative flex-1 max-w-md">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search task title, description, or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 text-xs w-36 bg-background">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Kanban Columns Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t: any) => {
            if (col.key === "todo") return t.status === "todo" || !t.status;
            return t.status === col.key;
          });

          return (
            <div key={col.key} className="flex flex-col rounded-xl border bg-muted/15 p-3 min-h-[500px]">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b">
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded text-[11px] font-bold border", col.color)}>
                    {col.label}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {colTasks.length}
                  </Badge>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsNewTaskModalOpen(true)}
                  title="Add task to this column"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>

              {/* Task Cards Stack */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground/60 italic border-2 border-dashed rounded-lg">
                    No tasks in {col.label}
                  </div>
                ) : (
                  colTasks.map((task: any) => (
                    <Card
                      key={task.id}
                      onClick={() => setEditingTask(task)}
                      className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all text-xs border"
                    >
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                            <FolderKanban className="size-3 text-primary" />
                            {task.projectName}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-bold uppercase",
                              task.priority === "urgent" && "bg-rose-500/10 text-rose-600 border-rose-500/30",
                              task.priority === "high" && "bg-orange-500/10 text-orange-600 border-orange-500/30",
                              task.priority === "medium" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                              task.priority === "low" && "bg-slate-500/10 text-slate-600 border-slate-500/30"
                            )}
                          >
                            {task.priority || "Medium"}
                          </Badge>
                        </div>

                        <h4 className="font-bold text-foreground text-sm leading-snug">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1 text-[10px]">
                            <Clock className="size-3" />
                            <span>{task.dueDate || "No deadline"}</span>
                          </div>

                          <span className="text-[10px] font-semibold text-primary">
                            {task.assignee}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Dialog: Create New Task ── */}
      <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              <span>Create New Task</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign a new action item or deliverable to your personal workflow board.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Implement GST Tax Slab calculation in Invoice form"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Association</Label>
              <Select value={taskProjectId} onValueChange={setTaskProjectId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code || "PRJ"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description / Notes</Label>
              <Textarea
                placeholder="Details, acceptance criteria, or PR link..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="text-xs min-h-[72px]"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createTaskMut.isPending}
                className="font-bold bg-primary text-primary-foreground"
              >
                {createTaskMut.isPending ? "Creating..." : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Task Status & Priority ── */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Kanban className="size-5 text-primary" />
                <span>Task Details & Status</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update progress or transition task between Kanban workflow stages.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground block">{editingTask.projectName}</span>
                <h4 className="font-bold text-foreground text-sm">{editingTask.title}</h4>
                {editingTask.description && (
                  <p className="text-muted-foreground pt-1">{editingTask.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Workflow Status</Label>
                  <Select
                    value={editingTask.status || "todo"}
                    onValueChange={(status) => updateTaskMut.mutate({ taskId: editingTask.id, status })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Priority</Label>
                  <Select
                    value={editingTask.priority || "medium"}
                    onValueChange={(priority) => updateTaskMut.mutate({ taskId: editingTask.id, priority })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" onClick={() => setEditingTask(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
