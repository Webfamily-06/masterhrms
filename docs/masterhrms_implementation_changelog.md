# MasterHRMS — Implementation Changelog & Release Delta

**Document:** `docs/masterhrms_implementation_changelog.md`  
**Date:** October 15, 2026  
**Release Tag:** `v1.0.0-employee-portal`  
**Latest Release Commit:** `1700cbd`

---

## 1. Wave Execution Changelog

### Wave 1: Shared Foundations & Multi-Tenant Security
- **`server/src/routes/employee-self-service.routes.ts`**:
  - Hardened `POST /leaves/validate` and `POST /leaves` with `where: { id: leaveTypeId, tenantId }`. Rejects foreign-tenant leave types with HTTP 404.
  - Enforced strict server-side derivation of `employeeId` and `tenantId` from verified JWT claims.
- **`server/src/routes/auth.routes.ts`**:
  - Validated host-context resolution and 2FA OTP flows.
  - Resolved TDZ `ReferenceError` for `effectiveTenantId` during login and 2FA verification.

### Wave 2: Platform & Organization Management
- **`src/nav/hr-sidebar.ts`**:
  - Reconciled 132 HR route paths, category menus, permissions, and report routes.
  - Linked `/addons/webhook/endpoints` into HR navigation hierarchy.
- **`server/src/routes/organization.routes.ts`**:
  - Master data endpoints for branches, departments, designations, holidays, announcements.

### Wave 3: Core HR Workflows & Navigation Modernization
- **`src/nav/employee-sidebar.ts` (NEW)**:
  - Created canonical 55-route manifest across 11 functional sections matching the HRM SaaS User Manual.
  - Implemented `filterEmployeeSidebar` with role and permission filtering.
- **`src/components/dreams-sidebar.tsx`**:
  - Replaced ~820 lines of hardcoded JSX with dynamic rendering over `filteredEmployeeSidebar`.
  - Added auto-expansion and active route highlighting for all `/me/*` routes.
- **`src/tests/employee-sidebar-reconciliation.test.ts` (NEW)**:
  - Unit tests verifying 100% route coverage and category mapping across the 11 sections.

### Wave 4: Talent, Recruitment & Lifecycle
- **`src/routes/_authenticated/me/recruitment/career.tsx`**:
  - Integrated internal careers and referral tracking dashboard.
- **`server/src/routes/recruitment.routes.ts`**:
  - Candidate pipeline stages, interview round scheduling, offer letter generation, and onboarding conversion.
- **`server/src/routes/hr-lifecycle.routes.ts`**:
  - Award recognition, promotion records, transfer logs, disciplinary warnings, and complaints.

### Wave 5: Payroll, Finance & Assets
- **`server/src/routes/payroll.routes.ts` & `employee-self-service.routes.ts`**:
  - Verified itemized payslip breakdown endpoints (`GET /api/v1/me/payslips/:id`).
  - Strict tenant scoping on payslip generation and employee visibility.
- **`server/src/routes/assets.routes.ts`**:
  - Asset requisition, assignment tracking, and depreciation calculation.

### Wave 6: Collaboration & Webhook Add-ons
- **`src/routes/_authenticated/_app/addons/webhook/endpoints/index.tsx`**:
  - Fixed outbound webhook endpoint configuration.
- **`src/routes/_authenticated/_app/addons/webhook/events.tsx`**:
  - Event payload history and delivery status monitoring.
- **`src/routes/_authenticated/_app/addons/webhook/settings.tsx`**:
  - Webhook secret regeneration and HMAC signature verification.

### Wave 7: Cross-Portal Integration & Release Quality Gate
- **Test Infrastructure (`scratch/`)**:
  - `scratch/execute-operational-smoke-tests.ts`: Automated multi-tenant API and database smoke runner.
  - `scratch/browser-smoke-dashboard.js`: Playwright automated UI hydration suite.
  - `scratch/probe-55-routes.js`: Automated probe of all 55 registered TanStack routes.
- **Build Quality**:
  - Type-checking: 0 errors across root and server (`npx tsc --noEmit`).
  - Production build: `vite build` completed in 7.57s.
  - Regression tests: 93/93 tests passing in Vitest.

---

## 2. Backward Compatibility & Database Migration Notes

- **Database Changes:** All models (`LeaveRequest`, `AttendanceRegularization`, `Payslip`, `Employee`, `Tenant`) utilize existing database schema tables without destructive migrations.
- **API Contracts:** No breaking changes introduced. Existing endpoints retain existing response schemas while adding strict multi-tenant validation filters.
- **Rollback Assurance:** Preceding stable commit `d79bc10` is verified as the rollback target.
