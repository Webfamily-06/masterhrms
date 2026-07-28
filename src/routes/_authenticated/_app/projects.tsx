import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import {
  Kanban, Plus, CheckCircle2, Clock, AlertCircle, User, Folder, Edit2,
  Trash2, ArrowRight, Loader2, CalendarDays, Flag, Search, FolderPlus, X,
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

const COLUMNS: { id: ProjectTask["status"]; label: string; icon: any; color: string; bg: string }[] = [
  { id: "todo",        label: "To Do",       icon: Clock,        color: "text-slate-600",  bg: "bg-slate-500/10 border-slate-500/20" },
  { id: "in_progress", label: "In Progress", icon: AlertCircle,  color: "text-blue-600",   bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "in_review",   label: "In Review",   icon: Flag,         color: "text-amber-600",  bg: "bg-amber-500/10 border-amber-500/20" },
  { id: "done",        label: "Done",        icon: CheckCircle2, color: "text-emerald-600",bg: "bg-emerald-500/10 border-emerald-500/20" },
];

const PRIORITIES: { id: ProjectTask["priority"]; label: string; color: string }[] = [
  { id: "low",      label: "Low",      color: "text-slate-500" },
  { id: "medium",   label: "Medium",   color: "text-blue-500" },
  { id: "high",     label: "High",     color: "text-orange-500" },
  { id: "critical", label: "Critical", color: "text-red-500" },
];

const PROJECT_COLORS = ["#6366f1", "#059669", "#0ea5e9", "#f59e0b", "#ec4899", "#8b5cf6"];

const EMPTY_TASK: Omit<ProjectTask, "id" | "createdAt" | "projectId"> = {
  title: "", description: "", status: "todo", priority: "medium", assignee: "", dueDate: "",
};

function ProjectsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const SLUG = `system-projects-kanban-${tenantId}`;

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [taskForm, setTaskForm] = useState<Omit<ProjectTask, "id" | "createdAt" | "projectId">>(EMPTY_TASK);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0]);

  const { data: storeData, isLoading } = useQuery({
    queryKey: ["projects-kanban", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content) {
        const parsed = data.content as any;
        return { projects: (parsed.projects || []) as Project[], tasks: (parsed.tasks || []) as ProjectTask[] };
      }
      return { projects: [] as Project[], tasks: [] as ProjectTask[] };
    },
  });

  const projects = storeData?.projects ?? [];
  const tasks = storeData?.tasks ?? [];
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;

  const persist = useMutation({
    mutationFn: async (payload: { projects: Project[]; tasks: ProjectTask[] }) => {
      const { error } = await supabase.from("cms_pages").upsert({
        slug: SLUG, title: "Projects Kanban Data", content: payload as any, published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const boardTasks = useMemo(() => {
    if (!activeProject) return [];
    return tasks.filter((t) => {
      const inProject = t.projectId === activeProject.id;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.assignee.toLowerCase().includes(search.toLowerCase());
      return inProject && matchSearch;
    });
  }, [tasks, activeProject, search]);

  function openCreateTask() {
    setEditingTask(null);
    setTaskForm(EMPTY_TASK);
    setIsTaskModalOpen(true);
  }

  function openEditTask(task: ProjectTask) {
    setEditingTask(task);
    setTaskForm({ title: task.title, description: task.description, status: task.status, priority: task.priority, assignee: task.assignee, dueDate: task.dueDate });
    setIsTaskModalOpen(true);
  }

  function saveTask() {
    if (!taskForm.title.trim()) return toast.error("Task title is required");
    if (!activeProject) return toast.error("Select a project first");
    let updatedTasks: ProjectTask[];
    if (editingTask) {
      updatedTasks = tasks.map((t) => t.id === editingTask.id ? { ...editingTask, ...taskForm } : t);
      toast.success("Task updated!");
    } else {
      const newTask: ProjectTask = { ...taskForm, id: `TSK-${Date.now()}`, projectId: activeProject.id, createdAt: new Date().toISOString() };
      updatedTasks = [newTask, ...tasks];
      toast.success(`Task "${taskForm.title}" created!`);
    }
    persist.mutate({ projects, tasks: updatedTasks });
    setIsTaskModalOpen(false);
  }

  function deleteTask(id: string) {
    persist.mutate({ projects, tasks: tasks.filter((t) => t.id !== id) });
    toast.success("Task deleted.");
  }

  function moveTask(task: ProjectTask, newStatus: ProjectTask["status"]) {
    const updated = tasks.map((t) => t.id === task.id ? { ...t, status: newStatus } : t);
    persist.mutate({ projects, tasks: updated });
    toast.success(`Moved to ${COLUMNS.find((c) => c.id === newStatus)?.label}`);
  }

  function createProject() {
    if (!projectName.trim()) return toast.error("Project name is required");
    const newProject: Project = { id: `PRJ-${Date.now()}`, name: projectName.trim(), description: projectDesc, color: projectColor, createdAt: new Date().toISOString() };
    const updatedProjects = [newProject, ...projects];
    persist.mutate({ projects: updatedProjects, tasks });
    setActiveProjectId(newProject.id);
    setIsProjectModalOpen(false);
    setProjectName("");
    setProjectDesc("");
    toast.success(`Project "${projectName}" created!`);
  }

  function deleteProject(projectId: string) {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    const updatedTasks = tasks.filter((t) => t.projectId !== projectId);
    persist.mutate({ projects: updatedProjects, tasks: updatedTasks });
    if (activeProjectId === projectId) setActiveProjectId(updatedProjects[0]?.id ?? null);
    toast.success("Project deleted.");
  }

  return (
    <PlanGuard moduleName="Projects & Kanban Board" requiredPlan="starter">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Kanban className="size-6 text-primary" /> Projects & Kanban Board
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage tasks across projects with a visual Kanban board.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsProjectModalOpen(true)} className="gap-1.5 text-xs font-bold">
              <FolderPlus className="size-4" /> New Project
            </Button>
            <Button size="sm" onClick={openCreateTask} className="gap-1.5 text-xs font-bold" disabled={!activeProject}>
              <Plus className="size-4" /> Add Task
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Projects Sidebar */}
          <div className="w-44 shrink-0 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Projects ({projects.length})</div>
            {isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : projects.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No projects yet. Create one!</p>
            ) : projects.map((p) => (
              <div
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors group ${activeProject?.id === p.id ? "bg-primary/10 border border-primary/30 font-bold text-primary" : "hover:bg-secondary/50"}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="truncate">{p.name}</span>
                </div>
                <Button size="icon" variant="ghost" className="size-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Main Kanban Board */}
          <div className="flex-1 min-w-0 space-y-3">
            {activeProject ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full" style={{ background: activeProject.color }} />
                    <span className="font-bold text-sm">{activeProject.name}</span>
                    <Badge variant="outline" className="text-[10px]">{boardTasks.length} tasks</Badge>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-8 h-8 text-xs w-48" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {COLUMNS.map((col) => {
                    const colTasks = boardTasks.filter((t) => t.status === col.id);
                    return (
                      <div key={col.id} className={`rounded-2xl border p-3 space-y-2 ${col.bg}`}>
                        <div className={`flex items-center justify-between text-xs font-bold ${col.color}`}>
                          <span className="flex items-center gap-1.5"><col.icon className="size-3.5" /> {col.label}</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">{colTasks.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {colTasks.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground text-center py-3">No tasks</p>
                          ) : (
                            colTasks.map((task) => {
                              const priority = PRIORITIES.find((p) => p.id === task.priority);
                              const nextCol = COLUMNS[COLUMNS.findIndex((c) => c.id === task.status) + 1];
                              return (
                                <Card key={task.id} className="p-2.5 space-y-1.5 shadow-xs hover:border-primary/50 transition-colors">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-bold text-[11px] leading-tight">{task.title}</span>
                                    <span className={`text-[9px] font-bold shrink-0 ${priority?.color}`}>{priority?.label}</span>
                                  </div>
                                  {task.assignee && (
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <User className="size-3" /> {task.assignee}
                                    </div>
                                  )}
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <CalendarDays className="size-3" /> {task.dueDate}
                                    </div>
                                  )}
                                  <div className="flex gap-1 pt-0.5">
                                    <Button size="icon" variant="ghost" className="size-5 text-muted-foreground" onClick={() => openEditTask(task)}>
                                      <Edit2 className="size-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="size-5 text-destructive" onClick={() => deleteTask(task.id)}>
                                      <Trash2 className="size-3" />
                                    </Button>
                                    {nextCol && (
                                      <Button size="icon" variant="ghost" className={`size-5 ${col.color}`} onClick={() => moveTask(task, nextCol.id)} title={`Move to ${nextCol.label}`}>
                                        <ArrowRight className="size-3" />
                                      </Button>
                                    )}
                                  </div>
                                </Card>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-muted-foreground space-y-3">
                <Folder className="size-12 mx-auto opacity-30" />
                <p className="font-bold text-foreground">No projects yet</p>
                <p className="text-sm">Create your first project to start managing tasks.</p>
                <Button onClick={() => setIsProjectModalOpen(true)} className="gap-2 mt-2">
                  <FolderPlus className="size-4" /> Create First Project
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Task Modal */}
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Kanban className="size-5 text-primary" /> {editingTask ? "Edit Task" : "Create Task"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Task Title *</Label>
                <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Implement user authentication" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Task details..." className="text-xs resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select value={taskForm.status} onValueChange={(v) => setTaskForm({ ...taskForm, status: v as any })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Priority</Label>
                  <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as any })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Assignee</Label>
                  <Input value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })} placeholder="Team member name" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Due Date</Label>
                  <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="text-xs" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
              <Button onClick={saveTask} disabled={persist.isPending} className="font-bold gap-2">
                {persist.isPending && <Loader2 className="size-4 animate-spin" />}
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Project Modal */}
        <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderPlus className="size-5 text-primary" /> Create New Project
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Project Name *</Label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. ERP Launch Q3" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="Project description..." className="text-xs resize-none" rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Project Color</Label>
                <div className="flex gap-2">
                  {PROJECT_COLORS.map((c) => (
                    <button key={c} onClick={() => setProjectColor(c)} className={`size-7 rounded-full border-2 transition-all ${projectColor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProjectModalOpen(false)}>Cancel</Button>
              <Button onClick={createProject} disabled={persist.isPending} className="font-bold gap-2">
                {persist.isPending && <Loader2 className="size-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
