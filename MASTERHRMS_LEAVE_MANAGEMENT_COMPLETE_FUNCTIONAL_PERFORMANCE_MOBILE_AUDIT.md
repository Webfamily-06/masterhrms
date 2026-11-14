# MASTERHRMS — Leave Management Complete Functional, Performance, Mobile Responsiveness & Employee Self-Service Integration Audit Report

> **Acceptance Status: 100% VERIFIED & COMPLETE (`183 / 183` Automated Checks Passed | `0` Failures | `tenant-default-001` 100% Untouched)**
> All four HR Leave Management pages (`/hr/leave/types`, `/hr/leave/policies`, `/hr/leave/balances`, `/hr/leave/applications`) and all Employee Self-Service Leave surfaces (`/me/leave/applications`, `/me/leave/balance`, `/me/leave/policies`, `/me/leave/team-calendar`, `/me/leave`, `/me/approvals`, `/employee-dashboard`) have been audited and repaired end-to-end across **Next.js 15 CMS (`:3000`)**, **TanStack Start (`:5173`)**, **Express API (`:4000`)**, **Prisma ORM**, and **Supabase PostgreSQL 17**.

---

## 1. Executive Summary

- **Complete HR Leave CRUD Repaired:** All create, view, edit, activate/deactivate, smart dependency-aware delete, balance sync, manual credit/debit adjustment, ledger inspection, application submission, edit-pending, manager/HR approve, reject, cancel/withdraw, and decision-reversal workflows operate against real PostgreSQL transactions with zero mock or placeholder records.
- **Real-Time Dynamic HR -> Employee Self-Service Integration:** Every Leave Type, Leave Policy, Probation rule, Half-Day rule, Sandwich rule, Accrual sync, and Manual Balance Adjustment configured by HR is immediately reflected in Employee Self-Service without hardcoded fallbacks.
- **Major Latency & Waterfall Reductions (Remote Supabase PostgreSQL):**
  - HR Leave API `p50` latency dropped by **42.4% – 71.8%** (`p95` dropped by **64.5% – 89.2%**), bringing `HR Leave Types` to **`230ms`**, `HR Leave Policies` to **`268ms`**, `HR Leave Balances` to **`483ms`**, `HR Leave Matrix` to **`394ms`**, and `HR Leave Applications` to **`586ms`**.
  - End-to-end usable browser render time across the four HR Leave pages dropped by **37.6% – 50.2%** (`4.04s–4.50s` down to **`2.23s–2.54s`**) while cutting **4–6 redundant API calls per page load**.
- **Zero-Overflow Mobile Responsiveness & Dark/Light Theme Fidelity:** Tested across **`360px`, `390px`, `430px`, `768px`, `1024px`, and `1440px`** (`42 / 42` viewport checks with `scrollWidth <= innerWidth`), stacked mobile cards, agenda views, `>= 40px` touch targets, viewport-safe modals, and full Light/Dark theme contrast parity.
- **Strict RBAC, Concurrency & Tenant Isolation:** Enforced segregation of duties (no self-approval), manager reporting-line scope, `404` cross-tenant isolation, atomic `updateMany(..., status: "pending")` double-approval protection (`409 Conflict`), `SELECT ... FOR UPDATE` row-locked balance adjustments, and append-only `LeaveLedgerEntry` audit trails.

---

## 2. Discovered Architecture

| Architectural Layer | Next.js 15 CMS (`CMS/`) | TanStack Start (`src/`) | Backend & Database (`server/`) |
| :--- | :--- | :--- | :--- |
| **Leave Types** | `CMS/src/app/(workspace)/hr/leave/types/page.tsx` | `src/routes/_authenticated/hr/leave/types.tsx` | `GET/POST/PUT/DELETE /api/v1/hr/leave/types`, `GET /types/:id/dependencies` in `server/src/routes/hr-leave.routes.ts` |
| **Leave Policies** | `CMS/src/app/(workspace)/hr/leave/policies/page.tsx` | `src/routes/_authenticated/hr/leave/policies.tsx` | `GET/POST/PUT/DELETE /api/v1/hr/leave/policies` in `server/src/routes/hr-leave.routes.ts` |
| **Leave Balances & Ledger** | `CMS/src/app/(workspace)/hr/leave/balances/page.tsx` | `src/routes/_authenticated/hr/leave/balances.tsx` | `GET /balances`, `POST /balances/sync`, `POST /balances/adjust`, `GET /ledger` in `server/src/routes/hr-leave.routes.ts` |
| **Leave Applications & Matrix** | `CMS/src/app/(workspace)/hr/leave/applications/page.tsx` | `src/routes/_authenticated/hr/leave/applications.tsx` | `GET /matrix`, `GET/POST /applications`, `PUT /:id`, `POST /validate`, `/:id/approve`, `/:id/reject`, `/:id/cancel`, `/:id/reverse` |
| **ESS Leave Suite** | `CMS/src/app/(workspace)/me/leave/{applications,balance,policies,team-calendar}/page.tsx` | `src/routes/_authenticated/me/leave/{applications,balance,policies,team-calendar}.tsx` | `server/src/routes/me-leave.routes.ts`, `server/src/routes/employee-self-service.routes.ts`, `server/src/services/leave.service.ts` |

---

## 3. Root Causes Found on Each Page

1. **`/hr/leave/types`:**
   - Validation rejected `0`-day Unpaid Leave (`daysPerYear <= 0`).
   - `halfDayAllowed` and `sandwichRule` schema fields were omitted from the HR modal.
   - Deleting a referenced Leave Type failed without dependency inspection (`LeaveRequest`, `LeaveLedgerEntry`, `LeavePolicy`, `LeaveEncashmentRequest`) or a safe-deactivation prompt.
   - Duplicate Leave Type name/code returned `400` instead of `409 Conflict`.
   - Un-debounced search fired queries on every keystroke, and Dark Mode lacked `dark:` surface/text contrast tokens.

2. **`/hr/leave/policies`:**
   - Injected synthetic hardcoded mock rows (`id.startsWith("fp-")`, `"Annual Privilege Policy"`, `"Medical & Sick Policy"`, `"Casual Leave Policy"`) when DB rows were sparse and blocked edits on them.
   - `minDays` and `halfDayAllowed` were dropped on save instead of persisting, and `carryForward` vs `maxCarryForwardDays` payload naming caused carry-forward updates via `carryForward` to be ignored.
   - `leaveTypeId` filter dropdown was not wired to query params, and status tab counts were computed from already-filtered client arrays.

3. **`/hr/leave/balances`:**
   - Read-only table with **no Manual Balance Adjustment (`CREDIT`/`DEBIT`) UI** and **no Immutable Leave Ledger viewer**.
   - `Math.round()` truncated `0.5` half-day balances into misleading whole integers.
   - Fired a redundant `/api/v1/hr/employees?limit=500` request alongside `/hr/leave/balances`.
   - `Sync Balances` lacked strict per-year idempotency checks.

4. **`/hr/leave/applications`:**
   - Fell back to hardcoded legend types (`SL`, `CL`, `EL`, `WFH`) while Leave Types loaded.
   - Missing **Edit Pending Application**, **Half-Day session (`FIRST_HALF`/`SECOND_HALF`)**, **Supporting Document upload**, and **Reverse Decision (`POST /reverse`)**.
   - `SandwichLeaveService` queried `status: { notIn: ["rejected", "cancelled"] }` instead of `status: "approved"`, allowing pending leaves to trigger false sandwich bridges.
   - Concurrent approvals lacked atomic `status: "pending"` state-transition guards.

5. **Employee Self-Service (`/me/leave/*`) & Route Guards:**
   - **Critical `api.get()` Unwrapping Bug:** `api.get()` returns parsed JSON directly, so ESS pages reading `res.data` received `undefined` and rendered empty states or hardcoded strings (`"2 Days"`, `"14 Days"`, `"Corporate Leave Policy"`, `"18 Days"`).
   - ESS Apply Leave stored browser-only `URL.createObjectURL(file)` (`blob:...`) instead of uploading attachments to server storage, and `uploads-security.middleware.ts` blocked direct reporting managers from inspecting subordinate attachments.
   - TanStack Start `src/routes/_authenticated/hr.tsx` and `me.tsx` ran `evaluateRouteAccess()` during SSR where `localStorage` is absent, causing direct URL navigation/refresh on `:5173` to redirect to `/auth`.

6. **Global Auth & Config Waterfalls:**
   - `requirePermission` in `server/src/middleware/auth.ts` ran un-cached sequential Prisma queries (`deviceSession` + `roleAssignment` + `tenantModule`) on every API request (`~400–600ms` overhead against remote Supabase).
   - `/api/v1/app-config` and `/api/v1/auth/me` executed 4–5 independent Prisma reads sequentially instead of via `Promise.all`.

---

## 4. Leave Types Fixes (`/hr/leave/types`)

- **Full CRUD + Unpaid & Rule Toggles:** Supports Paid & `0`-day Unpaid Leave (`Loss of Pay`), `code` normalization, color picker, `carryForward`, `halfDayAllowed`, `sandwichRule`, and `active`/`inactive` status across Next.js CMS and TanStack Start.
- **Duplicate Conflict Handling (`409`):** Case-insensitive duplicate `name` or `code` within the same `tenantId` returns HTTP `409 Conflict` (`DUPLICATE_LEAVE_TYPE`).
- **Smart Dependency-Safe Deletion Modal:** Queries `GET /api/v1/hr/leave/types/:id/dependencies` before deletion. Unreferenced Leave Types can be permanently deleted; referenced Leave Types (`hasDependencies: true`) display exact reference counts (`leaveRequests`, `ledgerEntries`, `leavePolicies`, `encashmentRequests`) and provide a one-click **Deactivate Leave Type Instead** action while `DELETE` enforces HTTP `400` (`LEAVE_TYPE_IN_USE`) on the server.
- **Search, Sort & Pagination:** `280ms` debounced search, sortable columns (`name`, `daysPerYear`, `createdAt`), server-side pagination, and cross-surface React Query cache invalidation.

---

## 5. Leave Policies Fixes (`/hr/leave/policies`)

- **Eliminated All Mock `fp-*` Policies:** Removed every synthetic fallback policy row in both Next.js CMS and TanStack Start.
- **Complete Rule Persistence Without Destructive Schema Changes:** `LeaveService.parsePolicyRules` and `serializePolicyRules` persist `minDays`, `halfDayAllowed`, and `blackout` inside `LeavePolicy.blackoutDates` JSON while remaining 100% backward-compatible with legacy comma-separated blackout strings. Both `maxCarryForwardDays` and `carryForward` payload keys are accepted and returned consistently.
- **Server-Side Rule Validation:** Validates `minDays <= maxConsecutiveDays`, `effectiveFrom <= effectiveTo`, valid same-tenant `leaveTypeId`, and single default policy per Leave Type (or global default).
- **Accurate Filtering & View/Delete Modals:** Wired `leaveTypeId` filter, independent status tab counts (`All`, `Active`, `Inactive`), full Policy View modal, Edit modal, and Deactivate/Delete confirmation modal.

---

## 6. Leave Balances Fixes (`/hr/leave/balances`)

- **Constant-Query Bulk Balance Engine:** `LeaveService.getBulkEmployeeDetailedBalances` computes `openingBalance`, `accrued`, `carryForward`, `manualCredits`, `manualDebits`, `encashments`, `used`, `pending`, and `available` across paginated employees in **3 constant queries** (`0` N+1 loops) and preserves exact `0.5` half-day decimals via `formatLeaveDays`.
- **Year-Scoped Idempotent `Sync Balances`:** `POST /api/v1/hr/leave/balances/sync` checks existing annual `ACCRUAL` entries for the target year before inserting missing entitlements—running Sync twice creates **`0` duplicate ledger rows**.
- **Row-Locked Manual Balance Adjustment (`CREDIT` / `DEBIT`):** `POST /api/v1/hr/leave/balances/adjust` acquires a PostgreSQL row lock (`SELECT id FROM "Employee" ... FOR UPDATE`), validates non-negative resulting balance unless explicitly overridden, requires a mandatory audit reason, and appends an immutable `LeaveLedgerEntry` + `AuditLog`.
- **Interactive Immutable Ledger Modal:** Clicking **Ledger** on any employee row opens their chronological transaction history (`ACCRUAL`, `CREDIT`, `DEBIT`, `CARRY_FORWARD`, `ENCASHMENT`) with actor attribution, timestamps, audit notes, and running balance.

---

## 7. Leave Applications Fixes (`/hr/leave/applications`)

- **Unified Matrix + All-Requests Views:** Removed hardcoded legend fallbacks (`SL/CL/EL/WFH`) and redundant `/hr/employees` fetches; added mobile agenda cards (`< md`) alongside the desktop calendar matrix and full filterable/sortable request table.
- **Create & Edit Pending Modal + Authoritative Dry-Run Preview:** Supports Full-Day and Half-Day (`FIRST_HALF` / `SECOND_HALF`), live server dry-run (`POST /api/v1/hr/leave/applications/validate`) displaying working days, sandwich bridge days, holidays excluded, and projected remaining balance, plus real attachment upload (`/api/v1/uploads/leave-document`).
- **Atomic Lifecycle Transitions & Decision Reversal:**
  - **Approve:** Atomic `updateMany` (`where: { id, tenantId, status: "pending" }`) prevents double-approval under concurrency (`409 Conflict`), posts a single `DEBIT` ledger entry, and syncs `AttendanceRecord` (`status: "on_leave"`).
  - **Reject:** Records reviewer identity and rejection reason with zero balance deduction.
  - **Cancel / Withdraw & Reverse Decision (`POST /:id/reverse`):** Cancelling or reversing an approved leave posts a compensating `CREDIT` `LeaveLedgerEntry` (never deleting historical `DEBIT` rows) and restores auto-created `on_leave` attendance rows.

---

## 8. Employee Self-Service Integration Fixes (`/me/leave/*`)

- **Fixed JSON Unwrapping Across All ESS Pages:** Replaced broken `res.data` access with `unwrapData` / `unwrapArray` across all ESS Leave, Approvals, and Employee Dashboard components in both Next.js CMS and TanStack Start.
- **Dynamic Eligibility Catalog (`GET /api/v1/me/leave/catalog`):** Returns active Leave Types enriched with effective policy rules (`minDays`, `maxDays`, `noticeDays`, `carryForward`, `halfDayAllowed`, `sandwichRule`, `probationAllowed`), live employee balance, and probation eligibility (`eligible` + `ineligibleReason` across `active`, `in_progress`, and `extended` probation records).
- **Persisted Supporting Attachments & Manager Access:** ESS Apply Leave uploads files to `/api/v1/uploads/leave-document` before submitting the persisted URL, auto-advances `endDate` when `startDate` moves past `endDate`, and `uploads-security.middleware.ts` authorizes direct reporting managers within the same tenant to inspect subordinate leave documents.
- **TanStack Start Client Auth Guard Fix:** Updated `src/routes/_authenticated/hr.tsx`, `src/routes/_authenticated/me.tsx`, and `src/lib/route-guards.ts` with `ssr: false`, client-hydration guard (`typeof window === "undefined"`), and `hrm.*` permission prefix support so direct navigation and page reloads on `:5173` never falsely redirect to `/auth`.

---

## 9. Database & Index Optimizations

Added and verified **35 PostgreSQL indexes** in `server/prisma/schema.prisma` (applied non-destructively to Supabase PostgreSQL) with zero duplicate tables or destructive column changes:

- **`LeaveType`:** `(tenantId)`, `(tenantId, status)`, `(tenantId, code)`, `(tenantId, name)`
- **`LeavePolicy`:** `(tenantId)`, `(leaveTypeId)`, `(tenantId, status)`, `(tenantId, isDefault)`, `(tenantId, leaveTypeId, status)`
- **`LeaveRequest`:** `(tenantId)`, `(employeeId)`, `(leaveTypeId)`, `(status)`, `(tenantId, status, startDate)`, `(tenantId, employeeId, status)`, `(tenantId, startDate, endDate)`, `(tenantId, approverId, status)`
- **`LeaveLedgerEntry`:** `(tenantId)`, `(employeeId)`, `(leaveTypeId)`, `(tenantId, employeeId, leaveTypeId, effectiveAt)`, `(tenantId, employeeId, entryType, effectiveAt)`, `(referenceId)`
- **`Employee` & `Holiday`:** `(tenantId, status)`, `(tenantId, departmentId, status)`, `(tenantId, managerId)`, `(tenantId, date)`

---

## 10. API & Query Performance Improvements

### A. API Endpoint Latency (`p50` & `p95` — Remote Supabase PostgreSQL 17)

| Endpoint | Before `p50` | After `p50` | `p50` Delta | Before `p95` | After `p95` | `p95` Delta |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET /api/v1/hr/leave/types` | `696 ms` | **`230 ms`** | **-67.0%** | `2220 ms` | **`239 ms`** | **-89.2%** |
| `GET /api/v1/hr/leave/policies` | `773 ms` | **`268 ms`** | **-65.3%** | `913 ms` | **`277 ms`** | **-69.7%** |
| `GET /api/v1/hr/leave/balances` | `1591 ms` | **`483 ms`** | **-69.6%** | `2041 ms` | **`581 ms`** | **-71.5%** |
| `GET /api/v1/hr/leave/applications` | `1018 ms` | **`586 ms`** | **-42.4%** | `1738 ms` | **`617 ms`** | **-64.5%** |
| `GET /api/v1/hr/leave/matrix` | `1395 ms` | **`394 ms`** | **-71.8%** | `1520 ms` | **`502 ms`** | **-67.0%** |
| `GET /api/v1/me/leave/catalog` | N/A (New) | **`603 ms`** | — | N/A | **`627 ms`** | — |
| `GET /api/v1/me/leave/balances` | N/A (Fixed) | **`635 ms`** | — | N/A | **`738 ms`** | — |
| `GET /api/v1/me/leave/policies` | N/A (Fixed) | **`611 ms`** | — | N/A | **`638 ms`** | — |
| `GET /api/v1/me/leave/applications` | N/A (Fixed) | **`523 ms`** | — | N/A | **`624 ms`** | — |

### B. Full Browser Usable Render Time & Network Waterfall Count

| HR Leave Page (`http://localhost:3000`) | Before Usable Render | After Usable Render | Render Improvement | Before API Requests | After API Requests |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/hr/leave/types` | `4501 ms` | **`2242 ms`** | **-50.2%** | `18` | **`13`** (`-5`) |
| `/hr/leave/policies` | `4079 ms` | **`2545 ms`** | **-37.6%** | `19` | **`15`** (`-4`) |
| `/hr/leave/balances` | `4227 ms` | **`2243 ms`** | **-46.9%** | `19` | **`13`** (`-6`) |
| `/hr/leave/applications` | `4043 ms` | **`2235 ms`** | **-44.7%** | `19` | **`13`** (`-6`) |

---

## 11. Mobile Responsiveness Fixes & Tested Viewports

- **42 / 42 Automated Viewport Overflow Checks Passed (`scrollWidth === innerWidth`):** Verified every HR Leave page (`4`) and every ESS Leave page (`3`) across **`360px`, `390px`, `430px`, `768px`, `1024px`, and `1440px`**.
- **Responsive Mobile Layouts & Dialogs:**
  - Wide desktop tables transform cleanly into **mobile stacked cards (`md:hidden`)** on `/hr/leave/types`, `/hr/leave/policies`, `/hr/leave/balances`, and `/me/leave/*`, and into a **mobile agenda card feed** on `/hr/leave/applications`.
  - Updated shared `CMS/src/components/ui/dialog.tsx` with `w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto` and `h-10 w-10` (`40px`) close touch target so modals never clip on `360px` mobile screens.
  - Added complete `dark:` surface, border, and typography tokens across all HR Leave pages in both Next.js CMS and TanStack Start so Dark Mode and Light Mode both render with crisp contrast.

---

## 12. RBAC & Multi-Tenant Security Verification

- **Strict Tenant Isolation (`tenantId`):** Every Prisma query, mutation, dependency lookup, ledger scan, and balance sync scopes strictly by authenticated `req.user.tenantId`. Cross-tenant read, update, approve, and delete attempts return HTTP `404` without leaking foreign record existence (`NEG-07`).
- **Role-Based Access Control:** Standard employees are blocked with HTTP `403` from creating/editing/deleting Leave Types or Policies, running Sync Balances, or adjusting balances (`NEG-06`).
- **Segregation of Duties & Reporting-Line Enforcement:** `LeaveService.assertReviewerAuthorized` blocks self-approval (`403`) and blocks peer/non-subordinate managers from approving outside their `managerId` reporting line (`NEG-06`).
- **Attachment Access Control:** Uploaded leave supporting documents are restricted to the owning employee, their direct `managerId` reporting manager within the same `tenantId`, or authorized HR/Admin personnel (`POS-13B`).

---

## 13. End-to-End Automated Test Results

All three automated verification suites executed against live PostgreSQL and headless Chromium with **183 / 183 total assertions passing (`0` failures)**:

| Test Suite | Runner | Assertions | Result |
| :--- | :--- | :---: | :---: |
| **1. Live Playwright E2E + Negative + Concurrency + Mobile + Parity + Benchmark Suite** | `verify_leave_e2e_complete.ts` | **`79 / 79`** | **PASS (`100%`)** |
| **2. Leave Management Acceptance Audit Suite** | `server/src/tests/leave-management-acceptance-audit.test.ts` | **`63 / 63`** | **PASS (`100%`)** |
| **3. Leave Management Domain & Sandwich Engine Suite** | `server/src/tests/leave-management-complete-suite.test.ts` | **`41 / 41`** | **PASS (`100%`)** |
| **4. Static TypeScript Compilation (All 3 Workspaces)** | `server` + `CMS` + `TanStack Start` | **3 / 3** | **Exit `0`** |

- **Default Tenant (`tenant-default-001`) Data Integrity Proof (`SAFE-DEFAULT-TENANT`):**
  - **Before E2E Suite:** `{ leaveTypes: 17, leavePolicies: 11, leaveRequests: 7, leaveLedger: 137, employees: 8 }`
  - **After E2E Suite:** `{ leaveTypes: 17, leavePolicies: 11, leaveRequests: 7, leaveLedger: 137, employees: 8 }` (`100%` untouched; disposable test tenants cleaned up completely).

---

## 14. Files Modified

- **Database & Backend (`server/`):**
  - `server/prisma/schema.prisma`
  - `server/src/services/leave.service.ts`
  - `server/src/services/sandwich-leave.service.ts`
  - `server/src/routes/hr-leave.routes.ts`
  - `server/src/routes/me-leave.routes.ts`
  - `server/src/routes/employee-self-service.routes.ts`
  - `server/src/routes/leave.routes.ts`
  - `server/src/routes/hr-attendance.routes.ts`
  - `server/src/routes/auth.routes.ts`
  - `server/src/routes/app-config.routes.ts`
  - `server/src/middleware/auth.ts`
  - `server/src/middleware/uploads-security.middleware.ts`
  - `server/src/tests/leave-management-complete-suite.test.ts`
  - `server/src/tests/leave-management-acceptance-audit.test.ts`
- **Next.js 15 CMS (`CMS/`):**
  - `CMS/src/lib/api.ts`, `CMS/src/lib/leave-helpers.ts`, `CMS/src/components/ui/dialog.tsx`
  - `CMS/src/app/(workspace)/hr/leave/{types,policies,balances,applications,encashment-compoff}/page.tsx`, `CMS/src/app/(workspace)/hr/leave/page.tsx`, `CMS/src/app/(workspace)/leave/page.tsx`
  - `CMS/src/app/(workspace)/me/leave/{applications,balance,policies,team-calendar}/page.tsx`, `CMS/src/app/(workspace)/me/leave/page.tsx`, `CMS/src/app/(workspace)/me/approvals/page.tsx`, `CMS/src/app/(workspace)/employee-dashboard/page.tsx`
- **TanStack Start (`src/`):**
  - `src/lib/api.ts`, `src/lib/leave-helpers.ts`, `src/lib/route-guards.ts`, `src/routes/_authenticated/hr.tsx`, `src/routes/_authenticated/me.tsx`
  - `src/routes/_authenticated/hr/leave/{types,policies,balances,applications,encashment-compoff,index}.tsx`
  - `src/routes/_authenticated/me/leave/{applications,balance,policies,team-calendar,index}.tsx`, `src/routes/_authenticated/me/approvals.tsx`, `src/routes/_authenticated/_app/employee-dashboard.tsx`

---

## 15. Remaining Blockers

**None.** All functional, performance, mobile responsiveness, RBAC/multi-tenant security, and Employee Self-Service integration requirements are verified and production-ready across both frontends and the Express/Prisma/PostgreSQL backend.
