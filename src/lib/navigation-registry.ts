/**
 * MASTERHRMS — Centralized Navigation Registry
 * 
 * Authoritative registry defining structure, ordering, permissions, module flags,
 * and data scopes for all portals:
 * - /hr/*     (HR / Operations Management Portal)
 * - /me/*     (Employee Self-Service Portal)
 * - /super/*  (SaaS Super Admin Portal)
 * - /client/* (Client / Staffing Portal)
 */

export type PortalId = "hr" | "me" | "sa" | "client";

export interface NavigationItem {
  id: string;
  portal: PortalId;
  module: string;
  label: string;
  route: string;
  icon: string;
  order: number;
  section?: string;
  permission?: string;
  moduleKey?: string;
  dataScope?: string;
  badgeKey?: string;
  exactMatch?: boolean;
  children?: NavigationItem[];
}

export interface UserNavigationContext {
  roles?: string[];
  permissions?: string[];
  enabledModules?: string[];
  isSuperAdmin?: boolean;
  isTenantAdmin?: boolean;
  employeeId?: string | null;
}

export const NAVIGATION_REGISTRY: NavigationItem[] = [
  // ==========================================
  // HR MANAGEMENT PORTAL (/hr/*)
  // ==========================================
  {
    id: "hr-dashboard",
    portal: "hr",
    module: "core",
    label: "HR Command Center",
    route: "/hr",
    icon: "LayoutDashboard",
    order: 10,
    section: "Overview",
    exactMatch: true,
  },
  {
    id: "hr-inbox",
    portal: "hr",
    module: "workflows",
    label: "Approval Inbox",
    route: "/hr/approvals",
    icon: "Inbox",
    order: 20,
    section: "Overview",
    badgeKey: "pendingApprovals",
    permission: "hr.approvals.view",
  },

  // Organization & Workforce
  {
    id: "hr-organization",
    portal: "hr",
    module: "organization",
    label: "Organization",
    route: "/hr/organization",
    icon: "Building2",
    order: 100,
    section: "Workforce",
    children: [
      {
        id: "hr-org-structure",
        portal: "hr",
        module: "organization",
        label: "Org Structure & Tree",
        route: "/hr/organization/tree",
        icon: "Network",
        order: 101,
      },
      {
        id: "hr-org-branches",
        portal: "hr",
        module: "organization",
        label: "Branches & Locations",
        route: "/hr/organization/branches",
        icon: "MapPin",
        order: 102,
      },
      {
        id: "hr-org-departments",
        portal: "hr",
        module: "organization",
        label: "Departments",
        route: "/hr/organization/departments",
        icon: "Boxes",
        order: 103,
      },
      {
        id: "hr-org-designations",
        portal: "hr",
        module: "organization",
        label: "Designations & Grades",
        route: "/hr/organization/designations",
        icon: "Award",
        order: 104,
      },
    ],
  },
  {
    id: "hr-employees",
    portal: "hr",
    module: "employees",
    label: "Employees",
    route: "/hr/employees",
    icon: "Users",
    order: 110,
    section: "Workforce",
    permission: "hr.employees.view",
    children: [
      {
        id: "hr-employees-directory",
        portal: "hr",
        module: "employees",
        label: "Directory & Profiles",
        route: "/hr/employees",
        icon: "Users",
        order: 111,
        permission: "hr.employees.view",
      },
      {
        id: "hr-employees-onboarding",
        portal: "hr",
        module: "employees",
        label: "New Hire Onboarding",
        route: "/hr/employees/onboarding",
        icon: "UserPlus",
        order: 112,
        permission: "hr.employees.create",
      },
      {
        id: "hr-employees-transfers",
        portal: "hr",
        module: "employees",
        label: "Transfers & Promotions",
        route: "/hr/employees/transfers",
        icon: "ArrowRightLeft",
        order: 113,
        permission: "hr.employees.update",
      },
      {
        id: "hr-employees-exits",
        portal: "hr",
        module: "employees",
        label: "Offboarding & Exits",
        route: "/hr/employees/exits",
        icon: "UserMinus",
        order: 114,
        permission: "hr.employees.update",
      },
    ],
  },

  // Time & Attendance
  {
    id: "hr-attendance",
    portal: "hr",
    module: "attendance",
    label: "Time & Attendance",
    route: "/hr/attendance/records",
    icon: "Clock",
    order: 200,
    section: "Time & Absence",
    moduleKey: "attendance",
    children: [
      {
        id: "hr-attendance-records",
        portal: "hr",
        module: "attendance",
        label: "Attendance Records",
        route: "/hr/attendance/records",
        icon: "CalendarCheck",
        order: 201,
      },
      {
        id: "hr-attendance-live",
        portal: "hr",
        module: "attendance",
        label: "Realtime Live Board",
        route: "/hr/attendance/live",
        icon: "Radio",
        order: 202,
      },
      {
        id: "hr-attendance-regularization",
        portal: "hr",
        module: "attendance",
        label: "Regularizations",
        route: "/hr/attendance/regularizations",
        icon: "FileEdit",
        order: 203,
      },
      {
        id: "hr-attendance-shifts",
        portal: "hr",
        module: "attendance",
        label: "Shift Rostering",
        route: "/hr/attendance/shifts",
        icon: "CalendarRange",
        order: 204,
      },
      {
        id: "hr-attendance-timesheets",
        portal: "hr",
        module: "attendance",
        label: "Timesheets",
        route: "/hr/attendance/timesheets",
        icon: "FileSpreadsheet",
        order: 205,
      },
      {
        id: "hr-attendance-overtime",
        portal: "hr",
        module: "attendance",
        label: "Overtime Requests",
        route: "/hr/attendance/overtime",
        icon: "Clock3",
        order: 206,
      },
      {
        id: "hr-attendance-policies",
        portal: "hr",
        module: "attendance",
        label: "Attendance Policies",
        route: "/hr/attendance/policies",
        icon: "ShieldCheck",
        order: 207,
      },
      {
        id: "hr-attendance-devices",
        portal: "hr",
        module: "attendance",
        label: "Hardware & Geo-fences",
        route: "/hr/attendance/devices",
        icon: "Fingerprint",
        order: 208,
      },
    ],
  },
  {
    id: "hr-leave",
    portal: "hr",
    module: "leave",
    label: "Leave Management",
    route: "/hr/leave/applications",
    icon: "Calendar",
    order: 210,
    section: "Time & Absence",
    moduleKey: "leave",
    children: [
      {
        id: "hr-leave-applications",
        portal: "hr",
        module: "leave",
        label: "Leave Applications",
        route: "/hr/leave/applications",
        icon: "FileText",
        order: 211,
      },
      {
        id: "hr-leave-balances",
        portal: "hr",
        module: "leave",
        label: "Leave Ledgers & Balances",
        route: "/hr/leave/balances",
        icon: "BookOpen",
        order: 212,
      },
      {
        id: "hr-leave-calendar",
        portal: "hr",
        module: "leave",
        label: "Team Leave Calendar",
        route: "/hr/leave/calendar",
        icon: "CalendarDays",
        order: 213,
      },
      {
        id: "hr-leave-types",
        portal: "hr",
        module: "leave",
        label: "Leave Types",
        route: "/hr/leave/types",
        icon: "Tag",
        order: 214,
      },
      {
        id: "hr-leave-policies",
        portal: "hr",
        module: "leave",
        label: "Leave Policies",
        route: "/hr/leave/policies",
        icon: "ShieldAlert",
        order: 215,
      },
      {
        id: "hr-leave-encashment",
        portal: "hr",
        module: "leave",
        label: "Encashment & Comp-off",
        route: "/hr/leave/encashment-compoff",
        icon: "Coins",
        order: 216,
      },
    ],
  },

  // Payroll & Statutory
  {
    id: "hr-payroll",
    portal: "hr",
    module: "payroll",
    label: "Payroll & Finance",
    route: "/hr/payroll/runs",
    icon: "Banknote",
    order: 300,
    section: "Payroll & Statutory",
    moduleKey: "payroll",
    permission: "finance.payroll.manage",
    children: [
      {
        id: "hr-payroll-runs",
        portal: "hr",
        module: "payroll",
        label: "Monthly Payroll Runs",
        route: "/hr/payroll/runs",
        icon: "PlayCircle",
        order: 301,
      },
      {
        id: "hr-payroll-payslips",
        portal: "hr",
        module: "payroll",
        label: "Payslip Distribution",
        route: "/hr/payroll/payslips",
        icon: "Receipt",
        order: 302,
      },
      {
        id: "hr-payroll-salaries",
        portal: "hr",
        module: "payroll",
        label: "Employee Salaries",
        route: "/hr/payroll/employee-salaries",
        icon: "DollarSign",
        order: 303,
      },
      {
        id: "hr-payroll-components",
        portal: "hr",
        module: "payroll",
        label: "Salary Components",
        route: "/hr/payroll/components",
        icon: "Layers",
        order: 304,
      },
      {
        id: "hr-payroll-tax",
        portal: "hr",
        module: "payroll",
        label: "Tax Declarations & Proofs",
        route: "/hr/payroll/tax",
        icon: "FileText",
        order: 305,
      },
      {
        id: "hr-payroll-reimbursements-loans",
        portal: "hr",
        module: "payroll",
        label: "Reimbursements & Loans",
        route: "/hr/payroll/reimbursements-loans",
        icon: "CreditCard",
        order: 306,
      },
      {
        id: "hr-payroll-forms",
        portal: "hr",
        module: "payroll",
        label: "Statutory Forms & Returns",
        route: "/hr/payroll/forms",
        icon: "ShieldAlert",
        order: 307,
      },
      {
        id: "hr-payroll-setup",
        portal: "hr",
        module: "payroll",
        label: "Payroll & Statutory Setup",
        route: "/hr/payroll/setup",
        icon: "Settings",
        order: 308,
      },
    ],
  },

  // Operations & Assets
  {
    id: "hr-recruitment",
    portal: "hr",
    module: "recruitment",
    label: "Recruitment (ATS)",
    route: "/hr/recruitment/job-postings",
    icon: "Briefcase",
    order: 400,
    section: "Talent & Operations",
    moduleKey: "recruitment",
    children: [
      {
        id: "hr-rec-job-postings",
        portal: "hr",
        module: "recruitment",
        label: "Job Postings",
        route: "/hr/recruitment/job-postings",
        icon: "Briefcase",
        order: 401,
      },
      {
        id: "hr-rec-candidates",
        portal: "hr",
        module: "recruitment",
        label: "Candidates 360",
        route: "/hr/recruitment/candidates",
        icon: "Users",
        order: 402,
      },
      {
        id: "hr-rec-pipeline",
        portal: "hr",
        module: "recruitment",
        label: "Pipeline & Kanban",
        route: "/hr/recruitment/pipeline",
        icon: "Layers",
        order: 403,
      },
      {
        id: "hr-rec-interviews",
        portal: "hr",
        module: "recruitment",
        label: "Interviews & Panels",
        route: "/hr/recruitment/interviews",
        icon: "Video",
        order: 404,
      },
      {
        id: "hr-rec-assessments",
        portal: "hr",
        module: "recruitment",
        label: "Assessments & Tests",
        route: "/hr/recruitment/assessments",
        icon: "Award",
        order: 405,
      },
      {
        id: "hr-rec-offers",
        portal: "hr",
        module: "recruitment",
        label: "Offers & CTC",
        route: "/hr/recruitment/offers",
        icon: "FileText",
        order: 406,
      },
      {
        id: "hr-rec-onboarding",
        portal: "hr",
        module: "recruitment",
        label: "Candidate Onboarding",
        route: "/hr/recruitment/candidate-onboarding",
        icon: "UserCheck",
        order: 407,
      },
      {
        id: "hr-rec-referrals",
        portal: "hr",
        module: "recruitment",
        label: "Referrals Program",
        route: "/hr/recruitment/referrals",
        icon: "Share2",
        order: 408,
      },
      {
        id: "hr-rec-career-site",
        portal: "hr",
        module: "recruitment",
        label: "Career Portal Admin",
        route: "/hr/recruitment/career-site",
        icon: "Globe",
        order: 409,
      },
      {
        id: "hr-rec-onboarding-checklists",
        portal: "hr",
        module: "recruitment",
        label: "Checklist Templates",
        route: "/hr/recruitment/onboarding-checklists",
        icon: "CheckSquare",
        order: 410,
      },
      {
        id: "hr-rec-check-items",
        portal: "hr",
        module: "recruitment",
        label: "Check Items Master",
        route: "/hr/recruitment/check-items",
        icon: "ListChecks",
        order: 411,
      },
      {
        id: "hr-rec-job-categories",
        portal: "hr",
        module: "recruitment",
        label: "Job Categories",
        route: "/hr/recruitment/job-categories",
        icon: "Tag",
        order: 412,
      },
      {
        id: "hr-rec-job-types",
        portal: "hr",
        module: "recruitment",
        label: "Job Types",
        route: "/hr/recruitment/job-types",
        icon: "Briefcase",
        order: 413,
      },
      {
        id: "hr-rec-job-locations",
        portal: "hr",
        module: "recruitment",
        label: "Job Locations",
        route: "/hr/recruitment/job-locations",
        icon: "MapPin",
        order: 414,
      },
      {
        id: "hr-rec-candidate-sources",
        portal: "hr",
        module: "recruitment",
        label: "Candidate Sources",
        route: "/hr/recruitment/candidate-sources",
        icon: "UserPlus",
        order: 415,
      },
      {
        id: "hr-rec-interview-types",
        portal: "hr",
        module: "recruitment",
        label: "Interview Types",
        route: "/hr/recruitment/interview-types",
        icon: "Video",
        order: 416,
      },
      {
        id: "hr-rec-interview-rounds",
        portal: "hr",
        module: "recruitment",
        label: "Interview Rounds",
        route: "/hr/recruitment/interview-rounds",
        icon: "Layers",
        order: 417,
      },
      {
        id: "hr-rec-offer-templates",
        portal: "hr",
        module: "recruitment",
        label: "Offer Templates",
        route: "/hr/recruitment/offer-templates",
        icon: "FileCode",
        order: 418,
      },
    ],
  },
  {
    id: "hr-assets",
    portal: "hr",
    module: "assets",
    label: "Company Assets",
    route: "/hr/assets",
    icon: "Laptop",
    order: 410,
    section: "Talent & Operations",
    moduleKey: "assets",
  },
  {
    id: "hr-performance",
    portal: "hr",
    module: "performance",
    label: "Performance & OKRs",
    route: "/hr/performance",
    icon: "Target",
    order: 420,
    section: "Talent & Operations",
    moduleKey: "performance",
  },

  // Configuration & Settings
  {
    id: "hr-settings",
    portal: "hr",
    module: "settings",
    label: "System & Workflows",
    route: "/hr/settings",
    icon: "Settings",
    order: 900,
    section: "Administration",
    permission: "hr.settings.manage",
  },

  // ==========================================
  // EMPLOYEE SELF-SERVICE PORTAL (/me/*)
  // ==========================================
  {
    id: "me-dashboard",
    portal: "me",
    module: "core",
    label: "My Workplace",
    route: "/me",
    icon: "LayoutDashboard",
    order: 10,
    section: "Overview",
    exactMatch: true,
  },
  {
    id: "me-profile",
    portal: "me",
    module: "profile",
    label: "My Profile & KYC",
    route: "/me/profile",
    icon: "User",
    order: 20,
    section: "My Information",
  },
  {
    id: "me-attendance",
    portal: "me",
    module: "attendance",
    label: "My Attendance",
    route: "/me/attendance/records",
    icon: "Clock",
    order: 100,
    section: "Time & Absence",
    moduleKey: "attendance",
    children: [
      {
        id: "me-attendance-records",
        portal: "me",
        module: "attendance",
        label: "Attendance Log",
        route: "/me/attendance/records",
        icon: "CalendarCheck",
        order: 101,
      },
      {
        id: "me-attendance-shifts",
        portal: "me",
        module: "attendance",
        label: "My Shift & Swaps",
        route: "/me/attendance/shifts",
        icon: "CalendarRange",
        order: 102,
      },
      {
        id: "me-attendance-regularizations",
        portal: "me",
        module: "attendance",
        label: "Regularizations",
        route: "/me/attendance/regularizations",
        icon: "FileEdit",
        order: 103,
      },
      {
        id: "me-attendance-timesheet",
        portal: "me",
        module: "attendance",
        label: "My Timesheet",
        route: "/me/attendance/timesheet",
        icon: "FileSpreadsheet",
        order: 104,
      },
      {
        id: "me-attendance-requests",
        portal: "me",
        module: "attendance",
        label: "OT / WFH Requests",
        route: "/me/attendance/requests",
        icon: "Send",
        order: 105,
      },
      {
        id: "me-attendance-policies",
        portal: "me",
        module: "attendance",
        label: "Attendance Rules",
        route: "/me/attendance/policies",
        icon: "ShieldCheck",
        order: 106,
      },
    ],
  },
  {
    id: "me-leave",
    portal: "me",
    module: "leave",
    label: "My Leaves & Holidays",
    route: "/me/leave/applications",
    icon: "Calendar",
    order: 110,
    section: "Time & Absence",
    moduleKey: "leave",
    children: [
      {
        id: "me-leave-applications",
        portal: "me",
        module: "leave",
        label: "Apply & History",
        route: "/me/leave/applications",
        icon: "FileText",
        order: 111,
      },
      {
        id: "me-leave-balance",
        portal: "me",
        module: "leave",
        label: "Leave Balances",
        route: "/me/leave/balance",
        icon: "BookOpen",
        order: 112,
      },
      {
        id: "me-leave-team-calendar",
        portal: "me",
        module: "leave",
        label: "Team Leave Calendar",
        route: "/me/leave/team-calendar",
        icon: "CalendarDays",
        order: 113,
      },
      {
        id: "me-leave-policies",
        portal: "me",
        module: "leave",
        label: "Leave Policies",
        route: "/me/leave/policies",
        icon: "ShieldAlert",
        order: 114,
      },
    ],
  },
  {
    id: "me-payroll-group",
    portal: "me",
    module: "payroll",
    label: "Payroll & Compensation",
    route: "/me/payroll/payslips",
    icon: "Banknote",
    order: 200,
    section: "Finance & Benefits",
    moduleKey: "payroll",
    children: [
      {
        id: "me-payroll-payslips",
        portal: "me",
        module: "payroll",
        label: "My Payslips",
        route: "/me/payroll/payslips",
        icon: "Receipt",
        order: 201,
      },
      {
        id: "me-payroll-salary",
        portal: "me",
        module: "payroll",
        label: "My Salary & CTC",
        route: "/me/payroll/salary",
        icon: "DollarSign",
        order: 202,
      },
      {
        id: "me-payroll-tax",
        portal: "me",
        module: "payroll",
        label: "Tax & Investments",
        route: "/me/payroll/tax",
        icon: "Percent",
        order: 203,
      },
      {
        id: "me-payroll-reimbursements-loans",
        portal: "me",
        module: "payroll",
        label: "Claims & Loans",
        route: "/me/payroll/reimbursements-loans",
        icon: "CreditCard",
        order: 204,
      },
      {
        id: "me-payroll-forms",
        portal: "me",
        module: "payroll",
        label: "Statutory Forms & PF",
        route: "/me/payroll/statutory-forms",
        icon: "FileText",
        order: 205,
      },
    ],
  },
  {
    id: "me-assets",
    portal: "me",
    module: "assets",
    label: "Assigned Assets",
    route: "/me/assets",
    icon: "Laptop",
    order: 300,
    section: "Workplace",
    moduleKey: "assets",
  },
  {
    id: "me-approvals",
    portal: "me",
    module: "workflows",
    label: "My Approvals & Actions",
    route: "/me/approvals",
    icon: "CheckSquare",
    order: 310,
    section: "Workplace",
    badgeKey: "myPendingApprovals",
  },
  {
    id: "me-helpdesk",
    portal: "me",
    module: "helpdesk",
    label: "Helpdesk & Requests",
    route: "/me/helpdesk",
    icon: "LifeBuoy",
    order: 320,
    section: "Workplace",
    moduleKey: "helpdesk",
  },
  {
    id: "me-recruitment",
    portal: "me",
    module: "recruitment",
    label: "Recruitment & Career",
    route: "/me/recruitment/job-postings",
    icon: "Briefcase",
    order: 330,
    section: "Workplace",
    moduleKey: "recruitment",
    children: [
      {
        id: "me-rec-job-postings",
        portal: "me",
        module: "recruitment",
        label: "Internal Job Board",
        route: "/me/recruitment/job-postings",
        icon: "Briefcase",
        order: 331,
      },
      {
        id: "me-rec-interviews",
        portal: "me",
        module: "recruitment",
        label: "My Interview Panels",
        route: "/me/recruitment/interviews",
        icon: "Video",
        order: 332,
      },
      {
        id: "me-rec-onboarding",
        portal: "me",
        module: "recruitment",
        label: "My Onboarding Tasks",
        route: "/me/recruitment/onboarding",
        icon: "CheckSquare",
        order: 333,
      },
      {
        id: "me-rec-assessments",
        portal: "me",
        module: "recruitment",
        label: "Candidate Assessments",
        route: "/me/recruitment/assessments",
        icon: "Award",
        order: 334,
      },
      {
        id: "me-rec-career",
        portal: "me",
        module: "recruitment",
        label: "My Referrals & Mobility",
        route: "/me/recruitment/career",
        icon: "Share2",
        order: 335,
      },
    ],
  },

  // ==========================================
  // SUPER ADMIN PORTAL (/super/*)
  // ==========================================
  {
    id: "sa-dashboard",
    portal: "sa",
    module: "saas",
    label: "Platform Command",
    route: "/super",
    icon: "Activity",
    order: 10,
  },
  {
    id: "sa-tenants",
    portal: "sa",
    module: "saas",
    label: "Tenant Workspaces",
    route: "/super/tenants",
    icon: "Building",
    order: 20,
  },
  {
    id: "sa-subscriptions",
    portal: "sa",
    module: "billing",
    label: "Plans & Subscriptions",
    route: "/super/subscriptions",
    icon: "CreditCard",
    order: 30,
  },

  // ==========================================
  // CLIENT PORTAL (/client/*)
  // ==========================================
  {
    id: "client-dashboard",
    portal: "client",
    module: "client",
    label: "Client Overview",
    route: "/client",
    icon: "LayoutDashboard",
    order: 10,
  },
  {
    id: "client-staffing",
    portal: "client",
    module: "client",
    label: "Deployed Personnel",
    route: "/client/staffing",
    icon: "Users",
    order: 20,
  },
  {
    id: "client-invoices",
    portal: "client",
    module: "client",
    label: "Billing & Invoices",
    route: "/client/invoices",
    icon: "Receipt",
    order: 30,
  },
];

/**
 * Filters the registry to produce active, authorized navigation items for a portal.
 */
export function getNavigationForPortal(
  portal: PortalId,
  context: UserNavigationContext = {}
): NavigationItem[] {
  const {
    roles = [],
    permissions = [],
    enabledModules = [],
    isSuperAdmin = false,
    isTenantAdmin = false,
  } = context;

  return NAVIGATION_REGISTRY.filter((item) => {
    // 1. Portal match
    if (item.portal !== portal) return false;

    // 2. Tenant Module enablement
    if (item.moduleKey && enabledModules.length > 0) {
      if (!enabledModules.includes(item.moduleKey)) {
        return false;
      }
    }

    // 3. Permission authorization
    if (item.permission) {
      if (!isSuperAdmin && !isTenantAdmin) {
        if (!permissions.includes(item.permission)) {
          return false;
        }
      }
    }

    return true;
  }).map((item) => {
    if (!item.children || item.children.length === 0) {
      return item;
    }

    // Filter child items
    const visibleChildren = item.children.filter((child) => {
      if (child.moduleKey && enabledModules.length > 0) {
        if (!enabledModules.includes(child.moduleKey)) return false;
      }
      if (child.permission && !isSuperAdmin && !isTenantAdmin) {
        if (!permissions.includes(child.permission)) return false;
      }
      return true;
    });

    return {
      ...item,
      children: visibleChildren,
    };
  });
}

/**
 * Determines whether a navigation item is active based on current pathname.
 */
export function isRouteActive(currentPath: string, navItem: NavigationItem): boolean {
  if (navItem.exactMatch) {
    return currentPath === navItem.route;
  }
  return currentPath.startsWith(navItem.route);
}
