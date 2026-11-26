/**
 * MASTERHRMS — Authoritative Employee Portal Sidebar Navigation Manifest
 *
 * All Employee Portal routes strictly resolve under `/me/*`:
 * 1. Overview
 * 2. Workforce Management
 * 3. Talent & Growth
 * 4. Finance & Assets
 * 5. Communication & Content
 * 6. File Manager (+ Undefined Pages for remaining `/me/*` employee pages)
 */

export type EmployeeMenuItem = {
  label: string;
  path?: string;
  icon?: string;
  children?: EmployeeMenuItem[];
  permission?: string;
  addonSlug?: string;
  badge?: string;
};

export interface EmployeeMenuSection {
  label: string;
  icon?: string;
  children: EmployeeMenuItem[];
}

export type EmployeeRouteVisibility =
  | "sidebar_primary"
  | "sidebar_nested"
  | "nested_tab"
  | "detail_screen"
  | "action_dialog";

export interface EmployeeRouteInventoryItem {
  routePath: string;
  sourceFile: string;
  section: string;
  parentMenu?: string;
  visibility: EmployeeRouteVisibility;
  description: string;
}

import { EMPLOYEE_TODO_NAV_GROUP } from "./todo-navigation";

/**
 * Canonical Employee Portal Sidebar Sections — 100% `/me/*` scoped
 */
export const employeeSidebar: EmployeeMenuSection[] = [
  // ─── 01. Overview ───────────────────────────────────────────────────────
  {
    label: "Overview",
    icon: "ph-squares-four",
    children: [
      { label: "Dashboard", path: "/me/dashboard", icon: "ph-squares-four" },
      { label: "Calendar", path: "/me/calendar", icon: "ph-calendar" },
      EMPLOYEE_TODO_NAV_GROUP,
      { label: "My Notes", path: "/me/notes", icon: "ph-note-pencil" },
      { label: "Chat", path: "/me/chat", icon: "ph-chat-circle-dots" },
      { label: "My Reminders", path: "/me/notifications/reminders", icon: "ph-alarm" },
      { label: "Notifications", path: "/me/notifications", icon: "ph-bell" },
    ],
  },

  // ─── 02. Workforce Management ───────────────────────────────────────────
  {
    label: "Workforce Management",
    icon: "ph-users",
    children: [
      { label: "Employees", path: "/me/employees", icon: "ph-users" },
      {
        label: "Organization Structure",
        icon: "ph-buildings",
        children: [
          { label: "Holiday", path: "/me/organization/holidays", icon: "ph-calendar-star" },
          { label: "Announcements", path: "/me/organization/announcements", icon: "ph-megaphone" },
        ],
      },
      {
        label: "Attendance",
        icon: "ph-clock",
        children: [
          { label: "Attendance Records", path: "/me/attendance/records", icon: "ph-clock" },
          { label: "Timesheet", path: "/me/attendance/timesheet", icon: "ph-calendar-check" },
          { label: "Attendance Regularizations", path: "/me/attendance/regularizations", icon: "ph-check-circle" },
          { label: "Shift", path: "/me/attendance/shifts", icon: "ph-arrows-clockwise" },
          { label: "Attendance Policies", path: "/me/attendance/policies", icon: "ph-file-text" },
        ],
      },
      {
        label: "Leave Management",
        icon: "ph-calendar-blank",
        children: [
          { label: "Leave Applications", path: "/me/leave/applications", icon: "ph-calendar-blank" },
          { label: "Leave Balance", path: "/me/leave/balance", icon: "ph-hourglass-high" },
          { label: "Leave Policy", path: "/me/leave/policies", icon: "ph-shield-check" },
        ],
      },
    ],
  },

  // ─── 03. Talent & Growth ────────────────────────────────────────────────
  {
    label: "Talent & Growth",
    icon: "ph-trend-up",
    children: [
      {
        label: "Recruitment",
        icon: "ph-briefcase",
        children: [
          { label: "Job Postings", path: "/me/recruitment/job-postings", icon: "ph-briefcase" },
          { label: "Interviews", path: "/me/recruitment/interviews", icon: "ph-chats" },
          { label: "Candidate Onboarding", path: "/me/recruitment/onboarding", icon: "ph-rocket" },
          { label: "Candidate Assessments", path: "/me/recruitment/assessments", icon: "ph-exam" },
          { label: "Career", path: "/me/recruitment/career", icon: "ph-star" },
        ],
      },
      {
        label: "Employee Lifecycle",
        icon: "ph-arrows-clockwise",
        children: [
          { label: "Awards", path: "/me/awards", icon: "ph-trophy" },
          { label: "Promotion", path: "/me/lifecycle/promotions", icon: "ph-trend-up" },
          { label: "Transfers", path: "/me/lifecycle/transfers", icon: "ph-arrows-left-right" },
          { label: "Warnings", path: "/me/lifecycle/warnings", icon: "ph-warning" },
          { label: "Resignations", path: "/me/lifecycle/resignation", icon: "ph-door" },
          { label: "Trips", path: "/me/lifecycle/trips", icon: "ph-airplane" },
          { label: "Complaints", path: "/me/lifecycle/complaints", icon: "ph-chats-teardrop" },
        ],
      },
      {
        label: "Performance Management",
        icon: "ph-target",
        children: [
          { label: "Employee Review", path: "/me/performance/reviews", icon: "ph-target" },
          { label: "Employee Goals", path: "/me/performance/goals", icon: "ph-crosshair" },
        ],
      },
      {
        label: "Training & Development",
        icon: "ph-graduation-cap",
        children: [
          { label: "Employee Trainings", path: "/me/training/trainings", icon: "ph-graduation-cap" },
          { label: "Training Sessions", path: "/me/training/sessions", icon: "ph-presentation" },
          { label: "Training Programs", path: "/me/training/programs", icon: "ph-book-open" },
        ],
      },
    ],
  },

  // ─── 04. Finance & Assets ───────────────────────────────────────────────
  {
    label: "Finance & Assets",
    icon: "ph-receipt",
    children: [
      {
        label: "Payroll Management",
        icon: "ph-receipt",
        children: [
          { label: "Payslips", path: "/me/payroll/payslips", icon: "ph-receipt" },
          { label: "Employee Salaries", path: "/me/payroll/salary", icon: "ph-currency-dollar" },
        ],
      },
      {
        label: "Assets Management",
        icon: "ph-laptop",
        children: [
          { label: "Assets", path: "/me/assets", icon: "ph-desktop" },
          { label: "Asset Requests", path: "/me/assets/requests", icon: "ph-package" },
        ],
      },
    ],
  },

  // ─── 05. Communication & Content ────────────────────────────────────────
  {
    label: "Communication & Content",
    icon: "ph-video-camera",
    children: [
      {
        label: "Meetings",
        icon: "ph-video-camera",
        children: [
          { label: "Meetings", path: "/me/meetings", icon: "ph-video-camera" },
          { label: "Action Items", path: "/me/meetings/action-items", icon: "ph-list-checks" },
        ],
      },
      { label: "Zoom Meeting", path: "/me/zoom-meetings", icon: "ph-webcam" },
      {
        label: "Documents & Contracts",
        icon: "ph-folder",
        children: [
          { label: "HR Documents", path: "/me/documents", icon: "ph-folder" },
          { label: "Employee Contracts", path: "/me/documents/contracts", icon: "ph-signature" },
          { label: "Acknowledgements", path: "/me/documents/acknowledgements", icon: "ph-seal-check" },
        ],
      },
      { label: "Helpdesk & Tickets", path: "/me/helpdesk", icon: "ph-lifebuoy" },
    ],
  },

  // ─── 06. File Manager ───────────────────────────────────────────────────
  {
    label: "File Manager",
    icon: "ph-folder-open",
    children: [
      { label: "File Manager", path: "/me/files", icon: "ph-folder-open" },
    ],
  },
];

/**
 * Filter context for Employee Sidebar
 */
export interface EmployeeSidebarFilterContext {
  isInterviewer?: boolean;
  hasAssessments?: boolean;
  hasDirectReports?: boolean;
  hasManagerDelegation?: boolean;
  permissions?: string[];
  isAddonActive?: (slug: string) => boolean;
}

/**
 * Filter Employee Sidebar according to user context
 */
export function filterEmployeeSidebar(
  sections: EmployeeMenuSection[],
  context: EmployeeSidebarFilterContext = {}
): EmployeeMenuSection[] {
  const {
    permissions = [],
    isAddonActive,
  } = context;

  function isItemAllowed(item: EmployeeMenuItem): boolean {
    if (item.addonSlug && isAddonActive && !isAddonActive(item.addonSlug)) {
      return false;
    }

    if (item.permission) {
      if (
        permissions.includes(item.permission) ||
        permissions.includes("*") ||
        permissions.includes("hrm.*") ||
        permissions.includes("admin")
      ) {
        return true;
      }
      return false;
    }

    return true;
  }

  function processItem(item: EmployeeMenuItem): EmployeeMenuItem | null {
    if (!isItemAllowed(item)) return null;

    if (item.children && item.children.length > 0) {
      const allowedChildren = item.children
        .map(processItem)
        .filter((c): c is EmployeeMenuItem => c !== null);

      if (allowedChildren.length === 0 && !item.path) {
        return null;
      }
      return { ...item, children: allowedChildren };
    }

    return item;
  }

  return sections
    .map((section) => {
      const allowedItems = section.children
        .map(processItem)
        .filter((c): c is EmployeeMenuItem => c !== null);

      if (allowedItems.length === 0) return null;
      return { ...section, children: allowedItems };
    })
    .filter((s): s is EmployeeMenuSection => s !== null);
}
