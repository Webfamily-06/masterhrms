import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Check,
  CheckCircle2,
  Circle,
  Star,
  Search,
  Plus,
  Link2,
  MoreVertical,
  X,
  Lock,
  Edit2,
  Calendar,
  Tag,
  Clock,
  ListTodo,
  Layers,
  ChevronDown,
  Filter,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: "High" | "Medium" | "Low";
  colorDot: string;
  completed: boolean;
  starred: boolean;
  section: "Recently Assigned" | "Yesterday" | "Earlier";
  dueDate?: string;
  status?: "In Progress" | "Completed" | "Pending";
  tags?: string[];
  checklist?: { id: string; text: string; done: boolean }[];
}

const DEFAULT_TODOS: TodoItem[] = [
  {
    id: "todo_1",
    title: "Video conference with Canada Team",
    priority: "High",
    colorDot: "bg-red-500",
    completed: true,
    starred: true,
    section: "Recently Assigned",
    dueDate: "10/23/2026 10:41 AM",
    status: "In Progress",
    description: "Instant rebuilding of assets during development",
    tags: ["Framework", "Html"],
    checklist: [
      { id: "c1", text: "Video conference with canada Team", done: true },
      { id: "c2", text: "Client objective meeting", done: true },
      { id: "c3", text: "Invite jaqueline on video conference", done: false },
    ],
  },
  {
    id: "todo_2",
    title: "Client objective meeting",
    priority: "High",
    colorDot: "bg-amber-500",
    completed: true,
    starred: false,
    section: "Recently Assigned",
    dueDate: "10/24/2026 02:00 PM",
    status: "In Progress",
    description: "Align deliverables with Q4 roadmap commitments",
    tags: ["Strategy"],
  },
  {
    id: "todo_3",
    title: "Target market trend analysis on the go",
    priority: "High",
    colorDot: "bg-red-500",
    completed: false,
    starred: false,
    section: "Recently Assigned",
    dueDate: "10/25/2026 11:30 AM",
    status: "Pending",
  },
  {
    id: "todo_4",
    title: "Send revised proposal to Mr. Dow Jon...",
    priority: "Low",
    colorDot: "bg-amber-700",
    completed: false,
    starred: true,
    section: "Recently Assigned",
    dueDate: "10/26/2026 05:00 PM",
    status: "Pending",
  },
  {
    id: "todo_5",
    title: "Set up first call for demo",
    priority: "Medium",
    colorDot: "bg-amber-500",
    completed: false,
    starred: false,
    section: "Recently Assigned",
    dueDate: "10/27/2026 04:00 PM",
    status: "Pending",
  },
  {
    id: "todo_6",
    title: "Upgrade dependency on resouces",
    priority: "Medium",
    colorDot: "bg-red-500",
    completed: false,
    starred: true,
    section: "Recently Assigned",
    dueDate: "10/28/2026 01:00 PM",
    status: "Pending",
  },
  {
    id: "todo_7",
    title: "Update contribution guidelines and lic...",
    priority: "Medium",
    colorDot: "bg-red-500",
    completed: false,
    starred: false,
    section: "Recently Assigned",
    dueDate: "10/29/2026 03:30 PM",
    status: "Pending",
  },
];

export function ClassicTodoApp() {
  const queryClient = useQueryClient();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [activeTab, setActiveTab] = useState<"Checklist" | "Comments" | "Files" | "Activity">("Checklist");
  const [searchQuery, setSearchQuery] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Sync with real backend Todo API
  const { data: serverTodos } = useQuery({
    queryKey: ["todo-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/todos");
        const list = res?.data || (Array.isArray(res) ? res : []);
        return (list as any[]).map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority === "high" ? "High" : t.priority === "low" ? "Low" : "Medium",
          colorDot: t.priority === "high" ? "bg-red-500" : "bg-amber-500",
          completed: !!t.completed,
          starred: false,
          section: "Recently Assigned" as const,
          dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "Upcoming",
          status: (t.completed ? "Completed" : "In Progress") as any,
          description: t.description,
        })) as TodoItem[];
      } catch {
        return [];
      }
    },
  });

  const allTodos = serverTodos && serverTodos.length > 0
    ? [...todos, ...serverTodos.filter(st => !todos.some(lt => lt.id === st.id))]
    : todos;

  const activeSelectedTodo = selectedTodo || allTodos[0] || null;

  const handleToggleDone = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = allTodos.find((t) => t.id === id);
    if (!item) return;
    const newCompleted = !item.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t))
    );
    if (activeSelectedTodo && activeSelectedTodo.id === id) {
      setSelectedTodo({ ...activeSelectedTodo, completed: newCompleted });
    }
    try {
      await api.put(`/api/todos/${id}`, { completed: newCompleted });
      queryClient.invalidateQueries({ queryKey: ["todo-list"] });
    } catch {
      // Local fallback
    }
    toast.success("Task status updated");
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t))
    );
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem = {
      id: `chk_${Date.now()}`,
      text: newChecklistText.trim(),
      done: false,
    };
    setSelectedTodo((prev) => ({
      ...(prev || activeSelectedTodo),
      checklist: [...((prev || activeSelectedTodo).checklist || []), newItem],
    }));
    setNewChecklistText("");
    toast.success("Checklist item added");
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    const created: TodoItem = {
      id: `task_${Date.now()}`,
      title,
      priority: "Medium",
      colorDot: "bg-teal-600",
      completed: false,
      starred: false,
      section: "Recently Assigned",
      dueDate: new Date().toLocaleDateString(),
      status: "In Progress",
      description: "Custom user task",
    };
    setTodos((prev) => [created, ...prev]);
    setSelectedTodo(created);
    setNewTaskTitle("");
    setNewTaskModalOpen(false);

    try {
      await api.post("/api/todos", {
        title,
        priority: "medium",
        tag: "general",
        completed: false,
      });
      queryClient.invalidateQueries({ queryKey: ["todo-list"] });
      toast.success("New task created and saved to database!");
    } catch {
      toast.success("New task created locally!");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background border-t border-border">
      {/* ─── LEFT TASKS LIST PANE ─── */}
      <section className="flex-1 flex flex-col bg-card border-r border-border min-w-0">
        {/* Top Header Controls */}
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-card">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 font-bold text-base text-foreground cursor-pointer hover:text-teal-700">
                  <span>All Tasks</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="cursor-pointer">All Tasks</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Important</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Completed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Bulk actions <ChevronDown className="size-3 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="text-xs h-7.5 px-3 cursor-pointer"
                onClick={() => toast.info("Action applied")}
              >
                Apply
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Sort by date <ChevronDown className="size-3 ml-1" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/apps/todo/gantt"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <TrendingUp className="size-3.5 text-teal-600" />
              <span>Gantt Timeline</span>
            </Link>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks"
                className="text-xs h-8 w-44 bg-muted/20 border-border"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setNewTaskModalOpen(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white size-8 p-0 rounded-lg cursor-pointer"
              title="Add Task"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Task List Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-foreground mb-3 px-1">Recently Assigned</h4>
            <div className="space-y-1.5">
              {allTodos.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No tasks found in your workspace. Click &quot;Add New Task&quot; to create one.
                </div>
              ) : (
                allTodos
                  .filter(
                    (t) =>
                      !searchQuery ||
                      t.title.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((todo) => {
                    const isSelected = activeSelectedTodo?.id === todo.id;
                    return (
                      <div
                        key={todo.id}
                        onClick={() => setSelectedTodo(todo)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                          isSelected
                            ? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-600/60 shadow-2xs"
                            : "bg-card border-border/70 hover:bg-muted/40"
                        )}
                      >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={(e) => handleToggleDone(todo.id, e)}
                          className="text-muted-foreground hover:text-teal-700 cursor-pointer"
                        >
                          {todo.completed ? (
                            <CheckSquare className="size-4 text-teal-700" />
                          ) : (
                            <div className="size-4 rounded border border-border" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleToggleStar(todo.id, e)}
                          className="text-muted-foreground hover:text-amber-500 cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "size-3.5",
                              todo.starred ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                            )}
                          />
                        </button>
                        <span className={cn("size-2.5 rounded-full flex-shrink-0", todo.colorDot)} />
                        <span
                          className={cn(
                            "text-xs font-semibold text-foreground truncate",
                            todo.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {todo.title}
                        </span>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          todo.priority === "High"
                            ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30"
                            : todo.priority === "Low"
                            ? "border-amber-600 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
                            : "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                        )}
                      >
                        • {todo.priority}
                      </Badge>
                    </div>
                  );
                }))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── RIGHT TASK DETAIL DRAWER ─── */}
      <aside className="w-[420px] flex-shrink-0 bg-card flex flex-col overflow-y-auto">
        {activeSelectedTodo ? (
          <>
            {/* Detail Header Actions */}
            <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="size-7 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 flex items-center justify-center font-bold text-[11px]">
              8/12
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeSelectedTodo.completed}
                onChange={() => {
                  setSelectedTodo({ ...activeSelectedTodo, completed: !activeSelectedTodo.completed });
                  setTodos((prev) =>
                    prev.map((t) => (t.id === activeSelectedTodo.id ? { ...t, completed: !t.completed } : t))
                  );
                  toast.success("Marked task completion");
                }}
                className="rounded border-border text-teal-700"
              />
              <span className="text-foreground">Mark as completed</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success("Task link copied!");
              }}
              className="p-1 hover:text-foreground cursor-pointer flex items-center gap-1 text-[11px]"
              title="Copy link"
            >
              <Link2 className="size-3.5" />
              <span>Copy Link</span>
            </button>
            <button
              onClick={() => {
                setSelectedTodo({ ...activeSelectedTodo, starred: !activeSelectedTodo.starred });
              }}
              className="p-1 hover:text-amber-500 cursor-pointer"
            >
              <Star
                className={cn(
                  "size-3.5",
                  activeSelectedTodo.starred ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                )}
              />
            </button>
            <MoreVertical className="size-3.5 cursor-pointer hover:text-foreground" />
          </div>
        </div>

        {/* Detail Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Security Alert Banner */}
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <Lock className="size-4 text-teal-600 flex-shrink-0" />
            <span className="font-semibold text-[11px]">This task is private for Jampack Team</span>
          </div>

          {/* Title & Description */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">{activeSelectedTodo.title}</h3>
              <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeSelectedTodo.description || "Instant rebuilding of assets during development"}
            </p>
          </div>

          {/* Team Avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {["JD", "TS", "RM"].map((m, i) => (
                <div
                  key={i}
                  className="size-7 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-card flex items-center justify-center font-bold text-[10px] text-foreground"
                >
                  {m}
                </div>
              ))}
            </div>
            <button
              onClick={() => toast.info("Add assignee to task")}
              className="size-7 rounded-full bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {/* Due Date & Status */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
              <Input
                value={activeSelectedTodo.dueDate || "10/23/2026 10:41 AM"}
                onChange={(e) => setSelectedTodo({ ...activeSelectedTodo, dueDate: e.target.value })}
                className="text-xs h-8 bg-muted/20 border-border"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <div className="h-8 px-3 rounded-md bg-amber-500 text-white font-bold text-xs flex items-center justify-between">
                <span>{activeSelectedTodo.status || "In Progress"}</span>
                <ChevronDown className="size-3" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Labels</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {(activeSelectedTodo.tags || ["Framework", "Html"]).map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md border border-border bg-muted/30 text-[11px] font-medium flex items-center gap-1"
                >
                  <span>{tag}</span>
                  <X className="size-2.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                </span>
              ))}
              <button
                onClick={() => toast.info("Add chip")}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-1.5"
              >
                + Add Chips
              </button>
            </div>
          </div>

          {/* Tabs: Checklist vs Comments vs Files */}
          <div className="border border-border rounded-xl p-0.5 bg-muted/30 grid grid-cols-4 text-center">
            {(["Checklist", "Comments", "Files", "Activity"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                  activeTab === tab ? "bg-teal-700 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Checklist Tab Content */}
          {activeTab === "Checklist" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-foreground">Checklist</h5>
                <button
                  onClick={() => toast.info("Checklist settings")}
                  className="size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Plus className="size-3" />
                </button>
              </div>

              <div className="space-y-2">
                {(activeSelectedTodo.checklist || []).map((item) => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => {
                        setSelectedTodo((prev) => {
                          const base = prev || activeSelectedTodo;
                          return {
                            ...base,
                            checklist: base.checklist?.map((c) =>
                              c.id === item.id ? { ...c, done: !c.done } : c
                            ),
                          };
                        });
                      }}
                      className="rounded border-border text-teal-700"
                    />
                    <span className={cn("text-xs", item.done && "line-through text-muted-foreground")}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>

              {/* Add Checklist Item */}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                  placeholder="+ New Item"
                  className="text-xs h-7.5 bg-muted/20 border-border"
                />
                <Button
                  size="sm"
                  onClick={handleAddChecklistItem}
                  className="h-7.5 text-xs bg-teal-700 hover:bg-teal-800 text-white"
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {activeTab === "Comments" && (
            <div className="p-4 text-center text-muted-foreground text-xs">
              No comments posted on this task yet.
            </div>
          )}
        </div>
      </>
    ) : (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs">
        <CheckSquare className="size-8 text-muted-foreground/30 mb-2" />
        <p className="font-semibold text-foreground">No task selected</p>
        <p className="mt-1">Select a task from the list to view and manage details</p>
      </div>
    )}
  </aside>

      {/* ─── MODAL: CREATE NEW TASK ─── */}
      <Dialog open={newTaskModalOpen} onOpenChange={setNewTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add New Task</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-xs">
            <div>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Conduct quarterly security audit"
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white" onClick={handleCreateTask}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
