# MASTERHRMS — EMPLOYEE IDENTITY & FILE MANAGER FINAL SECURITY GAP AUDIT
## Independent Verification of Authentication Revocation, 1:1 Identity Integrity, Deletion Semantics & File Manager Stability

**Audit Date:** 2026-11-06  
**Auditor:** Antigravity Autonomous Security & Architecture Verification  
**Reference Report:** `MASTERHRMS_EMPLOYEE_IDENTITY_FILE_MANAGER_FIX_REPORT.md`  
**Scope Covered:**
1. Authentication Session Revocation & `device_sessions` Integration
2. Database-Level Employee/User One-to-One Relational Integrity
3. Employee Deletion Semantics & Lifecycle Archival Architecture
4. Password Update Regression & Bcrypt Security
5. File Manager Navigation, Scoping, and Cross-Tenant Protection

---

## EXECUTIVE SCORECARD & SUMMARY MATRIX

| Section | Audit Domain | Evaluation Status | Empirical Runtime Finding |
|---|---|:---:|---|
| **1.1** | Refresh Token Invalidation | **`PASS`** | Calling `POST /api/auth/refresh` with Employee A's rotated token is rejected with HTTP 401 (`"Session invalid, expired, or reuse detected"`). |
| **1.2** | Access Token (JWT) Invalidation | **`FAIL`** | `requireAuth` does not query `device_sessions`; Employee A's access token remains valid for API calls until JWT expiry. |
| **1.3** | Terminated Employee Context Match | **`FAIL`** | `requireEmployee` middleware matches by email fallback when `userId` is null, and does not check `status !== 'terminated'`. Terminated employee accesses `/api/v1/me/profile` with HTTP 200 OK. |
| **1.4** | Control Isolation (Employee B) | **`PASS`** | Employee B's sessions remain active (`revoked: false`), and API calls succeed without disruption. |
| **2.1** | Application 1:1 Identity Guard | **`PASS`** | `provisionEmployeeUser` checks for existing linked employee and rejects duplicate assignment with 409 Conflict. |
| **2.2** | Physical DB Unique Constraint | **`PARTIAL`** | Neither PostgreSQL table `employees` nor Prisma `model Employee` has a UNIQUE constraint or index on `user_id` or `(tenant_id, user_id)`. Concurrent race conditions could insert duplicates. |
| **2.3** | Existing Data Assessment | **`PASS`** | 21 employees with `user_id` (0 duplicates); 27 employees with `user_id = NULL`. Additive migration proposed. |
| **3.1** | Deletion Semantics (Archival) | **`PASS`** | Confirmed that `DELETE /api/employees/:id` is statutory termination/archival (`status: 'terminated'`, `userId: null`, statutory records preserved). |
| **3.2** | Permanent Deletion Workflow | **`PARTIAL`** | No permanent deletion/GDPR purge workflow exists. Comprehensive safeguards roadmap documented. |
| **4.1** | HR Authorized Password Reset | **`PASS`** | `POST /api/employees/:id/set-password` successfully updates password with bcrypt hash; zero Prisma 42703 column errors. |
| **4.2** | Password Verification & Rejection | **`PASS`** | New password verified via `bcrypt.compare`; old password rejected; short password (`< 6` chars) rejected with HTTP 400. |
| **4.3** | Cross-Tenant Password Protection | **`PASS`** | Cross-tenant reset rejected with HTTP 404 Not Found. Zero plaintext passwords stored or logged. |
| **5.1** | Sidebar Navigation Consolidation | **`PASS`** | Exactly one canonical "File Manager" entry in HR sidebar and Employee sidebar; duplicate "Media Library" removed. |
| **5.2** | Legacy Media Route Redirection | **`PARTIAL`** | Next.js CMS redirects `/hr/media` and `/me/media` to `/hr/files` and `/me/files`; TanStack SPA still renders legacy `TenantMediaPage`. |
| **5.3** | Folder Navigation & Nested Levels | **`PASS`** | Single-click opens folders; nested child folders (`parentId`) retrieve correctly; selection checkbox click does not navigate. |
| **5.4** | Role Views & Tenant Isolation | **`PASS`** | `view=my` scoped to user; `view=org` enforces admin privileges; cross-tenant node access returns HTTP 404 (0 data leaks). |

---

## 1. ACTUAL AUTHENTICATION SESSION REVOCATION AUDIT

**Target:** Verification of complete session revocation on employee termination across database, memory cache, refresh tokens, and active JWT access tokens.

### Empirical Test Execution:
An automated test script (`scripts/test_security_audit_sessions.cjs`) was executed against the live Express backend (`localhost:4000`) and Supabase PostgreSQL:
1. Created Employee A (`Audit EmployeeA`, `userA`, `employeeA`) with active `device_sessions` record (`sessionId: 78ca5956-3d5d-496c-9e6f-c14d9dc4cf97`) and signed JWT token.
2. Created Employee B (`Audit EmployeeB`, `userB`, `employeeB`) as an unaffected control subject.
3. Employee A accessed `GET /api/v1/me/profile` before termination → **HTTP 200 OK**.
4. HR Admin executed `DELETE /api/employees/:id` to terminate Employee A → **HTTP 200 OK**.
5. Verified database updates:
   - `employees.status` = `'terminated'`, `employees.user_id` = `null`.
   - `device_sessions.revoked` = `true`, `device_sessions.revoked_at` populated.
   - `user_roles` and `user_role_assignments` deleted for `userA.id`.
   - `invalidateAuthCache(userA.id, tenantId)` called.
6. Employee A attempted to call `GET /api/v1/me/profile` using the existing access token.
7. Employee A attempted to refresh session via `POST /api/auth/refresh`.
8. Employee B attempted to call `GET /api/v1/me/profile`.

### Empirical Findings:
1. **Refresh Token Invalidation (`PASS`):**
   - In `server/src/routes/auth.routes.ts` (`POST /api/auth/refresh`), `rotateRefreshToken()` queries `device_sessions`:
     ```typescript
     if (!session || session.revoked || !session.refreshTokenHash) return null;
     ```
   - Calling `/refresh` with Employee A's session returned **HTTP 401 Unauthorized**:
     `{"error":"Session invalid, expired, or reuse detected. Please sign in again."}`
2. **Access Token (JWT) Invalidation Failure (`CRITICAL GAP / FAIL`):**
   - When Employee A called `GET /api/v1/me/profile` immediately after termination, **the request succeeded with HTTP 200 OK**:
     ```json
     {
       "success": true,
       "data": {
         "id": "f8dc91f9-0eb0-4933-bbdd-4ddfa6e2a353",
         "firstName": "Audit",
         "lastName": "EmployeeA",
         "status": "terminated"
       }
     }
     ```
   - **Root Cause 1 (Middleware Omission):** In `server/src/middleware/auth.ts`, `requireAuth()` only verifies JWT cryptographic signature and checks `user.findUnique({ where: { id: userId } })`. It **does not inspect `decoded.sessionId`** and **does not query `device_sessions`** to verify whether the session is revoked.
   - **Root Cause 2 (Email Fallback in ESS Middleware):** In `server/src/middleware/employee-context.middleware.ts` (lines 48–67):
     ```typescript
     const employee = await db.employee.findFirst({
       where: {
         tenantId,
         OR: [
           { userId },
           ...(req.user.email ? [{ email: req.user.email }] : []),
         ],
       },
     });
     ```
     Even though `userId` was set to null, the query matched the terminated employee by email (`req.user.email`). Furthermore, `requireEmployee` does not assert `status !== "terminated"`. Consequently, the terminated employee remains fully authenticated on ESS endpoints until JWT expiry (up to 1–2 hours).
3. **Control Isolation (`PASS`):**
   - Employee B's session remained `revoked: false` in PostgreSQL.
   - Employee B's call to `GET /api/v1/me/profile` succeeded with HTTP 200 OK.

**Rating: `PARTIAL / CRITICAL SECURITY GAP`** — Refresh token revocation works, but active JWT access tokens are not revoked in middleware, allowing terminated employees to continue accessing the system.

---

## 2. DATABASE-LEVEL EMPLOYEE/USER ONE-TO-ONE INTEGRITY AUDIT

**Target:** Verification of 1:1 employee-to-user relational integrity at the physical PostgreSQL database level.

### Empirical Database Introspection:
The physical database constraints and indexes on table `employees` were queried via `information_schema` (`scripts/inspect_employee_constraints.cjs`):
- `employees_pkey`: PRIMARY KEY on `id`.
- `employees_user_id_fkey`: FOREIGN KEY on `user_id` referencing `users(id)`.
- `employees_tenant_id_department_id_idx`: INDEX on `(tenant_id, department_id)`.
- `employees_tenant_id_status_idx`: INDEX on `(tenant_id, status)`.

### Findings:
1. **Absence of Database Unique Constraint:**
   - There is **no UNIQUE constraint or UNIQUE index** on `user_id` or `(tenant_id, user_id)` in the PostgreSQL database.
   - In `server/prisma/schema.prisma` (lines 314 & 412), `userId` is defined without `@unique`, and the model only declares non-unique composite indexes.
2. **Application-Level Enforcement:**
   - In `server/src/lib/auth-helpers.ts` (`provisionEmployeeUser`), application code executes:
     ```typescript
     const existingLinkedEmployee = await prisma.employee.findFirst({
       where: {
         userId: user.id,
         ...(options.employeeId ? { id: { not: options.employeeId } } : {}),
       },
       select: { id: true, firstName: true, lastName: true, employeeCode: true },
     });
     if (existingLinkedEmployee) {
       throw new WorkspacePolicyError(
         `This user account (${email}) is already assigned to employee ...`, 409
       );
     }
     ```
   - This software check prevents sequential duplicates through standard application routes, but **does not protect against race conditions** during concurrent requests or direct database writes.
3. **Existing Data Analysis:**
   - Evaluated all existing records in Supabase PostgreSQL:
     - Total employees with linked `user_id`: **21**
     - Total employees with `user_id = NULL`: **27**
     - Total duplicate `user_id` entries: **0**
4. **Proposed Additive Migration:**
   Because 27 terminated or unprovisioned employees have `user_id = NULL`, a standard unconditional unique constraint would cause issues on older engines or tooling. The canonical PostgreSQL solution is a **partial unique index**:
   ```sql
   -- Additive, zero-downtime, non-destructive partial unique index
   CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_tenant_user_id
   ON employees (tenant_id, user_id)
   WHERE user_id IS NOT NULL;
   ```
   In `schema.prisma`, this can be modeled as:
   ```prisma
   @@unique([tenantId, userId])
   ```

**Rating: `PARTIAL`** — Application logic prevents duplication and existing data is 100% clean, but physical database concurrency protection is missing.

---

## 3. EMPLOYEE DELETION SEMANTICS & LIFECYCLE AUDIT

**Target:** Accurate classification of employee deletion operations and audit of permanent deletion capabilities.

### Empirical Findings:
1. **Current Deletion Semantics (Archival / Termination):**
   - The endpoint `DELETE /api/employees/:id` in `server/src/routes/employees.routes.ts` (lines 565–609) performs:
     ```typescript
     // 1. Unlink manager references
     await tx.employee.updateMany({ where: { managerId: id }, data: { managerId: null } });
     // 2. Cancel pending leave requests
     await tx.leaveRequest.updateMany({ where: { employeeId: id, status: "pending" }, data: { status: "cancelled" } });
     // 3. Statutory Soft Delete: Mark employee status as "terminated"
     await tx.employee.update({ where: { id }, data: { status: "terminated", userId: null }, select: { id: true } });
     // 4. Revoke active device sessions & delete user roles
     await tx.deviceSession.updateMany({ where: { userId }, data: { revoked: true, revokedAt: new Date() } });
     await tx.userRole.deleteMany({ where: { userId } });
     await tx.userRoleAssignment.deleteMany({ where: { userId } });
     ```
   - This is strictly an **Employee Termination & Identity Archival** workflow.
   - Statutory compliance records (attendance, payslips, loans, exit interviews, tax declarations) are intentionally preserved.
2. **Absence of Permanent Deletion Workflow (`GAP`):**
   - There is no permanent deletion (`DELETE FROM employees WHERE id = ...`) or GDPR right-to-be-forgotten endpoint in the production codebase.
   - `prisma.employee.delete` exists only within isolated test suites.

### Required Safeguards for a Future Permanent Deletion Workflow:
If an authorized permanent deletion / data purge operation is implemented in the future, the following safeguards must be enforced:
1. **Statutory Retention Locks:** Block permanent deletion if tax declarations, payslips, or Provident Fund records are less than the statutory retention threshold (7–8 years under Income Tax & PF compliance rules).
2. **Pre-flight Dependency Guard:** Verify no unresolved financial liabilities (unpaid salary, open employee loans, pending reimbursement claims).
3. **Authentication Purge:** Delete the `User` record, `Profile`, `TwoFactorSecret`, and associated OAuth identities.
4. **Session Termination:** Purge all rows from `device_sessions`, `refresh_tokens`, and invalidate Redis/in-memory caches.
5. **Shared Asset Protection:** Check company files, documents, and form templates where `uploadedBy` matches the employee; reassign ownership to Tenant Admin rather than cascade-deleting shared company knowledge.
6. **Data Anonymization Fallback:** Where physical row deletion would break relational constraints on immutable accounting ledgers, provide cryptographic pseudonymization (PII masking).
7. **Audit Record Immutability:** Write an unalterable `EMPLOYEE_PERMANENTLY_PURGED` event to `audit_logs` with actor, timestamp, and purged employee code.

**Rating: `PASS`** — Current implementation is properly classified as termination/archival with historical preservation; permanent deletion gap and requirements clearly mapped.

---

## 4. PASSWORD UPDATE REGRESSION AUDIT

**Target:** Verification of employee password updates against Supabase PostgreSQL without Prisma schema mismatch errors.

### Empirical Test Execution:
Executed `scripts/test_password_regression.cjs` testing all facets of password administration:
1. **Physical Column Parity (`PASS`):**
   - The 17 previously missing columns (`father_or_spouse_name`, `present_address`, etc.) exist physically in PostgreSQL.
   - Calling `tx.employee.update()` with explicit `select: { id: true, userId: true }` generated zero SQL 42703 column errors.
2. **HR Authorized Password Reset (`PASS`):**
   - Tenant A HR Admin reset password via `POST /api/employees/:id/set-password` with `newPassword: 'BrandNewPassword@456'`.
   - API responded with **HTTP 200 OK**:
     `{"success":true,"message":"Password successfully updated..."}`.
3. **Bcrypt Hash Verification (`PASS`):**
   - Verified in database that `users.passwordHash` starts with `$2a$10$`.
   - `bcrypt.compare('BrandNewPassword@456', user.passwordHash)` returned **true**.
   - `bcrypt.compare('InitialPassword@123', user.passwordHash)` returned **false** (old password rejected).
4. **Validation Guard (`PASS`):**
   - Attempted password update with `newPassword: '123'` (`< 6` characters).
   - Rejected with **HTTP 400 Bad Request**:
     `{"error":"Password must be at least 6 characters long."}`.
5. **Cross-Tenant Protection (`PASS`):**
   - Tenant B HR Admin attempted to reset password of Tenant A employee.
   - Rejected with **HTTP 404 Not Found**:
     `{"error":"Employee record not found in this workspace."}`.
6. **Plaintext Protection (`PASS`):**
   - Verified `audit_logs` entry for `EMPLOYEE_PASSWORD_SET`. Details only recorded:
     `"Admin reset password for employee Password Tester (pwd.test...@masterhrms.com)"`.
   - Zero plaintext passwords present in database or audit logs.

**Rating: `PASS`**

---

## 5. FILE MANAGER REGRESSION & STABILITY AUDIT

**Target:** Verification of consolidated navigation, folder navigation, nested folder scoping, and cross-tenant isolation.

### Empirical Findings:
1. **Sidebar Navigation Consolidation (`PASS`):**
   - Inspected `src/nav/hr-sidebar.ts` and `CMS/src/nav/hr-sidebar.ts`:
     - Exactly one entry for File Manager (`/apps/file-manager/list-view`) under `01. Applications & Collaboration`.
     - Duplicate "Media Library" item was completely removed.
   - Inspected `src/nav/employee-sidebar.ts` and `CMS/src/nav/employee-sidebar.ts`:
     - Exactly one entry for File Manager (`/me/files`).
     - Duplicate "Shared Files & My Files" (`/me/media`) was completely removed.
2. **Legacy Route Redirection (`PARTIAL`):**
   - **Next.js CMS (`PASS`):** Both `/hr/media` and `/me/media` execute client-side `router.replace()` to `/hr/files` and `/me/files`.
   - **TanStack SPA (`GAP`):** `/hr/media` and `/me/media` still render the legacy `TenantMediaPage` component instead of redirecting.
3. **Single-Click Folder Navigation (`PASS`):**
   - In `UnifiedFileManager` (`src/components/apps/file-manager/unified-file-manager.tsx`), row, card, and folder name clicks execute `handleOpenFolder()`.
   - Verified that folder clicking navigates into folder contents without requiring double-click.
4. **Selection Checkbox Isolation (`PASS`):**
   - In `handleSelectItem()`, line 576 executes `e.stopPropagation()`.
   - Clicking a file or folder checkbox toggles selection without navigating into the item.
5. **Nested Folder Hierarchy (`PASS`):**
   - Tested creating a parent folder (`Audit_Parent_Folder`) and a child folder (`Audit_Child_Folder`) with `parentId = parentFolder.id`.
   - Child folder was created with `parentId` and `materializedPath = '/<parentId>/<childId>'`.
   - Querying `GET /api/v1/files?parentId=<parentId>` returned the child folder.
6. **Role Scoping & Tenant Isolation (`PASS`):**
   - `view=my` correctly scopes files to the authenticated user and folders at that level.
   - `view=org` enforces `tenant_admin`, `admin`, or `files.admin.view_all` permissions.
   - Cross-tenant folder access was tested: Tenant B user querying Tenant A folder node returned **HTTP 404 Not Found**, with 0 files leaked.
7. **Responsive UI Certification (`PASS`):**
   - Tested responsive rendering across 3 standard viewports via Playwright:
     - Desktop 1440x900: `docs/hrms-audit/evidence/file-manager-desktop-1440.png` (`VERIFIED`).
     - Tablet 768x1024: `docs/hrms-audit/evidence/file-manager-tablet-768.png` (`VERIFIED`).
     - Mobile 375x667: `docs/hrms-audit/evidence/file-manager-mobile-375.png` (`VERIFIED`).

**Rating: `PASS`** (with TanStack SPA legacy redirect parity note).

---

## ACTIONABLE REMEDIATION PLAN

### Priority 1: Integrate Session Revocation in `requireAuth`
In `server/src/middleware/auth.ts`:
```typescript
if (decoded.sessionId) {
  const session = await (rawPrisma || prisma).deviceSession.findUnique({
    where: { id: decoded.sessionId },
    select: { revoked: true, expiresAt: true },
  });
  if (!session || session.revoked || (session.expiresAt && session.expiresAt < new Date())) {
    return res.status(401).json({ error: "Session has been revoked or expired. Please sign in again." });
  }
}
```

### Priority 2: Terminated Employee Guard in `requireEmployee`
In `server/src/middleware/employee-context.middleware.ts`:
```typescript
const employee = await db.employee.findFirst({
  where: {
    tenantId,
    userId, // Do not fall back to email if user account was unlinked!
    status: { not: "terminated" },
  },
  select: { id: true, employeeCode: true, firstName: true, lastName: true, status: true },
});
if (!employee || employee.status === "terminated") {
  return res.status(403).json({ error: "Access denied: Employee account is inactive or terminated." });
}
```

### Priority 3: Add Database Partial Unique Index on `employees`
Execute additive migration:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_tenant_user_id
ON employees (tenant_id, user_id)
WHERE user_id IS NOT NULL;
```

### Priority 4: TanStack SPA Legacy Media Redirects
In `src/routes/_authenticated/hr/media.tsx` and `src/routes/_authenticated/me/media.tsx`, redirect to `/hr/files` and `/me/files` using TanStack `Navigate({ to: ... })`.

