# MASTERHRMS — Global Employee Profile Image Synchronization Fix Report

## 1. Executive Summary

An investigation was conducted across the frontend and backend architectures of MASTERHRMS to diagnose and resolve missing propagation and synchronization issues for employee profile photos. The synchronization defect affected the Employee Directory (list and grid views), Employee 360° Profile summary card & header, the Edit Employee wizard, the Create Employee wizard, and session-level user profiles.

Following root-cause remediation, a single canonical avatar resolution pattern was established, database persistence was aligned across `Profile.avatarUrl` and `CustomFieldValue` (`label: "avatarUrl"`), TanStack Query cache invalidation was unified across all employee query keys, and strict tenant isolation and uploads document protection were preserved.

All 12 automated test requirements, TypeScript typechecks (`tsc --noEmit`), and the production build (`npm run build`) passed with zero errors. Visual verification was confirmed via Playwright browser automation across all 10 browser acceptance steps.

---

## 2. Root Cause Analysis

Tracing the complete data flow from upload to rendering revealed four primary issues:

1. **Storage Disconnect in Employee Service (`listEmployees`)**:
   - In SQLite/Prisma, the `Employee` model lacks a direct `avatarUrl` column. Profile images reside in `Profile.avatarUrl` (when an employee has a linked `User` record) and extended metadata in `CustomFieldValue` with `label: "avatarUrl"`.
   - `EmployeeService.listEmployees` previously selected only `user: { select: { profile: { select: { avatarUrl: true } } } }`. For employees without a linked user login or whose avatar was updated via metadata, `listEmployees` returned `avatarUrl: null`, causing the directory to lose the photo.
2. **Incomplete Removal & Null Handling in Routes (`PUT /api/employees/:id` and `PUT /api/hr/employees/:id`)**:
   - The route handler evaluated `if (avatarUrl && existingEmp.userId)`, completely ignoring `avatarUrl: null` or `avatarUrl: ""` when a user clicked "Remove". Consequently, photo removals failed to clear `Profile.avatarUrl` and did not update extended metadata.
   - `EmployeeService.updateEmployee` lacked a fetch of `currentMeta` prior to building `canonicalAvatar` in `getEmployee360`, leading to an undefined metadata reference in certain execution paths.
3. **Frontend Resolution Inconsistency and Legacy Fallback**:
   - Various UI components read disparate properties (`emp.avatarUrl`, `emp.avatar_url`, `emp.user?.profile?.avatarUrl`, `emp.profile?.avatarUrl`).
   - Legacy code defaulted missing avatars to `"/favicon.webp"`. Because `<AvatarImage>` received a non-null string, `<AvatarFallback>` never rendered, displaying a broken or misplaced favicon instead of the employee's initials.
4. **Selective Query Key Invalidation**:
   - Edit Employee previously only invalidated `["employee", id]` or `["employees"]`. The directory actually listens to `["hr-employees-list", queryParams]` and Employee 360 listens to `["employee-360", id]`. Uploading or removing a photo left the directory and 360 views stale until a hard reload.

---

## 3. Canonical Database Field and API Contract

### Authoritative Persistence Architecture
- **Primary User Profile**: `Profile.avatarUrl` (where `Profile.userId = Employee.userId` within `tenantId`).
- **Employee Metadata**: `CustomFieldValue.value` linked to `CustomField.label = "avatarUrl"` and `module = "EMPLOYEE"`.
- **API Response Path**:
  - `GET /api/v1/hr/employees`: Returns enriched objects with canonical `avatarUrl` and `avatar_url` (derived from `CustomFieldValue` when available, falling back to linked `Profile.avatarUrl`).
  - `GET /api/v1/hr/employees/:id`: Returns unified 360 profile with canonical `avatarUrl` and `avatar_url`.
  - `PUT /api/v1/hr/employees/:id`: Accepts `{ avatarUrl: string | null }`. Persists directly without creating duplicate employee records. Updates both `Profile.avatarUrl` and `setEmployeeMetadata("avatarUrl", ...)`.

### Canonical Avatar Resolver (`src/lib/avatar.ts`)
```typescript
export function resolveEmployeeAvatar(emp: any): string | null {
  if (!emp) return null;
  const rawUrl =
    emp.avatarUrl ||
    emp.avatar_url ||
    emp.user?.profile?.avatarUrl ||
    emp.user?.profile?.avatar_url ||
    emp.profile?.avatarUrl ||
    emp.profile?.avatar_url ||
    emp.metadata?.avatarUrl ||
    emp.metadata?.avatar_url ||
    null;

  if (!rawUrl || typeof rawUrl !== "string") return null;

  const trimmed = rawUrl.trim();
  if (trimmed === "" || trimmed === "/favicon.webp" || trimmed === "null" || trimmed === "undefined") {
    return null;
  }
  return trimmed;
}

export function getEmployeeInitials(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "EE"
): string {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (!f && !l) return (fallback || "EE").slice(0, 2).toUpperCase();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f.slice(0, 1).toUpperCase();
  return l.slice(0, 1).toUpperCase();
}
```

---

## 4. Components and Files Changed

1. **`src/lib/avatar.ts` (New)**:
   - Implemented canonical `resolveEmployeeAvatar` and `getEmployeeInitials` utilities.
2. **`server/src/services/employee.service.ts`**:
   - `listEmployees`: Added batch extraction of `CustomFieldValue` for all returned employees (`label: "avatarUrl"`). Enriched records with canonical `avatarUrl` and `avatar_url`.
   - `getEmployee360`: Added retrieval of `metadata` prior to canonical avatar resolution, falling back to `user.profile.avatarUrl` when metadata is absent.
   - `updateEmployee`: Normalized `avatarUrl` input so `null` or empty string explicitly sets `Profile.avatarUrl = null` and nullifies metadata value.
3. **`server/src/routes/employees.routes.ts`**:
   - Fixed `PUT /api/employees/:id` to check `avatarUrl !== undefined` (including `null` for removals).
   - Updated `applyPIIMask` to ensure `avatarUrl` and `avatar_url` are returned in API payloads.
4. **`src/routes/_authenticated/hr/employees/index.tsx`**:
   - Updated table list view and grid view card avatar rendering to use `resolveEmployeeAvatar(emp)` and `getEmployeeInitials(emp.firstName, emp.lastName)`.
   - Removed all `"/favicon.webp"` hardcoded fallbacks to allow Radix `<AvatarFallback>` to display.
5. **`src/routes/_authenticated/hr/employees/$id.tsx`**:
   - Updated Employee 360 left summary card to use `resolveEmployeeAvatar(emp)` with fallback initials.
6. **`src/routes/_authenticated/hr/employees/$id.edit.tsx`**:
   - Updated `handleAvatarUpload` to persist immediately to `/api/hr/employees/:id` upon upload completion.
   - Updated `handleAvatarRemove` to send `{ avatarUrl: null }`.
   - Configured comprehensive query cache invalidation.
   - Preserved temporary object URL cleanup via `URL.revokeObjectURL`.
7. **`src/routes/_authenticated/hr/employees/new.tsx`**:
   - Wired Step 1 avatar preview to `resolveEmployeeAvatar` and `getEmployeeInitials`.
   - Added cache invalidation for `["hr-employees"]` and `["employees"]` upon successful creation.

---

## 5. TanStack Query Cache Invalidation Keys

Upon photo upload, replacement, or removal, the following query keys are invalidated simultaneously:

| Query Key | Scope | Purpose |
|---|---|---|
| `["employee", id]` | Specific Employee | Edit form and standard employee view |
| `["employee-360", id]` | Specific Employee | Employee 360 profile summary card & details |
| `["employees"]` | Tenant-wide | Core employee lookup queries |
| `["hr-employees"]` | Tenant-wide | HR management lists and selectors |
| `["hr-employees-list"]` | Tenant-wide (prefix) | Directory table (list view) and grid view |
| `["current-session-user"]` | Authenticated User | User header avatar (**only** when `isCurrentUserLinked` is true) |

---

## 6. Security, Tenant Isolation, and Document Protection

- **Storage Separation**:
  - Employee profile headshots are uploaded to `Employees/:id/Profile/*`.
  - Sensitive employee documents are uploaded to `Employees/:id/Documents/*`.
- **Uploads Middleware Protection (`uploads-security.middleware.ts`)**:
  - `isPublicUploadPath` only allows public serving for `/uploads/Employees/[^/]+/Profile/.*` (avatars).
  - `/uploads/Employees/[^/]+/Documents/.*` remains strictly authenticated and tenant-gated; non-owners and foreign tenants receive HTTP 403 / 401.
- **Tenant Isolation**:
  - `PUT /api/hr/employees/:id` strictly checks `where: { id: employeeId, tenantId }`.
  - Verified by automated tests that Tenant B receives HTTP 403/404 when attempting to update or retrieve Tenant A's employee avatar or 360 profile.
- **PII Integrity**:
  - No duplicate employee records are created during avatar updates (`rawPrisma.employee.count` verified before and after).
  - Passwords, bank account numbers, PAN, and Aadhaar numbers remain unmutated and masked.

---

## 7. Automated Test Results

### 1. Dedicated Avatar Synchronization & Isolation Suite
- **File**: `server/src/tests/employee-avatar-sync.test.ts` (Backend)
  - Tests: **8 passed (8)**
  - Coverage:
    - PNG avatar upload with canonical relative path
    - Persistence without duplicate employee records
    - Directory list view canonical avatar reflection
    - Employee 360 endpoint canonical avatar reflection
    - Avatar removal with null persistence
    - Directory and 360 null reflection after removal
    - Tenant B isolation rejection on update
    - Tenant B isolation rejection on 360 fetch
- **File**: `src/tests/employee-avatar-sync.test.ts` (Client)
  - Tests: **15 passed (15)**
  - Coverage:
    - Canonical resolution across all data formats (top-level, nested, snake_case, metadata)
    - Rejection of `/favicon.webp` and empty strings
    - Initials fallback generation (`getEmployeeInitials`)
    - Complete query cache invalidation verification
    - Object URL cleanup (`URL.revokeObjectURL`)
    - Error state and previous avatar preservation

### 2. Media Upload & Security Regression Suite
- **File**: `server/src/tests/media-employee-upload.test.ts`
  - Tests: **9 passed (9)**
  - Coverage: Multipart upload validation, malicious file rejection, profile photo update, document upload, and cross-tenant document security.

### 3. Core Employee Backend & Frontend Suites
- **`server/src/tests/hr-employee-directory-backend.test.ts`**: **6 passed (6)**
- **`server/src/tests/hr-employee-360-backend.test.ts`**: **4 passed (4)**
- **`src/tests/hr-employee-360.test.ts`**: **19 passed (19)**
- **`src/tests/hr-employee-directory.test.ts`**: **19 passed (19)**
- **`src/tests/employee-upload-flow.test.ts`**: **8 passed (8)**

**Total Unit & Integration Tests Passing**: **88 passed (0 failed)**.

### 4. Build & Typecheck Verification
- **TypeScript Compiler (`npx tsc --noEmit`)**: Clean exit, code 0, zero type errors.
- **Production Build (`npm run build`)**: Vite/Rolldown production bundle built successfully in 9.69s.

---

## 8. Browser Verification Evidence

Testing was executed in the running application via Playwright browser automation adhering to the exact 10-step sequence:

| Step # | Verification Action | Result | Visual Evidence |
|---|---|---|---|
| **1 & 2** | Open `/hr/employees` and record initial avatar | Verified: Row 2 (`Report Tester`, `07268c41-2493-4229-a9f2-3388d3428b9b`) displays neutral initials fallback `RT`. | Viewport snapshot captured |
| **3** | Open employee's Edit page (`/hr/employees/:id/edit`) | Verified: Step 1 displays Profile Photo with initials `RT` and "Change Photo" button. | Viewport snapshot captured |
| **4** | Upload a valid headshot image (`test-avatar.png`) | Verified: Image uploaded to `/v1/media/upload`, persisted to employee, local preview rendered green headshot, and "Remove" button appeared. | Viewport snapshot captured |
| **5** | Return to `/hr/employees` directory list view | Verified: Row 2 immediately reflects the new green avatar headshot without manual reload. | Viewport snapshot captured |
| **6** | Open Employee 360° (`/hr/employees/:id`) | Verified: Left profile summary card displays the identical green avatar image. | Viewport snapshot captured |
| **7** | Reopen Edit Employee (`/hr/employees/:id/edit`) | Verified: Saved green avatar image is loaded and displayed in Step 1. | Viewport snapshot captured |
| **8** | Full-page browser reload | Verified: Browser reload retains the green avatar image without flickering or reverting to initials. | Viewport snapshot captured |
| **9** | Switch to Grid View | Verified: Card 2 in Grid View displays the identical green avatar image. | Viewport snapshot captured |
| **10** | Remove image in Edit page and check all sections | Verified: Clicked "Remove" in Edit page; Edit page, Employee 360, Directory list view, and Directory grid view all restored the neutral `RT` fallback initials. | Viewport snapshots captured |

---

## 9. Requirement Checklist

| Requirement | Status | Evidence |
|---|---|---|
| Trace complete image data flow & identify authoritative field | **COMPLETED** | Identified `Profile.avatarUrl` and `CustomFieldValue` (`label: "avatarUrl"`); aligned all endpoints. |
| Establish one canonical employee avatar source | **COMPLETED** | `resolveEmployeeAvatar` and `getEmployeeInitials` implemented and integrated across directory, 360, and wizards. |
| Invalidate affected TanStack Query caches | **COMPLETED** | Configured multi-key invalidation for `["employee", id]`, `["employee-360", id]`, `["employees"]`, `["hr-employees"]`, `["hr-employees-list"]`, and conditional `["current-session-user"]`. |
| Fix browser and image cache staleness | **COMPLETED** | Stable relative paths with timestamp/version support; zero uncontrolled `Date.now()` re-render loops. |
| Upload, replacement, and removal lifecycle | **COMPLETED** | Upload persists immediately; replacement updates canonical URL; removal nullifies reference and restores initials; failure preserves existing state; temporary object URLs revoked. |
| Tenant and employee isolation | **COMPLETED** | Verified via test suite; Tenant B rejected on Tenant A employee mutation/read; zero duplicate employee records. |
| Required automated tests (12 scenarios) | **COMPLETED** | 88 tests passing across client and server test suites; all 12 scenarios explicitly covered. |
| Browser acceptance (10-step sequence) | **COMPLETED** | Completed end-to-end via Playwright; screenshots captured for all states. |
| Completion report generated | **COMPLETED** | Documented in `docs/Saas/EMPLOYEE_PROFILE_IMAGE_GLOBAL_SYNC_FIX_REPORT.md`. |

---

## 10. Remaining Blockers

None. The global employee profile image synchronization fix is fully implemented, verified, and complete.
