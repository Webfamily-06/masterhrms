# MASTERHRMS — Phase 3 (P2) Pre-Implementation Gap Analysis

**Document Version:** 1.0.0  
**Date:** 2026-11-03  
**Review Status:** **PRE-IMPLEMENTATION AUDIT COMPLETE**  
**Target Scope:** Phase 3 (P2) — 12 Engineering Tasks  
**Reference Document:** `docs/hrms-audit/IMPLEMENTATION_EXECUTION_PLAN.md` & `MASTER_IMPLEMENTATION_BACKLOG.md`  

---

## 1. Executive Summary

This pre-implementation gap analysis evaluates the existing codebase against the 12 authorized Phase 3 (P2) engineering tasks. In accordance with the mandate, all existing working code from Phase 0 (P0) and Phase 1 (P1) is preserved, and no parallel duplicate modules are created.

### Task Classification Overview

| Task ID | Task Description | Audit Classification | Primary Affected Files |
|---|---|:---:|---|
| **TASK-P2-01** | Multi-Party Approval Scheduler for Transfers | **Partially Implemented** | `server/src/services/lifecycle.service.ts` |
| **TASK-P2-02** | Versioned `EmployeeSalaryAssignment` on Promotions | **Partially Implemented** | `server/src/services/lifecycle.service.ts`, `payroll-engine.service.ts` |
| **TASK-P2-03** | Automated Full & Final Settlement (F&F) Calculation | **Missing** | `server/src/services/lifecycle.service.ts` |
| **TASK-P2-04** | Address Change Updates in ESS Profile Change Approvals | **Implemented but Defective** | `server/src/routes/employee-self-service.routes.ts` |
| **TASK-P2-05** | Midnight Rollover in Night Shift Punch Checkout | **Implemented but Defective** | `server/src/services/attendance.service.ts` |
| **TASK-P2-06** | Disciplinary Warning Appeal Hearing Workflow | **Partially Implemented** | `server/src/services/lifecycle.service.ts` |
| **TASK-P2-07** | Connect Approved Leave Encashments to Active Payroll | **Missing** | `server/src/services/payroll-engine.service.ts` |
| **TASK-P2-08** | Standardize Component Radii to `rounded-md` | **Implemented but Defective** | `src/components/ui/input.tsx`, `src/components/ui/select.tsx` |
| **TASK-P2-09** | Enforce WCAG 2.1 Touch Target Sizing (44px) | **Implemented but Defective** | `src/components/ui/dropdown-menu.tsx`, `src/components/ui/data-table.tsx` |
| **TASK-P2-10** | Synchronize ApexCharts Theme Modes with Dark Mode | **Missing** | `src/hooks/use-chart-theme.ts` |
| **TASK-P2-11** | Unify Application Z-Index Stacking Architecture | **Implemented but Defective** | `src/styles.css`, `src/components/ui/dialog.tsx` |
| **TASK-P2-12** | Form Submission Loading States & Double-Click Mutexes | **Missing** | `src/components/ui/button.tsx` |

---

## 2. Detailed Task-by-Task Pre-Implementation Audit

### TASK-P2-01: Implement Multi-Party Approval & Effective Date Scheduler for Transfers
- **Original Gap:** `GAP-VAL-018`, `WF-GAP-003`
- **Existing Implementation Discovered:**
  - `model EmployeeTransfer` exists in `schema.prisma` with `status`, `fromBranchId`, `toBranchId`, `fromDeptId`, `toDeptId`, `oldManagerId`, `newManagerId`, `effectiveDate`.
  - `LifecycleService.executeTransfer()` in `lifecycle.service.ts` immediately sets `status = "COMPLETED"` and immediately mutates the `Employee` record, ignoring future effective dates and lacking an approval workflow.
- **Identified Gap:**
  - Transfers cannot be proposed in a `PENDING` state or reviewed by managers.
  - Future-dated transfers immediately mutate employee records today rather than on `effectiveDate`.
- **Proposed Implementation:**
  - Add `requestTransfer()` creating a transfer record with `status: "PENDING"`.
  - Add `approveTransfer(transferId, actorId, role)` supporting manager/HR review.
  - Add `applyDueTransfers()` that applies mutations to `Employee` only when `status = "APPROVED"` and `effectiveDate <= now`.

---

### TASK-P2-02: Versioned `EmployeeSalaryAssignment` on Promotion Execution
- **Original Gap:** `GAP-VAL-020`, `WF-GAP-004`, `GAP-DB-API-005`, `MIGRATE-04-SALARY`
- **Existing Implementation Discovered:**
  - `model EmployeeSalaryAssignment` is defined in `schema.prisma` (lines 788-808) with `ctcAnnual`, `ctcMonthly`, `effectiveFrom`, `effectiveTo`, `isCurrent`, `taxRegime`.
  - However, `LifecycleService.executePromotion()` only mutates `employee.salary` in-place and creates a descriptive `PromotionRecord`. It does NOT create or close versioned `EmployeeSalaryAssignment` records.
  - Furthermore, `payroll-engine.service.ts` reads static `employee.salary` rather than resolving the active salary version for the payroll period.
- **Identified Gap:**
  - Overwriting `employee.salary` destroys compensation history and prevents accurate historical payroll recalculations.
  - Future-dated promotions immediately overwrite current salary.
- **Proposed Implementation:**
  - In `LifecycleService.executePromotion()`, create an `EmployeeSalaryAssignment` with `effectiveFrom = effectiveDate`.
  - Set existing current assignment's `effectiveTo = effectiveDate - 1 day` and `isCurrent = false` if `effectiveDate <= now`.
  - Update `payroll-engine.service.ts` to query `EmployeeSalaryAssignment` effective for the pay period (`effectiveFrom <= periodEnd AND (effectiveTo IS NULL OR effectiveTo >= periodStart)`), falling back to `employee.salary` for unmigrated legacy records.

---

### TASK-P2-03: Automated Full & Final Settlement (F&F) Calculation Pipeline
- **Original Gap:** `GAP-VAL-021`, `WF-GAP-008`
- **Existing Implementation Discovered:**
  - `model EmployeeExit` exists in `schema.prisma` with `fnfSettlementAmount Decimal?`, `fnfSettlementStatus`, `fnfSettledAt`.
  - `LifecycleService.finalizeExit()` simply marks `status: "completed"` without calculating the statutory F&F components.
- **Identified Gap:**
  - No automated calculation of prorated salary, leave encashment, gratuity, notice period shortfall, or loan recovery.
- **Proposed Implementation:**
  - Implement `calculateFnFSettlement(tenantId, employeeId, lastWorkingDay)` in `LifecycleService`:
    $$\text{Prorated Salary} = \frac{\text{Monthly Basic + DA}}{\text{Days in Month}} \times \text{Days Worked}$$
    $$\text{Leave Encashment} = \text{Earned Leave Balance} \times \frac{\text{Basic Salary}}{30}$$
    $$\text{Gratuity} = \begin{cases} \left\lfloor \frac{15 \times \text{Last Drawn Basic} \times \text{Years of Service}}{26} \right\rfloor & \text{if } \text{Tenure} \ge 5 \text{ years} \\ 0 & \text{otherwise} \end{cases}$$
    $$\text{Notice Shortfall} = \text{Shortfall Days} \times \frac{\text{Monthly Gross}}{30}$$
    $$\text{Net F\&F Amount} = \text{Prorated Salary} + \text{Leave Encashment} + \text{Gratuity} - \text{Notice Shortfall} - \text{Loan Balance}$$
  - Record the itemized breakdown on `EmployeeExit` and event logs.

---

### TASK-P2-04: Support Address Change Updates in ESS Profile Change Approvals
- **Original Gap:** Address field omission in ESS workflow
- **Existing Implementation Discovered:**
  - In `server/src/routes/employee-self-service.routes.ts` (lines 1677-1678), `allowedFields` is strictly hardcoded to:
    `["pan", "aadhaar", "uan", "esiNumber", "pfNumber", "bankName", "bankAccount", "bankIfsc", "bankBranch"]`.
- **Identified Gap:**
  - Address fields (`addressLine1`, `addressLine2`, `city`, `district`, `state`, `postalCode`, `permanentAddress`, `presentAddress`) submitted by employees in ESS change requests are silently ignored on approval.
- **Proposed Implementation:**
  - Expand `allowedFields` in `employee-self-service.routes.ts` to include residential and postal address keys.
  - Dynamically write approved address changes to `Employee` master.

---

### TASK-P2-05: Handle Midnight Rollover in Night Shift Punch Checkout
- **Original Gap:** Shift midnight rollover checkout defect
- **Existing Implementation Discovered:**
  - In `server/src/services/attendance.service.ts` line 235:
    `options.type === "check_out"` queries `rawPrisma.attendance.findUnique({ where: { date: today } })`.
- **Identified Gap:**
  - For night shifts starting on Day 1 (e.g., 22:00) and ending on Day 2 (e.g., 06:00), checking out on Day 2 morning fails with `"No check-in recorded for today to check out from."` because the check-in occurred on `today - 1 day`.
- **Proposed Implementation:**
  - If no check-in is found on `today`, check for an open check-in on `yesterday = today - 1 day` where `checkOut IS NULL`.
  - Pair the checkout with the previous day's shift record and accurately calculate total shift duration spanning across midnight.

---

### TASK-P2-06: Disciplinary Warning Appeal Review & Hearing Workflow
- **Original Gap:** `GAP-VAL-022`, `GAP-VAL-025`, `WF-GAP-010`
- **Existing Implementation Discovered:**
  - `LifecycleService.submitWarningResponse()` in `lifecycle.service.ts` sets `status: "appealed"` and stores `employeeResponse`.
  - No method exists for HR/Management to adjudicate or close the appeal.
- **Identified Gap:**
  - Appealed warnings remain permanently in `"appealed"` state, leaving employee records ambiguous.
- **Proposed Implementation:**
  - Implement `LifecycleService.reviewWarningAppeal(tenantId, actorId, warningId, decision, hearingNotes)`:
    - Supported decisions: `"UPHELD"` (remains active warning), `"MODIFIED"` (modified severity), or `"REVOKED"` (dismissed).
    - Record reviewer ID, decision timestamp, and hearing notes.

---

### TASK-P2-07: Connect Approved Leave Encashments to Active Payroll Run
- **Original Gap:** `GAP-VAL-016`
- **Existing Implementation Discovered:**
  - `model LeaveEncashmentRequest` exists in `schema.prisma` with `days`, `status`, `payrollRef`.
  - `payroll-engine.service.ts` does NOT query or include leave encashments in payroll calculations.
- **Identified Gap:**
  - Approved encashment requests are not disbursed or taxed through payroll.
- **Proposed Implementation:**
  - In `payroll-engine.service.ts`, query approved `LeaveEncashmentRequest` where `payrollRef IS NULL` for the employee.
  - Compute taxable encashment amount: $\text{Encashment Days} \times \frac{\text{Basic Salary}}{30}$.
  - Inject as an earnings line item in payslip breakdown and mark `payrollRef = payslip.id`.

---

### TASK-P2-08: Standardize Form Component Border Radius (`GAP-UI-005`)
- **Original Gap:** Visual mismatch between form controls
- **Existing Implementation Discovered:**
  - `src/components/ui/input.tsx` uses `rounded-lg` (8px).
  - `src/components/ui/select.tsx` (`SelectTrigger`) uses `rounded-md` (6px).
- **Identified Gap:**
  - Adjacent Input and Select controls in forms exhibit mismatched curvature and height alignment.
- **Proposed Implementation:**
  - Standardize `Input` in `src/components/ui/input.tsx` to `rounded-md` (matching `SelectTrigger` and `--radius-md`).

---

### TASK-P2-09: Enforce WCAG 2.1 Touch Target Sizing (44px) (`GAP-UI-007`)
- **Original Gap:** Sub-44px touch targets on mobile viewports
- **Existing Implementation Discovered:**
  - `src/components/ui/dropdown-menu.tsx`: `DropdownMenuItem` uses `py-1.5 px-2` (~32px height).
  - `src/components/ui/data-table.tsx`: Pagination buttons use `className="size-7"` (28px height).
- **Identified Gap:**
  - Fails WCAG 2.1 Success Criterion 2.5.5 on mobile touch screens.
- **Proposed Implementation:**
  - In `dropdown-menu.tsx`: Add touch padding `min-h-[44px] md:min-h-0 py-2.5 md:py-1.5 px-3 md:px-2`.
  - In `data-table.tsx`: Update pagination buttons to `h-11 w-11 sm:h-7 sm:w-7 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0`.

---

### TASK-P2-10: Synchronize ApexCharts Theme Modes with Application Dark Mode (`GAP-UI-009`)
- **Original Gap:** Desynchronized charts on dark mode toggle
- **Existing Implementation Discovered:**
  - No reactive chart theming hook exists. Charts fall back to hardcoded light palettes.
- **Identified Gap:**
  - When the user toggles dark mode, chart backgrounds, axes, and grids remain glaring white.
- **Proposed Implementation:**
  - Create `src/hooks/use-chart-theme.ts` exposing `useChartTheme()`:
    - Observes `class` changes on `document.documentElement` (`.dark`).
    - Returns reactive ApexCharts options object (`theme.mode: "dark" | "light"`, themed `grid.borderColor`, `xaxis.labels.style.colors`, `tooltip.theme`).

---

### TASK-P2-11: Unify Application Z-Index Stacking Architecture (`GAP-UI-012`)
- **Original Gap:** Hardcoded arbitrary z-index values (`z-99990`, `z-100000`, `z-1200`)
- **Existing Implementation Discovered:**
  - `src/styles.css` has `z-index: 100000 !important`, `z-index: 99990 !important`.
  - Radix Dialogs (`z-50`) get trapped behind high-z CSS elements.
- **Identified Gap:**
  - Modal dialogues are masked or hidden behind headers or sidebars.
- **Proposed Implementation:**
  - Define 6-tier z-index scale in `src/styles.css`:
    `--z-topbar: 40; --z-drawer: 50; --z-modal: 60; --z-popover: 70; --z-tooltip: 80; --z-toast: 90;`
  - Update Dialog overlays and contents to use `--z-modal` (`z-[60]`) and Toast to `z-[90]`.
  - Clean up extreme CSS z-index overrides.

---

### TASK-P2-12: Form Submission Loading States and Prevent Duplicate Submits (`GAP-UI-013`)
- **Original Gap:** Double-clicking submit triggers concurrent duplicate mutations
- **Existing Implementation Discovered:**
  - `src/components/ui/button.tsx` does not have a `loading?: boolean` prop.
- **Identified Gap:**
  - Rapid double-clicks on submit buttons submit duplicate transactions to the backend.
- **Proposed Implementation:**
  - Add `loading?: boolean` prop to `Button` in `src/components/ui/button.tsx`.
  - When `loading=true`, render a spin icon (`Loader2`), disable clicks (`disabled={disabled || loading}`), and set `aria-busy="true"`.

---

## 3. Pre-Implementation Verification Checklist

| Step | Action Item | Verification Method | Status |
|---|---|---|:---:|
| 1 | Inspect current Git branch & working tree | `git status` | **DONE** |
| 2 | Confirm preservation of all P0 & P1 changes | Code inspection & regression tests | **CONFIRMED** |
| 3 | Read all 12 P2 task acceptance criteria | Audit documentation review | **CONFIRMED** |
| 4 | Map each task to existing codebase files | Pre-Implementation Gap Analysis | **COMPLETE** |
| 5 | Verify zero unauthorized P3/P4 or production tasks | Scope boundary verification | **ENFORCED** |

