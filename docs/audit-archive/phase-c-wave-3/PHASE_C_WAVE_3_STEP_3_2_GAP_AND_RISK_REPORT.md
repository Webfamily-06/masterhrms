# Phase C — Wave 3 — Step 3.2: Gap and Risk Report

**Status**: COMPREHENSIVE POST-INTEGRATION AUDIT  
**Date**: 2026-09-27T00:43:00+05:30  
**Scope**: Fiscal Controls, COA Hierarchy, Posting Guards, and Database Integration Readiness

---

## 1. Executive Summary

Step 3.2 implementation and database-backed testing successfully achieved all primary functional goals:
1. Chart of Accounts parent-child hierarchy with cycle and self-parent prevention.
2. Multi-tenant Fiscal Year and Monthly Accounting Period lifecycle management.
3. Fail-closed transaction posting guard integrated across all 9 manual and auto-posting paths.
4. Backward compatibility preserved for legacy tenants with zero configured fiscal years.
5. Strict tenant isolation and balanced double-entry accounting integrity.

This report documents the residual technical gaps, pre-existing legacy defects, and operational risks uncovered during the integration and regression testing against `master_hrms_dev`.

---

## 2. Identified Gaps & Technical Observations

### GAP-3.2-01: HTTP Status Code Uniformity on Guard Rejections
* **Observation**: In `accounting.routes.ts`:
  - `POST /api/accounting/journal-entries` explicitly catches `PeriodPostingError` and returns `HTTP 400 Bad Request` with `{ code: "PERIOD_CLOSED_FOR_POSTING", error: "..." }`.
  - `POST /api/accounting/transfers` and `POST /api/accounting/journal-entries/:id/void` invoke `assertOpenPeriodForPosting` inside transactions, but generic `catch (error: any)` blocks return `HTTP 500 Internal Server Error` instead of `HTTP 400`.
* **Impact**: Low operational risk. The transaction is safely rolled back atomically and no corrupt records are written to the database; however, the client receives a 500 error rather than a structured 400 client-validation error.
* **Remediation Plan (Scheduled for Step 3.3/Wave 3 Refinement)**: Normalize error handling in `transfers` and `void` endpoints:
  ```typescript
  if (error instanceof PeriodPostingError) {
    return res.status(400).json({ error: error.message, code: error.code });
  }
  ```

### GAP-3.2-02: Historical Test Suite Hardcoding 106 Schema Models
* **Observation**: `server/src/tests/autoscoping-deep-coverage.test.ts` (written in Phase 1) contains an assertion:
  ```typescript
  const verified = totalModels === 106 && unclassified.length === 0 && mismatched.length === 0;
  ```
  Step 3.2 legitimately introduced 2 new models (`FiscalYear` and `AccountingPeriod`), increasing the model count from 106 to 108.
* **Impact**: Zero runtime or functional risk. Both new models were verified to be registered as `DIRECT_TENANT` with 0 unclassified and 0 mismatched models. The test failed purely on the static count check.
* **Remediation Plan**: Update test expectation constant in `autoscoping-deep-coverage.test.ts` to `totalModels === 108` during authorized test maintenance.

### GAP-3.2-03: Historical Test Suites Hardcoding Remote IP `147.79.66.214`
* **Observation**: `server/src/tests/prisma-proxy-facade.test.ts` and `server/src/tests/tenant-context-pilot.test.ts` include a test scenario verifying broken host connection timeouts by attempting to connect to `mysql://master_hrms:bad_password@147.79.66.214:3306/non_existent_db?connect_timeout=3`.
* **Impact**: Per strict safety rules, any test attempting remote connections must be skipped. Running these tests locally risks hanging or attempting unauthorized outbound connections.
* **Remediation Plan**: Replace the hardcoded remote IP in the test fixture setup with a reserved non-routable loopback IP (e.g., `127.0.0.2:3307`) or a mock connection failure.

### GAP-3.2-04: Pre-Existing TypeScript Build Errors in Legacy Routes
* **Observation**: Running `cd server && npx tsc --noEmit` yields 11 TypeScript errors across 5 files:
  - `src/routes/attendance.routes.ts`: Type mismatch on `AttendanceStatus` (`on_leave` vs union), missing `totalHours` property, missing `employee` relation in select.
  - `src/routes/payroll.routes.ts`: `status` property missing in `PayslipUpdateManyMutationInput`.
  - `src/routes/projects.routes.ts`: Property `unitPrice` and `status` typing issues in invoices.
  - `src/routes/workspace.routes.ts`: Object spread error on nullable `previous.content`.
  - `src/tests/prisma-proxy-facade.test.ts`: Missing `tenant` nested create in mock announcement input.
* **Impact**: Zero errors originate from Step 3.2 code (`accounting.routes.ts`, `fiscal-period.service.ts`, `ledger-posting.service.ts`, and `wave3-step3-2-integration.test.ts` are 100% clean).
* **Remediation Plan**: Address legacy type discrepancies during their respective module hardening waves or dedicated technical debt passes.

---

## 3. Operational & Financial Risk Analysis

| Risk Area | Severity | Likelihood | Mitigation Strategy in Step 3.2 |
|---|---|---|---|
| **Unbalanced Double-Entry Ledgers** | High | Low | Atomic Prisma transactions enforce `SUM(debits) === SUM(credits)` on all 9 posting paths; verified mathematically by integration scenario #23. |
| **Backdated Posting into Closed Audit Periods** | Critical | Negligible | `assertOpenPeriodForPosting` runs inside the database transaction before any journal entry is created. Rejects immediately if year or period status is `closed`. |
| **Cross-Tenant Accounting Leakage** | Critical | Negligible | Both `FiscalYear` and `AccountingPeriod` are enforced as `DIRECT_TENANT_MODELS`. Step 3.1 and Step 3.2 suites confirm 0 cross-tenant visibility or mutation. |
| **Breaking Legacy Tenants with No Fiscal Setup** | High | Low | Explicit fallback policy: if `fiscalYear.count({ where: { tenantId } }) === 0`, posting succeeds normally without rejecting legacy transactions. Verified in scenario #21. |
| **Orphaned Ledger Entries on Partial Failures** | Medium | Negligible | Auto-posting functions execute inside `prisma.$transaction`. Rejections trigger complete atomic rollback; verified by scenario #22. |

---

## 4. Next Step Readiness (Step 3.3 Authorization Prerequisites)

Step 3.2 provides the mandatory fiscal period and ledger posting baseline for subsequent Wave 3 stages:
- **Step 3.3**: Customer Invoicing & Accounts Receivable (requires open period posting, AR ledger accounts).
- **Step 3.4**: Supplier Purchasing & Accounts Payable (requires open period posting, AP ledger accounts, inventory posting).
- **Step 3.5**: Inventory Valuation & Stock Movement Tracking (uses COA inventory asset accounts and stock adjustment posting).
- **Step 3.6**: Financial Reporting & Ledger Reconciliations (relies on fiscal years, periods, and verified double-entry balances).

All foundational capabilities for Step 3.3 are established, stable, and verified in MySQL.
