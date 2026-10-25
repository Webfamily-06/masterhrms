"use client";

import React from "react";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export { UnifiedTodoApp };

export function ClassicTodoApp() {
  return <UnifiedTodoApp mode="apps" title="Todo Task List" />;
}

export default ClassicTodoApp;
