/**
 * MASTERHRMS — Authoritative Todo & Tasks Navigation Configuration
 * 
 * Strict alignment with:
 * 1. Single unified Todo & Tasks navigation group
 * 2. Exactly two primary submenu entries: "Todo" and "Gantt"
 * 3. Consistent across HR (/hr/*), Employee (/me/*), and Tenant (/tenant/*) Workspaces
 */

export interface TodoSubmenuEntry {
  label: "Todo" | "Gantt";
  path: string;
  icon?: string;
  permission?: string;
}

export interface TodoNavigationGroup {
  label: "Todo & Tasks";
  icon: string;
  permission?: string;
  children: [TodoSubmenuEntry, TodoSubmenuEntry];
}

export const HR_TODO_NAV_GROUP: TodoNavigationGroup = {
  label: "Todo & Tasks",
  icon: "ph-check-square-offset",
  permission: "hrm.dashboard.view",
  children: [
    { label: "Todo", path: "/hr/todo", icon: "ph-check-square", permission: "hrm.dashboard.view" },
    { label: "Gantt", path: "/hr/todo/gantt", icon: "ph-chart-bar-horizontal", permission: "hrm.dashboard.view" },
  ],
};

export const EMPLOYEE_TODO_NAV_GROUP: TodoNavigationGroup = {
  label: "Todo & Tasks",
  icon: "ph-check-square-offset",
  children: [
    { label: "Todo", path: "/me/todo", icon: "ph-check-square" },
    { label: "Gantt", path: "/me/todo/gantt", icon: "ph-chart-bar-horizontal" },
  ],
};

export const TENANT_TODO_NAV_GROUP: TodoNavigationGroup = {
  label: "Todo & Tasks",
  icon: "ph-check-square-offset",
  permission: "hrm.manage",
  children: [
    { label: "Todo", path: "/tenant/todo", icon: "ph-check-square", permission: "hrm.manage" },
    { label: "Gantt", path: "/tenant/todo/gantt", icon: "ph-chart-bar-horizontal", permission: "hrm.manage" },
  ],
};
