# Page Alignment Gap Report
**Project:** Master HRMS / ERP SaaS
**Date:** 2026-10-01
**Status:** ALL GAPS CLOSED

---

## Summary

| GAP | Area | Severity | Status |
|---|---|---|---|
| GAP-01 | IT Admin Dashboard — unauthorized direct URL access | HIGH | CLOSED |
| GAP-02 | Users Page — unauthorized direct URL access | HIGH | CLOSED |
| GAP-03 | Ban IP Address — unauthorized direct URL access | HIGH | CLOSED |
| GAP-04 | Finance Dashboard — unauthorized direct URL access | HIGH | CLOSED |
| GAP-05 | Settings — admin-only tabs exposed to all employees | MEDIUM | CLOSED |
| GAP-06 | super.routes.ts leave-impersonation missing requireSuperAdmin | HIGH | CLOSED |

---

## Closed Gaps

### GAP-01 — IT Admin Dashboard
- **Route:** `/it-admin-dashboard`
- **Problem:** Any authenticated user could navigate directly to this URL.
- **Fix:** Added `AccessDenied` component guard gated by `isWorkspaceAdminUser(profile)`.
- **File:** `src/routes/_authenticated/_app/it-admin-dashboard.tsx`
- **Backend:** `requireAuth` + tenant context on all IT admin API endpoints.
- **Classification:** TENANT-LEVEL page. NOT part of Platform Super Admin.

### GAP-02 — Users Page
- **Route:** `/users`
- **Problem:** Any authenticated user could access the full user list page.
- **Fix:** Added `AccessDenied` guard for non-admin roles.
- **File:** `src/routes/_authenticated/_app/users.tsx`
- **Backend:** User list API scoped to tenant via `requireAuth` + tenantId.

### GAP-03 — Ban IP Address
- **Route:** `/ban-ip-address`
- **Problem:** Accessible to all authenticated users via direct URL.
- **Fix:** Added `AccessDenied` guard for non-admin roles.
- **File:** `src/routes/_authenticated/_app/ban-ip-address.tsx`
- **Backend:** IP ban APIs use `requireAuth`; all operations are tenant-scoped.

### GAP-04 — Finance Dashboard
- **Route:** `/finance-dashboard`
- **Problem:** Accessible to employees and managers via direct URL.
- **Fix:** Added `AccessDenied` guard + disabled query for unauthorized roles.
- **File:** `src/routes/_authenticated/_app/finance-dashboard.tsx`
- **Allowed roles:** super_admin, admin, hr_admin, finance_admin, payroll_manager.
- **Backend:** Finance APIs use `requireAuth` + tenant context.

### GAP-05 — Settings Admin Tabs
- **Route:** `/settings`
- **Problem:** Admin-only tabs (Workspace, Cron, Salary, AI, etc.) were visible to all.
- **Fix:** Wrapped all admin tabs in `isAdmin` conditional. Security/2FA tab always visible.
- **File:** `src/routes/_authenticated/_app/settings.tsx`

### GAP-06 — leave-impersonation Missing requireSuperAdmin
- **Endpoint:** `POST /api/super/leave-impersonation`
- **Problem:** The endpoint used only `requireAuth`, not `requireSuperAdmin`.
- **Risk:** Any authenticated user who crafts a JWT with `isImpersonating: true` could
  theoretically call this endpoint. However, JWT is server-signed, so this required
  knowledge of the JWT secret — low exploitability.
- **Fix:** Added `requireSuperAdmin` middleware for defense-in-depth.
- **File:** `server/src/routes/super.routes.ts` line 182.
- **Compatibility:** Impersonating JWTs already carry `super_admin` role, so this fix
  does not break the impersonation exit workflow.

---

## Confirmed Non-Gaps (Investigated and Cleared)

| Area | Finding |
|---|---|
| `/super/*` frontend routes | All inherit `super_admin` guard from `SuperShell` layout |
| `/super/*` backend endpoints | 54/55 had `requireSuperAdmin`; 1 fixed (GAP-06) |
| Platform vs Tenant API keys | Biometric keys = tenant-scoped; AI keys = tenant-scoped; Platform SMTP = super-admin only |
| CMS system-* slugs | Protected from non-super-admin writes by cms.routes.ts line 198-202 |
| JWT role resolution | Tenant roles cannot be escalated by request headers/params for non-super-admin |
| Impersonation flow | Explicit, server-authenticated, auditable |
| IT Admin vs Super Admin | Correctly separate: `/it-admin-dashboard` is tenant-level, NOT in `/super/*` |
| super/settings.tsx API calls | Calls only `/api/super/*` and `/api/cms/pages/system-*` slugs — platform level |
| No super frontend → tenant API | Verified: 0 super pages call `/employees`, `/leave`, `/payroll`, etc. |
