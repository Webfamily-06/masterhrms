/**
 * MASTERHRMS — Authoritative Employee Portal Sidebar Navigation Manifest
 * 
 * Strict alignment with:
 * 1. 11 Canonical Sections:
 *    - 01. Overview & Profile (10 routes)
 *    - 02. Attendance & Time Management (6 routes)
 *    - 03. Leave Management (4 routes)
 *    - 04. Recruitment & Career (5 routes)
 *    - 05. Employee Lifecycle (8 routes)
 *    - 06. Performance Management (4 routes)
 *    - 07. Training & Development (3 routes)
 *    - 08. Payroll & Finance (5 routes)
 *    - 09. Assets (3 routes)
 *    - 10. Meetings & Collaboration (2 routes)
 *    - 11. Documents & Files (5 routes)
 * 2. TanStack Router route tree verification across 55 canonical /me/* routes
 * 3. Role/Permission & Manager gating (approvals, interviewer, assessments)
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
import { EMPLOYEE_CHAT_NAV_GROUP } from "./chat-navigation";

/**
 * 11 Canonical Employee Portal Sidebar Sections
 */
export const employeeSidebar: EmployeeMenuSection[] = [
  // ─── 01. Overview & Profile ─────────────────────────────────────────────
  {
    label: "Overview & Profile",
    icon: "ph-user-circle",
    children: [
      { label: "Dashboard", path: "/me/dashboard", icon: "ph-squares-four" },
      { label: "Calendar", path: "/me/calendar", icon: "ph-calendar" },
      EMPLOYEE_TODO_NAV_GROUP,
      { label: "Email Mailbox", path: "/apps/email", icon: "ph-envelope" },
      EMPLOYEE_CHAT_NAV_GROUP,
      { label: "Notifications", path: "/me/notifications", icon: "ph-bell" },
      { label: "My Profile", path: "/me/profile", icon: "ph-user" },
      { label: "Employee Directory", path: "/me/employees", icon: "ph-users" },
      {
        label: "Organization",
        icon: "ph-buildings",
        children: [
          { label: "Organization Structure", path: "/me/organization/structure", icon: "ph-tree-structure" },
          { label: "Holidays", path: "/me/organization/holidays", icon: "ph-calendar-star" },
          { label: "Announcements", path: "/me/organization/announcements", icon: "ph-megaphone" },
        ],
      },
    ],
  },

  // ─── 02. Attendance & Time Management ───────────────────────────────────
  {
    label: "Attendance & Time Management",
    icon: "ph-clock",
    children: [
      { label: "Attendance Records", path: "/me/attendance/records", icon: "ph-clock" },
      { label: "Timesheet", path: "/me/attendance/timesheet", icon: "ph-calendar-check" },
      { label: "Attendance Regularizations", path: "/me/attendance/regularizations", icon: "ph-check-circle" },
      { label: "My Shifts", path: "/me/attendance/shifts", icon: "ph-arrows-clockwise" },
      { label: "Attendance Policies", path: "/me/attendance/policies", icon: "ph-file-text" },
      { label: "Overtime, WFH & Comp-off", path: "/me/attendance/requests", icon: "ph-paper-plane-tilt" },
    ],
  },

  // ─── 03. Leave Management ───────────────────────────────────────────────
  {
    label: "Leave Management",
    icon: "ph-calendar-blank",
    children: [
      { label: "Leave Applications", path: "/me/leave/applications", icon: "ph-calendar-blank" },
      { label: "Leave Balance", path: "/me/leave/balance", icon: "ph-hourglass-high" },
      { label: "Leave Policies", path: "/me/leave/policies", icon: "ph-shield-check" },
      { label: "Team Leave Calendar", path: "/me/leave/team-calendar", icon: "ph-calendar-dots" },
    ],
  },

  // ─── 04. Recruitment & Career ───────────────────────────────────────────
  {
    label: "Recruitment & Career",
    icon: "ph-briefcase",
    children: [
      { label: "Internal Job Postings", path: "/me/recruitment/job-postings", icon: "ph-briefcase" },
      { label: "Interviewer Portal", path: "/me/recruitment/interviews", icon: "ph-chats", permission: "recruitment.interviewer" },
      { label: "My Onboarding", path: "/me/recruitment/onboarding", icon: "ph-rocket" },
      { label: "My Assessments", path: "/me/recruitment/assessments", icon: "ph-exam", permission: "recruitment.assessment" },
      { label: "Career & Referrals", path: "/me/recruitment/career", icon: "ph-star" },
    ],
  },

  // ─── 05. Employee Lifecycle ─────────────────────────────────────────────
  {
    label: "Employee Lifecycle",
    icon: "ph-arrows-clockwise",
    children: [
      { label: "My Awards", path: "/me/lifecycle/awards", icon: "ph-trophy" },
      { label: "Promotions & Career Progression", path: "/me/lifecycle/promotions", icon: "ph-trend-up" },
      { label: "Transfer Requests", path: "/me/lifecycle/transfers", icon: "ph-arrows-left-right" },
      { label: "Warning Acknowledgements", path: "/me/lifecycle/warnings", icon: "ph-warning" },
      { label: "Resignation", path: "/me/lifecycle/resignation", icon: "ph-door" },
      { label: "Exit & Clearance", path: "/me/lifecycle/exit", icon: "ph-sign-out" },
      { label: "Business Trip Requests", path: "/me/lifecycle/trips", icon: "ph-airplane" },
      { label: "Complaints", path: "/me/lifecycle/complaints", icon: "ph-chats-teardrop" },
    ],
  },

  // ─── 06. Performance Management ─────────────────────────────────────────
  {
    label: "Performance Management",
    icon: "ph-target",
    children: [
      { label: "Performance Reviews", path: "/me/performance/reviews", icon: "ph-target" },
      { label: "My Goals", path: "/me/performance/goals", icon: "ph-crosshair" },
      { label: "Review Cycles", path: "/me/performance/cycles", icon: "ph-repeat" },
      { label: "Performance Indicators", path: "/me/performance/indicators", icon: "ph-gauge" },
    ],
  },

  // ─── 07. Training & Development ─────────────────────────────────────────
  {
    label: "Training & Development",
    icon: "ph-graduation-cap",
    children: [
      { label: "My Trainings", path: "/me/training/trainings", icon: "ph-graduation-cap" },
      { label: "Training Sessions", path: "/me/training/sessions", icon: "ph-presentation" },
      { label: "Training Programs", path: "/me/training/programs", icon: "ph-book-open" },
    ],
  },

  // ─── 08. Payroll & Finance ──────────────────────────────────────────────
  {
    label: "Payroll & Finance",
    icon: "ph-receipt",
    children: [
      { label: "Payslips", path: "/me/payroll/payslips", icon: "ph-receipt" },
      { label: "My Salary", path: "/me/payroll/salary", icon: "ph-currency-dollar" },
      { label: "Tax & Investment Declarations", path: "/me/payroll/tax", icon: "ph-receipt-x" },
      { label: "Reimbursements & Loans", path: "/me/payroll/reimbursements-loans", icon: "ph-hand-coins" },
      { label: "PF, ESI & Statutory Forms", path: "/me/payroll/statutory-forms", icon: "ph-file-lock" },
    ],
  },

  // ─── 09. Assets ─────────────────────────────────────────────────────────
  {
    label: "Assets",
    icon: "ph-laptop",
    children: [
      { label: "Assets Summary", path: "/me/assets/dashboard", icon: "ph-laptop" },
      { label: "My Assets", path: "/me/assets", icon: "ph-desktop" },
      { label: "Asset Requests", path: "/me/assets/requests", icon: "ph-package" },
    ],
  },

  // ─── 10. Meetings & Collaboration ───────────────────────────────────────
  {
    label: "Meetings & Collaboration",
    icon: "ph-video-camera",
    children: [
      { label: "Meetings", path: "/me/meetings", icon: "ph-video-camera" },
      { label: "Action Items", path: "/me/meetings/action-items", icon: "ph-list-checks" },
      { label: "Email Accounts", path: "/settings/email-accounts", icon: "ph-at" },
    ],
  },

  // ─── 11. Documents & Files ──────────────────────────────────────────────
  {
    label: "Documents & Files",
    icon: "ph-folder",
    children: [
      { label: "HR Documents", path: "/me/documents", icon: "ph-folder" },
      { label: "My Contracts", path: "/me/documents/contracts", icon: "ph-signature" },
      { label: "Document Acknowledgements", path: "/me/documents/acknowledgements", icon: "ph-seal-check" },
      { label: "Document Requests", path: "/me/documents/requests", icon: "ph-file-arrow-up" },
      { label: "File Manager", path: "/me/files", icon: "ph-folder-notch-open" },
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
    isInterviewer = true,
    hasAssessments = true,
    permissions = [],
    isAddonActive,
  } = context;

  function isItemAllowed(item: EmployeeMenuItem): boolean {
    if (item.addonSlug && isAddonActive && !isAddonActive(item.addonSlug)) {
      return false;
    }

    if (item.path === "/me/recruitment/interviews" && !isInterviewer) {
      return false;
    }

    if (item.path === "/me/recruitment/assessments" && !hasAssessments) {
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
      if (
        item.permission === "recruitment.interviewer" &&
        (isInterviewer || permissions.some((p) => p.includes("interview") || p.includes("recruitment")))
      ) {
        return true;
      }
      if (
        item.permission === "recruitment.assessment" &&
        (hasAssessments || permissions.some((p) => p.includes("assessment") || p.includes("recruitment")))
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
