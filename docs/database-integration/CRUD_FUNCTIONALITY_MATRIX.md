# CRUD FUNCTIONALITY MATRIX

This matrix details the full CRUD capabilities across all business modules in the Master HRMS application, auditing whether operations are backed by authentic database endpoints or if gaps exist.

## Legend
- **PASS**: Genuinely connected to database API, persisted and verified.
- **NEEDS_FIX**: Currently hardcoded, using localStorage, or using broken/unconnected endpoints.
- **NA**: Not Applicable per domain business rules (e.g. Immutable records, Snapshots).

---

## 1. Multi-Tenant Core, Auth & Organization

| Module / Entity | Frontend Route | Backend Endpoint | Create (C) | Read (R) | Update (U) | Delete (D) | Search/Filter/Page | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Users / Auth** | `/login`, `/register` | `/api/auth/*` | PASS | PASS | PASS | PASS | PASS | PASS | Auth token verification + multi-tenant context |
| **Tenants** | `/super-admin/tenants` | `/api/tenants/*` | PASS | PASS | PASS | PASS | PASS | PASS | Superadmin tenant provisioning |
| **Employees** | `/employees` | `/api/employees` | PASS | PASS | PASS | PASS | PASS | PASS | Full employee profile & onboarding |
| **Departments** | `/departments` | `/api/departments` | PASS | PASS | PASS | PASS | PASS | PASS | Hierarchy & department heads |
| **Designations** | `/designations` | `/api/designations` | PASS | PASS | PASS | PASS | PASS | PASS | Linked to departments |
| **Roles & Permissions** | `/roles-permissions` | `/api/roles` | PASS | PASS | PASS | PASS | PASS | PASS | Dynamic RBAC matrix |

---

## 2. Productivity & Workspace Modules (Audited Gaps)

| Module / Entity | Frontend Route | Backend Endpoint | Create (C) | Read (R) | Update (U) | Delete (D) | Search/Filter/Page | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Workspace Todos** | `/todo` | `/api/todos` | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | **NEEDS_FIX** | Currently stored in browser `localStorage`. Needs `/api/todos` CRUD. |
| **Workspace Notes** | `/notes` | `/api/notes` | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | **NEEDS_FIX** | Currently stored in browser `localStorage`. Needs `/api/notes` CRUD. |
| **Calendar Events** | `/calendar` | `/api/calendar/events` | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | NEEDS_FIX | **NEEDS_FIX** | Currently stored in browser `localStorage`. Needs `/api/calendar/events` CRUD. |

---

## 3. Time, Attendance & Leaves

| Module / Entity | Frontend Route | Backend Endpoint | Create (C) | Read (R) | Update (U) | Delete (D) | Search/Filter/Page | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Attendance Logs** | `/attendance` | `/api/attendance` | PASS | PASS | PASS | NA | PASS | PASS | Real punch logs & audit trails |
| **Biometric Devices** | `/biometric` | `/api/biometric/devices` | PASS | PASS | PASS | PASS | PASS | PASS | ZKTeco/BioStar hardware registration |
| **Biometric PIN Mappings** | `/biometric` | `/api/biometric/pin-mappings` | PASS | PASS | PASS | PASS | PASS | PASS | Employee PIN link with conflict detection |
| **Leave Applications** | `/leaves` | `/api/leaves` | PASS | PASS | PASS | PASS | PASS | PASS | Multi-level approval workflows |
| **Leave Types / Policy** | `/leaves/policies` | `/api/leaves/types` | PASS | PASS | PASS | PASS | PASS | PASS | Configurable quotas & carry forwards |
| **Shifts & Rosters** | `/shifts` | `/api/shifts` | PASS | PASS | PASS | PASS | PASS | PASS | Rotational shifts and assignments |

---

## 4. Advanced Payroll, Banking & Statutory Compliance

| Module / Entity | Frontend Route | Backend Endpoint | Create (C) | Read (R) | Update (U) | Delete (D) | Search/Filter/Page | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Salary Components** | `/payroll/components` | `/api/payroll/components` | PASS | PASS | PASS | PASS | PASS | PASS | Earnings, deductions, benefits |
| **Salary Structures** | `/payroll/structures` | `/api/payroll/structures` | PASS | PASS | PASS | PASS | PASS | PASS | Formulas & pay slabs |
| **Salary Assignments** | `/payroll/assignments` | `/api/payroll/assignments` | PASS | PASS | PASS | PASS | PASS | PASS | Employee CTC packages |
| **Payroll Runs** | `/payroll` | `/api/payroll/runs` | PASS | PASS | PASS | PASS | PASS | PASS | Batch execution & locking |
| **Payslips** | `/payroll/payslips` | `/api/payroll/payslips` | PASS | PASS | NA | NA | PASS | PASS | Authoritative snapshots |
| **Bank Disbursements** | `/payroll/disbursement` | `/api/payroll/disbursements` | PASS | PASS | PASS | PASS | PASS | PASS | Batch creation, items, & export |
| **Digital Signatures** | `/payroll/disbursement` | `/api/payroll/disbursements/:id/sign` | PASS | PASS | NA | NA | NA | PASS | PAdES / PKCS#7 signatures |
| **EPF ECR Generation** | `/statutory-compliance` | `/api/statutory/epf/ecr` | PASS | PASS | NA | NA | PASS | PASS | Unified portal ASCII ECR generation |
| **ESIC Monthly Return** | `/statutory-compliance` | `/api/statutory/esic/return` | PASS | PASS | NA | NA | PASS | PASS | ESIC Excel return generator |
| **Tax Declarations** | `/tax-declarations` | `/api/tax/declarations` | PASS | PASS | PASS | PASS | PASS | PASS | 80C, 80D, HRA proof submissions |

---

## 5. Operations, CRM, Projects, Procurement & Helpdesk

| Module / Entity | Frontend Route | Backend Endpoint | Create (C) | Read (R) | Update (U) | Delete (D) | Search/Filter/Page | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **CRM Leads** | `/crm/leads` | `/api/crm/leads` | PASS | PASS | PASS | PASS | PASS | PASS | DB lead pipeline |
| **CRM Deals** | `/crm/deals` | `/api/crm/deals` | PASS | PASS | PASS | PASS | PASS | PASS | Deal stages and values |
| **Projects** | `/projects` | `/api/projects` | PASS | PASS | PASS | PASS | PASS | PASS | Milestone & budget tracking |
| **Project Tasks** | `/tasks` | `/api/tasks` | PASS | PASS | PASS | PASS | PASS | PASS | Kanban & list views |
| **Suppliers** | `/procurement/suppliers`| `/api/suppliers` | PASS | PASS | PASS | PASS | PASS | PASS | Vendor database |
| **Purchase Orders** | `/procurement/orders` | `/api/purchase-orders` | PASS | PASS | PASS | PASS | PASS | PASS | PO workflow |
| **Inventory / Products**| `/inventory/products` | `/api/products` | PASS | PASS | PASS | PASS | PASS | PASS | Stock tracking |
| **Helpdesk Tickets** | `/helpdesk/tickets` | `/api/tickets` | PASS | PASS | PASS | PASS | PASS | PASS | SLA & multi-agent assignment |
| **Expenses & Claims** | `/expenses` | `/api/expenses` | PASS | PASS | PASS | PASS | PASS | PASS | Multi-currency claims & receipts |

---

## 6. Dashboards & Analytics (Audited Gaps)

| Dashboard Page | Frontend Route | Current State | Required Fix |
|---|---|---|---|
| **CRM Dashboard** | `/crm-dashboard` | Hardcoded `$125,000`, `$154,000`, `.html` links (`leads.html`, `deals.html`) | Connect to `/api/dashboard/sales-crm`, use TanStack `<Link>` router |
| **Project Dashboard** | `/project-dashboard` | Hardcoded project counts, `.html` links | Connect to `/api/dashboard/projects`, use TanStack `<Link>` router |
| **Procurement Dashboard** | `/procurement-dashboard`| Hardcoded `$425,000` spend, `.html` links | Connect to `/api/dashboard/procurement`, use TanStack `<Link>` router |
| **Support Dashboard** | `/support-dashboard` | Hardcoded 248 tickets, `.html` links | Connect to `/api/dashboard/support`, use TanStack `<Link>` router |
| **IT Admin Dashboard** | `/it-admin-dashboard` | Hardcoded asset metrics, `.html` links | Connect to `/api/dashboard/it-admin`, use TanStack `<Link>` router |
| **Recruitment Dashboard**| `/recruitment-dashboard`| Hardcoded candidate pipeline stats | Connect to `/api/dashboard/recruitment`, use TanStack `<Link>` router |
| **AI Attendance Insights**| `/ai-attendance-insights`| Static `trendSeries` chart data | Derive trends dynamically from live `/api/attendance` records |
| **AI Payroll Forecast** | `/ai-payroll-forecast` | Static `payrollForecastSeries` | Derive forecasts dynamically from live `/api/payroll/runs` records |
| **AI Team Performance** | `/ai-team-performance-insights`| Static `ppeSeries` | Derive ratings from live `/api/performance/reviews` records |
| **Learning Analytics** | `/learning-analytics` | Static `learnEmployeeSeries` | Derive completions from live `/api/lms/enrollments` records |
