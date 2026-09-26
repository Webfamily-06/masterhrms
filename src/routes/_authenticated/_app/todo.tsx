import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/_app/todo")({
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

const INITIAL_TODOS: TodoItem[] = [
  {
    id: "todo-1",
    title: "Review monthly payroll tax deductions & register",
    description: "Verify TDS brackets and employee statutory contributions before running bank batch.",
    completed: false,
    priority: "high",
    tag: "internal",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    createdAt: format(new Date(), "yyyy-MM-dd"),
  },
  {
    id: "todo-2",
    title: "Conduct candidate technical round for Senior Fullstack role",
    description: "Evaluate system architecture concepts and live coding submission.",
    completed: false,
    priority: "high",
    tag: "meetings",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    createdAt: format(new Date(), "yyyy-MM-dd"),
  },
  {
    id: "todo-3",
    title: "Audit company hardware asset register for Q1 refresh",
    description: "Verify all assigned laptops and monitor tags across departments.",
    completed: true,
    priority: "medium",
    tag: "projects",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    createdAt: format(new Date(), "yyyy-MM-dd"),
  },
  {
    id: "todo-4",
    title: "Draft updated Work From Home & Attendance regularization policy",
    description: "Incorporate biometric grace period guidelines into company handbook.",
    completed: false,
    priority: "low",
    tag: "research",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    createdAt: format(new Date(), "yyyy-MM-dd"),
  },
];

export function TodoPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem(`hrms_todos_${tenantId}`);
    return saved ? JSON.parse(saved) : INITIAL_TODOS;
  });

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [sortBy, setSortBy] = useState<"created" | "priority" | "due">("created");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TodoItem["priority"],
    tag: "internal" as TodoItem["tag"],
    dueDate: format(new Date(), "yyyy-MM-dd"),
  });

  function saveTodos(newTodos: TodoItem[]) {
    setTodos(newTodos);
    localStorage.setItem(`hrms_todos_${tenantId}`, JSON.stringify(newTodos));
  }

  function handleToggleComplete(id: string) {
    const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    saveTodos(updated);
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
      const updated = todos.map((t) =>
        t.id === editingTodo.id
          ? {
              ...t,
              title: form.title.trim(),
              description: form.description.trim(),
              priority: form.priority,
              tag: form.tag,
              dueDate: form.dueDate,
            }
          : t
      );
      saveTodos(updated);
      toast.success("Task updated.");
    } else {
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        completed: false,
        priority: form.priority,
        tag: form.tag,
        dueDate: form.dueDate,
        createdAt: format(new Date(), "yyyy-MM-dd"),
      };
      saveTodos([newTodo, ...todos]);
      toast.success("New task created.");
    }

    setIsModalOpen(false);
  }

  function handleDeleteTodo(id: string) {
    saveTodos(todos.filter((t) => t.id !== id));
    toast.success("Task deleted.");
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
    <div className="space-y-5 max-w-full pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="size-5 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-foreground">Todo & Task Tracker</h1>
            <Badge variant="outline" className="text-[10px] font-mono">
              {completedCount}/{totalCount} Done ({progressPercent}%)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational action items, daily agendas, and team priorities.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground">
          <Plus className="size-3.5" /> Add New Task
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
            <h3 className="text-2xl font-bold text-foreground">{totalCount}</h3>
          </div>
          <div className="p-2.5 rounded-full bg-primary/10 text-primary">
            <ListTodo className="size-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Pending Action</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</h3>
          </div>
          <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-500">
            <Clock className="size-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</h3>
          </div>
          <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
            <h3 className="text-2xl font-bold text-primary">{progressPercent}%</h3>
          </div>
          <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center font-bold text-xs">
            {progressPercent}%
          </div>
        </Card>
      </div>

      {/* Filter & Action Controls */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {/* Status Filter */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 shrink-0">
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
              <SelectTrigger className="w-[120px] text-xs h-9">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Tag Select */}
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[140px] text-xs h-9">
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
              <SelectTrigger className="w-[130px] text-xs h-9">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due">Due Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Task List */}
      {filteredTodos.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground text-xs italic">
          No tasks found matching your filter criteria.
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTodos.map((todo) => {
            const tagInfo = TAG_MAP[todo.tag] || TAG_MAP.internal;
            return (
              <Card
                key={todo.id}
                className={cn(
                  "p-3.5 flex items-start justify-between gap-3 transition-all hover:shadow-xs border",
                  todo.completed && "opacity-60 bg-muted/20"
                )}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="pt-0.5">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleComplete(todo.id)}
                      className="size-4.5 rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "font-bold text-xs text-foreground cursor-pointer transition-all",
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
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
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
                  <Button size="icon" variant="ghost" className="size-7 text-rose-500" onClick={() => handleDeleteTodo(todo.id)} title="Delete">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
