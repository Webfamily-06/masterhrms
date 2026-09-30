# PHASE C · WAVE 3 · STEP 3.6 — PRE-IMPLEMENTATION AUDIT
## Sales & Purchase Returns Engine (Credit & Debit Notes)

**Date:** 2026-09-28  
**Author:** Antigravity Senior ERP Architect & Staff Backend Engineer  
**Status:** ✅ AUDIT COMPLETE — READY FOR IMPLEMENTATION

---

## 1. Existing Architecture Findings

### 1.1 Multi-Tenant Core & Execution Framework
- **Master Workspace Constitution (`AGENTS.md`)**: Enforces strict single-schema multi-tenancy with mandatory `tenant_id` on all tenant-owned models, centralized `requireAuth` and `resolveTenantId`, strict RBAC, and double-entry ledger balancing (`Sum(Debits) === Sum(Credits)`).
- **Tenant Context (`tenant-models.config.ts`)**: Models with direct `tenant_id` must be registered in `DIRECT_TENANT_MODELS`. Child models must be registered in `CHILD_DEPENDENT_MODELS`.
- **Database Engine**: MySQL 10.11 / MariaDB (`master_hrms_dev`) with Prisma 5.22.0. Migrations must be strictly additive and applied using `prisma db execute` + `npx prisma migrate resolve --applied` + `npx prisma generate`. Zero destructive operations allowed.

### 1.2 Inventory Movement Engine (`InventoryMovementService`)
- Centralized atomic stock operations located in `server/src/services/inventory-movement.service.ts`.
- `STOCK_MOVEMENT_TYPES` already includes `SALES_RETURN` and `PURCHASE_RETURN`.
- `increaseStock` and `decreaseStock` support:
  - Input parsing and validation to 3 decimal places (`DECIMAL(15, 3)`).
  - Optimistic locking and atomic rollback.
  - Insufficient stock verification for outward movements.
  - Immutable audit logging to `stock_movements`.
- **Rule**: Direct mutation of `ProductWarehouse.quantity` from route handlers is strictly prohibited; all return-driven inventory adjustments must pass through `InventoryMovementService`.

### 1.3 General Ledger & Fiscal Periods (`ledger-posting.service.ts` & `fiscal-period.service.ts`)
- Double-entry postings are managed in `server/src/services/ledger-posting.service.ts`.
- Every posting must check `assertOpenPeriodForPosting` to block mutations into locked/closed periods.
- Chart of Accounts in dev database uses standard codes:
  - **1010**: Petty Cash Fund (`asset / current_asset`)
  - **1020**: Primary Operating Bank Account (`asset / current_asset`)
  - **1030**: Accounts Receivable (`asset / current_asset`)
  - **1040**: Merchandise Inventory (`asset / current_asset`)
  - **2010**: Accounts Payable (`liability / current_liability`)
  - **2020**: GST / Output Tax Payable (`liability / current_liability`)
  - **4010**: Product Sales Revenue (`revenue / direct_income`)
  - **5010**: Cost of Goods Sold (`expense / direct_expense`)

---

## 2. Existing Schema & Route Findings

### 2.1 Prisma Schema (`server/prisma/schema.prisma`)
- Currently **NO** return models exist:
  - No `SalesReturn` or `SalesReturnDetail`
  - No `PurchaseReturn` or `PurchaseReturnDetail`
  - No `CreditNote` or `DebitNote`
- Existing transaction models:
  - `Sale` & `SaleDetail`: Uses `invoiceNo`, `total`, `subtotal`, `totalTax`, `paymentStatus`, `paidAmount`.
  - `Purchase` & `PurchaseDetail`: Uses `purchaseNo`, `total`, `subtotal`, `taxAmount`, `paymentStatus`, `paidAmount`, `status` (`pending`, `ordered`, `received`, `cancelled`).
  - `Customer` & `Supplier`: Track master entities and metadata.
  - `ProductWarehouse`: Stores warehouse stock at `DECIMAL(15, 3)`.

### 2.2 Route Architecture
- `server/src/routes/sales.routes.ts`: Handles POS checkout and sales listing.
- `server/src/routes/invoices.routes.ts`: Handles commercial invoices and AR customer payments.
- `server/src/routes/purchases.routes.ts`: Handles PO creation, status transitions, and AP supplier payments.
- `server/src/routes/returns.routes.ts`: Does not exist yet. Needs to be created and mounted in `server/src/index.ts`.

---

## 3. Laravel Feature Parity Findings

From inspecting the reference implementation in `main-file/app/Models/` and `main-file/packages/`:

| Feature / Model | Laravel Implementation | Target Node/Express + Prisma Architecture | Parity Requirement |
|---|---|---|---|
| **Sales Return Model** | `SalesInvoiceReturn` (`return_number`, `original_invoice_id`, `warehouse_id`, `subtotal`, `tax_amount`, `total_amount`, `status`) | `SalesReturn` model in Prisma with `tenantId`, `saleId`, `warehouseId`, `customerId`, financial fields, and `status` (`draft`, `approved`, `completed`, `cancelled`). | Full Parity |
| **Sales Return Items** | `SalesInvoiceReturnItem` (`original_invoice_item_id`, `return_quantity`, `unit_price`, `tax_amount`, `total_amount`) | `SalesReturnDetail` with `productId`, `originalDetailId`, `quantity`, `unitPrice`, `taxAmount`, `subtotal`. | Full Parity |
| **Sales Return Lifecycle** | 1. `draft`<br>2. `approved` -> Generates Credit Note<br>3. `completed` -> Restocks inventory | Supported: Explicit transitions `draft` -> `approved` -> `completed` (or direct completion for POS cash refunds). | Full Parity |
| **Credit Note Model** | `CreditNote` (`credit_note_number`, `invoice_id`, `return_id`, `customer_id`, `applied_amount`, `balance_amount`) | `CreditNote` model linked to `SalesReturn` and `Sale` with unique sequential numbering and balance tracking. | Full Parity |
| **Purchase Return Model** | `PurchaseReturn` (`return_number`, `original_invoice_id`, `vendor_id`, `warehouse_id`, `total_amount`, `status`) | `PurchaseReturn` model with `tenantId`, `purchaseId`, `warehouseId`, `supplierId`, financial fields, and `status`. | Full Parity |
| **Purchase Return Items** | `PurchaseReturnItem` (`product_id`, `return_quantity`, `unit_price`, `tax_amount`, `total_amount`) | `PurchaseReturnDetail` with `productId`, `originalDetailId`, `quantity`, `unitPrice`, `taxAmount`, `subtotal`. | Full Parity |
| **Purchase Return Lifecycle** | 1. `draft`<br>2. `approved` -> Generates Debit Note<br>3. `completed` -> Decrements warehouse inventory | Supported: `draft` -> `approved` -> `completed` (decreasing stock via `InventoryMovementService.decreaseStock`). | Full Parity |
| **Debit Note Model** | `DebitNote` (`debit_note_number`, `invoice_id`, `return_id`, `vendor_id`, `applied_amount`, `balance_amount`) | `DebitNote` model linked to `PurchaseReturn` and `Purchase` with unique sequential numbering. | Full Parity |
| **Returnable Quantity Validation** | `originalQuantity - sum(previous_returns)` | Strict validation: `sum(acceptedReturns) + requestedQty <= originalQty`. | Mandatory Guard |

---

## 4. Exact Step 3.6 Scope

1. **Prisma Schema & Additive Migration:**
   - Define `SalesReturn`, `SalesReturnDetail`, `CreditNote`.
   - Define `PurchaseReturn`, `PurchaseReturnDetail`, `DebitNote`.
   - Register models in `tenant-models.config.ts`.
   - Generate and apply additive migration `20260928000002_step_3_6_returns_credit_debit_notes`.
2. **General Ledger Service Integration:**
   - `autoPostSalesReturnToLedger`:
     - **DEBIT**: Sales Revenue (`4010`) / Sales Returns (Subtotal)
     - **DEBIT**: GST / Output Tax Payable (`2020`) (Tax)
     - **CREDIT**: Accounts Receivable (`1030`) [for unpaid credit sales] OR Cash (`1010`) / Bank (`1020`) [for refunded sales]
     - Total Debit === Total Credit.
   - `autoPostPurchaseReturnToLedger`:
     - **DEBIT**: Accounts Payable (`2010`) (Total return value)
     - **CREDIT**: Merchandise Inventory (`1040`) (Total return value)
     - Total Debit === Total Credit.
3. **Inventory Service Integration:**
   - Sales Return completion: Restocks restockable items into the warehouse via `InventoryMovementService.increaseStock` with `STOCK_MOVEMENT_TYPES.SALES_RETURN`.
   - Purchase Return completion: Decrements returned items from the warehouse via `InventoryMovementService.decreaseStock` with `STOCK_MOVEMENT_TYPES.PURCHASE_RETURN` (rejection if stock is insufficient).
4. **Backend Routes (`returns.routes.ts` & Sub-Routes):**
   - `GET /api/returns/sales`: List sales returns with filters (status, customer, date).
   - `POST /api/returns/sales`: Create sales return linked to `saleId` with returnable quantity validation.
   - `GET /api/returns/sales/:id`: Return passport with line items, credit note, and audit history.
   - `POST /api/returns/sales/:id/approve`: Approve sales return and issue `CreditNote`.
   - `POST /api/returns/sales/:id/complete`: Complete return, restock goods via `InventoryMovementService`, and post balanced GL journal entry.
   - `GET /api/returns/purchases`: List purchase returns.
   - `POST /api/returns/purchases`: Create purchase return linked to `purchaseId` with returnable quantity validation.
   - `GET /api/returns/purchases/:id`: Return passport with line items and debit note.
   - `POST /api/returns/purchases/:id/approve`: Approve purchase return and issue `DebitNote`.
   - `POST /api/returns/purchases/:id/complete`: Complete return, decrement stock, and post GL journal entry.
   - `GET /api/returns/credit-notes`: List credit notes.
   - `GET /api/returns/debit-notes`: List debit notes.
   - Sub-routes on sales and purchases:
     - `GET /api/sales/:id/returns`
     - `GET /api/purchases/:id/returns`
5. **Frontend User Experience:**
   - In `invoices.tsx`: Add "Create Sales Return / Credit Note" action in the invoice view dialog and dedicated Returns / Credit Notes view.
   - In `purchases.tsx`: Add "Create Purchase Return / Debit Note" action in PO details and Returns / Debit Notes view.
6. **Automated Testing Suite:**
   - Dedicated suite `server/src/tests/wave3-step3-6-sales-purchase-returns.test.ts` covering partial/full returns, quantity overdraft rejection, GL postings, inventory stock changes, cross-tenant isolation, and period close validation.

---

## 5. Database Migration Plan

### 5.1 New Tables

#### `sales_returns`
- `id` (VARCHAR(36) PK)
- `tenant_id` (VARCHAR(36) FK -> tenants.id)
- `sale_id` (VARCHAR(36) FK -> sales.id)
- `customer_id` (VARCHAR(36) NULL -> customers.id)
- `warehouse_id` (VARCHAR(36) NULL -> warehouses.id)
- `return_number` (VARCHAR(100) UNIQUE within tenant)
- `return_date` (DATETIME(3))
- `status` (VARCHAR(50) DEFAULT 'draft') // draft, approved, completed, cancelled
- `reason` (VARCHAR(255) NULL)
- `subtotal` (DECIMAL(15, 2))
- `tax_amount` (DECIMAL(15, 2))
- `total_amount` (DECIMAL(15, 2))
- `notes` (TEXT NULL)
- `created_by_id` (VARCHAR(36) NULL)
- `created_at`, `updated_at`

#### `sales_return_details`
- `id` (VARCHAR(36) PK)
- `return_id` (VARCHAR(36) FK -> sales_returns.id CASCADE)
- `product_id` (VARCHAR(36) FK -> products.id)
- `original_detail_id` (VARCHAR(36) NULL -> sale_details.id)
- `product_name` (VARCHAR(255))
- `quantity` (DECIMAL(15, 3))
- `unit_price` (DECIMAL(15, 2))
- `tax_rate` (DECIMAL(5, 2) DEFAULT 0)
- `tax_amount` (DECIMAL(15, 2) DEFAULT 0)
- `subtotal` (DECIMAL(15, 2))
- `total` (DECIMAL(15, 2))
- `is_restocked` (BOOLEAN DEFAULT true)
- `created_at`

#### `credit_notes`
- `id` (VARCHAR(36) PK)
- `tenant_id` (VARCHAR(36) FK -> tenants.id)
- `return_id` (VARCHAR(36) NULL -> sales_returns.id)
- `sale_id` (VARCHAR(36) NULL -> sales.id)
- `customer_id` (VARCHAR(36) NULL -> customers.id)
- `note_number` (VARCHAR(100) UNIQUE within tenant)
- `note_date` (DATETIME(3))
- `amount` (DECIMAL(15, 2))
- `allocated_amount` (DECIMAL(15, 2) DEFAULT 0)
- `balance_amount` (DECIMAL(15, 2))
- `status` (VARCHAR(50) DEFAULT 'active') // active, fully_allocated, void
- `reason` (VARCHAR(255) NULL)
- `created_at`, `updated_at`

#### `purchase_returns`
- `id` (VARCHAR(36) PK)
- `tenant_id` (VARCHAR(36) FK -> tenants.id)
- `purchase_id` (VARCHAR(36) FK -> purchases.id)
- `supplier_id` (VARCHAR(36) NULL -> suppliers.id)
- `warehouse_id` (VARCHAR(36) NULL -> warehouses.id)
- `return_number` (VARCHAR(100) UNIQUE within tenant)
- `return_date` (DATETIME(3))
- `status` (VARCHAR(50) DEFAULT 'draft') // draft, approved, completed, cancelled
- `reason` (VARCHAR(255) NULL)
- `subtotal` (DECIMAL(15, 2))
- `tax_amount` (DECIMAL(15, 2))
- `total_amount` (DECIMAL(15, 2))
- `notes` (TEXT NULL)
- `created_by_id` (VARCHAR(36) NULL)
- `created_at`, `updated_at`

#### `purchase_return_details`
- `id` (VARCHAR(36) PK)
- `return_id` (VARCHAR(36) FK -> purchase_returns.id CASCADE)
- `product_id` (VARCHAR(36) FK -> products.id)
- `original_detail_id` (VARCHAR(36) NULL -> purchase_details.id)
- `product_name` (VARCHAR(255))
- `quantity` (DECIMAL(15, 3))
- `unit_cost` (DECIMAL(15, 2))
- `tax_rate` (DECIMAL(5, 2) DEFAULT 0)
- `tax_amount` (DECIMAL(15, 2) DEFAULT 0)
- `subtotal` (DECIMAL(15, 2))
- `total` (DECIMAL(15, 2))
- `created_at`

#### `debit_notes`
- `id` (VARCHAR(36) PK)
- `tenant_id` (VARCHAR(36) FK -> tenants.id)
- `return_id` (VARCHAR(36) NULL -> purchase_returns.id)
- `purchase_id` (VARCHAR(36) NULL -> purchases.id)
- `supplier_id` (VARCHAR(36) NULL -> suppliers.id)
- `note_number` (VARCHAR(100) UNIQUE within tenant)
- `note_date` (DATETIME(3))
- `amount` (DECIMAL(15, 2))
- `allocated_amount` (DECIMAL(15, 2) DEFAULT 0)
- `balance_amount` (DECIMAL(15, 2))
- `status` (VARCHAR(50) DEFAULT 'active') // active, fully_allocated, void
- `reason` (VARCHAR(255) NULL)
- `created_at`, `updated_at`

---

## 6. Inventory & Accounting Integration Plan

### 6.1 Sales Return Execution
1. **Quantity Calculation:**
   $$\text{Available to Return} = \text{Sold Quantity} - \sum(\text{Non-cancelled previous return quantities})$$
   If $\text{Requested Quantity} > \text{Available}$, reject with `400 BAD_REQUEST`.
2. **Restocking:**
   Upon transition to `completed`:
   For each detail where `isRestocked === true`:
   Invoke `InventoryMovementService.increaseStock` with `STOCK_MOVEMENT_TYPES.SALES_RETURN`.
3. **Credit Note Generation:**
   Generate unique `CN-YYYY-XXXX` credit note for the customer with `balanceAmount = totalAmount`.
4. **General Ledger Entry:**
   Invoke `autoPostSalesReturnToLedger`:
   - `DEBIT` Sales Revenue (`4010`): Subtotal
   - `DEBIT` GST / Output Tax Payable (`2020`): Tax
   - `CREDIT` Accounts Receivable (`1030`): Total Return Amount (if unpaid/credit sale) OR `CREDIT` Cash (`1010`) / Bank (`1020`) (if refunded)
   - Ensure `Sum(Debit) === Sum(Credit)`.

### 6.2 Purchase Return Execution
1. **Quantity Calculation:**
   $$\text{Available to Return} = \text{Received Quantity} - \sum(\text{Non-cancelled previous return quantities})$$
   If $\text{Requested Quantity} > \text{Available}$, reject with `400 BAD_REQUEST`.
2. **De-stocking:**
   Upon transition to `completed`:
   For each detail:
   Invoke `InventoryMovementService.decreaseStock` with `STOCK_MOVEMENT_TYPES.PURCHASE_RETURN`.
   If physical stock is depleted below the return quantity, `decreaseStock` throws `InsufficientStockError`, aborting the transaction cleanly with `409 CONFLICT`.
3. **Debit Note Generation:**
   Generate unique `DN-YYYY-XXXX` debit note against the supplier with `balanceAmount = totalAmount`.
4. **General Ledger Entry:**
   Invoke `autoPostPurchaseReturnToLedger`:
   - `DEBIT` Accounts Payable (`2010`): Total Return Amount
   - `CREDIT` Merchandise Inventory (`1040`): Total Return Amount
   - Ensure `Sum(Debit) === Sum(Credit)`.

---

## 7. Tenant Isolation and RBAC Plan

- **Middleware**: All return endpoints enforce `requireAuth` and `resolveTenantContext`.
- **Tenant Scoping**: All queries filter by `tenantId = resolveTenantId(req, res)`.
- **RBAC Permissions**:
  - `returns.sales.view`, `returns.sales.create`, `returns.sales.approve`
  - `returns.purchases.view`, `returns.purchases.create`, `returns.purchases.approve`
  - Administrative roles (`admin`, `hr_admin`) have full operational authority.
- **Fail-Closed Isolation**: Attempting to return a sale or purchase belonging to Tenant B with a Tenant A token results in `HTTP 404 NOT_FOUND`.

---

## 8. Test Plan (`wave3-step3-6-sales-purchase-returns.test.ts`)

A dedicated 12-scenario integration test suite will be implemented:
1. **T1:** Partial Sales Return creation & returnable quantity calculation.
2. **T2:** Sales Return Approval -> Credit Note auto-generation (`CN-YYYY-XXXX`).
3. **T3:** Sales Return Completion -> Atomic restock via `InventoryMovementService` & balanced GL auto-posting (`Dr 4010 + Dr 2020 = Cr 1030`).
4. **T4:** Sales Return Quantity Overdraft Guard (Attempting to return more than sold -> 400).
5. **T5:** Full Sales Return & Second Return Rejection (Return exhaustion guard).
6. **T6:** Partial Purchase Return creation & returnable quantity calculation.
7. **T7:** Purchase Return Approval -> Debit Note auto-generation (`DN-YYYY-XXXX`).
8. **T8:** Purchase Return Completion -> Atomic stock decrement via `InventoryMovementService` & balanced GL auto-posting (`Dr 2010 = Cr 1040`).
9. **T9:** Purchase Return Overdraft Guard (Attempting to return more than received -> 400).
10. **T10:** Purchase Return Depleted Inventory Conflict Guard (409 Insufficient Stock).
11. **T11:** Multi-Tenant Isolation: Cross-tenant return creation/approval rejection (404).
12. **T12:** Closed Fiscal Period Rejection Guard for Return Ledger Postings.

---

## 9. Risks, Dependencies & Unresolved Decisions

1. **Damaged Goods Restocking**: In `SalesReturnDetail`, an `isRestocked: boolean` flag allows cashiers to accept customer returns without returning damaged goods to sellable inventory.
2. **Credit Note Application**: Credit and debit notes will track `allocatedAmount` and `balanceAmount` so that future invoicing cycles or payments can consume credits.
3. **Additive DDL Safety**: All Prisma schema additions are non-destructive and new foreign keys reference existing core tables with `CASCADE` on returns and `RESTRICT` on products.

---

**Audit Sign-off:**
The pre-implementation audit is complete. We are authorized to proceed to **Phase 2–8: Schema, Services, Routers, UI, and Test Suite Implementation**.
