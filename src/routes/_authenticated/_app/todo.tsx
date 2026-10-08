import { createFileRoute, redirect } from "@tanstack/react-router";
import { extractRolesFromToken } from "@/lib/auth-navigation";
import { useState, useMemo } from "react";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Download,
  AlertCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingState } from "@/components/system-states/loading-state";
import { EmptyState } from "@/components/system-states/empty-state";

export const Route = createFileRoute("/_authenticated/_app/todo")({
  beforeLoad: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    const { roles } = extractRolesFromToken(token);
    const isHrOrAdmin = roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin", "hr"].includes(r));
    throw redirect({ to: isHrOrAdmin ? "/hr/todo" : "/me/todo" });
  },
  component: TodoPage,
  head: () => ({ meta: [{ title: "Todo & Task Action Tracker — Master HRMS" }] }),
});

export type TodoItem = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  tag: "internal" | "projects" | "meetings" | "reminder" | "research";
  dueDate: string;
  createdAt: string;
};

const TAG_MAP: Record<string, { label: string; color: string; bg: string }> = {
  internal: { label: "Internal Operations", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" },
  projects: { label: "Client Projects", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 border-blue-500/20" },
  meetings: { label: "Meeting Prep", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
  reminder: { label: "Action Reminder", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
  research: { label: "Research & Design", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function TodoPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: todosData, isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/todos");
      return res.data || [];
    },
  });

  const todos: TodoItem[] = useMemo(() => {
    return (todosData || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description || undefined,
      completed: Boolean(t.completed),
      priority: t.priority as TodoItem["priority"],
      tag: (t.tag || "internal") as TodoItem["tag"],
      dueDate: t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      createdAt: t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    }));
  }, [todosData]);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [sortBy, setSortBy] = useState<"created" | "priority" | "due">("created");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TodoItem["priority"],
    tag: "internal" as TodoItem["tag"],
    dueDate: format(new Date(), "yyyy-MM-dd"),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/todos", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("New task created.");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to create task");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/todos/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Task updated.");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to update task");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/todos/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Task deleted.");
      setTodoToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete task");
    },
  });

  function handleToggleComplete(id: string) {
    const t = todos.find((item) => item.id === id);
    if (!t) return;
    updateMutation.mutate({
      id,
      data: { completed: !t.completed },
    });
  }

  function handleOpenCreate() {
    setEditingTodo(null);
    setForm({
      title: "",
      description: "",
      priority: "medium",
      tag: "internal",
      dueDate: format(new Date(), "yyyy-MM-dd"),
    });
    setIsModalOpen(true);
  }

  function handleOpenEdit(todo: TodoItem) {
    setEditingTodo(todo);
    setForm({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      tag: todo.tag,
      dueDate: todo.dueDate,
    });
    setIsModalOpen(true);
  }

  function handleSaveTodo() {
    if (!form.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (editingTodo) {
      updateMutation.mutate({
        id: editingTodo.id,
        data: {
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          tag: form.tag,
          dueDate: form.dueDate,
        },
      });
    } else {
      createMutation.mutate({
        title: form.title.trim(),
        description: form.description.trim(),
        completed: false,
        priority: form.priority,
        tag: form.tag,
        dueDate: form.dueDate,
      });
    }
  }

  function handleDeleteTodo(id: string) {
    deleteMutation.mutate(id);
  }

  // Summary Metrics
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered & Sorted Todos
  const filteredTodos = useMemo(() => {
    return todos
      .filter((t) => {
        if (statusFilter === "pending") return !t.completed;
        if (statusFilter === "completed") return t.completed;
        return true;
      })
      .filter((t) => (priorityFilter === "all" ? true : t.priority === priorityFilter))
      .filter((t) => (tagFilter === "all" ? true : t.tag === tagFilter))
      .filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const pOrder = { high: 1, medium: 2, low: 3 };
          return pOrder[a.priority] - pOrder[b.priority];
        }
        if (sortBy === "due") {
          return a.dueDate.localeCompare(b.dueDate);
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [todos, statusFilter, priorityFilter, tagFilter, search, sortBy]);

  return (
    <div className="space-y-6 max-w-full pb-8">
      {/* ─── PageHeader ─── */}
      <PageHeader
        title="Todo & Task Tracker"
        description="Operational action items, daily agendas, and team priorities."
        icon={<CheckSquare className="size-5 text-primary" />}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Workplace", href: "/hr/todo" },
          { label: "Todo & Tasks" },
        ]}
        badge={
          <Badge variant="outline" className="text-[10px] font-mono border-border/80">
            {completedCount}/{totalCount} Done ({progressPercent}%)
          </Badge>
        }
        actions={
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <Plus className="size-3.5" /> Add New Task
          </Button>
        }
      />

      {/* ─── KPI Stats Overview Grid ─── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Tasks"
          value={totalCount}
          icon={<ListTodo className="size-4.5" />}
          description="All active registered action items"
          variant="default"
          isLoading={isLoading}
        />
        <StatCard
          label="Pending Action"
          value={pendingCount}
          icon={<Clock className="size-4.5" />}
          description="Awaiting completion"
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={<CheckCircle2 className="size-4.5" />}
          description="Finished successfully"
          variant="success"
          isLoading={isLoading}
        />
        <StatCard
          label="Completion Rate"
          value={`${progressPercent}%`}
          icon={<CheckSquare className="size-4.5" />}
          description={`${completedCount} of ${totalCount} items completed`}
          variant="primary"
          isLoading={isLoading}
        />
      </StatsOverviewGrid>

      {/* ─── FilterToolbar ─── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search tasks by title or notes...",
        }}
        filters={
          <>
            {/* Status Quick Toggle */}
            <div className="flex items-center border border-border/70 rounded-lg p-0.5 bg-muted/40 shrink-0">
              {(["all", "pending", "completed"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "secondary" : "ghost"}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "h-7 px-2.5 text-xs font-semibold capitalize",
                    statusFilter === s && "bg-background shadow-2xs font-bold text-foreground"
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>

            {/* Priority Select */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px] text-xs h-8.5 bg-background border-border/80">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            {/* Tag Select */}
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[140px] text-xs h-8.5 bg-background border-border/80">
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {Object.entries(TAG_MAP).map(([key, t]) => (
                  <SelectItem key={key} value={key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-[130px] text-xs h-8.5 bg-background border-border/80">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due">Due Date</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* ─── Task Content List ─── */}
      {isLoading ? (
        <LoadingState
          variant="cards"
          rows={3}
          message="Loading action items and daily agendas..."
        />
      ) : filteredTodos.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description={
            search || priorityFilter !== "all" || tagFilter !== "all" || statusFilter !== "all"
              ? "No tasks match your current filter parameters. Try clearing some filters."
              : "You have no registered tasks yet. Create one to begin tracking action items."
          }
          actionLabel="Create First Task"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="space-y-2">
          {filteredTodos.map((todo) => {
            const tagInfo = TAG_MAP[todo.tag] || TAG_MAP.internal;
            return (
              <Card
                key={todo.id}
                className={cn(
                  "p-3.5 flex items-start justify-between gap-3 transition-all hover:shadow-xs border border-border/70 bg-card",
                  todo.completed && "opacity-60 bg-muted/20 border-border/50"
                )}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="pt-0.5">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleComplete(todo.id)}
                      className="size-4 rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "font-semibold text-xs text-foreground cursor-pointer transition-all hover:text-primary",
                          todo.completed && "line-through text-muted-foreground"
                        )}
                        onClick={() => handleToggleComplete(todo.id)}
                      >
                        {todo.title}
                      </span>

                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-semibold border capitalize",
                          todo.priority === "high"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                            : todo.priority === "medium"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            : "bg-slate-500/10 text-slate-600 border-slate-500/30"
                        )}
                      >
                        {todo.priority}
                      </Badge>

                      <Badge variant="outline" className={cn("text-[9px] font-semibold border", tagInfo.bg, tagInfo.color)}>
                        {tagInfo.label}
                      </Badge>
                    </div>

                    {todo.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {todo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-primary" /> Due: {todo.dueDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => handleOpenEdit(todo)} title="Edit">
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    onClick={() => setTodoToDelete(todo.id)}
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── ConfirmationDialog for Task Deletion ─── */}
      <ConfirmationDialog
        open={!!todoToDelete}
        onOpenChange={(open) => !open && setTodoToDelete(null)}
        title="Delete Task?"
        description="This will permanently delete this task from your action tracker. This action cannot be undone."
        confirmLabel="Delete Task"
        onConfirm={() => {
          if (todoToDelete) {
            handleDeleteTodo(todoToDelete);
          }
        }}
        isLoading={deleteMutation.isPending}
      />

      {/* Modal: Create or Edit Todo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="size-5 text-primary" /> {editingTodo ? "Edit Task" : "Add New Task"}
            </DialogTitle>
            <DialogDescription>
              Assign action items with priority and due date deadlines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold">Task Title *</Label>
              <Input
                placeholder="e.g. Audit biometric attendance devices"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Priority</Label>
                <Select value={form.priority} onValueChange={(val: any) => setForm({ ...form, priority: val })}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Category Tag</Label>
                <Select value={form.tag} onValueChange={(val: any) => setForm({ ...form, tag: val })}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TAG_MAP).map(([key, t]) => (
                      <SelectItem key={key} value={key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Description (Optional)</Label>
              <Textarea
                rows={3}
                placeholder="Additional notes or action steps..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTodo} className="font-bold">
              {editingTodo ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
