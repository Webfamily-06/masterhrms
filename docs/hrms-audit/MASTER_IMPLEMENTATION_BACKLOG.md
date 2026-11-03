# MASTERHRMS — MASTER IMPLEMENTATION BACKLOG

**Document Target:** Prioritized, Deduplicated Remediation & Engineering Roadmap  
**Date of Audit:** November 3, 2026  
**Status:** COMPLETE DEDUPLICATED BACKLOG (43 Tasks across P0/P1/P2/P3 — Lifecycle, Operations, Backend & UI/UX)

---

## 1. BACKLOG OVERVIEW BY PRIORITY

```
+-------------------------------------------------------------+
| P0 — CRITICAL (Immediate Fixes / Statutory, Security & UI)  |  9 Tasks
+-------------------------------------------------------------+
| P1 — HIGH (Core Operational Integrity, Responsive & Tokens) | 17 Tasks
+-------------------------------------------------------------+
| P2 — MEDIUM (Workflows, State Machines, Tables & Overlays)  | 12 Tasks
+-------------------------------------------------------------+
| P3 — LOW (Data Hygiene, Sanitization & Visual Polish)       |  5 Tasks
+-------------------------------------------------------------+
| TOTAL IMPLEMENTATION TASKS                                  | 43 Tasks
+-------------------------------------------------------------+
```

---

## 2. P0: CRITICAL (BLOCKERS — STATUTORY, SECURITY & DATA INTEGRITY)

### TASK-P0-01: Fix Tamil Nadu Professional Tax Slab Inversion & Monthly Proration
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** Advanced Payroll Engine, Statutory Rules
- **Affected Files:**
  - `server/src/services/payroll-engine.service.ts:315-325`
  - `server/src/seeds/statutory-rules.seed.ts:91-96`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Update `calculateProfessionalTax` in `payroll-engine.service.ts`: All Tamil Nadu half-yearly slabs must be divided by 6 (e.g. ₹690 / 6 = ₹115.00/mo, ₹1025 / 6 = ₹170.83/mo, ₹1250 / 6 = ₹208.33/mo).
  2. Verify that an employee earning ₹55,000/month is deducted ₹115/month instead of ₹510/month.
  3. Verify that an employee earning ₹1,00,000/month is deducted ₹208.33/month (or ₹182.50/month under legacy slab).
  4. Update `statutory-rules.seed.ts` configuration pack to reflect accurate monthly proration for Tamil Nadu.

### TASK-P0-02: Eliminate Privilege Escalation Vulnerability on `PUT /api/employees/:id`
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** Core HR, Employee Master, API Security
- **Affected Files:**
  - `server/src/routes/employees.routes.ts:306-410`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Attach `requirePermission("hrm.employees.edit")` middleware to `employeesRouter.put("/:id")`.
  2. Ensure callers without `hr_admin` role or `hrm.employees.edit` permission receive `403 Forbidden`.
  3. Prohibit direct updates to sensitive financial fields (`salary`, `pfEligible`, `esiEligible`) unless the caller holds `payroll_admin` or `hr_admin` role.
  4. Direct standard employee self-updates strictly to `PUT /api/v1/me/profile`.

### TASK-P0-03: Enforce Creation Permission & Seat Quotas on `POST /api/v1/hr/employees`
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** Core HR, Subscription & Licensing, API Security
- **Affected Files:**
  - `server/src/routes/hr-employees.routes.ts:40-60`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Add `requirePermission("hrm.employees.create")` and `requireWithinLimit("seats")` middleware to `hrEmployeesRouter.post("/")`.
  2. Verify that non-HR users receive `403 Forbidden` when attempting atomic employee creation.
  3. Verify that workspaces attempting to exceed their subscription maximum employee capacity receive `402 Payment Required` or `403 Forbidden: Seat limit reached`.

### TASK-P0-04: Eliminate Cross-Tenant Data Contamination in Biometric ADMS Push
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** Attendance & Biometric Integration, Multi-Tenancy
- **Affected Files:**
  - `server/src/routes/biometric.routes.ts:1435-1445`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Remove fallback to `defaultTenant.id` (`rawPrisma.tenant.findFirst()`) in `handleAdmsPush`.
  2. If the pushing device's serial number is unrecognized or unmapped to a tenant, return `401 Unauthorized` with text response `ERROR: UNREGISTERED DEVICE\n`.
  3. Ensure no biometric punches from unauthenticated hardware can be persisted against arbitrary customer tenants.

### TASK-P0-05: Enforce Month Lock Verification on Manager Attendance Regularizations
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** Attendance, Payroll Synchronization
- **Affected Files:**
  - `server/src/routes/employee-self-service.routes.ts:1530-1565`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. In `POST /api/v1/me/team/regularizations/:id/action`, call `await AttendanceService.assertMonthUnlocked(tenantId, reg.date)` prior to executing attendance mutations.
  2. If the target attendance month is locked, reject the approval with `423 Locked: Cannot approve regularization for a locked payroll period`.

### TASK-P0-06: Fix `LeaveRequest.days` Type and Support Half-Day Leave Storage
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** Leave Management, Database Schema
- **Affected Files:**
  - `server/prisma/schema.prisma:492`
  - `server/src/services/leave.service.ts:195`
- **Dependencies:** Database Migration
- **Technical Acceptance Criteria:**
  1. Alter `LeaveRequest.days` in Prisma schema from `Int` to `Decimal(4, 1) @default(1.0)`.
  2. In `leave.service.ts:195`, change `days: Math.max(1, Math.round(dryRun.totalDays))` to `days: dryRun.totalDays`.
  3. Verify that applying for a half-day leave (`halfDay = true`) saves `days: 0.5` in `LeaveRequest` and debits exactly `0.5` days in `LeaveLedgerEntry`.

### TASK-P0-07: Add Native Demographic & Contact Columns to `Employee` Model
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** Employee Master, Database Schema
- **Affected Files:**
  - `server/prisma/schema.prisma:308-438`
  - `server/src/services/employee.service.ts:218-267`
- **Dependencies:** Database Migration
- **Technical Acceptance Criteria:**
  1. Add native columns to `Employee` model: `maritalStatus`, `bloodGroup`, `addressLine1`, `addressLine2`, `city`, `district`, `postalCode`, `emergencyContactName`, `emergencyContactRelationship`, `emergencyContactPhone`.
  2. Update `createEmployeeAtomic` to save `maritalStatus` and demographic fields directly to `Employee` in the primary transaction.
  3. Eliminate silent data loss of `maritalStatus` on employee creation.

### TASK-P0-08: Remediate Dialog Viewport Overflow & Enforce Scrollable Body Globally (`GAP-UI-001`)
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** UI/UX Design System, Modals & Dialogs (All Modules)
- **Affected Files:**
  - `src/components/ui/dialog.tsx:34-45`
  - 223 route consumer dialogs in `src/routes/_authenticated/_app/**/*.tsx`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Refactor base `DialogContent` in `src/components/ui/dialog.tsx` to enforce `flex flex-col max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-hidden sm:rounded-lg`.
  2. Provide a default internal scroll container for dialog bodies (`flex-1 overflow-y-auto px-6 py-4`).
  3. Ensure `DialogFooter` uses `sticky bottom-0 bg-background border-t px-6 py-4` so action buttons (Submit, Cancel) remain visible and clickable across all mobile and small tablet viewports.
  4. Verify that complex multi-field dialogs (Employee Create, Shift Roster, Leave Application) do not clip buttons off-screen when virtual keyboards open on mobile.

### TASK-P0-09: Eliminate Double Padding Squishing on 98 Page Roots (`GAP-UI-002`)
- **Priority:** **P0 (Critical)**
- **Modules Impacted:** Responsive Layout, Page Containers
- **Affected Files:**
  - `src/styles.css:122-132`
  - 98 page root files in `src/routes/_authenticated/_app/**/*.tsx`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Remove redundant `p-6` and `p-4` padding classes from page root wrappers across all 98 audited route files.
  2. Retain outer page padding management exclusively inside `.content` in `src/styles.css` (24px on desktop, 16px on mobile).
  3. Verify that on narrow mobile screens (320px – 375px), total horizontal margin does not exceed 32px (16px left + 16px right), preserving full 288px+ usable width for cards and forms.

---

## 3. P1: HIGH PRIORITY (CORE OPERATIONAL INTEGRITY & VALIDATION GATES)

### TASK-P1-01: Implement Comprehensive Backend Zod Schema Validation on Employee APIs
- **Priority:** **P1 (High)**
- **Modules Impacted:** Core HR, API Security
- **Affected Files:**
  - `server/src/routes/hr-employees.routes.ts`
  - `server/src/services/employee.service.ts`
- **Technical Acceptance Criteria:**
  1. Create Zod validation schema `CreateEmployeeSchema`:
     - PAN regex: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
     - Aadhaar regex: `^[0-9]{12}$`
     - IFSC regex: `^[A-Z]{4}0[A-Z0-9]{6}$`
     - Age check: `dateOfBirth <= now - 18 years`
     - Salary: `z.number().min(0)`
  2. Reject non-compliant requests with structured `400 Bad Request` before database access.

### TASK-P1-02: Fix Attendance Overwrite on Non-Sandwich Leave Approvals
- **Priority:** **P1 (High)**
- **Modules Impacted:** Leave Management, Attendance
- **Affected Files:**
  - `server/src/services/leave.service.ts:340-365`
- **Technical Acceptance Criteria:**
  1. In `LeaveService.decideApplication`, check whether each day in `[startDate, endDate]` is an active working day vs weekend/holiday.
  2. If `sandwichRule = false`, do NOT overwrite weekend or holiday attendance records to `on_leave`. Leave them as `weekly_off` or `holiday`.

### TASK-P1-03: Enforce Employee-Level Authorization in Static Uploads Middleware
- **Priority:** **P1 (High)**
- **Modules Impacted:** File Security, Data Protection (DPDP Act)
- **Affected Files:**
  - `server/src/middleware/uploads-security.middleware.ts:75-115`
- **Technical Acceptance Criteria:**
  1. In addition to tenant verification, check whether the caller is an HR admin or the owner of the requested file (`mediaFile.uploadedById === employeeId` or document recipient).
  2. Return `403 Forbidden` if an employee attempts to access another employee's confidential medical, tax, or disciplinary documents.

### TASK-P1-04: Remove Default Public Upload Whitelist Exposure in `media.routes.ts`
- **Priority:** **P1 (High)**
- **Modules Impacted:** Media Library, Document Security
- **Affected Files:**
  - `server/src/routes/media.routes.ts:30`
- **Technical Acceptance Criteria:**
  1. Default `folder` parameter to `"tenant/documents"` instead of `"system/branding"`.
  2. Restrict upload targeting `"system/branding"` strictly to users with the `super_admin` role.

### TASK-P1-05: Map Statutory Identifiers from Onboarding Tasks in Candidate Conversion
- **Priority:** **P1 (High)**
- **Modules Impacted:** Recruitment, Pre-Onboarding
- **Affected Files:**
  - `server/src/services/recruitment.service.ts:500-525`
- **Technical Acceptance Criteria:**
  1. In `convertCandidateToEmployee`, extract verified PAN, Aadhaar, UAN, and Bank account numbers from completed `CandidateOnboardingTask` items.
  2. Pass extracted identifiers into `EmployeeService.createEmployeeAtomic` so the new employee is initialized with complete statutory records.

### TASK-P1-06: Enforce Onboarding & Background Verification (BGV) Gates Before Conversion
- **Priority:** **P1 (High)**
- **Modules Impacted:** Recruitment, Pre-Onboarding
- **Affected Files:**
  - `server/src/services/recruitment.service.ts:460-490`
- **Technical Acceptance Criteria:**
  1. Require `candidate.onboarding.bgvStatus === "verified"` prior to allowing conversion.
  2. Verify all mandatory onboarding tasks are completed (`isMandatory === true && status === "completed"`).
  3. Provide an explicit override flag (`forceConvert: true`) requiring an elevated HR director role.

### TASK-P1-07: Enforce Department Clearances Prior to Employee Exit Finalization
- **Priority:** **P1 (High)**
- **Modules Impacted:** Separation & Offboarding
- **Affected Files:**
  - `server/src/services/lifecycle.service.ts:540-565`
- **Technical Acceptance Criteria:**
  1. In `finalizeExit`, assert that `itClearance`, `financeClearance`, `hrClearance`, and `adminClearance` are all `true`.
  2. Assert that all `ExitChecklistItem` records for the exit case are marked completed.
  3. Throw `400 Bad Request` if clearances remain incomplete.

### TASK-P1-08: Complete User Session Invalidation and Account Deactivation on Exit
- **Priority:** **P1 (High)**
- **Modules Impacted:** Separation, User Security
- **Affected Files:**
  - `server/src/services/lifecycle.service.ts:560-565`
- **Technical Acceptance Criteria:**
  1. Update `User.status = "inactive"` for the exited employee.
  2. Delete all active `DeviceSession` records associated with the user ID.
  3. Invoke `invalidateAuthCache(userId)` to invalidate active JWT session tokens immediately.

### TASK-P1-09: Add Geographic Coordinates to `Branch` and Implement Dynamic Branch Geofencing
- **Priority:** **P1 (High)**
- **Modules Impacted:** Attendance, Organization
- **Affected Files:**
  - `server/prisma/schema.prisma:4409`
  - `server/src/services/attendance.service.ts:207-215`
- **Technical Acceptance Criteria:**
  1. Add `latitude Float?`, `longitude Float?`, and `geofenceRadius Int? @default(500)` to `Branch` model.
  2. In `recordPunch`, resolve coordinates from `employee.branch` instead of hardcoding Mumbai coordinates.
  3. Accurately flag out-of-perimeter punches against the employee's assigned branch location.

### TASK-P1-10: Update Tamil Nadu Labour Welfare Fund (LWF) Statutory Seed Rates
- **Priority:** **P1 (High)**
- **Modules Impacted:** Statutory Rules, Payroll
- **Affected Files:**
  - `server/src/seeds/statutory-rules.seed.ts:228-242`
- **Technical Acceptance Criteria:**
  1. Update Tamil Nadu LWF rule: `employeeContribution: 20` and `employerContribution: 40` (total ₹60).
  2. Verify December annual deduction runs reflect the ₹20/₹40 rates.

### TASK-P1-11: Reconcile Statutory Form Generator (Form U, V, W, X, S) with Operational Records
- **Priority:** **P1 (High)**
- **Modules Impacted:** Statutory Compliance, Reporting
- **Affected Files:**
  - `server/src/services/statutory-form-data.service.ts`
  - `docs/payroll/PAYROLL_EXCEL_APPLICATION_GAP_AUDIT.md`
- **Technical Acceptance Criteria:**
  1. Form V daily overtime hours must be aggregated from approved `OvertimeRequest` items.
  2. Form X leave registers must be populated directly from `LeaveLedgerEntry`.
  3. Form W wages register must reflect final net wages from `Payslip`.

### TASK-P1-12: Migrate 552 Hardcoded Hex Colors to Authoritative OKLCH Theme Tokens (`GAP-UI-003`)
- **Priority:** **P1 (High)**
- **Modules Impacted:** Design System, Theming, Dark Mode
- **Affected Files:**
  - 552 occurrences across `src/routes/` and `src/components/` (e.g. `meetings.tsx`, `leave-types.tsx`, `print-template.tsx`)
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Replace raw hex color codes (`#6366f1`, `#3B82F6`, `#111827`, `#EF4444`, `#10B981`) with Tailwind semantic color tokens (`bg-primary`, `text-primary-foreground`, `bg-card`, `text-card-foreground`, `border-border`).
  2. Ensure all screens and cards render with high-contrast, legible typography and appropriate surface colors in both Light Mode (`:root`) and Dark Mode (`.dark`).
  3. Verify zero un-themed white boxes or unreadable low-contrast text in dark mode.

### TASK-P1-13: Purge Inline `SYSTEM_FONT_STACK` and Inherit Root Typography in File Manager (`GAP-UI-004`)
- **Priority:** **P1 (High)**
- **Modules Impacted:** Root Typography, File Manager Subsystem
- **Affected Files:**
  - `src/components/apps/file-manager/file-manager.tsx:28`
  - 53 instances across `src/components/apps/file-manager/**/*.tsx`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Remove `const SYSTEM_FONT_STACK` constant and all inline `style={{ fontFamily: SYSTEM_FONT_STACK }}` props from File Manager components.
  2. Allow components to naturally inherit the global root font family (`"Public Sans"`) declared in `src/styles.css`.
  3. Verify visual consistency between File Manager typography and the rest of the MasterHRMS application.

### TASK-P1-14: Harmonize `SelectTrigger` Font Size to Prevent iOS Safari Auto-Zoom (`GAP-UI-006`)
- **Priority:** **P1 (High)**
- **Modules Impacted:** Shared Form Controls, Mobile UX
- **Affected Files:**
  - `src/components/ui/select.tsx:43`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Update `SelectTrigger` className from fixed `text-sm` (14px) to responsive `text-base md:text-sm` (16px on mobile, 14px on desktop).
  2. Verify on iOS Safari that tapping select dropdowns in forms does not trigger automatic viewport zoom or UI displacement.

### TASK-P1-15: Implement Sticky Column Freezing on High-Density Data Tables for Mobile Viewports (`GAP-UI-008`)
- **Priority:** **P1 (High)**
- **Modules Impacted:** Data Tables, Responsive UX (Employees, Payroll, Attendance)
- **Affected Files:**
  - `src/components/ui/table.tsx:8`
  - `src/components/ui/data-table.tsx`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Add optional sticky pin support to table headers and cells:
     - Primary identifier column (e.g. Employee Name / Code) frozen to `sticky left-0 bg-card z-10`.
     - Action menu column frozen to `sticky right-0 bg-card z-10`.
  2. On mobile screens (320px – 768px), horizontal scrolling keeps row context and row actions permanently visible.

### TASK-P1-16: Harmonize Viewport Breakpoint Threshold between JS `use-mobile` and CSS Media Queries (`GAP-UI-011`)
- **Priority:** **P1 (High)**
- **Modules Impacted:** Responsive Shell, Navigation Drawer
- **Affected Files:**
  - `src/hooks/use-mobile.tsx:5`
  - `src/styles.css:101-118`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Harmonize threshold across JavaScript and CSS: Align `MOBILE_BREAKPOINT = 1024` in `use-mobile.tsx` to match the CSS `@media (max-width: 1023.98px)` media query threshold.
  2. Eliminate layout collisions on portrait tablets (768px – 1023px) where JS previously assumed desktop while CSS hid the sidebar.

### TASK-P1-17: Replace Monolithic `DreamsSidebar` with Typed `PortalSidebar` in Application Shell (`GAP-UI-010`)
- **Priority:** **P1 (High)**
- **Modules Impacted:** Navigation Architecture, Application Shell
- **Affected Files:**
  - `src/routes/_authenticated/_app/route.tsx:162`
  - `src/components/dreams-sidebar.tsx`
  - `src/components/navigation/portal-sidebar.tsx`
  - `src/nav/hr-sidebar.ts`
  - `src/nav/employee-sidebar.ts`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Replace `DreamsSidebar` import and usage in `AppShell` with `PortalSidebar`.
  2. Drive navigation rendering via `hr-sidebar.ts` (Admin mode) and `employee-sidebar.ts` (Self Service mode) with active RBAC filtering.
  3. Purge non-HRMS legacy routes (`/deals`, `/estimates`, `/sales-invoices`) from primary navigation.
  4. Archive `src/components/dreams-sidebar.tsx` to reduce codebase bloat by 2,508 lines.

---

## 4. P2: MEDIUM PRIORITY (WORKFLOWS, STATE MACHINES & DATA FLOWS)

### TASK-P2-01: Implement Multi-Party Approval & Effective Date Scheduler for Transfers
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Transfers, Organizational Relocation
- **Affected Files:**
  - `server/src/services/lifecycle.service.ts:250-285`
- **Technical Acceptance Criteria:**
  1. Transition `EmployeeTransfer` from `PENDING` to `APPROVED` upon dual manager signoff.
  2. Schedule master record mutation to trigger on `effectiveDate` via background scheduler.

### TASK-P2-02: Versioned `EmployeeSalaryAssignment` on Promotion Execution
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Promotions, Payroll
- **Affected Files:**
  - `server/src/services/lifecycle.service.ts:200-245`
- **Technical Acceptance Criteria:**
  1. In `executePromotion`, create a new effective-dated `EmployeeSalaryAssignment` record.
  2. Apply salary changes to `Employee.salary` only when `effectiveDate <= now`.

### TASK-P2-03: Implement Automated Full & Final Settlement (F&F) Calculation Pipeline
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Separation, Payroll
- **Affected Files:**
  - `server/src/services/lifecycle.service.ts:600`
  - `server/prisma/schema.prisma:2284`
- **Technical Acceptance Criteria:**
  1. Auto-calculate F&F statement: $\text{Prorated Salary} + \text{Leave Encashment} + \text{Gratuity} - \text{Notice Shortfall} - \text{Loans}$.
  2. Store discrete breakdown values on `EmployeeExit`.

### TASK-P2-04: Support Address Change Updates in ESS Profile Change Approvals
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Employee Self Service, Core HR
- **Affected Files:**
  - `server/src/routes/employee-self-service.routes.ts:1665-1678`
- **Technical Acceptance Criteria:**
  1. Include `addressLine1`, `addressLine2`, `city`, `district`, `state`, and `postalCode` in `allowedFields`.
  2. Update employee master address fields upon change request approval.

### TASK-P2-05: Handle Midnight Rollover in Night Shift Punch Checkout
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Attendance, Shifts
- **Affected Files:**
  - `server/src/services/attendance.service.ts:220-235`
- **Technical Acceptance Criteria:**
  1. For night shifts crossing midnight, check for existing check-ins on `today - 1 day`.
  2. Accurately pair check-in on Day 1 with checkout on Day 2 morning.

### TASK-P2-06: Disciplinary Warning Appeal Review & Hearing Workflow
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Disciplinary Records, HR Operations
- **Affected Files:**
  - `server/src/services/lifecycle.service.ts:445-455`
- **Technical Acceptance Criteria:**
  1. Provide HR appeal review action: `UPHELD`, `MODIFIED`, or `REVOKED`.
  2. Prevent warnings from remaining indefinitely in `"appealed"` status.

### TASK-P2-07: Connect Approved Leave Encashments to Active Payroll Run
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Leave Management, Payroll Engine
- **Affected Files:**
  - `server/src/services/payroll-engine.service.ts`
- **Technical Acceptance Criteria:**
  1. Query approved `LeaveEncashmentRequest` items for the target payroll month.
  2. Include encashment cash value as a taxable earnings item in payslip breakdown.

### TASK-P2-08: Standardize Form Component Border Radius (`GAP-UI-005`)
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Shared Form Components (`Input`, `Select`)
- **Affected Files:**
  - `src/components/ui/input.tsx:18`
  - `src/components/ui/select.tsx:43`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Standardize corner radii: Update `Input` from `rounded-lg` (8px) to `rounded-md` (6px) or synchronize both to the global `--radius-md` design token.
  2. Ensure identical curvature and height alignment when `Input` and `SelectTrigger` are displayed adjacent to each other.

### TASK-P2-09: Enforce WCAG 2.1 Touch Target Sizing (44px) on Action Menus & Pagination (`GAP-UI-007`)
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Mobile Usability, Accessibility
- **Affected Files:**
  - `src/components/ui/dropdown-menu.tsx:75`
  - `src/components/ui/data-table.tsx`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Adjust `DropdownMenuItem` padding on touch viewports: `py-2.5 px-3 md:py-1.5 md:px-2`.
  2. Enlarge mobile table pagination buttons to `min-h-[44px] min-w-[44px]` (or `h-10 w-10 sm:h-8 sm:w-8`).
  3. Comply with WCAG 2.1 Success Criterion 2.5.5 (Target Size).

### TASK-P2-10: Synchronize ApexCharts Theme Modes with Application Dark Mode (`GAP-UI-009`)
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Visual Theming, Dashboard & Analytics
- **Affected Files:**
  - `src/components/dashboard/*.tsx`
  - `src/routes/_authenticated/_app/dashboard/analytics.tsx`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Create a reactive chart configuration hook (`useChartTheme()`) that tracks the `.dark` class on `document.documentElement`.
  2. Update `chart.theme.mode = isDark ? "dark" : "light"` and inject theme tokens for grid borders, axis labels, and tooltips.
  3. Verify charts re-render cleanly on theme toggle without losing current filter state.

### TASK-P2-11: Unify Application Z-Index Stacking Architecture (`GAP-UI-012`)
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** CSS Architecture, Overlay Management
- **Affected Files:**
  - `src/styles.css`
  - `src/components/ui/dialog.tsx`
  - `src/components/ui/sheet.tsx`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Define a strict 6-tier z-index scale in `src/styles.css`:
     `--z-topbar: 40; --z-drawer: 50; --z-modal: 60; --z-popover: 70; --z-tooltip: 80; --z-toast: 90;`
  2. Migrate hardcoded `z-900`, `z-1000`, `z-99990`, `z-100000` to design tokens.
  3. Prevent dialogs from getting masked behind mobile slide navigation drawers.

### TASK-P2-12: Standardize Form Submission Loading States and Prevent Duplicate Submits (`GAP-UI-013`)
- **Priority:** **P2 (Medium)**
- **Modules Impacted:** Shared Form Components, Mutation Integrity
- **Affected Files:**
  - `src/components/ui/button.tsx`
  - Multiple form modals in `src/routes/`
- **Dependencies:** None
- **Technical Acceptance Criteria:**
  1. Add `loading?: boolean` prop to `Button` component with automatic `Loader2` spin icon and `disabled={loading}` mutex enforcement.
  2. Integrate loading buttons across all employee lifecycle mutation forms.
  3. Verify that rapid double-clicks on slow mobile connections do not dispatch duplicate POST/PUT requests.

---

## 5. P3: LOW PRIORITY (DATA HYGIENE, SANITIZATION & RETENTION)

### TASK-P3-01: Shift Creation Time Format & Duration Validation
- **Priority:** **P3 (Low)**
- **Modules Impacted:** Shifts & Rosters
- **Affected Files:** `server/src/routes/shifts.routes.ts:50-80`
- **Technical Acceptance Criteria:** Validate `startTime` and `endTime` match `^([01]\d|2[0-3]):[0-5]\d$`.

### TASK-P3-02: Standardize Phone and Address Input Formatting
- **Priority:** **P3 (Low)**
- **Modules Impacted:** Employee Master, Communication
- **Affected Files:** `server/src/services/employee.service.ts:224`
- **Technical Acceptance Criteria:** Standardize phone numbers to E.164 format (`+91...`).

### TASK-P3-03: Replace `onDelete: Cascade` with Soft Deletion for Statutory Logs
- **Priority:** **P3 (Low)**
- **Modules Impacted:** Relational Integrity, Statutory Compliance
- **Affected Files:** `server/prisma/schema.prisma`
- **Technical Acceptance Criteria:** Add `deletedAt DateTime?` on `Employee` model and preserve historical exit, transfer, and disciplinary records.

### TASK-P3-04: Standardize Empty State Illustrations and Layouts Across Modules (`GAP-UI-014`)
- **Priority:** **P3 (Low)**
- **Modules Impacted:** Visual Polish, Empty States
- **Affected Files:**
  - `src/components/ui/empty-state.tsx`
  - Route views (Leaves, Assets, Documents, Grievances)
- **Technical Acceptance Criteria:**
  1. Implement a shared `<EmptyState title="..." description="..." icon={...} action={...} />` component.
  2. Replace ad-hoc empty divs and raw text messages with the unified component.

### TASK-P3-05: Add Textarea Resize Constraints and Character Limit Indicators (`GAP-UI-015`)
- **Priority:** **P3 (Low)**
- **Modules Impacted:** Shared Form Controls (`Textarea`)
- **Affected Files:**
  - `src/components/ui/textarea.tsx`
  - Form routes with multiline text (Reason for Leave, Exit Feedback, Disciplinary Explanations)
- **Technical Acceptance Criteria:**
  1. Add `maxLength` and optional character counter badge to `Textarea`.
  2. Prevent horizontal resize overflow by enforcing `resize-y min-h-[80px]` by default.

