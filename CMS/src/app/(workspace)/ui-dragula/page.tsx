"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

interface TaskItem {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
}

export default function UIDragulaPage() {
  const [todoTasks, setTodoTasks] = useState<TaskItem[]>([
    { id: "1", title: "Review Q4 Salary Revisions", priority: "High" },
    { id: "2", title: "Approve 4 Pending Leave Applications", priority: "Medium" },
    { id: "3", title: "Update Maternity Benefit Policy Document", priority: "Low" },
  ]);

  const [inProgressTasks, setInProgressTasks] = useState<TaskItem[]>([
    { id: "4", title: "Biometric Device Firmware Upgrade", priority: "High" },
    { id: "5", title: "Audit Azure Active Directory SSO Logs", priority: "Medium" },
  ]);

  const [draggedItem, setDraggedItem] = useState<{ item: TaskItem; source: "todo" | "inProgress" } | null>(null);

  const handleDragStart = (item: TaskItem, source: "todo" | "inProgress") => {
    setDraggedItem({ item, source });
  };

  const handleDrop = (target: "todo" | "inProgress") => {
    if (!draggedItem) return;
    if (draggedItem.source === target) return;

    if (target === "todo") {
      setInProgressTasks((prev) => prev.filter((t) => t.id !== draggedItem.item.id));
      setTodoTasks((prev) => [...prev, draggedItem.item]);
    } else {
      setTodoTasks((prev) => prev.filter((t) => t.id !== draggedItem.item.id));
      setInProgressTasks((prev) => [...prev, draggedItem.item]);
    }
    setDraggedItem(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Drag & Drop (Dragula)</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive drag and drop reordering between task containers, employee pools, and priority boards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Advanced UI Component
          </span>
        </div>
      </div>

      <PreviewCard
        title="Interactive Drag and Drop Boards"
        description="Drag task cards between columns to change their execution state in realtime."
        code={`<div onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop('inProgress')}>
  <!-- Target Column -->
</div>`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
          {/* Column 1: Backlog / To Do */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop("todo")}
            className="p-4 rounded-lg bg-muted/40 border border-border/70 min-h-[220px]"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500" />
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  Pending Review ({todoTasks.length})
                </h4>
              </div>
              <span className="text-[10px] text-muted-foreground">Drop here</span>
            </div>

            <div className="space-y-2.5">
              {todoTasks.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => handleDragStart(t, "todo")}
                  className="p-3 bg-card border border-border/80 rounded-md shadow-xs cursor-grab active:cursor-grabbing hover:border-primary transition-all text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{t.title}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        t.priority === "High"
                          ? "bg-rose-500/10 text-rose-600"
                          : t.priority === "Medium"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    <i className="ph ph-dots-six-vertical" />
                    <span>Drag handle to reorder</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop("inProgress")}
            className="p-4 rounded-lg bg-muted/40 border border-border/70 min-h-[220px]"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  In Progress ({inProgressTasks.length})
                </h4>
              </div>
              <span className="text-[10px] text-muted-foreground">Drop here</span>
            </div>

            <div className="space-y-2.5">
              {inProgressTasks.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => handleDragStart(t, "inProgress")}
                  className="p-3 bg-card border border-border/80 rounded-md shadow-xs cursor-grab active:cursor-grabbing hover:border-primary transition-all text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{t.title}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        t.priority === "High"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    <i className="ph ph-dots-six-vertical" />
                    <span>Drag handle to reorder</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}
