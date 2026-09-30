# Phase C — Wave 3 — Step 3.4: Pre-Implementation Audit Report
## Purchasing Lifecycle & Accounts Payable (AP)

**Document Version**: 1.0.0  
**Phase**: Phase C (Wave 3 — Step 3.4)  
**Execution Timestamp**: 2026-09-28T22:25:30+05:30  
**Database Target**: `127.0.0.1:3306/master_hrms_dev` (Strict Local Dev Isolation)  
**Status**: AUDIT COMPLETE — READY FOR IMPLEMENTATION

---

### 1. Exact Step 3.4 Title and Scope from the Roadmap

**Roadmap Reference**: [`PHASE_C_WAVE_3_MIGRATION_ROADMAP.md`](file:///Users/apple/Documents/hrms/PHASE_C_WAVE_3_MIGRATION_ROADMAP.md)  
**Title**: **STEP 3.4: PURCHASING LIFECYCLE & ACCOUNTS PAYABLE**  
**Core Objective**: Complete the procurement workflow from Purchase Order creation to Goods Receipt, Bill generation, Supplier payment settlement, and Accounts Payable (AP) ledger accounting.

#### Roadmap Scope Specification:
1. **Purchase Order Lifecycle**:
   - PO Creation with line items, costs, tax rates, and default warehouse selection (`status: "ordered"`, `paymentStatus: "unpaid"`).
   - Goods Receipt transition (`PATCH /api/purchases/:id/status` -> `"received"`):
     - Increments physical stock via `InventoryMovementService.increaseStock` with `STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT`.
     - Auto-posts balanced double-entry journal: Dr Merchandise Inventory (1040), Cr Accounts Payable (2010).
     - Validates open fiscal period via `assertOpenPeriodForPosting`.
2. **Supplier Payment Settlement & Accounts Payable**:
   - Supplier payment recording (`POST /api/purchases/:id/payments`):
     - Validates payment amount ($0 < \text{amount} \le \text{remainingBalance}$).
     - Creates discrete `PurchasePayment` audit record.
     - Updates `Purchase.paidAmount` and `Purchase.paymentStatus` (`unpaid` -> `partial` -> `paid`).
     - Auto-posts balanced settlement journal: Dr Accounts Payable (2010), Cr Bank Account (1020) or Cash (1010).
     - Period locking validation: checks open fiscal period before posting.
3. **Accounts Payable & Supplier Analytics**:
   - Exposes supplier-level Accounts Payable metrics: Total Invoiced/Received, Total Paid, and Net Outstanding Balance.
   - Payment stream endpoints: `GET /api/purchases/:id/payments` and `GET /api/suppliers/:id/payments`.
4. **UI Parity & High-Information Density Workflow**:
   - `purchases.tsx`: Interactive Payment History & Settlements stream in the Purchase View Passport; validation against overpayment.
   - `suppliers.tsx`: Outstanding Accounts Payable KPI card, supplier AP balance badges, and payment transaction drawer.

---

### 2. Laravel Source Files and Workflows Relevant to This Step

| Laravel Source File | Location | Workflow & Responsibilities |
| :--- | :--- | :--- |
| `PurchaseInvoice.php` | `main-file/app/Models/` | Purchase invoice entity, status transitions, supplier relation, warehouse reference, line items |
| `PurchaseInvoiceItem.php` | `main-file/app/Models/` | Purchase detail items, quantity, purchase cost, tax rate, line subtotal |
| `VendorPayment.php` | `packages/workdo/Account/src/Models/` | Vendor payment transaction, bank account allocation, payment method, reference number, notes |
| `VendorPaymentController.php` | `packages/workdo/Account/src/Http/Controllers/` | Payment execution, outstanding invoice discovery, vendor AP balance calculations |
| `JournalService.php` | `packages/workdo/Account/src/Services/` | `createPurchaseInventoryJournal` (Dr Inventory 1040, Cr AP 2010) & `createVendorPaymentJournal` (Dr AP 2010, Cr Bank 1020) |

---

### 3. Current React Frontend Implementation Status

#### 3.1. `src/routes/_authenticated/_app/purchases.tsx`
- **Current State**:
  - Filterable purchase order list with search, status filter (`ordered`, `received`, `cancelled`), and metric cards.
  - "Create Purchase Order" dialog with line items, unit costs, GST tax rates, warehouse selection.
  - "Receive Goods" and "Cancel PO" status transitions with 409 conflict handling.
  - Basic "Record Payment" dialog triggering `POST /api/purchases/:id/payments`.
- **Gaps Identified**:
  - View Purchase Drawer does NOT display payment history or discrete payment installments.
  - No display of remaining unpaid balance or settlement timeline.
  - Does not invalidate accounting / GL query keys on payment success.

#### 3.2. `src/routes/_authenticated/_app/suppliers.tsx`
- **Current State**:
  - Lists suppliers with contact info, GSTIN, total orders count, and total procurement spend.
  - Supplier detail drawer showing 10 recent purchase orders.
- **Gaps Identified**:
  - Does NOT display outstanding Accounts Payable (AP) balance (Total Received - Total Paid).
  - No AP KPI cards or badges indicating overdue/unpaid vendor balances.
  - No payment history view for vendors.

---

### 4. Current Node.js Backend Implementation Status

#### 4.1. `server/src/routes/purchases.routes.ts`
- **Current State**:
  - Enforces `requireAuth` and `resolveTenantContext`.
  - Supports GET `/`, GET `/:id`, POST `/`, PATCH `/:id/status`, DELETE `/:id`.
  - In `PATCH /:id/status`, transitioning to `"received"` calls `InventoryMovementService.increaseStock` and `autoPostPurchaseToLedger`.
- **Gaps Identified**:
  - `POST /api/purchases/:id/payments` merely increments `Purchase.paidAmount` without creating a discrete payment record.
  - `POST /api/purchases/:id/payments` does NOT auto-post the settlement journal entry to the General Ledger.
  - No check preventing overpayment ($> \text{unpaid balance}$).
  - Missing `GET /api/purchases/:id/payments` endpoint to list payment receipts.

#### 4.2. `server/src/routes/suppliers.routes.ts`
- **Current State**:
  - Full CRUD operations with tenant scoping.
  - Computes `totalPurchasesAmount` as gross sum of all purchase totals.
- **Gaps Identified**:
  - Does not compute `outstandingPayable` ($\sum (\text{total} - \text{paidAmount})$ for received orders).
  - Missing `GET /api/suppliers/:id/payments` endpoint.
  - Missing `GET /api/suppliers/:id/outstanding` endpoint.

#### 4.3. `server/src/services/ledger-posting.service.ts`
- **Current State**:
  - Has `autoPostPurchaseToLedger`: Dr Merchandise Inventory (1040), Cr Accounts Payable (2010) or Bank (1020).
- **Gaps Identified**:
  - Completely missing `autoPostSupplierPaymentToLedger`: Must auto-post Dr Accounts Payable (2010), Cr Bank (1020) or Cash (1010).

---

### 5. Existing Database Models & Migrations

#### Existing Models:
- `Purchase` (`purchases` table): `id`, `tenant_id`, `purchase_no`, `supplier_id`, `warehouse_id`, `status`, `total`, `paid_amount`, `payment_status`, `notes`, `date`.
- `PurchaseDetail` (`purchase_details` table): `id`, `purchase_id`, `product_id`, `product_name`, `cost`, `quantity`, `tax_rate`, `subtotal`.
- `Supplier` (`suppliers` table): `id`, `tenant_id`, `name`, `email`, `phone`, `gstin`, `address`, `city`, `country`.
- `SalePayment` (`sale_payments` table): Exists for POS/sales, but no equivalent exists for purchases!

#### Proposed Additive Schema Change:
Add `model PurchasePayment` mapping to `purchase_payments` table:
```prisma
model PurchasePayment {
  id          String   @id @default(uuid()) @db.VarChar(36)
  tenantId    String   @map("tenant_id") @db.VarChar(36)
  purchaseId  String   @map("purchase_id") @db.VarChar(36)
  amount      Decimal  @db.Decimal(15, 2)
  method      String   @default("Bank Transfer") @db.VarChar(50)
  referenceNo String?  @map("reference_no") @db.VarChar(100)
  notes       String?  @db.Text
  paidAt      DateTime @default(now()) @map("paid_at")
  createdAt   DateTime @default(now()) @map("created_at")

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  purchase Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  @@index([tenantId, purchaseId])
  @@map("purchase_payments")
}
```
This migration is 100% additive, non-destructive, and creates zero downtime or risk to existing rows.

---

### 6. Parity Gaps & Remediation Plan

| Ref | Gap / Vulnerability | Planned Remediation in Step 3.4 |
| :---: | :--- | :--- |
| **GAP-1** | No GL posting on supplier payments | Implement `autoPostSupplierPaymentToLedger` (Dr 2010, Cr 1020/1010) with fiscal period validation |
| **GAP-2** | No discrete payment transaction storage | Add `PurchasePayment` model and persist each installment with method, date, reference, notes |
| **GAP-3** | Overpayment risk | Validate that payment amount $\le \text{total} - \text{paidAmount}$, rejecting excess with HTTP 400 |
| **GAP-4** | Missing payment history endpoints | Add `GET /api/purchases/:id/payments` and `GET /api/suppliers/:id/payments` |
| **GAP-5** | Supplier AP metrics missing | Compute `outstandingPayable` and `totalPaidAmount` in `suppliers.routes.ts` |
| **GAP-6** | UI payment stream missing | Add payment history tab to Purchase View Drawer and AP balance cards to `suppliers.tsx` |

---

### 7. Dependencies on Previously Completed Steps

1. **Step 3.1 (Tenant Isolation & RBAC)**: Router-level `resolveTenantContext` and `requireAuth` on all purchase and supplier endpoints.
2. **Step 3.2 (Chart of Accounts & Fiscal Periods)**: `assertOpenPeriodForPosting` to prevent posting to closed fiscal periods; system accounts `1010` (Cash), `1020` (Bank), `1040` (Inventory), `2010` (Accounts Payable).
3. **Step 3.3.1–3.3.5 (Inventory Engine & Consistency)**: Formal goods receipt transitions physical stock through `InventoryMovementService.increaseStock` and cancels via `decreaseStock` with overdraft protection.

---

### 8. Tenant Isolation & RBAC Requirements

- `PurchasePayment` rows must include `tenantId` and enforce foreign key isolation to `Tenant`.
- Cross-tenant payment access (Tenant A attempting to record payment on Tenant B's PO) must return HTTP 404.
- Cross-tenant supplier payment retrieval must return HTTP 404.
- Permissions:
  - `procurement.purchases.create`, `procurement.purchases.read`, `procurement.purchases.update`, `procurement.purchases.pay`
  - `procurement.suppliers.read`, `procurement.suppliers.create`, `procurement.suppliers.update`

---

### 9. Potential Regressions & Data-Integrity Risks

1. **Double-Posting Risk**: Re-submitting payment request could create duplicate journal entries.
   - *Mitigation*: Generate unique journal entry numbers with `reference: payment.id`, check for existing entry before posting, and wrap in a database transaction.
2. **Overpayment Concurrency Race**: Two simultaneous payments could both pass validation and exceed remaining balance.
   - *Mitigation*: Re-read current `paidAmount` inside transaction and verify `paidAmount + amount <= total`.
3. **Closed Fiscal Period Rejection**: If payment date falls in a closed period, `assertOpenPeriodForPosting` throws `PeriodPostingError`.
   - *Mitigation*: Wrap payment creation and journal auto-posting in transaction; if period is closed, abort transaction and return HTTP 400 `PERIOD_CLOSED_FOR_POSTING`.

---

### 10. Implementation Plan & Test Strategy

#### Implementation Sequence:
1. **Schema & Migration**: Add `PurchasePayment` to `schema.prisma`, execute additive migration, register in `tenant-models.config.ts`.
2. **Ledger Posting Service**: Implement `autoPostSupplierPaymentToLedger` in `server/src/services/ledger-posting.service.ts`.
3. **Purchases Router**: Update `POST /api/purchases/:id/payments` with payment creation, concurrency guard, and GL posting. Add `GET /api/purchases/:id/payments`.
4. **Suppliers Router**: Enhance `GET /api/suppliers` and `GET /api/suppliers/:id` to compute AP metrics; add `GET /api/suppliers/:id/payments`.
5. **Frontend UI**:
   - `purchases.tsx`: Add Payment History stream and remaining balance breakdown in View Drawer.
   - `suppliers.tsx`: Add Accounts Payable metric card and payment drawer tab.
6. **Automated Integration Testing**:
   - Develop `server/src/tests/wave3-step3-4-purchasing-and-ap.test.ts` covering:
     - Goods receipt stock increment and GL auto-posting (Dr 1040, Cr 2010).
     - Full supplier payment recording and settlement GL posting (Dr 2010, Cr 1020).
     - Partial payment recording and status transition (`unpaid` -> `partial` -> `paid`).
     - Overpayment rejection ($> \text{balance}$).
     - Negative/zero payment rejection.
     - Closed fiscal period payment rejection.
     - Cross-tenant payment access rejection.
     - Supplier outstanding AP balance calculation.
7. **Regression Testing & Builds**: Run Step 3.3.5, 3.3.3, 3.3.2, 3.3.4 test suites and production build.
