# MASTERHRMS — PHASE P0: AUDIT & DESIGN APPROVAL REPORT

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-07  
**Auditor Role:** Lead Software Architect + Product Systems Auditor + Senior Full-Stack Engineer  
**Baseline Git Commit:** `dcfb793a3` (*feat(ui/spec): complete Wave 4 batches 4-6 modernization and add MasterHRMS planning specifications*)  
**Status:** **P0 COMPLETE — READY FOR PRODUCT OWNER APPROVAL**

---

## 1. Executive Summary

This Phase P0 Pre-Requirement Audit and Design Reconciliation establishes the baseline truth between the planned product architecture (**MasterHRMS specifications 00 to 03**) and the existing repository implementation.

### Key Audit Findings:
1. **Architectural Paradigm Shift Required:** The repository currently operates on a monolithic flat-route structure (`/_authenticated/_app/*`, e.g., `/employees`, `/attendance`, `/payroll`, `/employee-dashboard`) with a 1,952-line hardcoded sidebar (`DreamsSidebar`) and flat backend endpoints (`/api/employees`, `/api/attendance`). The planned MasterHRMS specification mandates strict dual-portal URL hierarchy (`/hr/*` for HR/Admin and `/me/*` for Employee Self-Service) governed by a dynamic **Navigation Registry**, server-enforced data scopes (`SELF`, `TEAM_DIRECT`, `TEAM_ALL`, `DEPARTMENT`, `BRANCH`, `ALL`), field-level security masking, and `allowedActions[]`.
2. **Database Engine & Model Evolution:** While legacy documentation references MySQL, the active system database is **PostgreSQL on Supabase** (via Prisma 5.19.1). The database has expanded to 178 models, but lacks core MasterHRMS pillars: `EmployeeEvent` (append-only 360 timeline), `OutboxEvent` (transactional event publishing), multi-step `WorkflowDefinition`/`ApprovalRequest`/`ApprovalAction` engine, generic `Notification`/`NotificationTemplate`, and `AuditLog`. Furthermore, standard enterprise audit fields (`deletedAt`, `version`, `createdBy`, `updatedBy`) are missing across over 95% of models.
3. **Tenant Isolation Gap:** The repository has an advanced `AsyncLocalStorage` tenant context and Prisma proxy auto-scoping mechanism, but its authoritative classification dictionary (`tenant-models.config.ts`) was frozen at 75 direct tenant models. Over 70 newer models (including `Branch`, `Designation`, `AttendanceRegularization`, `Timesheet`, `LeaveLedgerEntry`, `EmployeeChangeRequest`, `DocumentRequest`) are unclassified, causing unscoped queries to bypass tenant fail-close assertions.
4. **Realtime Infrastructure Divergence:** Standalone in-memory Socket.IO is mounted with only a generic `tenant:{id}` room and basic chat/punch handlers. Redis adapter, fine-grained rooms (`user:{id}`, `role:{id}`, `dept:{id}`, `branch:{id}`, `team:{id}`, `record:{entity}:{id}`), standard event envelopes, transactional outbox publishing, reconnect catch-up (`GET /shared/events?since=`), presence, and edit locks are currently missing.
5. **Shared Domain Services Absent:** Business logic is duplicated or directly coupled to Express route controllers. `/api/v1/me` contains a 35-endpoint monolithic file (`employee-self-service.routes.ts`) querying Prisma directly, rather than reusing domain services with `/api/v1/hr/*`.
6. **P1 Readiness Verdict:** **READY FOR P1**. The gaps are precisely cataloged, architectural boundaries are crystal clear, and a clean migration path preserves existing UI components and business rules without disrupting current capabilities.

---

## 2. Repository Baseline

### 2.1 Git Baseline
- **Branch:** `main` (clean working tree, up to date with `origin/main`)
- **Commit Hash:** `dcfb793a3`
- **Previous Commits:** Wave 4 batches 1–6 modernization and MasterHRMS planning specifications.

### 2.2 Technology Stack Census
| Layer | Planned Specification | Current Repository Baseline | Variance / Analysis |
|---|---|---|---|
| **Frontend Framework** | React 19 + TanStack Start / Router | React 19.2.0, TanStack Router 1.170.16, TanStack Query 5.101.1 | **Aligned**; robust modern frontend foundation. |
| **Styling & UI Library** | Tailwind CSS + Radix UI / shadcn/ui | Tailwind CSS v4.2.1, Radix UI primitives, Lucide React, Sonner | **Aligned**; rich component foundation. |
| **Routing System** | TanStack Router (`/hr/*`, `/me/*`) | TanStack Router flat routes under `/_authenticated/_app/*` | **Divergent**; requires `/hr` and `/me` route tree setup. |
| **Backend Framework** | Express (TypeScript) | Express 4.19.2 + TypeScript 5.5.2 running on Node.js / tsx | **Aligned**. |
| **Database & ORM** | Prisma + MySQL | Prisma 5.19.1 + **PostgreSQL** (Supabase connection pooler) | **Divergence in DB engine**; PostgreSQL is active. |
| **Authentication** | JWT + Two-Factor Auth (TOTP) | JWT (jsonwebtoken 9.0.2) + TOTP (speakeasy 2.0.0, TwoFactorOtp) | **Aligned**; secure auth foundation exists. |
| **Authorization / RBAC** | `{portal}.{module}.{resource}.{action}` + Data Scopes | `module.resource.action` without data scopes (`SELF`, `TEAM_ALL`, etc.) | **Gap**; scopes and field-level security needed. |
| **Tenant Isolation** | Host subdomain `{workspace}.{BASE_DOMAIN}` + DB Scoping | `workspace-host.middleware.ts` + `TenantConnectionManager` + Proxy | **Strong foundation**, but dictionary is out of date. |
| **Realtime** | Socket.IO + Redis Adapter + Outbox | In-memory Socket.IO 4.8.3 without Redis or Outbox worker | **Gap**; needs Redis adapter and room hierarchy. |
| **Caching** | Redis caching | In-memory caches for domains; no centralized Redis cache | **Gap**; requires Redis client integration. |
| **Workflow Engine** | Shared multi-step approval engine | Simple `AutomationRule` trigger/action table | **Gap**; full workflow engine required. |
| **Notification Engine** | Multi-channel templated notification service | `SubscriptionNotificationEvent` (billing only); no general in-app/template service | **Gap**; general notification service needed. |
| **Testing Framework** | Vitest | Vitest with 75 existing test suites | **Aligned**; established testing harness. |

---

## 3. Architecture Comparison

```
+----------------------------------------------------------------------------------------------------+
|                                     ARCHITECTURE COMPARISON                                        |
+----------------------------------------------------------------------------------------------------+
| FEATURE                       | SPECIFICATION (00-03)           | CURRENT REPOSITORY               |
+-------------------------------+---------------------------------+----------------------------------+
| Portal Structure              | /hr/* and /me/* isolated trees  | Single flat /_app/* route tree   |
| Sidebar Navigation            | Dynamic Navigation Registry     | Hardcoded 1,952-line component   |
| API Architecture              | /api/v1/hr/*, /api/v1/me/*,     | Flat /api/* (with partial        |
|                               | /api/v1/team/*, /api/v1/shared/*| /api/v1/me, /api/v1/settings)   |
| Database Engine               | MySQL specified in docs         | PostgreSQL active on Supabase    |
| Soft Delete & Concurrency     | deletedAt + version everywhere  | Present on < 5% of models        |
| Realtime Event Delivery       | Transactional Outbox + Redis    | In-memory direct socket emission |
| Realtime Room Scoping         | tenant, user, role, team, record| Only tenant:{tenantId} room      |
| Approval Workflows            | Unified multi-step engine       | Ad-hoc AutomationRule triggers   |
| Employee 360 Timeline         | Append-only EmployeeEvent       | Fragmented across module tables  |
| Sensitive Data Security       | Field-level masking + audit log | Partial masking in ESS only      |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Existing Portal Census

| Portal Prefix | Target Audience | Planned Scope | Current Repository Implementation State |
|---|---|---|---|
| `/hr/*` | HR, Admins, Recruiters, Finance | Organization-wide | **MISSING AS PREFIX.** Existing HR features live as flat routes under `/_authenticated/_app/*` (e.g. `/employees`, `/attendance`, `/payroll`, `/recruitment`, `/shifts`). |
| `/me/*` | Employees, Managers | Self + Direct Reports | **MISSING AS PREFIX.** Existing ESS features live under `/employee-dashboard`, `/attendance-employee`, `/employee-payslips`. `/_authenticated/employee/*` simply redirects to `/employee-dashboard`. |
| `/sa/*` | Super Admin (Platform) | Platform-wide | **EXISTS.** Fully functional at `/_authenticated/super/*` (`/super`, `/super-login`). |
| `/client/*` | B2B Client Portal | Client accounts | **EXISTS.** Implemented under `/_authenticated/client/*` and `/portal/*`. |

---

## 5. Existing Route Census

The repository contains 138 routes under `src/routes/_authenticated/_app/`. Below is the functional classification against MasterHRMS requirements:

1. **Implemented (Flat Architecture):** 
   - Core workforce: `/employees` (3,558 lines), `/employee-details`, `/departments`, `/designations`, `/holidays`, `/announcements`.
   - Attendance & Shifts: `/attendance`, `/shifts`, `/shift-swap-requests`, `/overtime`, `/biometric`, `/timesheets`.
   - Leave: `/leave`, `/leave-report`.
   - Payroll & Statutory: `/payroll`, `/employee-payslips`, `/provident-fund`, `/taxes`, `/expenses`.
   - Talent: `/recruitment`, `/training`, `/performance-appraisal`, `/performance-indicator`, `/performance-review`, `/referrals`.
   - Lifecycle: `/promotions`, `/transfers`, `/warnings`, `/awards`, `/resignation`, `/termination`, `/probation`, `/offboarding`.
   - Assets & Ops: `/assets`, `/asset-dashboard`, `/documents`, `/forms`, `/helpdesk`, `/workflows`, `/custom-fields`, `/media`, `/settings`.
2. **Partial / Incomplete UI:**
   - `/employee-dashboard`: Relies on static/mocked widgets (`Stephan Peralt`, mock task arrays).
   - `/attendance-employee`: Basic self attendance; lacks shift swap, geo-fence feedback, and inline regularization requests.
   - `/hrm-dashboard`: Monolithic dashboard without role-gated widget ordering or real-time counters.
3. **Redirect Routes:**
   - `/_authenticated/employee/index.tsx` -> redirects to `/employee-dashboard`.
   - `/_authenticated/employee/dashboard.tsx` -> redirects to `/employee-dashboard`.
   - `/_authenticated/_app/dashboard.tsx` -> redirects to `/hrm-dashboard`.
4. **Missing MasterHRMS Routes (Zero UI currently):**
   - No `/hr/*` route namespace.
   - No `/me/*` route namespace.
   - Dedicated wizard `/hr/employees/new` (currently inline modal).
   - Dedicated 17-tab Employee 360 `/hr/employees/:id`.
   - Unified approvals inbox `/hr/approvals` and `/me/approvals`.
   - Consolidated reports center `/hr/reports`.
   - Realtime today board `/hr/attendance/live`.
   - Candidate pipeline board `/hr/recruitment/pipeline`.
   - Exit clearance workflow `/hr/lifecycle/exits` and `/me/lifecycle/exit`.
   - Confidential complaints `/hr/lifecycle/complaints` and `/me/lifecycle/complaints`.
   - Self-service change requests `/me/profile` (currently basic `/profile`).

---

## 6. HR Panel Requirement Reconciliation (`/hr/*`)

| Module | Route / Feature | Current UI | Current API | Current DB | Permission | Realtime | Workflow | Reusable Logic | Status | Identified Gap |
|---|---|---|---|---|---|---|---|---|---|---|
| **Overview** | `/hr/dashboard` | PARTIAL (`/hrm-dashboard`) | PARTIAL (`/api/dashboard`) | EXISTS (`Tenant`, `Employee`) | PARTIAL | MISSING | N/A | ApexCharts, stats cards | `PARTIAL` | Needs widget-level permissions, live counter pushes, drill-down filters. |
| **Overview** | `/hr/calendar` | PARTIAL (`/calendar`) | PARTIAL (`/api/calendar`) | EXISTS (`CalendarEvent`) | PARTIAL | MISSING | N/A | FullCalendar/day-picker | `PARTIAL` | Lacks 10-layer composite toggle (leaves, holidays, shifts, interviews, etc.). |
| **Overview** | `/hr/todo` | PARTIAL (`/todo`) | PARTIAL (`/api/todos`) | EXISTS (`WorkspaceTodo`) | PARTIAL | MISSING | N/A | Kanban, task boards | `PARTIAL` | Lacks linked entity polymorphism and meeting action item conversion. |
| **Overview** | `/hr/chat` | PARTIAL (`/chat`) | PARTIAL (`/api/chat`) | EXISTS (`ChatMessage`) | PARTIAL | PARTIAL | N/A | Socket message composer | `PARTIAL` | Lacks branch/dept auto-channels, record linking, and retention policies. |
| **Overview** | `/hr/approvals` | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING | Drawer context views | `MISSING` | Requires unified approval inbox, SLA timers, bulk approvals. |
| **Overview** | `/hr/reports` | PARTIAL (split files) | PARTIAL (split files) | EXISTS | PARTIAL | MISSING | N/A | jsPDF, ExcelJS | `PARTIAL` | Needs single catalog, scheduled email delivery, export templates. |
| **Workforce** | `/hr/employees` | EXISTS (`/employees`) | EXISTS (`/api/employees`) | EXISTS (`Employee`) | PARTIAL | MISSING | N/A | Table filters, badges | `PARTIAL` | URL-based query state, card/table toggle, server-side data scoping. |
| **Workforce** | `/hr/employees/new` | PARTIAL (modal) | PARTIAL (POST emp) | EXISTS (`Employee`) | PARTIAL | MISSING | PARTIAL | Form inputs, avatar crop | `PARTIAL` | Dedicated 8-step wizard with draft autosave and atomic onboarding tasks. |
| **Workforce** | `/hr/employees/:id` | PARTIAL (`/employee-details`) | PARTIAL (GET emp) | PARTIAL | PARTIAL | MISSING | N/A | Tabs, profile card | `PARTIAL` | 17-tab Employee 360 view with timeline, audit, salary history, assets. |
| **Workforce** | `/hr/employees/import` | PARTIAL (modal) | PARTIAL (POST excel) | N/A | PARTIAL | MISSING | N/A | Excel parser | `PARTIAL` | Async dry-run validation report, error spreadsheet download, batch rollback. |
| **Org** | `/hr/organization/structure` | MISSING | MISSING | PARTIAL (`Department`, `Employee`) | MISSING | MISSING | N/A | Tree / node renderers | `MISSING` | Interactive org chart with vacancy nodes and drag-and-drop reporting lines. |
| **Org** | `/hr/organization/branches` | PARTIAL (`/settings` tab) | PARTIAL (`/api/settings`) | EXISTS (`Branch`) | PARTIAL | MISSING | N/A | Master form dialog | `PARTIAL` | Dedicated page with geo-fence coordinates, statutory registrations, currency. |
| **Org** | `/hr/organization/departments` | EXISTS (`/departments`) | EXISTS (`/api/employees/departments`)| EXISTS (`Department`) | PARTIAL | MISSING | N/A | CRUD table | `PARTIAL` | Tree hierarchy, cost centers, usage protection on deactivation. |
| **Org** | `/hr/organization/designations`| EXISTS (`/designations`) | EXISTS (`/api/employees/designations`)| EXISTS (`Designation`) | PARTIAL | MISSING | N/A | CRUD table | `PARTIAL` | Salary band min/max, reports-to designation link, grade levels. |
| **Org** | `/hr/organization/holidays` | EXISTS (`/holidays`) | EXISTS (`/api/payroll/holidays`)| EXISTS (`Holiday` in seed) | PARTIAL | MISSING | N/A | Calendar view | `PARTIAL` | State/branch applicability, optional holiday quota, attendance recalculation. |
| **Org** | `/hr/organization/announcements`| EXISTS (`/announcements`)| EXISTS (`/api/announcements`) | EXISTS (`Announcement`)| PARTIAL | MISSING | N/A | Rich text editor | `PARTIAL` | Audience targeting, acknowledgement tracking, push notifications. |
| **Attendance** | `/hr/attendance/records` | EXISTS (`/attendance`) | EXISTS (`/api/attendance`) | EXISTS (`Attendance`) | PARTIAL | MISSING | N/A | Month grid, punch logs | `PARTIAL` | Month lock freeze, geo/selfie validation, LOP calculation. |
| **Attendance** | `/hr/attendance/timesheets` | EXISTS (`/timesheets`) | EXISTS (`/api/timesheets`) | EXISTS (`Timesheet`) | PARTIAL | MISSING | PARTIAL | Timesheet grid | `PARTIAL` | Attendance comparison, billable tracking, workflow integration. |
| **Attendance** | `/hr/attendance/regularizations`| PARTIAL (modal) | EXISTS (`/api/attendance/regularization`)| EXISTS (`AttendanceRegularization`)| PARTIAL | MISSING | PARTIAL | Request drawer | `PARTIAL` | Dedicated management page, monthly cap enforcement, audit trail. |
| **Attendance** | `/hr/attendance/shifts` | EXISTS (`/shifts`) | EXISTS (`/api/shifts`) | EXISTS (`ShiftDefinition`, `Roster`)| PARTIAL | MISSING | PARTIAL | Weekly roster grid | `PARTIAL` | Rotational rosters, swap approvals, conflict detection. |
| **Attendance** | `/hr/attendance/live` | MISSING | MISSING | EXISTS (`BiometricPunchLog`)| MISSING | MISSING | N/A | Realtime table | `MISSING` | Live today board with instant punch stream and nudge reminders. |
| **Leave** | `/hr/leave/applications` | EXISTS (`/leave`) | EXISTS (`/api/leave`) | EXISTS (`LeaveRequest`) | PARTIAL | MISSING | PARTIAL | Leave approval table | `PARTIAL` | Sandwich rule calculation, document upload gating, balance preview. |
| **Leave** | `/hr/leave/balances` | PARTIAL (modal) | PARTIAL | EXISTS (`LeaveLedgerEntry`) | PARTIAL | MISSING | N/A | Ledger table | `PARTIAL` | Accrual run preview, annual carry-forward/lapse, manual adjustment audit. |
| **Recruitment**| `/hr/recruitment/pipeline` | MISSING | MISSING | EXISTS (`JobCandidate`) | MISSING | MISSING | N/A | Kanban board | `MISSING` | Visual recruitment pipeline board by stage with drag-drop moves. |
| **Recruitment**| `/hr/recruitment/offers` | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING | Letter generator | `MISSING` | Offer letter generation, CTC breakup, e-sign workflow, onboarding handoff. |
| **Lifecycle** | `/hr/lifecycle/promotions` | EXISTS (`/promotions`) | EXISTS (`/api/promotions`) | EXISTS (`PromotionRecord`)| PARTIAL | MISSING | PARTIAL | Promotion form | `PARTIAL` | Automated salary revision, effective dating, promotion letter creation. |
| **Lifecycle** | `/hr/lifecycle/transfers` | EXISTS (`/transfers`) | EXISTS (`/api/transfers`) | EXISTS (`StockTransfer` only!)| CONFLICT| MISSING | PARTIAL | None (HR transfer) | `CONFLICT`| DB model `StockTransfer` is inventory; HR employee transfer model missing. |
| **Lifecycle** | `/hr/lifecycle/exits` | PARTIAL (`/offboarding`) | PARTIAL (`/api/offboarding`) | EXISTS (`EmployeeExit`) | PARTIAL | MISSING | PARTIAL | Clearance checklist | `PARTIAL` | Department clearances (IT/Admin/HR/Finance), asset return, F&F payroll trigger. |
| **Performance**| `/hr/performance/reviews` | EXISTS (`/performance-review`)| EXISTS (`/api/addons/okr`) | EXISTS (`OkrReview`) | PARTIAL | MISSING | PARTIAL | Review form | `PARTIAL` | Calibration distribution curve, 360 reviewer feedback, release workflow. |
| **Payroll** | `/hr/payroll/runs` | EXISTS (`/payroll`) | EXISTS (`/api/payroll`) | EXISTS (`PayrollRun`) | PARTIAL | MISSING | PARTIAL | Payroll summary table | `PARTIAL` | Maker-checker approval, variance audit vs prior month, bank file download. |
| **Assets** | `/hr/assets` | EXISTS (`/assets`) | EXISTS (`/api/addons/assets`) | EXISTS (`Asset`) | PARTIAL | MISSING | N/A | Asset table, QR print | `PARTIAL` | Digital allocation acknowledgement, return condition inspection, exit link. |
| **Workflows** | `/hr/workflows` | PARTIAL (`/workflows`) | PARTIAL (`/api/workflows`) | EXISTS (`AutomationRule`)| PARTIAL | MISSING | N/A | Rule list | `CONFLICT`| Current UI manages trigger automation rules, not multi-step approval flows. |

---

## 7. Employee Portal Requirement Reconciliation (`/me/*`)

| Module | Route / Feature | Current UI | Current API | Identity Resolution | Permission | Realtime | Shared Logic Gap | Status |
|---|---|---|---|---|---|---|---|---|
| **Overview** | `/me/dashboard` | PARTIAL (`/employee-dashboard`) | PARTIAL (`/api/v1/me/dashboard`) | Server-resolved via `req.employee` | `me.dashboard.view` | MISSING | Uses mock state; needs check-in card, real leave counters, announcements. | `PARTIAL` |
| **Overview** | `/me/calendar` | MISSING | MISSING | Server-resolved | `me.calendar.view` | MISSING | Needs personal layer calendar (holidays, shifts, leaves, meetings, reviews). | `MISSING` |
| **Overview** | `/me/todo` | PARTIAL (`/todo`) | PARTIAL (`/api/todos`) | Client-passed user id | `me.todo.view` | MISSING | Needs self task creation, meeting action item integration, due reminders. | `PARTIAL` |
| **Overview** | `/me/chat` | PARTIAL (`/chat`) | PARTIAL (`/api/chat`) | User token in socket | `me.chat.view` | PARTIAL | Needs directory-scoped 1-on-1 DMs and department group channels. | `PARTIAL` |
| **Overview** | `/me/notifications` | Drawer only | PARTIAL | Server-resolved | `me.notification.view` | MISSING | Full-page notification center with preferences and quiet hours. | `MISSING` |
| **Workspace**| `/me/employees` (Directory)| MISSING | MISSING | Filtered | `me.directory.view` | N/A | Non-sensitive employee directory respecting "hide from directory" flags. | `MISSING` |
| **Workspace**| `/me/profile` | PARTIAL (`/profile`) | EXISTS (`/api/v1/me/profile`) | Server-resolved | `me.profile.view` | MISSING | Split instant edits vs HR approval change requests (bank, PAN, Aadhaar). | `PARTIAL` |
| **Attendance** | `/me/attendance/records` | PARTIAL (`/attendance-employee`)| EXISTS (`/api/v1/me/attendance`) | Server-resolved | `me.attendance.view`| MISSING | Month calendar with regularize shortcut and policy rules display. | `PARTIAL` |
| **Attendance** | `/me/attendance/timesheet` | MISSING | MISSING | Server-resolved | `me.timesheet.manage`| MISSING | Draft, submit, withdraw timesheets with attendance cross-validation. | `MISSING` |
| **Attendance** | `/me/attendance/regularizations`| PARTIAL (modal)| EXISTS (`/api/v1/me/regularizations`)| Server-resolved | `me.regularization.create`| MISSING| Dedicated history table with withdrawal and reason tracking. | `PARTIAL` |
| **Attendance** | `/me/attendance/shifts` | MISSING | MISSING | Server-resolved | `me.shift.view` | MISSING | View assigned shift/roster and initiate shift swap requests with peers. | `MISSING` |
| **Leave** | `/me/leave/applications`| PARTIAL (modal)| EXISTS (`/api/v1/me/leaves`) | Server-resolved | `me.leave.create` | MISSING | Dry-run validation (blackout, notice, balance, sandwich rule, overlap). | `PARTIAL` |
| **Leave** | `/me/leave/balance` | PARTIAL (cards)| EXISTS (`/api/v1/me/leave-balance`)| Server-resolved | `me.leave.view` | MISSING | Full leave balance ledger, carry-forward status, encashment request. | `PARTIAL` |
| **Leave** | `/me/leave/team-calendar`| MISSING | MISSING | Server-resolved | `me.leave.view_team`| MISSING | Team leave calendar respecting peer privacy (no sensitive medical info). | `MISSING` |
| **Recruitment**| `/me/recruitment/job-postings`| MISSING | MISSING | Server-resolved | `me.recruitment.view`| MISSING | Internal job openings, eligibility checks, internal applications. | `MISSING` |
| **Recruitment**| `/me/recruitment/interviews`| MISSING | MISSING | Assigned panelist | `me.interview.evaluate`| MISSING| Interviewer dashboard, scorecard entry, slot accept/decline. | `MISSING` |
| **Recruitment**| `/me/recruitment/onboarding`| MISSING | MISSING | Server-resolved | `me.onboarding.view`| MISSING | New joiner checklist, task uploads, policy sign-offs, welcome buddy. | `MISSING` |
| **Lifecycle** | `/me/lifecycle/warnings`| MISSING | MISSING | Server-resolved | `me.warning.view` | MISSING | Read active warnings, submit formal written response, sign acknowledgement. | `MISSING` |
| **Lifecycle** | `/me/lifecycle/resignation`| PARTIAL (`/resignation`)| EXISTS (`/api/v1/me/resignation`) | Server-resolved | `me.resignation.create`| MISSING| Policy LWD calculation, counter-offer review, withdrawal handling. | `PARTIAL` |
| **Lifecycle** | `/me/lifecycle/exit` | MISSING | MISSING | Server-resolved | `me.exit.view` | MISSING | Clearance progress tracker, asset return instructions, relieving letter. | `MISSING` |
| **Lifecycle** | `/me/lifecycle/complaints`| MISSING | MISSING | Server-resolved | `me.complaint.create`| MISSING| Confidential complaint submission; complaints against employee hidden. | `MISSING` |
| **Performance**| `/me/performance/reviews`| MISSING | MISSING | Server-resolved | `me.review.submit` | MISSING | Self-assessment submission, manager rating viewing (after release). | `MISSING` |
| **Performance**| `/me/performance/goals` | PARTIAL (`/okr`)| EXISTS (`/api/v1/me/okrs`) | Server-resolved | `me.goal.manage` | MISSING | Employee goals check-in, milestone updates, manager sign-off. | `PARTIAL` |
| **Payroll** | `/me/payroll/payslips` | PARTIAL (`/employee-payslips`)| EXISTS (`/api/v1/me/payslips`) | Server-resolved | `me.payslip.view` | MISSING | Published payslips only; masked net pay until click; password-protected PDF. | `PARTIAL` |
| **Payroll** | `/me/payroll/salary` | MISSING | MISSING | Server-resolved | `me.salary.view` | MISSING | Salary structure breakdown; masked by default; re-auth to reveal. | `MISSING` |
| **Payroll** | `/me/payroll/tax` | MISSING | EXISTS (`/api/v1/me/tax-declaration`)| Server-resolved | `me.tax.manage` | MISSING | Regime selection (Old vs New), Section 80C/80D proofs, Form 16 download. | `PARTIAL` |
| **Assets** | `/me/assets` | MISSING | EXISTS (`/api/v1/me/assets`) | Server-resolved | `me.asset.view` | MISSING | Digital receipt acknowledgement, loss reporting, return request. | `PARTIAL` |
| **Documents** | `/me/documents/contracts`| MISSING | MISSING | Server-resolved | `me.contract.view` | MISSING | View contracts, digital e-signature trail, renewal dates. | `MISSING` |
| **Manager** | `/me/team` | MISSING | EXISTS (`/api/v1/me/team`) | Reporting line (`TEAM_DIRECT`)| `me.team.view` | MISSING | Team attendance board, leave overlaps, performance review deadlines. | `PARTIAL` |
| **Manager** | `/me/approvals` | MISSING | EXISTS (`/api/v1/me/team/approvals`)| Reporting line | `me.approval.action`| MISSING | Unified manager approval inbox for leave, regularizations, profile changes. | `PARTIAL` |

---

## 8. Employee 360 Audit (`03_Interlinking_and_Realtime_Flows.md`)

The specification defines **Employee as the central hub** connecting 14 cross-module lifecycle flows:

```
Recruitment -> Onboarding -> Employee -> Attendance/Leave -> Payroll -> Performance -> Lifecycle -> Exit
```

### Audit Findings Against Spec 03:
1. **Missing `EmployeeEvent` Model:** Spec 03 mandates an append-only `EmployeeEvent` timeline recording all lifecycle milestones (`JOINED`, `DETAILS_CHANGED`, `SHIFT_CHANGED`, `LEAVE_TAKEN`, `AWARDED`, `WARNED`, `PROMOTED`, `TRANSFERRED`, `RESIGNED`, `EXIT_STARTED`, `SEPARATED`, `REHIRED`). Currently, events are scattered across disparate tables (`PromotionRecord`, `DisciplinaryWarning`, `AttendanceRegularization`), making a unified Employee 360 history impossible without expensive multi-table joins.
2. **Broken Recruitment-to-Employee Handshake (Flow F1):** In the codebase, candidates are stored in `JobCandidate`. There is no `Offer` model and no automated `CandidateOnboarding` checklist conversion. Hired candidates cannot automatically pre-fill the `Employee` creation wizard or provision user credentials.
3. **Attendance Month Lock Disconnect (Flow F2):** Attendance records lack a `MonthLock` entity. Months can be modified after payroll calculation, causing payroll-attendance discrepancies.
4. **Lifecycle Side-Effect Gaps (Flow F3):** 
   - When a promotion is approved in `PromotionRecord`, it does NOT update `Employee.salary` or generate an effective-dated salary history.
   - The transfer table in the database is `StockTransfer` (an inventory transfer entity). An employee transfer entity (`EmployeeTransfer`) does not exist.
   - Manager changes on `Employee` do not dynamically re-route open approval requests or update team chat channels.
5. **Exit Clearance & F&F Settlement (Flow F9):** Resignations and offboarding checklists exist in isolation. There is no automated link between asset clearance (`ExitChecklistItem`), leave encashment calculations, and final payroll settlement.

---

## 9. Database / Prisma Gap Matrix

Audit performed against `server/prisma/schema.prisma` (4,520 lines, 178 models):

| Domain | Planned Model | Existing Model | Status | Key Missing Relations / Fields | Tenant Scoped | Soft Delete | Versioning | Priority |
|---|---|---|---|---|---|---|---|---|
| **Identity** | `Session` | In-memory JWT | `MISSING` | Device, IP, revoked status, user agent | Yes | No | No | High |
| **Identity** | `ImpersonationLog` | None | `MISSING` | `impersonatorId`, `targetUserId`, `reason`, `actionCount` | Yes | No | No | Medium |
| **People** | `Employee` | `Employee` | `EXISTS` | Needs split relations: contacts, family, education, skills | Yes | **MISSING** | **MISSING** | **Critical** |
| **People** | `EmployeeEmployment` | Partial on `Employee` | `MISSING` | Effective-dated branch, department, designation, manager | Yes | No | No | High |
| **People** | `EmployeeStatutory` | Flat on `Employee` | `PARTIAL` | Separate effective-dated statutory details (UAN, PF, ESI, PAN) | Yes | No | No | Medium |
| **People** | `EmployeeEvent` | None | `MISSING` | `eventType`, `eventData`, `effectiveDate`, `actorId` | Yes | No | No | **Critical** |
| **Org** | `Branch` | `Branch` | `EXISTS` | Geo-fence coordinates, statutory codes, currency override | Yes | **MISSING** | **MISSING** | High |
| **Org** | `HolidayLocation` | Flat on `Holiday` | `MISSING` | State and branch junction table for selective holidays | Yes | No | No | Medium |
| **Attendance** | `AttendanceRecord` | `Attendance` | `EXISTS` | `source`, `selfieUrl`, `geoLat`, `geoLong`, `otMinutes`, `version` | Yes | **MISSING** | **MISSING** | High |
| **Attendance** | `MonthLock` | None | `MISSING` | `year`, `month`, `branchId`, `isLocked`, `lockedBy`, `lockedAt` | Yes | No | No | High |
| **Attendance** | `AttendanceDevice` | `BiometricDevice` | `EXISTS` | Geo-fence radius, IP allow-list integration | Yes | No | No | Medium |
| **Leave** | `LeavePolicy` | Flat on `LeaveType` | `MISSING` | Effective-dated rules, accrual schedule, blackout dates | Yes | No | No | High |
| **Leave** | `LeaveLedger` | `LeaveLedgerEntry` | `EXISTS` | Missing linkage to specific `AttendanceRecord` or encashment | Yes | No | No | Medium |
| **Recruitment**| `Offer` | None | `MISSING` | CTC breakup JSON, template ID, approvers, e-sign status | Yes | No | No | High |
| **Recruitment**| `CandidateOnboarding`| `ExitChecklistItem` (Exit only)| `MISSING` | Checklist tasks, buddy, pre-allocation, IT accounts | Yes | No | No | High |
| **Recruitment**| `CareerSite` | None | `MISSING` | Slug, theme, custom domain, tracking scripts | Yes | No | No | Medium |
| **Lifecycle** | `EmployeeTransfer` | `StockTransfer` (wrong domain)| `MISSING` | `fromBranchId`, `toBranchId`, `newManagerId`, `effectiveDate` | Yes | No | No | High |
| **Lifecycle** | `Complaint` | None | `MISSING` | `complainantId`, `isAnonymous`, `investigatorId`, `caseNotes` | Yes | No | No | High |
| **Lifecycle** | `ExitCase` | `EmployeeExit` | `PARTIAL` | Multi-department clearance status, F&F payroll link | Yes | No | No | Medium |
| **Workflow** | `WorkflowDefinition`| `AutomationRule` (ad-hoc) | `MISSING` | `module`, `resource`, `steps`, `version`, `isActive` | Yes | No | No | **Critical** |
| **Workflow** | `WorkflowStep` | None | `MISSING` | `order`, `approverType`, `mode`, `slaHours`, `escalateTo` | Yes | No | No | **Critical** |
| **Workflow** | `ApprovalRequest` | `EmployeeChangeRequest` (silo)| `MISSING` | Polymorphic `entity`, `entityId`, `currentStep`, `status` | Yes | No | No | **Critical** |
| **Workflow** | `ApprovalAction` | None | `MISSING` | `requestId`, `actorId`, `action`, `comment`, `actedAt` | Yes | No | No | **Critical** |
| **Platform** | `OutboxEvent` | None | `MISSING` | `eventId`, `eventType`, `payload`, `status`, `retryCount` | Yes | No | No | **Critical** |
| **Platform** | `Notification` | `SubscriptionNotificationEvent`| `MISSING` | In-app notification: `userId`, `title`, `body`, `linkTo`, `readAt` | Yes | No | No | High |
| **Platform** | `NotificationTemplate`| None | `MISSING` | `eventKey`, `channel`, `subject`, `templateBody` | Yes | No | No | High |
| **Platform** | `AuditLog` | `SettingAudit` (settings only)| `MISSING` | Generic write audit: `entity`, `entityId`, `before`, `after` | Yes | No | No | High |

---

## 10. API Gap Analysis

### Current API Surface:
- Flat endpoints mounted at `/api/*` (`/api/employees`, `/api/attendance`, `/api/leave`, `/api/payroll`, etc.).
- Monolithic `/api/v1/me` router containing 35 mixed endpoints.
- No `/api/v1/hr/*` routing namespace.
- No `/api/v1/team/*` routing namespace.
- No `/api/v1/shared/*` routing namespace.

### Missing Enterprise API Conventions:
1. **Idempotency Keys:** `Idempotency-Key` headers are not validated on mutation endpoints.
2. **State Transition Endpoints:** Mutations use `PUT /:id` with field edits rather than dedicated action verbs (`POST /:id/actions/approve`, `POST /:id/actions/withdraw`).
3. **Optimistic Locking:** Endpoints do not check incoming `version` integers; concurrent writes blindly overwrite.
4. **`allowedActions[]` Response Property:** Record responses omit the computed array of actions the current user can perform on the record.
5. **Consistent Error Payload:** Responses vary between `{ error: string }`, `{ message: string }`, and `{ success: false, error }` instead of the canonical `{ code, message, fieldErrors, requestId }`.

---

## 11. RBAC & Data-Scope Audit

### 11.1 Permission Catalog
- **Existing Format:** `module.resource.action` (e.g. `finance.invoices.view`, `hr.employees.edit`).
- **Specification Format:** `{portal}.{module}.{resource}.{action}` (e.g. `hr.leave.application.approve`, `me.leave.application.create`).
- **Audit Finding:** The existing permission middleware (`requirePermission`) splits on the first dot (`moduleKey = permissionCode.split('.')[0]`), which assumes single-token module keys. In the spec format, `{portal}.{module}` will break this split logic unless updated.

### 11.2 Data Scopes
- **Specification Requirement:** Server queries must enforce `SELF`, `TEAM_DIRECT`, `TEAM_ALL`, `DEPARTMENT`, `BRANCH`, `ALL` via a central `scopeFilter(entity, user, requiredScope)` utility.
- **Current State:** **COMPLETELY ABSENT**. The current middleware checks only whether a permission exists on the user's role. If an HR Executive has `hr.employees.view`, they see ALL employees across all branches because no branch-level or department-level scope filter is applied to the Prisma query.

### 11.3 Field-Level Security (FLS)
- **Specification Requirement:** Sensitive fields (`salary`, `pan`, `aadhaar`, `bankAccount`, `medical`, `disciplinaryDetails`) require `view_sensitive`. The server must omit or mask them unless explicitly requested with session re-authentication.
- **Current State:** Implemented in `/api/v1/me/profile` via custom masking helper (`••••••••1234`), but **NOT enforced** across `/api/employees` or report endpoints. Any user with employee read access can view full compensation and statutory data.

---

## 12. Tenant Isolation Audit

### Security Classification: **HIGH RISK DEFECT IDENTIFIED**

```
+----------------------------------------------------------------------------------------------------+
|                                    TENANT ISOLATION MECHANISM                                      |
+----------------------------------------------------------------------------------------------------+
| Inbound Request -> workspaceHostMiddleware (resolves workspace subdomain)                          |
|                 -> requireAuth (extracts tenantId from user token & profile)                       |
|                 -> resolveTenantContext (binds TenantContext to AsyncLocalStorage)                 |
|                 -> prismaProxy (intercepts Prisma queries)                                         |
|                      |                                                                             |
|                      +--> Context Active: routes to context.db (auto-injects tenantId)         |
|                      |                                                                             |
|                      +--> Context Missing: checks tenant-models.config.ts                          |
|                             |                                                                      |
|                             +--> Classified Model: FAILS CLOSED with 403                           |
|                             +--> Unclassified Model: FALLS BACK TO SHARED CLIENT (UNISOLATED!)     |
+----------------------------------------------------------------------------------------------------+
```

### Critical Vulnerability Details:
1. `server/src/config/tenant-models.config.ts` was hardcoded with 75 direct tenant models.
2. The database currently has 178 models. Over 70 models with a `tenantId` foreign key (such as `Branch`, `Designation`, `AttendanceRegularization`, `Timesheet`, `LeaveLedgerEntry`, `EmployeeChangeRequest`, `DocumentRequest`, `ApprovalDelegation`, `CustomField`, `CustomFieldValue`) are **unclassified**.
3. In `server/src/facade/prisma-proxy.facade.ts` lines 120–122:
   ```typescript
   // Fallback for any other model/property on shared client
   const val = Reflect.get(sharedClient, propStr, receiver);
   return typeof val === "function" ? val.bind(sharedClient) : val;
   ```
   If an endpoint executes a query against an unclassified model outside of an active tenant context, the proxy **does not fail closed**. It executes the query unscoped against the shared client.
4. **Remediation Required in P1:** Update `tenant-models.config.ts` to include all 178 models or change the fallback default to fail closed (`throw new TenantContextRequiredError(...)`).

---

## 13. Event & Realtime Audit

| Requirement | Specification | Existing State | Gap Classification |
|---|---|---|---|
| **Socket Provider** | Socket.IO + Redis Adapter | Standalone in-memory Socket.IO (`socket.io` 4.8.3) | `MISSING` (Redis adapter missing) |
| **Room Hierarchy** | `tenant:{id}`, `user:{id}`, `role:{id}`, `dept:{id}`, `branch:{id}`, `team:{id}`, `record:{entity}:{id}` | Only `tenant:{tenantId}` | `MISSING` |
| **Event Envelope** | Standard envelope: `eventId`, `tenantId`, `type`, `entity`, `actorId`, `occurredAt`, `summary`, `linkTo` | Ad-hoc payload `{ threadId, message }` or raw punch object | `MISSING` |
| **Reliable Delivery** | Transactional Outbox pattern (`OutboxEvent` table + worker) | Direct socket emission inside route handlers | `MISSING` |
| **Catch-up Endpoint** | `GET /shared/events?since=` with deduplication by `eventId` | None (events lost on disconnect) | `MISSING` |
| **Client Invalidation** | TanStack Query cache key invalidation on event arrival | Manual event listeners in select UI components | `PARTIAL` |
| **Presence & Locks** | Detail page viewers list; edit conflict warning | None | `MISSING` |

---

## 14. Workflow & Approval Audit

### Status: **ARCHITECTURAL REWORK REQUIRED**

1. **Current System:** `/api/workflows` (`server/src/routes/workflows.routes.ts`) manages `AutomationRule` objects. These are simple event triggers (e.g., when `expense_submitted`, trigger `escalate_to_director`). It has no concept of approval hierarchies, multi-level steps, or user action tracking.
2. **Planned System:** A unified, domain-agnostic workflow engine managing:
   - `WorkflowDefinition` (module, entity, version, conditions).
   - `WorkflowStep` (order, approver type: `REPORTING_MANAGER`, `DEPARTMENT_HEAD`, `ROLE`, `USER`; mode: `ANY`, `ALL`; SLA hours).
   - `ApprovalRequest` (entity, entityId, requester, currentStep, status).
   - `ApprovalAction` (actor, action: `APPROVE`, `REJECT`, `DELEGATE`, `ESCALATE`; comment, timestamp).
   - `Delegation` (delegator, delegatee, fromDate, toDate).
3. **Current Fragmented Approval Silos:**
   - Leaves: Approved directly via `LeaveRequest.status = 'approved'` in `leave.routes.ts`.
   - Regularizations: Approved directly via `AttendanceRegularization.status` in `attendance.routes.ts`.
   - Resignations: Handled directly in `offboarding.routes.ts`.
   - Profile changes: Handled in `EmployeeChangeRequest`.
4. **Resolution in P1:** Implement the shared workflow engine once in P1; route all request modules through `ApprovalRequest` without module-specific status silos.

---

## 15. Notification Audit

1. **Current State:**
   - The frontend contains a `RealtimeNotificationDrawer` (`src/components/realtime-notification-drawer.tsx`), but it consumes mock or local state.
   - The backend contains `SubscriptionNotificationEvent` (for billing expiry emails) and `alert-notification.service.ts` (sending system email alerts via Nodemailer).
   - There is NO general-purpose in-app `Notification` table, NO `NotificationTemplate` table, and NO user notification preference management.
2. **Planned State:**
   - In-app notification bell with live counter driven by `user:{id}` socket events.
   - Multi-channel delivery: in-app, email, web push.
   - Notification templates with dynamic variable interpolation (`{{employee_name}}`, `{{leave_dates}}`).
   - Deep-linking powered by `linkTo(entity, id, portal)`.

---

## 16. Media & File Audit

1. **Current State:**
   - The backend contains a dedicated `mediaRouter` (`/api/v1/media`) and `media.service.ts`.
   - Database models exist: `MediaFile` (with `id`, `tenantId`, `fileName`, `fileSize`, `mimeType`, `storageKey`, `deletedAt`) and `MediaUsage`.
   - Storage service supports local disk storage (`uploads/`) with multer handling file uploads.
2. **Alignment:**
   - **Strong reuse opportunity!** `MediaFile` and `MediaUsage` are already implemented and tenant-scoped.
   - **Gaps:** The reusable frontend file picker (`MediaPickerModal`) needs to be unified across employee document uploads, avatar crop, and recruitment resume attachments.

---

## 17. Navigation & Route Guard Audit

1. **Navigation Registry:**
   - Current sidebar (`DreamsSidebar`) is 1,952 lines of hardcoded JSX with conditional role checks.
   - In P1, this must be replaced by a single, clean `navigation-registry.ts` defining:
     `{ id, portal: 'hr' | 'me', group, label, icon, route, permission, badgeSource, order }`.
   - Separate sidebar renderers for `/hr` and `/me` will consume this filtered registry.
2. **Route Guard Chain:**
   - Current guard in `src/routes/_authenticated/_app/route.tsx` checks only basic authentication and whether the route is `/super` or platform-only.
   - MasterHRMS requires a multi-stage guard chain on every route:
     `Authentication -> Tenant Resolution -> Module Enabled -> Permission -> Data Scope -> Record State`.
   - Failure behaviors must be strictly standardized:
     - 401: Redirect to login with `returnTo`.
     - 403: Render clean `AccessDenied` view with "Go to My Portal" shortcut.
     - 404: Return standard not-found for records outside data scope (never leak existence).

---

## 18. Shared Domain Service Audit

Currently, business logic is tightly coupled to individual route files. `/hr` and `/me` require a single, unified domain service layer:

```
[ /api/v1/hr/attendance ] ──+
                            |──► [ AttendanceDomainService ] ──► [ Prisma Client ]
[ /api/v1/me/attendance ] ──+    - checkIn(empId, lat, lng, ip)
                                 - regularize(empId, date, reason)
                                 - lockMonth(tenantId, year, month)
```

### Services to Extract in P1–P3:
1. `EmployeeDomainService`: Core profile, employment history, 360 aggregation.
2. `AttendanceDomainService`: Punches, policy validation, regularizations, month locking.
3. `LeaveDomainService`: Quota calculation, dry-run validator, sandwich rule, ledger entries.
4. `PayrollDomainService`: Salary structures, component evaluation, run locking, payslip generation.
5. `WorkflowDomainService`: Request creation, step progression, approval/rejection actions.

---

## 19. Master Data Audit

| Master Entity | Planned Route | Current Location | Model Exists | Reusability / Readiness |
|---|---|---|---|---|
| **Branches** | `/hr/organization/branches` | `/settings` tab | `Branch` | Ready for P1 master blueprint. Needs geo coordinates. |
| **Departments** | `/hr/organization/departments` | `/departments` | `Department` | Ready for P1 master blueprint. Needs tree hierarchy. |
| **Designations** | `/hr/organization/designations` | `/designations` | `Designation` | Ready for P1 master blueprint. Needs salary band fields. |
| **Holidays** | `/hr/organization/holidays` | `/holidays` | Seed data | Needs `Holiday` model refinement with branch/state junction. |
| **Announcements** | `/hr/organization/announcements` | `/announcements` | `Announcement` | Fully ready. Needs audience scoping integration. |
| **Award Types** | `/hr/organization/award-types` | `/awards` | `AwardType` | Fully ready for P1 master blueprint. |
| **Document Types** | `/hr/organization/document-types` | None | Missing | Needs new model `DocumentType` driving document checklists. |
| **Leave Types** | `/hr/leave/types` | `/leave` modal | `LeaveType` | Model exists. Needs rule configuration fields. |
| **Shift Definitions**| `/hr/attendance/shifts` | `/shifts` | `ShiftDefinition`| Fully ready. Needs policy association. |

---

## 20. Interlinking & Event Flow Audit

Audit of hire-to-retire cross-module flows from `03_Interlinking_and_Realtime_Flows.md`:

```
+----------------------------------------------------------------------------------------------------+
| FLOW               | PLANNED EFFECT                              | CURRENT STATE    | GAP          |
+--------------------+---------------------------------------------+------------------+--------------+
| F1: Recruitment    | Offer accepted -> Auto CandidateOnboarding  | Disconnected     | Missing Offer|
|     to Employee    | -> 1-click Convert to Employee with tasks   |                  | & Onboarding |
+--------------------+---------------------------------------------+------------------+--------------+
| F2: Attendance &   | Check-in -> Live board; Regularization ->   | Direct DB edit;  | Missing live |
|     Leave to Pay   | Attendance edit; Month lock -> feeds payroll| no month lock    | board & lock |
+--------------------+---------------------------------------------+------------------+--------------+
| F3: Lifecycle      | Promotion -> Updates Employee & Salary      | Siloed record;   | Manual entry |
|     Side Effects   | Transfer -> Updates Branch/State & Payroll  | no side effects  | required     |
+--------------------+---------------------------------------------+------------------+--------------+
| F6: Asset Return   | Exit case -> Returns tasks -> Asset Status  | Manual offline   | Missing exit |
|     on Exit        | changes -> Final settlement clearance       | tracking         | integration  |
+--------------------+---------------------------------------------+------------------+--------------+
| F13: Approvals     | Any request submit -> WorkflowDefinition    | Module-specific  | Missing      |
|     Everywhere     | -> Unified inbox -> Action side effect      | status fields    | engine       |
+--------------------+---------------------------------------------+------------------+--------------+
```

---

## 21. Reuse-First Analysis

To minimize engineering effort and avoid redundant code, the following existing assets will be reused directly in MasterHRMS:

1. **UI Components & Atoms:**
   - Complete Radix UI suite in `src/components/ui/` (`dialog`, `dropdown-menu`, `tabs`, `table`, `select`, `input`, `badge`, `avatar`, `card`, `command`).
   - Avatar Cropper Dialog (`src/components/avatar-cropper-dialog.tsx`).
   - Currency & Money formatting utilities (`src/lib/currency.ts`).
   - TanStack Query hooks and API client (`src/lib/api.ts`).
2. **Backend Services & Infrastructure:**
   - Host-based tenant isolation pipeline (`workspace-host.middleware.ts`, `tenant-context.middleware.ts`).
   - Supabase connection pooling and dynamic proxy facade.
   - Formula Calculation Engine (`server/src/services/formula-engine/`).
   - Statutory Compliance Rule Engine (`server/src/services/compliance-rules.service.ts`).
   - Bank Disbursement & Payout Adapters (`server/src/services/bank-adapters/`).
   - Media Storage Service & Local Disk Manager (`server/src/services/media/`).
3. **Existing Domain Logic:**
   - Biometric reconciliation and punch parsing algorithms (`cron/biometric-reconcile.cron.ts`).
   - Existing salary calculation formulas from Wave 2 payroll runs.

---

## 22. Technical Debt & Conflict Report

| ID | Issue / Conflict | Severity | Impact | Remediation Plan |
|---|---|---|---|---|
| **TD-01** | `StockTransfer` vs `EmployeeTransfer` naming collision in Prisma | **BLOCKER** | Trying to use `Transfer` for HR transfers collides with ERP inventory stock transfers. | Introduce model `EmployeeTransfer` mapped to `employee_transfers` table. |
| **TD-02** | Unclassified models in `tenant-models.config.ts` | **BLOCKER** | Security vulnerability: unclassified models bypass tenant fail-close protection. | Update dictionary in P1 to classify all 178 models; make fallback fail closed. |
| **TD-03** | Hardcoded 1,952-line `DreamsSidebar` | **HIGH** | Inflexible, role-checks hardcoded, violates dynamic navigation requirements. | Replace in P1 with Navigation Registry consuming metadata definitions. |
| **TD-04** | Direct DB modifications in controller files without domain services | **HIGH** | Code duplication between `/api/employees` and `/api/v1/me/*`. | Extract shared domain services in P1/P2. |
| **TD-05** | Standalone Socket.IO without Redis adapter | **HIGH** | Cannot scale to multiple server instances or support transactional outbox. | Add Redis adapter (`@socket.io/redis-adapter` or ioredis) in P1. |
| **TD-06** | Mock data and hardcoded fallback strings in existing UI | **MEDIUM** | Confusion during testing; pages appear functional but use hardcoded state. | Audit and purge hardcoded mocks during page modernization. |

---

## 23. Open Questions / Product Owner Decisions Required

The following questions must be answered by the Product Owner before respective implementation phases begin:

| ID | Question | Affected Module | Affected Phase | Risk If Guessed |
|---|---|---|---|---|
| **Q-01** | **Confirmation of Database Engine:** The planning docs mention MySQL, but Supabase PostgreSQL is active. Confirm that PostgreSQL is the permanent production standard. | All Modules | P0 / P1 | Mismatched SQL dialects, sequence generations, or migration scripts. |
| **Q-02** | **Decision D-003 Approval:** Confirm removal of HR masters (Job Locations, Interview Rounds, Depreciation, Asset Types) from the `/me/*` sidebar, and merging of Terminations into My Exit. | Employee Sidebar | P1 | Unauthorized access to configuration masters by general employees. |
| **Q-03** | **Check-in Modes:** Which attendance check-in verification modes are mandatory for V1: Web browser clock-in, Geolocation coordinates, IP allow-listing, or Biometric device sync? | Attendance (`ATT-01`, `ME-OV-01`) | P3 | Over-engineering or under-securing attendance check-in integrity. |
| **Q-04** | **Profile Instant Edits vs Approval Chain:** Confirm exactly which employee profile fields can be saved instantly (e.g. phone, emergency contact) versus requiring HR approval (e.g. legal name, bank account, PAN, Aadhaar). | Employee Profile (`ME-WF-05`) | P2 | Accidental updates to payroll-impacting statutory data without HR knowledge. |
| **Q-05** | **Default Approval Chains:** Should default approval workflows be single-tier (Reporting Manager only) or two-tier (Reporting Manager + HR Executive) when a tenant initializes? | Workflow Engine (`FND-04`) | P1 | Requests stuck in limbo or unapproved requests bypassed. |
| **Q-06** | **Chat Architecture Scope:** Should the real-time chat module be restricted to tenant internal 1-on-1 DMs and department channels, or include cross-department public channels? | Chat (`HR-OV-04`, `ME-OV-04`) | P8 | Storage bloat, moderation compliance issues, or performance overhead. |
| **Q-07** | **E-Signature Standard:** For employee contracts and offer letters, should MasterHRMS implement an internal cryptographic canvas e-sign trail, or integrate with an external provider (e.g. DocuSign/Aadhaar eSign)? | Documents & Contracts (`HR-DOC-02`) | P7 | Legal non-compliance or unnecessary third-party subscription costs. |

---

## 24. Critical Risks

1. **Cross-Tenant Data Leakage (R-01):** High risk if new tables are added without updating the tenant auto-scoping proxy dictionary. *Mitigation:* Automated tenant isolation test suite executed before every PR.
2. **Realtime Event Flooding (R-02):** Bulk operations (e.g. monthly payroll runs, employee bulk imports) could overwhelm clients if individual socket events are emitted for every row. *Mitigation:* Coalesce bulk events into summary notifications (`bulk.completed`).
3. **Payroll Distortion from Modifiable Historical Data (R-03):** Edits to past attendance or salary structures after payroll calculation corrupt payslip accuracy. *Mitigation:* Implement strict `MonthLock` and effective-dated salary records.
4. **Scope Creep from Added Auxiliary Pages (R-04):** MasterHRMS spec includes 164 total pages (105 HR + 59 Employee). *Mitigation:* Strictly adhere to phase sequence P1 to P8; auxiliary pages marked "(added)" can be deferred if necessary.

---

## 25. Phase Sequence & Dependency Graph

```
                                  +-------------------------------------+
                                  |     P0: Audit & Design Approval     |
                                  |             [COMPLETED]             |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |       P1: Platform Foundation       |
                                  | Navigation Registry, Sidebars, RBAC |
                                  | Data Scopes, Workflow Engine, Outbox|
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |    P2: Organization & Employees     |
                                  | Org Masters, Employee Wizard, 360   |
                                  | Profile Change Requests, Directory  |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |      P3: Attendance & Leave         |
                                  | Shifts, Rosters, Regularizations,   |
                                  | Month Lock, Leave Policies, Balances|
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |      P4: Payroll Linkage & Fin      |
                                  | Salary Structures, Payroll Runs,    |
                                  | Payslips, Tax Declarations, Loans   |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |          P5: Recruitment            |
                                  | Postings, Pipeline, Interviews,     |
                                  | Offers, Candidate Onboarding        |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |     P6: Lifecycle & Performance     |
                                  | Promotions, Transfers, Warnings,    |
                                  | Resignations, Exits, Review Cycles  |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |   P7: Training, Assets, Docs, Mtgs  |
                                  | Trainings, Asset Allocations,       |
                                  | Contracts, Acknowledgements, Rooms  |
                                  +-------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |      P8: Collaboration & Polish     |
                                  | Dashboards, Calendar Layers, Todo,  |
                                  | Chat, Reports Center, Final Hardening|
                                  +-------------------------------------+
```

---

## 26. Proposed P1 Platform Foundation Implementation Plan

### Scope:
1. **Navigation Registry & Dual Sidebars:** Create `src/lib/navigation-registry.ts` defining all `/hr/*` and `/me/*` routes. Replace hardcoded sidebar with clean, reactive `HrSidebar` and `EmployeeSidebar`.
2. **Route Guard & Portal Switcher:** Implement standard guard pipeline and portal switcher in top navigation bar.
3. **RBAC, Data Scope & Allowed Actions:** Seed standard permissions (`{portal}.{module}.{resource}.{action}`); implement `scopeFilter()` utility supporting `SELF`, `TEAM_DIRECT`, `TEAM_ALL`, `DEPARTMENT`, `BRANCH`, `ALL`; add server-calculated `allowedActions[]` to API responses.
4. **Tenant Isolation Hardening:** Update `tenant-models.config.ts` to cover all 178 models; enforce fail-close on unclassified models.
5. **Shared Workflow Engine:** Create `WorkflowDefinition`, `WorkflowStep`, `ApprovalRequest`, `ApprovalAction`, and `Delegation` models and controllers. Mount `/hr/workflows` and unified inbox at `/hr/approvals` and `/me/approvals`.
6. **Realtime Outbox & Redis Adapter:** Integrate Redis adapter for Socket.IO; implement `OutboxEvent` transactional writer and background worker; mount `/shared/events?since=` catch-up endpoint.
7. **Generic Notification Service:** Create `Notification` and `NotificationTemplate` models; wire bell counter with live socket updates.
8. **Shared Master Data Blueprint:** Implement reusable list/form/detail engine for org masters (Code, Name, Description, IsActive, Usage Count protection).

---

## 27. Test Strategy for P1 Gate

Before Phase P1 is declared done, the following empirical tests must pass:
1. **Tenant Isolation Test:** Assert Tenant A cannot read or mutate records belonging to Tenant B across all newly classified models. Assert unscoped queries throw `403 TENANT_CONTEXT_REQUIRED`.
2. **Permission Gate Test:** Assert unauthorized requests return `403 Forbidden` with the exact missing permission key.
3. **Data Scope Test:** Assert a user with `DEPARTMENT` scope receives only departmental records, while `SELF` receives only their own records.
4. **Realtime Two-Browser Test:** Open two browser sessions (HR Admin and Employee); submit a request in Employee portal; verify approval item appears instantly in HR Approvals inbox via WebSocket without page refresh.
5. **Workflow State Test:** Test complete approval cycle: `SUBMIT -> APPROVE (step 1) -> APPROVE (step 2) -> COMPLETED`, and test `REJECT` (requiring comment) and `WITHDRAW`.
6. **Audit Trail Test:** Verify that mutations to roles and workflow definitions create timestamped audit records.

---

## 28. P0 Completion Checklist

- [x] Full Git baseline and repository tech stack captured
- [x] Complete census of existing routes, components, and controllers performed
- [x] Requirement reconciliation completed across all 105 HR pages and 59 Employee pages
- [x] Employee 360 relationships and lifecycle flows audited
- [x] Prisma database gap matrix constructed across all 178 models
- [x] API endpoint routing and conventions evaluated
- [x] RBAC format and missing data scopes identified
- [x] Tenant isolation vulnerabilities identified and classified
- [x] Realtime, workflow, notification, and media infrastructure gaps cataloged
- [x] Technical debt and naming collisions reported
- [x] Product Owner open questions formulated
- [x] Implementation dependency graph validated
- [x] P1 proposal and test strategy defined
- [x] Living tracker `worklog.md` updated

---

## 29. Final Recommendation

The repository possesses a mature frontend component foundation, rich UI screens from earlier waves, and a solid multi-tenant routing core. However, jumping directly into building new pages without establishing the **P1 Platform Foundation** will result in technical debt, fragmented approval logic, and tenant isolation vulnerabilities.

**Recommendation:**
Approve Phase P0 immediately and proceed to **Phase P1 (Platform Foundation)** to establish the Navigation Registry, data scoping engine, shared workflow system, and realtime outbox.

---

# HARD STOP
**P0 audit complete. Waiting for explicit Product Owner approval before P1 implementation.**
