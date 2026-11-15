# MASTERHRMS — P3-A: Leave Encashment & Comp-Off Discovery Report

**Project:** MASTERHRMS (`Webfamily-06/masterhrms`)  
**Branch:** `main` (`HEAD` = `5b66dda3`)  
**Database:** Supabase PostgreSQL (`ofzbhbcnizyegroggkxl`, region `ap-south-1`)  
**Date:** 2026-11-15  

---

## 1. Git Working Tree & Repository Inspection

- **Current Branch:** `main` (`HEAD` at `5b66dda3`)
- **Tracked Working Tree Status:** Clean (`0` modified tracked files prior to P3-A implementation).
- **Pre-Existing Untracked Files Preserved Untouched:**
  - `scripts/capture-all-leave-screenshots.ts`
  - `scripts/inspect-database-chat.ts`
- **Safety Posture:** Zero destructive git or database commands executed. Existing Leave Management pages (`Leave Applications`, `Leave Balances`, `Leave Types`, `Leave Policies`) and Organization Tree functionality are preserved intact.

---

## 2. Live Supabase Schema & Persisted Data Audit

Live inspection against Supabase PostgreSQL (`ofzbhbcnizyegroggkxl`) confirmed a single authoritative Prisma schema at `server/prisma/schema.prisma` and the following live table state:

| Table | Live Row Count | Key Findings |
|---|---:|---|
| `tenants` | 265 | Multi-tenant isolation keyed by `tenant_id` across all HRM tables |
| `leave_types` | 30 | Includes `Compensatory Leave` (`code = 'COM'`), `Annual Leave` (`ANN`), `Sick Leave` (`SIC`), etc. |
| `leave_policies` | 11 | Tenant-scoped accrual, notice, carry-forward, min/max days, probation, sandwich, and half-day rules |
| `leave_requests` | 22 | Employee leave applications with `pending`, `approved`, `rejected`, `cancelled` states |
| `leave_ledger_entries` | 137 | Authoritative immutable ledger (`136 ACCRUAL`, `1 CREDIT`); columns: `id`, `tenant_id`, `employee_id`, `leave_type_id`, `entry_type VARCHAR(20)`, `days NUMERIC(5,2)`, `balance NUMERIC(5,2)`, `reference_id VARCHAR(36)`, `notes VARCHAR(255)`, `effective_at`, `created_at` |
| `leave_encashment_requests` | 0 | Existing table with 14 columns (`id`, `tenant_id`, `employee_id`, `leave_type_id`, `type`, `days`, `reason`, `status VARCHAR(20)`, `approver_id`, `approved_at`, `payroll_ref VARCHAR(50)`, `worked_on_date`, `created_at`, `updated_at`) and FKs to `tenants`, `employees`, `leave_types` |
| `overtime_requests` | 0 | Columns include `tenant_id`, `employee_id`, `date`, `hours`, `rate_multiplier`, `reason`, `status` (`pending` / `approved` / `rejected`), `approved_by` |
| `holidays` | 1 | Public/company holiday calendar scoped by `tenant_id` and `date` |
| `salary_components` | 10 | Active earning & deduction components (`BASIC`, `HRA`, `SPECIAL`, `CONVEYANCE`, `MEDICAL`, `OTHER_ALLOW`, `PF`, `ESI`, `PT`, `TDS`) |
| `salary_structures` | 3 | Includes dynamic `base_calculation_days` divisor per structure |
| `employee_salary_assignments` | 32 | Active employee compensation structures & `EmployeeSalaryItem` breakdowns |
| `payroll_runs` | 4 | Period-based runs with `month`, `year`, `status`, `approval_status`, `is_published`, `locked_at` |
| `payslips` | 125 | Per-employee itemized payroll outputs (`earningsBreakdown`, `deductionsBreakdown`, `grossSalary`, `netSalary`) |

---

## 3. Existing Backend Modules & Reusable Services

### 3.1 Leave Engine & Balance Ledger (`server/src/services/leave.service.ts`)
- **Authoritative Balance Engine:** `LeaveService` computes balances from `LeaveLedgerEntry` (`ACCRUAL`, `CARRY_FORWARD`, `CREDIT`, `DEBIT`, `ENCASHMENT`) plus active `pending` reservations.
- **Identified Ledger Gaps Requiring Safe Enhancement:**
  1. `LeaveService.computeLeaveTypeBalanceSummary` (`lines 310–362`) previously treated any `CREDIT` with a `referenceId` solely as a compensating reversal against `refDebits.get(referenceId)`, ignoring standalone earned `CREDIT` entries (such as approved Comp-Off credits referencing a Comp-Off request ID or `ENCASHMENT` reversal credits).
  2. `EXPIRY` ledger entries (`entryType = 'EXPIRY'`, within `VARCHAR(20)`) were not yet deducted in `computeLeaveTypeBalanceSummary`.
  3. Active non-ledgered encashment requests (`PENDING`, `MANAGER_APPROVED`, `HR_APPROVED`) were not yet reserved in `pending`, which could otherwise permit concurrent Leave Applications and Encashment Requests to overdraw the same balance.
  4. Comp-Off leave utilization in `validateDryRun`, `submitApplication`, `decideApplication`, and `cancelApplication` needed FIFO lot validation (preventing expired Comp-Off usage), `RESERVED` -> `CONSUMED` -> `RESTORED` lot tracking, and preservation of source Comp-Off credit references.

### 3.2 Existing Encashment/Comp-Off Route Stub (`server/src/routes/hr-leave.routes.ts:1920–2024`)
- Only two minimal endpoints existed (`GET /encashment-compoff` and `POST /encashment-compoff/:id/action`).
- Critical bug in existing stub: approving a `COMP_OFF` row wrote `entryType: "ENCASHMENT"` (debiting instead of crediting!).
- Missing: Configuration CRUD & versioning, eligibility & calculation engine, Comp-Off attendance/holiday/weekly-off/overtime verification, multi-stage manager/HR approval, payroll linkage/reconciliation/failure/reversal, Comp-Off credit/utilization/expiry automation, transaction history & export, and ESS (`/me/leave/...`) endpoints.

### 3.3 Payroll Calculation & Execution (`server/src/services/payroll-engine.service.ts`, `payroll-orchestrator.service.ts`, `hr-payroll.routes.ts`, `payroll.routes.ts`)
- `computeEmployeePayrollBreakdown` (`payroll-engine.service.ts:835–864, 978`) already accepts `options.leaveEncashment` and `options.encashmentDays`!
- Three payroll execution paths exist:
  1. `PayrollOrchestratorService` (`calculatePayroll` -> `submitForReview` -> `approvePayroll` -> `finalizePayroll` setting `status: "completed"`, `approvalStatus: "CLOSED"`).
  2. `hrPayrollRouter` (`POST /api/v1/hr/payroll/runs/:id/calculate` -> `approve` -> `publish` setting `approvalStatus: "finalized"`, `isPublished: true`).
  3. `payrollRouter` (`POST /api/payroll/generate` and run status updates).
- All three paths can cleanly consume scheduled encashment items (`APPROVED` / `PAYROLL_PENDING`) during run calculation (`-> PAYROLL_PROCESSING`) and transition them to `PAID` strictly upon verified payroll finalization/publish/disbursement.

### 3.4 Attendance, Holiday, Shift & Overtime Verification
- `Attendance` (`date`, `checkIn`, `checkOut`, `workHours`, `overtimeMins`, `status`), `Holiday` (`date`, `name`, `type`), `Shift` / `EmployeeShift` / `AttendancePolicy` (`workingDays` / weekend configuration), and `OvertimeRequest` (`date`, `hours`, `status = "approved"`) provide complete server-side evidence for Comp-Off claims.
- `AttendanceAutomationService.executeJob` (`server/src/services/attendance-automation.service.ts`) + `SystemCronJob` + `server/src/index.ts` background timers provide the established idempotent job scheduler for Comp-Off expiry & pre-expiry notifications.

### 3.5 Auth, RBAC, Notifications & Audit
- **Auth & Permissions (`server/src/middleware/auth.ts`):** `requireAuth`, `AuthenticatedRequest` (`tenantId`, `userId`, `roles`, `permissions`), and `requirePermission("hrm.leave.view" | "hrm.leave.create" | "hrm.leave.edit" | "hrm.leave.approve" | "hrm.payroll.view" | "hrm.payroll.manage")`.
- **Notifications (`server/src/services/notification.service.ts`):** `NotificationService.createNotification` persists in-app notifications and dispatches realtime events without exposing sensitive salary figures.
- **Audit Logging (`server/src/services/audit.service.ts`):** `AuditService.logMutation` records tenant, actor, entity, action, `oldState`, `newState`, IP, and metadata into `AuditLog`.

---

## 4. Dual-Frontend & ESS Inspection Findings

### 4.1 HR Leave Management Pages (4 Complete + 5th Minimal Stub)
Both Next.js CMS (`CMS/src/app/(workspace)/hr/leave/...`) and TanStack Start (`src/routes/_authenticated/hr/leave/...`) implement identical UI/UX conventions across the 4 existing pages:
1. **Leave Applications:** `CMS/src/app/(workspace)/hr/leave/applications/page.tsx` | `src/routes/_authenticated/hr/leave/applications.tsx`
2. **Leave Balances:** `CMS/src/app/(workspace)/hr/leave/balances/page.tsx` | `src/routes/_authenticated/hr/leave/balances.tsx`
3. **Leave Types:** `CMS/src/app/(workspace)/hr/leave/types/page.tsx` | `src/routes/_authenticated/hr/leave/types.tsx`
4. **Leave Policies:** `CMS/src/app/(workspace)/hr/leave/policies/page.tsx` | `src/routes/_authenticated/hr/leave/policies.tsx`
5. **Leave Encashment & Comp-Off (Existing 200-line Stub):** `CMS/src/app/(workspace)/hr/leave/encashment-compoff/page.tsx` | `src/routes/_authenticated/hr/leave/encashment-compoff.tsx`

### 4.2 Design System & Shared Frontend Utilities to Reuse
- **Primary Action Color:** `#00a76f` (`bg-[#00a76f] hover:bg-[#008f5d] text-white`), active filter/tab pills `border-[#00a76f] bg-emerald-50/50 text-[#00a76f]`, emerald status badges `bg-[#e8f7f0] border-[#a3e3c4] text-[#00a76f]`.
- **Card & Table Layout:** `bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs`, desktop `<Table>` (`hidden md:block`) paired with responsive mobile stacked cards (`md:hidden`).
- **Shared Helpers:** `CMS/src/lib/leave-helpers.ts` & `src/lib/leave-helpers.ts` (`useDebouncedValue`, `formatLeaveDays`, `extractLeaveErrorMessage`, `uploadLeaveSupportingDocument`, cross-portal React Query invalidation helpers) and `GlobalExportDropdown` / `export-utils.ts` (`exportToExcel`, `exportToPdf`).

### 4.3 Navigation Menu & Route Guard Findings
- **Critical Navigation Gap Found:** While `CMS/src/nav/hr-sidebar.ts` (`line 146`) listed `Encashment & Comp-off`, the unified `NAVIGATION_REGISTRY` (`src/lib/navigation-registry.ts:324–371` and `CMS/src/lib/navigation-registry.ts:324–371`), `nav/registry.ts`, `lib/routes.ts`, `lib/breadcrumb-registry.ts`, and `/hr/leave` overview hub only registered the first 4 Leave pages!
- **Route Guard Sync:** `CMS/src/lib/route-guards.ts:178` checked `hr.`, `employees.`, `attendance.` permissions for `targetPortal: "hr"` (missing `hrm.` and `payroll.`), whereas `src/lib/route-guards.ts:180` included `hrm.`. Both will be aligned to support HR Admin, HR Manager, Reporting Manager, and Payroll roles cleanly.
- **Employee Self-Service (`/me/leave/*` & `/me/approvals`):**
  - `/me/leave/applications` dynamically loads `GET /api/v1/me/leave/catalog` and validates via `POST /api/v1/me/leave/applications/dry-run`, so once Comp-Off is credited via `LeaveLedgerEntry` and validated by `LeaveService`, employees can immediately select Comp-Off in the existing Leave Applications page without any parallel leave system.
  - ESS lacks a dedicated `/me/leave/encashment-compoff` view (and balance/overview integration) for My Encashment Requests, My Comp-Off Requests, My Comp-Off Available Balance, Expiry Alerts, Approval Status, and Encashment Payroll Status, as well as direct-report Manager approval actions in `/me/approvals`.

---

## 5. Architectural Reuse vs. Additive Implementation Plan

| Capability | Reuse Existing | Additive Enhancement |
|---|---|---|
| Leave Balance & Ledger | `LeaveService` + `LeaveLedgerEntry` (`ACCRUAL`, `CREDIT`, `DEBIT`, `ENCASHMENT`) | Enhance `computeLeaveTypeBalanceSummary` for standalone Comp-Off `CREDIT`, `EXPIRY`, `ENCASHMENT` reversals, and pending encashment reservation |
| Database Models | `LeaveEncashmentRequest` (`0` existing rows), `LeaveType`, `Employee`, `Attendance`, `OvertimeRequest`, `Holiday`, `PayrollRun`, `Payslip`, `SalaryComponent`, `SalaryStructure`, `EmployeeSalaryAssignment`, `Notification`, `AuditLog` | Additive columns on `leave_encashment_requests` + 4 new tenant-scoped tables: `leave_encashment_configs`, `comp_off_configs`, `comp_off_usage_allocations`, `leave_encashment_compoff_events` + partial unique idempotency indexes |
| Payroll Integration | `computeEmployeePayrollBreakdown` (`leaveEncashment`, `encashmentDays`), `PayrollOrchestratorService`, `hrPayrollRouter`, `payrollRouter` | Link approved encashments to configured `SalaryComponent` & open payroll period; auto-include in run calculation (`PAYROLL_PROCESSING`) and mark `PAID` only on run finalization/publish |
| Comp-Off Utilization | Existing `/hr/leave/applications` & `/me/leave/applications` + `LeaveService` dry-run/submit/approve/cancel | FIFO non-expired Comp-Off lot reservation, consumption, and cancellation restoration via `CompOffUsageAllocation` |
| Automation / Cron | `AttendanceAutomationService.executeJob` + `SystemCronJob` + `server/src/index.ts` | Register idempotent Comp-Off pre-expiry warning & expiry ledger sweep |
| Dual Frontends & ESS | Existing `#00a76f` Leave design language, `leave-helpers.ts`, `GlobalExportDropdown`, `NAVIGATION_REGISTRY` | Full 4-tab `Leave Encashment & Comp-Off` HR module + ESS `/me/leave/encashment-compoff` + `/me/approvals` manager support in both Next.js CMS (`:3000`) and TanStack Start (`:5173`) |
