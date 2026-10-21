/**
 * MASTERHRMS — Authoritative Typed Path Registry & Navigation Constants
 * 
 * Single source of truth for all URLs across all portals:
 * - Public Auth: /login, /auth, /select-portal, etc.
 * - Tenant Admin: /tenant/*
 * - HR Operations: /hr/*
 * - Employee Self-Service: /me/*
 * - Super Admin: /super/*
 */

export const ROUTES = {
  // ── Public Auth & Platform Infrastructure ──
  public: {
    root: "/",
    login: "/login",
    auth: "/auth",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    acceptInvite: "/accept-invite",
    selectPortal: "/select-portal",
    superLogin: "/super-login",
    onboarding: "/onboarding",
    sessionExpired: "/session-expired",
    error404: "/404",
    error403: "/403",
    error500: "/500",
  },

  // ── Tenant Portal (/tenant/*) ──
  tenant: {
    dashboard: "/tenant/dashboard",
    companyProfile: "/tenant/company-profile",
    users: "/tenant/users",
    roles: "/tenant/roles",
    modules: "/tenant/modules",
    subscription: "/tenant/subscription",
    billing: "/tenant/billing",
    branding: "/tenant/branding",
    settings: "/tenant/settings",
    domain: "/tenant/domain",
    integrations: "/tenant/integrations",
    data: "/tenant/data",
    auditLogs: "/tenant/audit-logs",
    support: "/tenant/support",
  },

  // ── HR Operations Portal (/hr/*) ──
  hr: {
    // 1. Overview
    dashboard: "/hr/dashboard",
    calendar: "/hr/calendar",
    todo: "/hr/todo",
    chat: "/hr/chat",

    // 2. Workforce Management
    employees: "/hr/employees",
    organization: {
      branches: "/hr/organization/branches",
      departments: "/hr/organization/departments",
      designations: "/hr/organization/designations",
      holidays: "/hr/organization/holidays",
      announcements: "/hr/organization/announcements",
      awardTypes: "/hr/organization/award-types",
      documentTypes: "/hr/organization/document-types",
    },
    attendance: {
      root: "/hr/attendance",
      records: "/hr/attendance/records",
      timesheets: "/hr/attendance/timesheets",
      regularizations: "/hr/attendance/regularizations",
      shifts: "/hr/attendance/shifts",
      policies: "/hr/attendance/policies",
    },
    leave: {
      root: "/hr/leave",
      applications: "/hr/leave/applications",
      balances: "/hr/leave/balances",
      types: "/hr/leave/types",
      policies: "/hr/leave/policies",
    },

    // 3. Talent and Growth
    recruitment: {
      jobPostings: "/hr/recruitment/job-postings",
      candidates: "/hr/recruitment/candidates",
      interviews: "/hr/recruitment/interviews",
      offers: "/hr/recruitment/offers",
      candidateOnboarding: "/hr/recruitment/candidate-onboarding",
      assessments: "/hr/recruitment/assessments",
      onboardingChecklists: "/hr/recruitment/onboarding-checklists",
      checkItems: "/hr/recruitment/check-items",
      careerSite: "/hr/recruitment/career-site",
      jobCategories: "/hr/recruitment/job-categories",
      jobTypes: "/hr/recruitment/job-types",
      jobLocations: "/hr/recruitment/job-locations",
      candidateSources: "/hr/recruitment/candidate-sources",
      interviewTypes: "/hr/recruitment/interview-types",
      interviewRounds: "/hr/recruitment/interview-rounds",
      offerTemplates: "/hr/recruitment/offer-templates",
    },
    lifecycle: {
      awards: "/hr/lifecycle/awards",
      promotions: "/hr/lifecycle/promotions",
      transfers: "/hr/lifecycle/transfers",
      warnings: "/hr/lifecycle/warnings",
      resignations: "/hr/lifecycle/resignations",
      terminations: "/hr/lifecycle/terminations",
      trips: "/hr/lifecycle/trips",
      complaints: "/hr/lifecycle/complaints",
    },
    performance: {
      reviews: "/hr/performance/reviews",
      goals: "/hr/performance/goals",
      cycles: "/hr/performance/cycles",
      indicators: "/hr/performance/indicators",
      goalTypes: "/hr/performance/goal-types",
      indicatorCategories: "/hr/performance/indicator-categories",
    },
    training: {
      employeeTrainings: "/hr/training/employee-trainings",
      sessions: "/hr/training/sessions",
      programs: "/hr/training/programs",
      types: "/hr/training/types",
    },

    // 4. Finance and Assets
    payroll: {
      payslips: "/hr/payroll/payslips",
      runs: "/hr/payroll/runs",
      employeeSalaries: "/hr/payroll/employee-salaries",
      components: "/hr/payroll/components",
    },
    assets: {
      dashboard: "/hr/assets/dashboard",
      list: "/hr/assets",
      depreciation: "/hr/assets/depreciation",
      types: "/hr/assets/types",
    },

    // 5. Communication and Content
    meetings: {
      list: "/hr/meetings",
      actionItems: "/hr/meetings/action-items",
      types: "/hr/meetings/types",
      rooms: "/hr/meetings/rooms",
    },
    documents: {
      list: "/hr/documents",
      contracts: "/hr/documents/contracts",
      acknowledgements: "/hr/documents/acknowledgements",
      contractTemplates: "/hr/documents/contract-templates",
      documentTemplates: "/hr/documents/document-templates",
      contractTypes: "/hr/documents/contract-types",
      categories: "/hr/documents/categories",
    },
    media: "/hr/media",
    profile: "/hr/profile",
  },

  // ── Employee Self-Service Portal (/me/*) ──
  me: {
    // 1. Overview
    dashboard: "/me/dashboard",
    calendar: "/me/calendar",
    todo: "/me/todo",
    chat: "/me/chat",
    notifications: "/me/notifications",

    // 2. Workspace Management
    employees: "/me/employees",
    organization: {
      structure: "/me/organization/structure",
      holidays: "/me/organization/holidays",
      announcements: "/me/organization/announcements",
    },
    attendance: {
      records: "/me/attendance/records",
      timesheet: "/me/attendance/timesheet",
      timesheets: "/me/attendance/timesheet",
      regularizations: "/me/attendance/regularizations",
      shifts: "/me/attendance/shifts",
      policies: "/me/attendance/policies",
      requests: "/me/attendance/requests",
    },
    leave: {
      applications: "/me/leave/applications",
      balance: "/me/leave/balance",
      policies: "/me/leave/policies",
      teamCalendar: "/me/leave/team-calendar",
    },

    // 3. Talent and Growth
    recruitment: {
      jobPostings: "/me/recruitment/job-postings",
      interviews: "/me/recruitment/interviews",
      onboarding: "/me/recruitment/onboarding",
      assessments: "/me/recruitment/assessments",
      career: "/me/recruitment/career",
    },
    lifecycle: {
      awards: "/me/lifecycle/awards",
      promotions: "/me/lifecycle/promotions",
      transfers: "/me/lifecycle/transfers",
      warnings: "/me/lifecycle/warnings",
      resignation: "/me/lifecycle/resignation",
      exit: "/me/lifecycle/exit",
      trips: "/me/lifecycle/trips",
      complaints: "/me/lifecycle/complaints",
    },
    performance: {
      reviews: "/me/performance/reviews",
      goals: "/me/performance/goals",
      cycles: "/me/performance/cycles",
      indicators: "/me/performance/indicators",
    },
    training: {
      trainings: "/me/training/trainings",
      sessions: "/me/training/sessions",
      programs: "/me/training/programs",
    },

    // 4. Finance and Assets
    payroll: {
      payslips: "/me/payroll/payslips",
      salary: "/me/payroll/salary",
      tax: "/me/payroll/tax",
      reimbursementsLoans: "/me/payroll/reimbursements-loans",
      statutoryForms: "/me/payroll/statutory-forms",
    },
    assets: {
      dashboard: "/me/assets/dashboard",
      list: "/me/assets",
      requests: "/me/assets/requests",
    },

    // 5. Communication and Content
    meetings: {
      list: "/me/meetings",
      actionItems: "/me/meetings/action-items",
    },
    documents: {
      list: "/me/documents",
      contracts: "/me/documents/contracts",
      acknowledgements: "/me/documents/acknowledgements",
      requests: "/me/documents/requests",
    },
    media: "/me/media",

    // 6. My Account
    profile: "/me/profile",
    helpdesk: "/me/helpdesk",
    account: "/me/account",

    // 7. Manager Only
    team: "/me/team",
    approvals: "/me/approvals",
  },

  // ── Super Admin Portal (/super/*) ──
  super: {
    dashboard: "/super",
    tenants: "/super/tenants",
    plans: "/super/plans",
    subscriptions: "/super/subscriptions",
    invoices: "/super/invoices",
    domains: "/super/domains",
    settings: "/super/settings",
    developer: "/super/developer",
    docs: "/super/docs",
  },
} as const;

/**
 * Legacy Redirect Mapping Table:
 * Maps old /pages/*, root ERP HRM paths, or old shortcuts to canonical portal URLs.
 */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/hrm-dashboard": ROUTES.hr.dashboard,
  "/employee-dashboard": ROUTES.me.dashboard,
  "/dashboard": ROUTES.hr.dashboard,

  // Legacy /pages/* patterns
  "/pages/employees": ROUTES.hr.employees,
  "/pages/attendance": ROUTES.hr.attendance.records,
  "/pages/attendance-employee": ROUTES.me.attendance.records,
  "/pages/leave": ROUTES.hr.leave.applications,
  "/pages/payroll": ROUTES.hr.payroll.payslips,
  "/pages/recruitment": ROUTES.hr.recruitment.jobPostings,
  "/pages/performance-review": ROUTES.hr.performance.reviews,
  "/pages/training": ROUTES.hr.training.employeeTrainings,
  "/pages/assets": ROUTES.hr.assets.list,
  "/pages/documents": ROUTES.hr.documents.list,
  "/pages/departments": ROUTES.hr.organization.departments,
  "/pages/designations": ROUTES.hr.organization.designations,
  "/pages/holidays": ROUTES.hr.organization.holidays,

  // Legacy root paths
  "/employees": ROUTES.hr.employees,
  "/departments": ROUTES.hr.organization.departments,
  "/designations": ROUTES.hr.organization.designations,
  "/holidays": ROUTES.hr.organization.holidays,
  "/attendance": ROUTES.hr.attendance.root,
  "/attendance-employee": ROUTES.me.attendance.records,
  "/leave": ROUTES.hr.leave.applications,
  "/payroll": ROUTES.hr.payroll.payslips,
  "/recruitment": ROUTES.hr.recruitment.jobPostings,
  "/performance-appraisal": ROUTES.hr.performance.reviews,
  "/performance-review": ROUTES.hr.performance.reviews,
  "/training": ROUTES.hr.training.employeeTrainings,
  "/assets": ROUTES.hr.assets.list,
  "/documents": ROUTES.hr.documents.list,
};

export type RoleContext = "HR" | "EMPLOYEE" | "TENANT" | "SUPER";

/**
 * Returns the canonical route for a given module/submodule based on role context.
 */
export function getCanonicalRoute(options: {
  roleContext: RoleContext;
  module: string;
  submodule?: string;
}): string {
  const { roleContext, module, submodule } = options;
  if (roleContext === "HR") {
    switch (module) {
      case "attendance":
        if (submodule === "records") return ROUTES.hr.attendance.records;
        if (submodule === "timesheet" || submodule === "timesheets") return ROUTES.hr.attendance.timesheets;
        if (submodule === "regularizations") return ROUTES.hr.attendance.regularizations;
        if (submodule === "shifts") return ROUTES.hr.attendance.shifts;
        if (submodule === "policies") return ROUTES.hr.attendance.policies;
        return ROUTES.hr.attendance.root;
      case "leave":
        if (submodule === "balances") return ROUTES.hr.leave.balances;
        if (submodule === "types") return ROUTES.hr.leave.types;
        if (submodule === "policies") return ROUTES.hr.leave.policies;
        return ROUTES.hr.leave.applications;
      case "payroll":
        if (submodule === "runs") return ROUTES.hr.payroll.runs;
        if (submodule === "salaries") return ROUTES.hr.payroll.employeeSalaries;
        if (submodule === "components") return ROUTES.hr.payroll.components;
        return ROUTES.hr.payroll.runs;
      case "recruitment":
        if (submodule === "candidates") return ROUTES.hr.recruitment.candidates;
        if (submodule === "interviews") return ROUTES.hr.recruitment.interviews;
        return ROUTES.hr.recruitment.jobPostings;
      case "training":
        return ROUTES.hr.training.employeeTrainings;
      case "assets":
        return ROUTES.hr.assets.list;
      case "documents":
        return ROUTES.hr.documents.list;
      case "dashboard":
        return ROUTES.hr.dashboard;
      case "calendar":
        return ROUTES.hr.calendar;
      case "todo":
        return ROUTES.hr.todo;
      case "chat":
        return ROUTES.hr.chat;
      case "employees":
        return ROUTES.hr.employees;
      default:
        return `/hr/${module}`;
    }
  } else if (roleContext === "EMPLOYEE") {
    switch (module) {
      case "attendance":
        if (submodule === "timesheet") return "/me/attendance/timesheet";
        if (submodule === "regularizations") return ROUTES.me.attendance.regularizations;
        if (submodule === "shifts") return ROUTES.me.attendance.shifts;
        if (submodule === "policies") return ROUTES.me.attendance.policies;
        if (submodule === "requests") return "/me/attendance/requests";
        return ROUTES.me.attendance.records;
      case "leave":
        if (submodule === "balance") return ROUTES.me.leave.balance;
        if (submodule === "policies") return ROUTES.me.leave.policies;
        return ROUTES.me.leave.applications;
      case "payroll":
        if (submodule === "salary") return ROUTES.me.payroll.salary;
        return ROUTES.me.payroll.payslips;
      case "recruitment":
        return ROUTES.me.recruitment.jobPostings;
      case "training":
        return ROUTES.me.training.trainings;
      case "assets":
        return ROUTES.me.assets.list;
      case "documents":
        return ROUTES.me.documents.list;
      case "dashboard":
        return ROUTES.me.dashboard;
      case "calendar":
        return ROUTES.me.calendar;
      case "todo":
        return ROUTES.me.todo;
      case "chat":
        return ROUTES.me.chat;
      case "profile":
        return ROUTES.me.profile;
      default:
        return `/me/${module}`;
    }
  }
  return `/${module}`;
}

