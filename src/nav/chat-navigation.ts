/**
 * MASTERHRMS — Authoritative Chat Navigation Configuration
 * 
 * Strict alignment with:
 * 1. Single unified Chat navigation entry per workspace
 * 2. Primary split submenu entries: "Personal", "Group", and "Call Logs"
 * 3. Consistent across HR (/hr/*), Employee (/me/*), and Tenant (/tenant/*) Workspaces
 * 4. Super Admin: No Chat entry
 */

export interface ChatSubmenuEntry {
  label: "Personal" | "Group" | "Call Logs" | "Personal Chat" | "Chat Groups" | "Chat Contacts";
  path: string;
  icon?: string;
  permission?: string;
}

export interface ChatNavigationGroup {
  label: "Chat";
  icon: string;
  permission?: string;
  children: ChatSubmenuEntry[];
}

export const HR_CHAT_NAV_GROUP: ChatNavigationGroup = {
  label: "Chat",
  icon: "ph-chat-circle-dots",
  permission: "hrm.dashboard.view",
  children: [
    { label: "Personal", path: "/hr/chat", icon: "ph-chat-circle", permission: "hrm.dashboard.view" },
    { label: "Group", path: "/hr/chat/groups", icon: "ph-users-three", permission: "hrm.dashboard.view" },
    { label: "Call Logs", path: "/hr/chat/calls", icon: "ph-phone-call", permission: "hrm.dashboard.view" },
  ],
};

export const EMPLOYEE_CHAT_NAV_GROUP: ChatNavigationGroup = {
  label: "Chat",
  icon: "ph-chat-circle-dots",
  children: [
    { label: "Personal", path: "/me/chat", icon: "ph-chat-circle" },
    { label: "Group", path: "/me/chat/groups", icon: "ph-users-three" },
    { label: "Call Logs", path: "/me/chat/calls", icon: "ph-phone-call" },
  ],
};

export const TENANT_CHAT_NAV_GROUP: ChatNavigationGroup = {
  label: "Chat",
  icon: "ph-chat-circle-dots",
  permission: "hrm.manage",
  children: [
    { label: "Personal", path: "/tenant/chat", icon: "ph-chat-circle", permission: "hrm.manage" },
    { label: "Group", path: "/tenant/chat/groups", icon: "ph-users-three", permission: "hrm.manage" },
    { label: "Call Logs", path: "/tenant/chat/calls", icon: "ph-phone-call", permission: "hrm.manage" },
  ],
};
