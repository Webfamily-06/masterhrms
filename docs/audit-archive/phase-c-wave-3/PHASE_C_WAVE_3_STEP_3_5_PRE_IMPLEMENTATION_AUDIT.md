# Phase C — Wave 3 — Step 3.5: Pre-Implementation Audit Report
## Sales Invoicing, POS Registers & Accounts Receivable (AR)

**Document Version**: 1.0.0  
**Phase**: Phase C (Wave 3 — Step 3.5)  
**Execution Timestamp**: 2026-09-28T22:53:00+05:30  
**Database Target**: `127.0.0.1:3306/master_hrms_dev` (Strict Local Dev Isolation)  
**Status**: AUDIT COMPLETE — READY FOR IMPLEMENTATION

---

### 1. Exact Step 3.5 Title and Roadmap Reference

- **Roadmap Reference**: [`PHASE_C_WAVE_3_MIGRATION_ROADMAP.md`](file:///Users/apple/Documents/hrms/PHASE_C_WAVE_3_MIGRATION_ROADMAP.md) (Lines 119–145)
- **Title**: **STEP 3.5: SALES INVOICING, POS REGISTERS & ACCOUNTS RECEIVABLE**
- **Objective from Roadmap**:
  > "Finalize the sales invoicing pipeline, high-speed POS terminal, register shift sessions, and customer payment collections."

---

### 2. Business Objectives and Scope

1. **Sales Invoicing & POS Billing Pipeline**:
   - Ensure unified, sequential invoice numbers (`INV-YYYY-XXXX` for formal B2B invoices, `REC-YYYY-XXXX` for POS receipts).
   - Atomic transaction guarantees: Stock decrement via centralized `InventoryMovementService.decreaseStock` with concurrency guards (`STOCK_MOVEMENT_TYPES.POS_SALE`), `Sale` creation, `SaleDetail` items creation, initial `SalePayment` creation.
   - Dual-mode GL Auto-Posting:
     - When sale/invoice is fully paid: Dr Cash (1010) / Bank (1020), Cr Sales Revenue (4010), Cr GST Payable (2020).
     - When sale/invoice is unpaid or partially paid (credit sale / accounts receivable): Dr Accounts Receivable (1030), Cr Sales Revenue (4010), Cr GST Payable (2020).
2. **Customer Payment Settlements (Accounts Receivable Lifecycle)**:
   - Discrete customer payment recording (`POST /api/sales/:id/payments` and `POST /api/invoices/:id/payments`):
     - Validates payment amount ($0 < \text{amount} \le \text{total} - \text{paidAmount}$).
     - Concurrency-safe optimistic locking guard preventing overpayment.
     - Creates discrete `SalePayment` installment record with audit details (`amount`, `method`, `referenceNo`, `paidAt`).
     - Updates `Sale.paidAmount` and `Sale.paymentStatus` (`unpaid` -> `partial` -> `paid`).
     - Auto-posts balanced Accounts Receivable settlement journal: Dr Bank Account (1020) or Cash (1010), Cr Accounts Receivable (1030).
     - Validates open fiscal period before posting (`assertOpenPeriodForPosting`).
   - Payment history endpoints:
     - `GET /api/sales/:id/payments` & `GET /api/invoices/:id/payments`.
3. **Customer Accounts Receivable Analytics**:
   - Expose customer-level Accounts Receivable metrics: Invoiced Total, Paid Amount, Net Outstanding AR Balance.
   - Tenant-wide `/api/customers/ar-summary`: Aggregate metrics across all debtors.
   - Customer payment stream endpoint: `GET /api/customers/:id/payments`.
4. **POS Register Shift Sessions & Cash Reconciliation**:
   - Open register shift with starting float (`POST /api/sales/register/open`).
   - Cash in/out drawer drops (`POST /api/sales/register/drop`).
   - Tender-specific tracking: `cashSales`, `cardSales`, `upiSales`, running `expectedCash`.
   - Close shift with physical cash drawer count and variance reconciliation calculation (`POST /api/sales/register/close`).
5. **Held Orders**:
   - Park and resume cart sessions (`/api/sales/held`) without decrementing inventory until checkout.
6. **UI Workflows & High-Information Density**:
   - `invoices.tsx`: Replace simple mock `markPaid` with a proper "Record Customer Payment" dialog, display payment history stream, and surface remaining balance badges.
   - `customers.routes.ts`: Compute outstanding AR balance per customer and overall AR KPI summary.

---

### 3. Laravel Source Files and Workflows Relevant to This Step

| Laravel Source File | Location | Workflow & Responsibilities |
| :--- | :--- | :--- |
| `SalesInvoice.php` | `main-file/app/Models/` | Sales invoice entity, status transitions, customer relation, warehouse, tax modes, line totals |
| `SalesInvoiceItem.php` | `main-file/app/Models/` | Invoice detail items, quantity, unit price, tax rate, discount, subtotal |
| `Pos.php` | `main-file/packages/workdo/Pos/src/Models/` | POS transaction record, cashier reference, payment method, invoice number, totals |
| `PosBillingCounter.php` | `main-file/packages/workdo/Pos/src/Models/` | POS counter/terminal registration, status, default bank/cash account |
| `CustomerPayment.php` | `main-file/packages/workdo/Account/src/Models/` | Customer payment transaction, bank account allocation, payment method, reference number, notes |
| `CustomerPaymentController.php` | `main-file/packages/workdo/Account/src/Http/Controllers/` | Payment execution, outstanding invoice discovery, customer AR balance calculation |
| `JournalService.php` | `main-file/packages/workdo/Account/src/Services/` | `createSalesInvoiceJournal` (Dr AR 1100, Cr Revenue 4100, Cr Tax 2210) & `createCustomerPaymentJournal` (Dr Bank 1020, Cr AR 1100) |

---

### 4. Current Frontend Implementation Status

#### 4.1. `src/routes/_authenticated/_app/invoices.tsx`
- **Current State**:
  - Filterable invoice table with search, status filters (`draft`, `sent`, `paid`, `overdue`), and metric cards.
  - "Create Invoice" dialog with line items, rate, GST rate calculation.
  - View modal displaying invoice details.
- **Gaps Identified**:
  - `markPaid` function previously used a client-side mutation that did not invoke a backend payment recording endpoint.
  - View modal does NOT show discrete payment installments or remaining balance.
  - No "Record Customer Payment" modal allowing entry of payment method (Cash, Bank Transfer, UPI, Cheque), reference number, notes, and partial amount.
  - Does not invalidate accounting / GL query keys on payment success.

#### 4.2. `src/routes/_authenticated/_app/pos.tsx`
- **Current State**:
  - Barcode scanning, category filtering, cart management, discount/tax calculations.
  - Thermal printing (QZ-Tray / browser fallback), cash drawer kick, barcode SVG generation.
  - Register shift drawer with open/close modals and cash discrepancy variance display.
  - Held order park/resume workflows.
- **Gaps Identified**:
  - Ensure all checkout operations strictly adhere to tenant isolation and properly link to register shifts.

#### 4.3. `src/routes/_authenticated/_app/sales-dashboard.tsx`
- **Current State**:
  - Sales charts, top customers, recent orders, revenue metrics.
- **Gaps Identified**:
  - Does not highlight Accounts Receivable (AR) overdue aging or unpaid invoice summary cards.

---

### 5. Current Backend Implementation Status

#### 5.1. `server/src/routes/sales.routes.ts`
- **Current State**:
  - Protected with `requireAuth` and `resolveTenantContext`.
  - Supports `GET /`, `POST /` (POS checkout), `GET /held`, `POST /held`, `DELETE /held/:id`.
  - Cash register shift endpoints: `GET /register/current`, `POST /register/open`, `POST /register/drop`, `POST /register/close`.
  - Offline sync endpoint with replay key protection: `POST /sync-offline`.
- **Gaps Identified**:
  - Completely missing `POST /:id/payments` to record customer installment payments on existing sales/invoices.
  - Completely missing `GET /:id/payments` to retrieve payment receipts for a sale.
  - No concurrency guard on customer payments.

#### 5.2. `server/src/routes/invoices.routes.ts`
- **Current State**:
  - Enforces `requireAuth` and `resolveTenantContext`.
  - `GET /` lists invoices from `Sale` table with `details` and `customer`.
  - `POST /` creates formal B2B invoice in `Sale` table and calls `autoPostSaleToLedger`.
- **Gaps Identified**:
  - Missing authenticated `POST /:id/payments` for invoice payment settlements.
  - Missing `GET /:id/payments` for invoice payment history.

#### 5.3. `server/src/routes/customers.routes.ts`
- **Current State**:
  - CRUD on `Customer` table with tenant isolation.
- **Gaps Identified**:
  - Does NOT calculate `outstandingReceivable` ($\sum (\text{total} - \text{paidAmount})$) per customer in `GET /`.
  - Missing `GET /:id` endpoint to view a single customer with their sales history and balance.
  - Missing `GET /ar-summary` endpoint returning tenant-wide Accounts Receivable metrics.
  - Missing `GET /:id/payments` endpoint returning customer payment history.

#### 5.4. `server/src/services/ledger-posting.service.ts`
- **Current State**:
  - `autoPostSaleToLedger`: Correctly auto-posts on sale creation. If `isPaid: false`, debits Accounts Receivable (1030).
- **Gaps Identified**:
  - Missing `autoPostCustomerPaymentToLedger`: When a customer payment is received, it must auto-post:
    - **DEBIT**: Cash Account (1010) or Primary Operating Bank Account (1020)
    - **CREDIT**: Accounts Receivable (Debtors) (1030)
    - Enforce open fiscal period validation (`assertOpenPeriodForPosting`).
    - Increment Chart of Accounts balance.

---

### 6. Existing Database Models & Migrations

#### Existing Models:
- `Customer` (`customers` table): `id`, `tenantId`, `name`, `email`, `phone`, `gstin`, `creditLimit`, etc.
- `Sale` (`sales` table): `id`, `tenantId`, `invoiceNo`, `type`, `customerId`, `subtotal`, `totalTax`, `total`, `paidAmount`, `paymentStatus`, `paymentMethod`, `notes`, `date`, `dueDate`.
- `SaleDetail` (`sale_details` table): `id`, `saleId`, `productId`, `productName`, `price`, `quantity`, `taxRate`, `taxAmount`, `subtotal`.
- `SalePayment` (`sale_payments` table): `id`, `saleId`, `amount`, `method`, `referenceNo`, `paidAt`.
- `CashRegister` (`cash_registers` table): `id`, `tenantId`, `name`, `status`, `warehouseId`.
- `RegisterShift` (`register_shifts` table): `id`, `tenantId`, `registerId`, `cashierName`, `openingFloat`, `cashSales`, `cardSales`, `upiSales`, `cashIn`, `cashOut`, `expectedCash`, `actualCash`, `variance`, `status`, `openedAt`, `closedAt`.

#### Database Audit Findings:
- `sale_payments` table already exists in MySQL with columns: `id`, `sale_id`, `amount`, `method`, `reference_no`, `paid_at`.
- In `server/src/config/tenant-models.config.ts`, `SalePayment` is classified under `CHILD_DEPENDENT_MODELS` linked to `Sale` (`parentRelation: "sale"`), providing tenant isolation via parent sale scoping.
- To provide parity with `PurchasePayment`, we can add optional columns `notes VARCHAR(255)` and `created_by_id VARCHAR(36)` to `SalePayment` via a safe additive migration, ensuring full transaction traceability.

---

### 7. Feature Parity Gaps

| Ref | Gap / Vulnerability | Planned Remediation in Step 3.5 |
| :---: | :--- | :--- |
| **GAP-1** | No GL posting on customer payment collections | Implement `autoPostCustomerPaymentToLedger` (Dr 1020/1010, Cr 1030) with fiscal period validation |
| **GAP-2** | Missing customer payment recording endpoint | Add `POST /api/sales/:id/payments` and `POST /api/invoices/:id/payments` with overpayment guard |
| **GAP-3** | Missing payment history stream endpoints | Add `GET /api/sales/:id/payments` and `GET /api/invoices/:id/payments` |
| **GAP-4** | Customer AR metrics missing | Compute `outstandingReceivable` in `customers.routes.ts` and add `GET /api/customers/ar-summary` |
| **GAP-5** | Single customer view endpoint missing | Add `GET /api/customers/:id` and `GET /api/customers/:id/payments` |
| **GAP-6** | Invoices UI lacking payment dialog | Add "Record Customer Payment" modal and payment history tab in `invoices.tsx` |

---

### 8. Dependencies on Earlier Steps

1. **Step 3.1 (Tenant Isolation & RBAC)**: Router-level `resolveTenantContext` and `requireAuth` on all sales, invoice, and customer endpoints.
2. **Step 3.2 (Chart of Accounts & Fiscal Periods)**: `assertOpenPeriodForPosting` to prevent posting to closed fiscal periods; system accounts `1010` (Cash), `1020` (Bank), `1030` (Accounts Receivable), `2020` (GST Payable), `4010` (Sales Revenue).
3. **Step 3.3.1–3.3.5 (Atomic Inventory Engine)**: POS checkout and invoice checkout decrement physical warehouse stock through `InventoryMovementService.decreaseStock` with optimistic concurrency guard.
4. **Step 3.4 (P2P Purchasing & Accounts Payable)**: Mirrors the payment ledger architecture, overpayment guards, and settlement double-entry design.

---

### 9. Tenant Isolation & RBAC Requirements

- All queries for `Sale`, `SaleDetail`, `SalePayment`, `CashRegister`, `RegisterShift`, and `Customer` must be strictly scoped to `tenantId`.
- Cross-tenant payment access (Tenant A attempting to record payment on Tenant B's invoice) must return HTTP 404.
- Cross-tenant customer payment retrieval must return HTTP 404.
- Register shift actions (`/open`, `/drop`, `/close`) must enforce authenticated tenant and cashier context.
- Permissions:
  - `sales.invoices.view`, `sales.invoices.create`, `sales.invoices.update`, `sales.invoices.pay`
  - `sales.pos.view`, `sales.pos.checkout`, `sales.register.manage`
  - `sales.customers.view`, `sales.customers.create`, `sales.customers.update`

---

### 10. Risks and Regression Impact

1. **Double-Posting Risk**: Re-submitting a customer payment could create duplicate journal entries.
   - *Mitigation*: Generate unique journal entry numbers with `reference: pay-sale-${payment.id}`, check for existing entry before posting, and wrap in a database transaction.
2. **Overpayment Concurrency Race**: Concurrent payments could both pass validation and exceed remaining invoice balance.
   - *Mitigation*: Re-read current `paidAmount` inside transaction and verify `paidAmount + amount <= total`.
3. **Closed Fiscal Period Rejection**: If payment date falls in a closed period, `assertOpenPeriodForPosting` throws `PeriodPostingError`.
   - *Mitigation*: Wrap payment creation and journal auto-posting in transaction; if period is closed, abort transaction and return HTTP 400 `PERIOD_CLOSED_FOR_POSTING`.
4. **Stock Decrement Consistency**: Ensure POS checkout never allows negative inventory for non-service items.
   - *Mitigation*: Centralized `InventoryMovementService.decreaseStock` with atomic `quantity: { gte: requestedQuantity }` decrement.

---

### 11. Detailed Implementation Plan

#### Step 1: Database Migration (Additive)
- Add `notes` and `createdById` to `SalePayment` in `server/prisma/schema.prisma`.
- Run safe additive migration and verify schema.

#### Step 2: Ledger Posting Service
- Implement `autoPostCustomerPaymentToLedger`:
  - Debit Bank (1020) or Cash (1010).
  - Credit Accounts Receivable (1030).
  - Enforce `assertOpenPeriodForPosting`.
  - Update `ChartOfAccount` balances atomically.

#### Step 3: Sales & Invoices Routers
- In `server/src/routes/sales.routes.ts`:
  - Add `POST /api/sales/:id/payments`: Validate balance, create `SalePayment`, update `paidAmount`/`paymentStatus`, update open shift if applicable, auto-post to ledger.
  - Add `GET /api/sales/:id/payments`: List payments for a sale.
- In `server/src/routes/invoices.routes.ts`:
  - Add `POST /api/invoices/:id/payments` and `GET /api/invoices/:id/payments` delegating to the same concurrency-safe payment logic.

#### Step 4: Customers Router
- In `server/src/routes/customers.routes.ts`:
  - In `GET /`: Include aggregated `outstandingReceivable`, `totalInvoiced`, and `totalPaid` for each customer.
  - Add `GET /ar-summary`: Tenant-wide AR metrics.
  - Add `GET /:id`: Single customer with recent sales and balance.
  - Add `GET /:id/payments`: Customer payment history stream.

#### Step 5: Frontend UI Enhancements
- `invoices.tsx`:
  - Add "Record Customer Payment" dialog with amount, method, reference, notes, and remaining balance indicator.
  - Add Payment History stream to Invoice View modal.
  - Invalidate relevant query keys on payment success.

#### Step 6: Automated Integration Testing
- Create `server/src/tests/wave3-step3-5-sales-pos-ar.test.ts` covering:
  - POS sale checkout with atomic stock decrement and GL posting.
  - Credit sale / unpaid invoice with Accounts Receivable GL posting (Dr 1030, Cr 4010, Cr 2020).
  - Customer payment recording and settlement GL posting (Dr 1020, Cr 1030).
  - Partial payment transition (`unpaid` -> `partial` -> `paid`).
  - Overpayment rejection ($> \text{balance}$).
  - Zero/negative amount rejection.
  - Closed fiscal period rejection.
  - Cross-tenant payment access rejection.
  - Register shift open, drop, and close with cash variance calculation.
  - Customer AR summary metrics.

---

### 12. Test and Acceptance Plan

- Run automated test suite: `npx tsx server/src/tests/wave3-step3-5-sales-pos-ar.test.ts`.
- Run regression tests for previous steps (Step 3.3.5, 3.4).
- Execute backend build (`npm run build:server` or equivalent typecheck).
- Execute frontend build (`npm run build`).
- Verify zero regressions and confirm all acceptance criteria.
