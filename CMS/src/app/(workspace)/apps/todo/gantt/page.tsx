"use client";

import React from "react";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export default function GanttTimelinePage() {
  return <UnifiedTodoApp initialView="gantt" mode="apps" title="Todo Gantt Timeline" />;
}

