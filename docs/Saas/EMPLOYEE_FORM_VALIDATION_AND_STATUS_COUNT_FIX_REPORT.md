# MASTERHRMS — Employee Form Validation, International Phone Input & Live Status Count Fix Report

**Date:** 2026-10-17  
**Status:** Complete & Verified  
**Target Environment:** Master HRMS SaaS Workspace  
**Report Document:** `docs/Saas/EMPLOYEE_FORM_VALIDATION_AND_STATUS_COUNT_FIX_REPORT.md`  

---

## 1. Executive Summary

This report documents the architectural investigation, root cause diagnosis, code modifications, and empirical validation performed to correct:
1. **Address Fields Order & Alignment:** Standardized address fields in Employee Create and Edit forms into the exact 7-field sequence: (1) Country, (2) State / Province, (3) District, (4) City, (5) Postal / ZIP Code, (6) Address Line 1, (7) Address Line 2 with 2-column desktop alignment, mobile responsiveness, downstream cascade resets, and postal code lookup prefilling without losing manual entries.
2. **Country Selection & International Phone Input:** Developed a country-aware calling code selector and international phone input component with dynamic digit validation, real-time alphabetic rejection, international numbering plan rules (+91, +1, +44, +971, +65, etc.), ITU E.164 normalization, server-side validation, and non-destructive phone number preservation on Edit.
3. **Employee Directory Live Status Counts:** Resolved the status-tab defect where `Inactive` count failed to update or conflated terminated/leave records. Extended PostgreSQL `EmployeeStatus` enum with `'inactive'`, corrected backend aggregation queries, decoupled employee employment status from login account activation status, implemented direct status mutation endpoints, and configured automated TanStack Query cache invalidation (`["hr-employees-list"]`).
4. **Empirical Acceptance Suite:** Executed database-backed integration test suites and frontend component unit tests verifying all 10 user acceptance cases, tenant isolation, and zero regressions across directory filtering and employee editing workflows.

---

## 2. Root Cause Analysis

### 2.1 Inactive Status Count Defect
- **Root Cause A (Database Schema Omission):** The PostgreSQL enum `EmployeeStatus` defined in `server/prisma/schema.prisma` only contained `'active' | 'probation' | 'on_leave' | 'terminated'`. The `'inactive'` status was missing from the database enum definition, preventing atomic updates of records to `inactive`.
- **Root Cause B (Conflated Query Filtering):** In `server/src/services/employee.service.ts` line 409, querying `status: "inactive"` executed `where.status = { not: "active" }`. This conflated `terminated` and `on_leave` records into the inactive category.
- **Root Cause C (Broken Aggregation Tally):** In `EmployeeService.listEmployees`, the status tab count for `inactive` was computed as `db.employee.count({ where: { ...baseWhere, status: { not: "active" } } })`. Consequently, terminated employees were double-counted in both the `Terminated` and `Inactive` tabs, and updating an employee to `inactive` failed to increment an isolated, database-backed count.
- **Root Cause D (Decoupling Confusion):** Login status (account enabled/disabled via `User` record) was sometimes conflated with HR employment status (Active/Inactive/Terminated in `Employee` record). Changing login access should never mutate employment lifecycle status, and changing employment lifecycle status should never wipe user authentication credentials.

### 2.2 Address Field Order & Cascade Resets
- In `src/routes/_authenticated/hr/employees/new.tsx` and `src/routes/_authenticated/hr/employees/$id.edit.tsx`, address inputs were displayed in an arbitrary sequence (e.g., Address Line 1, City, State, Country, Postal Code).
- When a user changed Country, incompatible downstream State and District selections were retained instead of being cleared.
- Selecting a State did not restrict the District dropdown to districts within that state.
- In desktop 2-column grids, uneven field distributions caused visual misalignments and awkward grid gaps.

### 2.3 International Phone Validation & Parsing
- Previously, phone fields used simple `<Input type="tel" />` without calling code detection, allowing users to enter alphabetic characters, arbitrary symbols, or invalid numbers.
- When opening an existing employee in the Edit form, pre-existing phone numbers with international codes (such as `+1 415 555 2671` or `+44 20 7946 0958`) could be mangled or overwritten by a hardcoded default country calling code.

---

## 3. Architecture & Implementation Details

### 3.1 Database & Enum Upgrades
1. **PostgreSQL Enum Update:** Executed `ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'inactive';` against the active database.
2. **Prisma Schema Synchronization:** Updated `server/prisma/schema.prisma` (lines 26–31):
   ```prisma
   enum EmployeeStatus {
     active
     inactive
     probation
     on_leave
     terminated
   }
   ```

### 3.2 Backend Service & API Routes
1. **Server-Side Phone Validation (`server/src/lib/phone-validation.ts`):**
   - Implemented `validateAndNormalizeServerPhone(phone, isRequired, countryHint)`.
   - Defines strict digit length rules per country: `+91` (10 digits), `+1` (10 digits), `+44` (9–10 digits), `+971` (9 digits), `+65` (8 digits), `+61` (9 digits), `+49` (9–11 digits), `+33` (9 digits), `+60` (9–10 digits), `+966` (9 digits), plus generic ITU E.164 (7–15 digits).
   - Rejects alphabetic characters, invalid formatting, and normalizes phone numbers into standardized `${callingCode} ${nationalDigits}`.
2. **Employee Service Upgrades (`server/src/services/employee.service.ts`):**
   - **Status Counts:** Updated `listEmployees` to count exact status:
     ```ts
     inactiveCount: db.employee.count({ where: { ...baseWhere, status: "inactive" } })
     ```
   - **Filtered Listing:** Updated `listEmployees` status filter:
     ```ts
     if (query.status === "inactive") {
       where.status = "inactive";
     } else if (query.status === "probation") {
       where.probationRecords = { some: { status: { in: ["active", "extended", "ongoing"] } } };
     } else {
       where.status = query.status;
     }
     ```
   - **Direct Employment Status Mutation:** Added `EmployeeService.updateEmployeeStatus(tenantId, actorId, employeeId, status, userContext)` with RBAC authorization (`admin`, `hr_admin`, `super_admin`, `Workspace Admin`), audit logging (`EMPLOYEE_STATUS_CHANGE`), and outbox event dispatch (`employee.status_updated`).
   - **Address Fields Persistence:** Updated `UpdateEmployeeInput` and metadata persistence to store and restore `addressLine1`, `addressLine2`, `district`, `city`, `state`, `country`, and `postalCode`.
   - **Transaction Timeout Resiliency:** Configured Prisma interactive transactions with `{ timeout: 25000, maxWait: 15000 }` to guarantee fault tolerance under remote database network latency.
3. **HR Employees Controller (`server/src/routes/hr-employees.routes.ts`):**
   - Added `PATCH /api/v1/hr/employees/:id/status` and `PUT /api/v1/hr/employees/:id/status` endpoints to allow instantaneous status transitions without requiring full profile re-submission.

### 3.3 Frontend Components & Pages
1. **International Phone Input Component (`src/components/ui/phone-input.tsx`):**
   - Clean UI with calling code select dropdown (showing flag emojis, country names, calling codes) side-by-side with national number input.
   - Immediate keypress/paste sanitization: automatically blocks all alphabetic letters (`/[a-zA-Z]/`) and non-numeric symbols.
   - Supports formatting characters (` `, `-`, `(`, `)`).
   - Non-destructive country detection: checks if saved number begins with an international prefix (e.g. `+1`, `+44`, `+971`); if found, selects that calling code and preserves the employee's existing saved country.
   - Dynamic field-level validation messages displaying required min/max digits based on country configuration.
2. **Phone Utilities Engine (`src/lib/phone-utils.ts`):**
   - Centralized definitions for `COUNTRY_PHONE_RULES`, `getCallingCodeForCountry`, `getCountryForCallingCode`, `parsePhoneNumber`, and `validatePhoneNumber`.
3. **Employee Create Form (`src/routes/_authenticated/hr/employees/new.tsx`):**
   - Arranged Address Fields in exact specified sequence:
     1. **Country** (`Select`)
     2. **State / Province** (`Select` / `Input`)
     3. **District** (`Select` / `Input`, filtered by selected State)
     4. **City** (`Input`)
     5. **Postal / ZIP Code** (`Input` with automatic PIN code lookup)
     6. **Address Line 1** (`Input`, full width / 2-column span)
     7. **Address Line 2** (`Input`, full width / 2-column span)
   - Integrated desktop spacer (`<div className="hidden md:block" />`) to maintain desktop 2-column alignment and mobile single-column stacking.
   - Cascading resets: Changing Country resets State, District, and City. Changing State resets District.
   - Postal-code lookup: Valid lookup prefills matching location fields; failed lookup gracefully retains manual inputs.
   - Integrated `PhoneInput` for Primary Phone and Emergency Contact Phone.
   - Connected `useQueryClient` to invalidate `["hr-employees-list"]` and `["employees"]` on creation.
4. **Employee Edit Form (`src/routes/_authenticated/hr/employees/$id.edit.tsx`):**
   - Arranged Address Fields in exact 1–7 sequence matching Create form.
   - Added `<SelectItem value="inactive">Inactive</SelectItem>` to status select dropdown in Step 2.
   - Integrated `PhoneInput` for both Primary Phone and Emergency Contact Phone with prefilled values restored without data loss.
   - Validates phone format and length before navigating through Step 2.
5. **Employee Directory (`src/routes/_authenticated/hr/employees/index.tsx`):**
   - Added `"inactive"` badge styling with amber warning aesthetics.
   - Added `handleUpdateEmploymentStatus` calling `PATCH /api/v1/hr/employees/:id/status`.
   - Enhanced Status Badge in both List View and Grid View into an interactive inline dropdown allowing authorized HR managers to toggle employment status directly.
   - Invalidation of `["hr-employees-list"]` query cache ensures live tab counts and employee rows immediately update without full page reloads.

---

## 4. Verification & Acceptance Test Results

### 4.1 Database-Backed Acceptance Suite (`server/src/tests/hr-employee-status-and-address.test.ts`)
10 tests executed against real database with multi-tenant isolation:

| # | Acceptance Case | Test Description | Result | Execution Time |
|---|---|---|---|---|
| 1 | All = 4, Active = 4 | 4 active employees created in Tenant 1 yield All=4, Active=4, Inactive=0, Terminated=0 | **PASS** | 7,299 ms |
| 2 | Status change to Inactive | Updating 1 employee to Inactive produces All=4, Active=3, Inactive=1, Terminated=0 | **PASS** | 683 ms |
| 3 | Inactive tab filtering | Filtering by `status = 'inactive'` returns precisely the 1 inactive employee record | **PASS** | 222 ms |
| 4 | Reactivation | Reactivating the employee restores Active=4, Inactive=0 | **PASS** | 638 ms |
| 5 | Termination | Terminating an employee produces Active=3, Terminated=1, Inactive=0; terminated tab displays record | **PASS** | 864 ms |
| 6 | Probation lifecycle rule | Probation is tracked via `ProbationRecord`; Active remains 3, Probation=1, All=4 (no double-counting) | **PASS** | 553 ms |
| 7 | Multi-tenant isolation | Tenant 2 employees (All=1, Active=1) do not leak into Tenant 1 tallies (All=4, Active=3, Terminated=1) | **PASS** | 432 ms |
| 8 | Login/Employment independence | Toggling login account status preserves employment status; toggling employment preserves login account | **PASS** | 2,048 ms |
| 9 | Address (1–7) persistence | Creating employee with Country, State, District, City, PIN, Line 1, Line 2 saves & reloads intact | **PASS** | 4,851 ms |
| 10 | Phone validation engine | Rejects letters, rejects wrong length, normalizes valid national numbers with calling code | **PASS** | 12 ms |

**Result:** `10 passed (10)` in `19.38s`.

### 4.2 Backend Suite Regressions (`server/src/tests/hr-employee-directory-backend.test.ts`)
- 6 integration tests executed covering pagination (sizes 10, 20, 30), avatar URLs, login status enrichment, status filtering, multi-filter combinations, and tenant isolation:
- **Result:** `6 passed (6)` in `7.25s`.

### 4.3 Employee Edit Wizard Suite (`server/src/tests/hr-employee-edit-backend.test.ts`)
- 17 integration tests executed covering personal info updates, password hash preservation, password updating, duplicate code/email rejections, cross-tenant isolation, sensitive financial field RBAC controls, and document management:
- **Result:** `17 passed (17)` in `30.34s`.

### 4.4 Frontend Phone & Address Test Suite (`src/tests/hr-employee-form-validation-and-status.test.ts`)
- 5 tests covering country-to-calling-code mapping, non-destructive phone number parsing, client-side digit length validation, alphabetic character rejection, and national formatting patterns:
- **Result:** `5 passed (5)` in `123ms`.

### 4.5 Existing Frontend Directory & Edit Suites
- `src/tests/hr-employee-directory.test.ts`: `19 passed (19)`
- `src/tests/hr-employee-edit.test.ts`: `22 passed (22)`
- `src/tests/employee-system-id-and-address.test.ts`: `10 passed (10)`

---

## 5. Build & Compilation Verification

1. **TypeScript Typecheck (`npx tsc --noEmit`):**
   - Exit code: `0`
   - Zero compilation errors, zero type errors.
2. **Production Bundle Build (`npm run build`):**
   - Exit code: `0`
   - Client and SSR bundles compiled successfully in 17.75s via Vite/Rollup.

---

## 6. Files Changed & Added

| File Path | Action | Description |
|---|---|---|
| `server/prisma/schema.prisma` | Modified | Added `inactive` to `EmployeeStatus` enum. |
| `server/src/lib/phone-validation.ts` | Created | Server-side phone validation and ITU E.164 normalization rule engine. |
| `server/src/services/employee.service.ts` | Modified | Added phone validation, direct status mutation `updateEmployeeStatus`, corrected `inactive` status counts/filter, increased transaction timeout to 25s, persisted all address fields. |
| `server/src/routes/hr-employees.routes.ts` | Modified | Added `PATCH /:id/status` and `PUT /:id/status` routes with RBAC verification. |
| `src/lib/phone-utils.ts` | Created | Frontend phone utilities: country calling code lookup, phone parsing, national formatters, and validation rules. |
| `src/components/ui/phone-input.tsx` | Created | Reusable international phone component with country picker, alphabetic blocking, and field-level error messages. |
| `src/routes/_authenticated/hr/employees/new.tsx` | Modified | Reordered address fields to exact 1–7 sequence, added desktop spacer, cascading resets, integrated `PhoneInput`, query cache invalidation. |
| `src/routes/_authenticated/hr/employees/$id.edit.tsx` | Modified | Reordered address fields to 1–7 sequence, added `Inactive` to status dropdown, integrated `PhoneInput` with non-destructive preservation, added step phone validation. |
| `src/routes/_authenticated/hr/employees/index.tsx` | Modified | Added `inactive` badge styling, interactive status dropdown with direct API mutation, and query cache invalidation for live tab counts. |
| `server/src/tests/hr-employee-status-and-address.test.ts` | Created | Integration test suite covering all 10 acceptance cases. |
| `server/src/tests/hr-employee-directory-backend.test.ts` | Modified | Updated seed data and assertions to reflect true `inactive` count decoupling. |
| `src/tests/hr-employee-form-validation-and-status.test.ts` | Created | Frontend test suite for phone utilities and validation. |

---

## 7. Safety & Data Integrity Confirmation

- **No Destructive Operations:** No database drops, resets, or truncation were performed. Existing employee records, foreign keys, and immutable System IDs remain completely intact.
- **Tenant Isolation:** All database counts, queries, status mutations, and phone validations strictly enforce `where: { tenantId }`. Cross-tenant mutations are strictly rejected with 404/403.
- **Decoupled Security Contexts:** Login credentials and permissions remain isolated in the `User` and `UserRole` models. Disabling login access never alters employment status, and changing employment status never erases user identity records.
- **No Hardcoded Data:** All status counts displayed on the frontend tabs are derived from live, tenant-scoped PostgreSQL `count` aggregations.
