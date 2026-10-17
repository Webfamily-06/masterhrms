# MASTERHRMS — Employee Dashboard Profile Image, Company Branding & HR Data Consistency Report

## Executive Summary

This report documents the architectural root causes, data flow investigation, code fixes, and automated test verification for the **Employee Dashboard Profile Card, Company Branding Segregation, and HR Data Consistency** across MasterHRMS.

Prior to this fix, the Employee Dashboard (`/employee-dashboard`, `/me/dashboard`) displayed placeholder and synthetic data on the employee profile passport card—including hardcoded avatar paths (`/ui-assets/avatar-03.jpg`), hardcoded `"Direct Management"`, hardcoded `"Regular Shift"`, a prepended `#` on the Employee ID, and missing tenant-scoped metadata (such as Work Mode and immutable System ID).

The fix establishes a single authoritative data flow from the relational database and tenant-scoped custom field metadata through backend services, secure APIs, TanStack Query caches, and unified frontend rendering components.

---

## 1. Root Cause Analysis

### 1.1 Avatar Mismatch & Hardcoded Fallback
* **Frontend Symptom:** The Employee Dashboard passport card rendered a hardcoded dummy image: `<img src={profile?.avatar_url || "/ui-assets/avatar-03.jpg"} ... />`. In the topbar header dropdown, `<AvatarImage src={profile.avatar_url || "/favicon.webp"} />` was rendered, causing `/favicon.webp` to override the initials fallback whenever an employee removed their profile photo.
* **Backend Root Cause:** `GET /api/v1/me/dashboard` previously returned only `{ id, employeeCode, firstName, lastName }` from `req.employee`, completely omitting `avatarUrl`, `position`, `department`, `designation`, `manager`, `email`, `joinedAt`, `systemId`, and `workMode`.
* **Tenant Isolation Middleware Gap:** The `employeeSelfServiceRouter` in `server/src/routes/employee-self-service.routes.ts` mounted `requireAuth` and `requireEmployee` but had not mounted `resolveTenantContext`. Consequently, attempts to read extended metadata from `customFieldValue` outside an active tenant context triggered `TENANT_CONTEXT_REQUIRED`, causing `getEmployeeMetadata` to fall back to an empty object `{}`.

### 1.2 Inconsistent & Fabricated Employee Fields
* **Employee ID:** The frontend prepended `#` to `employeeCode` (`#{employee.employeeCode}`) rather than displaying the authoritative immutable `System ID` or `Employee ID` as defined in MasterHRMS standards.
* **Email Address:** The frontend relied strictly on session `profile.email` instead of the authoritative employee work email (`emp.email`) stored in the `Employee` table.
* **Reporting Manager:** Hardcoded to the placeholder string `"Direct Management"` in the JSX card instead of querying `employee.manager` from the database.
* **Shift & Work Mode:** Hardcoded to the placeholder string `"Regular Shift"` instead of resolving the employee's assigned shift definition (`shiftToday` / `emp.shift`) and persisted work mode (`emp.workMode`).
* **Date of Joining:** Displayed placeholder dates or raw strings without standardized locale formatting or em dash (`"—"`) fallback for missing records.

### 1.3 Tenant Branding vs. Employee Avatar Separation
* The dashboard header company logo is controlled by `useTenantBranding()` (`branding.activeLogo`, `branding.logoDark`, `branding.logoUrl`) from the tenant branding configuration table (`TenantBranding`).
* The employee card must use the employee's personal avatar. Previously, both components were at risk of cross-pollinating due to missing tenant boundary checks and loose avatar resolution logic.

---

## 2. Architecture & Data Flow

```
[ Database (MySQL via Prisma) ]
  ├── model Employee (id, employeeCode, firstName, lastName, email, joinedAt, managerId, userId)
  ├── model Profile / User (avatarUrl, fullName, tenantId)
  ├── model ShiftDefinition & ShiftRoster (shift assignments)
  └── model CustomFieldValue (systemId, workMode, avatarUrl)
              │
              ▼
[ Tenant Context & Security Middleware ]
  ├── requireAuth (JWT verification)
  ├── resolveTenantContext (AsyncLocalStorage tenant context + DB proxy isolation)
  └── requireEmployee (Resolves req.employee for caller within tenant)
              │
              ▼
[ Authoritative Backend Services & Endpoints ]
  ├── GET /api/v1/me/dashboard (Consolidated dashboard payload with full employee, manager, shift, avatar)
  ├── GET /api/v1/me/profile (Masked profile payload with statutory protection and workMode)
  └── PUT /api/v1/hr/employees/:id (HR updates photo/data with automatic user linking & metadata sync)
              │
              ▼
[ TanStack Query Cache & Invalidation Protocol ]
  ├── Query Keys: ["ess-dashboard"], ["current-session-user"], ["employee-360", id], ["hr-employees"]
  └── Immediate cross-query invalidation on photo update or profile edit
              │
              ▼
[ Frontend Presentation Layer ]
  ├── resolveEmployeeAvatar() (Extracts canonical URL; ignores placeholders)
  ├── Avatar + AvatarFallback (Radix UI initials fallback; zero broken icons)
  └── Strict neutral fallback ("—") for missing fields (zero fabricated strings)
```

---

## 3. Detailed Files & APIs Changed

### 3.1 Backend Service Layer: `server/src/services/employee.service.ts`
* **`UpdateEmployeeInput` & `CreateEmployeeInput` Interfaces:** Added `workMode?: string | null;`.
* **`createEmployeeAtomic`:** Persists `workMode: input.workMode || null` into `setEmployeeMetadata`.
* **`updateEmployee`:**
  * Added `managerId` and `position` to `updateData`.
  * Added automatic user profile linking by email when `existing.userId` is absent.
  * Added `workMode` to `metaUpdates` for custom field persistence.
* **`getEmployee360`:**
  * Added default fallback security context (`effectiveContext` and `effectivePermissions`) so calls without explicit contexts do not throw runtime type errors.
  * Passed `effectiveContext` to `attachAllowedActions`.
  * Attached `workMode: metadata.workMode || null` and full `metadata` object to `transformedEmployee`.
* **`getEmployeeMetadata` & `setEmployeeMetadata`:**
  * Added resilient DB proxy resolution: `const db = ctx ? getTenantDb() : rawPrisma;` ensuring safe execution in both HTTP request pipelines and standalone test/cron workflows.

### 3.2 Backend Route Layer: `server/src/routes/employee-self-service.routes.ts`
* **Tenant Middleware:** Added `employeeSelfServiceRouter.use(resolveTenantContext as any)` between `requireAuth` and `requireEmployee`.
* **`GET /api/v1/me/dashboard`:**
  * Upgraded from a minimal `{ id, employeeCode, firstName, lastName }` response to a tenant-scoped relational join including `department`, `designation`, `branch`, `manager`, `user.profile.avatarUrl`, and `shiftRosters`.
  * Queried `EmployeeService.getEmployeeMetadata(tenantId, employeeId)` for `systemId`, `workMode`, and `avatarUrl`.
  * Resolved active shift definition (today's roster -> metadata shiftId -> latest roster).
  * Resolved canonical avatar (`metadata.avatarUrl` -> `userAvatar` -> `null`).
  * Mapped authoritative `employee` object containing: `id`, `systemId`, `employeeCode`, `firstName`, `lastName`, `fullName`, `email`, `position`, `department`, `designation`, `branch`, `manager`, `joinedAt`, `workMode`, `shift`, `shiftToday`, `avatarUrl`, `avatar_url`.
* **`GET /api/v1/me/profile`:**
  * Enriched with `metadata = await EmployeeService.getEmployeeMetadata(tenantId, employeeId)`.
  * Resolved canonical avatar, immutable `systemId`, and `workMode`.

### 3.3 Frontend Dashboard: `src/routes/_authenticated/_app/employee-dashboard.tsx`
* **Radix Avatar Implementation:** Replaced `<img src={profile?.avatar_url || "/ui-assets/avatar-03.jpg"} ... />` with standard `@/components/ui/avatar` (`Avatar`, `AvatarImage`, `AvatarFallback`).
* **Canonical Avatar Resolution:** Imported `resolveEmployeeAvatar` and `getEmployeeInitials` from `@/lib/avatar`. Passing `src={employeeAvatar || undefined}` allows `AvatarFallback` to render cleanly whenever an avatar is absent or removed.
* **Authoritative Field Extraction:**
  * **Employee ID:** Formatted as `employeeIdDisplay = emp?.systemId || emp?.id || profile?.employee_id || "—"`. Strictly removed the prepended `#`.
  * **Email Address:** Formatted as `emailDisplay = emp?.email || profile?.email || "—"`.
  * **Reporting Manager:** Formatted as `reportingManagerDisplay = emp?.manager ? `${emp.manager.firstName} ${emp.manager.lastName}`.trim() : "—"`. Replaced hardcoded `"Direct Management"`.
  * **Shift & Work Mode:** Formatted as `shiftAndWorkModeDisplay`: concatenates resolved shift name (`emp?.shift?.name || shiftToday?.name`) with work mode (`emp?.workMode`). Falls back to `"—"`. Replaced hardcoded `"Regular Shift"`.
  * **Date of Joining:** Formatted with `format(new Date(emp.joinedAt), "MMM d, yyyy")` or `"—"` when absent.

### 3.4 Topbar App Shell: `src/routes/_authenticated/_app/route.tsx`
* **Canonical Avatar Resolution:** Imported `resolveEmployeeAvatar` and computed `userAvatarUrl = resolveEmployeeAvatar(profile)`.
* **Fallback Degradation:** Replaced `src={profile.avatar_url || "/favicon.webp"}` with `src={userAvatarUrl || undefined}`, allowing the topbar avatar and dropdown profile card to cleanly display initials fallback when photos are removed.
* **Tenant Branding Segregation:** Confirmed topbar logo uses `useTenantBranding()` with `branding.activeLogo || branding.logoDark || branding.logoUrl`, completely decoupled from employee personal avatars.

### 3.5 HR Employee Edit: `src/routes/_authenticated/hr/employees/$id.edit.tsx`
* **Cross-Query Cache Invalidation:**
  * In `handleAvatarUpload`: Added `["ess-dashboard"]` and `["current-session-user"]` to `queryClient.invalidateQueries`.
  * In `handleAvatarRemove`: Added `["ess-dashboard"]` and `["current-session-user"]`.
  * In `updateMutation.onSuccess`: Added `["ess-dashboard"]` and `["current-session-user"]`.

---

## 4. Authoritative Database Schema Reference

| Dashboard Field | Primary Database Source | Fallback / Extension Source | Handling on Missing Data |
| :--- | :--- | :--- | :--- |
| **Profile Photo** | `Employee.metadata.avatarUrl` | `User.profile.avatarUrl` | `null` → Radix `<AvatarFallback>` initials |
| **Employee ID** | `Employee.metadata.systemId` | `Employee.id` | Shows immutable System ID / ID; no `#` |
| **Email Address** | `Employee.email` | `User.email` | Shows employee work email or `"—"` |
| **Reporting Manager** | `Employee.managerId` → `Employee` relation | None | Neutral em dash (`"—"`); no placeholder |
| **Shift** | `ShiftRoster.shift` (today) | `Employee.metadata.shiftId` → `ShiftDefinition` | Neutral em dash (`"—"`); no placeholder |
| **Work Mode** | `Employee.metadata.workMode` | None | Neutral em dash (`"—"`); no placeholder |
| **Date of Joining** | `Employee.joinedAt` (`DateTime?`) | None | Formatted `MMM d, yyyy` or `"—"` |
| **Company Logo** | `TenantBranding.logoUrl` / `activeLogo` | `/logo.webp` (platform default) | Completely segregated from employee avatar |

---

## 5. Security & Tenant Isolation Findings

1. **Server-Side Tenant Scoping:** Every employee query in `GET /api/v1/me/dashboard` and `GET /api/v1/me/profile` is strictly bound to `req.user.tenantId` and `req.employee.id`. Client-provided tenant IDs are never trusted.
2. **AsyncLocalStorage Binding:** `resolveTenantContext` sets up a thread-local context so that any internal call to `getTenantDb()` automatically routes queries through the tenant isolation proxy.
3. **Data Masking & PII Protection:**
   * Restricted statutory fields (`salary`, `bankAccount`, `bankIfsc`, `pan`, `aadhaar`) are completely omitted from the Employee Dashboard profile card response.
   * In `GET /api/v1/me/profile`, sensitive fields are masked (e.g., `••••1234`) using `maskString()`.
4. **Cross-Tenant Protection:** Automated tests proved that an authenticated employee in Tenant 2 attempting to access the dashboard receives strictly Tenant 2 data and cannot observe or traverse Tenant 1 records.

---

## 6. Automated Acceptance Test Results

A dedicated end-to-end integration test suite was created and executed:
* **Test File:** `server/src/tests/employee-dashboard-hr-consistency.test.ts`
* **Execution Command:** `npm test -- src/tests/employee-dashboard-hr-consistency.test.ts`
* **Test Results:** **8 PASSED (100%), 0 FAILED**

```
 ✓ src/tests/employee-dashboard-hr-consistency.test.ts (8 tests) 28152ms
   ✓ EMPLOYEE DASHBOARD PROFILE & HR DATA CONSISTENCY TEST SUITE (8)
     ✓ 1. Authoritative Employee Dashboard Profile & HR Data Resolution (2)
       ✓ resolves authenticated employee to correct record with full HR fields in GET /api/v1/me/dashboard (1894ms)
       ✓ GET /api/v1/me/profile returns consistent authoritative employee metadata & canonical avatarUrl (1245ms)
     ✓ 2. Profile Image Consistency, Propagation & Graceful Fallback (3)
       ✓ HR updates employee avatar via EmployeeService / HR API and propagates to Employee 360 (2422ms)
       ✓ Employee Dashboard and Profile immediately resolve the updated avatar for the authenticated user (3010ms)
       ✓ Removing avatar sets avatarUrl to null and restores neutral fallback (no obsolete/broken image) (4060ms)
     ✓ 3. Neutral Fallbacks for Sparse Employee Records (Zero Fabricated Placeholders) (1)
       ✓ Employee 2 with missing manager, shift, work mode, and avatar returns null without fabricated placeholders (1693ms)
     ✓ 4. Tenant Isolation, RBAC & Security Boundaries (2)
       ✓ Employee from Tenant 2 cannot access or view Tenant 1 dashboard data (1706ms)
       ✓ Dashboard profile response does NOT leak sensitive financial/statutory data (salary, bank, PAN) (1743ms)

Test Files:  1 passed (1)
Tests:       8 passed (8)
Duration:    28.75s
```

### Regression Verification
* **Global Avatar Sync Test Suite:** `npm test -- src/tests/employee-avatar-sync.test.ts`
  * **Result:** **8 PASSED (100%), 0 FAILED** (23.87s)
* **TypeScript Compiler Check:** `npx tsc --noEmit`
  * **Result:** **0 Errors, Exit Code 0**

---

## 7. Browser & Cache Invalidation Verification

1. **Photo Upload & Immediate Cache Propagation:**
   * When an HR administrator uploads a new profile photo in `/hr/employees/:id/edit`, the file is stored via the media service, persisted to `Employee.metadata.avatarUrl` and `User.profile.avatarUrl`.
   * On mutation success, the query client invalidates `["employee", id]`, `["employee-360", id]`, `["employees"]`, `["hr-employees"]`, `["hr-employees-list"]`, `["ess-dashboard"]`, and `["current-session-user"]`.
   * Switching to `/employee-dashboard` or reloading the browser immediately renders the new image across the passport card, topbar avatar, and directory.
2. **Photo Removal Graceful Fallback:**
   * Setting `avatarUrl: null` clears the custom field and profile avatar.
   * The dashboard passport card and topbar avatar degrade cleanly to `<AvatarFallback>` displaying the employee's initials. No broken-image icons or `/ui-assets/avatar-03.jpg` placeholders appear.
3. **Company Branding Segregation:**
   * The header workspace logo displays the tenant logo (e.g. Acme Corp) without being altered by employee photo updates.

---

## 8. Summary of Completed Objectives

| Objective | Status | Notes |
| :--- | :---: | :--- |
| Investigate and document root cause | ✅ Completed | Documented above in Section 1. |
| Single authoritative employee profile | ✅ Completed | Relational model + custom field metadata unified. |
| Employee ID display | ✅ Completed | Displays System ID / ID; prepended `#` removed. |
| Email address display | ✅ Completed | Authoritative work email displayed; profile fallback. |
| Reporting Manager display | ✅ Completed | Relational query; neutral `"—"` fallback. |
| Shift & Work Mode display | ✅ Completed | Resolved shift & work mode; neutral `"—"` fallback. |
| Date of Joining display | ✅ Completed | Formatted `MMM d, yyyy` or `"—"`. |
| Profile image synchronization | ✅ Completed | Synchronized across Directory, 360, Edit, and Dashboard. |
| Graceful avatar fallback | ✅ Completed | Radix initials fallback on missing or removed images. |
| Company branding segregation | ✅ Completed | Header logo strictly uses tenant branding settings. |
| Tenant isolation & security | ✅ Completed | `resolveTenantContext` added; sensitive PII stripped. |
| Automated integration tests | ✅ Completed | 8/8 new tests + 8/8 regression tests passing. |
| TypeScript build verification | ✅ Completed | `tsc --noEmit` exits with 0 errors. |
