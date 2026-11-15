# MASTERHRMS — P3-A: Leave Encashment & Comp-Off API Implementation Report

**Project:** MASTERHRMS (`Webfamily-06/masterhrms`)  
**Branch:** `main`  
**Backend Runtime:** Express 4 + TypeScript + Prisma ORM + Supabase PostgreSQL (`ofzbhbcnizyegroggkxl`, `ap-south-1`)  
**TypeScript Verification:** `./server/node_modules/.bin/tsc -p server/tsconfig.json --noEmit` — **Exit Code `0` (0 errors)**

---

## 1. Architectural Alignment & Core Principles

The P3-A backend implementation extends the existing MASTERHRMS architecture without introducing duplicate leave balance engines, separate database connections, or hardcoded constants:

1. **Single Authoritative Balance Engine (`LeaveService` + `LeaveLedgerEntry`):**
   - `server/src/services/leave.service.ts` was extended so `computeLeaveTypeBalanceSummary`, `getEmployeeBalance`, `getEmployeeDetailedBalances`, `getBulkEmployeeDetailedBalances`, and `syncTenantBalances` incorporate:
     - Approved Comp-Off `CREDIT` entries (including standalone credits prior to annual policy sync and non-expired cross-year Comp-Off credits).
     - Approved `ENCASHMENT` debits net of any auditable encashment reversal `CREDIT`s (`notes LIKE '%ENCASHMENT_REVERSAL%'`).
     - Automatic/manual Comp-Off `EXPIRY` debits (`entryType = 'EXPIRY'`).
     - Active `ENCASHMENT` request reservations (`PENDING`, `MANAGER_APPROVED`, `HR_APPROVED`) so concurrent leave or encashment submissions cannot double-spend the same leave days.
   - Leave applications against Comp-Off leave types (`isCompOffLeaveType`) validate non-expired lot availability on `validateDryRun` and `submitApplication`, reserve earliest-expiring lots via FIFO (`CompOffUsageAllocation` status `RESERVED`), finalize `CONSUMED` allocations on approval, and restore non-expired lots (`RESTORED`) on cancellation or post-approval reversal.

2. **Dedicated Domain Service (`LeaveEncashmentCompOffService`):**
   - Implemented in `server/src/services/leave-encashment-compoff.service.ts` using `decimal.js` (`Decimal.ROUND_HALF_UP`) for all monetary and fractional-day arithmetic and PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) inside `rawPrisma.$transaction(...)` for all financial, balance-mutating, payroll-linking, and expiry operations.

3. **Zero Hardcoded Values:**
   - Every divisor, salary component, currency code, leave type, department, branch, payroll period, eligibility threshold, conversion ratio, and expiry horizon is resolved dynamically from tenant-scoped PostgreSQL configurations and employee records.

---

## 2. Backend Files Created & Modified

| File | Action | Purpose |
| :--- | :--- | :--- |
| `server/src/services/leave-encashment-compoff.service.ts` | **Created** | Core business logic for Module A (Leave Encashment), Module B (Comp-Off), Module C (Unified Transaction History & CSV/JSON Export), and Module D (Versioned Configuration CRUD), plus RBAC, audit logging, and notifications. |
| `server/src/routes/hr-leave-encashment-compoff.routes.ts` | **Created** | Tenant-scoped HR/Manager/Payroll REST router mounted at `/api/v1/hr/leave/encashment-compoff`. |
| `server/src/routes/hr-leave.routes.ts` | **Modified** | Replaced legacy inline encashment stub with `hrLeaveRouter.use("/encashment-compoff", hrLeaveEncashmentCompOffRouter)` while preserving backward-compatible `GET /` and `POST /:id/action`. |
| `server/src/routes/me-leave.routes.ts` | **Modified** | Added Employee Self-Service (ESS) endpoints (`/api/v1/me/leave/encashment-compoff/*`) and Reporting Manager direct-report endpoints (`/api/v1/me/leave/team-encashment-compoff/*`) with salary redaction for non-HR/Payroll managers. |
| `server/src/services/leave.service.ts` | **Modified** | Integrated Comp-Off FIFO lot reservation/consumption/restoration, overdue Comp-Off sweep, standalone Comp-Off credits, encashment reservations, and net encashment ledger calculations. |
| `server/src/services/payroll-orchestrator.service.ts` | **Modified** | Integrated approved/queued Leave Encashments into `calculatePayroll` (`PAYROLL_PROCESSING`) and `finalizePayrollCycle` (`PAID` strictly upon cycle finalization). |
| `server/src/routes/hr-payroll.routes.ts` | **Modified** | Integrated Leave Encashment earnings into `POST /api/v1/hr/payroll/runs/:id/calculate` (`PAYROLL_PROCESSING`) and `POST /api/v1/hr/payroll/runs/:id/publish` (`PAID` strictly upon payroll run publish/lock). |
| `server/src/services/attendance-automation.service.ts` | **Modified** | Added `processCompOffExpiries(tenantId)` and `runGlobalCompOffExpirySweep()` for idempotent Comp-Off lot expiration (`EXPIRY` ledger debit) and pre-expiry warning notifications. |
| `server/src/index.ts` | **Modified** | Scheduled daily automated Comp-Off expiry & pre-expiry notification sweep (`scheduleDailyCompOffExpirySweep`). |

---

## 3. Complete REST API Inventory

All routes are protected by `authenticateToken` and `tenantContextMiddleware` (`req.tenantId` derived strictly from authenticated JWT/session context).

### 3.1 HR Workspace Endpoints (`/api/v1/hr/leave/encashment-compoff`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/metadata` | HR Admin, HR Manager, Manager, Payroll, Employee | Dynamic dropdown options: employees, departments, branches, leave types, earning salary components, payroll runs, tenant currency, active configs, and caller capability flags (`viewerAccess`). |
| `GET` | `/summary` | HR Admin, HR Manager, Manager, Payroll | Server-aggregated KPI summary cards: Pending Encashments, Approved Encashments, Awaiting Payroll Processing, Pending Comp-Offs, Available Comp-Off Days, Expiring Comp-Off Days (`warningDays` configurable). |
| `GET` | `/encashments` | HR Admin, HR Manager, Manager, Payroll | Server-paginated, sorted, searchable list of Leave Encashment requests (salary fields redacted for non-HR/Payroll managers). |
| `GET` | `/encashments/eligible-types` | HR Admin, HR Manager, Manager, Employee (self) | Evaluates an employee's leave types against active tenant `LeaveEncashmentConfig`, service tenure, min balance, retained balance, and annual quota. |
| `POST` | `/encashments/calculate-preview` | HR Admin, HR Manager, Employee (self) | Dry-run decimal-safe calculation preview returning salary basis, component breakdown, divisor & source, unit daily rate, gross/net payable, and retained balance. |
| `POST` | `/encashments` | HR Admin, HR Manager, Employee (self if ESS enabled) | Creates a `DRAFT` or `PENDING` Leave Encashment request with immutable calculation snapshot and optional `Idempotency-Key`. |
| `GET` | `/encashments/:id` | Scoped Viewer | Full Encashment detail with approval timeline, payroll timeline, and linked `LeaveLedgerEntry` records. |
| `PUT` / `PATCH` | `/encashments/:id` | Submitter (own `DRAFT`/`PENDING`/`CLARIFICATION_REQUESTED`), HR Admin/Manager | Updates request days/date/reason/attachment and recalculates authoritative financial snapshot. |
| `POST` | `/encashments/:id/decide` | Manager (direct report), HR Admin, HR Manager | Multi-stage or single-stage `approve`, `reject` (reason mandatory), or `request_clarification` (`403` on self-approval). |
| `POST` | `/encashments/:id/approve` | Manager (direct report), HR Admin, HR Manager | Explicit approval alias supporting optional `approvedDays` adjustment and approval comments. |
| `POST` | `/encashments/:id/reject` | Manager (direct report), HR Admin, HR Manager | Explicit rejection alias enforcing mandatory rejection reason. |
| `POST` | `/encashments/:id/cancel` | Submitter (own pre-payroll), HR Admin, HR Manager | Cancels `DRAFT`/`PENDING`/`CLARIFICATION_REQUESTED` or pre-payroll `APPROVED` encashment (reversing ledger debit if already deducted). |
| `POST` | `/encashments/:id/process-payroll` | HR Admin, Payroll Role | Transitions `APPROVED`/`FAILED` encashment to `PAYROLL_PENDING` (or links to draft `PayrollRun` as `PAYROLL_PROCESSING`) with duplicate-queue protection (`409`). |
| `POST` | `/encashments/:id/mark-payroll-failed` | HR Admin, Payroll Role | Marks queued/processing encashment `FAILED` with failure reason so it can be retried or reversed safely. |
| `POST` | `/encashments/:id/reconcile-paid` | HR Admin, Payroll Role | Marks encashment `PAID` **only** after verifying a finalized `PayrollCycle` (`FINALIZED`/`LOCKED`/`PAID`) or published `PayrollRun` (`published`/`locked`/`paid`), or an explicit external disbursement voucher reference. |
| `POST` | `/encashments/:id/reverse` | HR Admin | Auditable reversal of `APPROVED`/`PAYROLL_PENDING`/`FAILED` encashment: creates compensating `LeaveLedgerEntry` (`CREDIT`) restoring leave balance and logs immutable `REVERSED` event. |
| `GET` | `/comp-offs` | HR Admin, HR Manager, Manager | Server-paginated, sorted, searchable list of Comp-Off credit requests with FIFO lot utilization (`creditedDays`, `usedDays`, `expiredDays`, `remainingDays`). |
| `POST` | `/comp-offs/verify-eligibility` | HR Admin, HR Manager, Manager, Employee (self) | Verifies worked date against `Holiday`, shift/policy weekly-off, `Attendance` punch hours, and `APPROVED` `OvertimeRequest` records, returning eligible work types, conversion days, and expiry preview. |
| `POST` | `/comp-offs/verify-overtime` | HR Admin, HR Manager, Manager, Employee (self) | Overtime-focused verification alias for worked date. |
| `POST` | `/comp-offs/preview-credit` | HR Admin, HR Manager, Manager, Employee (self) | Credit & expiry preview alias for Comp-Off modal. |
| `POST` | `/comp-offs` | HR Admin, HR Manager, Employee (self if ESS enabled) | Submits `DRAFT` or `PENDING` Comp-Off request enforcing backdate window, min hours, and duplicate work-date prevention. |
| `GET` | `/comp-offs/balance` | Scoped Viewer | Returns employee's live Comp-Off balance, active FIFO lots, and expiring-soon lots. |
| `GET` | `/comp-offs/expiring` | HR Admin, HR Manager, Manager | Lists Comp-Off lots expiring within `warningDays` across tenant or manager's direct reports. |
| `POST` | `/comp-offs/run-expiry-sweep` | HR Admin | Triggers immediate idempotent Comp-Off expiry & pre-expiry notification sweep for the tenant. |
| `GET` | `/comp-offs/:id` | Scoped Viewer | Full Comp-Off request detail with attendance/OT verification snapshot, ledger entries, and `CompOffUsageAllocation` links to Leave Applications. |
| `PUT` / `PATCH` | `/comp-offs/:id` | Submitter (own `DRAFT`/`PENDING`/`CLARIFICATION_REQUESTED`), HR Admin/Manager | Updates unapproved Comp-Off request and re-verifies eligibility. |
| `POST` | `/comp-offs/:id/decide` | Manager (direct report), HR Admin, HR Manager | Approves, rejects (mandatory reason), or requests clarification (`403` on self-approval). Final approval atomically posts `LeaveLedgerEntry` (`CREDIT`) and sets `expiresAt`. |
| `POST` | `/comp-offs/:id/approve` | Manager (direct report), HR Admin, HR Manager | Explicit Comp-Off approval alias. |
| `POST` | `/comp-offs/:id/reject` | Manager (direct report), HR Admin, HR Manager | Explicit Comp-Off rejection alias. |
| `POST` | `/comp-offs/:id/cancel` | Submitter (own unutilized), HR Admin, HR Manager | Cancels Comp-Off request; blocks cancellation if any portion of credited days is already consumed/reserved by a Leave Application (`409`). |
| `GET` | `/transactions` | HR Admin, HR Manager, Manager, Payroll | Unified Module C Transaction History across `ENCASHMENT` and `COMP_OFF` with server-side filters (`employeeId`, `departmentId`, `branchId`, `leaveTypeId`, `status`, `transactionType`, `payrollMonth`, `payrollYear`, `startDate`, `endDate`, `search`, `sortBy`, `sortOrder`, `page`, `limit`). |
| `GET` | `/transactions/export` | HR Admin, HR Manager, Payroll | Streams filtered Transaction History as RFC-4180 CSV (`format=csv`, UTF-8 BOM for Excel compatibility) or structured JSON (`format=json`), redacting salary columns if caller lacks salary visibility. |
| `GET` | `/transactions/:id` | Scoped Viewer | Unified Transaction Detail endpoint returning full event timeline, payroll status, ledger entries, and Comp-Off leave allocations. |
| `GET` | `/configs/encashment` | HR Admin, HR Manager, Payroll | Lists versioned `LeaveEncashmentConfig` records for the tenant. |
| `POST` | `/configs/encashment` | **HR Admin Only** | Creates a new Leave Encashment Configuration with overlap validation. |
| `PUT` / `PATCH` | `/configs/encashment/:id` | **HR Admin Only** | Updates configuration and increments `version` when referenced by historical requests. |
| `POST` | `/configs/encashment/:id/deactivate` | **HR Admin Only** | Soft-deactivates (`enabled = false`, `status = 'INACTIVE'`) preserving historical audit references (`DELETE` also aliases soft-deactivation). |
| `GET` | `/configs/comp-off` | HR Admin, HR Manager | Lists versioned `CompOffConfig` records for the tenant. |
| `POST` | `/configs/comp-off` | **HR Admin Only** | Creates a new Comp-Off Policy Configuration with overlap validation. |
| `PUT` / `PATCH` | `/configs/comp-off/:id` | **HR Admin Only** | Updates Comp-Off configuration and increments `version` when referenced by historical requests. |
| `POST` | `/configs/comp-off/:id/deactivate` | **HR Admin Only** | Soft-deactivates Comp-Off configuration preserving historical audit references (`DELETE` also aliases soft-deactivation). |
| `GET` / `POST` | `/` and `/:id/action` | HR Admin, HR Manager | Backward-compatible endpoints preserved for legacy callers. |

### 3.2 Employee Self-Service & Manager Endpoints (`/api/v1/me/leave`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/encashment-compoff/overview` | Authenticated Employee | Returns employee's own Comp-Off balance, expiring lots alert list, eligible encashment leave types, active ESS policy flags, and summary counts (`directReportsCount` included for managers). |
| `GET` | `/encashment-compoff` | Authenticated Employee | Paginated list of the logged-in employee's own Encashment and Comp-Off requests (`selfOnly: true`). |
| `GET` | `/encashment-compoff/:id` | Authenticated Employee | Full detail of the logged-in employee's own request (approval timeline, payroll status, ledger entries, Comp-Off allocations). |
| `POST` | `/encashment/preview` | Authenticated Employee | Live dry-run calculation preview for the logged-in employee's Encashment request. |
| `POST` | `/encashment` | Authenticated Employee | Submits an ESS Leave Encashment request (enforces `allowEssSubmission`). |
| `POST` | `/comp-off/verify` | Authenticated Employee | Live attendance/holiday/weekly-off/overtime verification for the logged-in employee's worked date. |
| `POST` | `/comp-off` | Authenticated Employee | Submits an ESS Comp-Off Earn request (enforces `allowEssSubmission`). |
| `PUT` | `/encashment-compoff/:id` | Authenticated Employee | Edits own `DRAFT` / `PENDING` / `CLARIFICATION_REQUESTED` request. |
| `POST` | `/encashment-compoff/:id/cancel` | Authenticated Employee | Cancels own unapproved (or unutilized) request with reason. |
| `GET` | `/team-encashment-compoff` | Reporting Manager / HR | Lists Encashment & Comp-Off requests of direct/delegated reports (redacting salary fields for non-HR/Payroll managers). |
| `POST` | `/team-encashment-compoff/:id/decide` | Reporting Manager / HR | Approves or rejects a direct report's Encashment or Comp-Off request (`403` on self-approval or non-subordinate). |

---

## 4. Financial, Ledger & Payroll Integrity Guarantees

1. **Configurable Divisor & Salary Basis (Never Hardcoded):**
   - Supports `BASIC`, `GROSS`, and `CUSTOM_COMPONENTS` (summing matching `EmployeeSalaryItem` monthly amounts from the employee's active `EmployeeSalaryAssignment`).
   - Supports `CUSTOM` divisor (configured `dailyRateDivisor`), `CALENDAR_DAYS` (actual days in effective month: 28/29/30/31), and `WORKING_DAYS` (computed dynamically from tenant weekly-off schedule and `Holiday` calendar for the effective month).
   - Stores immutable `calculationSnapshot` JSON + `NUMERIC(14,2)` columns (`salaryBasisAmount`, `dailyRateDivisor`, `dailyRate`, `grossAmount`, `adjustmentsAmount`, `netPayableAmount`, `currency`).

2. **Traceable Payroll State Machine:**
   - `APPROVED` -> `PAYROLL_PENDING` (queued for target month/year & earning component) -> `PAYROLL_PROCESSING` (picked up by `PayrollOrchestratorService.calculatePayroll` or `POST /api/v1/hr/payroll/runs/:id/calculate` as a distinct line item) -> `PAID` (**strictly** when `finalizePayrollCycle` or `POST /runs/:id/publish` completes, or via verified payroll reconciliation).
   - Duplicate inclusion is blocked both by status gating and `payrollCycleId` / `payrollRunId` linkage (`409 DUPLICATE_PAYROLL_LINK`).

3. **Audit Logging & Notifications:**
   - Every create, update, approve, reject, clarification, cancel, payroll queue, payroll failure, disbursement, reversal, expiry, and config change writes both a domain `LeaveEncashmentCompOffEvent` timeline entry and a tenant `AuditLog` record (`AuditService.log`), and dispatches targeted notifications (`NotificationService.createNotification`).
