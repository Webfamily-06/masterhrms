"use client";

import React from "react";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export { UnifiedTodoApp };

export interface GanttTimelineViewProps {
  onSwitchToList?: () => void;
}

export function GanttTimelineView({ onSwitchToList }: GanttTimelineViewProps) {
  return <UnifiedTodoApp initialView="gantt" title="Todo Gantt Timeline" />;
}

export default GanttTimelineView;
