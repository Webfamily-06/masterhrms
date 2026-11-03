# MASTERHRMS — COMPREHENSIVE WORKFLOW GAP REGISTER

**Document Target:** Business Process Workflows, Approvals, State Machines & Transition Anomalies  
**Date of Audit:** November 3, 2026  
**Status:** COMPLETE WORKFLOW AUDIT (10 Unique Process Vulnerabilities Documented)

---

## 1. REGISTER SUMMARY

| Workflow ID | Process Area | Severity | Defect Classification | Source File & Line |
|---|---|:---:|---|---|
| **WF-GAP-001** | Candidate Conversion | **HIGH** | Missing Mandatory Verification Gate | `server/src/services/recruitment.service.ts:460-495` |
| **WF-GAP-002** | Probation Confirmation | **HIGH** | Disconnected Master Status Mutation | `server/src/services/lifecycle.service.ts:160-195` |
| **WF-GAP-003** | Employee Transfers | **HIGH** | Premature Execution & Missing Approval Chain | `server/src/services/lifecycle.service.ts:250-285` |
| **WF-GAP-004** | Promotion & Salary Revisions | **HIGH** | Future-Date Overwrite & Payroll Assignment Disconnect | `server/src/services/lifecycle.service.ts:200-245` |
| **WF-GAP-005** | Resignation & Notice Period | **MEDIUM** | Inactive Master Status & Missing Notice State | `server/src/services/lifecycle.service.ts:460-515` |
| **WF-GAP-006** | Exit Clearance & Handover | **HIGH** | Unenforced Multi-Department Clearance Gates | `server/src/services/lifecycle.service.ts:540-565` |
| **WF-GAP-007** | Full & Final Settlement (F&F) | **HIGH** | Unlinked Manual Entry & Missing Ledger Settlement | `server/src/services/lifecycle.service.ts:550, 600` |
| **WF-GAP-008** | Disciplinary Warning Appeals | **MEDIUM** | Dead-End Appeal State & Missing Hearing Stage | `server/src/services/lifecycle.service.ts:445-455` |
| **WF-GAP-009** | Attendance Regularization | **CRITICAL** | Month Lock Bypass on Manager Approval | `server/src/routes/employee-self-service.routes.ts:1530-1565` |
| **WF-GAP-010** | Leave Encashment Workflow | **MEDIUM** | Disconnected Payroll Earnings Pipeline | `server/prisma/schema.prisma:584` |

---

## 2. DETAILED WORKFLOW GAP ANALYSIS

### WF-GAP-001: Missing Mandatory Verification Gate in Candidate Conversion
- **Lifecycle Area:** Pre-Onboarding → Employee Creation
- **Severity:** High (P1)
- **Source File & Lines:** `server/src/services/recruitment.service.ts:460-495`
- **Current Behavior:** An HR user can call `convertCandidateToEmployee` at any point once an applicant is created. The function does NOT verify whether:
  1. Mandatory onboarding tasks (`CandidateOnboardingTask`) have been completed.
  2. Proof documents (Aadhaar, PAN, degree certificates) have been verified.
  3. Background verification (`CandidateOnboarding.bgvStatus`) is marked `"verified"`.
  4. The candidate has digitally signed the offer letter (`CandidateOffer.eSignedAt`).
- **Risk:** Unvetted individuals with unverified identities, counterfeit credentials, or failed criminal background checks can be instantiated as active employees in the corporate database.
- **Recommended State Machine:**
  ```mermaid
  stateDiagram-v2
    [*] --> Applied
    Applied --> Interviewing
    Interviewing --> Offered
    Offered --> OfferAccepted: Digital e-Signature
    OfferAccepted --> OnboardingInitiated: BGV & Tasks Created
    OnboardingInitiated --> TasksCompleted: All Mandatory Tasks Uploaded
    TasksCompleted --> BGVVerified: BGV Report Cleared
    BGVVerified --> ConvertedToEmployee: Atomic Employee Provisioning
    ConvertedToEmployee --> [*]
  ```

---

### WF-GAP-002: Disconnected Master Status Mutation in Probation Confirmation
- **Lifecycle Area:** Employee Lifecycle (Probation → Permanent Confirmation)
- **Severity:** High (P1)
- **Source File & Lines:** `server/src/services/lifecycle.service.ts:160-195`
- **Code Evidence:**
  ```typescript
  // In lifecycle.service.ts:
  const updated = await db.probationRecord.update({
    where: { id: probationId },
    data: {
      status: "confirmed",
      performanceRating: performanceRating || probation.performanceRating,
      remarks: remarks || probation.remarks,
      confirmedAt,
    },
  });
  // NOTE: Employee.status is NEVER updated!
  ```
- **Current Behavior:** When an HR administrator confirms an employee's probation via `confirmProbation`, the `probation_records` table updates `status = "confirmed"`. However, the master `employees` table record is left completely untouched. If the employee was created with `status: "probation"`, they remain in `"probation"` indefinitely on the master record!
- **Risk:** Filtered reports, statutory audits, and tenure-based leave eligibility algorithms that query `Employee.status` continue to treat the employee as an unconfirmed probationer.
- **Recommended Fix:** Atomically execute inside the transaction:
  ```typescript
  await tx.employee.update({
    where: { id: probation.employeeId },
    data: { status: "active" },
  });
  ```

---

### WF-GAP-003: Premature Immediate Execution & Missing Multi-Party Approval in Transfers
- **Lifecycle Area:** Organizational Transfers & Relocation
- **Severity:** High (P1)
- **Source File & Lines:** `server/src/services/lifecycle.service.ts:250-285`
- **Current Behavior:** When an HR administrator calls `executeTransfer`, the system creates an `EmployeeTransfer` record with `status: "COMPLETED"` and immediately overwrites `branchId`, `departmentId`, and `managerId` on the `Employee` record on that exact second.
- **Defects Identified:**
  1. **Immediate Execution Regardless of Effective Date:** If a transfer is scheduled with an `effectiveDate` 30 days in the future, the employee's branch and manager are updated immediately today! The employee immediately vanishes from their current manager's attendance and leave approval queue.
  2. **No Multi-Party Approval Workflow:** There is no approval step from the releasing branch manager or acceptance from the receiving branch manager.
- **Recommended State Machine:**
  ```mermaid
  stateDiagram-v2
    [*] --> TransferInitiated: Initiated by HR / Manager
    TransferInitiated --> ReleasingManagerApproved: Current Manager Releases
    ReleasingManagerApproved --> ReceivingManagerAccepted: New Manager Accepts
    ReceivingManagerAccepted --> Scheduled: Awaiting Effective Date
    Scheduled --> Executed: Cron Job on Effective Date Updates Master Record
    Executed --> [*]
  ```

---

### WF-GAP-004: Premature Execution & Payroll Structure Disconnect in Promotions
- **Lifecycle Area:** Promotions, Grade Upgrades & Salary Revisions
- **Severity:** High (P1)
- **Source File & Lines:** `server/src/services/lifecycle.service.ts:200-245`
- **Current Behavior:** `executePromotion` updates `Employee.position` and `Employee.salary` immediately upon invocation, even if `params.effectiveDate` is a future date.
- **Defects Identified:**
  1. **Immediate Overwrite:** If a promotion is scheduled for the next quarter, payroll running this month calculates the new higher wage immediately because it queries `Employee.salary`.
  2. **Payroll Assignment Table Disconnect:** MasterHRMS maintains detailed salary structures in `EmployeeSalaryAssignment` and `EmployeeSalaryItem`. `executePromotion` updates only the raw `Employee.salary` decimal column, completely failing to create a new revision or update `EmployeeSalaryAssignment`. As a result, itemized payslips continue generating wages based on the old broken-down structure!
- **Recommended Fix:** Ensure salary revisions create an effective-dated `EmployeeSalaryAssignment` record and apply master profile updates only when the current date reaches `effectiveDate`.

---

### WF-GAP-005: Missing Notice Period State in Master Employee Lifecycle
- **Lifecycle Area:** Resignation Submission
- **Severity:** Medium (P2)
- **Source File & Lines:** `server/src/services/lifecycle.service.ts:460-515`
- **Current Behavior:** When an employee submits a resignation via `submitResignation`, an `EmployeeExit` record is created with `status: "serving_notice"`. However, `Employee.status` in the master table remains `"active"`.
- **Consequence:** The employee cannot be distinguished from regular employees in the directory, performance appraisal cycles, or long-term project staffing schedules.
- **Recommended Fix:** Update `Employee.status = "notice"` upon resignation approval, preventing their inclusion in new annual performance cycles or multi-year equipment allocations.

---

### WF-GAP-006: Unenforced Multi-Department Clearance Gates in Employee Exit
- **Lifecycle Area:** Employee Offboarding & Exit Finalization
- **Severity:** High (P1)
- **Source File & Lines:** `server/src/services/lifecycle.service.ts:540-565`
- **Code Evidence:**
  ```typescript
  static async finalizeExit(tenantId: string, actorId: string, exitId: string) {
    const exit = await db.employeeExit.findFirst({ where: { id: exitId, tenantId } });
    ...
    // Directly marks exit completed and terminates employee status:
    const updatedExit = await db.employeeExit.update({
      where: { id: exitId },
      data: { status: "completed", fnfSettledAt: now }
    });
    await db.employee.update({ where: { id: exit.employeeId }, data: { status: "terminated" } });
  ```
- **Defect Description:** `finalizeExit` contains zero assertions checking whether the four clearance gates (`itClearance`, `financeClearance`, `hrClearance`, `adminClearance`) or custom `ExitChecklistItem` records are marked completed.
- **Consequence:** An operator can finalize the offboarding process and delete user credentials while company laptops, security badges, and unrecovered financial advances remain outstanding.
- **Recommended Enforcement:**
  ```typescript
  if (!exit.itClearance || !exit.financeClearance || !exit.hrClearance || !exit.adminClearance) {
    throw new Error("Cannot finalize exit: IT, Finance, HR, and Admin clearances must all be completed first.");
  }
  const pendingChecklists = await db.exitChecklistItem.count({
    where: { exitId, isCompleted: false }
  });
  if (pendingChecklists > 0) {
    throw new Error(`Cannot finalize exit: ${pendingChecklists} mandatory checklist items are incomplete.`);
  }
  ```

---

### WF-GAP-007: Unlinked Manual Entry in Full & Final Settlement (F&F)
- **Lifecycle Area:** Separation & Financial Settlement
- **Severity:** High (P1)
- **Source File & Lines:** `server/src/services/lifecycle.service.ts:550, 600`
- **Current Behavior:** `fnfSettlementAmount` on `EmployeeExit` is populated as a manual user-entered or loosely passed numeric value.
- **Defects Identified:** There is no automated settlement calculation engine that derives the F&F statement from ledger records:
  1. **Unavailed Leave Encashment:** Unlinked from `LeaveLedgerEntry`.
  2. **Statutory Gratuity:** Not calculated automatically based on continuous service duration ($\ge 5$ years).
  3. **Notice Shortfall Buyout:** Not reconciled against `noticePeriodDays` vs actual days served.
  4. **Outstanding Advance / Loan Balance:** Not queried from `EmployeeLoan.outstandingAmount`.
- **Recommended Settlement Pipeline:**
  $$\text{Net FNF} = \text{Earned Monthly Salary} + \text{Leave Encashment} + \text{Gratuity} + \text{Bonus} - \text{Notice Shortfall Recovery} - \text{Loan Balance} - \text{TDS}$$

---

### WF-GAP-008: Dead-End State in Disciplinary Warning Appeals
- **Lifecycle Area:** Grievance & Disciplinary Actions
- **Severity:** Medium (P2)
- **Source File & Lines:** `server/src/services/lifecycle.service.ts:445-455`
- **Code Evidence:**
  ```typescript
  static async submitWarningResponse(tenantId: string, employeeId: string, warningId: string, response: string) {
    return await db.disciplinaryWarning.update({
      where: { id: warningId },
      data: {
        employeeResponse: response,
        status: "appealed",
      },
    });
  }
  ```
- **Defect Description:** When an employee submits a response or dispute to a disciplinary warning, the status transitions to `"appealed"`. However, there are NO further endpoints or service methods in the entire backend to process the appeal!
- **Consequence:** The warning remains permanently stuck in `"appealed"` status with no ability for HR or a grievance committee to uphold, modify, or revoke the warning.

---

### WF-GAP-009: Month Lock Bypass on Manager Attendance Regularization Approval
- **Lifecycle Area:** Attendance & Payroll Synchronization
- **Severity:** **CRITICAL (P0)**
- **Source File & Lines:** `server/src/routes/employee-self-service.routes.ts:1530-1565`
- **Code Evidence:**
  ```typescript
  // In employee-self-service.routes.ts:
  if (action === "approve") {
    // Directly mutates Attendance record without checking AttendanceService.assertMonthUnlocked!
    await db.attendance.upsert({
      where: { tenantId_employeeId_date: { tenantId, employeeId: reg.employeeId, date: reg.date } },
      create: { status: "present", checkIn: reg.requestedCheckIn, checkOut: reg.requestedCheckOut, ... },
      update: { status: "present", checkIn: reg.requestedCheckIn, checkOut: reg.requestedCheckOut, ... },
    });
  }
  ```
- **Defect Description:** While direct attendance creation enforces `AttendanceService.assertMonthUnlocked(tenantId, date)`, the manager regularization approval endpoint in Employee Self Service fails to call `assertMonthUnlocked`!
- **Consequence:** A manager can approve an attendance regularization for a date in a historical month that has already been locked, approved, and paid out, silently mutating historical payroll inputs without triggering an arrears run.

---

### WF-GAP-010: Disconnected Leave Encashment & Payroll Earnings Pipeline
- **Lifecycle Area:** Leave Management → Payroll Execution
- **Severity:** Medium (P2)
- **Source File & Lines:** `server/prisma/schema.prisma:584` & `server/src/services/payroll-engine.service.ts`
- **Defect Description:** MasterHRMS contains a `LeaveEncashmentRequest` model in `schema.prisma:584` with fields for `days` and `status`. However, `payroll-engine.service.ts` contains zero references or integration with `LeaveEncashmentRequest`.
- **Consequence:** Approved leave encashments do not flow into the active month's payroll earnings breakdown. Payroll operators must manually calculate the taxable cash value of encashed leaves and key it in as a one-off special allowance.

