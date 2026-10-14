/**
 * MASTERHRMS — Authoritative HR Sidebar Navigation & Route Reconciliation Manifest
 * 
 * Strict alignment with:
 * 1. 7 Core Sections (Overview, Workspace Management, Talent & Growth, Finance & Assets, Communications & Content, Reports & Analytics, Add-ons & Integrations)
 * 2. TanStack Router route tree verification across 118+ /hr/* routes
 * 3. Backend RBAC permission validation & Tenant add-on entitlement gating
 */

export type HRMenuItem = {
  label: string;
  path?: string;
  icon?: string;
  children?: HRMenuItem[];
  permission?: string;
  addonSlug?: string;
};

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
      { label: "My Tasks", path: "/hr/todo", permission: "hrm.dashboard.view" },
      { label: "Team Chat", path: "/hr/chat", permission: "hrm.dashboard.view" },
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
          {
            label: "Departments",
            path: "/hr/organization/departments",
            permission: "hrm.employees.view",
          },
          {
            label: "Designations",
            path: "/hr/organization/designations",
            permission: "hrm.employees.view",
          },
          {
            label: "Holidays",
            path: "/hr/organization/holidays",
            permission: "hrm.attendance.view",
          },
          {
            label: "Announcements",
            path: "/hr/organization/announcements",
            permission: "hrm.dashboard.view",
          },
        ],
      },
      {
        label: "Attendance",
        permission: "hrm.attendance.view",
        children: [
          { label: "Records", path: "/hr/attendance/records", permission: "hrm.attendance.view" },
          { label: "Timesheets", path: "/hr/attendance/timesheets", permission: "hrm.attendance.view" },
          {
            label: "Regularizations",
            path: "/hr/attendance/regularizations",
            permission: "hrm.attendance.view",
          },
          { label: "Shifts", path: "/hr/attendance/shifts", permission: "hrm.attendance.view" },
          { label: "Policies", path: "/hr/attendance/policies", permission: "hrm.attendance.view" },
        ],
      },
      {
        label: "Leave Management",
        permission: "hrm.leave.view",
        children: [
          { label: "Applications", path: "/hr/leave/applications", permission: "hrm.leave.view" },
          { label: "Balances", path: "/hr/leave/balances", permission: "hrm.leave.view" },
          { label: "Policies", path: "/hr/leave/policies", permission: "hrm.leave.view" },
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
          {
            label: "Job Postings",
            path: "/hr/recruitment/job-postings",
            permission: "hrm.recruitment.view",
          },
          {
            label: "Candidates",
            path: "/hr/recruitment/candidates",
            permission: "hrm.recruitment.view",
          },
          {
            label: "Interviews",
            path: "/hr/recruitment/interviews",
            permission: "hrm.recruitment.view",
          },
          {
            label: "Assessments",
            path: "/hr/recruitment/assessments",
            permission: "hrm.recruitment.view",
          },
          {
            label: "Careers Portal",
            path: "/hr/recruitment/career",
            permission: "hrm.recruitment.view",
          },
          {
            label: "Hiring Locations",
            path: "/hr/recruitment/job-locations", // Reconciled TanStack route (/hr/recruitment/job-locations)
            permission: "hrm.recruitment.view",
          },
          {
            label: "Interview Rounds",
            path: "/hr/recruitment/interview-rounds", // Reconciled TanStack route (/hr/recruitment/interview-rounds)
            permission: "hrm.recruitment.view",
          },
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
          {
            label: "Resignations",
            path: "/hr/lifecycle/resignations",
            permission: "hrm.employees.view",
          },
          {
            label: "Terminations",
            path: "/hr/lifecycle/terminations",
            permission: "hrm.employees.view",
          },
          { label: "Business Travel", path: "/hr/lifecycle/trips", permission: "hrm.employees.view" },
          {
            label: "Grievances",
            path: "/hr/lifecycle/complaints",
            permission: "hrm.employees.view",
          },
        ],
      },
      {
        label: "Performance",
        permission: "hrm.performance.view",
        children: [
          { label: "Reviews", path: "/hr/performance/reviews", permission: "hrm.performance.view" },
          { label: "Goals", path: "/hr/performance/goals", permission: "hrm.performance.view" },
          { label: "Review Cycles", path: "/hr/performance/cycles", permission: "hrm.performance.view" },
          {
            label: "Indicators",
            path: "/hr/performance/indicators",
            permission: "hrm.performance.view",
          },
        ],
      },
      {
        label: "Training",
        permission: "hrm.training.view",
        children: [
          {
            label: "Employee Training",
            path: "/hr/training/employee-trainings",
            permission: "hrm.training.view",
          },
          { label: "Sessions", path: "/hr/training/sessions", permission: "hrm.training.view" },
          { label: "Programs", path: "/hr/training/programs", permission: "hrm.training.view" },
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
        ],
      },
      {
        label: "Assets",
        permission: "assets.dashboard.view",
        children: [
          { label: "Dashboard", path: "/hr/assets/dashboard", permission: "assets.dashboard.view" },
          { label: "Asset Register", path: "/hr/assets", permission: "assets.dashboard.view" },
          {
            label: "Depreciation",
            path: "/hr/assets/depreciation", // Reconciled TanStack route (/hr/assets/depreciation)
            permission: "assets.dashboard.view",
          },
          { label: "Asset Types", path: "/hr/assets/types", permission: "assets.dashboard.view" },
        ],
      },
    ],
  },

  // ─── 05. Communications & Content ─────────────────────────────────────────
  {
    label: "Communications & Content",
    icon: "messages-square",
    children: [
      { label: "Meetings", path: "/hr/meetings", permission: "hrm.dashboard.view" },
      {
        label: "Action Items",
        path: "/hr/meetings/action-items",
        permission: "hrm.dashboard.view",
      },
      { label: "Company Documents", path: "/hr/documents", permission: "hrm.dashboard.view" },
      {
        label: "Employee Documents",
        path: "/hr/documents/contracts", // Canonical route mapping for employee contracts/docs
        permission: "hrm.dashboard.view",
      },
      {
        label: "Document Requests",
        path: "/hr/documents/letters", // Letters and document generation requests
        permission: "hrm.dashboard.view",
      },
      {
        label: "Acknowledgements",
        path: "/hr/documents/acknowledgements",
        permission: "hrm.dashboard.view",
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
      { label: "Headcount", path: "/employee-report", permission: "analytics.reports.view" },
      { label: "Attrition", path: "/employee-report", permission: "analytics.reports.view" },
      { label: "Attendance", path: "/attendance-report", permission: "analytics.reports.view" },
      { label: "Payroll", path: "/payslip-report", permission: "analytics.reports.view" },
      { label: "Recruitment", path: "/smart-reports/deal-pipeline", permission: "analytics.reports.view" },
      { label: "Performance", path: "/smart-reports/project-progress", permission: "analytics.reports.view" },
      { label: "Training", path: "/smart-reports", permission: "analytics.reports.view" },
      { label: "Statutory", path: "/smart-reports/payroll-sheet", permission: "analytics.reports.view" },
      { label: "Custom Reports", path: "/smart-reports", permission: "analytics.reports.view" },
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
  "/hr/reports/headcount": "/employee-report",
  "/hr/reports/attrition": "/employee-report",
  "/hr/reports/attendance": "/attendance-report",
  "/hr/reports/payroll": "/payslip-report",
  "/hr/reports/recruitment": "/smart-reports/deal-pipeline",
  "/hr/reports/performance": "/smart-reports/project-progress",
  "/hr/reports/training": "/smart-reports",
  "/hr/reports/statutory": "/smart-reports/payroll-sheet",
  "/hr/reports/custom": "/smart-reports",
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
    permissions?: string[];
    activeAddonSlugs?: string[];
  }
): HRMenuItem[] {
  const {
    isWorkspaceAdmin = false,
    isSuperAdmin = false,
    permissions = [],
    activeAddonSlugs = [],
  } = context;

  if (isSuperAdmin || isWorkspaceAdmin) {
    return items;
  }

  function isItemAllowed(item: HRMenuItem): boolean {
    if (item.addonSlug && !activeAddonSlugs.includes(item.addonSlug)) {
      return false;
    }
    if (item.permission && !permissions.includes(item.permission)) {
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
