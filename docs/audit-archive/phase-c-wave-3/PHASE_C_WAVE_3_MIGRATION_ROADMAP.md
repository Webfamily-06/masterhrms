# PHASE C — WAVE 3 MIGRATION ROADMAP
## Incremental Implementation Plan: Financial Accounting, Inventory, Purchases & Sales Invoicing

**Lifecycle Standard:** `Audit -> Requirements & Gaps -> DB Architecture -> API Specs -> Backend -> UI -> RBAC -> Addon Entitlement -> Integration & Audit -> Testing -> Verification & Lock`  
**Authorization Mode:** READ-ONLY PRE-IMPLEMENTATION AUDIT  
**Status:** PROPOSED ROADMAP — AWAITING EXPLICIT USER AUTHORIZATION TO COMMENCE STEP 3.1  

---

## 1. IMPLEMENTATION PRINCIPLES & CONSTITUTIONAL GATES

1. **Strict Dependency Order:** Foundation security and routing MUST precede operational modules; operational modules MUST precede financial posting; financial posting MUST precede reporting.
2. **Zero Hardcoded Data:** All financial amounts, tax calculations, and stock deductions must execute through real Prisma MySQL transactions.
3. **No Unauthenticated or Unscoped Endpoints:** Every Wave 3 endpoint must enforce `requireAuth`, `resolveTenantContext`, and appropriate RBAC permissions (`finance.accounts.*`, `inventory.products.*`, `procurement.purchases.*`, `sales.invoices.*`).
4. **Controlled Step Execution:** Each step must be implemented, verified with automated tests, and confirmed before proceeding to the subsequent step.

---

## 2. STEP-BY-STEP IMPLEMENTATION ROADMAP

### STEP 3.1: WAVE 3 ROUTE TENANT ISOLATION & RBAC HARDENING
- **Objective:** Fix the critical tenant isolation gap by mounting `resolveTenantContext` and RBAC middleware across all Wave 3 backend routers.
- **Affected Routers:**
  - `server/src/routes/accounting.routes.ts`
  - `server/src/routes/invoices.routes.ts`
  - `server/src/routes/products.routes.ts`
  - `server/src/routes/purchases.routes.ts`
  - `server/src/routes/sales.routes.ts`
  - `server/src/routes/adjustments.routes.ts`
  - `server/src/routes/transfers.routes.ts`
  - `server/src/routes/customers.routes.ts`
  - `server/src/routes/suppliers.routes.ts`
- **Required Changes:**
  - Mount `router.use(requireAuth, resolveTenantContext);` at the top of each router file.
  - Verify that all direct calls through `prismaProxy` operate seamlessly without throwing `TenantContextRequiredError`.
  - Validate role permissions for accounting, procurement, inventory, and sales actions.
- **Acceptance Criteria:**
  - Unauthenticated requests return 401.
  - Cross-tenant requests to any Wave 3 endpoint fail closed with 403 or 404.
  - No `TenantContextRequiredError` exceptions logged during standard tenant operations.

---

### STEP 3.2: CHART OF ACCOUNTS & FISCAL PERIOD CONTROLS
- **Objective:** Provide robust Chart of Accounts management with immutable fiscal year closing and period locking.
- **Database Additions:**
  - Add `FiscalPeriod` model to `server/prisma/schema.prisma` (`year`, `periodName`, `startDate`, `endDate`, `isClosed`, `closedAt`, `closedById`).
- **Laravel Reference Files:**
  - `packages/workdo/Account/src/Models/ChartOfAccount.php`
  - `packages/workdo/Account/src/Http/Controllers/ChartOfAccountController.php`
- **Target Backend Files:**
  - `server/src/routes/accounting.routes.ts`
  - `server/src/services/ledger-posting.service.ts`
- **Target Frontend Files:**
  - `src/routes/_authenticated/_app/accounting.tsx` (Tabs: "chart", "periods")
- **Required Backend Logic:**
  - Period locking guard: Rejects manual journal entries or operational postings if transaction date falls within a closed fiscal period.
  - System account deletion protection: Reject deletion of default seed accounts (1010, 1020, 1030, 1040, 2010, 2020, 2030, 3010, 4010, 5010, etc.).
- **Acceptance Criteria:**
  - Tenants cannot modify or delete system-seeded accounts.
  - Posting to a closed fiscal period returns `400 PERIOD_CLOSED_FOR_POSTING`.

---

### STEP 3.3: PRODUCT CATALOG, MULTI-WAREHOUSE & ATOMIC STOCK ENGINE
- **Objective:** Harden product catalog management and implement atomic stock concurrency guards for all inventory movements.
- **Laravel Reference Files:**
  - `packages/workdo/ProductService/src/Models/ProductServiceItem.php`
  - `packages/workdo/ProductService/src/Models/WarehouseStock.php`
  - `main-file/app/Models/Warehouse.php`
  - `main-file/app/Models/Transfer.php`
- **Target Backend Files:**
  - `server/src/routes/products.routes.ts`
  - `server/src/routes/transfers.routes.ts`
  - `server/src/routes/adjustments.routes.ts`
  - `server/src/services/inventory-movement.service.ts`
- **Target Frontend Files:**
  - `src/routes/_authenticated/_app/products.tsx`
  - `src/routes/_authenticated/_app/transfers.tsx`
  - `src/routes/_authenticated/_app/adjustments.tsx`
- **Required Backend Logic:**
  - Standardize all stock additions and deductions to use atomic SQL guards:
    `quantity: { gte: requestedQuantity }` and `quantity: { decrement: requestedQuantity }`.
  - Enforce atomic transactions for transfer state transitions (`pending` -> `in_transit` -> `completed` / `rejected`).
  - Auto-post GL entries for stock adjustments (Dr: Shrinkage 5020, Cr: Inventory 1040).
- **Acceptance Criteria:**
  - 10 concurrent requests attempting to purchase the last remaining item succeed exactly once; 9 requests fail with stock exhaustion error.
  - Transfers correctly adjust source and destination warehouses upon status transition.

---

### STEP 3.4: PURCHASING LIFECYCLE & ACCOUNTS PAYABLE
- **Objective:** Complete the procurement workflow from Purchase Order creation to Goods Receipt, Bill generation, and Supplier payment.
- **Laravel Reference Files:**
  - `main-file/app/Models/PurchaseInvoice.php`
  - `main-file/app/Models/PurchaseInvoiceItem.php`
  - `packages/workdo/Account/src/Models/VendorPayment.php`
  - `packages/workdo/Account/src/Services/JournalService.php` (`createPurchaseInventoryJournal`)
- **Target Backend Files:**
  - `server/src/routes/purchases.routes.ts`
  - `server/src/routes/suppliers.routes.ts`
  - `server/src/services/ledger-posting.service.ts`
- **Target Frontend Files:**
  - `src/routes/_authenticated/_app/purchases.tsx`
  - `src/routes/_authenticated/_app/suppliers.tsx`
- **Required Backend Logic:**
  - Status transition from `pending` to `received` executes goods receipt:
    1. Increments `ProductWarehouse.quantity`.
    2. Auto-posts balanced journal entry: Dr Merchandise Inventory (1040), Cr Accounts Payable (2010).
  - Supplier payment endpoint (`POST /purchases/:id/payments`):
    1. Updates `Purchase.paidAmount` and `Purchase.paymentStatus`.
    2. Auto-posts settlement journal entry: Dr Accounts Payable (2010), Cr Bank Account (1020).
- **Acceptance Criteria:**
  - Receiving a purchase order updates physical stock and creates a balanced journal entry in `journal_entries`.
  - Making a payment reduces supplier payable balance and credits bank account.

---

### STEP 3.5: SALES INVOICING, POS REGISTERS & ACCOUNTS RECEIVABLE — ✅ COMPLETE
- **Objective:** Finalize the sales invoicing pipeline, high-speed POS terminal, register shift sessions, and customer payment collections.
- **Status:** ✅ COMPLETE (10/10 Tests Passed in `wave3-step3-5-sales-pos-ar.test.ts`)
- **Laravel Reference Files:**
  - `main-file/app/Models/SalesInvoice.php`
  - `main-file/app/Models/SalesInvoiceItem.php`
  - `packages/workdo/Pos/src/Models/Pos.php`
  - `packages/workdo/Pos/src/Models/PosBillingCounter.php`
- **Target Backend Files:**
  - `server/src/routes/sales.routes.ts`
  - `server/src/routes/invoices.routes.ts`
  - `server/src/routes/customers.routes.ts`
  - `server/src/services/ledger-posting.service.ts`
- **Target Frontend Files:**
  - `src/routes/_authenticated/_app/invoices.tsx`
  - `src/routes/_authenticated/_app/pos.tsx`
  - `src/routes/_authenticated/_app/sales-dashboard.tsx`
- **Required Backend Logic:**
  - Invoicing & POS checkout execution within atomic transaction:
    1. Atomic decrement of `ProductWarehouse.quantity`.
    2. Creation of `Sale`, `SaleDetail`, and `SalePayment`.
    3. Auto-posting of double-entry journal: Dr Cash/Bank/AR, Cr Sales Revenue (4010), Cr GST Payable (2020).
  - Register shift management: Open shift with float, track running tender totals, close shift with expected vs actual variance calculation.
  - Held orders: Park and resume cart sessions without deducting inventory until checkout.
- **Acceptance Criteria:**
  - Sales invoices generate sequential numbers and auto-post to General Ledger.
  - POS shift closure generates accurate cash discrepancy reports.
  - Accounts Receivable settlements post balanced double-entry journals (Dr Bank/Cash, Cr AR 1030).
  - Automated test suite `server/src/tests/wave3-step3-5-sales-pos-ar.test.ts` passes 10/10 cleanly.

---

### STEP 3.6: SALES & PURCHASE RETURNS ENGINE (CREDIT & DEBIT NOTES)
- **Objective:** Implement missing return models, restocking workflows, and compensatory credit/debit note generation.
- **Database Additions:**
  - Add `SalesReturn`, `SalesReturnDetail`, `PurchaseReturn`, `PurchaseReturnDetail` models to `server/prisma/schema.prisma`.
  - Register models in `tenant-models.config.ts`.
- **Laravel Reference Files:**
  - `main-file/app/Models/SalesInvoiceReturn.php`
  - `main-file/app/Models/PurchaseReturn.php`
  - `packages/workdo/Account/src/Models/CreditNote.php`
  - `packages/workdo/Account/src/Models/DebitNote.php`
- **Target Backend Files:**
  - New route: `server/src/routes/returns.routes.ts` (or integrated in `sales.routes.ts` and `purchases.routes.ts`).
  - Auto-posting methods in `ledger-posting.service.ts`: `autoPostSalesReturnToLedger` & `autoPostPurchaseReturnToLedger`.
- **Target Frontend Files:**
  - New frontend screens / tabs: Returns management dialogs and lists.
- **Required Backend Logic:**
  - Sales Return: Restocks returned units into warehouse; issues credit note / refunds payment; debits Sales Revenue, debits GST Payable, credits AR / Cash.
  - Purchase Return: Decrements stock from warehouse; issues debit note to supplier; debits Accounts Payable, credits Merchandise Inventory, credits GST Input Credit.
- **Acceptance Criteria:**
  - Returned merchandise immediately reflects in physical warehouse stock.
  - Customer AR and supplier AP balances are adjusted accurately with balanced journal entries.

---

### STEP 3.7: GENERAL LEDGER HARDENING, VOID REVERSALS & FINANCIAL REPORTS
- **Objective:** Standardize GAAP-compliant journal voiding with compensatory reversal vouchers, and finalize financial reports.
- **Laravel Reference Files:**
  - `packages/workdo/Account/src/Services/ReportService.php`
- **Target Backend Files:**
  - `server/src/routes/accounting.routes.ts`
- **Target Frontend Files:**
  - `src/routes/_authenticated/_app/accounting.tsx` (Tabs: "statements", "trial-balance", "ledger", "aging")
- **Required Backend Logic:**
  - Journal Voiding Refactor: Refactor `POST /journal-entries/:id/void` to create an immutable reversal journal entry (`JE-YYYY-REV-XXXX`) swapping debits and credits, marking original entry as `void`.
  - Trial Balance Verification: Ensure debits equal credits across all accounts in the tenant.
  - Financial Statements: Real-time dynamic P&L and Balance Sheet with printable export format.
  - Aging Buckets: 0-30, 31-60, 61-90, 90+ days aging for unpaid customer invoices and vendor bills.
- **Acceptance Criteria:**
  - Voiding an entry preserves original record and creates an audit-trailed reversal entry.
  - Trial balance mathematical difference is strictly 0.00.

---

### STEP 3.8: AUTOMATED TEST SUITE & FINAL PARITY ACCEPTANCE
- **Objective:** Create and execute an end-to-end automated test suite verifying all Wave 3 workflows across tenant isolation, double-entry equality, and inventory concurrency.
- **New Test File:** `server/src/tests/wave3-accounting-erp.test.ts`
- **Required Test Scenarios (Minimum 25 Scenarios):**
  1. Chart of Accounts auto-seeding for new tenant (17 default accounts).
  2. Manual journal entry balanced debit/credit validation (`<= 0.01`).
  3. Unbalanced manual journal entry rejection (400).
  4. Closed fiscal period posting rejection (400).
  5. Multi-tenant isolation: Tenant A cannot view or manipulate Tenant B's accounts or journals.
  6. Product creation with SKU uniqueness constraint per tenant.
  7. Multi-warehouse stock allocation and stock summary verification.
  8. Stock transfer workflow (`pending` -> `in_transit` -> `completed`).
  9. Stock transfer cancellation / rejection stock restoration.
  10. Stock adjustment (addition / surplus) with automated GL posting.
  11. Stock adjustment (damage / loss) with automated GL posting.
  12. Purchase order creation and line-item tax calculation.
  13. Purchase order goods receipt with physical stock addition and AP ledger posting.
  14. Supplier payment recording and AP balance reduction.
  15. Purchase return and debit note inventory deduction.
  16. Sales invoice generation with statutory CGST/SGST/IGST calculation.
  17. POS checkout with cash payment and automated revenue/tax ledger posting.
  18. POS split-payment (Cash + UPI) and payment allocation.
  19. Inventory concurrency race condition: 10 parallel checkouts against stock of 1 (overselling prevention).
  20. Held orders parking and resumption.
  21. Cash register shift opening, drop, and closing with variance calculation.
  22. Customer sales return and credit note restocking.
  23. Trial Balance report mathematical equality (`totalDebits === totalCredits`).
  24. Profit & Loss calculation correctness against live transactions.
  25. Balance Sheet equality (`totalAssets === totalLiabilities + totalEquity + netProfit`).
- **Acceptance Criteria:**
  - 100% of scenarios pass in `wave3-accounting-erp.test.ts`.
  - Zero regressions in existing Wave 1 (`wave1-core-saas.test.ts`) and Wave 2 (`wave2-hrms.test.ts`) test suites.

---

## 3. UNRESOLVED ARCHITECTURAL DECISIONS REQUIRING USER INPUT

Before Step 3.1 implementation begins, the user should provide guidance on:
1. **Inventory Valuation Method:** Is Standard Moving Average / Purchase Cost acceptable for Wave 3, or is strict FIFO queue batch tracking mandatory in Wave 3? *(Recommended: Standard Moving Average for Wave 3; defer complex FIFO batch queue to Wave 5).*
2. **Sales & Purchase Returns Model Location:** Should `SalesReturn` and `PurchaseReturn` endpoints reside within `sales.routes.ts` and `purchases.routes.ts`, or should a dedicated `returns.routes.ts` be created? *(Recommended: Dedicated `returns.routes.ts` to keep controllers clean and cohesive).*
3. **Fiscal Period Granularity:** Should period locking support Monthly, Quarterly, and Annual periods, or Annual-only for Wave 3? *(Recommended: Annual + Monthly period locking).*
