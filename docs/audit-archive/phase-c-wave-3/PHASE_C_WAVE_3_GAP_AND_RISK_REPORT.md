# PHASE C — WAVE 3 GAP AND RISK REPORT
## Comprehensive Technical, Security, Financial, and Architectural Risk Assessment

**Audit Scope:** Financial Accounting, Double-Entry General Ledger, Inventory Concurrency, Purchasing, Sales Invoicing  
**Audit Standard:** Strict pre-implementation risk evaluation prior to code authorization  

---

## 1. EXECUTIVE RISK SUMMARY

The pre-implementation audit has evaluated the codebase against enterprise ERP standards and constitutional guidelines. While the target application already features rich schemas and sophisticated routines for double-entry ledger posting and multi-warehouse transfers, **six critical-to-high severity gaps** must be addressed during implementation to guarantee tenant security, financial integrity, and stock accuracy under load.

---

## 2. DETAILED GAP IDENTIFICATION & ROOT CAUSE ANALYSIS

### GAP 1 (CRITICAL): Missing Router-Level `resolveTenantContext` Middleware
- **Severity:** CRITICAL
- **Category:** Multi-Tenant Isolation & Security
- **Affected Files:**
  - `server/src/routes/accounting.routes.ts`
  - `server/src/routes/invoices.routes.ts`
  - `server/src/routes/products.routes.ts`
  - `server/src/routes/purchases.routes.ts`
  - `server/src/routes/sales.routes.ts`
  - `server/src/routes/adjustments.routes.ts`
  - `server/src/routes/transfers.routes.ts`
  - `server/src/routes/customers.routes.ts`
  - `server/src/routes/suppliers.routes.ts`
- **Root Cause Analysis:** Unlike Wave 2 routers which mount `router.use(requireAuth, resolveTenantContext);`, Wave 3 routers rely on individual endpoints manually calling `resolveTenantId(req, res)`. However, `server/src/prisma.ts` exports `createDynamicPrismaProxy()`. When an endpoint executes a Prisma query against any `DIRECT_TENANT_MODELS` (e.g. `ChartOfAccount`, `Product`, `Sale`, `Purchase`), the proxy checks `getTenantContext()`. Because `resolveTenantContext` was not executed, `getTenantContext()` returns undefined, causing the proxy to fail closed with a `TenantContextRequiredError` (403).
- **Mitigation Strategy:** Mount `router.use(requireAuth, resolveTenantContext)` at the top of all Wave 3 routers as Step 3.1.

---

### GAP 2 (HIGH): Missing Dedicated `SalesReturn` and `PurchaseReturn` Schema Models
- **Severity:** HIGH
- **Category:** Functional Feature Parity
- **Affected Files:** `server/prisma/schema.prisma`
- **Root Cause Analysis:** Laravel maintains `sales_invoice_returns` and `purchase_returns` tables with credit/debit note linking. The current target schema completely lacks dedicated models for returns.
- **Impact:** Commercial operations cannot handle customer RMA restocks, vendor return shipments, or automated issuance of credit/debit notes.
- **Mitigation Strategy:** Add `SalesReturn`, `SalesReturnDetail`, `PurchaseReturn`, and `PurchaseReturnDetail` models to `schema.prisma` with `tenant_id` foreign keys and auto-posting ledger routines.

---

### GAP 3 (HIGH): Absence of Period Locking & Fiscal Year Closing Controls
- **Severity:** HIGH
- **Category:** Financial Integrity & Audit Compliance
- **Affected Files:** `server/src/routes/accounting.routes.ts`, `schema.prisma`
- **Root Cause Analysis:** Neither Laravel nor the current target schema prevents backdated posting to closed periods. Users can post or modify journal entries in prior months or closed fiscal years.
- **Impact:** Retroactive changes invalidate previously filed statutory reports (P&L, Balance Sheet, GST filings).
- **Mitigation Strategy:** Implement `FiscalPeriod` model with `isClosed` flag. Enforce a guard in `ledger-posting.service.ts` and manual journal endpoints rejecting transactions with `entryDate <= period.endDate` when `isClosed === true`.

---

### GAP 4 (HIGH): Concurrency Race Condition in POS / Sales Stock Deductions
- **Severity:** HIGH
- **Category:** Inventory Concurrency & Data Consistency
- **Affected Files:** `server/src/routes/sales.routes.ts`, `server/src/routes/invoices.routes.ts`
- **Root Cause Analysis:** While `inventory-movement.service.ts` uses atomic SQL updates (`quantity: { gte: item.quantity }`), standard POS and sales checkout endpoints fetch `ProductWarehouse` with a `findFirst`, inspect quantity in JS, and then call `update({ data: { quantity: current - requested } })`.
- **Impact:** Two simultaneous checkouts for the same product can both read available stock as 1, approve both transactions, and decrement stock to -1 (overselling).
- **Mitigation Strategy:** Standardize sales inventory deduction to use atomic conditional decrements:
  ```typescript
  const updated = await tx.productWarehouse.updateMany({
    where: { productId, warehouseId, quantity: { gte: requestedQuantity } },
    data: { quantity: { decrement: requestedQuantity } },
  });
  if (updated.count === 0) throw new Error("Insufficient stock or concurrent modification conflict");
  ```

---

### GAP 5 (MEDIUM): Inventory Costing Limited to Standard / Moving Average
- **Severity:** MEDIUM
- **Category:** Accounting & Valuation
- **Affected Files:** `server/src/services/inventory-movement.service.ts`, `server/src/routes/accounting.routes.ts`
- **Root Cause Analysis:** Target calculates inventory valuation by multiplying current warehouse stock by the product's `purchasePrice`. There is no FIFO inventory batch/lot tracking queue.
- **Impact:** In environments with fluctuating purchase costs, Cost of Goods Sold (COGS) does not reflect actual batch costs.
- **Mitigation Strategy:** Document as acceptable moving average valuation for Wave 3, with FIFO queue enhancement planned for advanced manufacturing/batch tracking in Wave 5.

---

### GAP 6 (MEDIUM): Journal Voiding Does Not Produce Compensatory Reversal Vouchers
- **Severity:** MEDIUM
- **Category:** General Ledger Audit Trail
- **Affected Files:** `server/src/routes/accounting.routes.ts` (`POST /journal-entries/:id/void`)
- **Root Cause Analysis:** When an entry is voided, its status is changed to `void` and account balances are updated directly. No compensating reversal journal entry is inserted.
- **Impact:** Breaches strict GAAP / statutory audit trail standards where posted journal entries must never be mutated; instead, an offsetting reversal entry must be posted.
- **Mitigation Strategy:** Refactor `/journal-entries/:id/void` to create an explicit reversal `JournalEntry` (e.g., `JE-2026-REV-XXXX`) swapping debit and credit lines with reference to the original entry ID.

---

### GAP 7 (HIGH): Zero Automated Integration Tests for Wave 3 Workflows
- **Severity:** HIGH
- **Category:** Test Coverage & Quality Assurance
- **Affected Files:** `server/src/tests/`
- **Root Cause Analysis:** No test suite currently exercises Wave 3 APIs. Double-entry ledger balance, inventory race conditions, and purchase lifecycles are unverified by automated CI.
- **Mitigation Strategy:** Build a comprehensive `wave3-accounting-erp.test.ts` suite covering all 5 domains prior to final acceptance.

---

### GAP 8 (LOW): Ephemeral Socket Timeout Observed in High-Concurrency Test Run
- **Severity:** LOW
- **Category:** Test Environment Runtime
- **Affected Component:** `server/src/tests/wave2-hrms.test.ts`
- **Finding:** During the pre-implementation audit test verification run, scenario `[9] W2-T09` encountered a 54s socket timeout on the ephemeral test port under heavy asynchronous load, causing a single 500 error while the remaining 30 scenarios passed (30/31).
- **Mitigation Strategy:** Adjust ephemeral test client timeout and ensure connection pools release connections promptly between test assertions.

---

## 3. RISK MATRIX SUMMARY

| Risk ID | Risk Description | Severity | Probability | Impact | Mitigation Priority |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **R-1** | Proxy fail-closed due to unmounted `resolveTenantContext` | CRITICAL | HIGH | All Wave 3 API calls fail with 403 | **P0 (Immediate)** |
| **R-2** | Inability to process returns and debit/credit notes | HIGH | HIGH | Parity gap with Laravel source | **P1 (Core Wave 3)** |
| **R-3** | Retroactive posting to closed financial periods | HIGH | MEDIUM | Invalidation of statutory P&L & Balance Sheet | **P1 (Core Wave 3)** |
| **R-4** | POS overselling race conditions under concurrent load | HIGH | HIGH | Negative stock balances and physical stock mismatch | **P1 (Core Wave 3)** |
| **R-5** | Non-standard journal voiding mutating audit history | MEDIUM | MEDIUM | Audit failure during external financial inspection | **P2 (Hardening)** |
| **R-6** | Regressions undetected due to absent Wave 3 automated tests | HIGH | HIGH | Operational defects reaching production | **P1 (Core Wave 3)** |
