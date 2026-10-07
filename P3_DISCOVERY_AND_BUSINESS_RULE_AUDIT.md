# MASTERHRMS — PHASE P3 DISCOVERY & BUSINESS RULE AUDIT REPORT

**Date:** 2026-10-07  
**Phase:** P3 Attendance, Leave, Check-In/Out, Realtime & Month Lock  
**Status:** DISCOVERY & BUSINESS RULE AUDIT COMPLETE  
**Execution Doctrine:** DISCOVER → AUDIT → IDENTIFY GAPS → LOCK BUSINESS RULES → PLAN → IMPLEMENT → TEST → VERIFY → REPORT → HARD STOP  

---

## 1. Executive Discovery Summary

This audit assesses the existing codebase against the specifications for Phase P3:
- `00_Architecture_and_Conventions.md`
- `01_HR_Panel_Spec.md`
- `02_Employee_Portal_Spec.md`
- `03_Interlinking_and_Realtime_Flows.md`
- `worklog.md`

### Key Architectural Findings:
1. **Existing Database Models in Prisma Schema:**
   - `Attendance` (`model Attendance`): Contains `id, tenantId, employeeId, date, checkIn, checkOut, hours, status, notes, createdAt`.
   - `LeaveType` (`model LeaveType`): Contains `id, tenantId, name, daysPerYear, color, createdAt`.
   - `LeaveRequest` (`model LeaveRequest`): Contains `id, tenantId, employeeId, leaveTypeId, approverId, startDate, endDate, days, status, reason, approvedAt, createdAt, updatedAt`.
   - `ShiftDefinition` (`model ShiftDefinition`): Contains `id, tenantId, name, code, startTime, endTime, breakMinutes, allowance, isOvertimeEligible, color, createdAt, updatedAt`.
   - `ShiftRoster` (`model ShiftRoster`): Contains `id, tenantId, employeeId, shiftId, rosterDate, notes, status, createdAt, updatedAt`.
   - `ShiftSwapRequest` (`model ShiftSwapRequest`): Contains `id, tenantId, requesterEmployeeId, targetEmployeeId, shiftDate, reason, status, managerNotes, approvedAt`.
   - `BiometricDevice` (`model BiometricDevice`), `BiometricPunchLog`, `BiometricEmployeeMapping`, `BiometricOfflineBuffer`: Fully defined hardware sync engine.
   - `Timesheet` (`model Timesheet`): Contains `id, tenantId, employeeId, projectId, taskId, date, hours, description, status, reviewedBy, reviewedAt, reviewNotes`.
   - `OvertimeRequest` (`model OvertimeRequest`): Contains `id, tenantId, employeeId, overtimeDate, hoursRequested, overtimeType, reason, status, reviewedBy, reviewedAt, reviewRemarks`.
   - `AttendanceRegularization` (`model AttendanceRegularization`): Contains `id, tenantId, employeeId, attendanceDate, proposedIn, proposedOut, reason, status, approverId, reviewedAt, reviewComments`.
   - `LeaveLedgerEntry` (`model LeaveLedgerEntry`): Contains `id, tenantId, employeeId, leaveTypeId, entryType (ACCRUAL, DEBIT, CREDIT, CARRY_FORWARD, ENCASHMENT), days, balance, referenceId, notes, effectiveAt`.
   - `WfhRequest` (`model WfhRequest`): Contains `id, tenantId, employeeId, fromDate, toDate, reason, status, reviewedBy, reviewedAt, reviewRemarks`.

2. **Models Missing from Authoritative Schema:**
   - `AttendancePolicy` (Versioned policy engine: working days, grace minutes, late-mark rule, half/full-day thresholds, OT rules, geo-fence/IP/selfie rules, auto checkout, regularization window, LOP rules, version, effectiveFrom).
   - `LeavePolicy` (Versioned leave policy: notice days, sandwich rule, blackout dates, max consecutive days, carry-forward, version, effectiveFrom).
   - `AttendanceMonthLock` (Authoritative month locking engine: tenantId, year, month, isLocked, lockedAt, lockedById, notes).
   - `LeaveEncashmentRequest` (Encashment & comp-off requests tracking).

3. **Tenant Isolation Baseline:**
   - All existing attendance/leave models (`Attendance`, `LeaveType`, `LeaveRequest`, `ShiftDefinition`, `ShiftRoster`, `ShiftSwapRequest`, `Timesheet`, `OvertimeRequest`, `AttendanceRegularization`, `LeaveLedgerEntry`, `WfhRequest`, `BiometricDevice`) are already registered in `DIRECT_TENANT_MODELS` in `server/src/config/tenant-models.config.ts`.
   - New models (`AttendancePolicy`, `LeavePolicy`, `AttendanceMonthLock`, `LeaveEncashmentRequest`) must be registered in `DIRECT_TENANT_MODELS`.

4. **Existing Endpoints & Logic:**
   - `server/src/routes/attendance.routes.ts`: Has `GET /`, `POST /`, `POST /punch`, `POST /check-in`, `POST /check-out`, `POST /regularize`, `POST /reconcile`, `GET /daily-report`.
   - `server/src/routes/leave.routes.ts`: Has `GET /types`, `POST /types`, `PUT /types/:id`, `DELETE /types/:id`, `GET /balances`, `GET /requests`, `POST /requests`, `PATCH /requests/:id/status`, `POST /requests/:id/cancel`.
   - `server/src/routes/shifts.routes.ts`: Has CRUD for shifts, `GET /roster`, `POST /roster/assign`, `POST /roster/bulk-assign`, `GET /swaps`, `POST /swaps`, swap peer & manager actions.
   - `server/src/routes/timesheets.routes.ts`: Has `GET /`, `POST /`, `PUT /:id/approve`, `PUT /:id/reject`.
   - `server/src/routes/employee-self-service.routes.ts`: Has `POST /attendance/check-in`, `POST /attendance/check-out`, `GET/POST /regularizations`, `POST /leaves/validate` (dry run), `GET /leave-balance`, `GET/POST /leaves`, `GET /team/approvals`.

5. **Existing Frontend Baseline:**
   - Legacy routes in `src/routes/_authenticated/_app/*` (`attendance.tsx`, `attendance-employee.tsx`, `leave.tsx`, `shifts.tsx`, `timesheets.tsx`, `overtime.tsx`, `biometric.tsx`, `employee-dashboard.tsx`) exist.
   - The modern `/hr/*` and `/me/*` routes for attendance and leave have NOT yet been created.
   - `/me/index.tsx` is currently a placeholder foundation with `--` mock values.

---

## 2. Inventory of P3 Routes (25 Routes)

### Part A: HR Portal Routes (`/hr/*`)

| ID | Canonical Route | Legacy Flat Route | Status | UI Status | API Status | DB Model | Primary Gap |
|---|---|---|---|---|---|---|---|
| **HR-ATT-01** | `/hr/attendance/records` | `_app/attendance.tsx` | PT | Legacy monolithic | `GET /api/attendance` | `Attendance` | Month lock enforcement, heatmap, recalculation, late/early/OT minutes breakdown |
| **HR-ATT-02** | `/hr/attendance/timesheets` | `_app/timesheets.tsx` | PT | Legacy table | `GET /api/timesheets` | `Timesheet` | Comparison with attendance hours, unlock for edit, modern HR layout |
| **HR-ATT-03** | `/hr/attendance/regularizations` | In `_app/attendance.tsx` (modal) | PT | Modal only | `POST /api/attendance/regularize` | `AttendanceRegularization` | Dedicated table, approval workflow integration, reversible attendance corrections |
| **HR-ATT-04** | `/hr/attendance/shifts` | `_app/shifts.tsx` | PT | Legacy tabs | `GET /api/shifts` | `ShiftDefinition`, `ShiftRoster`, `ShiftSwapRequest` | Modern 3-tab layout (Masters, Rosters, Swaps), conflict detection |
| **HR-ATT-05** | `/hr/attendance/policies` | None | NS | Missing | Missing | Missing (`AttendancePolicy`) | Versioned policy engine, late-mark rules, thresholds, geo/IP rules |
| **HR-ATT-06** | `/hr/attendance/live` | In `_app/attendance.tsx` | PT | Static counters | `GET /api/attendance/daily-report` | `Attendance` | Live Socket.IO punch stream, today's status grid, nudge action |
| **HR-ATT-07** | `/hr/attendance/overtime` | `_app/overtime.tsx` | PT | Legacy table | Existing custom | `OvertimeRequest` | Policy-driven OT multiplier, approval workflow, payroll readiness linkage |
| **HR-ATT-08** | `/hr/attendance/devices` | `_app/biometric.tsx` | PT | Legacy table | `GET /api/biometric` | `BiometricDevice` | Geo-fence polygon/radius manager, IP allow-list, secure credential handling |
| **HR-LV-01** | `/hr/leave/applications` | `_app/leave.tsx` | PT | Legacy table | `GET /api/leave/requests` | `LeaveRequest` | Workflow approval integration, calendar view, cancel/reversal, team overlap |
| **HR-LV-02** | `/hr/leave/balances` | In `_app/leave.tsx` | PT | Modal summary | `GET /api/leave/balances` | `LeaveLedgerEntry` | Authoritative ledger table, manual adjustment with audit, accrual preview run |
| **HR-LV-03** | `/hr/leave/types` | In `_app/leave.tsx` | PT | Settings modal | `GET/POST /api/leave/types` | `LeaveType` | MasterDataBlueprint migration, carry-forward, sandwich rule config |
| **HR-LV-04** | `/hr/leave/policies` | None | NS | Missing | Missing | Missing (`LeavePolicy`) | Versioned policy engine, notice rules, blackout dates, quota assignment |
| **HR-LV-05** | `/hr/leave/calendar` | In `_app/leave.tsx` | PT | Basic calendar | `GET /api/leave/requests` | `LeaveRequest` | Department/branch team grid, minimum coverage warning |
| **HR-LV-06** | `/hr/leave/encashment-compoff`| None | NS | Missing | Missing | Missing (`LeaveEncashmentRequest`) | Dedicated encashment and comp-off workflow tracking, payroll-ready output |

### Part B: Employee Portal Routes (`/me/*`)

| ID | Canonical Route | Legacy Flat Route | Status | UI Status | API Status | DB Model | Primary Gap |
|---|---|---|---|---|---|---|---|
| **ME-OV-01** | `/me/dashboard` (and `/me`) | `_app/employee-dashboard.tsx` | PT | Hardcoded mock data | `GET /api/v1/me/dashboard` | `Attendance`, `ShiftRoster`, `LeaveRequest` | Real check-in/out button, real elapsed timer, live stats, real leave balance |
| **ME-ATT-01** | `/me/attendance/records` | `_app/attendance-employee.tsx` | PT | Monolithic legacy | `GET /api/attendance` (self) | `Attendance` | Month calendar + table, policy version display, "Regularize" shortcut |
| **ME-ATT-02** | `/me/attendance/timesheet` | None | NS | Missing | In `/api/timesheets` | `Timesheet` | Self timesheet draft creation, weekly submission, withdraw action |
| **ME-ATT-03** | `/me/attendance/regularizations` | In ESS modal | PT | Modal only | `GET/POST /api/v1/me/regularizations` | `AttendanceRegularization` | Dedicated history table, pending edit/withdraw, policy window indicator |
| **ME-ATT-04** | `/me/attendance/shifts` | `_app/shift-swap-requests.tsx` | PT | Legacy table | `GET /api/shifts/roster` (self) | `ShiftRoster`, `ShiftSwapRequest` | Self weekly roster view, initiate swap request with peer selection |
| **ME-ATT-05** | `/me/attendance/policies` | None | NS | Missing | Missing | Missing (`AttendancePolicy`) | Read-only view of employee's active attendance policy and version |
| **ME-ATT-06** | `/me/attendance/requests` | In `_app/wfh`, `_app/overtime` | PT | Fragmented routes | `POST /wfh`, `POST /overtime` | `WfhRequest`, `OvertimeRequest` | Unified request center (OT, WFH, On-duty, Comp-off) with workflow timeline |
| **ME-LV-01** | `/me/leave/applications` | In `_app/leave.tsx` / ESS | PT | Fragmented modal | `POST /api/v1/me/leaves/validate` | `LeaveRequest` | Dry-run validation preview, team overlap warning, cancel after approval |
| **ME-LV-02** | `/me/leave/balance` | In ESS profile | PT | Summary card | `GET /api/v1/me/leave-balance` | `LeaveLedgerEntry` | Authoritative ledger breakdown (opening, accrued, used, available), encashment |
| **ME-LV-03** | `/me/leave/policies` | None | NS | Missing | Missing | Missing (`LeavePolicy`) | Read-only view of employee's active leave policy rules and quotas |
| **ME-LV-04** | `/me/leave/team-calendar` | None | NS | Missing | Missing | `LeaveRequest` | Team peer absence calendar with privacy filter (no sensitive leave reasons) |

---

## 3. Gap Matrix

| Gap ID | Requirement | Existing State | Gap Details | Risk Severity | Architectural Resolution |
|---|---|---|---|---|---|
| **GAP-P3-01** | Month Lock Engine | None. Attendance records can be updated at any time. | No lock table or checks. Historical payroll periods can be modified destructively. | **Critical** | Create `AttendanceMonthLock` model, `AttendanceMonthLockService`, enforce on all write endpoints. |
| **GAP-P3-02** | Authoritative Attendance Calculation Service | Client & route ad-hoc calculations in `attendance.routes.ts`. | Late minutes, early out, half-day thresholds, and overtime calculations are duplicated or computed on frontend. | **High** | Create `AttendanceCalculationService` as a single server-side domain engine used by check-in, check-out, cutoff cron, and payroll. |
| **GAP-P3-03** | Versioned Attendance Policy | No policy table. Hardcoded 15-minute grace period in `attendance.routes.ts`. | Cannot configure different working days, grace periods, or OT rules per branch/department. | **High** | Create `AttendancePolicy` model with effective dating (`effectiveFrom`, `version`). |
| **GAP-P3-04** | Versioned Leave Policy | Only simple `LeaveType.daysPerYear`. | No sandwich rule, notice days, blackout periods, max consecutive days, or gender restriction. | **High** | Create `LeavePolicy` model and enhance `LeaveType` with policy rules. |
| **GAP-P3-05** | Leave Dry-Run & Sandwich Engine | Partial validation in `employee-self-service.routes.ts`. | Doesn't evaluate sandwich rule (counting intervening holidays/week-offs) or consecutive limit against policies. | **High** | Implement `LeaveCalculationService` with server-side dry-run preview before commit. |
| **GAP-P3-06** | Leave Ledger Integrity | `LeaveLedgerEntry` model exists but is not universally updated on approval/reversal. | Balances are partially computed via `LeaveRequest.days` aggregations rather than immutable ledger entries. | **High** | Ensure all leave approvals, cancellations, accruals, and encashments write immutable `LeaveLedgerEntry` rows. Reversals create compensating records. |
| **GAP-P3-07** | Unified Request Center (`/me/attendance/requests`) | Split across legacy `_app/overtime.tsx` and `_app/work-from-home.tsx`. | No unified portal page for employees to submit and track OT, WFH, On-duty, and Comp-off requests. | **Medium** | Build `/me/attendance/requests` using shared request blueprint. |
| **GAP-P3-08** | Realtime Live Attendance Board (`/hr/attendance/live`) | Only static report in `_app/attendance.tsx`. | Realtime live stream of punches, presence status, and map are absent from canonical `/hr`. | **Medium** | Build `/hr/attendance/live` connected to Socket.IO `tenant:{id}` room listening to `attendance.checked_in` and `attendance.checked_out`. |
| **GAP-P3-09** | Employee Dashboard Real Data | `_app/employee-dashboard.tsx` has mock state ("Stephan Peralt", 5h 45m hardcoded). `/me/index.tsx` has `--`. | Employees cannot clock in/out reliably with real server persistence on `/me/dashboard`. | **High** | Upgrade `/me/index.tsx` (and `/me/dashboard`) to consume real `AttendanceService` APIs and TanStack query hooks. |
| **GAP-P3-10** | Encashment & Comp-off | No dedicated tracking UI or API. | Encashment and comp-off lack workflow integration and payroll-readable exports. | **Medium** | Create `LeaveEncashmentRequest` model and implement `/hr/leave/encashment-compoff`. |

---

## 4. Database Impact Analysis

### Models to Reuse:
- `Attendance`: Primary daily record. Add optional audit/enrichment columns: `source` (Web/Mobile/Biometric/Manual), `lateMinutes`, `earlyOutMinutes`, `overtimeMinutes`, `shiftId`, `policyId`, `checkInIp`, `checkOutIp`.
- `LeaveType`: Primary catalog of leave types. Add fields: `code`, `isPaid`, `accrualFrequency`, `carryForwardLimit`, `isEncashable`, `requiresDocument`, `halfDayAllowed`, `sandwichRule`.
- `LeaveRequest`: Primary leave application. Retain relationships with `Employee`, `Tenant`, `LeaveType`.
- `ShiftDefinition`: Primary shift catalog. Retain relationships with `Tenant`, `ShiftRoster`.
- `ShiftRoster`: Primary shift scheduling. Retain unique constraint `[tenantId, employeeId, rosterDate]`.
- `ShiftSwapRequest`: Primary swap workflow.
- `Timesheet`: Primary timesheet log.
- `OvertimeRequest`: Primary OT tracking.
- `AttendanceRegularization`: Primary regularization workflow.
- `LeaveLedgerEntry`: Authoritative immutable ledger.
- `WfhRequest`: Work-from-home workflow.
- `BiometricDevice`, `BiometricPunchLog`: Hardware sync.

### New Models Required:
1. **`AttendancePolicy`**:
   ```prisma
   model AttendancePolicy {
     id                 String   @id @default(uuid()) @db.VarChar(36)
     tenantId           String   @map("tenant_id") @db.VarChar(36)
     name               String   @db.VarChar(100)
     code               String   @db.VarChar(50)
     description        String?  @db.Text
     branchId           String?  @map("branch_id") @db.VarChar(36)
     departmentId       String?  @map("department_id") @db.VarChar(36)
     workingDays        String   @default("Mon,Tue,Wed,Thu,Fri") @map("working_days") @db.VarChar(100)
     graceMinutes       Int      @default(15) @map("grace_minutes")
     lateMarkRule       String?  @map("late_mark_rule") @db.VarChar(100) // e.g., "3_LATES_HALF_DAY"
     halfDayHours       Decimal  @default(4.0) @map("half_day_hours") @db.Decimal(4, 2)
     fullDayHours       Decimal  @default(8.0) @map("full_day_hours") @db.Decimal(4, 2)
     isOvertimeAllowed  Boolean  @default(true) @map("is_overtime_allowed")
     overtimeMultiplier Decimal  @default(1.0) @map("overtime_multiplier") @db.Decimal(4, 2)
     minOvertimeMinutes Int      @default(60) @map("min_overtime_minutes")
     autoCheckoutTime   String?  @map("auto_checkout_time") @db.VarChar(10) // e.g., "23:59"
     regularizationLimit Int     @default(3) @map("regularization_limit") // per month
     regularizationDays Int      @default(7) @map("regularization_days") // submission window
     verificationModes  String   @default("WEB,MOBILE,GEO") @map("verification_modes") @db.VarChar(100)
     isDefault          Boolean  @default(false) @map("is_default")
     version            Int      @default(1)
     effectiveFrom      DateTime @default(now()) @map("effective_from") @db.Date
     createdAt          DateTime @default(now()) @map("created_at")
     updatedAt          DateTime @updatedAt @map("updated_at")

     tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     @@unique([tenantId, code, version])
     @@index([tenantId, isDefault])
     @@map("attendance_policies")
   }
   ```
2. **`LeavePolicy`**:
   ```prisma
   model LeavePolicy {
     id                 String   @id @default(uuid()) @db.VarChar(36)
     tenantId           String   @map("tenant_id") @db.VarChar(36)
     name               String   @db.VarChar(100)
     code               String   @db.VarChar(50)
     description        String?  @db.Text
     branchId           String?  @map("branch_id") @db.VarChar(36)
     departmentId       String?  @map("department_id") @db.VarChar(36)
     noticeDays         Int      @default(2) @map("notice_days")
     sandwichRule       Boolean  @default(false) @map("sandwich_rule")
     maxConsecutiveDays Int      @default(14) @map("max_consecutive_days")
     blackoutDates      String?  @map("blackout_dates") @db.Text // JSON string of date ranges
     isDefault          Boolean  @default(false) @map("is_default")
     version            Int      @default(1)
     effectiveFrom      DateTime @default(now()) @map("effective_from") @db.Date
     createdAt          DateTime @default(now()) @map("created_at")
     updatedAt          DateTime @updatedAt @map("updated_at")

     tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     @@unique([tenantId, code, version])
     @@index([tenantId, isDefault])
     @@map("leave_policies")
   }
   ```
3. **`AttendanceMonthLock`**:
   ```prisma
   model AttendanceMonthLock {
     id          String    @id @default(uuid()) @db.VarChar(36)
     tenantId    String    @map("tenant_id") @db.VarChar(36)
     year        Int
     month       Int       // 1 to 12
     isLocked    Boolean   @default(true) @map("is_locked")
     lockedAt    DateTime  @default(now()) @map("locked_at")
     lockedById  String    @map("locked_by_id") @db.VarChar(36)
     unlockedAt  DateTime? @map("unlocked_at")
     unlockedById String?  @map("unlocked_by_id") @db.VarChar(36)
     notes       String?   @db.Text
     createdAt   DateTime  @default(now()) @map("created_at")
     updatedAt   DateTime  @updatedAt @map("updated_at")

     tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     @@unique([tenantId, year, month])
     @@index([tenantId, isLocked])
     @@map("attendance_month_locks")
   }
   ```
4. **`LeaveEncashmentRequest`**:
   ```prisma
   model LeaveEncashmentRequest {
     id          String    @id @default(uuid()) @db.VarChar(36)
     tenantId    String    @map("tenant_id") @db.VarChar(36)
     employeeId  String    @map("employee_id") @db.VarChar(36)
     leaveTypeId String    @map("leave_type_id") @db.VarChar(36)
     type        String    @default("ENCASHMENT") @db.VarChar(20) // ENCASHMENT or COMP_OFF
     days        Decimal   @db.Decimal(5, 2)
     reason      String?   @db.Text
     status      String    @default("PENDING") @db.VarChar(20) // PENDING, APPROVED, REJECTED
     approverId  String?   @map("approver_id") @db.VarChar(36)
     approvedAt  DateTime? @map("approved_at")
     payrollRef  String?   @map("payroll_ref") @db.VarChar(50)
     workedOnDate DateTime? @map("worked_on_date") @db.Date // For comp-off
     createdAt   DateTime  @default(now()) @map("created_at")
     updatedAt   DateTime  @updatedAt @map("updated_at")

     tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
     leaveType LeaveType @relation(fields: [leaveTypeId], references: [id], onDelete: Cascade)
     @@index([tenantId, employeeId, status])
     @@map("leave_encashment_requests")
   }
   ```

### Tenant Model Classification Updates:
Add to `DIRECT_TENANT_MODELS` in `server/src/config/tenant-models.config.ts`:
- `AttendancePolicy`
- `LeavePolicy`
- `AttendanceMonthLock`
- `LeaveEncashmentRequest`

---

## 5. API Architecture Plan

Mount canonical endpoints in `platform-foundation.routes.ts`:
- `/api/v1/hr/attendance/*` -> `server/src/routes/hr-attendance.routes.ts`
- `/api/v1/hr/leave/*` -> `server/src/routes/hr-leave.routes.ts`
- `/api/v1/me/attendance/*` -> `server/src/routes/me-attendance.routes.ts`
- `/api/v1/me/leave/*` -> `server/src/routes/me-leave.routes.ts`
- Preserve legacy `/api/attendance/*`, `/api/leave/*`, `/api/shifts/*`, `/api/timesheets/*`, `/api/biometric/*` for zero breaking changes.

### Key API Endpoint Signatures:

#### 1. Attendance Records & Month Lock (`/api/v1/hr/attendance`)
- `GET /records` (filters: `employeeId, branchId, departmentId, date, month, year, status`, with server pagination & data scope)
- `POST /records` (manual adjustment with required reason, writes `AuditLog`, checks month lock)
- `POST /records/recalculate` (recompute hours/status for date range)
- `GET /records/month-lock` (check status of month)
- `POST /records/month-lock` (lock/unlock month with `year, month, isLocked, notes`, emits `attendance.month_locked`)
- `GET /live` (today punch board: present, absent, late, on_leave, live stream)
- `GET /policies` & `POST /policies` & `PUT /policies/:id` (versioned policies)
- `GET /devices` & `POST /devices` (biometric hardware & geo-fences)
- `GET /overtime` & `POST /overtime/:id/action` (approve/reject overtime)
- `GET /regularizations` & `POST /regularizations/:id/action` (approve/reject regularization)

#### 2. Leave Management (`/api/v1/hr/leave`)
- `GET /applications` (list all tenant leave requests with data scopes)
- `POST /applications` (apply on behalf of employee)
- `POST /applications/:id/action` (approve/reject/cancel with ledger entry creation & attendance status update)
- `GET /balances` (authoritative ledger-backed employee leave balances)
- `POST /balances/adjust` (manual balance adjustment with required reason)
- `POST /balances/accrual-run` (execute policy-driven monthly/yearly accrual)
- `GET /types` & `POST /types` & `PUT /types/:id` (leave types master)
- `GET /policies` & `POST /policies` (leave policies master)
- `GET /calendar` (team leave coverage grid)
- `GET /encashment-compoff` & `POST /encashment-compoff/:id/action` (encashment/comp-off approval)

#### 3. Employee Self-Service (`/api/v1/me/attendance` & `/api/v1/me/leave`)
- `GET /api/v1/me/attendance/records` (own month calendar & attendance logs)
- `POST /api/v1/me/attendance/punch` (server-authoritative check-in & check-out with geo-fence & shift grace validation)
- `GET /api/v1/me/attendance/shifts` (own shift roster & swap requests)
- `POST /api/v1/me/attendance/shifts/swap` (submit swap request to peer)
- `GET /api/v1/me/attendance/policies` (own active policy rules)
- `GET /api/v1/me/attendance/regularizations` (own regularizations)
- `POST /api/v1/me/attendance/regularizations` (submit regularization within policy window)
- `POST /api/v1/me/attendance/regularizations/:id/withdraw` (withdraw pending)
- `GET /api/v1/me/attendance/requests` (unified list of OT, WFH, Comp-off)
- `POST /api/v1/me/attendance/requests` (submit OT, WFH, Comp-off)
- `GET /api/v1/me/leave/applications` (own leave applications)
- `POST /api/v1/me/leave/applications/dry-run` (server dry-run preview before submit)
- `POST /api/v1/me/leave/applications` (submit leave request)
- `POST /api/v1/me/leave/applications/:id/cancel` (cancel pending or approved leave)
- `GET /api/v1/me/leave/balance` (own balances and ledger breakdown)
- `POST /api/v1/me/leave/encashment` (submit encashment request)
- `GET /api/v1/me/leave/team-calendar` (peer leave calendar with privacy filter)

---

## 5. UI Architecture Plan

Build dedicated, premium UIAble routes:
### HR Routes:
- `src/routes/_authenticated/hr/attendance/records.tsx`
- `src/routes/_authenticated/hr/attendance/timesheets.tsx`
- `src/routes/_authenticated/hr/attendance/regularizations.tsx`
- `src/routes/_authenticated/hr/attendance/shifts.tsx`
- `src/routes/_authenticated/hr/attendance/policies.tsx`
- `src/routes/_authenticated/hr/attendance/live.tsx`
- `src/routes/_authenticated/hr/attendance/overtime.tsx`
- `src/routes/_authenticated/hr/attendance/devices.tsx`
- `src/routes/_authenticated/hr/leave/applications.tsx`
- `src/routes/_authenticated/hr/leave/balances.tsx`
- `src/routes/_authenticated/hr/leave/types.tsx`
- `src/routes/_authenticated/hr/leave/policies.tsx`
- `src/routes/_authenticated/hr/leave/calendar.tsx`
- `src/routes/_authenticated/hr/leave/encashment-compoff.tsx`

### Employee Routes:
- `src/routes/_authenticated/me/index.tsx` (Dashboard upgrade with real punch button, timer, shift, leave balances)
- `src/routes/_authenticated/me/dashboard.tsx` (Alias/redirect to `/me`)
- `src/routes/_authenticated/me/attendance/records.tsx`
- `src/routes/_authenticated/me/attendance/timesheet.tsx`
- `src/routes/_authenticated/me/attendance/regularizations.tsx`
- `src/routes/_authenticated/me/attendance/shifts.tsx`
- `src/routes/_authenticated/me/attendance/policies.tsx`
- `src/routes/_authenticated/me/attendance/requests.tsx`
- `src/routes/_authenticated/me/leave/applications.tsx`
- `src/routes/_authenticated/me/leave/balance.tsx`
- `src/routes/_authenticated/me/leave/policies.tsx`
- `src/routes/_authenticated/me/leave/team-calendar.tsx`

---

## 6. Implementation Sequence

```text
Step 1: Database Migration
        ↓ (Add AttendancePolicy, LeavePolicy, AttendanceMonthLock, LeaveEncashmentRequest, enrich models)
Step 2: Tenant Isolation Registration
        ↓ (Update tenant-models.config.ts)
Step 3: Domain Services Implementation
        ↓ (AttendanceCalculationService, LeaveCalculationService, AttendanceMonthLockService)
Step 4: Canonical Backend API Routers
        ↓ (hr-attendance.routes.ts, hr-leave.routes.ts, me-attendance.routes.ts, me-leave.routes.ts)
Step 5: Shared Realtime & Outbox Integration
        ↓ (OutboxEvents: attendance.checked_in, attendance.checked_out, attendance.month_locked, leave.approved, etc.)
Step 6: Frontend Canonical HR Routes
        ↓ (8 attendance routes + 6 leave routes)
Step 7: Frontend Canonical Employee Routes
        ↓ (Dashboard upgrade + 6 attendance routes + 4 leave routes)
Step 8: Navigation Registry Updates
        ↓ (Update src/lib/navigation-registry.ts)
Step 9: Automated Test Suites
        ↓ (Unit, integration, tenant-isolation, month-lock, dry-run, workflow, realtime)
Step 10: Production Build & E2E Verification
        ↓ (npm run build, browser checks)
Step 11: Worklog & Report Update
        ↓ (Update worklog.md, generate P3 implementation report)
Step 12: HARD STOP
```

# END OF P3 DISCOVERY REPORT.
