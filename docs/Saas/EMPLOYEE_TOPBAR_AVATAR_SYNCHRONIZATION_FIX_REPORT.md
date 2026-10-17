# MasterHRMS — Topbar Profile Avatar & Layout Synchronization Fix Report

## 1. Executive Summary

This report documents the resolution of the stale topbar profile avatar and profile dropdown defect across the authenticated layout in Master HRMS. Previously, while the Employee Dashboard and Employee Profile had been updated to resolve authoritative employee data, the top-right topbar avatar and dropdown menu remained stale, displayed previous photos, or rendered a fallback platform favicon/logo (`/favicon.webp`).

Through systematic investigation of the data pipeline, root causes were identified in both backend profile synchronization and frontend component fallback rendering. All root causes have been fixed, verified with 21 automated backend tests across 3 suites, full TypeScript verification, and end-to-end interactive visual verification with Playwright MCP.

---

## 2. Root Cause Analysis

### A. Fallback Logo Component Injection (`AvatarImage` & `AvatarFallback`)
- **Location:** `src/components/ui/avatar.tsx`
- **Issue:** `AvatarImage` had `src={src || "/favicon.webp"}` hardcoded. In Radix UI, `<AvatarPrimitive.Image>` will load whatever `src` is provided. If `src` was `null` or `undefined`, it loaded `/favicon.webp` instead of allowing Radix to trigger `<AvatarPrimitive.Fallback>`. Additionally, `<AvatarFallback>` contained a default `<img src="/favicon.webp" />`.
- **Impact:** Whenever a user or employee did not have an avatar, or when the avatar URL was cleared, the component rendered the platform logo (`/favicon.webp`) as their employee photo instead of the clean uppercase initials fallback (`AM`).

### B. Legacy Database Profile Seeding with `/favicon.webp`
- **Location:** `server/scripts/seed.js` & `server/prisma/backups/master_hrms_full_schema.sql`
- **Issue:** Legacy database seed files originally populated `profile.avatarUrl` with the string `"/favicon.webp"`.
- **Impact:** When `/api/auth/me` resolved the user profile, `profile.avatarUrl` had `"/favicon.webp"`. Even though `resolveEmployeeAvatar` stripped out `"/favicon.webp"`, the database record remained stale and was not synchronized with `Employee.metadata.avatarUrl`.

### C. Missing Canonical Avatar Synchronization in `GET /api/auth/me`
- **Location:** `server/src/routes/auth.routes.ts`
- **Issue:** When an authenticated employee's photo was updated via HR (`PUT /api/v1/hr/employees/:id`), the photo was saved in `employee.metadata.avatarUrl`. However, `/api/auth/me` queried `profile.avatarUrl` without checking the authoritative `metadata.avatarUrl` for the linked employee in the tenant workspace.
- **Impact:** Even after HR updated the employee's photo, the topbar (which derives its profile data from `useCurrentProfile()` -> `/api/auth/me`) remained on the old image until manual database intervention.

### D. Missing Interactive Avatar Management in Employee Self-Service
- **Location:** `src/routes/_authenticated/me/profile.tsx`, `src/routes/_authenticated/_app/profile.tsx`, and `server/src/routes/employee-self-service.routes.ts`
- **Issue:** Employees on `/me/profile` had no mechanism to upload, change, or remove their own profile photo. `PUT /api/v1/me/profile` did not accept or persist `avatarUrl` into `EmployeeService.setEmployeeMetadata()`.
- **Impact:** Photo management could only be performed by HR admins, and self-service updates could not propagate to layout headers.

---

## 3. Exact Components and API Fields Changed

### 1. Backend Route Updates
- [server/src/routes/auth.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/auth.routes.ts):
  - In `GET /api/auth/me`, added resolution for the linked employee record (`userId: user.id` OR `email: user.email`) within the active `tenantId`.
  - Queried `EmployeeService.getEmployeeMetadata(tenantId, linkedEmp.id)` to obtain `empMeta.avatarUrl`.
  - Normalized legacy placeholder `"/favicon.webp"` to `null`.
  - Determined `canonicalAvatar = empMeta?.avatarUrl || profile.avatarUrl || null`.
  - Synchronized `db.profile.update({ where: { userId: user.id }, data: { avatarUrl: canonicalAvatar } })` when discrepancies exist.
  - Returns `avatarUrl: canonicalAvatar` inside the profile payload.
- [server/src/routes/employee-self-service.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/employee-self-service.routes.ts):
  - Updated `PUT /api/v1/me/profile` to accept `avatarUrl`.
  - Persists `avatarUrl` into `EmployeeService.setEmployeeMetadata(tenantId, employeeId, { avatarUrl: canonicalAvatar })`.
  - Upserts `db.profile` with `avatarUrl: canonicalAvatar` to keep user and employee records in 1:1 synchronization.

### 2. Frontend Layout & Shared Avatar Components
- [src/components/ui/avatar.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/avatar.tsx):
  - Replaced `src={src || "/favicon.webp"}` with `src={src || undefined}` in `AvatarImage`.
  - Removed `<img src="/favicon.webp" />` fallback from `AvatarFallback`, allowing Radix UI to cleanly render initials children (e.g. `{initials}`).
- [src/routes/_authenticated/_app/route.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/route.tsx):
  - Topbar user avatar button and dropdown menu avatar now use `userAvatarUrl = resolveEmployeeAvatar(profile)`.
  - Both `<AvatarImage>` elements include `className="object-cover"`.
  - When `userAvatarUrl` is `null`, renders `<AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>`.
  - Workspace/company branding (`branding.activeLogo || branding.logoUrl`) remains strictly isolated in the left/center header branding components and is never used as an avatar fallback.

### 3. Employee Self-Service & Directory Interactivity
- [src/routes/_authenticated/me/profile.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/me/profile.tsx):
  - Added interactive `<Avatar>`, `<AvatarImage>`, `<AvatarFallback>`.
  - Added file input supporting PNG, JPEG, WEBP (<5MB).
  - Added "Change" (camera icon) and "Remove" (trash icon) action buttons.
  - Implemented `handleAvatarFileChange` using `api.upload("/v1/media/upload")` and `api.put("/me/profile")`.
  - Implemented `handleAvatarRemove` using `api.put("/me/profile", { avatarUrl: null })`.
- [src/routes/_authenticated/_app/profile.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/profile.tsx):
  - Added matching avatar upload and removal capabilities with identical multi-query cache invalidation.
- [src/routes/_authenticated/hr/employees/$id.edit.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/employees/$id.edit.tsx):
  - Updated `handleAvatarUpload` and `handleAvatarRemove` to trigger broad authenticated layout cache invalidation.

---

## 4. Query & Cache Synchronization Strategy

To ensure zero stale state across components without requiring full page reloads or sign-outs, avatar mutations trigger broad TanStack Query invalidation across all consumer query keys:

```typescript
qc.invalidateQueries({ queryKey: ["my-self-profile"] });
qc.invalidateQueries({ queryKey: ["employee-profile-me"] });
qc.invalidateQueries({ queryKey: ["current-session-user"] });
qc.invalidateQueries({ queryKey: ["ess-dashboard"] });
qc.invalidateQueries({ queryKey: ["employees"] });
qc.invalidateQueries({ queryKey: ["hr-employees"] });
qc.invalidateQueries({ queryKey: ["hr-employees-list"] });
```

### Affected Components & Synchronized Keys:
| Component | Query Hook / Key | Sync Behavior |
| :--- | :--- | :--- |
| **Topbar Avatar** | `useCurrentProfile()` (`["current-session-user"]`) | Refetches `/api/auth/me`, immediate topbar re-render |
| **Topbar Dropdown** | `useCurrentProfile()` (`["current-session-user"]`) | Dropdown header avatar updates in lockstep |
| **Employee Dashboard** | `useQuery(["ess-dashboard"])` & `useCurrentProfile()` | Dashboard employee profile card updates |
| **Employee Self-Service Profile** | `useQuery(["employee-profile-me"])` | Profile header photo and action buttons update |
| **HR Employee Directory** | `useQuery(["hr-employees-list"])` / `["employees"]` | Employee row avatar updates immediately |
| **Employee 360 & Edit** | `useQuery(["employee", id])` | 360 view and edit preview synchronize |

---

## 5. Verification & Test Evidence

### A. Automated Backend Test Suites (21 / 21 Passed)
Executed via `vitest run`:

1. `server/src/tests/topbar-avatar-sync.test.ts` (**5 / 5 passed** in 14.5s)
   - `GET /api/auth/me` cleans legacy placeholder `/favicon.webp` and returns `avatarUrl: null`.
   - Updating employee avatar via Employee Self-Service `PUT /api/v1/me/profile` updates canonical avatar.
   - Updating employee photo via HR API propagates directly to `/api/auth/me`.
   - Removing employee photo via `PUT /api/v1/me/profile` sets `avatarUrl: null` in `/api/auth/me`.
   - Strict Tenant Isolation: Avatar changes in Tenant A never leak to Tenant B's `/api/auth/me`.

2. `server/src/tests/employee-avatar-sync.test.ts` (**8 / 8 passed** in 22.7s)
   - Uploads valid PNG avatar and receives canonical media path.
   - Persists avatar to authoritative employee record without duplicate records.
   - Employee Directory list view returns authoritative avatar.
   - Employee 360 endpoint returns authoritative avatar.
   - Clean removal lifecycle (clears reference, directory & 360 reflect `null`).
   - Tenant isolation & access enforcement (Tenant B cannot modify or read Tenant A).

3. `server/src/tests/employee-dashboard-hr-consistency.test.ts` (**8 / 8 passed** in 26.8s)
   - Resolves authenticated employee with full HR fields in `GET /api/v1/me/dashboard`.
   - `GET /api/v1/me/profile` returns consistent authoritative employee metadata & canonical avatar.
   - HR API updates propagate to Employee 360, Dashboard, and Profile.
   - Neutral fallbacks for sparse records (zero fabricated placeholders).
   - Tenant isolation and RBAC security boundaries (no leak of sensitive payroll/banking data).

**Total Test Count: 21 Passed, 0 Failed.**

### B. TypeScript Compilation
- Executed `npx tsc --noEmit`.
- **Result:** Code 0, 0 type errors.

### C. Playwright MCP Interactive Visual Verification
Executed interactive browser automation session on `http://localhost:5173`:

1. **Dashboard & Topbar Baseline:**
   - Navigated to `http://localhost:5173/employee-dashboard`.
   - Topbar Avatar: `http://localhost:5173/uploads/Employees/EMP-0001/Profile/1792221243473-20792f33.png`.
   - Employee Dashboard Card: `http://localhost:5173/uploads/Employees/EMP-0001/Profile/1792221243473-20792f33.png`.
   - Both rendered the exact same image. Company branding (`/logo.webp`) remained separate.

2. **Self-Service Photo Change Verification:**
   - Navigated to `http://localhost:5173/me/profile`.
   - Uploaded `test-avatar.png` via Playwright `setInputFiles`.
   - Profile photo immediately updated to `/uploads/Employees/EMP-0001/Profile/1792231641205-304737a5.png`.
   - Topbar avatar updated simultaneously without page reload.
   - Navigated to `http://localhost:5173/employee-dashboard`: Profile card displayed the new image.
   - Navigated to `http://localhost:5173/hr/employees`: Employee directory row 3 for Alex Morgan displayed the new image.

3. **Photo Removal & Clean Fallback Verification:**
   - Navigated to `/me/profile` and clicked "Remove profile photo".
   - `PUT /me/profile` sent `{ avatarUrl: null }`.
   - Topbar avatar rendered Radix fallback initials `AM`.
   - Profile card rendered Radix fallback initials `AM`.
   - Employee Dashboard rendered Radix fallback initials `AM`.
   - HR Employee Directory rendered Radix fallback initials `AM`.
   - **Zero `/favicon.webp` placeholders were rendered anywhere.**

4. **Re-Upload Verification:**
   - Re-uploaded photo on `/me/profile`.
   - All 4 locations (Topbar avatar, `/me/profile`, `/employee-dashboard`, and `/hr/employees`) immediately re-rendered the new image in real time.

---

## 6. Security and Isolation Compliance

1. **Tenant Isolation:** All avatar resolutions and mutations enforce `tenantId` checking via `resolveTenantContext` and `runWithTenantContext`. Tokens from Tenant A cannot alter or view avatars from Tenant B.
2. **Actor Authorization:** Self-service avatar updates are restricted to the caller's linked employee record.
3. **No Sensitive Data Leakage:** Avatar resolution only exposes public media URLs and initials; sensitive statutory, banking, and salary details remain strictly masked.
4. **Branding Integrity:** Tenant logos and platform logos remain in their dedicated navigation and branding containers, with zero crossover into user avatar fallbacks.

---

## 7. Remaining Limitations

- Existing third-party avatars or custom gravatars hosted on external domains are not currently mirrored locally.
- In slow network environments, client-side optimistic UI updates could be considered if image upload latency exceeds 3 seconds.
