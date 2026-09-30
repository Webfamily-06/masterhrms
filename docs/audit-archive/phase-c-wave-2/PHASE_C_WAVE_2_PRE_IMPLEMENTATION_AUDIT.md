# PHASE C — WAVE 2: PRE-IMPLEMENTATION AUDIT REPORT
## Core HRMS and Statutory Payroll Migration

**Date:** 2026-09-26  
**Status:** STEP 1 READ-ONLY AUDIT COMPLETE (Awaiting User Review Before Code Modification)  
**Baseline Artifacts:**  
* `PHASE_C_WAVE_1_IMPLEMENTATION_REPORT.md`
* `PHASE_C_WAVE_1_FINAL_ACCEPTANCE_AUDIT.md`
* `PHASE_C_WAVE_1_TEST_REPORT.md` (33/33 Tests Passed, 100%)
* `PHASE_B_FEATURE_PARITY_MATRIX.md`
* Source Code: WorkDo Enterprise Laravel (`main-file/packages/workdo/Hrm/`)
* Target Platform: React 18 + Node.js/Express + Prisma 5.19.1 + MariaDB/MySQL 10.11

---

## 1. Executive Summary & Objective

In accordance with the formal authorization for **Phase C, Wave 2: Core HRMS and Statutory Payroll Migration**, this document presents a comprehensive, read-only pre-implementation audit of the source Laravel HRM implementation and the target React + Node.js + Prisma ERP platform.

### Scope of Wave 2
1. **Employee Master and Employee Directory**: Employee onboarding, profile updates, status lifecycle (`active`, `on_leave`, `terminated`), cascade soft/hard termination.
2. **Employee Statutory Fields**: Permanent Account Number (PAN), Aadhaar UID, Universal Account Number (UAN), Employee State Insurance (ESI), bank details, tax regime (`new` vs `old`), and statutory eligibility flags with strict PII access controls.
3. **Attendance and Roster Management**: Clock-in/clock-out, break hours, mobile geo-fenced punches (Haversine validation), shift rosters, holiday calendars, overtime calculation, and WebSocket telemetry.
4. **Leave Management and Approvals**: Multi-tier leave quotas, entitlement balances, leave requests, approval workflow with auto-synchronization to attendance records (`on_leave`).
5. **Monthly Payroll and Payslips**: Statutory formula calculation engine (EPF 12%, ESI 0.75%/3.25%, State Professional Tax matrices for MH/KA/TN/TS/WB/GJ/DL, Income-tax Act Section 392 withholding TDS), proration & Loss of Pay (LOP) deductions, immutable historical snapshots, payroll locking, and General Ledger posting.
6. **Subscription-Based Employee Limits**: Server-side seat limit enforcement with pessimistic concurrency locking (`SELECT ... FOR UPDATE`), active vs terminated lifecycle enforcement, and protection against bypass via updates or alternative paths.

---

## 2. Granular Source-to-Target File & Architecture Mapping

| Wave 2 Functional Domain | Laravel Source Implementation (`main-file/`) | Target Implementation (`server/` & `src/`) | Parity Status & Architecture Mapping |
| :--- | :--- | :--- | :--- |
| **1. Employee Master & Directory** | • `packages/workdo/Hrm/src/Http/Controllers/EmployeeController.php`<br>• `packages/workdo/Hrm/src/Models/Employee.php`<br>• `packages/workdo/Hrm/src/Http/Requests/StoreEmployeeRequest.php`<br>• `packages/workdo/Hrm/src/Http/Requests/UpdateEmployeeRequest.php`<br>• `packages/workdo/Hrm/src/Database/Migrations/2025_10_03_104915_create_employees_table.php`<br>• `packages/workdo/Hrm/src/Events/CreateEmployee.php` | • `server/src/routes/employees.routes.ts`<br>• `server/prisma/schema.prisma` (`model Employee`, `@@map("employees")`)<br>• `src/routes/_authenticated/_app/employees.tsx`<br>• `src/routes/_authenticated/_app/employee-details.tsx`<br>• `src/routes/_authenticated/_app/employee-dashboard.tsx` | **EQUIVALENT & EXTENDED**: Target supports department association, manager hierarchy, user provisioning (`provisionEmployeeUser`), and full 17-table cascade cleanup. |
| **2. Statutory Fields & PII** | • Partial fields in `Employee.php` (`tax_payer_id`, `bank_identifier_code`)<br>• Custom field attributes | • `server/prisma/schema.prisma` (`pan`, `aadhaar`, `uan`, `esi_number`, `tax_regime`, `state`, `pf_eligible`, `esi_eligible`, `pt_eligible`, `tds_eligible`, bank IFSC/account)<br>• `server/src/routes/employees.routes.ts` | **EXTENDED — PII ACCESS CONTROL REQUIRED**: Schema supports all Indian statutory columns. Target requires sensitive PII masking (`aadhaar`, `pan`) for non-privileged requests. |
| **3. Attendance & Roster** | • `packages/workdo/Hrm/src/Http/Controllers/AttendanceController.php`<br>• `packages/workdo/Hrm/src/Http/Controllers/ShiftController.php`<br>• `packages/workdo/Hrm/src/Models/Attendance.php`<br>• `packages/workdo/Hrm/src/Models/Shift.php`<br>• `packages/workdo/Hrm/src/Database/Migrations/2025_11_03_064139_create_attendances_table.php` | • `server/src/routes/attendance.routes.ts`<br>• `server/src/routes/shifts.routes.ts`<br>• `server/prisma/schema.prisma` (`model Attendance`, `model Shift`, `model ShiftRoster`, `model ShiftSwapRequest`)<br>• `src/routes/_authenticated/_app/attendance.tsx` | **EQUIVALENT & EXTENDED**: Target features mobile geo-fenced punch engine (`/punch`), Haversine radius validation, real-time WebSocket events (`punch:new`, `attendance:updated`). |
| **4. Leave Management** | • `packages/workdo/Hrm/src/Http/Controllers/LeaveApplicationController.php`<br>• `packages/workdo/Hrm/src/Models/LeaveApplication.php`<br>• `packages/workdo/Hrm/src/Models/LeaveType.php`<br>• `packages/workdo/Hrm/src/Database/Migrations/2025_10_16_071333_create_leave_applications_table.php` | • `server/src/routes/leave.routes.ts`<br>• `server/prisma/schema.prisma` (`model LeaveRequest`, `model LeaveType`)<br>• `src/routes/_authenticated/_app/leave.tsx` | **EQUIVALENT & EXTENDED**: Target enforces year-to-date quota validation on submission and auto-synchronizes approved leaves into the attendance table (`status: on_leave`). |
| **5. Monthly Payroll & Payslips** | • `packages/workdo/Hrm/src/Http/Controllers/PayrollController.php`<br>• `packages/workdo/Hrm/src/Models/Payroll.php`<br>• `packages/workdo/Hrm/src/Models/PayrollEntry.php`<br>• `packages/workdo/Hrm/src/Database/Migrations/2025_11_06_105850_create_payrolls_table.php`<br>• `packages/workdo/Hrm/src/Database/Migrations/2025_11_07_000001_create_payroll_entries_table.php` | • `server/src/routes/payroll.routes.ts`<br>• `server/src/services/payroll-engine.service.ts`<br>• `server/src/services/ledger-posting.service.ts`<br>• `server/prisma/schema.prisma` (`model PayrollRun`, `model Payslip`, `model PayrollSnapshot`, `model StatutoryRule`)<br>• `src/routes/_authenticated/_app/payroll.tsx` | **HIGH-PRECISION STATUTORY ENGINE**: Target replaces basic flat math with full statutory compliance (EPF, ESI, state PT matrices, Section 392 TDS, immutable snapshots, GL auto-posting). |
| **6. Employee Limits Enforcement** | • Core SaaS Plan user/employee attributes in Laravel | • `server/src/services/workspace-policy.service.ts` (`lockWorkspaceCapacity`)<br>• `server/src/routes/employees.routes.ts`<br>• `server/prisma/schema.prisma` (`model SubscriptionPlan`, `model TenantSubscription`) | **EQUIVALENT**: Implemented with row-level pessimistic database locks (`SELECT ... FOR UPDATE`). Gap identified: must enforce on reactivation. |

---

## 3. Detailed Workflow & Business Logic Audit

### 3.1 Employee Master & Status Lifecycle
* **Laravel Workflow**:
  - `EmployeeController::store` creates user record, assigns role, saves employee profile with `basic_salary`, `hours_per_day`, and dispatches `CreateEmployee`.
  - Termination is handled by creating a record in `terminations` table and archiving the user.
* **Target Architecture**:
  - `POST /api/employees` executes inside an atomic `prisma.$transaction`:
    1. Invokes `lockWorkspaceCapacity(tx, tenantId, "employees")` which locks the tenant row and checks `policy.maxEmployees`.
    2. Provisions auth user via `provisionEmployeeUser` with bcrypt password hashing.
    3. Creates `prisma.employee` with statutory fields (`pan`, `aadhaar`, `uan`, `esiNumber`, bank account/IFSC, tax regime).
  - `PUT /api/employees/:id` updates profile, salary, bank credentials, and status (`active`, `on_leave`, `terminated`).
  - `DELETE /api/employees/:id` performs a 17-point transactional cascade across attendance, leaves, payslips, assets, OKRs, and linked user accounts.

### 3.2 Statutory Field Management & PII Protection
* **Regulatory Compliance**:
  - **Aadhaar Act & Indian DPDP Act**: 12-digit Aadhaar UID must not be visible in plain text on standard directories or general API responses. Only the last 4 digits should be rendered (e.g., `XXXXXXXX1234`).
  - **Permanent Account Number (PAN)**: 10-character alphanumeric PAN (`[A-Z]{5}[0-9]{4}[A-Z]`) is required for TDS withholding under Section 139A and Section 392 of Income-tax Act.
  - **Universal Account Number (UAN)**: 12-digit EPFO identifier required for PF electronic challan-cum-return (ECR).
  - **ESI IP Number**: 17-digit insurance number for employees earning $\le$ ₹21,000 gross.
* **Access Control Vulnerability & Remediation**:
  - **Vulnerability**: Currently, `GET /api/employees` and `GET /api/employees/:id` return unmasked statutory fields to any authenticated tenant member.
  - **Remediation**: Implement server-side field masking in `employees.routes.ts`. If the requesting user lacks `hrm.employees.manage` or `hrm.payroll.manage` permission and is not viewing their own profile, mask `aadhaar` as `XXXXXXXX` + last 4, mask `pan` as `XXXXX` + last 4, and mask `bankAccount` as `XXXXXX` + last 4.

### 3.3 Attendance, Rosters, and Overtime
* **Laravel Workflow**:
  - `AttendanceController` logs `clock_in` and `clock_out`.
  - If working hours < standard shift hours, marks `half day`.
  - Overtime calculated as `(clock_out - clock_in - break_hour - shift_hours)`.
* **Target Architecture**:
  - `POST /api/attendance/punch` handles both mobile and web punch-in/out.
  - Computes Haversine great-circle distance between device GPS coordinates and registered office/warehouse location (`allowedRadiusMeters = 500m`). Records geo-verification tags.
  - If total working hours < 4.0 hours, automatically flags status as `half_day`.
  - Automatically calculates `totalHours` and notifies clients in real time via WebSockets (`socket.io`).

### 3.4 Leave Management & Balance Accrual
* **Laravel Workflow**:
  - `LeaveApplicationController` checks leave balance against `leave_types.days_per_year`.
  - Approver reviews request and updates status to `approved` or `rejected`.
* **Target Architecture**:
  - Auto-seeds standard Indian corporate leave structure on first tenant access (Casual Leave: 12d, Sick Leave: 10d, Earned/Annual Leave: 15d, Maternity/Paternity: 90d).
  - `GET /api/leave/balances` computes dynamically: `allocated - (approved + pending)`.
  - `POST /api/leave/requests` enforces remaining quota limits; rejects requests exceeding available balance with HTTP 400.
  - `PATCH /api/leave/requests/:id/status` changes status to `approved`. Crucially, it automatically upserts attendance records for all dates in the range with `status: "on_leave"`.

### 3.5 Payroll Engine, Statutory Calculations, and Locking
* **Comparison of Laravel Source vs Target Statutory Engine**:
  - **Laravel Source (`PayrollController.php`)**:
    - Flat mathematical model: `perDaySalary = basicSalary / workingDaysCount`.
    - Allowances and deductions calculated from separate user-attached records (`allowances` and `deductions` tables).
    - No native statutory ceiling caps or state-specific PT tax slabs.
  - **Target Statutory Engine (`payroll-engine.service.ts`)**:
    - **Proration Factor**: Calculated from payable days: `(presentDays + (halfDays * 0.5) + approvedLeaveDays) / totalWorkingDays`.
    - **Gross Earnings Allocation**: 50% Basic, 20% HRA, 15% Special Allowance, 5% Conveyance, 5% Medical, remainder Supplementary Perks.
    - **Statutory EPF**: 12% of Basic salary. Wage ceiling capped at ₹15,000 for statutory option. Employer breakdown: 3.67% EPF + 8.33% EPS (capped at ₹1,250) + 0.5% EDLI + 0.5% Admin charges.
    - **Statutory ESI**: 0.75% Employee + 3.25% Employer contribution. Strictly applicable only if gross monthly earnings $\le$ ₹21,000 wage ceiling. If $> ₹21,000$, contribution is ₹0.
    - **Professional Tax (PT)**: Evaluated per employee state:
      - **Maharashtra (MH)**: $\le ₹7,500$: ₹0; ₹7,501–₹10,000: ₹175; $> ₹10,000$: ₹200 (special February rate: ₹300).
      - **Karnataka (KA)**: $< ₹15,000$: ₹0; $\ge ₹15,000$: ₹200.
      - **Telangana / AP**: $\le ₹15,000$: ₹0; ₹15,001–₹20,000: ₹150; $> ₹20,000$: ₹200.
      - **Tamil Nadu (TN)**: Graded semi-annual slabs averaged monthly.
      - **West Bengal (WB)**: $\le ₹10,000$: ₹0; ₹10,001–₹15,000: ₹110; ₹15,001–₹25,000: ₹130; ₹25,001–₹40,000: ₹150; $> ₹40,000$: ₹200.
      - **Delhi (DL) / UP / Haryana (HR)**: ₹0 (no PT levied).
    - **Income Tax (Section 392 TDS)**:
      - Standard deduction: ₹75,000 under New Tax Regime.
      - Slab rates: 0-3L (0%), 3-7L (5%), 7-10L (10%), 10-12L (15%), 12-15L (20%), >15L (30%).
      - Section 87A rebate: 100% tax rebate if net taxable income $\le$ ₹7,00,000.
      - 4% Health & Education Cess applied to net tax.
  - **Immutability & Finalization**:
    - When a payroll run is finalized (`PATCH /api/payroll/runs/:id/status` -> `finalized` or `paid`):
      1. Generates frozen `payrollSnapshot` records for every employee.
      2. Marks `isLocked: true`.
      3. Forbids subsequent recalculation (`HTTP 400: Cannot recalculate or modify a finalized or paid payroll run`).
      4. Auto-posts salary expenditure, payroll liability, and tax withholdings to the General Ledger.

### 3.6 Subscription Employee Limits
* **Target Mechanism**:
  - `workspace-policy.service.ts` provides `lockWorkspaceCapacity(tx, tenantId, "employees", additional = 1)`.
  - Executes a row lock: `SELECT id FROM tenants WHERE id = ? FOR UPDATE` to serialize concurrent requests.
  - Inspects `policy.maxEmployees` from `tenantSubscription` (with fallback to CMS).
  - Checks if workspace is `active` (rejects if `suspended` or expired).
  - Counts active employee records.
  - Rejects creation with `HTTP 409: Workspace employees limit reached (N/MAX). Contact your platform administrator.`

---

## 4. Multi-Tenant Scoping & Security Analysis

1. **Prisma Proxy Facade Interception**:
   - The Dynamic Prisma Proxy Facade strictly prevents tenant model queries (`employee`, `attendance`, `leaveRequest`, `payslip`, `payrollRun`) outside an active tenant context. Attempting direct access throws `TenantContextRequiredError`.
2. **Horizontal Privilege Escalation (Tenant Isolation)**:
   - All HRMS endpoints verify `tenantId = req.user.tenantId`.
   - Records fetched by ID (`/api/employees/:id`, `/api/attendance/:id`, `/api/leave/requests/:id`, `/api/payroll/runs/:id`) enforce `existing.tenantId === req.user.tenantId`.
3. **Role-Based Access Control (RBAC)**:
   - Employee creation/edit/delete: Requires `hrm.employees.create`, `hrm.employees.edit`, `hrm.employees.delete`.
   - Leave approval: Requires manager or HR permissions (`hrm.leaves.manage`).
   - Payroll processing and finalization: Restricted to `hrm.payroll.manage` / `admin`.

---

## 5. Implementation Gaps & Action Items for Step 2

Based on this audit, the following targeted refinements must be implemented during Step 2:

1. **PII Masking for Statutory Fields**:
   - In `server/src/routes/employees.routes.ts`, implement statutory field masking on `GET /` and `GET /:id` so that users without elevated HR/finance roles see masked Aadhaar (`XXXXXXXX1234`), PAN (`XXXXX1234X`), and Bank Account (`XXXXXX1234`).
2. **Capacity Enforcement on Status Reactivation**:
   - In `PUT /api/employees/:id`, if `existingEmp.status === "terminated"` and the payload requests `status: "active"`, execute `lockWorkspaceCapacity(tx, tenantId, "employees", 1)` inside a transaction to prevent bypassing seat limits through reactivation.
3. **Automated Integration Test Suite**:
   - Create `server/src/tests/wave2-hrms.test.ts` covering all 6 domains and verifying:
     - Employee CRUD & tenant isolation
     - Statutory field validation and PII masking
     - Subscription capacity limit enforcement (active count & reactivation guard)
     - Attendance calculation (clock-in, clock-out, < 4h half-day detection, geo-fence tag)
     - Leave balance tracking, quota enforcement, and attendance auto-sync
     - Payroll calculation precision (EPF, ESI, PT state matrices, Section 392 TDS)
     - Payroll finalization, snapshot immutability, and recalculation locking
     - Wave 1 regression test verification.

---

## 6. Comprehensive Wave 2 Test Plan

| Test ID | Test Scenario | Expected Outcome | Verification Metric |
| :---: | :--- | :--- | :--- |
| **W2-T01** | Employee Creation with Statutory Fields & Linked User | HTTP 201 created; user provisioned; employee record persisted with PAN, Aadhaar, UAN, ESI. | Employee in DB with `tenantId` match; User exists with bcrypt password hash. |
| **W2-T02** | Cross-Tenant Employee Access Isolation | Tenant B user attempts `GET /api/employees/:alphaEmpId`; receives HTTP 404. | Absolute horizontal data isolation enforced. |
| **W2-T03** | Sensitive Statutory Field Masking (PII Protection) | Non-HR member receives masked Aadhaar (`XXXXXXXX...`), PAN, and bank account. | No plaintext Aadhaar/PAN exposed in API response. |
| **W2-T04** | Subscription Employee Seat Limit Enforcement | Attempting to create $(N+1)$-th employee when tenant has limit of $N$ returns HTTP 409. | `Workspace employees limit reached` error returned; DB count remains at $N$. |
| **W2-T05** | Seat Limit Guard on Terminated Employee Reactivation | Reactivating terminated employee when quota is full returns HTTP 409. | Cannot bypass subscription seats via status update. |
| **W2-T06** | Attendance Punch & Half-Day Detection | Punch in at 09:00, punch out at 11:30 (< 4 hours). | Status automatically evaluated as `half_day`; totalHours = 2.50. |
| **W2-T07** | Leave Quota Enforcement & Insufficient Balance Rejection | Requesting 15 days when remaining quota is 10 days returns HTTP 400. | Quota violation blocked; remaining days correctly returned. |
| **W2-T08** | Leave Approval & Automatic Attendance Synchronization | Approving a 3-day leave creates/updates 3 attendance records with `status = "on_leave"`. | Attendance records exist for each date in leave period. |
| **W2-T09** | Statutory Payroll Calculation Precision | Base CTC ₹50,000 in Maharashtra: Basic ₹25k, EPF ₹1,800 (15k cap), ESI ₹0 (>21k cap), PT ₹200, TDS accurately calculated. | Calculated fields match statutory formulas to the exact rupee. |
| **W2-T10** | Payroll Run Finalization & Immutability Lock | Finalizing payroll run creates snapshots; subsequent calculation attempt returns HTTP 400. | Immutability lock strictly prevents recalculation of historical payroll runs. |

---

## 7. Rollback & Contingency Plan

1. **Zero Database DDL Migrations Required**: All necessary columns (`pan`, `aadhaar`, `uan`, `esi_number`, `tax_regime`, `state`, etc.) and tables (`employees`, `attendance`, `leave_requests`, `leave_types`, `payroll_runs`, `payslips`, `payroll_snapshots`) already exist in `schema.prisma` and the MariaDB database. No destructive schema migrations are required for Wave 2.
2. **Code Reversibility**: Changes in Step 2 are restricted solely to:
   - `server/src/routes/employees.routes.ts` (PII masking and reactivation capacity check)
   - `server/src/tests/wave2-hrms.test.ts` (new automated test suite)
   Any changes can be immediately reverted via `git checkout` without impacting core SaaS or Wave 1 control plane modules.
3. **Isolation Guarantee**: All operations use existing `requireAuth`, `requirePermission`, and the Dynamic Prisma Proxy Facade. Wave 3 modules (Accounting, Sales, POS) remain completely untouched.

---

## 8. Conclusion & Gate Readiness

The pre-implementation audit confirms that the target platform possesses a robust, modern foundation for Core HRMS and Statutory Payroll that equals or surpasses the Laravel reference application. 

With user authorization, we are ready to proceed immediately to **Step 2 (Controlled implementation)** and **Step 3 & 4 (Statutory verification & automated testing)**.
