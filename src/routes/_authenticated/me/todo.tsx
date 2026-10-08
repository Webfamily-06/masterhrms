import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  CheckSquare,
  Plus,
  Clock,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/me/todo")({
  component: EmployeeTodoPage,
  head: () => ({ meta: [{ title: "My Tasks & Action Items — Master HRMS" }] }),
});

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  status: string;
  completed: boolean;
  sourceDomain: string;
  sourceId: string;
  linkTo: string;
  canComplete: boolean;
  badgeLabel: string;
  badgeColor: string;
}

export function EmployeeTodoPage() {
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "completed">("pending");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery<TodoItem[]>({
    queryKey: ["me-todo-items", statusTab],
    queryFn: async () => {
      const res = await api.get<TodoItem[]>("/me/todo/items", {
        params: { status: statusTab },
      });
      return res || [];
    },
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    tag: "personal",
  });

  const createTodoMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await api.post("/me/todo/items", payload);
    },
    onSuccess: () => {
      toast.success("Personal task created");
      setIsAddModalOpen(false);
      setForm({ title: "", description: "", priority: "medium", dueDate: "", tag: "personal" });
      queryClient.invalidateQueries({ queryKey: ["me-todo-items"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create task");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ item, completed }: { item: TodoItem; completed: boolean }) => {
      return await api.patch("/me/todo/items/status", {
        sourceDomain: item.sourceDomain,
        sourceId: item.sourceId,
        completed,
      });
    },
    onSuccess: () => {
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["me-todo-items"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update task");
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/me/todo/items/${id}`);
    },
    onSuccess: () => {
      toast.success("Task removed");
      queryClient.invalidateQueries({ queryKey: ["me-todo-items"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete task");
    },
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

    const matchesSource = sourceFilter === "all" || item.sourceDomain === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const pendingCount = items.filter((i) => !i.completed).length;
  const completedCount = items.filter((i) => i.completed).length;
  const urgentCount = items.filter((i) => i.priority === "urgent" || i.priority === "high").length;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="text-[10px]">Urgent</Badge>;
      case "high":
        return <Badge className="bg-amber-600 text-white text-[10px]">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-[10px]">Medium</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks & Action Items"
        description="Your unified deliverables across meeting action items, equipment handovers, policy sign-offs, and personal todos"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4" /> Personal Task
          </Button>
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="All My Tasks"
          value={isLoading ? "..." : items.length}
          description="Assigned & personal items"
          icon={CheckSquare}
          variant="primary"
        />
        <StatCard
          title="Pending Attention"
          value={isLoading ? "..." : pendingCount}
          description="Awaiting your action"
          icon={Clock}
          variant="secondary"
        />
        <StatCard
          title="Completed"
          value={isLoading ? "..." : completedCount}
          description="Completed deliverables"
          icon={CheckCircle2}
          variant="secondary"
        />
        <StatCard
          title="High Priority"
          value={isLoading ? "..." : urgentCount}
          description="Important or overdue"
          icon={AlertCircle}
          variant="secondary"
        />
      </StatsOverviewGrid>

      {/* Tabs and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
          <Button
            variant={statusTab === "pending" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusTab("pending")}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={statusTab === "completed" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusTab("completed")}
          >
            Completed ({completedCount})
          </Button>
          <Button
            variant={statusTab === "all" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusTab("all")}
          >
            All Items
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search my tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs w-full sm:w-56"
          />
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="All Domains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="meeting_action">Meeting Actions</SelectItem>
              <SelectItem value="asset_handover">Asset Handovers</SelectItem>
              <SelectItem value="document_ack">Policy Sign-offs</SelectItem>
              <SelectItem value="workspace_todo">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-card border rounded-xl divide-y overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No matching tasks found. You are all caught up!
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors",
                item.completed && "bg-muted/10 opacity-70"
              )}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled={!item.canComplete || toggleStatusMutation.isPending}
                  onChange={(e) =>
                    toggleStatusMutation.mutate({ item, completed: e.target.checked })
                  }
                  className="mt-1 size-4 rounded text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={cn(
                        "font-semibold text-sm leading-tight",
                        item.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {item.title}
                    </h4>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        item.badgeColor
                      )}
                    >
                      {item.badgeLabel}
                    </span>
                    {getPriorityBadge(item.priority)}
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    {item.dueDate && (
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Due: {format(new Date(item.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.sourceDomain === "workspace_todo" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteTodoMutation.mutate(item.sourceId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {item.linkTo && (
                  <Button variant="outline" size="sm" asChild className="gap-1 text-xs h-8">
                    <a href={item.linkTo}>
                      Go to Item <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Personal Task</DialogTitle>
            <DialogDescription>
              Create a personal workplace reminder or to-do item.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTodoMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Prepare presentation notes"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(val) => setForm({ ...form, priority: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTodoMutation.isPending}>
                {createTodoMutation.isPending ? "Creating..." : "Save Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
