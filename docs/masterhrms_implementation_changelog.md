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
  - Production build: `vite build` completed in 7.85s.
  - Regression tests: 93/93 tests passing in Vitest.

### Wave 8: Final Gap Audit, Evidence Validation & Production Readiness
- **`server/src/middleware/maintenance.ts`**:
  - **Least-Privilege Webhook Whitelisting:** Replaced permissive `url.startsWith("/api/webhooks")` with explicit payment webhook routes (`/api/payments/razorpay/webhook`, `/api/webhooks/razorpay`, `/api/billing/webhook`, `/api/commerce/webhook`), strictly blocking untrusted webhooks with HTTP 503 during maintenance.
  - **Dual-Source Config Resolution:** Unified maintenance resolution across `system-platform-settings` CMS page and `SettingsService` so that scheduled windows, start times, end times, and notices are never bypassed by fallback keys.
  - **Missing & Invalid Date Hardening:** Refined `evaluateMaintenanceStatus` to safely handle scheduled maintenance with missing or invalid end dates (evaluates to active without crashing and omits fabricated `Retry-After`).
- **`server/src/tests/maintenance-mode-workflow.test.ts`**:
  - Expanded test coverage from 13 to 18 scenarios, adding tests for missing end times (1.7), invalid date strings (1.8), verified payment webhooks (2.8), arbitrary webhook rejection (2.9), and forged Super Admin JWT rejection (2.10).
- **`server/src/tests/phase1-payroll.test.ts`**:
  - Ensured automated tenant salary structure and component assignment initialization for statutory batch pipeline tests, executing all 9 test groups (64/64 tests passed).
- **Comprehensive Test Results**:
  - Frontend Vitest: 93/93 passed (100%).
  - Golden Payroll: 18/18 passed (100%).
  - Phase 1 Payroll Pipeline: 64/64 passed (100%).
  - Maintenance Mode: 18/18 passed (100%).
  - Cumulative tests executed: **193/193 passed (100%)**.
  - TypeScript: 0 errors across root and server.
  - Production Build: Exit code 0 (7.85s).

### Wave 9: P0 Critical Defect Resolution — Statutory TDS Engine & Income-tax Act, 2025 Reconciliation
- **Defect Investigated & Root Cause:**
  - A potential critical TDS defect was reported where a gross salary of ₹75,000/mo (₹9,00,000 annual gross, standard deduction ₹75,000, taxable ₹8,25,000) incorrectly generated ₹33,800 annual TDS (₹2,816.67/mo) yielding ₹67,483.33 net pay.
  - Root cause was traced to hardcoded legacy slabs (0-3L, 3L-7L @ 5%, 7L-10L @ 10%) and an obsolete Section 87A rebate threshold of ₹7,00,000 in `server/src/services/payroll-engine.service.ts` and `server/src/services/tds-calculator.service.ts`, bypassing the updated `TDS_ITA2025` database rule pack.
- **Statutory Provisions Applied (AY 2026-27 / TY 2026-27):**
  - **Income-tax Act, 2025 Section 392** (salary withholding tables replacing 1961 Act Section 192).
  - **New Tax Regime Slabs:**
    - ₹0 to ₹4,00,000: 0%
    - ₹4,00,001 to ₹8,00,000: 5% (₹20,000)
    - ₹8,00,001 to ₹12,00,000: 10% (₹40,000)
    - ₹12,00,001 to ₹16,00,000: 15% (₹60,000)
    - ₹16,00,001 to ₹20,00,000: 20% (₹80,000)
    - ₹20,00,001 to ₹24,00,000: 25% (₹1,00,000)
    - Above ₹24,00,000: 30%
  - **Section 87A Resident Individual Rebate:** Full rebate up to ₹12,00,000 taxable income for resident individuals. Marginal relief enforced for taxable incomes slightly exceeding ₹12,00,000 (tax payable cannot exceed excess taxable income over ₹12,00,000).
  - **Non-Resident Individual (NRI) Ineligibility:** NRI employees receive 0% rebate regardless of income.
- **Files Modified & Hardened:**
  - `server/src/services/payroll-engine.service.ts`: Updated `calculateAnnualTDS` and `computeEmployeePayrollBreakdown` with full ITA 2025 Section 392 slabs, dynamic DB rule lookup (`TDS_ITA2025`), residency support (`isResident`), marginal relief, and `TaxCalculationOptions`.
  - `server/src/services/tds-calculator.service.ts`: Updated `NEW_REBATE_87A_THRESHOLD = 1200000`, 4L slab intervals, and marginal relief calculation.
  - `server/src/routes/forms.routes.ts`: Updated Form 16 rebate label to ₹12,00,000.
  - `scratch/staging-lifecycle-e2e-smoke.ts`: Reconciled Step 5 assertion to `netPay === 70300 && tds === 0`.
  - `server/src/tests/statutory-tds-reconciliation.test.ts` (NEW): 12 comprehensive regression tests.
- **Historical Payroll Run Audit:**
  - Audited all existing database payslips: Exactly 7 payslips exist, all synthetic test fixtures (`slip-bob-sec-001`, `slip-red-smoke-001`, etc.) and 1 draft. Zero finalized live production payroll runs exist.
- **Test Evidence:**
  - `statutory-tds-reconciliation.test.ts`: 12/12 passed (100%).
  - `p4-payroll-engine.test.ts`: 18/18 passed (100%).
  - `staging-lifecycle-e2e-smoke.ts`: 7/7 stages passed (100%).
  - TypeScript: 0 errors across root and server.

---

## 2. Backward Compatibility & Database Migration Notes

- **Database Changes:** All models (`LeaveRequest`, `AttendanceRegularization`, `Payslip`, `Employee`, `Tenant`, `SalaryStructure`, `StatutoryRule`) utilize existing database schema tables without destructive migrations.
- **API Contracts:** No breaking changes introduced. Existing endpoints retain existing response schemas while adding strict multi-tenant validation filters.
- **Rollback Assurance:** Preceding stable commit `d79bc10` is verified as the rollback target. Tag `v1.0.0-employee-portal` points to `1700cbd`.

