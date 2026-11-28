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
    companyProfile: "/hr/settings?tab=company-profile",
    users: "/tenant/users",
    roles: "/tenant/roles",
    subscription: "/tenant/subscription",
    billing: "/tenant/billing",
    settings: "/tenant/settings",
    hrmSetup: "/tenant/hrm-setup",
    mailTemplates: "/tenant/mail-templates",
    domain: "/tenant/domain",
    integrations: "/tenant/integrations",
    data: "/tenant/data",
    auditLogs: "/tenant/audit-logs",
    support: "/tenant/support",
    files: "/apps/file-manager/list-view",
    reports: "/hr/reports/custom",
    calendar: "/tenant/calendar",
    todo: "/tenant/todo",
    todoGantt: "/tenant/todo/gantt",
    chat: "/tenant/chat",
    chatGroups: "/tenant/chat/groups",
    chatContacts: "/tenant/chat/contacts",
    chatCalls: "/tenant/chat/calls",
  },

  // ── HR Operations Portal (/hr/*) ──
  hr: {
    // 1. Overview
    dashboard: "/hr/dashboard",
    calendar: "/hr/calendar",
    todo: "/hr/todo",
    todoGantt: "/hr/todo/gantt",
    chat: "/hr/chat",
    chatGroups: "/hr/chat/groups",
    chatContacts: "/hr/chat/contacts",
    chatCalls: "/hr/chat/calls",

    // 2. Workforce Management
    employees: "/hr/employees",
    organization: {
      root: "/hr/organization",
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
      devices: "/hr/attendance/devices",
    },
    leave: {
      root: "/hr/leave",
      applications: "/hr/leave/applications",
      balances: "/hr/leave/balances",
      types: "/hr/leave/types",
      policies: "/hr/leave/policies",
      encashmentCompOff: "/hr/leave/encashment-compoff",
    },

    // 3. Talent and Growth
    recruitment: {
      root: "/hr/recruitment",
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
      root: "/hr/lifecycle",
      awards: "/hr/awards",
      promotions: "/hr/lifecycle/promotions",
      transfers: "/hr/lifecycle/transfers",
      warnings: "/hr/lifecycle/warnings",
      resignations: "/hr/lifecycle/resignations",
      terminations: "/hr/lifecycle/terminations",
      trips: "/hr/lifecycle/trips",
      complaints: "/hr/lifecycle/complaints",
    },
    performance: {
      root: "/hr/performance",
      reviews: "/hr/performance/reviews",
      goals: "/hr/performance/goals",
      cycles: "/hr/performance/cycles",
      indicators: "/hr/performance/indicators",
      goalTypes: "/hr/performance/goal-types",
      indicatorCategories: "/hr/performance/indicator-categories",
    },
    training: {
      root: "/hr/training",
      employeeTrainings: "/hr/training/employee-trainings",
      sessions: "/hr/training/sessions",
      programs: "/hr/training/programs",
      types: "/hr/training/types",
    },

    // 4. Finance and Assets
    payroll: {
      root: "/hr/payroll",
      payslips: "/hr/payroll/payslips",
      runs: "/hr/payroll/runs",
      employeeSalaries: "/hr/payroll/employee-salaries",
      components: "/hr/payroll/components",
    },
    assets: {
      root: "/hr/assets",
      dashboard: "/asset-dashboard",
      list: "/hr/assets",
      depreciation: "/hr/assets/depreciation",
      types: "/hr/assets/types",
    },

    // 5. Communication and Content
    meetings: {
      root: "/hr/meetings",
      list: "/hr/meetings",
      actionItems: "/hr/meetings/action-items",
      types: "/hr/meetings/types",
      rooms: "/hr/meetings/rooms",
    },
    documents: {
      root: "/hr/documents",
      list: "/hr/documents",
      contracts: "/hr/documents/contracts",
      acknowledgements: "/hr/documents/acknowledgements",
      contractTemplates: "/hr/documents/contract-templates",
      documentTemplates: "/hr/documents/document-templates",
      contractTypes: "/hr/documents/contract-types",
      categories: "/hr/documents/categories",
    },
    media: "/hr/media",
    files: "/apps/file-manager/list-view",
    reports: {
      root: "/hr/reports",
      custom: "/hr/reports/custom",
    },
    profile: "/hr/profile",
    settings: "/hr/settings",
  },

  // ── Employee Self-Service Portal (/me/*) ──
  me: {
    // 1. Overview
    dashboard: "/me/dashboard",
    calendar: "/me/calendar",
    todo: "/me/todo",
    todoGantt: "/me/todo/gantt",
    chat: "/me/chat",
    chatGroups: "/me/chat/groups",
    chatContacts: "/me/chat/contacts",
    chatCalls: "/me/chat/calls",
    notifications: "/me/notifications",

    // 2. Workspace Management
    employees: "/me/employees",
    organization: {
      root: "/me/organization",
      structure: "/me/organization/structure",
      holidays: "/me/organization/holidays",
      announcements: "/me/organization/announcements",
    },
    attendance: {
      root: "/me/attendance",
      records: "/me/attendance/records",
      timesheet: "/me/attendance/timesheet",
      timesheets: "/me/attendance/timesheet",
      regularizations: "/me/attendance/regularizations",
      shifts: "/me/attendance/shifts",
      policies: "/me/attendance/policies",
      requests: "/me/attendance/requests",
    },
    leave: {
      root: "/me/leave",
      applications: "/me/leave/applications",
      balance: "/me/leave/balance",
      policies: "/me/leave/policies",
      teamCalendar: "/me/leave/team-calendar",
      encashmentCompOff: "/me/leave/encashment-compoff",
    },

    // 3. Talent and Growth
    recruitment: {
      root: "/me/recruitment",
      jobPostings: "/me/recruitment/job-postings",
      interviews: "/me/recruitment/interviews",
      onboarding: "/me/recruitment/onboarding",
      assessments: "/me/recruitment/assessments",
      career: "/me/recruitment/career",
    },
    lifecycle: {
      root: "/me/lifecycle",
      awards: "/me/awards",
      promotions: "/me/lifecycle/promotions",
      transfers: "/me/lifecycle/transfers",
      warnings: "/me/lifecycle/warnings",
      resignation: "/me/lifecycle/resignation",
      exit: "/me/lifecycle/exit",
      trips: "/me/lifecycle/trips",
      complaints: "/me/lifecycle/complaints",
    },
    performance: {
      root: "/me/performance",
      reviews: "/me/performance/reviews",
      goals: "/me/performance/goals",
      cycles: "/me/performance/cycles",
      indicators: "/me/performance/indicators",
    },
    training: {
      root: "/me/training",
      trainings: "/me/training/trainings",
      sessions: "/me/training/sessions",
      programs: "/me/training/programs",
    },

    // 4. Finance and Assets
    payroll: {
      root: "/me/payroll",
      payslips: "/me/payroll/payslips",
      salary: "/me/payroll/salary",
      tax: "/me/payroll/tax",
      reimbursementsLoans: "/me/payroll/reimbursements-loans",
      statutoryForms: "/me/payroll/statutory-forms",
    },
    assets: {
      root: "/me/assets",
      dashboard: "/me/assets/dashboard",
      list: "/me/assets",
      requests: "/me/assets/requests",
    },

    // 5. Communication and Content
    meetings: {
      root: "/me/meetings",
      list: "/me/meetings",
      actionItems: "/me/meetings/action-items",
    },
    documents: {
      root: "/me/documents",
      list: "/me/documents",
      contracts: "/me/documents/contracts",
      acknowledgements: "/me/documents/acknowledgements",
      requests: "/me/documents/requests",
    },
    media: "/me/media",
    files: "/apps/file-manager/list-view",

    // 6. My Account
    profile: "/me/profile",
    settings: "/me/settings",
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
    subscriptions: "/super/plans",
    invoices: "/super/transactions",
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
