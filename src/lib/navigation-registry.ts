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

import { TENANT_NAVIGATION_REGISTRY } from "@/nav/registry";

export type PortalId = "tenant" | "hr" | "me" | "sa" | "client";

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
  roles?: string[];
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
  {
    "id": "hr-dashboard",
    "portal": "hr",
    "module": "core",
    "label": "Dashboard",
    "route": "/hr/dashboard",
    "icon": "LayoutDashboard",
    "order": 10,
    "section": "Overview",
    "exactMatch": true
  },
  {
    "id": "hr-calendar",
    "portal": "hr",
    "module": "calendar",
    "label": "Calendar",
    "route": "/hr/calendar",
    "icon": "Calendar",
    "order": 20,
    "section": "Overview"
  },
  {
    "id": "hr-chat",
    "portal": "hr",
    "module": "chat",
    "label": "Chat",
    "route": "/hr/chat",
    "icon": "MessageSquare",
    "order": 30,
    "section": "Overview"
  },
  {
    "id": "hr-approvals",
    "portal": "hr",
    "module": "approvals",
    "label": "Approvals",
    "route": "/hr/approvals",
    "icon": "FileCheck",
    "order": 35,
    "section": "Overview",
    "permission": "hr.manage"
  },
  {
    "id": "hr-employees",
    "portal": "hr",
    "module": "employees",
    "label": "Employees",
    "route": "/hr/employees",
    "icon": "Users",
    "order": 100,
    "section": "Workforce Management",
    "permission": "hr.employees.view"
  },
  {
    "id": "hr-organization",
    "portal": "hr",
    "module": "organization",
    "label": "Organization Structure",
    "route": "/hr/organization",
    "icon": "Building2",
    "order": 110,
    "section": "Workforce Management",
    "children": [
      {
        "id": "hr-org-branches",
        "portal": "hr",
        "module": "organization",
        "label": "Branches",
        "route": "/hr/organization/branches",
        "icon": "MapPin",
        "order": 111
      },
      {
        "id": "hr-org-departments",
        "portal": "hr",
        "module": "organization",
        "label": "Departments",
        "route": "/hr/organization/departments",
        "icon": "Boxes",
        "order": 112
      },
      {
        "id": "hr-org-designations",
        "portal": "hr",
        "module": "organization",
        "label": "Designations",
        "route": "/hr/organization/designations",
        "icon": "Award",
        "order": 113
      },
      {
        "id": "hr-org-holidays",
        "portal": "hr",
        "module": "organization",
        "label": "Holiday",
        "route": "/hr/organization/holidays",
        "icon": "Calendar",
        "order": 114
      },
      {
        "id": "hr-org-announcements",
        "portal": "hr",
        "module": "organization",
        "label": "Announcements",
        "route": "/hr/organization/announcements",
        "icon": "Megaphone",
        "order": 115
      },
      {
        "id": "hr-org-award-types",
        "portal": "hr",
        "module": "organization",
        "label": "Award Types",
        "route": "/hr/organization/award-types",
        "icon": "Trophy",
        "order": 116
      },
      {
        "id": "hr-org-document-types",
        "portal": "hr",
        "module": "organization",
        "label": "Document Types",
        "route": "/hr/organization/document-types",
        "icon": "FileText",
        "order": 117
      }
    ]
  },
  {
    "id": "hr-attendance",
    "portal": "hr",
    "module": "attendance",
    "label": "Attendance",
    "route": "/hr/attendance",
    "icon": "Clock",
    "order": 120,
    "section": "Workforce Management",
    "moduleKey": "attendance",
    "children": [
      {
        "id": "hr-att-records",
        "portal": "hr",
        "module": "attendance",
        "label": "Attendance Records",
        "route": "/hr/attendance/records",
        "icon": "CalendarCheck",
        "order": 121
      },
      {
        "id": "hr-att-timesheet",
        "portal": "hr",
        "module": "attendance",
        "label": "Timesheet",
        "route": "/hr/attendance/timesheet",
        "icon": "FileSpreadsheet",
        "order": 122
      },
      {
        "id": "hr-att-regularizations",
        "portal": "hr",
        "module": "attendance",
        "label": "Attendance Regularizations",
        "route": "/hr/attendance/regularizations",
        "icon": "FileEdit",
        "order": 123
      },
      {
        "id": "hr-att-shifts",
        "portal": "hr",
        "module": "attendance",
        "label": "Shifts",
        "route": "/hr/attendance/shifts",
        "icon": "CalendarRange",
        "order": 124
      },
      {
        "id": "hr-att-policies",
        "portal": "hr",
        "module": "attendance",
        "label": "Attendance Policy",
        "route": "/hr/attendance/policies",
        "icon": "ShieldCheck",
        "order": 125
      }
    ]
  },
  {
    "id": "hr-leave",
    "portal": "hr",
    "module": "leave",
    "label": "Leave Management",
    "route": "/hr/leave",
    "icon": "CalendarDays",
    "order": 130,
    "section": "Workforce Management",
    "moduleKey": "leave",
    "children": [
      {
        "id": "hr-lv-applications",
        "portal": "hr",
        "module": "leave",
        "label": "Leave Applications",
        "route": "/hr/leave/applications",
        "icon": "CalendarCheck",
        "order": 131
      },
      {
        "id": "hr-lv-balances",
        "portal": "hr",
        "module": "leave",
        "label": "Leave Balances",
        "route": "/hr/leave/balances",
        "icon": "Scale",
        "order": 132
      },
      {
        "id": "hr-lv-types",
        "portal": "hr",
        "module": "leave",
        "label": "Leave Types",
        "route": "/hr/leave/types",
        "icon": "Layers",
        "order": 133
      },
      {
        "id": "hr-lv-policies",
        "portal": "hr",
        "module": "leave",
        "label": "Leave Policies",
        "route": "/hr/leave/policies",
        "icon": "ShieldCheck",
        "order": 134
      }
    ]
  },
  {
    "id": "hr-recruitment",
    "portal": "hr",
    "module": "recruitment",
    "label": "Recruitment",
    "route": "/hr/recruitment",
    "icon": "Briefcase",
    "order": 200,
    "section": "Talent & Growth",
    "moduleKey": "recruitment",
    "children": [
      {
        "id": "hr-rec-job-postings",
        "portal": "hr",
        "module": "recruitment",
        "label": "Job Postings",
        "route": "/hr/recruitment/job-postings",
        "icon": "Briefcase",
        "order": 201
      },
      {
        "id": "hr-rec-candidates",
        "portal": "hr",
        "module": "recruitment",
        "label": "Candidates",
        "route": "/hr/recruitment/candidates",
        "icon": "Users",
        "order": 202
      },
      {
        "id": "hr-rec-interviews",
        "portal": "hr",
        "module": "recruitment",
        "label": "Interviews",
        "route": "/hr/recruitment/interviews",
        "icon": "Video",
        "order": 203
      },
      {
        "id": "hr-rec-offers",
        "portal": "hr",
        "module": "recruitment",
        "label": "Offers",
        "route": "/hr/recruitment/offers",
        "icon": "FileText",
        "order": 204
      },
      {
        "id": "hr-rec-onboarding",
        "portal": "hr",
        "module": "recruitment",
        "label": "Candidate Onboarding",
        "route": "/hr/recruitment/onboarding",
        "icon": "UserCheck",
        "order": 205
      },
      {
        "id": "hr-rec-assessments",
        "portal": "hr",
        "module": "recruitment",
        "label": "Candidate Assessments",
        "route": "/hr/recruitment/assessments",
        "icon": "Award",
        "order": 206
      },
      {
        "id": "hr-rec-checklists",
        "portal": "hr",
        "module": "recruitment",
        "label": "Onboarding Checklists",
        "route": "/hr/recruitment/onboarding-checklists",
        "icon": "CheckSquare",
        "order": 207
      },
      {
        "id": "hr-rec-check-items",
        "portal": "hr",
        "module": "recruitment",
        "label": "Check Items",
        "route": "/hr/recruitment/check-items",
        "icon": "CheckSquare",
        "order": 208
      },
      {
        "id": "hr-rec-career",
        "portal": "hr",
        "module": "recruitment",
        "label": "Career",
        "route": "/hr/recruitment/career",
        "icon": "Globe",
        "order": 209
      },
      {
        "id": "hr-rec-categories",
        "portal": "hr",
        "module": "recruitment",
        "label": "Job Categories",
        "route": "/hr/recruitment/job-categories",
        "icon": "Layers",
        "order": 210
      },
      {
        "id": "hr-rec-types",
        "portal": "hr",
        "module": "recruitment",
        "label": "Job Types",
        "route": "/hr/recruitment/job-types",
        "icon": "Tag",
        "order": 211
      },
      {
        "id": "hr-rec-locations",
        "portal": "hr",
        "module": "recruitment",
        "label": "Job Locations",
        "route": "/hr/recruitment/job-locations",
        "icon": "MapPin",
        "order": 212
      },
      {
        "id": "hr-rec-sources",
        "portal": "hr",
        "module": "recruitment",
        "label": "Candidate Sources",
        "route": "/hr/recruitment/candidate-sources",
        "icon": "Share2",
        "order": 213
      },
      {
        "id": "hr-rec-interview-types",
        "portal": "hr",
        "module": "recruitment",
        "label": "Interview Types",
        "route": "/hr/recruitment/interview-types",
        "icon": "Layers",
        "order": 214
      },
      {
        "id": "hr-rec-rounds",
        "portal": "hr",
        "module": "recruitment",
        "label": "Interview Rounds",
        "route": "/hr/recruitment/interview-rounds",
        "icon": "CheckSquare",
        "order": 215
      },
      {
        "id": "hr-rec-offer-templates",
        "portal": "hr",
        "module": "recruitment",
        "label": "Offer Templates",
        "route": "/hr/recruitment/offer-templates",
        "icon": "FileCode",
        "order": 216
      }
    ]
  },
  {
    "id": "hr-lifecycle",
    "portal": "hr",
    "module": "lifecycle",
    "label": "Employee Lifecycle",
    "route": "/hr/lifecycle",
    "icon": "UserCheck",
    "order": 220,
    "section": "Talent & Growth",
    "children": [
      {
        "id": "hr-lc-award",
        "portal": "hr",
        "module": "lifecycle",
        "label": "Award",
        "route": "/hr/lifecycle/awards",
        "icon": "Award",
        "order": 221
      },
      {
        "id": "hr-lc-promotions",
        "portal": "hr",
        "module": "lifecycle",
        "label": "Promotions",
        "route": "/hr/lifecycle/promotions",
        "icon": "TrendingUp",
        "order": 222
      },
      {
        "id": "hr-lc-transfers",
        "portal": "hr",
        "module": "lifecycle",
        "label": "Transfers",
        "route": "/hr/lifecycle/transfers",
        "icon": "MapPin",
        "order": 223
      },
      {
        "id": "hr-lc-warnings",
        "portal": "hr",
        "module": "lifecycle",
        "label": "Warnings",
        "route": "/hr/lifecycle/warnings",
        "icon": "AlertTriangle",
        "order": 224
      },
      {
        "id": "hr-lc-resignations",
        "portal": "hr",
        "module": "lifecycle",
        "label": "Resignations",
        "route": "/hr/lifecycle/resignations",
        "icon": "LogOut",
        "order": 225
      },
      {
        "id": "hr-lc-terminations",
        "portal": "hr",
        "module": "lifecycle",
        "label": "Terminations",
        "route": "/hr/lifecycle/terminations",
        "icon": "UserMinus",
        "order": 226
      },
      {
        "id": "hr-lc-trips",
        "portal": "hr",
        "module": "lifecycle",
        "label": "Trips",
        "route": "/hr/lifecycle/trips",
        "icon": "Plane",
        "order": 227
      },
      {
        "id": "hr-lc-complaints",
        "portal": "hr",
        "module": "lifecycle",
        "label": "Complaints",
        "route": "/hr/lifecycle/complaints",
        "icon": "ShieldAlert",
        "order": 228
      }
    ]
  },
  {
    "id": "hr-performance",
    "portal": "hr",
    "module": "performance",
    "label": "Performance Management",
    "route": "/hr/performance",
    "icon": "TrendingUp",
    "order": 230,
    "section": "Talent & Growth",
    "children": [
      {
        "id": "hr-pf-reviews",
        "portal": "hr",
        "module": "performance",
        "label": "Employee Reviews",
        "route": "/hr/performance/reviews",
        "icon": "Award",
        "order": 231
      },
      {
        "id": "hr-pf-goals",
        "portal": "hr",
        "module": "performance",
        "label": "Employee Goals",
        "route": "/hr/performance/goals",
        "icon": "Target",
        "order": 232
      },
      {
        "id": "hr-pf-cycles",
        "portal": "hr",
        "module": "performance",
        "label": "Review Cycles",
        "route": "/hr/performance/cycles",
        "icon": "Calendar",
        "order": 233
      },
      {
        "id": "hr-pf-indicators",
        "portal": "hr",
        "module": "performance",
        "label": "Indicators",
        "route": "/hr/performance/indicators",
        "icon": "Star",
        "order": 234
      },
      {
        "id": "hr-pf-goal-types",
        "portal": "hr",
        "module": "performance",
        "label": "Goal Types",
        "route": "/hr/performance/goal-types",
        "icon": "Layers",
        "order": 235
      },
      {
        "id": "hr-pf-indicator-cats",
        "portal": "hr",
        "module": "performance",
        "label": "Indicator Categories",
        "route": "/hr/performance/indicator-categories",
        "icon": "Tags",
        "order": 236
      }
    ]
  },
  {
    "id": "hr-training",
    "portal": "hr",
    "module": "training",
    "label": "Training & Development",
    "route": "/hr/training",
    "icon": "GraduationCap",
    "order": 240,
    "section": "Talent & Growth",
    "children": [
      {
        "id": "hr-tr-trainings",
        "portal": "hr",
        "module": "training",
        "label": "Employee Trainings",
        "route": "/hr/training/trainings",
        "icon": "UserCheck",
        "order": 241
      },
      {
        "id": "hr-tr-sessions",
        "portal": "hr",
        "module": "training",
        "label": "Training Sessions",
        "route": "/hr/training/sessions",
        "icon": "Calendar",
        "order": 242
      },
      {
        "id": "hr-tr-programs",
        "portal": "hr",
        "module": "training",
        "label": "Training Programs",
        "route": "/hr/training/programs",
        "icon": "BookOpen",
        "order": 243
      },
      {
        "id": "hr-tr-types",
        "portal": "hr",
        "module": "training",
        "label": "Training Types",
        "route": "/hr/training/types",
        "icon": "Layers",
        "order": 244
      }
    ]
  },
  {
    "id": "hr-payroll",
    "portal": "hr",
    "module": "payroll",
    "label": "Payroll Management",
    "route": "/hr/payroll",
    "icon": "Banknote",
    "order": 300,
    "section": "Finance & Assets",
    "moduleKey": "payroll",
    "children": [
      {
        "id": "hr-pay-payslips",
        "portal": "hr",
        "module": "payroll",
        "label": "Payslips",
        "route": "/hr/payroll/payslips",
        "icon": "Receipt",
        "order": 301
      },
      {
        "id": "hr-pay-runs",
        "portal": "hr",
        "module": "payroll",
        "label": "Payroll Runs",
        "route": "/hr/payroll/runs",
        "icon": "PlayCircle",
        "order": 302
      },
      {
        "id": "hr-pay-salaries",
        "portal": "hr",
        "module": "payroll",
        "label": "Employee Salaries",
        "route": "/hr/payroll/salaries",
        "icon": "DollarSign",
        "order": 303
      },
      {
        "id": "hr-pay-components",
        "portal": "hr",
        "module": "payroll",
        "label": "Salary Components",
        "route": "/hr/payroll/components",
        "icon": "Layers",
        "order": 304
      }
    ]
  },
  {
    "id": "hr-assets",
    "portal": "hr",
    "module": "assets",
    "label": "Asset Management",
    "route": "/hr/assets",
    "icon": "Laptop",
    "order": 310,
    "section": "Finance & Assets",
    "moduleKey": "assets",
    "children": [
      {
        "id": "hr-ast-dashboard",
        "portal": "hr",
        "module": "assets",
        "label": "Dashboard",
        "route": "/hr/assets/dashboard",
        "icon": "LayoutDashboard",
        "order": 311
      },
      {
        "id": "hr-ast-registry",
        "portal": "hr",
        "module": "assets",
        "label": "Assets",
        "route": "/hr/assets",
        "icon": "Box",
        "order": 312
      },
      {
        "id": "hr-ast-depreciation",
        "portal": "hr",
        "module": "assets",
        "label": "Depreciation",
        "route": "/hr/assets/depreciation",
        "icon": "TrendingDown",
        "order": 313
      },
      {
        "id": "hr-ast-types",
        "portal": "hr",
        "module": "assets",
        "label": "Asset Types",
        "route": "/hr/assets/types",
        "icon": "Layers",
        "order": 314
      }
    ]
  },
  {
    "id": "hr-meetings",
    "portal": "hr",
    "module": "meetings",
    "label": "Meetings",
    "route": "/hr/meetings",
    "icon": "Calendar",
    "order": 400,
    "section": "Communication & Content",
    "children": [
      {
        "id": "hr-mt-calendar",
        "portal": "hr",
        "module": "meetings",
        "label": "Meetings",
        "route": "/hr/meetings",
        "icon": "Calendar",
        "order": 401
      },
      {
        "id": "hr-mt-actions",
        "portal": "hr",
        "module": "meetings",
        "label": "Action Items",
        "route": "/hr/meetings/action-items",
        "icon": "CheckSquare",
        "order": 402
      },
      {
        "id": "hr-mt-types",
        "portal": "hr",
        "module": "meetings",
        "label": "Meeting Types",
        "route": "/hr/meetings/types",
        "icon": "Layers",
        "order": 403
      },
      {
        "id": "hr-mt-rooms",
        "portal": "hr",
        "module": "meetings",
        "label": "Meeting Rooms",
        "route": "/hr/meetings/rooms",
        "icon": "DoorOpen",
        "order": 404
      }
    ]
  },
  {
    "id": "hr-documents",
    "portal": "hr",
    "module": "documents",
    "label": "Documents & Contracts",
    "route": "/hr/documents",
    "icon": "FileText",
    "order": 410,
    "section": "Communication & Content",
    "children": [
      {
        "id": "hr-doc-vault",
        "portal": "hr",
        "module": "documents",
        "label": "HR Documents",
        "route": "/hr/documents",
        "icon": "FileText",
        "order": 411
      },
      {
        "id": "hr-doc-contracts",
        "portal": "hr",
        "module": "documents",
        "label": "Employee Contracts",
        "route": "/hr/documents/contracts",
        "icon": "FileSignature",
        "order": 412
      },
      {
        "id": "hr-doc-acks",
        "portal": "hr",
        "module": "documents",
        "label": "Acknowledgements",
        "route": "/hr/documents/acknowledgements",
        "icon": "FileCheck2",
        "order": 413
      },
      {
        "id": "hr-doc-contract-templates",
        "portal": "hr",
        "module": "documents",
        "label": "Contract Templates",
        "route": "/hr/documents/contract-templates",
        "icon": "FileCode",
        "order": 414
      },
      {
        "id": "hr-doc-templates",
        "portal": "hr",
        "module": "documents",
        "label": "Document Templates",
        "route": "/hr/documents/templates",
        "icon": "FileText",
        "order": 415
      },
      {
        "id": "hr-doc-contract-types",
        "portal": "hr",
        "module": "documents",
        "label": "Contract Types",
        "route": "/hr/documents/contract-types",
        "icon": "Tag",
        "order": 416
      },
      {
        "id": "hr-doc-categories",
        "portal": "hr",
        "module": "documents",
        "label": "Document Category",
        "route": "/hr/documents/categories",
        "icon": "Layers",
        "order": 417
      }
    ]
  },
  {
    "id": "hr-media",
    "portal": "hr",
    "module": "media",
    "label": "Media Library",
    "route": "/hr/media",
    "icon": "FolderOpen",
    "order": 420,
    "section": "Communication & Content"
  },
  {
    "id": "hr-profile",
    "portal": "hr",
    "module": "profile",
    "label": "My Profile",
    "route": "/hr/profile",
    "icon": "User",
    "order": 430,
    "section": "Communication & Content"
  },
  {
    "id": "hr-settings",
    "portal": "hr",
    "module": "settings",
    "label": "Settings",
    "route": "/hr/settings",
    "icon": "Settings",
    "order": 440,
    "section": "Communication & Content",
    "permission": "settings.manage"
  },
  {
    "id": "me-dashboard",
    "portal": "me",
    "module": "core",
    "label": "Dashboard",
    "route": "/me/dashboard",
    "icon": "LayoutDashboard",
    "order": 10,
    "section": "Overview",
    "exactMatch": true
  },
  {
    "id": "me-calendar",
    "portal": "me",
    "module": "calendar",
    "label": "Calendar",
    "route": "/me/calendar",
    "icon": "Calendar",
    "order": 20,
    "section": "Overview"
  },
  {
    "id": "me-todo",
    "portal": "me",
    "module": "todo",
    "label": "Todo",
    "route": "/me/todo",
    "icon": "CheckSquare",
    "order": 30,
    "section": "Overview"
  },
  {
    "id": "me-chat",
    "portal": "me",
    "module": "chat",
    "label": "Chat",
    "route": "/me/chat",
    "icon": "MessageSquare",
    "order": 40,
    "section": "Overview"
  },
  {
    "id": "me-employees",
    "portal": "me",
    "module": "employees",
    "label": "Employee",
    "route": "/me/employees",
    "icon": "Users",
    "order": 100,
    "section": "Workspace Management"
  },
  {
    "id": "me-organization",
    "portal": "me",
    "module": "organization",
    "label": "Organization Structure",
    "route": "/me/organization/structure",
    "icon": "Building2",
    "order": 110,
    "section": "Workspace Management",
    "children": [
      {
        "id": "me-org-holidays",
        "portal": "me",
        "module": "organization",
        "label": "Holidays",
        "route": "/me/organization/holidays",
        "icon": "Calendar",
        "order": 111
      },
      {
        "id": "me-org-announcements",
        "portal": "me",
        "module": "organization",
        "label": "Announcements",
        "route": "/me/organization/announcements",
        "icon": "Megaphone",
        "order": 112
      }
    ]
  },
  {
    "id": "me-attendance",
    "portal": "me",
    "module": "attendance",
    "label": "Attendance",
    "route": "/me/attendance",
    "icon": "Clock",
    "order": 120,
    "section": "Workspace Management",
    "moduleKey": "attendance",
    "children": [
      {
        "id": "me-att-records",
        "portal": "me",
        "module": "attendance",
        "label": "Attendance Records",
        "route": "/me/attendance/records",
        "icon": "CalendarCheck",
        "order": 121
      },
      {
        "id": "me-att-timesheet",
        "portal": "me",
        "module": "attendance",
        "label": "Timesheet",
        "route": "/me/attendance/timesheet",
        "icon": "FileSpreadsheet",
        "order": 122
      },
      {
        "id": "me-att-regularizations",
        "portal": "me",
        "module": "attendance",
        "label": "Attendance Regularizations",
        "route": "/me/attendance/regularizations",
        "icon": "FileEdit",
        "order": 123
      },
      {
        "id": "me-att-shifts",
        "portal": "me",
        "module": "attendance",
        "label": "Shift",
        "route": "/me/attendance/shifts",
        "icon": "CalendarRange",
        "order": 124
      },
      {
        "id": "me-att-policies",
        "portal": "me",
        "module": "attendance",
        "label": "Attendance Policies",
        "route": "/me/attendance/policies",
        "icon": "ShieldCheck",
        "order": 125
      },
      {
        "id": "me-att-requests",
        "portal": "me",
        "module": "attendance",
        "label": "Requests",
        "route": "/me/attendance/requests",
        "icon": "Send",
        "order": 126
      }
    ]
  },
  {
    "id": "me-leave",
    "portal": "me",
    "module": "leave",
    "label": "Leave Management",
    "route": "/me/leave",
    "icon": "CalendarDays",
    "order": 130,
    "section": "Workspace Management",
    "moduleKey": "leave",
    "children": [
      {
        "id": "me-lv-applications",
        "portal": "me",
        "module": "leave",
        "label": "Leave Applications",
        "route": "/me/leave/applications",
        "icon": "CalendarCheck",
        "order": 131
      },
      {
        "id": "me-lv-balance",
        "portal": "me",
        "module": "leave",
        "label": "Leave Balance",
        "route": "/me/leave/balance",
        "icon": "Scale",
        "order": 132
      },
      {
        "id": "me-lv-policies",
        "portal": "me",
        "module": "leave",
        "label": "Leave Policies",
        "route": "/me/leave/policies",
        "icon": "ShieldCheck",
        "order": 133
      },
      {
        "id": "me-lv-team-calendar",
        "portal": "me",
        "module": "leave",
        "label": "Team Calendar",
        "route": "/me/leave/team-calendar",
        "icon": "Users",
        "order": 134
      }
    ]
  },
  {
    "id": "me-recruitment",
    "portal": "me",
    "module": "recruitment",
    "label": "Recruitment",
    "route": "/me/recruitment",
    "icon": "Briefcase",
    "order": 200,
    "section": "Talent & Growth",
    "moduleKey": "recruitment",
    "children": [
      {
        "id": "me-rec-job-postings",
        "portal": "me",
        "module": "recruitment",
        "label": "Job Postings",
        "route": "/me/recruitment/job-postings",
        "icon": "Briefcase",
        "order": 201
      },
      {
        "id": "me-rec-interviews",
        "portal": "me",
        "module": "recruitment",
        "label": "Interviews",
        "route": "/me/recruitment/interviews",
        "icon": "Video",
        "order": 202
      },
      {
        "id": "me-rec-onboarding",
        "portal": "me",
        "module": "recruitment",
        "label": "Candidate Onboarding",
        "route": "/me/recruitment/onboarding",
        "icon": "UserCheck",
        "order": 203
      },
      {
        "id": "me-rec-assessments",
        "portal": "me",
        "module": "recruitment",
        "label": "Candidate Assessments",
        "route": "/me/recruitment/assessments",
        "icon": "Award",
        "order": 204
      },
      {
        "id": "me-rec-career",
        "portal": "me",
        "module": "recruitment",
        "label": "Career",
        "route": "/me/recruitment/career",
        "icon": "Globe",
        "order": 205
      }
    ]
  },
  {
    "id": "me-lifecycle",
    "portal": "me",
    "module": "lifecycle",
    "label": "Employee Lifecycle",
    "route": "/me/lifecycle",
    "icon": "UserCheck",
    "order": 210,
    "section": "Talent & Growth",
    "children": [
      {
        "id": "me-lc-awards",
        "portal": "me",
        "module": "lifecycle",
        "label": "Awards",
        "route": "/me/lifecycle/awards",
        "icon": "Award",
        "order": 211
      },
      {
        "id": "me-lc-promotions",
        "portal": "me",
        "module": "lifecycle",
        "label": "Promotions",
        "route": "/me/lifecycle/promotions",
        "icon": "TrendingUp",
        "order": 212
      },
      {
        "id": "me-lc-transfers",
        "portal": "me",
        "module": "lifecycle",
        "label": "Transfers",
        "route": "/me/lifecycle/transfers",
        "icon": "MapPin",
        "order": 213
      },
      {
        "id": "me-lc-warnings",
        "portal": "me",
        "module": "lifecycle",
        "label": "Warnings",
        "route": "/me/lifecycle/warnings",
        "icon": "AlertTriangle",
        "order": 214
      },
      {
        "id": "me-lc-resignation",
        "portal": "me",
        "module": "lifecycle",
        "label": "Resignation",
        "route": "/me/lifecycle/resignation",
        "icon": "LogOut",
        "order": 215
      },
      {
        "id": "me-lc-exit",
        "portal": "me",
        "module": "lifecycle",
        "label": "My Exit",
        "route": "/me/lifecycle/exit",
        "icon": "UserMinus",
        "order": 216
      },
      {
        "id": "me-lc-trips",
        "portal": "me",
        "module": "lifecycle",
        "label": "Trips",
        "route": "/me/lifecycle/trips",
        "icon": "Plane",
        "order": 217
      },
      {
        "id": "me-lc-complaints",
        "portal": "me",
        "module": "lifecycle",
        "label": "Complaints",
        "route": "/me/lifecycle/complaints",
        "icon": "ShieldAlert",
        "order": 218
      }
    ]
  },
  {
    "id": "me-performance",
    "portal": "me",
    "module": "performance",
    "label": "Performance Management",
    "route": "/me/performance",
    "icon": "TrendingUp",
    "order": 220,
    "section": "Talent & Growth",
    "children": [
      {
        "id": "me-pf-reviews",
        "portal": "me",
        "module": "performance",
        "label": "Employee Reviews",
        "route": "/me/performance/reviews",
        "icon": "Award",
        "order": 221
      },
      {
        "id": "me-pf-goals",
        "portal": "me",
        "module": "performance",
        "label": "Employee Goals",
        "route": "/me/performance/goals",
        "icon": "Target",
        "order": 222
      },
      {
        "id": "me-pf-cycles",
        "portal": "me",
        "module": "performance",
        "label": "Review Cycles",
        "route": "/me/performance/cycles",
        "icon": "Calendar",
        "order": 223
      },
      {
        "id": "me-pf-indicators",
        "portal": "me",
        "module": "performance",
        "label": "Indicators",
        "route": "/me/performance/indicators",
        "icon": "Star",
        "order": 224
      }
    ]
  },
  {
    "id": "me-training",
    "portal": "me",
    "module": "training",
    "label": "Training & Development",
    "route": "/me/training",
    "icon": "GraduationCap",
    "order": 230,
    "section": "Talent & Growth",
    "children": [
      {
        "id": "me-tr-trainings",
        "portal": "me",
        "module": "training",
        "label": "Employee Trainings",
        "route": "/me/training/trainings",
        "icon": "UserCheck",
        "order": 231
      },
      {
        "id": "me-tr-sessions",
        "portal": "me",
        "module": "training",
        "label": "Training Sessions",
        "route": "/me/training/sessions",
        "icon": "Calendar",
        "order": 232
      },
      {
        "id": "me-tr-programs",
        "portal": "me",
        "module": "training",
        "label": "Training Programs",
        "route": "/me/training/programs",
        "icon": "BookOpen",
        "order": 233
      }
    ]
  },
  {
    "id": "me-payroll",
    "portal": "me",
    "module": "payroll",
    "label": "Payroll Management",
    "route": "/me/payroll",
    "icon": "Banknote",
    "order": 300,
    "section": "Finance & Assets",
    "moduleKey": "payroll",
    "children": [
      {
        "id": "me-pay-payslips",
        "portal": "me",
        "module": "payroll",
        "label": "Payslips",
        "route": "/me/payroll/payslips",
        "icon": "Receipt",
        "order": 301
      },
      {
        "id": "me-pay-salary",
        "portal": "me",
        "module": "payroll",
        "label": "My Salary",
        "route": "/me/payroll/salary",
        "icon": "DollarSign",
        "order": 302
      },
      {
        "id": "me-pay-tax",
        "portal": "me",
        "module": "payroll",
        "label": "Tax",
        "route": "/me/payroll/tax",
        "icon": "Percent",
        "order": 303
      },
      {
        "id": "me-pay-loans",
        "portal": "me",
        "module": "payroll",
        "label": "Reimbursements & Loans",
        "route": "/me/payroll/reimbursements-loans",
        "icon": "CreditCard",
        "order": 304
      },
      {
        "id": "me-pay-forms",
        "portal": "me",
        "module": "payroll",
        "label": "PF/ESI & Forms",
        "route": "/me/payroll/statutory-forms",
        "icon": "FileText",
        "order": 305
      }
    ]
  },
  {
    "id": "me-assets",
    "portal": "me",
    "module": "assets",
    "label": "Assets Management",
    "route": "/me/assets",
    "icon": "Laptop",
    "order": 310,
    "section": "Finance & Assets",
    "moduleKey": "assets",
    "children": [
      {
        "id": "me-ast-dashboard",
        "portal": "me",
        "module": "assets",
        "label": "Dashboard",
        "route": "/me/assets/dashboard",
        "icon": "LayoutDashboard",
        "order": 311
      },
      {
        "id": "me-ast-assets",
        "portal": "me",
        "module": "assets",
        "label": "My Assets",
        "route": "/me/assets",
        "icon": "Box",
        "order": 312,
        "exactMatch": true
      },
      {
        "id": "me-ast-requests",
        "portal": "me",
        "module": "assets",
        "label": "Requests",
        "route": "/me/assets/requests",
        "icon": "Send",
        "order": 313
      }
    ]
  },
  {
    "id": "me-meetings",
    "portal": "me",
    "module": "meetings",
    "label": "Meetings",
    "route": "/me/meetings",
    "icon": "Calendar",
    "order": 400,
    "section": "Communication & Content",
    "children": [
      {
        "id": "me-mt-meetings",
        "portal": "me",
        "module": "meetings",
        "label": "Meetings",
        "route": "/me/meetings",
        "icon": "Calendar",
        "order": 401,
        "exactMatch": true
      },
      {
        "id": "me-mt-actions",
        "portal": "me",
        "module": "meetings",
        "label": "Action Items",
        "route": "/me/meetings/action-items",
        "icon": "CheckSquare",
        "order": 402
      }
    ]
  },
  {
    "id": "me-documents",
    "portal": "me",
    "module": "documents",
    "label": "Documents & Contracts",
    "route": "/me/documents",
    "icon": "FileText",
    "order": 410,
    "section": "Communication & Content",
    "children": [
      {
        "id": "me-doc-vault",
        "portal": "me",
        "module": "documents",
        "label": "HR Documents",
        "route": "/me/documents",
        "icon": "FileText",
        "order": 411,
        "exactMatch": true
      },
      {
        "id": "me-doc-contracts",
        "portal": "me",
        "module": "documents",
        "label": "My Contracts",
        "route": "/me/documents/contracts",
        "icon": "FileSignature",
        "order": 412
      },
      {
        "id": "me-doc-acks",
        "portal": "me",
        "module": "documents",
        "label": "Acknowledgements",
        "route": "/me/documents/acknowledgements",
        "icon": "FileCheck2",
        "order": 413
      },
      {
        "id": "me-doc-requests",
        "portal": "me",
        "module": "documents",
        "label": "Document Requests",
        "route": "/me/documents/requests",
        "icon": "Send",
        "order": 414
      }
    ]
  },
  {
    "id": "me-media",
    "portal": "me",
    "module": "media",
    "label": "Media Library",
    "route": "/me/media",
    "icon": "FolderOpen",
    "order": 420,
    "section": "Communication & Content"
  },
  {
    "id": "me-profile",
    "portal": "me",
    "module": "profile",
    "label": "My Profile",
    "route": "/me/profile",
    "icon": "User",
    "order": 500,
    "section": "My Account"
  },
  {
    "id": "me-helpdesk",
    "portal": "me",
    "module": "helpdesk",
    "label": "Helpdesk",
    "route": "/me/helpdesk",
    "icon": "LifeBuoy",
    "order": 510,
    "section": "My Account"
  },
  {
    "id": "me-approvals",
    "portal": "me",
    "module": "approvals",
    "label": "Approvals",
    "route": "/me/approvals",
    "icon": "FileCheck",
    "order": 600,
    "section": "Manager-only",
    "roles": ["manager", "admin", "hr_admin", "super_admin"]
  },
  {
    "id": "sa-dashboard",
    "portal": "sa",
    "module": "saas",
    "label": "Platform Command",
    "route": "/super",
    "icon": "Activity",
    "order": 10
  },
  {
    "id": "sa-tenants",
    "portal": "sa",
    "module": "saas",
    "label": "Tenant Workspaces",
    "route": "/super/tenants",
    "icon": "Building",
    "order": 20
  },
  {
    "id": "sa-subscriptions",
    "portal": "sa",
    "module": "billing",
    "label": "Plans & Subscriptions",
    "route": "/super/subscriptions",
    "icon": "CreditCard",
    "order": 30
  },
  {
    "id": "client-dashboard",
    "portal": "client",
    "module": "client",
    "label": "Client Overview",
    "route": "/client",
    "icon": "LayoutDashboard",
    "order": 10
  },
  {
    "id": "client-staffing",
    "portal": "client",
    "module": "client",
    "label": "Deployed Personnel",
    "route": "/client/staffing",
    "icon": "Users",
    "order": 20
  },
  {
    "id": "client-invoices",
    "portal": "client",
    "module": "client",
    "label": "Billing & Invoices",
    "route": "/client/invoices",
    "icon": "Receipt",
    "order": 30
  }
];

/**
 * Filters the registry to produce active, authorized navigation items for a portal.
 */
export function getNavigationForPortal(
  portal: PortalId,
  context: UserNavigationContext = {}
): NavigationItem[] {
  if (portal === "tenant") {
    return TENANT_NAVIGATION_REGISTRY.map((t) => ({
      id: t.id,
      portal: "tenant" as PortalId,
      module: "tenant",
      label: t.label,
      route: t.path,
      icon: t.icon,
      order: t.order,
      section: t.heading,
      exactMatch: t.exactMatch,
      children: t.children?.map((c) => ({
        id: c.id,
        portal: "tenant" as PortalId,
        module: "tenant",
        label: c.label,
        route: c.path,
        icon: c.icon,
        order: c.order,
        section: c.heading,
        exactMatch: c.exactMatch,
      })),
    }));
  }

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

    // 2. Tenant Module / Entitlement enablement
    const modKey = item.moduleKey || item.module;
    if (modKey && !isSuperAdmin) {
      const isCore = ["core", "overview", "settings"].includes(modKey);
      if (!isCore && enabledModules && enabledModules.length > 0) {
        const isEnabled =
          enabledModules.includes(modKey) ||
          (modKey === "crm" && enabledModules.includes("product_crm")) ||
          (modKey === "pos" && (enabledModules.includes("product_pos") || enabledModules.includes("inventory"))) ||
          (modKey === "accounting" && (enabledModules.includes("finance") || enabledModules.includes("product_finance")));
        if (!isEnabled) {
          return false;
        }
      }
    }

    // 3. Role authorization
    if (item.roles && item.roles.length > 0) {
      if (!isSuperAdmin && !isTenantAdmin) {
        if (!item.roles.some((r) => roles.includes(r))) {
          return false;
        }
      }
    }

    // 4. Permission authorization
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
      const childModKey = child.moduleKey || child.module;
      if (childModKey && !isSuperAdmin) {
        const isCore = ["core", "overview", "settings"].includes(childModKey);
        if (!isCore && enabledModules && enabledModules.length > 0) {
          const isEnabled =
            enabledModules.includes(childModKey) ||
            (childModKey === "crm" && enabledModules.includes("product_crm")) ||
            (childModKey === "pos" && (enabledModules.includes("product_pos") || enabledModules.includes("inventory"))) ||
            (childModKey === "accounting" && (enabledModules.includes("finance") || enabledModules.includes("product_finance")));
          if (!isEnabled) return false;
        }
      }
      if (child.roles && child.roles.length > 0 && !isSuperAdmin && !isTenantAdmin) {
        if (!child.roles.some((r) => roles.includes(r))) return false;
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
  if (currentPath === navItem.route) {
    return true;
  }
  if (navItem.route === "/me/dashboard" && (currentPath === "/me" || currentPath === "/me/")) {
    return true;
  }
  if (navItem.route === "/hr/dashboard" && (currentPath === "/hr" || currentPath === "/hr/")) {
    return true;
  }
  if (navItem.children && navItem.children.length > 0) {
    return navItem.children.some((child) => isRouteActive(currentPath, child));
  }
  return currentPath.startsWith(navItem.route + "/");
}
