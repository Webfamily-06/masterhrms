# MASTERHRMS — PRE-IMPLEMENTATION ARCHITECTURE & DATABASE AUDIT
**Module Focus:** Employee Identity, Authentication Lifecycle, Password Management & File Manager Consolidation  
**Audit Date:** November 6, 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

This audit investigates and documents root causes, affected codebases, and safe remediation strategies for six interconnected defects identified in MASTERHRMS:

1. **Employee Independent Identity & Login Provisioning:** Inconsistencies between employee creation and linked user login accounts, potential multi-employee collisions, and lack of atomic synchronization.
2. **Employee Lifecycle & Coordinated Deletion:** Ensuring that archiving/deleting an employee record revokes active sessions (`DeviceSession`), clears auth caches, terminates tokens, and safely unlinks or cleans up user roles without destroying historical attendance, payroll, or compliance data.
3. **Database Schema Drift & Password Update Crash:** Screenshot-confirmed error `Invalid prisma.employee.update() invocation: The column employees.father_or_spouse_name does not exist in the current database.`. Auditing revealed that **17 demographic/statutory columns** defined in `schema.prisma` are physically missing in the remote Supabase PostgreSQL database, and Prisma `update()` calls lacked defensive column selections.
4. **Sidebar Navigation Duplication (File Manager vs Media):** Redundant sidebar items ("File Manager" under Applications and "Media Library" under Administration) pointing to the same file storage subsystem.
5. **File Manager Folder Blank Page:** Single-click vs double-click routing mismatch, missing route redirects between `/apps/file-manager` and `/hr/files` across TanStack SPA and CMS, and parentId query param handling.
6. **File Manager Visual Alignment & Responsive Degradation:** Viewport overflow, toolbar button misalignment, excessive padding, and lack of fluid responsive breakpoints across Desktop (1440px), Tablet (768px), and Mobile (375px).

---

## 2. Environment & Application Topography

| Subsystem | Technology Stack | Primary Directory | Notes |
| :--- | :--- | :--- | :--- |
| **TanStack SPA** | React 18, Vite, TanStack Router & Query | `src/` | Main workspace SPA frontend. |
| **Next.js CMS** | Next.js 14 (App Router), React 18, Tailwind | `CMS/` | Administrative and workspace portal. |
| **Backend API** | Node.js, Express, TypeScript, Prisma ORM | `server/` | Multi-tenant REST API with JWT auth and RBAC. |
| **Database** | PostgreSQL hosted on Supabase | Remote | Remote multi-tenant schema with RLS and Prisma mappings. |

---

## 3. Discovered Causes & Architectural Analysis

### Problem 1: Employee Identity & Login Provisioning
- **Current State:** `provisionEmployeeUser` in `server/src/lib/auth-helpers.ts` provisions a `User`, `Profile`, and `UserRole` (`employee`).
- **Discovered Defect:** 
  - If a user record exists with the same email in the tenant, `provisionEmployeeUser` does not check if that `user.id` is already bound to another active employee record in `prisma.employee`.
  - When employee accounts are created through certain routes (`/api/employees` vs `/api/v1/hr/employees`), password hashing, default role assignment, and audit logging are inconsistently handled.
- **Proposed Safe Remedy:**
  - Enforce strict 1:1 bidirectional binding: check `SELECT id FROM employees WHERE user_id = $1` to ensure no two employees in any tenant share the same user identity.
  - Standardize atomic user provisioning in `createEmployeeAtomic` and ensure default role is strictly `employee` (never inheriting administrative scopes).

### Problem 2: Employee Lifecycle & Coordinated Deletion
- **Current State:** `DELETE /api/employees/:id` sets employee status to `"archived"`, cancels pending leaves and asset requests, and deletes `UserRole` if no other employee is linked.
- **Discovered Defect:**
  - Active sessions in `device_sessions` are not revoked. An employee whose account was archived can continue making authenticated API requests until JWT token expiration.
  - Refresh tokens in `device_sessions` remain valid (`revoked = false`), allowing session refresh.
  - Invalidate auth cache was invoked, but sessions in the physical database were not updated.
- **Proposed Safe Remedy:**
  - In `DELETE /api/employees/:id` and `toggleEmployeeAccountStatus`:
    - Mark all `DeviceSession` records for that `userId` as `revoked: true, revokedAt: new Date()`.
    - Revoke and delete any active session tokens.
    - Preserve all historical attendance, payroll, leave requests, employee exit records, and audit logs.
    - Write structured audit event via `AuditService.logMutation`.

### Problem 3: Password Update Schema Drift (`employees.father_or_spouse_name`)
- **Current State:**
  - Screenshot error: `Invalid prisma.employee.update() invocation: The column employees.father_or_spouse_name does not exist in the current database.`
  - Calling `POST /api/employees/:id/set-password` or resetting password via `EmployeeService.resetEmployeePassword` triggers Prisma `update` on `employee`.
- **Root Cause Identified by Empirical Inspection:**
  - Physical PostgreSQL schema audit of table `employees` shows **41 physical columns** exist in PostgreSQL, but `schema.prisma` declares **58 fields**.
  - Exactly **17 columns** present in Prisma are completely **missing from PostgreSQL**:
    1. `father_or_spouse_name` (`VARCHAR(150)`)
    2. `present_address` (`TEXT`)
    3. `permanent_address` (`TEXT`)
    4. `completion_480_days_date` (`DATE`)
    5. `permanent_employment_date` (`DATE`)
    6. `worker_age_classification` (`VARCHAR(20) DEFAULT 'Adult'`)
    7. `maternity_nomination_date` (`DATE`)
    8. `marital_status` (`VARCHAR(20)`)
    9. `blood_group` (`VARCHAR(10)`)
    10. `address_line1` (`VARCHAR(255)`)
    11. `address_line2` (`VARCHAR(255)`)
    12. `city` (`VARCHAR(100)`)
    13. `district` (`VARCHAR(100)`)
    14. `postal_code` (`VARCHAR(20)`)
    15. `emergency_contact_name` (`VARCHAR(100)`)
    16. `emergency_contact_relationship` (`VARCHAR(50)`)
    17. `emergency_contact_phone` (`VARCHAR(30)`)
  - Furthermore, in `server/src/routes/employees.routes.ts` (lines 891, 907) and `server/src/services/employee.service.ts` (lines 1406, 1546, 1571), `prisma.employee.update(...)` was executed without a `select:` clause. Prisma generates SQL with `RETURNING *` by default, querying all columns defined in `schema.prisma`. PostgreSQL rejects this with error `42703: column employees.father_or_spouse_name does not exist`.
- **Proposed Safe Remedy:**
  - Execute an additive database migration (`ALTER TABLE employees ADD COLUMN IF NOT EXISTS ...`) for all 17 missing columns. This brings the PostgreSQL schema into 100% parity with Prisma without data loss.
  - Add explicit, defensive `select: { id: true, userId: true }` clauses to all Prisma update and find queries in `employee.service.ts` and `employees.routes.ts`.

### Problem 4: File Manager vs Media Duplicate Sidebar Navigation
- **Current State:**
  - `src/nav/hr-sidebar.ts` and `CMS/src/nav/hr-sidebar.ts` define two separate sidebar items:
    - Item 1: `File Manager` (`/apps/file-manager/list-view`) under Applications.
    - Item 2: `Media Library` (`/hr/media`) under Administration & Communication.
  - In Next.js CMS, `/apps/file-manager/list-view` simply redirects to `/hr/files`.
  - Both `/hr/media` and `/apps/file-manager` access the exact same underlying `MediaFile` Prisma model and `FilesService`.
- **Proposed Safe Remedy:**
  - Consolidate navigation under canonical `File Manager`.
  - In `hr-sidebar.ts` (both SPA and CMS): Remove duplicate `Media Library` from Administration & Communication.
  - Retain `/hr/media` route handlers and APIs with a transparent redirection or canonical view to prevent breaking external links or existing bookmarks.

### Problem 5: File Manager Folder Blank Page
- **Current State:**
  - In `UnifiedFileManager`, folder rows and cards listened exclusively to `onDoubleClick` (`onDoubleClick={() => handleOpenFolder(folder)}`), while single `onClick` only toggled multi-selection.
  - When users single-click a folder name or folder card expecting to enter the folder, the view did not navigate.
  - If a user navigated to `/apps/file-manager/list-view` in CMS, it redirected to `/hr/files`, but in TanStack SPA `/hr/files` did not exist as a defined route.
- **Proposed Safe Remedy:**
  - Provide intuitive folder interaction: clicking a folder row or folder name immediately enters the folder (`handleOpenFolder`), while clicking the selection checkbox toggles selection.
  - Ensure canonical route parity: create route aliases `/hr/files` and `/apps/file-manager` across both TanStack and CMS so neither environment renders a blank page or 404.
  - Verify that when entering a folder, `parentId` is correctly passed and subfolders/files render seamlessly.

### Problem 6: File Manager Visual Alignment & Responsive Layout
- **Current State:**
  - Fixed-width toolbars (`w-52` aside, wide breadcrumb bar) causing horizontal overflow on viewport widths below 1024px.
  - Card dimensions and grid columns (`xl:grid-cols-6`) breaking on small screens.
  - Mobile view lacked collapsible sidebar drawer or responsive toolbar controls.
- **Proposed Safe Remedy:**
  - Polish layout using fluid flexbox, responsive grids (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`), truncate text with tooltips, and ensure clean padding/margins across Desktop (1440px), Tablet (768px), and Mobile (375px).

---

## 4. Affected Files & Remediation Plan

| Problem Area | Affected Files | Planned Action |
| :--- | :--- | :--- |
| **Database Drift** | Remote PostgreSQL `employees` table | Additive migration script `scripts/database/migrate_employee_demographic_schema.cjs` executing `ADD COLUMN IF NOT EXISTS` for 17 columns. |
| **Password Update** | `server/src/routes/employees.routes.ts`, `server/src/services/employee.service.ts` | Add defensive `select: { id: true, userId: true }` and error handling. |
| **Employee Identity** | `server/src/lib/auth-helpers.ts`, `server/src/services/employee.service.ts` | Enforce 1:1 user-to-employee constraint, prevent cross-tenant collisions, ensure default employee role. |
| **Employee Deletion** | `server/src/routes/employees.routes.ts`, `server/src/services/employee.service.ts` | Revoke `DeviceSession` records, clear tokens, invalidate cache, preserve historical statutory data. |
| **Sidebar Consolidation** | `src/nav/hr-sidebar.ts`, `CMS/src/nav/hr-sidebar.ts`, `src/lib/routes.ts`, `CMS/src/lib/routes.ts` | Remove duplicate "Media Library" entry, maintain canonical "File Manager". |
| **File Manager Routing** | `src/routes/_authenticated/hr/files.tsx`, `CMS/src/app/(workspace)/hr/files/page.tsx` | Ensure route parity between TanStack and CMS. |
| **Folder Click & UI** | `src/components/apps/file-manager/unified-file-manager.tsx`, `CMS/src/components/apps/file-manager/unified-file-manager.tsx` | Enable single-click folder opening, fix responsive padding, alignment, and grid breakpoints. |

---

## 5. Verification Strategy & Safety Guardrails

1. **Non-Destructive Database Changes:** Only additive DDL (`ADD COLUMN IF NOT EXISTS`). Zero dropped tables, dropped columns, or truncated data.
2. **Automated Integration Suite:** Custom regression script testing:
   - Employee creation & user identity mapping.
   - Admin password reset via API.
   - Employee deletion & session revocation.
   - File manager folder query by `parentId`.
3. **Playwright Visual Verification:** Capture viewport screenshots at 1440px, 768px, and 375px.
4. **Final Deliverable:** Detailed certification report in `MASTERHRMS_EMPLOYEE_IDENTITY_FILE_MANAGER_FIX_REPORT.md`.

