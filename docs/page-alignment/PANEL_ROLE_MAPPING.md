# PANEL AND ROLE MAPPING ARCHITECTURE

**Project:** Dreams ERP / Master HRMS  
**Audit & Alignment Phase:** Phase 2 Deliverable  
**Timestamp:** 2026-10-01  
**Status:** COMPLETE & ALIGNED  

---

## 1. Executive Panel Architecture

The Master HRMS & ERP application implements an enterprise multi-tenant model. Rather than forcing separate web applications, the system utilizes **two core layout shells** with **context-aware dynamic role panels**:

1. **`/_authenticated/super/*`**: Dedicated Platform Super Admin Shell (`SuperShell`)
2. **`/_authenticated/_app/*`**: Tenant Enterprise Operations Shell (`AppShell` with role-aware `DreamsSidebar`)
3. **`/_authenticated/client/*` & `/portal/*`**: Client Self-Service Sub-Panel
4. **`/*`**: Public, Marketing, and Authentication Surface

---

## 2. Panel Definitions & Role Assignments

### Panel 1: Platform Super Admin Panel
* **Shell Route:** `src/routes/_authenticated/super/route.tsx`
* **Route Prefix:** `/super/*` (27 dedicated routes)
* **Authorized Roles:** `super_admin` ONLY
* **Access Boundary:**
  - Strict layout guard: `profile.roles?.includes("super_admin")`. Non-super admin users are immediately rejected and redirected to their home route.
  - Multi-tenant cross-boundary orchestration.
  - Controls platform billing plans, tenant provisioning, custom domain routing, global support tickets, platform backups, and platform-wide CMS.

| Module | Routes | Scope | Enforced Roles |
|---|---|---|---|
| Tenant Governance | `/super/tenants`, `/super/tenant-usage-metrics` | Platform | `super_admin` |
| Subscription & Billing | `/super/plans`, `/super/transactions` | Platform | `super_admin` |
| Security & RBAC | `/super/roles`, `/super/users` | Platform | `super_admin` |
| Infrastructure Controls | `/super/domains`, `/super/backup`, `/super/api-docs`, `/super/settings` | Platform | `super_admin` |
| Global Support & Communications | `/super/tenant-support-tickets`, `/super/agents`, `/super/sla-policies`, `/super/escalation-rules`, `/super/support` | Platform | `super_admin` |
| Marketing CMS & App Store | `/super/cms`, `/super/blogs`, `/super/case-studies`, `/super/media`, `/super/marketplace` | Platform | `super_admin` |

---

### Panel 2: Tenant Administration Panel
* **Shell Route:** `src/routes/_authenticated/_app/route.tsx`
* **Authorized Roles:** `Workspace Admin`, `admin`, `super_admin` (via tenant impersonation or bypass)
* **Access Boundary:**
  - Enforces `tenantId` isolation across all queries.
  - Manages tenant company profiles, department hierarchies, branches, role assignments, audit logs, custom fields, and third-party integrations.

| Feature / Page | Frontend Route | Key Permission | Authorized Roles |
|---|---|---|---|
| Tenant Settings | `/settings` | `admin.settings.manage` | `Workspace Admin`, `admin`, `super_admin` |
| User & Role Management | `/users` | `admin.users.manage` | `Workspace Admin`, `admin`, `super_admin` |
| Custom Field Designer | `/custom-fields` | `admin.custom_fields.manage` | `Workspace Admin`, `admin`, `super_admin` |
| Integration Hub (Shopify/Tally/WhatsApp) | `/integrations`, `/shopify`, `/tally-importer`, `/whatsapp-alerts` | `admin.integrations.manage` | `Workspace Admin`, `admin`, `super_admin` |
| IT & Security Controls | `/it-admin-dashboard`, `/ban-ip-address`, `/cronjob`, `/clear-cache`, `/system-states` | `admin.security.manage` | `Workspace Admin`, `admin`, `super_admin` |
| Tenant Subscription & Addons | `/subscription`, `/marketplace` | `admin.subscription.manage` | `Workspace Admin`, `admin`, `super_admin` |

---

### Panel 3: HR & People Operations Panel
* **Shell Route:** `src/routes/_authenticated/_app/route.tsx`
* **Authorized Roles:** `hr_admin`, `admin`, `Workspace Admin`, `super_admin`
* **Access Boundary:**
  - Manages workforce master records, full organization attendance, shift roster generation, company holiday calendars, and recruitment candidate pipelines.

| Feature / Page | Frontend Route | Key Permission | Authorized Roles |
|---|---|---|---|
| HRM Overview Hub | `/hrm`, `/dashboard` | `hrm.dashboard.view` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Employee Directory (All Staff) | `/employees`, `/employee-details` | `hrm.employees.manage` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Attendance Administration | `/attendance`, `/attendance-report`, `/daily-report` | `hrm.attendance.manage` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Biometric Device Management | `/biometric`, `/biometric-sync` | `hrm.biometric.manage` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Leave Administration | `/leave`, `/leave-report` | `hrm.leave.manage` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Shift Rostering & Scheduling | `/shifts`, `/shift-swap-requests` | `hrm.shifts.manage` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Lifecycle Management | `/promotions`, `/transfers`, `/resignation`, `/termination`, `/warnings`, `/awards` | `hrm.lifecycle.manage` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Talent Acquisition | `/recruitment`, `/recruitment-dashboard`, `/campus-hiring` | `hrm.recruitment.manage` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` |

---

### Panel 4: Manager & Team Lead Panel
* **Shell Route:** `src/routes/_authenticated/_app/route.tsx`
* **Authorized Roles:** `manager`, `hr_admin`, `admin`, `Workspace Admin`, `super_admin`
* **Access Boundary:**
  - Scoped strictly to direct reports (`Employee.managerId == currentEmployee.id`) or department members.
  - Can approve subordinate leave, shift swap requests, overtime claims, and review project task boards.

| Feature / Page | Frontend Route | Key Permission | Authorized Roles | Data Scope |
|---|---|---|---|---|
| Team Task Board | `/tasks`, `/task-board`, `/projects` | `project.tasks.manage` | `manager`, `hr_admin`, `admin` | Department / Project Team |
| Subordinate Leave Approval | `/leave` (Approval Tab) | `hrm.leave.approve` | `manager`, `hr_admin`, `admin` | Direct Reports Only |
| Subordinate Overtime Approval | `/overtime` | `hrm.overtime.approve` | `manager`, `hr_admin`, `admin` | Direct Reports Only |
| Shift Swap Approvals | `/shift-swap-requests` | `hrm.shifts.approve` | `manager`, `hr_admin`, `admin` | Direct Reports Only |
| Team Performance Appraisals | `/performance-appraisal`, `/performance-indicator`, `/performance-review`, `/okr` | `hrm.performance.manage` | `manager`, `hr_admin`, `admin` | Department Subordinates |

---

### Panel 5: Employee Self-Service (ESS) Panel
* **Shell Route:** `src/routes/_authenticated/_app/route.tsx` (Triggered via `isEmployeeOnly` sidebar mode)
* **Authorized Roles:** `employee` (and all authenticated tenant workers)
* **Access Boundary:**
  - Strictly scoped to the authenticated employee (`where: { employeeId: req.user.employeeId }` or `where: { userId: req.user.userId }`).
  - Employees CANNOT view other employees' salaries, leaves, biometric punches, or disciplinary warnings.

| Feature / Page | Frontend Route | Purpose | Authorized Roles | Data Scope |
|---|---|---|---|---|
| Employee Dashboard | `/employee-dashboard` | Personal KPI and schedule overview | All Employee Users | Self (`req.user.employeeId`) |
| Attendance & Punching | `/attendance` | Punch-in / punch-out and personal punch history | All Employee Users | Self Only |
| Monthly Attendance Matrix | `/attendance-employee` | View monthly personal calendar attendance | All Employee Users | Self Only |
| My Leave Requests | `/leave` | Apply for personal leaves and check balance | All Employee Users | Self Only |
| My Shifts & Rosters | `/shifts` | View assigned work shifts | All Employee Users | Self Only |
| Shift Swap Requests | `/shift-swap-requests` | Request shift swap with peer | All Employee Users | Self Only |
| Overtime Claims | `/overtime` | Log extra hours worked | All Employee Users | Self Only |
| Work From Home (WFH) | `/work-from-home` | Submit WFH application | All Employee Users | Self Only |
| My Payslips | `/payroll` | View & download personal pay slips | All Employee Users | Self Only |
| My Expense Claims | `/expenses` | Submit travel/reimbursement claim | All Employee Users | Self Only |
| Personal Documents | `/documents` | View contracts, upload KYC | All Employee Users | Self Only |
| Learning & Academy | `/training` | View enrolled courses and certificates | All Employee Users | Self Only |
| Helpdesk Tickets | `/helpdesk` | Raise support ticket to HR/IT | All Employee Users | Self Only |
| Personal Notes & Tasks | `/notes`, `/todo`, `/calendar` | Personal productivity tools | All Employee Users | Self (`req.user.userId`) |

---

### Panel 6: Finance & Payroll Panel
* **Shell Route:** `src/routes/_authenticated/_app/route.tsx`
* **Authorized Roles:** `finance_admin`, `payroll_manager`, `admin`, `Workspace Admin`, `super_admin`
* **Access Boundary:**
  - Confidential financial and remuneration records.
  - Employees without finance/payroll role must NEVER access these routes.

| Feature / Page | Frontend Route | Key Permission | Authorized Roles |
|---|---|---|---|
| Finance Dashboard | `/finance-dashboard` | `finance.dashboard.view` | `finance_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Payroll Processing Center | `/payroll`, `/payroll-dashboard` | `finance.payroll.manage` | `payroll_manager`, `admin`, `Workspace Admin`, `super_admin` |
| Bank Disbursement | `/payroll` (Disbursement Tab) | `finance.disbursement.execute` | `payroll_manager`, `finance_admin`, `admin`, `super_admin` |
| Statutory Returns (EPF/ESIC) | `/payroll` (Statutory Tab), `/provident-fund` | `finance.statutory.file` | `payroll_manager`, `finance_admin`, `admin`, `super_admin` |
| General Ledger & Accounting | `/accounting`, `/budgets`, `/currencies`, `/taxes` | `finance.accounting.manage` | `finance_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Invoicing & Billing | `/invoices`, `/recurring-invoices`, `/invoice.$id`, `/invoice.create` | `finance.invoices.manage` | `finance_admin`, `admin`, `Workspace Admin`, `super_admin` |
| Expense Approval | `/expenses`, `/expenses-report` | `finance.expenses.approve` | `finance_admin`, `payroll_manager`, `admin`, `super_admin` |

---

### Panel 7: Client & B2B Customer Portal
* **Shell Route:** `src/routes/_authenticated/client/*`, `/portal/*`
* **Authorized Roles:** `client`, `admin`, `super_admin`
* **Access Boundary:**
  - Dedicated external customer view.
  - Can only see invoices, contracts, and tasks specifically assigned to `clientId`.

---

### Panel 8: Public, Marketing & Authentication
* **Shell Route:** Root public router (`src/routes/*`)
* **Authorized Roles:** Public / Unauthenticated / Any Visitor
* **Routes:** `/`, `/about`, `/careers`, `/contact`, `/pricing`, `/login`, `/auth`, `/super-login`, `/verify-2fa`, `/store`, `/docs`, `/help-center`, `/lock-screen`, `/session-expired`, `/403`, `/404`, `/500`.
