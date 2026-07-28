import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Kanban, Plus, CheckCircle2, Clock, AlertCircle, User, Sparkles, Folder } from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects & Tasks — Master ERP" }] }),
});

const INITIAL_TASKS = [
  { id: "TSK-101", title: "Migrate Tally ERP Database to Cloud", status: "in_progress", priority: "high", assignee: "Rahul Sharma", project: "ERP Launch" },
  { id: "TSK-102", title: "Setup Biometric Attendance Terminals", status: "done", priority: "medium", assignee: "Priya Patel", project: "Hardware Sync" },
  { id: "TSK-103", title: "Configure GST Tax Rates & Form 16", status: "todo", priority: "high", assignee: "Anand Verma", project: "Tax Compliance" },
  { id: "TSK-104", title: "Audit WhatsApp API Notification Triggers", status: "in_progress", priority: "medium", assignee: "Neha Gupta", project: "Messaging Addon" },
  { id: "TSK-105", title: "Quarterly Financial Ledger Closing", status: "todo", priority: "low", assignee: "Sanjay Mehta", project: "Finance" },
];

function ProjectsPage() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");

  function addTask() {
    if (!taskTitle) return toast.error("Please enter task title");
    const newTask = {
      id: `TSK-${Math.floor(100 + Math.random() * 900)}`,
      title: taskTitle,
      status: "todo",
      priority: "medium",
      assignee: taskAssignee || "Unassigned",
      project: "General Project",
    };
    setTasks([...tasks, newTask]);
    toast.success(`Task "${taskTitle}" created!`);
    setTaskTitle("");
    setTaskAssignee("");
  }

  function moveStatus(id: string, newStatus: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    toast.success(`Task status updated to ${newStatus.toUpperCase()}`);
  }

  const columns = [
    { id: "todo", title: "To Do 📋", badge: "bg-secondary" },
    { id: "in_progress", title: "In Progress ⚡", badge: "bg-primary/10 text-primary border-primary/20" },
    { id: "done", title: "Completed ✅", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  ];

  return (
    <PlanGuard moduleName="Projects & Kanban Board" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Kanban className="size-6 text-primary" /> Projects & Task Kanban
            </h1>
            <p className="text-xs text-muted-foreground">Manage project deliverables, task assignees, priorities & agile Kanban boards.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={tasks.length} limit={100} label="Active Tasks" />
          </div>
        </div>

        {/* Create Task Quick Input */}
        <Card className="p-4 bg-card shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter new task title..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="flex-1 text-xs"
            />
            <Input
              placeholder="Assignee (e.g. Rahul S)"
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
              className="w-full sm:w-48 text-xs"
            />
            <Button onClick={addTask} className="font-bold text-xs gap-1.5 shrink-0">
              <Plus className="size-4" /> Create Task
            </Button>
          </div>
        </Card>

        {/* Kanban Board Columns */}
        <div className="grid md:grid-cols-3 gap-6">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="space-y-3 p-4 rounded-2xl bg-secondary/30 border">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{col.title}</span>
                  <Badge variant="outline" className={`font-mono text-xs ${col.badge}`}>
                    {colTasks.length}
                  </Badge>
                </div>

                <div className="space-y-2.5 min-h-[300px]">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">No tasks here</div>
                  ) : (
                    colTasks.map((t) => (
                      <Card key={t.id} className="p-3.5 space-y-2 shadow-xs hover:border-primary/40 transition-all bg-card">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {t.id}
                          </Badge>
                          <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">{t.priority}</span>
                        </div>
                        <p className="font-bold text-xs leading-snug">{t.title}</p>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t">
                          <span className="flex items-center gap-1">
                            <User className="size-3 text-primary" /> {t.assignee}
                          </span>
                          {col.id !== "done" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 font-semibold text-primary"
                              onClick={() => moveStatus(t.id, col.id === "todo" ? "in_progress" : "done")}
                            >
                              Move →
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PlanGuard>
  );
}
