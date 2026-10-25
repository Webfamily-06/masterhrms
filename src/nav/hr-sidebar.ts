/**
 * MASTERHRMS — Authoritative HR Sidebar Navigation & Route Reconciliation Manifest
 * 
 * Strict alignment with:
 * 1. 7 Core Sections (Overview, Workspace Management, Talent & Growth, Finance & Assets, Communications & Content, Reports & Analytics, Add-ons & Integrations)
 * 2. TanStack Router route tree verification across 118+ /hr/* routes + report routes
 * 3. Backend RBAC permission validation & Tenant add-on entitlement gating
 * 4. Exhaustive route inventory, visibility classifications, and alias resolution
 */

export type HRMenuItem = {
  label: string;
  path?: string;
  icon?: string;
  children?: HRMenuItem[];
  permission?: string;
  addonSlug?: string;
};

export type HRRouteVisibility =
  | "sidebar_primary"
  | "sidebar_nested"
  | "nested_tab"
  | "detail_screen"
  | "action_dialog"
  | "redirect_alias";

export interface HRRouteInventoryItem {
  routePath: string;
  sourceFile: string;
  section: string;
  parentMenu?: string;
  permission?: string;
  addonSlug?: string;
  visibility: HRRouteVisibility;
  description: string;
}

import { HR_TODO_NAV_GROUP } from "./todo-navigation";

/**
 * 01 - 07 Canonical HR Sidebar Hierarchy
 */
export const hrSidebar: HRMenuItem[] = [
  // ─── 01. Overview ─────────────────────────────────────────────────────────
  {
    label: "Overview",
    icon: "layout-dashboard",
    permission: "hrm.dashboard.view",
    children: [
      { label: "Dashboard", path: "/hr/dashboard", permission: "hrm.dashboard.view" },
      { label: "Calendar", path: "/hr/calendar", permission: "hrm.dashboard.view" },
      { label: "Email Mailbox", path: "/apps/email", permission: "hrm.dashboard.view" },
      { label: "Team Chat", path: "/hr/chat", permission: "hrm.dashboard.view" },
      { label: "Approvals", path: "/hr/approvals", permission: "hrm.manage" },
      { label: "Notifications", path: "/hr/notifications", permission: "hrm.dashboard.view" },
    ],
  },

  // ─── Applications (Classic-to-SaaS Parity) ─────────────────────────────────
  {
    label: "Applications",
    icon: "grid-four",
    permission: "hrm.dashboard.view",
    children: [
      {
        label: "Chat",
        children: [
          { label: "Personal Chat", path: "/apps/chat/chats", permission: "hrm.dashboard.view" },
          { label: "Chat Groups", path: "/apps/chat/chat-groups", permission: "hrm.dashboard.view" },
          { label: "Chat Contacts", path: "/apps/chat/chat-contact", permission: "hrm.dashboard.view" },
        ],
      },
      { label: "Calendar", path: "/apps/calendar", permission: "hrm.dashboard.view" },
      { label: "Email Mailbox", path: "/apps/email", permission: "hrm.dashboard.view" },
      {
        label: "Scrumboard",
        children: [
          { label: "Projects Board", path: "/apps/taskboard/projects-board", permission: "hrm.dashboard.view" },
          { label: "Kanban Board", path: "/apps/taskboard/kanban-board", permission: "hrm.dashboard.view" },
          { label: "Pipeline", path: "/apps/taskboard/pipeline", permission: "hrm.dashboard.view" },
        ],
      },
      {
        label: "File Manager",
        children: [
          { label: "List View", path: "/apps/file-manager/list-view", permission: "hrm.dashboard.view" },
          { label: "Grid View", path: "/apps/file-manager/grid-view", permission: "hrm.dashboard.view" },
        ],
      },
      HR_TODO_NAV_GROUP,
      { label: "All Apps Catalog", path: "/apps/integrations/all-apps", permission: "hrm.dashboard.view" },
    ],
  },

  // ─── 02. Workspace Management ─────────────────────────────────────────────
  {
    label: "Workspace Management",
    icon: "users",
    children: [
      {
        label: "Employees",
        path: "/hr/employees",
        permission: "hrm.employees.view",
      },
      {
        label: "Organization",
        permission: "hrm.employees.view",
        children: [
          { label: "Departments", path: "/hr/organization/departments", permission: "hrm.employees.view" },
          { label: "Designations", path: "/hr/organization/designations", permission: "hrm.employees.view" },
          { label: "Branches", path: "/hr/organization/branches", permission: "hrm.employees.view" },
          { label: "Holidays", path: "/hr/organization/holidays", permission: "hrm.attendance.view" },
          { label: "Announcements", path: "/hr/organization/announcements", permission: "hrm.dashboard.view" },
          { label: "Organization Tree", path: "/hr/organization/tree", permission: "hrm.employees.view" },
          { label: "Award Types", path: "/hr/organization/award-types", permission: "hrm.employees.view" },
          { label: "Document Types", path: "/hr/organization/document-types", permission: "hrm.employees.view" },
        ],
      },
      {
        label: "Attendance",
        permission: "hrm.attendance.view",
        children: [
          { label: "Records", path: "/hr/attendance/records", permission: "hrm.attendance.view" },
          { label: "Timesheets", path: "/hr/attendance/timesheets", permission: "hrm.attendance.view" },
          { label: "Regularizations", path: "/hr/attendance/regularizations", permission: "hrm.attendance.view" },
          { label: "Shifts", path: "/hr/attendance/shifts", permission: "hrm.attendance.view" },
          { label: "Policies", path: "/hr/attendance/policies", permission: "hrm.attendance.view" },
          { label: "Overtime", path: "/hr/attendance/overtime", permission: "hrm.attendance.view" },
          { label: "Live Attendance", path: "/hr/attendance/live", permission: "hrm.attendance.view" },
          { label: "Device Sync", path: "/hr/attendance/devices", permission: "hrm.attendance.view" },
        ],
      },
      {
        label: "Leave Management",
        permission: "hrm.leave.view",
        children: [
          { label: "Applications", path: "/hr/leave/applications", permission: "hrm.leave.view" },
          { label: "Balances", path: "/hr/leave/balances", permission: "hrm.leave.view" },
          { label: "Policies", path: "/hr/leave/policies", permission: "hrm.leave.view" },
          { label: "Leave Types", path: "/hr/leave/types", permission: "hrm.leave.view" },
          { label: "Leave Calendar", path: "/hr/leave/calendar", permission: "hrm.leave.view" },
          { label: "Encashment & Comp-off", path: "/hr/leave/encashment-compoff", permission: "hrm.leave.view" },
        ],
      },
    ],
  },

  // ─── 03. Talent & Growth ──────────────────────────────────────────────────
  {
    label: "Talent & Growth",
    icon: "briefcase-business",
    children: [
      {
        label: "Recruitment",
        permission: "hrm.recruitment.view",
        children: [
          { label: "Job Postings", path: "/hr/recruitment/job-postings", permission: "hrm.recruitment.view" },
          { label: "Candidates", path: "/hr/recruitment/candidates", permission: "hrm.recruitment.view" },
          { label: "Pipeline", path: "/hr/recruitment/pipeline", permission: "hrm.recruitment.view" },
          { label: "Interviews", path: "/hr/recruitment/interviews", permission: "hrm.recruitment.view" },
          { label: "Assessments", path: "/hr/recruitment/assessments", permission: "hrm.recruitment.view" },
          { label: "Careers Portal", path: "/hr/recruitment/career", permission: "hrm.recruitment.view" },
          { label: "Hiring Locations", path: "/hr/recruitment/job-locations", permission: "hrm.recruitment.view" },
          { label: "Interview Rounds", path: "/hr/recruitment/interview-rounds", permission: "hrm.recruitment.view" },
          { label: "Job Offers", path: "/hr/recruitment/offers", permission: "hrm.recruitment.view" },
          { label: "Candidate Onboarding", path: "/hr/recruitment/candidate-onboarding", permission: "hrm.recruitment.view" },
          { label: "Employee Referrals", path: "/hr/recruitment/referrals", permission: "hrm.recruitment.view" },
        ],
      },
      {
        label: "Employee Lifecycle",
        permission: "hrm.employees.view",
        children: [
          { label: "Awards", path: "/hr/lifecycle/awards", permission: "hrm.employees.view" },
          { label: "Promotions", path: "/hr/lifecycle/promotions", permission: "hrm.employees.view" },
          { label: "Transfers", path: "/hr/lifecycle/transfers", permission: "hrm.employees.view" },
          { label: "Warnings", path: "/hr/lifecycle/warnings", permission: "hrm.employees.view" },
          { label: "Resignations", path: "/hr/lifecycle/resignations", permission: "hrm.employees.view" },
          { label: "Terminations", path: "/hr/lifecycle/terminations", permission: "hrm.employees.view" },
          { label: "Business Travel", path: "/hr/lifecycle/trips", permission: "hrm.employees.view" },
          { label: "Grievances", path: "/hr/lifecycle/complaints", permission: "hrm.employees.view" },
          { label: "Probation", path: "/hr/lifecycle/probation", permission: "hrm.employees.view" },
          { label: "Exit Management", path: "/hr/lifecycle/exits", permission: "hrm.employees.view" },
        ],
      },
      {
        label: "Performance",
        permission: "hrm.performance.view",
        children: [
          { label: "Reviews", path: "/hr/performance/reviews", permission: "hrm.performance.view" },
          { label: "Goals", path: "/hr/performance/goals", permission: "hrm.performance.view" },
          { label: "Review Cycles", path: "/hr/performance/cycles", permission: "hrm.performance.view" },
          { label: "Indicators", path: "/hr/performance/indicators", permission: "hrm.performance.view" },
          { label: "Performance PIP", path: "/hr/performance/pip", permission: "hrm.performance.view" },
          { label: "Goal Types", path: "/hr/performance/goal-types", permission: "hrm.performance.view" },
          { label: "Indicator Categories", path: "/hr/performance/indicator-categories", permission: "hrm.performance.view" },
        ],
      },
      {
        label: "Training",
        permission: "hrm.training.view",
        children: [
          { label: "Employee Training", path: "/hr/training/employee-trainings", permission: "hrm.training.view" },
          { label: "Sessions", path: "/hr/training/sessions", permission: "hrm.training.view" },
          { label: "Programs", path: "/hr/training/programs", permission: "hrm.training.view" },
          { label: "Training Catalog", path: "/hr/training/trainings", permission: "hrm.training.view" },
          { label: "Training Types", path: "/hr/training/types", permission: "hrm.training.view" },
        ],
      },
    ],
  },

  // ─── 04. Finance & Assets ─────────────────────────────────────────────────
  {
    label: "Finance & Assets",
    icon: "wallet",
    children: [
      {
        label: "Payroll",
        permission: "hrm.payroll.view",
        children: [
          { label: "Payroll Runs", path: "/hr/payroll/runs", permission: "hrm.payroll.view" },
          { label: "Payslips", path: "/hr/payroll/payslips", permission: "hrm.payroll.view" },
          { label: "Salary Structures", path: "/hr/payroll/salaries", permission: "hrm.payroll.view" },
          { label: "Components", path: "/hr/payroll/components", permission: "hrm.payroll.view" },
          { label: "Employee Salaries", path: "/hr/payroll/employee-salaries", permission: "hrm.payroll.view" },
          { label: "Tax Declarations", path: "/hr/payroll/tax", permission: "hrm.payroll.view" },
          { label: "Reimbursements & Loans", path: "/hr/payroll/reimbursements-loans", permission: "hrm.payroll.view" },
          { label: "Statutory Forms", path: "/hr/payroll/forms", permission: "hrm.payroll.view" },
        ],
      },
      {
        label: "Assets",
        permission: "assets.dashboard.view",
        children: [
          { label: "Dashboard", path: "/hr/assets/dashboard", permission: "assets.dashboard.view" },
          { label: "Asset Register", path: "/hr/assets", permission: "assets.dashboard.view" },
          { label: "Depreciation", path: "/hr/assets/depreciation", permission: "assets.dashboard.view" },
          { label: "Asset Types", path: "/hr/assets/types", permission: "assets.dashboard.view" },
          { label: "Maintenance & Requests", path: "/hr/assets/requests-maintenance", permission: "assets.dashboard.view" },
        ],
      },
    ],
  },

  // ─── 05. Communications & Content ─────────────────────────────────────────
  {
    label: "Communications & Content",
    icon: "messages-square",
    children: [
      {
        label: "Meetings",
        permission: "hrm.dashboard.view",
        children: [
          { label: "Meetings", path: "/hr/meetings", permission: "hrm.dashboard.view" },
          { label: "Action Items", path: "/hr/meetings/action-items", permission: "hrm.dashboard.view" },
          { label: "Meeting Rooms", path: "/hr/meetings/rooms", permission: "hrm.dashboard.view" },
          { label: "Meeting Types", path: "/hr/meetings/types", permission: "hrm.dashboard.view" },
        ],
      },
      {
        label: "Company Documents",
        permission: "hrm.dashboard.view",
        children: [
          { label: "Document Repository", path: "/hr/documents", permission: "hrm.dashboard.view" },
          { label: "Employee Contracts", path: "/hr/documents/contracts", permission: "hrm.dashboard.view" },
          { label: "Letters & Requests", path: "/hr/documents/letters", permission: "hrm.dashboard.view" },
          { label: "Acknowledgements", path: "/hr/documents/acknowledgements", permission: "hrm.dashboard.view" },
          { label: "Document Templates", path: "/hr/documents/templates", permission: "hrm.dashboard.view" },
          { label: "Contract Templates", path: "/hr/documents/contract-templates", permission: "hrm.dashboard.view" },
          { label: "Document Categories", path: "/hr/documents/categories", permission: "hrm.dashboard.view" },
        ],
      },
      {
        label: "Email",
        permission: "hrm.dashboard.view",
        children: [
          { label: "Mailbox", path: "/apps/email", permission: "hrm.dashboard.view" },
          { label: "Email Accounts", path: "/settings/email-accounts", permission: "hrm.dashboard.view" },
        ],
      },
      { label: "Media Library", path: "/hr/media", permission: "hrm.dashboard.view" },
      { label: "My Profile", path: "/hr/profile", permission: "hrm.dashboard.view" },
    ],
  },

  // ─── 06. Reports & Analytics ──────────────────────────────────────────────
  {
    label: "Reports & Analytics",
    icon: "chart-no-axes-combined",
    permission: "analytics.dashboard.view",
    children: [
      { label: "Headcount", path: "/hr/reports/headcount", permission: "analytics.reports.view" },
      { label: "Attrition", path: "/hr/reports/attrition", permission: "analytics.reports.view" },
      { label: "Attendance", path: "/hr/reports/attendance", permission: "analytics.reports.view" },
      { label: "Payroll", path: "/hr/reports/payroll", permission: "analytics.reports.view" },
      { label: "Recruitment", path: "/hr/reports/recruitment", permission: "analytics.reports.view" },
      { label: "Performance", path: "/hr/reports/performance", permission: "analytics.reports.view" },
      { label: "Training", path: "/hr/reports/training", permission: "analytics.reports.view" },
      { label: "Statutory", path: "/hr/reports/statutory", permission: "analytics.reports.view" },
      { label: "Custom Reports", path: "/hr/reports/custom", permission: "analytics.reports.view" },
    ],
  },

  // ─── 07. Add-ons & Integrations ───────────────────────────────────────────
  {
    label: "Add-ons & Integrations",
    icon: "puzzle",
    children: [
      {
        label: "Strategic Planning",
        path: "/addons/planning/dashboard",
        addonSlug: "planning",
        permission: "hrm.dashboard.view",
      },
      {
        label: "Challenges",
        path: "/addons/planning/challenges",
        addonSlug: "planning",
        permission: "hrm.dashboard.view",
      },
      {
        label: "Initiative Charters",
        path: "/addons/planning/charters",
        addonSlug: "planning",
        permission: "hrm.dashboard.view",
      },
      {
        label: "Planning Kanban",
        path: "/addons/planning/charters/kanban",
        addonSlug: "planning",
        permission: "hrm.dashboard.view",
      },
      {
        label: "OKRs",
        path: "/okr",
        addonSlug: "okr-performance",
        permission: "hrm.performance.view",
      },
      {
        label: "Learning Analytics",
        path: "/learning-analytics",
        addonSlug: "learning-lms",
        permission: "hrm.training.view",
      },
      {
        label: "Biometric Sync",
        path: "/biometric-sync",
        addonSlug: "biometric-sync",
        permission: "hrm.attendance.view",
      },
      {
        label: "Notice Board",
        path: "/notice-board",
        addonSlug: "notice-board",
        permission: "hrm.dashboard.view",
      },
      {
        label: "AI Assistant Usage",
        path: "/addons/ai-assistant/usage",
        addonSlug: "ai-assistant",
        permission: "hrm.dashboard.view",
      },
      {
        label: "AI Document Generator",
        path: "/addons/ai-document/generate",
        addonSlug: "ai-document",
        permission: "hrm.dashboard.view",
      },
      {
        label: "Webhook Endpoints",
        path: "/addons/webhook/endpoints",
        addonSlug: "webhook",
        permission: "hrm.dashboard.view",
      },
      {
        label: "Suggestion Box",
        path: "/suggestion-box",
        addonSlug: "suggestion-box",
        permission: "hrm.dashboard.view",
      },
      {
        label: "Call History",
        path: "/call-history",
        addonSlug: "twilio-sms",
        permission: "hrm.dashboard.view",
      },
    ],
  },
];

/**
 * Route Alias Reconciliation Map
 * Resolves documented aliases to actual TanStack router paths
 */
export const HR_ROUTE_ALIASES: Record<string, string> = {
  "/hr/recruitment/locations": "/hr/recruitment/job-locations",
  "/hr/recruitment/rounds": "/hr/recruitment/interview-rounds",
  "/hr/assets/depreciations": "/hr/assets/depreciation",
  "/hr/documents/employee": "/hr/documents/contracts",
  "/hr/documents/requests": "/hr/documents/letters",
};

/**
 * Normalizes any requested path against the reconciliation alias dictionary
 */
export function resolveReconciledHRPath(path: string): string {
  return HR_ROUTE_ALIASES[path] || path;
}

/**
 * Filters the HR sidebar based on session roles, permissions, and tenant add-on entitlements
 */
export function filterHRSidebar(
  items: HRMenuItem[],
  context: {
    isWorkspaceAdmin?: boolean;
    isSuperAdmin?: boolean;
    isHrAdmin?: boolean;
    permissions?: string[];
    activeAddonSlugs?: string[];
    isAddonActive?: (slug: string) => boolean;
  }
): HRMenuItem[] {
  const {
    isWorkspaceAdmin = false,
    isSuperAdmin = false,
    isHrAdmin = false,
    permissions = [],
    activeAddonSlugs = [],
    isAddonActive,
  } = context;

  // Preserve full items if Super Admin or Workspace Admin and no add-on filtering requested
  if ((isSuperAdmin || isWorkspaceAdmin) && !isAddonActive && activeAddonSlugs.length === 0) {
    return items;
  }

  function isItemAllowed(item: HRMenuItem): boolean {
    if (item.addonSlug) {
      if (isAddonActive) {
        if (!isAddonActive(item.addonSlug)) return false;
      } else if (activeAddonSlugs.length > 0) {
        if (!activeAddonSlugs.includes(item.addonSlug)) return false;
      } else if (!isSuperAdmin && !isWorkspaceAdmin) {
        return false;
      }
    }

    if (item.permission) {
      if (isSuperAdmin || isWorkspaceAdmin) {
        return true;
      }
      if (isHrAdmin) {
        const hrPrefixes = ["hrm", "employee", "attendance", "leave", "payroll", "recruitment", "assets", "analytics"];
        if (hrPrefixes.some((p) => item.permission!.startsWith(p) || item.permission!.includes(p))) {
          return true;
        }
      }
      if (
        permissions.includes(item.permission) ||
        permissions.includes("*") ||
        permissions.includes("hrm.*") ||
        permissions.includes("admin") ||
        (item.permission.startsWith("hrm.") && (permissions.includes("hrm.manage") || permissions.includes("hrm"))) ||
        (item.permission.startsWith("analytics.") && permissions.includes("analytics.manage")) ||
        (item.permission.startsWith("assets.") && permissions.includes("assets.manage"))
      ) {
        return true;
      }
      return false;
    }

    return true;
  }

  function processGroup(item: HRMenuItem): HRMenuItem | null {
    if (!isItemAllowed(item)) return null;

    if (item.children && item.children.length > 0) {
      const allowedChildren = item.children
        .map(processGroup)
        .filter((child): child is HRMenuItem => child !== null);

      if (allowedChildren.length === 0 && !item.path) {
        return null;
      }
      return { ...item, children: allowedChildren };
    }

    return item;
  }

  return items
    .map(processGroup)
    .filter((item): item is HRMenuItem => item !== null);
}
