/**
 * MASTERHRMS — Authoritative Chat Navigation Configuration
 * 
 * Strict alignment with:
 * 1. Single unified Chat navigation entry per workspace
 * 2. Primary submenu entries: "Personal Chat", "Chat Groups", "Chat Contacts", and "Call Logs"
 * 3. Consistent across HR (/hr/*), Employee (/me/*), and Tenant (/tenant/*) Workspaces
 * 4. Super Admin: No Chat entry
 */

export interface ChatSubmenuEntry {
  label: "Personal Chat" | "Chat Groups" | "Chat Contacts" | "Call Logs";
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
    { label: "Personal Chat", path: "/hr/chat", icon: "ph-chat-circle", permission: "hrm.dashboard.view" },
    { label: "Chat Groups", path: "/hr/chat/groups", icon: "ph-users-three", permission: "hrm.dashboard.view" },
    { label: "Chat Contacts", path: "/hr/chat/contacts", icon: "ph-address-book", permission: "hrm.dashboard.view" },
    { label: "Call Logs", path: "/hr/chat/calls", icon: "ph-phone-call", permission: "hrm.dashboard.view" },
  ],
};

export const EMPLOYEE_CHAT_NAV_GROUP: ChatNavigationGroup = {
  label: "Chat",
  icon: "ph-chat-circle-dots",
  children: [
    { label: "Personal Chat", path: "/me/chat", icon: "ph-chat-circle" },
    { label: "Chat Groups", path: "/me/chat/groups", icon: "ph-users-three" },
    { label: "Chat Contacts", path: "/me/chat/contacts", icon: "ph-address-book" },
    { label: "Call Logs", path: "/me/chat/calls", icon: "ph-phone-call" },
  ],
};

export const TENANT_CHAT_NAV_GROUP: ChatNavigationGroup = {
  label: "Chat",
  icon: "ph-chat-circle-dots",
  permission: "hrm.manage",
  children: [
    { label: "Personal Chat", path: "/tenant/chat", icon: "ph-chat-circle", permission: "hrm.manage" },
    { label: "Chat Groups", path: "/tenant/chat/groups", icon: "ph-users-three", permission: "hrm.manage" },
    { label: "Chat Contacts", path: "/tenant/chat/contacts", icon: "ph-address-book", permission: "hrm.manage" },
    { label: "Call Logs", path: "/tenant/chat/calls", icon: "ph-phone-call", permission: "hrm.manage" },
  ],
};
